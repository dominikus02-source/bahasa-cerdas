import { db } from "@/lib/db";
import type { AiPlan, QuotaCheckResult } from "./gateway-types";
import { resolveUserAiPlan } from "./plan-resolver";
import { calculateAgentCost, getExportCost } from "./agent-cost-policy";
import { getQuotaLimits } from "./quota-policy";
import { isHardMode } from "./gateway-config";
import type { UserLike } from "@/lib/types/user";

interface UserLikeWithId extends UserLike { id: string }

function getPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Get or create the credit ledger for a user's current plan/period.
 * Creates the ledger record if it doesn't exist.
 * Fire-and-forget on create errors — never blocks the calling flow.
 */
export async function getOrCreateCreditLedger(
  userId: string,
  plan: AiPlan,
  creditsTotal: number,
  period: string,
  source: string
): Promise<{ creditsUsed: number; creditsReserved: number; ledgerId?: string }> {
  try {
    const now = new Date();
    const endsAt = plan === "GURU_PRO_TRIAL"
      ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      : new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const ledger = await db.aiCreditLedger.upsert({
      where: { userId_period_plan: { userId, period, plan } },
      create: {
        userId,
        period,
        plan,
        creditsTotal,
        creditsUsed: 0,
        creditsReserved: 0,
        source,
        startsAt: now,
        endsAt,
      },
      update: {},
    });

    return { creditsUsed: ledger.creditsUsed, creditsReserved: ledger.creditsReserved, ledgerId: ledger.id };
  } catch {
    return { creditsUsed: 0, creditsReserved: 0 };
  }
}

/**
 * Ensure a monthly ledger exists for non-trial, non-unlimited plans.
 * Called before quota checks to guarantee the ledger is present.
 */
export async function ensureMonthlyLedger(user: UserLikeWithId): Promise<void> {
  const planInfo = resolveUserAiPlan(user);
  if (planInfo.unlimited) return;
  const period = planInfo.isTrial ? "trial" : getPeriod();
  await getOrCreateCreditLedger(
    user.id,
    planInfo.plan,
    planInfo.creditsTotal,
    period,
    planInfo.isTrial ? "trial" : "monthly"
  );
}

/**
 * Get credit usage for a user in a given period.
 */
export async function getCreditUsage(
  userId: string,
  period: string
): Promise<{ creditsUsed: number; creditsReserved: number; creditsTotal: number }> {
  try {
    const ledgers = await db.aiCreditLedger.findMany({
      where: { userId, period },
    });

    return {
      creditsUsed: ledgers.reduce((s, l) => s + l.creditsUsed, 0),
      creditsReserved: ledgers.reduce((s, l) => s + l.creditsReserved, 0),
      creditsTotal: ledgers.reduce((s, l) => s + l.creditsTotal, 0),
    };
  } catch {
    return { creditsUsed: 0, creditsReserved: 0, creditsTotal: 0 };
  }
}

/**
 * Check quota — supports soft mode (Phase 9B) and hard mode (Phase 9D).
 *
 * Hard mode: may set allowed: false if insufficient credits.
 * Soft mode: always returns allowed: true with wouldBlock warning.
 */
