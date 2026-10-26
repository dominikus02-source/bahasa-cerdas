export type PlanId =
  | "GURU_PRO_MONTHLY"
  | "GURU_PRO_YEARLY"
  | "MURID_PREMIUM_MONTHLY"
  | "MURID_PREMIUM_YEARLY"
  | "UMUM_PREMIUM_MONTHLY"
  | "UMUM_PREMIUM_YEARLY";

export interface ProductPlan {
  planId: PlanId;
  label: string;
  price: number;
  durationDays: number;
  /** 0 for murid — murid premium uses feature-tiered caps, not AI credits. */
  aiCreditsMonthly: number;
  /** Target role: "GURU" | "MURID" | "UMUM". Used by checkout to gate access. */
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
  // Premium Umum — sekali bayar via Midtrans Snap, TANPA perpanjangan
  // otomatis, TANPA kredit AI, TANPA komisi guru. Harga keputusan pendiri
  // (26 Okt 2026). Halaman /umum/premium membaca angka dari sini.
  UMUM_PREMIUM_MONTHLY: {
    planId: "UMUM_PREMIUM_MONTHLY",
    label: "Premium Umum Bulanan",
    price: 79000,
    durationDays: 30,
    aiCreditsMonthly: 0,
    targetRole: "UMUM",
  },
  UMUM_PREMIUM_YEARLY: {
    planId: "UMUM_PREMIUM_YEARLY",
    label: "Premium Umum Tahunan",
    price: 849000,
    durationDays: 365,
    aiCreditsMonthly: 0,
    targetRole: "UMUM",
  },
};

export function getPlan(planId: string): ProductPlan | null {
  return PLANS[planId as PlanId] ?? null;
}

export function getAllPlans(): ProductPlan[] {
  return Object.values(PLANS);
}

/** Plan Premium Umum (prefix tetap — dipakai webhook untuk menolak metadata asing). */
export const UMUM_PLAN_PREFIX = "UMUM_PREMIUM_";

export function isUmumPlanId(planId: unknown): planId is "UMUM_PREMIUM_MONTHLY" | "UMUM_PREMIUM_YEARLY" {
  return typeof planId === "string" && planId.startsWith(UMUM_PLAN_PREFIX) && getPlan(planId)?.targetRole === "UMUM";
}

export function getUmumPlans(): ProductPlan[] {
  return getAllPlans().filter((p) => p.targetRole === "UMUM");
}

/**
 * Tipe Transaksi per targetRole — allowlist EKSPLISIT. targetRole yang tidak
 * dikenal → null (checkout menolak), tidak pernah jatuh ke tipe guru.
 */
export const TRANSACTION_TYPE_BY_TARGET_ROLE: Readonly<Record<string, string>> = Object.freeze({
  GURU: "PREMIUM_UPGRADE",
  MURID: "MURID_PREMIUM",
  UMUM: "UMUM_PREMIUM",
});

export function transactionTypeForPlan(plan: ProductPlan): string | null {
  return Object.prototype.hasOwnProperty.call(TRANSACTION_TYPE_BY_TARGET_ROLE, plan.targetRole)
    ? TRANSACTION_TYPE_BY_TARGET_ROLE[plan.targetRole]
    : null;
}

/** Semua tipe Transaksi paket premium (laporan admin, riwayat). */
export const PREMIUM_TRANSACTION_TYPES = ["PREMIUM_UPGRADE", "MURID_PREMIUM", "UMUM_PREMIUM"] as const;

/** Label paket untuk riwayat/status (satu sumber). */
export function planLabel(planId: string | null | undefined): string | null {
  return planId ? getPlan(planId)?.label ?? null : null;
}
