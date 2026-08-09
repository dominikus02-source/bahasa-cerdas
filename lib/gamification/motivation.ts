/**
 * LEADERBOARD MOTIVATION LAYER — payload "Kompetisi Minggu Ini" untuk UI.
 *
 * Gabungan data kompetisi mingguan yang anti-dead (top 3 + posisi saya + 1 di
 * atas + 1 di bawah + total peserta + gap XP), countdown WIB (hydration-safe:
 * UI menerima `periodEndsAt` absolute, bukan hitungan klien), XP transparency,
 * dan Hall of Fame. Semua angka kompetisi diturunkan dari XPTransaction
 * (append-only) / field weeklyXP yang lazy-reset — bukan angka klien.
 */
import { db } from "@/lib/db";
import {
  weekKey,
  seasonPeriodKey,
  weekRange,
  seasonRange,
  weekLabel,
  seasonLabel,
} from "@/lib/gamification/season";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/gamification/leaderboard";
import { getHallOfFame, settleLeaderboardIfDue, type HallOfFameEntry } from "@/lib/gamification/podium-rewards";
import { getWeeklyXpBreakdown, type XpTransparency } from "@/lib/gamification/xp-transparency";
import { RANK_META } from "@/lib/gamification/ranks";
import { getRankAsset } from "@/lib/gamification/rank-assets";
import type { PlayerRank } from "@prisma/client";

export interface CompetitionNeighbor {
  rank: number;
  userId: string;
  name: string;
  nickname: string | null;
  avatar: string | null;
  weeklyXp: number;
  totalXp: number;
  playerRank: PlayerRank;
  rankLabel: string;
  rankTitle: string;
  rankColor: string;
  rankAsset: string;
}

export interface WeeklyCompetitionPayload {
  weekKey: string;
  weekLabel: string;
  seasonKey: string;
  seasonLabel: string;
  weekInSeason: number; // 1..4
  periodStartsAt: string; // ISO
  periodEndsAt: string; // ISO (Minggu 23:59:59.999 WIB)
  seasonEndsAt: string; // ISO (akhir season)
  now: string; // ISO (server, baseline countdown)
  totalParticipants: number;
  top: LeaderboardEntry[]; // top 3+ (isi dari getLeaderboard WEEKLY)
  my: {
    rank: number;
    weeklyXp: number;
    totalXp: number;
    isActive: boolean;
    statusMessage: string;
  } | null;
  above: CompetitionNeighbor | null;
  below: CompetitionNeighbor | null;
  gapToNext: number; // XP menuju peringkat di atas saya (0 bila juara 1)
  groups: XpTransparency;
  hallOfFame: HallOfFameEntry[];
}

/**
 * Pesan motivasi pure (testable tanpa DB). Bahasa Indonesia, bersudut kompetisi.
 */
export function podiumStatusMessage(opts: {
  rank: number;
  total: number;
  weeklyXp: number;
  gapToNext: number;
}): string {
  const { rank, total, weeklyXp, gapToNext } = opts;
  if (rank === 1) return `Kamu juara 1 dengan ${weeklyXp.toLocaleString("id-ID")} XP! Pertahankan!`;
  if (rank === 2) return `Posisi 2! Naik ${gapToNext.toLocaleString("id-ID")} XP lagi untuk ke puncak.`;
  if (rank === 3) return `Podium! Selisih ${gapToNext.toLocaleString("id-ID")} XP dari juara 2.`;
  if (weeklyXp <= 0) return `Belum mengumpulkan XP minggu ini — mulai sekarang dan masuk papan!`;
  if (rank <= 10) return `Top 10! Butuh ${gapToNext.toLocaleString("id-ID")} XP untuk naik ke #${rank - 1}.`;
  return `Peringkat #${rank} dari ${total.toLocaleString("id-ID")} peserta. Naik ${gapToNext.toLocaleString("id-ID")} XP untuk ke #${rank - 1}.`;
}

function toNeighbor(rank: number, p: {
  userId: string; fullName: string; nickname: string | null; avatar: string | null;
  weeklyXP: number; totalXP: number; currentRank: PlayerRank;
}): CompetitionNeighbor {
  const meta = RANK_META[p.currentRank];
  return {
    rank,
    userId: p.userId,
    name: p.fullName,
    nickname: p.nickname,
    avatar: p.avatar,
    weeklyXp: p.weeklyXP,
    totalXp: p.totalXP,
    playerRank: p.currentRank,
    rankLabel: meta?.label ?? p.currentRank,
    rankTitle: meta?.title ?? p.currentRank,
    rankColor: meta?.color ?? "#64748b",
    rankAsset: getRankAsset(p.currentRank),
  };
}

/** Banyak murid yang aktif minggu ini (weeklyXP > 0 & kunci minggu cocok). */
async function activeParticipantsWk(wk: string): Promise<number> {
  return db.playerProfile.count({
    where: { user: { role: "MURID" }, weeklyXPWeekKey: wk, weeklyXP: { gt: 0 } },
  });
}

