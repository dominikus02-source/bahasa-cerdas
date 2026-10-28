import { resolvePlan } from "@/lib/premium-economy/plans";

/**
 * AKU SASTRAWAN is a Premium product available across BC user roles.
 * Keep the allowlist explicit so an unknown/new plan does not accidentally
 * grant access. Trials resolve to their corresponding paid plan in the
 * canonical plan resolver; expired/free accounts are denied.
 */
const AKU_SASTRAWAN_PLANS = new Set(["FOUNDER", "PRO", "MURID_PREMIUM", "UMUM_PREMIUM"]);

export async function hasAkuSastrawanAccess(userId: string): Promise<boolean> {
  const resolved = await resolvePlan(userId);
  return AKU_SASTRAWAN_PLANS.has(resolved.plan);
}
