import type { PlayerRank } from "@prisma/client";

/**
 * RANK REWARDS — Reward saat naik Rank BahasaCerdas (Sumber Kebenaran).
 *
 * Saat pemain naik rank, ia menerima (semua configurable di satu tempat):
 *   ✓ Rank Baru (otomatis dari level)
 *   ✓ Frame Avatar Baru
 *   ✓ Badge Rank
 *   ✓ Coin Reward
 *   ✓ Mystery Box
 *   ✓ Title Baru
 *   ✓ Border Profile
 *
 * Reward dicairkan idempotent oleh lib/gamification/rank-up.ts. Ubah nilai di
 * sini → semua pemain memakai nilai baru (untuk rank yang belum pernah dicairkan).
 */

export interface RankRewardConfig {
  /** Koin yang diberikan saat naik ke rank ini. */
  coin: number;
  /** Kode badge rank (definisi dibuat otomatis bila belum ada). */
  badgeCode: string;
  /** Nama badge rank (Bahasa Indonesia). */
  badgeName: string;
  /** Title yang diberikan (set ke PlayerProfile.title bila belum diatur user). */
  title: string;
  /** Frame avatar rank (id frame; di-set bila user belum punya frame custom). */
  frame: string | null;
  /** Border profile rank (id border; ditampilkan lewat tema border). */
  border: string | null;
  /** Mystery Box diberikan (bonus koin acak + flag). */
  mysteryBox: boolean;
  /** Bonus koin Mystery Box (diroll kalau mysteryBox = true). */
  mysteryBoxCoins: number;
}

export const RANK_REWARDS: Record<PlayerRank, RankRewardConfig> = {
  BRONZE:   { coin: 0,   badgeCode: "rank-bronze",   badgeName: "Perunggu",   title: "Pemula",        frame: "frame-rank-bronze",   border: "border-rank-bronze",   mysteryBox: false, mysteryBoxCoins: 0 },
  SILVER:   { coin: 50,  badgeCode: "rank-silver",   badgeName: "Perak",      title: "Pelajar",       frame: "frame-rank-silver",   border: "border-rank-silver",   mysteryBox: false, mysteryBoxCoins: 0 },
  GOLD:     { coin: 100, badgeCode: "rank-gold",     badgeName: "Emas",       title: "Cendekia",      frame: "frame-rank-gold",     border: "border-rank-gold",     mysteryBox: true,  mysteryBoxCoins: 50 },
  EMERALD:  { coin: 150, badgeCode: "rank-emerald",  badgeName: "Zamrud",     title: "Akademisi",     frame: "frame-rank-emerald",  border: "border-rank-emerald",  mysteryBox: false, mysteryBoxCoins: 0 },
  RUBY:     { coin: 200, badgeCode: "rank-ruby",     badgeName: "Rubi",       title: "Ahli Bahasa",   frame: "frame-rank-ruby",     border: "border-rank-ruby",     mysteryBox: true,  mysteryBoxCoins: 80 },
  SAPPHIRE: { coin: 250, badgeCode: "rank-sapphire", badgeName: "Safir",      title: "Guru Bahasa",   frame: "frame-rank-sapphire", border: "border-rank-sapphire", mysteryBox: false, mysteryBoxCoins: 0 },
  DIAMOND:  { coin: 300, badgeCode: "rank-diamond",  badgeName: "Berlian",    title: "Master Bahasa", frame: "frame-rank-diamond",  border: "border-rank-diamond",  mysteryBox: true,  mysteryBoxCoins: 120 },
  MASTER:   { coin: 400, badgeCode: "rank-master",   badgeName: "Master",     title: "Grand Master",  frame: "frame-rank-master",   border: "border-rank-master",   mysteryBox: true,  mysteryBoxCoins: 150 },
  LEGEND:   { coin: 500, badgeCode: "rank-legend",   badgeName: "Legenda",    title: "Legend Bahasa", frame: "frame-rank-legend",   border: "border-rank-legend",   mysteryBox: true,  mysteryBoxCoins: 200 },
};

/** Ambil konfigurasi reward sebuah rank. */
export function getRankReward(rank: PlayerRank): RankRewardConfig {
  return RANK_REWARDS[rank];
}
