import type { PlayerRank } from "@prisma/client";

/**
 * Rank Engine BC Arena — 9 rank resmi BahasaCerdas (Sumber Kebenaran:
 * desain resmi founder, lihat OFFICIAL_RANK_SYSTEM_REPORT.md).
 *
 *   Rank      Title          Level
 *   BRONZE    Pemula         1–9
 *   SILVER    Pelajar        10–19
 *   GOLD      Cendekia       20–29
 *   EMERALD   Akademisi      30–39
 *   RUBY      Ahli Bahasa    40–49
 *   SAPPHIRE  Guru Bahasa    50–59
 *   DIAMOND   Master Bahasa  60–69
 *   MASTER    Grand Master   70–79
 *   LEGEND    Legend Bahasa  80–100
 *
 * Rank DIHITUNG dari level (computed). Tidak pernah disimpan/hardcode per
 * user; nilai di PlayerProfile.currentRank hanyalah denormalisasi agar query
 * cepat. Nama rank TIDAK BOLEH diubah.
 */

export const RANKS: PlayerRank[] = [
  "BRONZE",
  "SILVER",
  "GOLD",
  "EMERALD",
  "RUBY",
  "SAPPHIRE",
  "DIAMOND",
  "MASTER",
  "LEGEND",
];

export interface RankMeta {
  /** Nama rank resmi (Bahasa Indonesia). */
  label: string;
  /** Nama material/bahasa Indonesia (backward-compat). */
  material: string;
  /** Title resmi rank (dari desain founder). */
  title: string;
  /** Warna tema rank (hex). */
  color: string;
  minLevel: number;
  maxLevel: number;
}

export const RANK_META: Record<PlayerRank, RankMeta> = {
  BRONZE:   { label: "Bronze",    material: "Perunggu", title: "Pemula",        color: "#cd7f32", minLevel: 1,  maxLevel: 9 },
  SILVER:   { label: "Silver",    material: "Perak",    title: "Pelajar",       color: "#c0c0c0", minLevel: 10, maxLevel: 19 },
  GOLD:     { label: "Gold",      material: "Emas",     title: "Cendekia",      color: "#ffd700", minLevel: 20, maxLevel: 29 },
  EMERALD:  { label: "Emerald",   material: "Zamrud",   title: "Akademisi",     color: "#2e8b57", minLevel: 30, maxLevel: 39 },
  RUBY:     { label: "Ruby",      material: "Rubi",     title: "Ahli Bahasa",   color: "#e0115f", minLevel: 40, maxLevel: 49 },
  SAPPHIRE: { label: "Sapphire",  material: "Safir",    title: "Guru Bahasa",   color: "#0f52ba", minLevel: 50, maxLevel: 59 },
  DIAMOND:  { label: "Diamond",   material: "Berlian",  title: "Master Bahasa", color: "#b9f2ff", minLevel: 60, maxLevel: 69 },
  MASTER:   { label: "Master",    material: "Master",   title: "Grand Master",  color: "#8b00ff", minLevel: 70, maxLevel: 79 },
  LEGEND:   { label: "Legend",    material: "Legenda",  title: "Legend Bahasa", color: "#ff4500", minLevel: 80, maxLevel: 100 },
};

/** Title resmi rank (Pemula, Pelajar, Cendekia, ...). */
export function rankTitle(rank: PlayerRank): string {
  return RANK_META[rank]?.title ?? rank;
}

/** Batas level resmi tiap rank (Sumber Kebenaran). */
export const RANK_BANDS: { rank: PlayerRank; min: number; max: number }[] = [
  { rank: "BRONZE",   min: 1,  max: 9 },
  { rank: "SILVER",   min: 10, max: 19 },
  { rank: "GOLD",     min: 20, max: 29 },
  { rank: "EMERALD",  min: 30, max: 39 },
  { rank: "RUBY",     min: 40, max: 49 },
  { rank: "SAPPHIRE", min: 50, max: 59 },
  { rank: "DIAMOND",  min: 60, max: 69 },
  { rank: "MASTER",   min: 70, max: 79 },
  { rank: "LEGEND",   min: 80, max: 100 },
];

/** Rank dari level (computed, tidak pernah hardcode per user). */
export function rankFromLevel(level: number): PlayerRank {
  const l = Math.max(1, Math.min(100, Math.floor(level)));
  for (const band of RANK_BANDS) {
    if (l <= band.max) return band.rank;
  }
  return "LEGEND";
}

/** Level minimum untuk sebuah rank. */
export function minLevelForRank(rank: PlayerRank): number {
  const band = RANK_BANDS.find((b) => b.rank === rank);
  return band?.min ?? 1;
}

/** Rank berikutnya (null bila sudah LEGEND). */
export function nextRankOf(rank: PlayerRank): PlayerRank | null {
  const idx = RANKS.indexOf(rank);
  return idx < 0 || idx >= RANKS.length - 1 ? null : RANKS[idx + 1];
}
