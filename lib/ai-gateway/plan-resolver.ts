import type { PlanResolverResult, AiPlan } from "./gateway-types";
import type { UserLike } from "@/lib/types/user";

function getPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

export function resolveUserAiPlan(user: UserLike): PlanResolverResult {
  const now = new Date();
  const period = getPeriod();

  // Founder / Admin — unlimited
  if (user.role === "ADMIN" || user.isFounder) {
    return {
      plan: "FOUNDER",
      unlimited: true,
      creditsTotal: 999999,
      period,
      isTrial: false,
      trialEndsAt: null,
      reason: "Founder or Admin — unlimited access",
    };
  }

  // Murid — free, unlimited for now.
  // AI Gateway is GURU-ONLY for credit billing.
  // Murid Premium uses feature-tiered caps via Premium Economy (lib/premium-economy/),
  // NOT credit-based billing via AiCreditLedger.
  // So ALL murid (free + premium) get MURID_FREE here = unlimited AI credits.
  if (user.role === "MURID") {
    return {
      plan: "MURID_FREE",
      unlimited: true,
      creditsTotal: 999999,
      period,
      isTrial: false,
      trialEndsAt: null,
      reason: "Murid — unlimited AI (feature-tiered via Premium Economy)",
    };
  }

  // Guru with active premium subscription
  if (user.isPremium && user.premiumUntil && user.premiumUntil > now) {
    return {
      plan: "GURU_PRO",
      unlimited: false,
      creditsTotal: 500,
      period,
      isTrial: false,
      trialEndsAt: null,
      reason: "Guru Pro — 500 credits per month",
    };
  }

  // Guru with active trial
  if (user.trialEndsAt && user.trialEndsAt > now) {
    return {
      plan: "GURU_PRO_TRIAL",
      unlimited: false,
      creditsTotal: 200,
      period: "trial",
      isTrial: true,
      trialEndsAt: user.trialEndsAt,
      reason: "Guru Pro Trial — 200 credits total",
    };
  }

  // Guru Free (default)
  return {
    plan: "GURU_FREE",
    unlimited: false,
    creditsTotal: 30,
    period,
    isTrial: false,
    trialEndsAt: null,
    reason: "Guru Free — 30 credits per month",
  };
}
