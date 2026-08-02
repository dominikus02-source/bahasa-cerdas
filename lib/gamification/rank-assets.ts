import type { PlayerRank } from "@prisma/client";

/**
 * Rank Registry — SUMBER TUNGGAL path icon Rank resmi BahasaCerdas.
 *
 * Asset resmi ada di folder `public/Rank BC/` (512×512, WebP, alpha utuh).
 * Seluruh komponen WAJIB mengambil icon lewat `RankAssets` / `getRankAsset(rank)`
 * — DILARANG menulis path "/Rank BC/...." langsung di component, agar mudah
 * dipelihara jika asset berubah di masa depan.
 *
 * Sumber asli 1000×1000 PNG diarsipkan di luar repo
 * ("BC-Bahasa Cerdas Master/Rank BC sumber/png-1000-asli"). WebP 512 dipilih
 * karena render terbesar di UI 140px (RankUpModal) — masih 3,6× headroom untuk
 * layar retina — dan memangkas aset dari 4,9 MB jadi ±270 KB.
 *
 * Rank: BRONZE → LEGEND (9 rank resmi, lihat lib/gamification/ranks.ts).
 */

export const RankAssets: Record<PlayerRank, string> = {
  BRONZE: "/Rank BC/bronze.webp",
  SILVER: "/Rank BC/silver.webp",
  GOLD: "/Rank BC/gold.webp",
  EMERALD: "/Rank BC/emerald.webp",
  RUBY: "/Rank BC/ruby.webp",
  SAPPHIRE: "/Rank BC/sapphire.webp",
  DIAMOND: "/Rank BC/diamond.webp",
  MASTER: "/Rank BC/master.webp",
  LEGEND: "/Rank BC/legend.webp",
};

/** Dimensi asli file asset (jangan diubah ukuran fisiknya). */
export const RANK_ICON_NATIVE_SIZE = 512;

/** Ambil path icon resmi sebuah rank. Fallback BRONZE bila tidak dikenal. */
export function getRankAsset(rank: string): string {
  return RankAssets[rank as PlayerRank] ?? RankAssets.BRONZE;
}

/** Daftar rank berurutan dari terendah ke tertinggi. */
export const RANK_ORDER: PlayerRank[] = [
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

/** Posisi rank (0 = BRONZE, 8 = LEGEND). */
export function rankIndex(rank: string): number {
  const idx = RANK_ORDER.indexOf(rank as PlayerRank);
  return idx < 0 ? 0 : idx;
}
