/**
 * LEGACY premium utilities — kept for backward compatibility only.
 *
 * Active importers:
 *   - 7 legacy AI routes (checkAIQuota, recordAIUsage)
 *
 * New code should import from:
 *   - lib/format.ts          (formatCurrency, getGelarFromLevel)
 *   - lib/ai-gateway/        (plan resolution, quota checking)
 *   - lib/billing/            (plans, limits, coupons)
 *   - lib/premium-economy/    (entitlements, usage)
 */
import { db } from "@/lib/db";
import cache from "@/lib/redis";
import type { User, PremiumPlan } from "@prisma/client";

// ── Legacy AI quota constants (used by checkAIQuota) ──

const AI_QUOTA = {
  FREE: { rpp: -1, soal: -1, koreksi: 3, chat: 5, grading: 5, ringkasan: 5, feedback: 5 },
  PRO: { rpp: -1, soal: -1, koreksi: -1, chat: -1, grading: -1, ringkasan: -1, feedback: -1 },
};

// ── Internal helpers (used by checkAIQuota) ──

function getUserPlan(user: User): PremiumPlan {
  if (user.isFounder) return "PRO";
  if (user.isPremium && user.premiumUntil && new Date(user.premiumUntil) > new Date()) return "PRO";
  return user.premiumPlan || "FREE";
}

async function getAIUsageCount(
  userId: string,
  feature: string
): Promise<number> {
  const bulan = new Date().toISOString().slice(0, 7);
  const cacheKey = `aige:${userId}:${feature}:${bulan}`;
  const cached = await cache.get<number>(cacheKey);
  if (cached !== null) return cached;
  const count = await db.aIUsage.count({
    where: { userId, feature, bulan },
  });
  cache.set(cacheKey, count, 120); // cache for 2 min
  return count;
}

// ── Exported functions (still imported by legacy routes) ──

export async function checkAIQuota(
  user: User,
  feature: "rpp" | "soal" | "koreksi" | "chat" | "grading" | "ringkasan" | "feedback"
): Promise<{ allowed: boolean; used: number; limit: number }> {
  const plan = getUserPlan(user);
  const limit = AI_QUOTA[plan][feature];
  const used = await getAIUsageCount(user.id, feature);

  if (limit === -1) return { allowed: true, used, limit: Infinity };
  return { allowed: used < limit, used, limit };
}

export async function recordAIUsage(
  userId: string,
  feature: string,
  tokens: number,
  costUSD: number
) {
  const bulan = new Date().toISOString().slice(0, 7);
  // Fire-and-forget — non-critical write, don't block the response
  db.aIUsage.create({
    data: { userId, feature, tokens, costUSD, bulan },
  }).catch(() => {});
  // Invalidate cached usage count
  cache.del(`aige:${userId}:${feature}:${bulan}`).catch(() => {});
}
