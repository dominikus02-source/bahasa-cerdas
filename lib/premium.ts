import { db } from "@/lib/db";
import cache from "@/lib/redis";
import type { User, PremiumPlan } from "@prisma/client";

const AI_QUOTA = {
  FREE: { rpp: -1, soal: -1, koreksi: 3, chat: 5, grading: 5, ringkasan: 5, feedback: 5 },
  PRO: { rpp: -1, soal: -1, koreksi: -1, chat: -1, grading: -1, ringkasan: -1, feedback: -1 },
};

export function getUserPlan(user: User): PremiumPlan {
  if (user.isFounder) return "PRO";
  if (user.isPremium && user.premiumUntil && new Date(user.premiumUntil) > new Date()) return "PRO";
  return user.premiumPlan || "FREE";
}

export function canUseAI(
  user: User,
  feature: "rpp" | "soal" | "koreksi" | "chat" | "grading" | "ringkasan" | "feedback"
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
  const cacheKey = `aige:${userId}:${feature}:${bulan}`;
  const cached = await cache.get<number>(cacheKey);
  if (cached !== null) return cached;
  const count = await db.aIUsage.count({
    where: { userId, feature, bulan },
  });
  cache.set(cacheKey, count, 120); // cache for 2 min
  return count;
}

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

const GELAR_BANDS: { min: number; label: string }[] = [
  { min: 16, label: "Legenda BahasaCerdas" },
  { min: 13, label: "Pujangga Muda" },
  { min: 10, label: "Maestro Kata" },
  { min: 7, label: "Juru Bahasa" },
  { min: 5, label: "Pencerita Andal" },
  { min: 3, label: "Perangkai Kata" },
  { min: 1, label: "Penulis Pemula" },
];

// "Gelar" — a level-derived title shown alongside the avatar on the profile
// card, e.g. "Si Pantun · Perangkai Kata · Penulis #00147".
export function getGelarFromLevel(level: number): string {
  return (GELAR_BANDS.find((b) => level >= b.min) || GELAR_BANDS[GELAR_BANDS.length - 1]).label;
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

export function getPredikatColor(predikat: string): string {
  const colors: Record<string, string> = {
    "Istimewa": "text-yellow-600 bg-yellow-50 border-yellow-200",
    "Sangat Unggul": "text-green-600 bg-green-50 border-green-200",
    "Unggul": "text-emerald-600 bg-emerald-50 border-emerald-200",
    "Madya": "text-blue-600 bg-blue-50 border-blue-200",
    "Semenjana": "text-orange-600 bg-orange-50 border-orange-200",
    "Marginal": "text-red-600 bg-red-50 border-red-200",
    "Terbatas": "text-red-700 bg-red-100 border-red-300",
  };
  return colors[predikat] || "text-slate-600 bg-slate-50 border-slate-200";
}

export function getUKBIPassingStatus(skor: number): { passed: boolean; label: string } {
  if (skor >= 725) return { passed: true, label: "Istimewa - Lulus dengan predikat tertinggi" };
  if (skor >= 641) return { passed: true, label: "Sangat Unggul - Lulus dengan sangat baik" };
  if (skor >= 578) return { passed: true, label: "Unggul - Lulus dengan baik" };
  if (skor >= 482) return { passed: true, label: "Madya - Lulus memenuhi standar" };
  return { passed: false, label: "Belum memenuhi standar minimal" };
}

export function getTKAPredikat(percentage: number): string {
  if (percentage >= 85) return "A (Sangat Baik)";
  if (percentage >= 70) return "B (Baik)";
  if (percentage >= 55) return "C (Cukup)";
  return "D (Kurang)";
}