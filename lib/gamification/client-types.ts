import type { PlayerRank } from "@prisma/client";

/** Bentuk respons GET /player/profile. */
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
  equippedNameplate: string | null;
  equippedFrame: string | null;
  equippedBackground: string | null;
  levelProgress: { current: number; needed: number; pct: number; remaining: number };
  xpToNextLevel: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerProfileResponse {
  profile: PlayerProfileView;
  summary: {
    badges: { total: number; unlocked: number };
    achievements: { total: number; completed: number; claimed: number };
  };
  periods: { weekKey: string; seasonKey: string };
}

export interface LeaderboardEntryView {
  /** Posisi di papan (1, 2, 3, ...) — BUKAN rank pemain. */
  rank: number;
  userId: string;
  name: string;
  nickname: string | null;
  avatar: string | null;
  level: number;
  /** Rank resmi pemain (BRONZE..LEGEND) — dipakai RankIcon/RankChip. */
  playerRank: string;
  rankLabel: string;
  rankTitle: string;
  rankColor: string;
  score: number;
  weeklyXp: number;
  isMe: boolean;
}

export interface BadgeView {
  id: string;
  code: string;
  name: string;
  icon: string;
  description: string;
  rarity: string;
  unlocked: boolean;
  awardedAt: string | null;
}

export interface AchievementView {
  id: string;
  code: string;
  name: string;
  icon: string;
  description: string;
  target: number;
  progress: number;
  rewardXP: number;
  rewardCoins: number;
  completed: boolean;
  claimed: boolean;
}

export interface DailyQuestView {
  id: string;
  date: string;
  questType: string;
  target: number;
  progress: number;
  completed: boolean;
  rewardCoins: number;
  claimed: boolean;
}

export interface XpHistoryEntryView {
  id: string;
  source: string;
  sourceLabel: string;
  amount: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface CoinHistoryEntryView {
  id: string;
  amount: number;
  reason: string;
  reference: string | null;
  createdAt: string;
}

export interface PlayerNotificationView {
  id: string;
  type: "XP" | "COIN" | "BADGE" | "ACHIEVEMENT" | "QUEST" | "LEVEL_UP" | "SEASON" | "SYSTEM";
  title: string;
  body: string;
  icon: string;
  amount: number | null;
  reference: string | null;
  createdAt: string;
}

/** Rarity badge → warna tema. */
export const RARITY_META: Record<string, { label: string; color: string; border: string }> = {
  BRONZE: { label: "Perunggu", color: "#cd7f32", border: "border-orange-400/40" },
  SILVER: { label: "Perak", color: "#c0c0c0", border: "border-slate-300/50" },
  GOLD: { label: "Emas", color: "#ffd700", border: "border-amber-400/60" },
  LEGENDARY: { label: "Legendaris", color: "#fbbf24", border: "border-amber-400/60" },
};

export { RANK_META } from "@/lib/gamification/ranks";
export type { PlayerRank };
