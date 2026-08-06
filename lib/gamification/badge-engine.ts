import { db } from "@/lib/db";
import { getGamificationStats } from "@/lib/gamification/player";
import { Prisma } from "@prisma/client";
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
  | "XP_SOURCE_TOTAL"
  // Kondisi guru (metrik murid-muridnya + aktivitas mengajar).
  | "MURID_KARYA"
  | "MURID_LIKE"
  | "MURID_FEATURED"
  | "TUGAS_DIKIRIM"
  | "PENGUMUMAN_DIBUAT";

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
  // Metrik guru — 0 untuk murid (murid tidak punya kelas yang diampu).
  guru?: {
    /** Total karya yang diterbitkan seluruh murid guru ini. */
    totalKaryaMurid: number;
    /** Total like yang diterima seluruh karya muridnya. */
    totalLikeMurid: number;
    /** Total karya murid yang dipilih (Editor Choice). */
    totalFeaturedMurid: number;
    /** Total penugasan (quiz assignment + penugasan materi) yang dikirim. */
    totalTugasDikirim: number;
    /** Total pengumuman yang dibuat guru ini. */
    totalPengumuman: number;
  };
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
    guru: await collectGuruMetrics(userId),
  };
}

/**
 * Metrik badge guru — dihitung hanya bila user mengampu minimal satu kelas.
 * Untuk murid (tanpa kelas) hasilnya null → semua kondisi guru tetap 0,
 * sehingga badge guru tidak bisa terbuka di akun murid.
 */
async function collectGuruMetrics(userId: string): Promise<BadgeStats["guru"]> {
  const groups = await db.group.findMany({
    where: { teacherId: userId },
    select: { id: true },
  });
  if (groups.length === 0) return undefined;

  const groupIds = groups.map((g) => g.id);
  const [memberRows, karyaRows, likeRows, featuredRows, tugasQuiz, tugasMateri, pengumuman] =
    await Promise.all([
      db.groupMember.findMany({ where: { groupId: { in: groupIds } }, select: { userId: true } }),
      db.$queryRaw<{ total: bigint | null }[]>`
        SELECT COUNT(*)::bigint as total FROM "StudentKarya" k
        WHERE k."userId" IN (SELECT "userId" FROM "GroupMember" WHERE "groupId" IN (${Prisma.join(groupIds)}))
      `,
      db.$queryRaw<{ total: bigint | null }[]>`
        SELECT COALESCE(SUM(k."likesCount"), 0)::bigint as total FROM "StudentKarya" k
        WHERE k."userId" IN (SELECT "userId" FROM "GroupMember" WHERE "groupId" IN (${Prisma.join(groupIds)}))
      `,
      db.studentKarya.count({
        where: { isFeatured: true, user: { groupMemberships: { some: { groupId: { in: groupIds } } } } },
      }),
      db.quizAssignment.count({ where: { groupId: { in: groupIds } } }),
      db.penugasan.count({ where: { groupId: { in: groupIds } } }),
      db.pengumuman.count({ where: { groupId: { in: groupIds } } }),
    ]);

  const muridIds = [...new Set(memberRows.map((m) => m.userId))];
  if (muridIds.length === 0) {
    return { totalKaryaMurid: 0, totalLikeMurid: 0, totalFeaturedMurid: 0, totalTugasDikirim: 0, totalPengumuman: 0 };
  }

  return {
    totalKaryaMurid: Number(karyaRows[0]?.total ?? 0),
    totalLikeMurid: Number(likeRows[0]?.total ?? 0),
    totalFeaturedMurid: featuredRows,
    totalTugasDikirim: tugasQuiz + tugasMateri,
    totalPengumuman: pengumuman,
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
    case "MURID_KARYA":
      progress = stats.guru?.totalKaryaMurid ?? 0;
      break;
    case "MURID_LIKE":
      progress = stats.guru?.totalLikeMurid ?? 0;
      break;
    case "MURID_FEATURED":
      progress = stats.guru?.totalFeaturedMurid ?? 0;
      break;
    case "TUGAS_DIKIRIM":
      progress = stats.guru?.totalTugasDikirim ?? 0;
      break;
    case "PENGUMUMAN_DIBUAT":
      progress = stats.guru?.totalPengumuman ?? 0;
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
