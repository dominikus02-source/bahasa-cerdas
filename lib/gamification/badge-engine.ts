import { db } from "@/lib/db";
import { getGamificationStats } from "@/lib/gamification/player";
import type { Badge, BadgeRarity } from "@prisma/client";

/**
 * Badge Engine BC Arena — badge dinamis.
 *
 * Kondisi badge disimpan sebagai JSON: { type, target, source? }.
 *   type: TOTAL_XP | LEVEL | STREAK | WEEKLY_XP | SEASON_XP | COIN_BALANCE |
 *         TOTAL_KARYA | XP_SOURCE_TOTAL
 *   target: nilai yang harus dicapai
 *   source: (khusus XP_SOURCE_TOTAL) sumber XP, mis. "JALUR_CERDAS"
 *
 * Badge diberikan OTOMATIS saat kondisi terpenuhi (evaluateBadges). Panggil
 * setelah addXp() / aktivitas yang mengubah statistik pemain.
 */

export type BadgeConditionType =
  | "TOTAL_XP"
  | "LEVEL"
  | "STREAK"
  | "WEEKLY_XP"
  | "SEASON_XP"
  | "COIN_BALANCE"
  | "TOTAL_KARYA"
  | "XP_SOURCE_TOTAL";

export interface BadgeCondition {
  type: BadgeConditionType;
  target: number;
  /** Wajib untuk XP_SOURCE_TOTAL. */
  source?: string;
}

export interface BadgeStats {
  totalXp: number;
  level: number;
  streak: number;
  weeklyXp: number;
  seasonXp: number;
  coinBalance: number;
  totalKarya: number;
  xpBySource: Record<string, number>;
}

export interface BadgeView extends Badge {
  progress: number;
  unlocked: boolean;
}

const RARITY_ORDER: BadgeRarity[] = ["BRONZE", "SILVER", "GOLD", "LEGENDARY"];

/** Kumpulkan semua statistik yang dibutuhkan evaluasi badge. */
export async function collectBadgeStats(userId: string): Promise<BadgeStats> {
  const base = await getGamificationStats(userId);
  const xpRows = await db.xPTransaction.groupBy({
    by: ["source"],
    where: { userId },
    _sum: { amount: true },
  });
  const xpBySource: Record<string, number> = {};
  for (const r of xpRows) xpBySource[r.source] = r._sum.amount ?? 0;

  return {
    totalXp: base.totalXp,
    level: base.level,
    streak: base.streak,
    weeklyXp: base.weeklyXp,
    seasonXp: base.seasonXp,
    coinBalance: base.coinBalance,
    totalKarya: base.totalKarya,
    xpBySource,
  };
}

export function checkCondition(condition: BadgeCondition, stats: BadgeStats): { progress: number; met: boolean } {
  const target = Math.max(1, condition.target ?? 1);
  let progress = 0;

  switch (condition.type) {
    case "TOTAL_XP":
      progress = stats.totalXp;
      break;
    case "LEVEL":
      progress = stats.level;
      break;
    case "STREAK":
      progress = stats.streak;
      break;
    case "WEEKLY_XP":
      progress = stats.weeklyXp;
      break;
    case "SEASON_XP":
      progress = stats.seasonXp;
      break;
    case "COIN_BALANCE":
      progress = stats.coinBalance;
      break;
    case "TOTAL_KARYA":
      progress = stats.totalKarya;
      break;
    case "XP_SOURCE_TOTAL":
      progress = condition.source ? stats.xpBySource[condition.source] ?? 0 : 0;
      break;
    default:
      break;
  }

  return { progress, met: progress >= target };
}

/** Evaluasi semua badge aktif untuk seorang user; berikan yang baru lolos. */
export async function evaluateBadges(userId: string): Promise<BadgeView[]> {
  const [badges, stats, owned] = await Promise.all([
    db.badge.findMany({ where: { isActive: true }, orderBy: { rarity: "desc" } }),
    collectBadgeStats(userId),
    db.userBadge.findMany({ where: { userId }, select: { badgeId: true } }),
  ]);

  const ownedIds = new Set(owned.map((o) => o.badgeId));
  const results: BadgeView[] = [];
  const toAward: { badgeId: string }[] = [];

  for (const badge of badges) {
    const condition = (badge.condition ?? {}) as unknown as BadgeCondition;
    const { progress, met } = checkCondition(condition, stats);
    results.push({ ...badge, progress: Math.min(progress, condition.target ?? 1), unlocked: met });

    if (met && !ownedIds.has(badge.id)) {
      toAward.push({ badgeId: badge.id });
    }
  }

  if (toAward.length > 0) {
    await db.userBadge.createMany({
      data: toAward.map((a) => ({ userId, badgeId: a.badgeId })),
      skipDuplicates: true,
    });
  }

  return results.sort(
    (a, b) =>
      Number(b.unlocked) - Number(a.unlocked) ||
      RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity),
  );
}

/** Ambil daftar badge user (evaluasi ulang — selalu konsisten dengan kondisi). */
export async function listUserBadges(userId: string): Promise<BadgeView[]> {
  return evaluateBadges(userId);
}