export async function checkQuota(
  user: UserLikeWithId,
  agentId: string,
  input: Record<string, unknown> = {}
): Promise<QuotaCheckResult> {
  const planInfo = resolveUserAiPlan(user);
  const cost = calculateAgentCost(agentId, input);
  const limits = getQuotaLimits(planInfo.plan);
  const period = planInfo.isTrial ? "trial" : getPeriod();
  const ledger = await getCreditUsage(user.id, period);

  const adjustedTotal = planInfo.unlimited ? 999999 : planInfo.creditsTotal;
  const creditsUsed = planInfo.unlimited ? 0 : ledger.creditsUsed;
  const creditsRemaining = Math.max(0, adjustedTotal - creditsUsed);

  const wouldBlock = creditsRemaining < cost.credits;
  const hard = isHardMode();

  // Ensure ledger record exists (fire-and-forget on create)
  if (!planInfo.unlimited) {
    await getOrCreateCreditLedger(
      user.id,
      planInfo.plan,
      adjustedTotal,
      period,
      planInfo.isTrial ? "trial" : "monthly"
    );
  }

  const warnings: string[] = [];
  if (wouldBlock) {
    warnings.push(`User would exceed credits: need ${cost.credits}, have ${creditsRemaining} remaining`);
  }

  const result: QuotaCheckResult = {
    allowed: hard ? !wouldBlock : true,
    mode: hard ? "hard" : "soft",
    wouldBlock,
    reason: wouldBlock
      ? hard
        ? `Insufficient credits: need ${cost.credits}, have ${creditsRemaining} remaining`
        : `Soft mode allows request despite insufficient credits (need ${cost.credits}, have ${creditsRemaining})`
      : `Within quota: ${creditsRemaining} credits remaining`,
    creditsRequired: cost.credits,
    creditsUsed,
    creditsTotal: adjustedTotal,
    creditsRemaining,
    plan: planInfo.plan,
    period,
    warning: warnings.length > 0 ? warnings.join("; ") : undefined,
  };

  if (wouldBlock && hard) {
    console.warn(`[Quota Hard Block] user=${user.id} agent=${agentId} plan=${planInfo.plan} need=${cost.credits} have=${creditsRemaining}`);
  } else if (wouldBlock) {
    console.warn(`[Quota Soft Block] user=${user.id} agent=${agentId} plan=${planInfo.plan} need=${cost.credits} have=${creditsRemaining}`);
  } else {
    console.debug(`[Quota OK] user=${user.id} agent=${agentId} plan=${planInfo.plan} remaining=${creditsRemaining}`);
  }

  return result;
}

/**
 * Check quota for export routes.
 * PDF exports are free (0 credits).
 * DOCX and PPTX cost 1 credit.
 */
export async function checkExportQuota(
  user: UserLikeWithId,
  format: "docx" | "pdf" | "pptx"
): Promise<QuotaCheckResult> {
  const planInfo = resolveUserAiPlan(user);
  const cost = getExportCost(format);
  const period = planInfo.isTrial ? "trial" : getPeriod();
  const ledger = await getCreditUsage(user.id, period);

  const adjustedTotal = planInfo.unlimited ? 999999 : planInfo.creditsTotal;
  const creditsUsed = planInfo.unlimited ? 0 : ledger.creditsUsed;
  const creditsRemaining = Math.max(0, adjustedTotal - creditsUsed);

  const wouldBlock = creditsRemaining < cost.credits;
  const hard = isHardMode();

  if (!planInfo.unlimited) {
    await getOrCreateCreditLedger(
      user.id,
      planInfo.plan,
      adjustedTotal,
      period,
      planInfo.isTrial ? "trial" : "monthly"
    );
  }

  return {
    allowed: hard ? !wouldBlock : true,
    mode: hard ? "hard" : "soft",
    wouldBlock,
    reason: wouldBlock
      ? hard
        ? `Insufficient credits: need ${cost.credits}, have ${creditsRemaining}`
        : `Soft mode allows export despite insufficient credits`
      : `Within quota: ${creditsRemaining} credits remaining`,
    creditsRequired: cost.credits,
    creditsUsed,
    creditsTotal: adjustedTotal,
    creditsRemaining,
    plan: planInfo.plan,
    period,
  };
}

/**
 * Atomically deduct credits from a ledger after successful AI generation.
 *
 * Uses a conditional SQL update to prevent race conditions:
 *   UPDATE "AiCreditLedger"
 *   SET creditsUsed = creditsUsed + required
 *   WHERE id = ledgerId
 *     AND creditsUsed + required <= creditsTotal
 *
 * Returns { deducted: true } on success, { deducted: false, reason } on failure.
 *
 * Founder/Admin/Murid bypass — no deduction needed.
 */
