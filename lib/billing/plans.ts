export type PlanId = "GURU_PRO_MONTHLY" | "GURU_PRO_YEARLY";

export interface ProductPlan {
  planId: PlanId;
  label: string;
  price: number;
  durationDays: number;
  aiCreditsMonthly: number;
}

const PLANS: Record<PlanId, ProductPlan> = {
  GURU_PRO_MONTHLY: {
    planId: "GURU_PRO_MONTHLY",
    label: "Guru Pro Bulanan",
    price: 49000,
    durationDays: 30,
    aiCreditsMonthly: 500,
  },
  GURU_PRO_YEARLY: {
    planId: "GURU_PRO_YEARLY",
    label: "Guru Pro Tahunan",
    price: 399000,
    durationDays: 365,
    aiCreditsMonthly: 500,
  },
};

export function getPlan(planId: string): ProductPlan | null {
  return PLANS[planId as PlanId] ?? null;
}

export function getAllPlans(): ProductPlan[] {
  return Object.values(PLANS);
}
