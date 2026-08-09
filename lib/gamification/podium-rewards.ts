/**
 * LEADERBOARD MOTIVATION LAYER — Settlement reward podium (weekly & season).
 *
 * Kompetisi BC Arena punya 3 level:
 *   A. Mingguan   — rank `weeklyXP` per minggu (Senin 00:00 WIB s.d. Minggu 23:59:59 WIB)
 *   B. Season     — rank `seasonXP` per season (4 minggu)
 *   C. Hall of Fame — pemenang permanen (tabel LeaderboardPeriodResult)
 *
 * Settlement berjalan LAZY (tanpa cron): pada akses pertama SETELAH periode
 * ditutup, reward podium dicairkan untuk juara 1-3 periode SEBELUMNYA.
 *
 * ── No XP loop ───────────────────────────────────────────────────────────
 * Reward XP podium TIDAK masuk `weeklyXP`/`seasonXP` (PlayerProfile) periode
 * berjalan — ia hanya menambah XP TOTAL (User.xp + PlayerProfile.totalXP)
 * lewat ledger yang sama. Dengan begitu juara minggu ini tidak mendapat head
 * start di minggu depan dan tidak ada efek bola salju antarminggu. Sumber
 * standings periode diturunkan dari XPTransaction (append-only, tidak pernah
 * di-reset) sehingga hasilnya benar meski profil sudah lazy-reset.
 *
 * ── Bukan engine XP kedua ────────────────────────────────────────────────
 * Ini settlement kompetisi server-side, bukan pintu pemberian XP fitur. Semua
 * tulis lewat tabel yang sama (User.xp, PlayerProfile.totalXP, XpLedger,
 * XPTransaction, CoinTransaction, UserBadge) dengan kurva level/rank resmi.
 * awardXp() (lib/award-xp.ts) tetap SATU-SATUNYA pintu untuk XP fitur murid.
 */
import { db } from "@/lib/db";
import { levelFromXp } from "@/lib/gamification/levels";
import { rankFromLevel } from "@/lib/gamification/ranks";
import { Prisma } from "@prisma/client";
import {
  weekKey,
  seasonPeriodKey,
  previousWeekKey,
  previousSeasonKey,
  weekRange,
  seasonRange,
  mondayWibOfIsoWeek,
  type PeriodRange,
} from "@/lib/gamification/season";
import { LEVEL_UP_COIN_REWARD, MILESTONE_COIN_REWARD } from "@/lib/gamification/xp-engine";
import cache from "@/lib/redis";

export type LeaderboardPeriodType = "WEEKLY" | "SEASON";

export interface PodiumReward {
  xp: number;
  coin: number;
  badge: string;
}

/** Reward podium mingguan (diberikan setelah Minggu 23:59:59.999 WIB). */
export const WEEKLY_PODIUM_REWARDS: Record<number, PodiumReward> = {
  1: { xp: 300, coin: 300, badge: "weekly-champion" },
  2: { xp: 200, coin: 200, badge: "weekly-runner-up" },
  3: { xp: 100, coin: 100, badge: "weekly-third" },
};

/** Reward podium season (diberikan setelah season tutup = akhir minggu ke-4). */
export const SEASON_PODIUM_REWARDS: Record<number, PodiumReward> = {
  1: { xp: 500, coin: 500, badge: "season-champion" },
  2: { xp: 350, coin: 350, badge: "season-runner-up" },
  3: { xp: 250, coin: 250, badge: "season-third" },
};

export function podiumRewardFor(type: LeaderboardPeriodType, rank: number): PodiumReward | null {
  const table = type === "WEEKLY" ? WEEKLY_PODIUM_REWARDS : SEASON_PODIUM_REWARDS;
  return table[rank] ?? null;
}

/** Kunci periode sebelumnya untuk sebuah kunci periode (menyeberangi tahun aman). */
export function previousPeriodKey(type: LeaderboardPeriodType, currentKey: string): string {
  return type === "WEEKLY" ? previousWeekKey(currentKey) : previousSeasonKey(currentKey);
}

/** Apakah sebuah periode sudah tutup pada waktu `now`. */
export function isPeriodClosed(type: LeaderboardPeriodType, key: string, now: Date = new Date()): boolean {
  const range = type === "WEEKLY" ? weekRange(key) : seasonRange(key);
  return now.getTime() > range.endsAt.getTime();
}

