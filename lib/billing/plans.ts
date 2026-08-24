export type PlanId =
  | "GURU_PRO_MONTHLY"
  | "GURU_PRO_YEARLY"
  | "MURID_PREMIUM_MONTHLY"
  | "MURID_PREMIUM_YEARLY";

export interface ProductPlan {
  planId: PlanId;
  label: string;
  price: number;
  durationDays: number;
  /** 0 for murid — murid premium uses feature-tiered caps, not AI credits. */
  aiCreditsMonthly: number;
  /** Target role: "GURU" | "MURID". Used by checkout to gate access. */
  targetRole: string;
}

const PLANS: Record<PlanId, ProductPlan> = {
  GURU_PRO_MONTHLY: {
    planId: "GURU_PRO_MONTHLY",
    label: "Guru Pro Bulanan",
    price: 49000,
    durationDays: 30,
    aiCreditsMonthly: 500,
    targetRole: "GURU",
  },
  GURU_PRO_YEARLY: {
    planId: "GURU_PRO_YEARLY",
    label: "Guru Pro Tahunan",
    price: 399000,
    durationDays: 365,
    aiCreditsMonthly: 500,
    targetRole: "GURU",
  },
  MURID_PREMIUM_MONTHLY: {
    planId: "MURID_PREMIUM_MONTHLY",
    label: "Premium Bulanan",
    price: 19000,
    durationDays: 30,
    aiCreditsMonthly: 0,
    targetRole: "MURID",
  },
  MURID_PREMIUM_YEARLY: {
    planId: "MURID_PREMIUM_YEARLY",
    label: "Premium Tahunan",
    price: 180000,
    durationDays: 365,
    aiCreditsMonthly: 0,
    targetRole: "MURID",
  },
};

export function getPlan(planId: string): ProductPlan | null {
  return PLANS[planId as PlanId] ?? null;
}

export function getAllPlans(): ProductPlan[] {
  return Object.values(PLANS);
}
