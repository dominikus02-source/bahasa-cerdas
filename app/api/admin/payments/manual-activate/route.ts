import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { z } from "zod";
import cache from "@/lib/redis";
import { getPlan, isUmumPlanId } from "@/lib/billing/plans";
import { UMUM_TRIAL_PLAN } from "@/lib/account/identity";
import { withAdmin } from "@/lib/admin/guard";

const bodySchema = z.object({
  transactionId: z.string().min(1, "transactionId wajib diisi"),
  reason: z.string().min(1, "Alasan wajib diisi").max(300, "Alasan maksimal 300 karakter"),
  // Hanya untuk transaksi UMUM_PREMIUM yang metadatanya hilang: founder
  // memilih paket secara eksplisit (dibatasi ke paket UMUM_PREMIUM_*).
  planId: z.string().optional(),
});

function getCurrentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

async function adminPOST(req: NextRequest) {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { transactionId, reason, planId: bodyPlanId } = parsed.data;

    const transaksi = await db.transaksi.findUnique({
      where: { id: transactionId },
      include: { user: { select: { id: true, fullName: true, email: true, premiumUntil: true, role: true, supabaseId: true, trialPlan: true, trialEndsAt: true } } },
    });

    if (!transaksi) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    if (transaksi.type === "UMUM_PREMIUM") {
      return activateUmum({ transaksi, adminId: admin.id, reason, bodyPlanId });
    }

    if (transaksi.type !== "PREMIUM_UPGRADE" && transaksi.type !== "MURID_PREMIUM") {
      return NextResponse.json({ error: "Bukan transaksi premium upgrade" }, { status: 400 });
    }

    if (transaksi.status === "SUCCESS") {
      return NextResponse.json({ error: "Transaksi sudah SUCCESS" }, { status: 400 });
    }

    const isMurid = transaksi.type === "MURID_PREMIUM";
    const meta = (transaksi.metadata || {}) as Record<string, any>;
    let durationDays = isMurid ? 30 : 30;
    const planId = meta.planId || transaksi.reference || (isMurid ? "MURID_PREMIUM_MONTHLY" : "GURU_PRO_MONTHLY");

    if (planId === "GURU_PRO_YEARLY" || planId === "MURID_PREMIUM_YEARLY" || meta.durationDays === 365) {
      durationDays = 365;
    }

    // Calculate premiumUntil
    const now = new Date();
    let premiumUntil: Date;
    if (transaksi.user?.premiumUntil && transaksi.user.premiumUntil > now) {
      premiumUntil = new Date(transaksi.user.premiumUntil.getTime() + durationDays * 24 * 60 * 60 * 1000);
    } else {
      premiumUntil = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    }

    const userId = transaksi.userId;
    const period = getCurrentPeriod();
    const previousStatus = transaksi.status;

    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: { isPremium: true, premiumPlan: "PRO", premiumUntil },
      }),
      db.transaksi.update({
        where: { id: transactionId },
        data: { status: "SUCCESS" },
      }),
      db.adminPaymentAuditLog.create({
        data: {
          adminUserId: admin.id,
          targetUserId: userId,
          transactionId,
          action: "MANUAL_ACTIVATE",
          previousValue: previousStatus,
          newValue: "SUCCESS",
          reason,
          metadata: { planId, durationDays, premiumUntil },
        },
      }),
      db.notifikasi.create({
        data: {
          userId,
          title: "Akun PRO Diaktifkan",
          body: `Admin telah mengaktifkan akun PRO-mu secara manual. Berlaku hingga ${premiumUntil.toLocaleDateString("id-ID")}.`,
          type: "PREMIUM",
        },
      }),
    ]);

    // Sync credit ledger
    try {
      const existing = await db.aiCreditLedger.findUnique({
        where: { userId_period_plan: { userId, period, plan: "GURU_PRO" } },
      });

      if (existing) {
        if (existing.creditsTotal < 500) {
          await db.aiCreditLedger.update({
            where: { id: existing.id },
            data: { creditsTotal: 500, source: "manual_activation" },
          });
        }
      } else {
        const endsAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        await db.aiCreditLedger.create({
          data: {
            userId,
            period,
            plan: "GURU_PRO",
            creditsTotal: 500,
            creditsUsed: 0,
            creditsReserved: 0,
            source: "manual_activation",
            startsAt: now,
            endsAt,
          },
        });
      }
    } catch (err) {
      console.error("[ManualActivate] Ledger sync error:", err);
    }

    return NextResponse.json({
      ok: true,
      message: "Premium diaktifkan secara manual",
      premiumUntil,
    });
  } catch (error) {
    console.error("[ManualActivate] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

type UmumTransaksi = {
  id: string;
  userId: string;
  status: string;
  metadata: unknown;
  updatedAt: Date;
  user: { premiumUntil: Date | null; role: string; supabaseId: string | null; trialPlan: string | null; trialEndsAt: Date | null } | null;
};

/**
 * Aktivasi manual Premium Umum (founder). Boleh untuk PENDING, atau SUCCESS
 * yang ditandai needsManualReview oleh webhook dan belum diaktifkan. Tanpa
 * kredit AI, tanpa komisi. Paket dari metadata atau body.planId (UMUM saja).
 */
async function activateUmum({ transaksi, adminId, reason, bodyPlanId }: { transaksi: UmumTransaksi; adminId: string; reason: string; bodyPlanId?: string }) {
  const meta = (transaksi.metadata || {}) as Record<string, any>;
  if (meta.manualActivatedAt) {
    return NextResponse.json({ error: "Transaksi ini sudah diaktifkan manual" }, { status: 400 });
  }
  const reviewable = transaksi.status === "PENDING" || (transaksi.status === "SUCCESS" && meta.needsManualReview === true);
  if (!reviewable) {
    return NextResponse.json({ error: "Transaksi Premium Umum ini tidak menunggu aktivasi" }, { status: 400 });
  }
  const planId = isUmumPlanId(meta.planId) ? meta.planId : isUmumPlanId(bodyPlanId) ? bodyPlanId : null;
  const plan = planId ? getPlan(planId) : null;
  if (!plan) {
    return NextResponse.json({ error: "Pilih paket Premium Umum (planId) untuk transaksi ini" }, { status: 400 });
  }
  if (transaksi.user?.role !== "UMUM") {
    return NextResponse.json({ error: "Akun ini bukan akun Umum — tangani manual (refund/konversi)" }, { status: 400 });
  }

  const now = new Date();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const u = transaksi.user;
  const trialBonusMs = u.trialPlan === UMUM_TRIAL_PLAN && u.trialEndsAt && u.trialEndsAt > now ? u.trialEndsAt.getTime() - now.getTime() : 0;
  const base = u.premiumUntil && u.premiumUntil > now ? u.premiumUntil.getTime() : now.getTime();
  const premiumUntil = new Date(base + plan.durationDays * DAY_MS + trialBonusMs);
  const previousStatus = transaksi.status;

  const done = await db.$transaction(async (tx) => {
    // Klaim atomik (optimistic lock pada updatedAt): hanya satu aktivasi
    // manual per transaksi walau tombol ditekan dua kali.
    const claim = await tx.transaksi.updateMany({
      where: { id: transaksi.id, status: previousStatus, updatedAt: transaksi.updatedAt },
      data: {
        status: "SUCCESS",
        metadata: { ...meta, planId: plan.planId, needsManualReview: false, manualActivatedAt: now.toISOString(), manualActivatedBy: adminId },
      },
    });
    if (claim.count !== 1) return false;
    if (trialBonusMs > 0) {
      await tx.user.updateMany({ where: { id: transaksi.userId, trialPlan: UMUM_TRIAL_PLAN }, data: { trialEndsAt: now } });
    }
    await tx.user.update({ where: { id: transaksi.userId }, data: { isPremium: true, premiumPlan: "PRO", premiumUntil } });
    await tx.adminPaymentAuditLog.create({
      data: {
        adminUserId: adminId,
        targetUserId: transaksi.userId,
        transactionId: transaksi.id,
        action: "MANUAL_ACTIVATE",
        previousValue: previousStatus,
        newValue: "SUCCESS",
        reason,
        metadata: { planId: plan.planId, durationDays: plan.durationDays, premiumUntil, kind: "UMUM_PREMIUM" },
      },
    });
    await tx.notifikasi.create({
      data: {
        userId: transaksi.userId,
        title: "Premium Umum aktif",
        body: `Pembayaranmu sudah diverifikasi. Premium Umum aktif sampai ${premiumUntil.toLocaleDateString("id-ID")}. Tidak ada perpanjangan otomatis.`,
        type: "PREMIUM",
      },
    });
    return true;
  });
  if (!done) {
    return NextResponse.json({ error: "Transaksi berubah saat diproses. Muat ulang lalu coba lagi." }, { status: 409 });
  }
  if (u.supabaseId) {
    await Promise.all([cache.del(`user:me:id:${u.supabaseId}`), cache.del(`user:me:v2:id:${u.supabaseId}`)]).catch(() => {});
  }
  // Sengaja TANPA sinkron ledger kredit AI (Premium Umum tidak punya kredit).
  return NextResponse.json({ ok: true, message: "Premium Umum diaktifkan secara manual", premiumUntil });
}

export const POST = withAdmin(adminPOST, { route: "/api/admin/payments/manual-activate", method: "POST" });