export interface HallOfFameEntry {
  periodType: LeaderboardPeriodType;
  periodKey: string;
  periodLabel: string;
  rank: number;
  userId: string;
  name: string;
  score: number;
  rewardXp: number;
  rewardCoins: number;
  badgeCode: string | null;
  settledAt: Date;
}

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** Label "Agustus 2026 — Minggu 1" / "September 2026 — Season 2" untuk Hall of Fame. */
function hofLabel(r: { periodType: string; periodKey: string }): string {
  if (r.periodType === "WEEKLY") {
    const [year, w] = r.periodKey.split("-W");
    const monday = mondayWibOfIsoWeek(parseInt(year, 10), parseInt(w, 10));
    return `${MONTHS_ID[monday.getUTCMonth()]} ${year} — Minggu ${parseInt(w, 10)}`;
  }
  const [year, s] = r.periodKey.split("-S");
  return `${year} — Season ${parseInt(s, 10)}`;
}

/** Hall of Fame — pemenang podium terbaru (dipakai UI). */
export async function getHallOfFame(limit = 12): Promise<HallOfFameEntry[]> {
  const rows = await db.leaderboardPeriodResult.findMany({
    orderBy: [{ periodType: "desc" }, { periodKey: "desc" }, { rank: "asc" }],
    take: limit,
    include: { user: { select: { fullName: true } } },
  });
  return rows.map((r) => ({
    periodType: r.periodType as LeaderboardPeriodType,
    periodKey: r.periodKey,
    periodLabel: hofLabel(r),
    rank: r.rank,
    userId: r.userId,
    name: r.user.fullName,
    score: r.score,
    rewardXp: r.rewardXp,
    rewardCoins: r.rewardCoins,
    badgeCode: r.badgeCode,
    settledAt: r.settledAt,
  }));
}

/**
 * Standings periode dari XPTransaction (append-only, bukan field yang di-reset).
 * Hanya murid (role MURID); sumber "PODIUM" dikeluarkan supaya reward podium
 * tidak pernah ikut menentukan podium berikutnya.
 */
async function standingsFor(range: PeriodRange): Promise<{ userId: string; score: number }[]> {
  const rows = await db.xPTransaction.groupBy({
    by: ["userId"],
    where: {
      createdAt: { gte: range.startsAt, lte: range.endsAt },
      source: { not: "PODIUM" },
      user: { role: "MURID" },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 3,
  });
  return rows.map((r) => ({ userId: r.userId, score: r._sum.amount ?? 0 }));
}

/**
 * Cairkan reward satu juara dalam SATU transaksi (atomik & idempotent):
 *  1. XP total (User.xp + PlayerProfile.totalXP) + ledger + level/rank resmi,
 *     TANPA menyentuh weeklyXP/seasonXP (no loop).
 *  2. Koin podium (CoinTransaction, reference unik per periode+rank).
 *  3. Badge podium (UserBadge, skipDuplicates).
 *  4. Baris LeaderboardPeriodResult (unique per type+key+userId) = Hall of Fame.
 */
async function settleWinner(
  type: LeaderboardPeriodType,
  key: string,
  rank: number,
  score: number,
  userId: string,
): Promise<void> {
  const reward = podiumRewardFor(type, rank);
  if (!reward) return;

  await db.$transaction(async (tx) => {
    const sudahAda = await tx.leaderboardPeriodResult.findUnique({
      where: { periodType_periodKey_userId: { periodType: type, periodKey: key, userId } },
      select: { id: true },
    });
    if (sudahAda) return; // idempotent — jangan cairkan dua kali

    // ── 1. XP total (tanpa weeklyXP/seasonXP) ─────────────────────────
    const ref = `${type === "WEEKLY" ? "weekly" : "season"}-${key}-${rank}`;
    const existingTx = await tx.xPTransaction.findUnique({
      where: { userId_source_reference: { userId, source: "PODIUM", reference: ref } },
      select: { id: true },
    });
    if (!existingTx) {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { xp: true } });
      if (user) {
        const levelLama = levelFromXp(user.xp);
        const totalXp = user.xp + reward.xp;
        const levelBaru = levelFromXp(totalXp);
        const rankBaru = rankFromLevel(levelBaru);
        const naikLevel = levelBaru > levelLama;
        const profile = await tx.playerProfile.upsert({
          where: { userId },
          update: {},
          create: { userId },
        });

        await tx.user.update({ where: { id: userId }, data: { xp: totalXp, level: levelBaru, lastActiveAt: new Date() } });
        await tx.playerProfile.update({
          where: { id: profile.id },
          data: { totalXP: totalXp, level: levelBaru, currentRank: rankBaru, lastActiveAt: new Date() },
        });
        await tx.xPTransaction.create({
          data: { userId, profileId: profile.id, source: "PODIUM", amount: reward.xp, reference: ref },
        });
        await tx.xpLedger.create({ data: { userId, amount: reward.xp, source: "PODIUM", reference: ref } });

        // Koin naik level/milestone — konsisten dengan awardXp.
        const koinLevel = naikLevel ? LEVEL_UP_COIN_REWARD : 0;
        const koinMilestone = naikLevel && levelBaru % 10 === 0 ? MILESTONE_COIN_REWARD : 0;
        const koinLevelUp = koinLevel + koinMilestone;
        if (koinLevelUp > 0) {
          await tx.playerProfile.update({ where: { id: profile.id }, data: { coin: { increment: koinLevelUp } } });
          await tx.coinTransaction.create({
            data: { userId, amount: koinLevelUp, reason: "BCA_PODIUM_LEVEL_UP", reference: `podium-level-${levelBaru}-${ref}` },
          });
        }
      }
    }

    // ── 2. Koin podium ────────────────────────────────────────────────
    if (reward.coin > 0) {
      const coinRef = `${type === "WEEKLY" ? "weekly" : "season"}-${key}-${rank}`;
      const existingCoin = await tx.coinTransaction.findFirst({
        where: { userId, reason: "BCA_PODIUM", reference: coinRef },
        select: { id: true },
      });
      if (!existingCoin) {
        const profile = await tx.playerProfile.findUnique({ where: { userId }, select: { id: true, coin: true } });
        if (profile) {
          await tx.playerProfile.update({ where: { id: profile.id }, data: { coin: { increment: reward.coin } } });
          await tx.coinTransaction.create({
            data: { userId, amount: reward.coin, reason: "BCA_PODIUM", reference: coinRef },
          });
        }
      }
    }

    // ── 3. Badge podium ───────────────────────────────────────────────
    const badge = await tx.badge.findUnique({ where: { code: reward.badge } });
    if (badge && badge.isActive) {
      await tx.userBadge.createMany({
        data: [{ userId, badgeId: badge.id }],
        skipDuplicates: true,
      });
    }

    // ── 4. Hall of Fame ───────────────────────────────────────────────
    await tx.leaderboardPeriodResult.create({
      data: {
        periodType: type,
        periodKey: key,
        userId,
        rank,
        score,
        rewardXp: reward.xp,
        rewardCoins: reward.coin,
        badgeCode: reward.badge,
      },
    });
  });
}