export async function deductCreditsAtomic(
  userId: string,
  planInfo: { plan: AiPlan; unlimited: boolean; period: string; isTrial: boolean },
  credits: number
): Promise<{ deducted: boolean; reason?: string }> {
  // Unlimited users bypass deduction
  if (planInfo.unlimited) {
    return { deducted: true };
  }

  // No deduction for 0-credit operations
  if (credits <= 0) {
    return { deducted: true };
  }

  try {
    const ledger = await db.aiCreditLedger.findFirst({
      where: { userId, period: planInfo.period, plan: planInfo.plan },
      orderBy: { createdAt: "desc" },
    });

    if (!ledger) {
      return { deducted: false, reason: "No credit ledger found" };
    }

    if (credits < 0) {
      return { deducted: false, reason: "Invalid negative credit deduction" };
    }

    if (ledger.creditsUsed + credits > ledger.creditsTotal) {
      return { deducted: false, reason: "Insufficient credits" };
    }

    // Atomic update — only succeeds if there are enough credits remaining
    const result = await db.$executeRawUnsafe(
      `UPDATE "AiCreditLedger"
       SET "creditsUsed" = "creditsUsed" + $1
       WHERE id = $2
         AND "creditsUsed" + $1 <= "creditsTotal"
         AND $1 > 0`,
      credits,
      ledger.id
    );

    if (result === 1) {
      console.debug(`[Quota] Deducted ${credits} credit(s) from ledger ${ledger.id} for user ${userId}`);
      return { deducted: true };
    }

    // Race condition or insufficient credits — try as regular block
    return { deducted: false, reason: "Race condition: credits exhausted between check and deduction" };
  } catch (error) {
    console.error("[Quota] Atomic deduction error:", error);
    return { deducted: false, reason: "Internal error during credit deduction" };
  }
}

/**
 * Check and deduct for a non-streaming request.
 * 1. check quota
 * 2. if blocked, return blocked result
 * 3. if allowed, return checkpoint result (caller must call deductCreditsAtomic after success)
 */
export async function checkAndPrepareDeduction(
  user: UserLikeWithId,
  agentId: string,
  input: Record<string, unknown> = {}
): Promise<{ blocked: boolean; quota: QuotaCheckResult; planInfo: { plan: AiPlan; unlimited: boolean; period: string; isTrial: boolean }; credits: number }> {
  const planInfo = resolveUserAiPlan(user);
  const cost = calculateAgentCost(agentId, input);
  const quota = await checkQuota(user, agentId, input);

  return {
    blocked: !quota.allowed,
    quota,
    planInfo: {
      plan: planInfo.plan,
      unlimited: planInfo.unlimited,
      period: planInfo.isTrial ? "trial" : getPeriod(),
      isTrial: planInfo.isTrial,
    },
    credits: cost.credits,
  };
}

/**
 * Get remaining credits for a user (across all periods/plans).
 */
export async function getRemainingCredits(user: UserLikeWithId): Promise<number> {
  const planInfo = resolveUserAiPlan(user);
  if (planInfo.unlimited) return 999999;
  const period = planInfo.isTrial ? "trial" : getPeriod();
  const usage = await getCreditUsage(user.id, period);
  return Math.max(0, planInfo.creditsTotal - usage.creditsUsed);
}

/**
 * Get detailed ledger info for quota status API.
 */
export async function getLedgerInfo(user: UserLikeWithId): Promise<{
  creditsUsed: number;
  creditsTotal: number;
  remainingCredits: number;
  period: string;
  resetAt: Date | null;
}> {
  const planInfo = resolveUserAiPlan(user);
  if (planInfo.unlimited) {
    return { creditsUsed: 0, creditsTotal: 999999, remainingCredits: 999999, period: planInfo.period, resetAt: null };
  }
  const period = planInfo.isTrial ? "trial" : getPeriod();
  const usage = await getCreditUsage(user.id, period);

  let resetAt: Date | null = null;
  if (!planInfo.isTrial) {
    resetAt = new Date();
    resetAt.setMonth(resetAt.getMonth() + 1);
    resetAt.setDate(1);
    resetAt.setHours(0, 0, 0, 0);
  }

  return {
    creditsUsed: usage.creditsUsed,
    creditsTotal: planInfo.creditsTotal,
    remainingCredits: Math.max(0, planInfo.creditsTotal - usage.creditsUsed),
    period,
    resetAt,
  };
}
