/**
 * Level Engine BC Arena — kurva XP RESMI BahasaCerdas (Sumber Kebenaran:
 * desain resmi founder, lihat OFFICIAL_RANK_SYSTEM_REPORT.md).
 *
 *   Level      XP / level        Total XP kumulatif
 *   1–9        250               0–2.250
 *   10–19      450               2.250–6.750
 *   20–29      675               6.750–13.500
 *   30–39      900               13.500–22.500
 *   40–49      1.200             22.500–34.500
 *   50–59      1.500             34.500–49.500
 *   60–69      1.800             49.500–67.500
 *   70–79      2.250             67.500–90.000
 *   80–100     3.000             90.000–150.000+
 *
 * Semua angka level dihitung dari totalXP — tidak pernah hardcode level user.
 */

const MAX_LEVEL = 100;

/** Band XP per level (XP untuk naik dari level → level+1). */
const XP_BANDS: { from: number; to: number; xp: number }[] = [
  { from: 1, to: 9, xp: 250 },
  { from: 10, to: 19, xp: 450 },
  { from: 20, to: 29, xp: 675 },
  { from: 30, to: 39, xp: 900 },
  { from: 40, to: 49, xp: 1200 },
  { from: 50, to: 59, xp: 1500 },
  { from: 60, to: 69, xp: 1800 },
  { from: 70, to: 79, xp: 2250 },
  { from: 80, to: 100, xp: 3000 },
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
