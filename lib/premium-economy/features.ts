/**
 * BC Premium Economy — source of truth fitur & entitlement.
 *
 * Satu-satunya tempat mendefinisikan nama fitur. Jangan pakai string literal
 * berbeda-beda di route — impor dari sini.
 *
 * Dua lapis:
 *  - ENTITLEMENT_KEYS: capability/limit per plan (disimpan di tabel
 *    `Entitlement`). Contoh: SIMULATION_MONTHLY_LIMIT.
 *  - USAGE_FEATURES: fitur yang KONSUMSI kuota periodik (disimpan di tabel
 *    `PremiumUsage`). Contoh: SIMULATION (dipakai tiap attempt simulasi).
 *
 * Mapping entitlement → usage feature ada di ENTITLEMENT_USAGE_FEATURE.
 * Fitur entitlement BOOLEAN (PREMIUM_PROFILE dsb.) tidak punya usage.
 */

export const ENTITLEMENT_KEYS = [
  "SIMULATION_MONTHLY_LIMIT",
  "AI_MENTOR_DAILY_LIMIT",
  "AI_PRACTICE_MONTHLY_LIMIT",
  "PREMIUM_PROFILE",
  "PREMIUM_COSMETICS",
  "ADVANCED_STATS",
  "STREAK_FREEZE_MONTHLY",
] as const;

export type EntitlementKey = (typeof ENTITLEMENT_KEYS)[number];

export const USAGE_FEATURES = [
  "SIMULATION",
  "AI_MENTOR",
  "AI_PRACTICE",
  "STREAK_FREEZE",
] as const;

export type UsageFeatureCode = (typeof USAGE_FEATURES)[number];

export type PeriodType = "MONTH" | "DAY";

/** Periode bisnis per fitur usage (WIB). */
export const USAGE_PERIOD: Record<UsageFeatureCode, PeriodType> = {
  SIMULATION: "MONTH",
  AI_MENTOR: "DAY",
  AI_PRACTICE: "MONTH",
  STREAK_FREEZE: "MONTH",
};

/** Entitlement mana yang menjadi limit untuk fitur usage tertentu. */
export const ENTITLEMENT_USAGE_FEATURE: Record<EntitlementKey, UsageFeatureCode | null> = {
  SIMULATION_MONTHLY_LIMIT: "SIMULATION",
  AI_MENTOR_DAILY_LIMIT: "AI_MENTOR",
  AI_PRACTICE_MONTHLY_LIMIT: "AI_PRACTICE",
  PREMIUM_PROFILE: null,
  PREMIUM_COSMETICS: null,
  ADVANCED_STATS: null,
  STREAK_FREEZE_MONTHLY: "STREAK_FREEZE",
};

export function entitlementKeyForUsageFeature(
  feature: UsageFeatureCode
): EntitlementKey | null {
  for (const key of ENTITLEMENT_KEYS) {
    if (ENTITLEMENT_USAGE_FEATURE[key] === feature) return key;
  }
  return null;
}
