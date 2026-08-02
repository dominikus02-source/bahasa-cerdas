/**
 * Level Engine BC Arena — kurva XP RESMI BahasaCerdas (Sumber Kebenaran:
 * desain resmi founder, lihat OFFICIAL_RANK_SYSTEM_REPORT.md).
 *
 *   Level      XP / level        Total XP kumulatif
 *   1–9          250              0–2.250
 *   10–19        500              2.250–7.250
 *   20–29        900              7.250–16.250
 *   30–39      1.500              16.250–31.250
 *   40–49      2.400              31.250–55.250
 *   50–59      3.600              55.250–91.250
 *   60–69      5.400              91.250–145.250
 *   70–79      8.000              145.250–225.250
 *   80–100    12.000              225.250–465.250
 *
 * Semua angka level dihitung dari totalXP — tidak pernah hardcode level user.
 *
 * ── Kenapa band atas dicuramkan ───────────────────────────────────────────
 * Kurva sebelumnya menaruh level 100 di 153.000 XP. Dengan batas harian 5.000
 * XP (BATAS_XP_HARIAN di lib/xp-guard.ts), murid yang menghabiskan kuota tiap
 * hari mencapai LEGEND dalam 31 hari — seluruh tangga 9 rank tuntas sebelum
 * satu semester. Sekarang 465.250 XP: 93 hari dengan grinding sempurna, dan
 * bertahun-tahun untuk ritme belajar normal.
 *
 * Band bawah sengaja TIDAK diubah banyak: murid baru harus tetap merasa cepat
 * maju di minggu-minggu pertama. Yang dicuramkan hanya wilayah prestise.
 */

const MAX_LEVEL = 100;

/** Band XP per level (XP untuk naik dari level → level+1). */
const XP_BANDS: { from: number; to: number; xp: number }[] = [
  { from: 1, to: 9, xp: 250 },
  { from: 10, to: 19, xp: 500 },
  { from: 20, to: 29, xp: 900 },
  { from: 30, to: 39, xp: 1500 },
  { from: 40, to: 49, xp: 2400 },
  { from: 50, to: 59, xp: 3600 },
  { from: 60, to: 69, xp: 5400 },
  { from: 70, to: 79, xp: 8000 },
  { from: 80, to: 100, xp: 12000 },
];

/** XP yang dibutuhkan untuk naik dari level → level+1 (kurva resmi). */
export function xpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level));
  for (const band of XP_BANDS) {
    if (l <= band.to) return band.xp;
  }
  return 3000; // di atas level 100 (level 100 = cap, tidak naik lagi)
}

/** Total XP kumulatif yang dibutuhkan untuk mencapai level tertentu (≥1). */
export function cumulativeXpForLevel(level: number): number {
  const l = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
  let total = 0;
  for (let i = 1; i < l; i++) total += xpForLevel(i);
  return total;
}

/** Level dari totalXP (1..100). */
export function levelFromXp(totalXp: number): number {
  const xp = Math.max(0, Math.floor(totalXp));
  if (xp >= cumulativeXpForLevel(MAX_LEVEL)) return MAX_LEVEL;
  let level = 1;
  while (level < MAX_LEVEL && xp >= cumulativeXpForLevel(level + 1)) {
    level++;
  }
  return level;
}

export interface LevelProgress {
  level: number;
  /** XP di dalam level saat ini. */
  current: number;
  /** XP total yang dibutuhkan untuk naik dari level ini ke level berikutnya. */
  needed: number;
  /** Progres 0..1. */
  pct: number;
  /** XP tersisa untuk naik level. */
  remaining: number;
}

export function getLevelProgress(totalXp: number): LevelProgress {
  const level = levelFromXp(totalXp);
  const base = cumulativeXpForLevel(level);
  const next = cumulativeXpForLevel(level + 1);
  const current = totalXp - base;
  const needed = next - base;
  return {
    level,
    current,
    needed,
    pct: needed > 0 ? Math.min(current / needed, 1) : 1,
    remaining: Math.max(0, next - totalXp),
  };
}

/** Level berikutnya setelah menerima sejumlah XP (untuk deteksi naik level). */
export function levelAfterXp(totalXpBefore: number, gained: number): number {
  return levelFromXp(totalXpBefore + Math.max(0, gained));
}