/**
 * Bangun payload kompetisi minggu ini untuk `userId` (harus role MURID).
 * Memanggil settlement lazy (best-effort) supaya reward podium periode yang
 * baru ditutup langsung cair pada akses pertama.
 */
export async function getWeeklyCompetition(userId: string): Promise<WeeklyCompetitionPayload> {
  await settleLeaderboardIfDue().catch(() => {});

  const wk = weekKey();
  const sk = seasonPeriodKey();
  const range = weekRange(wk);
  const sRange = seasonRange(sk);
  const now = new Date();

  const my = await db.playerProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, fullName: true, nickname: true, avatar: true, role: true } },
    },
  });

  const totalParticipants = await activeParticipantsWk(wk);

  // Nilai saya — normalisasi lazy reset (konsisten dgn awardXp).
  const myWeekly = my && my.weeklyXPWeekKey === wk ? my.weeklyXP : 0;
  const myTotal = my?.totalXP ?? 0;
  const isActive = myWeekly > 0;
  const myRole = my?.user.role ?? null;

  let myRank = totalParticipants + 1;
  let above: CompetitionNeighbor | null = null;
  let below: CompetitionNeighbor | null = null;
  let gapToNext = 0;

  if (myRole === "MURID") {
    // Ranking kompetisi: weeklyXP DESC, tie-break totalXP DESC (deterministik).
    const strictlyAbove = await db.playerProfile.count({
      where: {
        user: { role: "MURID" },
        weeklyXPWeekKey: wk,
        OR: [{ weeklyXP: { gt: myWeekly } }, { weeklyXP: myWeekly, totalXP: { gt: myTotal } }],
      },
    });
    myRank = strictlyAbove + 1;

    if (myWeekly > 0) {
      // 1 posisi di atas (rank-1): profil dengan weeklyXP terkecil yang > milik saya.
      const aboveRow = await db.playerProfile.findFirst({
        where: { user: { role: "MURID" }, weeklyXPWeekKey: wk, weeklyXP: { gt: myWeekly } },
        orderBy: { weeklyXP: "asc" },
        select: {
          userId: true, weeklyXP: true, totalXP: true, currentRank: true,
          user: { select: { fullName: true, nickname: true, avatar: true } },
        },
      });
      if (aboveRow) {
        const aboveCount = await db.playerProfile.count({
          where: { user: { role: "MURID" }, weeklyXPWeekKey: wk, weeklyXP: { gt: aboveRow.weeklyXP } },
        });
        above = toNeighbor(aboveCount + 1, {
          userId: aboveRow.userId,
          fullName: aboveRow.user.fullName,
          nickname: aboveRow.user.nickname,
          avatar: aboveRow.user.avatar,
          weeklyXP: aboveRow.weeklyXP,
          totalXP: aboveRow.totalXP,
          currentRank: aboveRow.currentRank,
        });
        gapToNext = above.weeklyXp - myWeekly;
      }

      // 1 posisi di bawah (rank+1): profil dengan weeklyXP terbesar yang < milik saya.
      const belowRow = await db.playerProfile.findFirst({
        where: { user: { role: "MURID" }, weeklyXPWeekKey: wk, weeklyXP: { lt: myWeekly } },
        orderBy: { weeklyXP: "desc" },
        select: {
          userId: true, weeklyXP: true, totalXP: true, currentRank: true,
          user: { select: { fullName: true, nickname: true, avatar: true } },
        },
      });
      if (belowRow) {
        const belowCount = await db.playerProfile.count({
          where: { user: { role: "MURID" }, weeklyXPWeekKey: wk, weeklyXP: { gt: belowRow.weeklyXP } },
        });
        below = toNeighbor(belowCount + 1, {
          userId: belowRow.userId,
          fullName: belowRow.user.fullName,
          nickname: belowRow.user.nickname,
          avatar: belowRow.user.avatar,
          weeklyXP: belowRow.weeklyXP,
          totalXP: belowRow.totalXP,
          currentRank: belowRow.currentRank,
        });
      }
    }
  }

  const top = await getLeaderboard({ scope: "GLOBAL", period: "WEEKLY", userId, limit: 10 });
  const groups = await getWeeklyXpBreakdown(userId);
  const hallOfFame = await getHallOfFame(6);

  const [, w] = wk.split("-W");
  const weekInSeason = ((parseInt(w, 10) - 1) % 4) + 1;

  return {
    weekKey: wk,
    weekLabel: weekLabel(wk),
    seasonKey: sk,
    seasonLabel: seasonLabel(sk),
    weekInSeason,
    periodStartsAt: range.startsAt.toISOString(),
    periodEndsAt: range.endsAt.toISOString(),
    seasonEndsAt: sRange.endsAt.toISOString(),
    now: now.toISOString(),
    totalParticipants,
    top,
    my:
      myRole === "MURID"
        ? {
            rank: myRank,
            weeklyXp: myWeekly,
            totalXp: myTotal,
            isActive,
            statusMessage: podiumStatusMessage({ rank: myRank, total: totalParticipants, weeklyXp: myWeekly, gapToNext }),
          }
        : null,
    above,
    below,
    gapToNext,
    groups,
    hallOfFame,
  };
}
