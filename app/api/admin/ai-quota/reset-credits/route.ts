/**
 * POST /api/admin/ai-quota/reset-credits — Reset a user's monthly credits.
 *
 * Body: { userId, period?, reason }
 *   userId (required): the user to reset
 *   period (optional, default current month "YYYY-MM"): which period to reset
 *   reason (required): must provide a reason
 *
 * Auth: Founder only.
 *
 * Behavior:
 *   - Sets creditsUsed = 0 for the specified ledger period.
 *   - If no ledger exists, creates one with creditsUsed = 0.
 *   - Does NOT affect trial ledgers (period = "trial").
 *   - Creates AdminQuotaAuditLog entry.
 *   - Blocks no-op reset if creditsUsed already 0, unless reason includes "force".
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db as prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  userId: z.string().min(1, "userId wajib diisi"),
  period: z.string().optional(),
  reason: z.string().min(1, "Alasan wajib diisi").max(300, "Alasan maksimal 300 karakter"),
});

function getPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function POST(req: NextRequest) {
  try {
    const admin = await getUser();
    if (!admin || !admin.isFounder) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: parsed.error.errors[0]?.message || "Data tidak valid",
      }, { status: 400 });
    }

    const { userId, period, reason } = parsed.data;
    const targetPeriod = period || getPeriod();

    if (targetPeriod === "trial") {
      return NextResponse.json({
        success: false,
        error: "Tidak bisa reset trial period. Gunakan extend-trial untuk memperpanjang.",
      }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isFounder: true },
    });

    if (!target) {
      return NextResponse.json({ success: false, error: "User tidak ditemukan" }, { status: 404 });
    }

    if (target.role === "ADMIN" || target.isFounder) {
      return NextResponse.json({
        success: false,
        error: "Tidak bisa reset kredit untuk Admin atau Founder.",
      }, { status: 400 });
    }

    // Check current ledger to prevent no-op reset
    const existingLedger = await prisma.aiCreditLedger.findFirst({
      where: { userId, period: targetPeriod },
      orderBy: { createdAt: "desc" },
    });

    const creditsUsedBefore = existingLedger?.creditsUsed ?? 0;
    const isForceReset = reason.toLowerCase().includes("force");

    if (creditsUsedBefore === 0 && !isForceReset) {
      return NextResponse.json({
        success: false,
        error: "Kredit sudah 0. Tidak perlu reset. Tambahkan alasan 'force' jika tetap ingin mereset.",
      }, { status: 400 });
    }

    const now = new Date();
    const endsAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    let plan = "GURU_FREE";
    if (target.role === "MURID") plan = "MURID_FREE";
    // ADMIN/Founder already rejected above

    let creditsTotal = 30;
    if (plan === "MURID_FREE") creditsTotal = 999999;

    const ledger = await prisma.$transaction(async (tx) => {
      const l = await tx.aiCreditLedger.upsert({
        where: { userId_period_plan: { userId, period: targetPeriod, plan } },
        create: {
          userId,
          period: targetPeriod,
          plan,
          creditsTotal,
          creditsUsed: 0,
          creditsReserved: 0,
          source: "admin_reset",
          startsAt: now,
          endsAt,
        },
        update: {
          creditsUsed: 0,
          creditsReserved: 0,
          source: "admin_reset",
          endsAt,
        },
      });

      await tx.adminQuotaAuditLog.create({
        data: {
          adminUserId: admin.id,
          targetUserId: userId,
          action: "RESET_CREDITS",
          amount: creditsUsedBefore,
          previousValue: String(creditsUsedBefore),
          newValue: "0",
          reason,
          metadata: {
            period: targetPeriod,
            plan,
            creditsTotal,
            isForceReset,
          },
        },
      });

      return l;
    });

    console.log(`[Admin] Reset credits for user ${userId} period ${targetPeriod}: was ${creditsUsedBefore}, now 0`);

    return NextResponse.json({
      success: true,
      data: {
        userId,
        period: targetPeriod,
        ledgerId: ledger.id,
        creditsTotal: ledger.creditsTotal,
        creditsUsed: 0,
        previousCreditsUsed: creditsUsedBefore,
      },
    });
  } catch (err: any) {
    console.error("[Admin Reset Credits] Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal error" }, { status: 500 });
  }
}