const MEMO_TTL = 3600; // detik — hindari query berulang di jalur panas

async function settleOne(
  type: LeaderboardPeriodType,
  key: string,
  range: PeriodRange,
  now: Date,
): Promise<void> {
  if (!isPeriodClosed(type, key, now)) return; // periode masih berjalan — jangan sentuh

  const memoKey = `bca:lb-settle:${type}:${key}`;
  try {
    if (await cache.get(memoKey)) return; // sudah diproses (memo)
  } catch {
    /* redis mati → lanjut; settle tetap aman (idempotent) */
  }

  // Sudah pernah diselesaikan? (backstop database, tanpa mengandalkan memo)
  const settled = await db.leaderboardPeriodResult.count({ where: { periodType: type, periodKey: key } });
  if (settled > 0) {
    try {
      await cache.set(memoKey, "1", MEMO_TTL);
    } catch {
      /* best-effort */
    }
    return;
  }

  const standings = await standingsFor(range);
  for (let i = 0; i < standings.length; i++) {
    try {
      await settleWinner(type, key, i + 1, standings[i].score, standings[i].userId);
    } catch (err) {
      // P2002 = balapan settle konkuren yang sudah diproses request lain — aman.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") continue;
      throw err;
    }
  }

  try {
    await cache.set(memoKey, "1", MEMO_TTL);
  } catch {
    /* best-effort */
  }
}

/**
 * Panggil pada akses leaderboard/kompetisi. Best-effort: kegagalan apa pun
 * TIDAK boleh menggagalkan halaman (rewards tetap idempotent & akan retry).
 */
export async function settleLeaderboardIfDue(now: Date = new Date()): Promise<void> {
  const wk = weekKey(now);
  const sk = seasonPeriodKey(now);
  await settleOne("WEEKLY", previousWeekKey(wk), weekRange(previousWeekKey(wk)), now);
  await settleOne("SEASON", previousSeasonKey(sk), seasonRange(previousSeasonKey(sk)), now);
}
