import type { PlanResolverResult, AiPlan } from "./gateway-types";

interface UserLike {
  role: string;
  isFounder: boolean;
  isPremium: boolean;
  premiumUntil: Date | null;
  trialEndsAt: Date | null;
  trialStartedAt: Date | null;
  premiumPlan: string;
}

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

  // Murid — free, unlimited for now
  if (user.role === "MURID") {
    return {
      plan: "MURID_FREE",
      unlimited: true,
      creditsTotal: 999999,
      period,
      isTrial: false,
      trialEndsAt: null,
      reason: "Murid — free access, no restrictions yet",
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
