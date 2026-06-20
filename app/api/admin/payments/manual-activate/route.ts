import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  transactionId: z.string().min(1, "transactionId wajib diisi"),
  reason: z.string().min(1, "Alasan wajib diisi").max(300, "Alasan maksimal 300 karakter"),
});

function getCurrentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function POST(req: NextRequest) {
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

    const { transactionId, reason } = parsed.data;

    const transaksi = await db.transaksi.findUnique({
      where: { id: transactionId },
      include: { user: { select: { id: true, fullName: true, email: true, premiumUntil: true } } },
    });

    if (!transaksi) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    if (transaksi.type !== "PREMIUM_UPGRADE") {
      return NextResponse.json({ error: "Bukan transaksi premium upgrade" }, { status: 400 });
    }

    if (transaksi.status === "SUCCESS") {
      return NextResponse.json({ error: "Transaksi sudah SUCCESS" }, { status: 400 });
    }

    const meta = (transaksi.metadata || {}) as Record<string, any>;
    let durationDays = 30;
    const planId = meta.planId || transaksi.reference || "GURU_PRO_MONTHLY";

    if (planId === "GURU_PRO_YEARLY" || meta.durationDays === 365) {
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
