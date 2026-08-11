/**
 * BC Premium Economy Foundation — barrel export.
 *
 * Pakai API ini dari route, JANGAN hardcode `if (user.isPremium)`.
 * Prefer:
 *   await canUseFeature(userId, "SIMULATION")   // read-only gate
 *   await consumeUsageGuarded(tx, userId, "SIMULATION", { plan, limit })
 *   await userHasEntitlement(userId, "PREMIUM_PROFILE")
 */

export { resolvePlan, resolvePlanForUser } from "./plans";
export type { PlanCode, ResolvedPlan } from "./plans";
export {
  ENTITLEMENT_KEYS,
  USAGE_FEATURES,
  USAGE_PERIOD,
  ENTITLEMENT_USAGE_FEATURE,
  entitlementKeyForUsageFeature,
} from "./features";
export type { EntitlementKey, UsageFeatureCode, PeriodType as UsagePeriodType } from "./features";
export { DEFAULT_ENTITLEMENT_MATRIX, entitlementValueToLimit, entitlementValueToScalar } from "./matrix";
export type { EntitlementValue } from "./matrix";
export {
  getEntitlement,
  getEntitlements,
  getFeatureLimit,
  hasEntitlement,
  getUserEntitlement,
  userHasEntitlement,
  getUserFeatureLimit,
} from "./entitlement";
export {
  getUsageRow,
  getFeatureUsage,
  canUseFeature,
  consumeUsage,
  consumeUsageTx,
  consumeUsageGuarded,
  FeatureLimitError,
} from "./usage";
export type { UsageResult } from "./usage";
export { getPeriodKey, startOfMonthWIB, startOfDayWIB } from "./period";
