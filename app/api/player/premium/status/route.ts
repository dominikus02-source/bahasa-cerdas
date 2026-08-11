import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import {
  resolvePlan,
  getEntitlements,
  getUsageRow,
  getFeatureLimit,
  entitlementKeyForUsageFeature,
  entitlementValueToScalar,
  USAGE_FEATURES,
} from "@/lib/premium-economy";

/**
 * GET /player/premium/status — status entitlement pengguna (auth-gated).
 * Hanya data yang sudah dihitung server; tidak ada input plan/quota dari
 * client. Untuk testing/debugging & masa depan UI premium.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan, subscriptionStatus } = await resolvePlan(user.id);
  const entitlements = await getEntitlements(plan);

  const entitlementsPayload: Record<string, number | boolean> = {};
  for (const [key, value] of Object.entries(entitlements)) {
    entitlementsPayload[key] =
      typeof value === "boolean" ? value : entitlementValueToScalar(value);
  }

  const usage: Record<string, { used: number; limit: number; remaining: number }> = {};
  await Promise.all(
    USAGE_FEATURES.map(async (feature) => {
      const key = entitlementKeyForUsageFeature(feature);
      const limit = key ? await getFeatureLimit(plan, key) : 0;
      const { used } = await getUsageRow(user.id, feature);
      usage[feature] = {
        used,
        limit: Number.isFinite(limit) ? limit : -1,
        remaining: Number.isFinite(limit) ? Math.max(0, limit - used) : -1,
      };
    })
  );

  return NextResponse.json({
    plan,
    subscriptionStatus,
    entitlements: entitlementsPayload,
    usage,
  });
}
