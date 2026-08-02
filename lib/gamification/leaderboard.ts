import type { PlayerRank } from "@prisma/client";
import { db } from "@/lib/db";
import cache from "@/lib/redis";
import { weekKey, seasonPeriodKey } from "@/lib/gamification/season";
import { RANK_META } from "@/lib/gamification/ranks";
import { getRankAsset } from "@/lib/gamification/rank-assets";

/**
 * Leaderboard BC Arena.
 *
 * Scope: GLOBAL | SCHOOL | CLASS | FRIENDS | PROVINCE
 * Period: ALL_TIME | WEEKLY | SEASON
 *
 * Ranking dihitung dari PlayerProfile (totalXP / weeklyXP / seasonXP).
 * Hasil di-cache di Redis (TTL pendek); fallback ke DB langsung kalau Redis
 * mati (gagal-terbuka, konsisten dengan pola lib/redis.ts).
 */

export type LeaderboardScope = "GLOBAL" | "SCHOOL" | "CLASS" | "FRIENDS" | "PROVINCE";
export type LeaderboardPeriod = "ALL_TIME" | "WEEKLY" | "SEASON";

export interface LeaderboardEntry {
  /** Posisi di papan (1, 2, 3, ...) — BUKAN rank pemain. */
  rank: number;
  userId: string;
  name: string;
  nickname: string | null;
  avatar: string | null;
  level: number;
  /** Rank resmi pemain (BRONZE..LEGEND) — dipakai RankIcon/RankChip. */
  playerRank: PlayerRank;
  rankLabel: string;
  rankTitle: string;
  rankColor: string;
  rankAsset: string;
  score: number;
  weeklyXp: number;
  isMe: boolean;
}

const CACHE_TTL = 60; // detik

// Dinaikkan setiap kali bentuk LeaderboardEntry berubah. Tanpa ini, entri lama
// di Redis (tanpa field baru) masih disajikan sampai TTL habis — mis. RankIcon
// jatuh ke fallback BRONZE untuk semua orang selama semenit setelah deploy.
const CACHE_VERSION = "v2";

function scoreField(period: LeaderboardPeriod): "totalXP" | "weeklyXP" | "seasonXP" {
  if (period === "WEEKLY") return "weeklyXP";
  if (period === "SEASON") return "seasonXP";
  return "totalXP";
}

export interface LeaderboardParams {
  scope: LeaderboardScope;
  period: LeaderboardPeriod;
  /** userId pemanggil (untuk isMe + scope sekolah/kelas/teman). */
  userId?: string;
  /** groupId untuk scope CLASS. */
  groupId?: string;
  /** province untuk scope PROVINCE. */
  province?: string;
  limit?: number;
}

async function resolveScopeUserIds(params: LeaderboardParams): Promise<string[] | null> {
  if (!params.userId) return null;
  switch (params.scope) {
    case "GLOBAL":
      return null;
    case "CLASS": {
      if (!params.groupId) return null;
      const members = await db.groupMember.findMany({
        where: { groupId: params.groupId },
        select: { userId: true },
      });
      return members.map((m) => m.userId);
    }
    case "SCHOOL": {
      const profiles = await db.profile.findMany({
        where: { school: { not: null }, user: { is: { playerProfile: { isNot: null } } } },
        select: { userId: true, school: true },
      });
      // Sekolah dari profil pemanggil.
      const mine = await db.profile.findUnique({ where: { userId: params.userId } });
      if (!mine?.school) return null;
      return profiles.filter((p) => p.school === mine.school).map((p) => p.userId);
    }
    case "PROVINCE": {
      if (!params.province) return null;
      const profiles = await db.profile.findMany({
        where: { province: params.province },
        select: { userId: true },
      });
      return profiles.map((p) => p.userId);
    }
    case "FRIENDS": {
      // Belum ada model pertemanan eksplisit → fallback: anggota kelas yang sama
      // (konsisten dengan keterbatasan model saat ini; bisa diganti bila model
      // pertemanan ditambahkan).
      const memberships = await db.groupMember.findMany({
        where: { userId: params.userId },
        select: { groupId: true },
      });
      if (memberships.length === 0) return null;
      const members = await db.groupMember.findMany({
        where: { groupId: { in: memberships.map((m) => m.groupId) } },
        select: { userId: true },
      });
      return [...new Set(members.map((m) => m.userId))];
    }
    default:
      return null;
  }
}

export async function getLeaderboard(params: LeaderboardParams): Promise<LeaderboardEntry[]> {
  const limit = Math.min(100, Math.max(1, params.limit ?? 20));
  const field = scoreField(params.period);
  const cacheKey = `bca:lb:${CACHE_VERSION}:${params.scope}:${params.period}:${params.userId ?? "x"}:${params.groupId ?? "x"}:${params.province ?? "x"}`;

  const cached = await cache.get<LeaderboardEntry[]>(cacheKey);
  if (cached) return cached;

  const scopeIds = await resolveScopeUserIds(params);

  const where = scopeIds ? { userId: { in: scopeIds } } : {};
  const profiles = await db.playerProfile.findMany({
    where,
    orderBy: [{ [field]: "desc" }, { totalXP: "desc" }],
    take: limit * 3, // ambil lebih untuk filter isMe/name
    include: { user: { select: { id: true, fullName: true, nickname: true, avatar: true } } },
  });

  const entries: LeaderboardEntry[] = profiles
    .filter((p) => p[field] > 0 || field === "totalXP")
    .slice(0, limit)
    .map((p, i) => {
      const meta = RANK_META[p.currentRank];
      return {
        rank: i + 1,
        userId: p.userId,
        name: p.user.fullName,
        nickname: p.user.nickname,
        avatar: p.user.avatar,
        level: p.level,
        playerRank: p.currentRank,
        rankLabel: meta?.label ?? p.currentRank,
        rankTitle: meta?.title ?? p.currentRank,
        rankColor: meta?.color ?? "#64748b",
        rankAsset: getRankAsset(p.currentRank),
        score: p[field],
        weeklyXp: p.weeklyXP,
        isMe: p.userId === params.userId,
      };
    });

  // Pastikan user sendiri ikut muncul (kalau dalam scope & ada skor).
  if (params.userId && !entries.some((e) => e.isMe) && (!scopeIds || scopeIds.includes(params.userId))) {
    const me = await db.playerProfile.findUnique({
      where: { userId: params.userId },
      include: { user: { select: { id: true, fullName: true, nickname: true, avatar: true } } },
    });
    if (me && me[field] > 0) {
      const above = entries.filter((e) => e.score > me[field]).length;
      const meta = RANK_META[me.currentRank];
      entries.push({
        rank: above + 1,
        userId: me.userId,
        name: me.user.fullName,
        nickname: me.user.nickname,
        avatar: me.user.avatar,
        level: me.level,
        playerRank: me.currentRank,
        rankLabel: meta?.label ?? me.currentRank,
        rankTitle: meta?.title ?? me.currentRank,
        rankColor: meta?.color ?? "#64748b",
        rankAsset: getRankAsset(me.currentRank),
        score: me[field],
        weeklyXp: me.weeklyXP,
        isMe: true,
      });
    }
  }

  // Cache hanya kalau scope global/kelas (bukan data pribadi per-user dinamis).
  if (params.scope === "GLOBAL" || params.scope === "CLASS") {
    await cache.set(cacheKey, entries, CACHE_TTL);
  }

  return entries;
}

/** Kunci minggu/season berjalan (untuk UI). */
export function currentPeriodKeys() {
  return { weekKey: weekKey(), seasonKey: seasonPeriodKey() };
}
