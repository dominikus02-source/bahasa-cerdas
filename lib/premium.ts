import { db } from "@/lib/db";
import type { User, PremiumPlan } from "@prisma/client";

const AI_QUOTA = {
  FREE: { rpp: 3, soal: 10, koreksi: 0, chat: 5 },
  PRO: { rpp: -1, soal: -1, koreksi: -1, chat: -1 },
};

export function getUserPlan(user: User): PremiumPlan {
  if (user.isFounder) return "PRO";
  if (user.isPremium && user.premiumUntil && new Date(user.premiumUntil) > new Date()) return "PRO";
  return user.premiumPlan || "FREE";
}

export function canUseAI(
  user: User,
  feature: "rpp" | "soal" | "koreksi" | "chat"
): boolean {
  const plan = getUserPlan(user);
  if (plan === "PRO") return true;
  return true;
}

export async function getAIUsageCount(
  userId: string,
  feature: string
): Promise<number> {
  const bulan = new Date().toISOString().slice(0, 7);
  return db.aIUsage.count({
    where: { userId, feature, bulan },
  });
}

export async function checkAIQuota(
  user: User,
  feature: "rpp" | "soal" | "koreksi" | "chat"
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
  return db.aIUsage.create({
    data: { userId, feature, tokens, costUSD, bulan },
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
}

export function getLeagueFromXP(xp: number): "BRONZE" | "SILVER" | "GOLD" | "DIAMOND" {
  if (xp >= 8000) return "DIAMOND";
  if (xp >= 3000) return "GOLD";
  if (xp >= 1000) return "SILVER";
  return "BRONZE";
}

export function getLevelFromXP(xp: number): number {
  return Math.floor(xp / 500) + 1;
}

export function getPredikatUKBI(skor: number): string {
  if (skor >= 725) return "Istimewa (I)";
  if (skor >= 641) return "Sangat Unggul (II)";
  if (skor >= 578) return "Unggul (III)";
  if (skor >= 482) return "Madya (IV)";
  if (skor >= 405) return "Semenjana (V)";
  if (skor >= 326) return "Marginal (VI)";
  return "Terbatas (VII)";
}