import { resolvePlan } from "@/lib/premium-economy/plans";

/**
 * Use BahasaCerdas' canonical server-side plan resolver so active Midtrans
 * subscriptions and legacy premiumUntil access behave consistently.
 */
export async function hasAkuSastrawanAccess(userId: string): Promise<boolean> {
  const resolved = await resolvePlan(userId);
  return resolved.plan !== "FREE";
}
