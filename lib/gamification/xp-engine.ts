import { db } from "@/lib/db";
import { levelFromXp, cumulativeXpForLevel, levelAfterXp } from "@/lib/gamification/levels";
import { rankFromLevel } from "@/lib/gamification/ranks";
import { weekKey, seasonPeriodKey, startOfWeekWIB } from "@/lib/gamification/season";

/**
 * Konstanta & tipe progresi BC Arena.
 *
 * Berkas ini DULU memuat `addXp()`, pintu XP kedua. Pintu pemberian XP sekarang
 * hanya satu: `awardXp()` di lib/award-xp.ts — di sanalah batas per-submit,
 * kuota harian, XP Boost, ledger, dan sinkronisasi User.xp ↔ PlayerProfile
 * dikerjakan dalam satu transaksi.
 *
 * Yang tersisa di sini: daftar sumber XP, konstanta reward koin, dan helper
 * kurva level yang dipakai UI.
 */

/** Sumber XP yang dikenal (untuk konsistensi metadata). */
export const XP_SOURCES = [
  "JALUR_CERDAS",
  "ARENA",
  "KARYA_SISWA",
  "ARTIKEL",
  "UKBI",
  "TKA",
  "PENUGASAN",
  "AI",
  "GAME",
  "KATASTRA",
  "MENARA",
  "KOMPETENSI",
  "SIMULASI",
  "ADAPTIVE_PRACTICE",
  "DAILY_QUEST",
  "BADGE",
  "ACHIEVEMENT",
  "SYSTEM",
] as const;

export type XpSource = (typeof XP_SOURCES)[number];

/** Reward koin otomatis saat naik level. */
export const LEVEL_UP_COIN_REWARD = 20;

/** Reward koin per pencapaian level penting (level 10, 20, ...). */
export const MILESTONE_COIN_REWARD = 50;

export interface AddXpParams {
  userId: string;
  source: XpSource;
  amount: number;
  /** Metadata JSON bebas (unitId, paketId, karyaId, ...). */
  metadata?: Record<string, unknown>;
  /** Referensi idempotency. WAJIB untuk sumber yang bisa terpanggil berulang. */
  reference?: string;
  /** Nonaktifkan reward koin saat naik level (untuk migrasi/bulk import). */
  silent?: boolean;
}

export interface AddXpResult {
  xpAdded: number;
  totalXp: number;
  level: number;
  rank: string;
  weeklyXp: number;
  seasonXp: number;
  levelUp: boolean;
  levelBefore: number;
  coinsEarned: number;
  /** True kalau permintaan ditolak karena sudah pernah dicatat (idempotent). */
  duplicate: boolean;
}

/**
 * addXp DIHAPUS pada penyatuan sistem progresi.
 *
 * Dulu ini pintu XP kedua: menulis PlayerProfile.totalXP tanpa menyentuh
 * User.xp, tanpa kuota harian, dan tanpa XP Boost. Akibatnya total XP murid
 * bercabang dua dan level di beranda Arena berbeda dengan dasbor Pemain.
 *
 * Semua pemberian XP sekarang lewat `awardXp()` di lib/award-xp.ts, yang
 * memperbarui User.xp DAN PlayerProfile dalam satu transaksi. Jangan
 * menghidupkan fungsi ini lagi.
 */

/**
 * Total XP yang dibutuhkan untuk level berikutnya (dipakai UI).
 */
export function xpNeededForNextLevel(level: number): number {
  return cumulativeXpForLevel(level + 1) - cumulativeXpForLevel(level);
}

export { levelFromXp, levelAfterXp, cumulativeXpForLevel };
export { startOfWeekWIB };
