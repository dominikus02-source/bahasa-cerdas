/**
 * POST /api/admin/ai-quota/allocate — Manually allocate extra credits to a user.
 *
 * Body: { userId, credits, reason? }
 *   userId  (required): the user to allocate credits to
 *   credits (required, 1-10000): number of extra credits to add
 *   reason  (optional, max 300 chars): required if credits > 500
 *
 * Auth: Founder only.
 *
 * Behavior:
 *   - Increases creditsTotal for the current period ledger.
 *   - If no ledger exists, creates a new one with the given credits.
 *   - Does NOT modify creditsUsed.
 *   - Does NOT affect trial ledgers (period = "trial") — use extend-trial instead.
 *   - Creates AdminQuotaAuditLog entry.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db as prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  userId: z.string().min(1, "userId wajib diisi"),
  credits: z.number().int().min(1, "Minimal 1 kredit").max(10000, "Maksimal 10000 kredit"),
  reason: z.string().max(300, "Alasan maksimal 300 karakter").optional(),
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

    const { userId, credits, reason } = parsed.data;

    // Reason required if allocating > 500 credits
    if (credits > 500 && (!reason || reason.trim().length === 0)) {
      return NextResponse.json({
        success: false,
        error: "Alasan wajib diisi untuk alokasi lebih dari 500 kredit.",
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
        error: "Tidak bisa alokasi kredit untuk Admin atau Founder (mereka sudah unlimited).",
      }, { status: 400 });
    }

    const period = getPeriod();
    const now = new Date();
    const endsAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    let plan = "GURU_FREE";
    if (target.role === "MURID") plan = "MURID_FREE";
    // ADMIN/Founder already rejected above

    let baseCredits = 30;
    if (plan === "MURID_FREE" || plan === "FOUNDER") baseCredits = 999999;

    const ledger = await prisma.$transaction(async (tx) => {
      const l = await tx.aiCreditLedger.upsert({
        where: { userId_period_plan: { userId, period, plan } },
        create: {
          userId,
          period,
          plan,
          creditsTotal: credits + baseCredits,
          creditsUsed: 0,
          creditsReserved: 0,
          source: "admin_allocation",
          startsAt: now,
          endsAt,
        },
        update: {
          creditsTotal: { increment: credits },
          source: "admin_allocation",
          endsAt,
        },
      });

      await tx.adminQuotaAuditLog.create({
        data: {
          adminUserId: admin.id,
          targetUserId: userId,
          action: "ALLOCATE_CREDITS",
          amount: credits,
          previousValue: String(l.creditsTotal - credits),
          newValue: String(l.creditsTotal),
          reason: reason ?? null,
          metadata: {
            period,
            plan,
            totalAfterAllocation: l.creditsTotal,
          },
        },
      });

      return l;
    });

    console.log(`[Admin] Allocated ${credits} credits to user ${userId}. Reason: ${reason || "none"}. Ledger: ${ledger.id}`);

    return NextResponse.json({
      success: true,
      data: {
        userId,
        period,
        ledgerId: ledger.id,
        previousCreditsTotal: ledger.creditsTotal - credits,
        newCreditsTotal: ledger.creditsTotal,
        creditsAllocated: credits,
        reason: reason || null,
      },
    });
  } catch (err: any) {
    console.error("[Admin Allocate Credits] Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal error" }, { status: 500 });
  }
}
