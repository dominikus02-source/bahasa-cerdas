/**
 * BC Premium Economy — matrix entitlement default.
 *
 * Fallback saat baris `Entitlement` belum ada di DB (migration belum
 * dijalankan atau plan baru belum di-seed). Engine membaca DB dulu
 * (DB-first), matrix ini hanya penjaga. Angka AI: hasil audit — limit AI
 * existing berbasis kredit bulanan (resolveUserAiPlan/AiCreditLedger), BUKAN
 * limit harian per fitur; karena itu AI_MENTOR/AI_PRACTICE = unlimited agar
 * perilaku existing tidak berubah. Hanya SIMULATION yang di-enforce fase ini.
 */

import type { EntitlementKey } from "./features";
import type { PlanCode } from "./plans";

export type EntitlementValue = number | boolean | "unlimited";

export const DEFAULT_ENTITLEMENT_MATRIX: Record<
  PlanCode,
  Record<EntitlementKey, EntitlementValue>
> = {
  FREE: {
    SIMULATION_MONTHLY_LIMIT: 3,
    AI_MENTOR_DAILY_LIMIT: "unlimited",
    AI_PRACTICE_MONTHLY_LIMIT: "unlimited",
    PREMIUM_PROFILE: false,
    PREMIUM_COSMETICS: false,
    ADVANCED_STATS: false,
    STREAK_FREEZE_MONTHLY: 0,
  },
  PRO: {
    // Guru Pro — credit-based AI via AiCreditLedger (500 credits/mo)
    // Feature limits below are for Premium Economy layer only.
    SIMULATION_MONTHLY_LIMIT: 10,
    AI_MENTOR_DAILY_LIMIT: "unlimited",
    AI_PRACTICE_MONTHLY_LIMIT: "unlimited",
    PREMIUM_PROFILE: true,
    PREMIUM_COSMETICS: true,
    ADVANCED_STATS: true,
    STREAK_FREEZE_MONTHLY: 1,
  },
  MURID_PREMIUM: {
    // Murid Premium — feature-tiered (NO AI credits)
    // Caps enforced via PremiumUsage atomic consumption.
    SIMULATION_MONTHLY_LIMIT: 10,
    AI_MENTOR_DAILY_LIMIT: 30,    // 30 explanations per day
    AI_PRACTICE_MONTHLY_LIMIT: 50, // 50 adaptive sessions per month
    PREMIUM_PROFILE: true,
    PREMIUM_COSMETICS: true,
    ADVANCED_STATS: true,
    STREAK_FREEZE_MONTHLY: 1,
  },
  FOUNDER: {
    SIMULATION_MONTHLY_LIMIT: "unlimited",
    AI_MENTOR_DAILY_LIMIT: "unlimited",
    AI_PRACTICE_MONTHLY_LIMIT: "unlimited",
    PREMIUM_PROFILE: true,
    PREMIUM_COSMETICS: true,
    ADVANCED_STATS: true,
    STREAK_FREEZE_MONTHLY: "unlimited",
  },
};

/**
 * Konversi nilai entitlement → angka limit.
 * BOOLEAN true → 1, false → 0; "unlimited" → Infinity; angka → angka.
 */
export function entitlementValueToLimit(value: EntitlementValue): number {
  if (value === "unlimited") return Infinity;
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

export function entitlementValueToScalar(value: EntitlementValue): number {
  if (value === "unlimited") return -1;
  if (typeof value === "boolean") return value ? 1 : 0;
  return value;
}

export function scalarToEntitlementValue(
  scalar: number,
  key: EntitlementKey
): EntitlementValue {
  const isBool = key === "PREMIUM_PROFILE" || key === "PREMIUM_COSMETICS" || key === "ADVANCED_STATS";
  if (isBool) return scalar > 0;
  if (scalar < 0) return "unlimited";
  return scalar;
}
