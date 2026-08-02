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
 * setelah awardXp() / aktivitas yang mengubah statistik pemain.
 */

export type BadgeConditionType =
  | "TOTAL_XP"
  | "LEVEL"
  | "STREAK"
  | "WEEKLY_XP"
  | "SEASON_XP"
  | "COIN_BALANCE"
  | "TOTAL_KARYA"
  | "TOTAL_WORDS"
  | "FEATURED_KARYA"
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
  /** Perkiraan jumlah kata dari seluruh karya (dipakai lencana "Perangkai Kata" dst). */
  totalWords: number;
  /** Karya yang ditandai pilihan guru / terpopuler. */
  featuredKarya: number;
  xpBySource: Record<string, number>;
}

export interface BadgeView extends Badge {
  progress: number;
  unlocked: boolean;
}

const RARITY_ORDER: BadgeRarity[] = ["BRONZE", "SILVER", "GOLD", "LEGENDARY"];

/** Kumpulkan semua statistik yang dibutuhkan evaluasi badge. */
export async function collectBadgeStats(userId: string): Promise<BadgeStats> {
  const [base, user, featuredKarya, wordRow, xpRows] = await Promise.all([
    getGamificationStats(userId),
    // XP & streak juga dibaca dari User: sebelum penyatuan, lencana memakai
    // User.* sedangkan badge memakai PlayerProfile.*. Backfill membuat profil
    // dengan streak 0, jadi membaca PlayerProfile saja akan MENGHAPUS lencana
    // streak yang sudah dimiliki murid. Diambil yang tertinggi supaya tidak ada
    // yang mundur, apa pun sumber yang lebih dulu terisi.
    db.user.findUnique({ where: { id: userId }, select: { xp: true, streak: true } }),
    db.studentKarya.count({ where: { userId, isFeatured: true } }),
    db.$queryRaw<{ totalchars: bigint | null }[]>`
      SELECT SUM(LENGTH(content))::bigint as totalchars FROM "StudentKarya" WHERE "userId" = ${userId}
    `,
    db.xPTransaction.groupBy({
      by: ["source"],
      where: { userId },
      _sum: { amount: true },
    }),
  ]);
  const xpBySource: Record<string, number> = {};
  for (const r of xpRows) xpBySource[r.source] = r._sum.amount ?? 0;

  return {
    totalXp: Math.max(base.totalXp, user?.xp ?? 0),
    level: base.level,
    streak: Math.max(base.streak, user?.streak ?? 0),
    weeklyXp: base.weeklyXp,
    seasonXp: base.seasonXp,
    coinBalance: base.coinBalance,
    totalKarya: base.totalKarya,
    // Perkiraan kata memakai rumus yang sama persis dengan lencana lama
    // (jumlah karakter dibagi 6) supaya tidak ada murid yang progresnya mundur.
    totalWords: Math.round(Number(wordRow[0]?.totalchars ?? 0) / 6),
    featuredKarya,
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
    case "TOTAL_WORDS":
      progress = stats.totalWords;
      break;
    case "FEATURED_KARYA":
      progress = stats.featuredKarya;
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
    // Sekali diraih, selamanya tampil terbuka. Tanpa `sudahDimiliki`, badge
    // yang bergantung pada penghitung yang di-reset (weeklyXP tiap minggu,
    // seasonXP tiap 4 minggu) akan terkunci lagi saat periodenya berganti —
    // murid kehilangan bukti kerja kerasnya walau baris UserBadge-nya ada.
    const sudahDimiliki = ownedIds.has(badge.id);
    const target = condition.target ?? 1;
    results.push({
      ...badge,
      progress: sudahDimiliki ? target : Math.min(progress, target),
      unlocked: met || sudahDimiliki,
    });

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
