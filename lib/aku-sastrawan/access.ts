import { resolvePlan } from "@/lib/premium-economy/plans";

/**
 * AKU SASTRAWAN is a Premium product available across BC user roles.
 * The canonical plan resolver currently returns FOUNDER, PRO, MURID_PREMIUM,
 * or FREE. Paid UMUM users resolve to PRO; do not list a plan code the resolver
 * never emits, or those users would be denied accidentally.
 */
const AKU_SASTRAWAN_PLANS = new Set(["FOUNDER", "PRO", "MURID_PREMIUM"]);

export async function hasAkuSastrawanAccess(userId: string): Promise<boolean> {
  const resolved = await resolvePlan(userId);
  return AKU_SASTRAWAN_PLANS.has(resolved.plan);
}
