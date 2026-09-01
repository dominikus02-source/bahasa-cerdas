import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { z } from "zod";

// ════════════════════════════════════════════════════════════════════
// PAYMENT HEALTH — Fix Entitlement
//
// Safe remediation for SUCCESS payments without active entitlement.
// Reuses canonical activation logic from webhook/manual-activate.
//
// Safety:
//   - Founder-only authorization
//   - Transaction must be SUCCESS + qualifying Premium type
//   - Idempotent: if entitlement already active, returns already_active
//   - Audit logged to AdminPaymentAuditLog
//   - Never accepts arbitrary premiumUntil/premiumPlan from client
// ════════════════════════════════════════════════════════════════════

const bodySchema = z.object({
  transactionId: z.string().min(1, "transactionId wajib diisi"),
  reason: z.string().min(1, "Alasan wajib diisi").max(300, "Alasan maksimal 300 karakter"),
});

const QUALIFYING_TYPES = ["MURID_PREMIUM", "PREMIUM_UPGRADE"] as const;

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

    // ── 1. Find the qualifying transaction ──
    const transaksi = await db.transaksi.findUnique({
      where: { id: transactionId },
      include: {
        user: {
          select: {
            id: true, fullName: true, email: true, role: true,
            isPremium: true, premiumUntil: true, premiumPlan: true, isFounder: true,
          },
        },
      },
    });

    if (!transaksi) {
      return NextResponse.json({ error: "Transaksi tidak ditemukan" }, { status: 404 });
    }

    // ── 2. Validate transaction semantics ──
    if (!QUALIFYING_TYPES.includes(transaksi.type as typeof QUALIFYING_TYPES[number])) {
      return NextResponse.json(
        { error: `Bukan transaksi premium. Type: ${transaksi.type}` },
        { status: 400 },
      );
    }

    if (transaksi.status !== "SUCCESS") {
      return NextResponse.json(
        { error: `Transaksi bukan SUCCESS. Status: ${transaksi.status}` },
        { status: 400 },
      );
    }

    if (transaksi.user?.isFounder) {
      return NextResponse.json(
        { error: "User adalah founder — tidak perlu remediasi" },
        { status: 400 },
      );
    }

    // ── 3. Idempotency: check if entitlement is already active ──
    const now = new Date();
    if (transaksi.user?.isPremium && transaksi.user.premiumUntil && transaksi.user.premiumUntil > now) {
      return NextResponse.json({
        ok: true,
        status: "already_active",
        message: `Premium sudah aktif hingga ${transaksi.user.premiumUntil.toISOString()}`,
        user: {
          id: transaksi.user.id,
          fullName: transaksi.user.fullName,
          isPremium: true,
          premiumUntil: transaksi.user.premiumUntil.toISOString(),
        },
      });
    }

    // ── 4. Determine plan duration (same logic as webhook) ──
    const isMurid = transaksi.type === "MURID_PREMIUM";
    const meta = (transaksi.metadata || {}) as Record<string, unknown>;
    const planId = (meta.planId as string) || transaksi.reference || (isMurid ? "MURID_PREMIUM_MONTHLY" : "GURU_PRO_MONTHLY");

    let durationDays = 30;
    if (planId.includes("YEARLY") || meta.durationDays === 365) {
      durationDays = 365;
    }

    // ── 5. Calculate premiumUntil (extend if existing, else fresh) ──
    let premiumUntil: Date;
    if (transaksi.user?.premiumUntil && transaksi.user.premiumUntil > now) {
      premiumUntil = new Date(transaksi.user.premiumUntil.getTime() + durationDays * 24 * 60 * 60 * 1000);
    } else {
      premiumUntil = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    }

    const userId = transaksi.userId;

    // ── 6. Activate entitlement + audit log (atomic) ──
    await db.$transaction([
      db.user.update({
        where: { id: userId },
        data: { isPremium: true, premiumPlan: "PRO", premiumUntil },
      }),
      db.adminPaymentAuditLog.create({
        data: {
          adminUserId: admin.id,
          targetUserId: userId,
          transactionId,
          action: "ENTITLEMENT_FIX",
          previousValue: JSON.stringify({
            isPremium: transaksi.user?.isPremium ?? false,
            premiumUntil: transaksi.user?.premiumUntil?.toISOString() ?? null,
          }),
          newValue: JSON.stringify({
            isPremium: true,
            premiumUntil: premiumUntil.toISOString(),
            planId,
            durationDays,
          }),
          reason,
          metadata: {
            source: "payment-health-remediation",
            transactionType: transaksi.type,
            transactionAmount: transaksi.amount,
          },
        },
      }),
      db.notifikasi.create({
        data: {
          userId,
          title: "Premium Dipulihkan",
          body: `Admin telah memulihkan hak premium-mu. Berlaku hingga ${premiumUntil.toLocaleDateString("id-ID")}.`,
          type: "PREMIUM",
        },
      }),
    ]);

    console.log("[ENTITLEMENT_FIX]", {
      adminId: admin.id,
      adminName: admin.fullName,
      userId,
      userName: transaksi.user?.fullName,
      transactionId,
      planId,
      durationDays,
      premiumUntil: premiumUntil.toISOString(),
    });

    return NextResponse.json({
      ok: true,
      status: "fixed",
      message: "Premium entitlement dipulihkan",
      user: {
        id: userId,
        fullName: transaksi.user?.fullName,
        email: transaksi.user?.email,
      },
      entitlement: {
        isPremium: true,
        premiumPlan: "PRO",
        premiumUntil: premiumUntil.toISOString(),
        planId,
        durationDays,
      },
    });
  } catch (error) {
    console.error("[Payment Health Fix] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
