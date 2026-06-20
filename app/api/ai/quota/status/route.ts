import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { resolveUserAiPlan } from "@/lib/ai-gateway/plan-resolver";
import { getRemainingCredits, getLedgerInfo, ensureMonthlyLedger } from "@/lib/ai-gateway/quota-checker";
import { getTrialStatus } from "@/lib/ai-gateway/trial-service";
import { isHardMode } from "@/lib/ai-gateway/gateway-config";
import { calculateAgentCost } from "@/lib/ai-gateway/agent-cost-policy";

/**
 * GET /api/ai/quota/status
 *
 * Returns the current user's AI plan, credit balance, trial status,
 * hard mode flag, reset date, and per-weight can-generate checks.
 *
 * Auth required. User can only access their own status.
 * No sensitive data exposed.
 */
export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const planInfo = resolveUserAiPlan({
      role: user.role,
      isFounder: user.isFounder,
      isPremium: user.isPremium,
      premiumUntil: user.premiumUntil,
      trialEndsAt: user.trialEndsAt,
      trialStartedAt: user.trialStartedAt,
      premiumPlan: user.premiumPlan,
    });

    const trialStatus = getTrialStatus({
      trialEndsAt: user.trialEndsAt,
      trialStartedAt: user.trialStartedAt,
      trialPlan: user.trialPlan,
      isPremium: user.isPremium,
      isFounder: user.isFounder,
    });

    // Ensure ledger exists for accurate reads
    await ensureMonthlyLedger(user);

    const ledgerInfo = await getLedgerInfo(user);
    const remainingCredits = planInfo.unlimited
      ? 999999
      : await getRemainingCredits({
          id: user.id,
          role: user.role,
          isFounder: user.isFounder,
          isPremium: user.isPremium,
          premiumUntil: user.premiumUntil,
          trialEndsAt: user.trialEndsAt,
          trialStartedAt: user.trialStartedAt,
          premiumPlan: user.premiumPlan,
        });

    // Per-weight can-generate checks
    const hard = isHardMode();
    const lightCost = calculateAgentCost("eyd", {}).credits;
    const mediumCost = calculateAgentCost("grading", {}).credits;
    const heavyCost = calculateAgentCost("rpp", {}).credits;

    return NextResponse.json({
      plan: planInfo.plan,
      unlimited: planInfo.unlimited,
      creditsTotal: planInfo.unlimited ? 999999 : planInfo.creditsTotal,
      creditsUsed: ledgerInfo.creditsUsed,
      remainingCredits,
      period: planInfo.period,
      resetAt: ledgerInfo.resetAt?.toISOString() ?? null,
      isTrial: trialStatus.isTrialActive,
      trialEndsAt: trialStatus.trialEndsAt?.toISOString() ?? null,
      daysRemaining: trialStatus.daysRemaining,
      hardMode: hard,
      canGenerateLight: planInfo.unlimited || remainingCredits >= lightCost,
      canGenerateMedium: planInfo.unlimited || remainingCredits >= mediumCost,
      canGenerateHeavy: planInfo.unlimited || remainingCredits >= heavyCost,
    });
  } catch (error) {
    console.error("[Quota Status] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
