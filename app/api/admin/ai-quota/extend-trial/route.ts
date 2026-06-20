/**
 * POST /api/admin/ai-quota/extend-trial — Extend a user's trial by N days.
 *
 * Body: { userId, days, reason? }
 *   userId (required): the user to extend
 *   days   (required, 1-365): number of days to add
 *   reason (optional, max 300 chars): required if days > 30
 *
 * Auth: Founder only.
 *
 * Behavior:
 *   - If user has no trial (trialEndsAt is null), does nothing.
 *   - If trial is expired (trialEndsAt < now), sets trialEndsAt = now + days.
 *   - If trial is active, extends by days.
 *   - Also extends the trial ledger endsAt.
 *   - Creates AdminQuotaAuditLog entry in the same transaction.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db as prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  userId: z.string().min(1, "userId wajib diisi"),
  days: z.number().int().min(1, "Minimal 1 hari").max(365, "Maksimal 365 hari"),
  reason: z.string().max(300, "Alasan maksimal 300 karakter").optional(),
});

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

    const { userId, days, reason } = parsed.data;

    // Reason required if extending > 30 days
    if (days > 30 && (!reason || reason.trim().length === 0)) {
      return NextResponse.json({
        success: false,
        error: "Alasan wajib diisi untuk perpanjangan lebih dari 30 hari.",
      }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, trialEndsAt: true, trialStartedAt: true, trialPlan: true },
    });

    if (!target) {
      return NextResponse.json({ success: false, error: "User tidak ditemukan" }, { status: 404 });
    }

    // Cannot extend trial for founders/admins
    const targetRole = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isFounder: true },
    });
    if (targetRole?.role === "ADMIN" || targetRole?.isFounder) {
      return NextResponse.json({
        success: false,
        error: "Tidak bisa memperpanjang trial untuk Admin atau Founder.",
      }, { status: 400 });
    }

    const now = new Date();
    const extensionMs = days * 24 * 60 * 60 * 1000;
    const wasActive = target.trialEndsAt !== null && target.trialEndsAt > now;

    // Calculate new trial end date
    let newTrialEndsAt: Date;
    if (!target.trialEndsAt || target.trialEndsAt <= now) {
      newTrialEndsAt = new Date(now.getTime() + extensionMs);
    } else {
      newTrialEndsAt = new Date(target.trialEndsAt.getTime() + extensionMs);
    }

    const previousValue = target.trialEndsAt?.toISOString() ?? null;
    const newValue = newTrialEndsAt.toISOString();

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          trialEndsAt: newTrialEndsAt,
          trialStartedAt: target.trialStartedAt ?? now,
          trialPlan: "GURU_PRO_TRIAL",
          trialCreditsTotal: 200,
        },
      }),
      prisma.aiCreditLedger.updateMany({
        where: { userId, period: "trial", plan: "GURU_PRO_TRIAL" },
        data: { endsAt: newTrialEndsAt },
      }),
      prisma.adminQuotaAuditLog.create({
        data: {
          adminUserId: admin.id,
          targetUserId: userId,
          action: "EXTEND_TRIAL",
          amount: days,
          previousValue,
          newValue,
          reason: reason ?? null,
          metadata: {
            wasActive,
            previousPlan: target.trialPlan,
            daysAdded: days,
          },
        },
      }),
    ]);

    console.log(`[Admin] Extended trial for user ${userId}: +${days} days, new end ${newTrialEndsAt.toISOString()}`);

    return NextResponse.json({
      success: true,
      data: {
        userId,
        trialEndsAt: newTrialEndsAt.toISOString(),
        daysAdded: days,
      },
    });
  } catch (err: any) {
    console.error("[Admin Extend Trial] Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Internal error" }, { status: 500 });
  }
}
