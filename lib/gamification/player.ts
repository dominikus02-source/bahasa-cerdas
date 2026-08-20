import { db } from "@/lib/db";
import { levelFromXp, getLevelProgress } from "@/lib/gamification/levels";
import { rankFromLevel, RANK_META } from "@/lib/gamification/ranks";
import { getRankAsset } from "@/lib/gamification/rank-assets";
import { weekKey, seasonPeriodKey, weekLabel, seasonLabel, startOfTodayWIB } from "@/lib/gamification/season";

/**
 * Player Profile BC Arena — kartu pemain universal, terpisah dari User.
 *
 * Profile dibuat lazy (upsert) saat pertama diakses/ditulis. weeklyXP di-reset
 * otomatis begitu kunci minggu bergeser (lazy reset — tanpa cron).
 */

export interface PlayerProfileView {
  userId: string;
  level: number;
  totalXp: number;
  rank: string;
  rankLabel: string;
  rankTitle: string;
  rankColor: string;
  rankAsset: string;
  coin: number;
  weeklyXp: number;
  weeklyLabel: string;
  seasonXp: number;
  seasonLabel: string;
  streak: number;
  avatar: string | null;
  frame: string | null;
  title: string | null;
  equippedNameColor: string | null;
  equippedBadge: string | null;
  levelProgress: { current: number; needed: number; pct: number; remaining: number };
  xpToNextLevel: number;
  createdAt: Date;
  updatedAt: Date;
}

/** Ambil profil pemain; buat kalau belum ada; reset weekly/season secara lazy. */
export async function getPlayerProfile(userId: string): Promise<PlayerProfileView> {
  const [profile, user] = await Promise.all([
    db.playerProfile.upsert({ where: { userId }, update: {}, create: { userId } }),
    // Foto asli murid ada di User.avatar. PlayerProfile.avatar hanya penimpa
    // KOSMETIK (dari toko koin) dan tidak pernah diisi saat profil dibuat —
    // membacanya sendirian membuat semua orang kehilangan fotonya.
    db.user.findUnique({ where: { id: userId }, select: { avatar: true, equippedNameColor: true, equippedBadge: true } }),
  ]);

  const wk = weekKey();
  const sp = seasonPeriodKey();

  // Lazy reset: kalau kunci minggu/season bergeser, reset weekly/season XP.
  const needWeeklyReset = profile.weeklyXPWeekKey !== wk && profile.weeklyXP > 0;
  const needSeasonReset = profile.seasonPeriodKey !== sp && profile.seasonXP > 0;

  let final = profile;
  if (needWeeklyReset || needSeasonReset) {
    // Hitung ulang level/rank dari totalXP supaya tetap konsisten.
    const level = levelFromXp(profile.totalXP);
    const rank = rankFromLevel(level);
    final = await db.playerProfile.update({
      where: { id: profile.id },
      data: {
        weeklyXP: needWeeklyReset ? 0 : profile.weeklyXP,
        weeklyXPWeekKey: needWeeklyReset ? wk : profile.weeklyXPWeekKey,
        seasonXP: needSeasonReset ? 0 : profile.seasonXP,
        seasonPeriodKey: needSeasonReset ? sp : profile.seasonPeriodKey,
        level,
        currentRank: rank,
      },
    });
  }

  const levelProgress = getLevelProgress(final.totalXP);
  const rankMeta = RANK_META[final.currentRank];

  return {
    userId: final.userId,
    level: final.level,
    totalXp: final.totalXP,
    rank: final.currentRank,
    rankLabel: rankMeta?.label ?? final.currentRank,
    rankTitle: rankMeta?.title ?? final.currentRank,
    rankColor: rankMeta?.color ?? "#64748b",
    rankAsset: getRankAsset(final.currentRank),
    coin: final.coin,
    weeklyXp: final.weeklyXP,
    weeklyLabel: weekLabel(wk),
    seasonXp: final.seasonXP,
    seasonLabel: seasonLabel(sp),
    streak: final.streak,
    avatar: final.avatar ?? user?.avatar ?? null,
    frame: final.frame,
    title: final.title,
    equippedNameColor: user?.equippedNameColor ?? null,
    equippedBadge: user?.equippedBadge ?? null,
    levelProgress,
    xpToNextLevel: levelProgress.remaining,
    createdAt: final.createdAt,
    updatedAt: final.updatedAt,
  };
}

/** Bump streak harian (login / aktivitas). */
export async function bumpDailyStreak(userId: string): Promise<number> {
  const profile = await db.playerProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  // Awal hari WIB untuk tanggal tertentu (konsisten dengan startOfTodayWIB).
  const startOfDayWIB = (date: Date) => {
    const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    wib.setUTCHours(0, 0, 0, 0);
    return new Date(wib.getTime() - 7 * 60 * 60 * 1000);
  };

  const today = startOfTodayWIB();
  const last = profile.lastActiveAt;
  const lastDay = last ? startOfDayWIB(last) : null;
  const sameDay = lastDay?.getTime() === today.getTime();

  if (sameDay) return profile.streak;

  const consecutive = lastDay ? today.getTime() - lastDay.getTime() === 86400000 : false;
  const newStreak = consecutive ? profile.streak + 1 : 1;

  await db.playerProfile.update({
    where: { id: profile.id },
    data: { streak: newStreak, lastActiveAt: new Date() },
  });

  return newStreak;
}

/**
 * Statistik yang dipakai badge engine untuk mengevaluasi kondisi badge.
 * Dipisah agar badge engine tidak memerlukan akses ke tabel bisnis lain.
 */
export async function getGamificationStats(userId: string) {
  const profile = await db.playerProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  const [karyaCount, daysActive] = await Promise.all([
    db.studentKarya.count({ where: { userId } }),
    db.xPTransaction.groupBy({
      by: ["userId"],
      where: { userId },
      _count: { _all: true },
    }),
  ]);

  return {
    totalXp: profile.totalXP,
    level: profile.level,
    streak: profile.streak,
    weeklyXp: profile.weeklyXP,
    seasonXp: profile.seasonXP,
    coinBalance: profile.coin,
    totalKarya: karyaCount,
    xpTransactionCount: daysActive[0]?._count._all ?? 0,
  };
}
