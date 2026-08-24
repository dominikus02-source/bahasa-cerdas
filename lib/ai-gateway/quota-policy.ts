import type { AiPlan } from "./gateway-types";

export interface QuotaLimits {
  creditsPerMonth: number;
  maxPerRequest: number;
  dailyVelocityCap: number;
  savedResultLimit: number;
}

const QUOTA_LIMITS: Record<AiPlan, QuotaLimits> = {
  FOUNDER: {
    creditsPerMonth: 999999,
    maxPerRequest: 999999,
    dailyVelocityCap: 999999,
    savedResultLimit: -1,
  },
  MURID_FREE: {
    creditsPerMonth: 999999,
    maxPerRequest: 999999,
    dailyVelocityCap: 999999,
    savedResultLimit: -1,
  },
  // Murid Premium uses feature-tiered caps (Premium Economy), not AI credits.
  // AI Gateway keeps MURID_FREE unlimited — no credit deduction for murid.
  MURID_PREMIUM: {
    creditsPerMonth: 999999,
    maxPerRequest: 999999,
    dailyVelocityCap: 999999,
    savedResultLimit: -1,
  },
  GURU_PRO: {
    creditsPerMonth: 500,
    maxPerRequest: 50,
    dailyVelocityCap: 200,
    savedResultLimit: -1,
  },
  GURU_PRO_TRIAL: {
    creditsPerMonth: 200,
    maxPerRequest: 50,
    dailyVelocityCap: 100,
    savedResultLimit: 200,
  },
  GURU_FREE: {
    creditsPerMonth: 30,
    maxPerRequest: 10,
    dailyVelocityCap: 20,
    savedResultLimit: 50,
  },
  SCHOOL: {
    creditsPerMonth: 5000,
    maxPerRequest: 50,
    dailyVelocityCap: 500,
    savedResultLimit: -1,
  },
};

export function getQuotaLimits(plan: AiPlan): QuotaLimits {
  return QUOTA_LIMITS[plan] ?? QUOTA_LIMITS.GURU_FREE;
}
