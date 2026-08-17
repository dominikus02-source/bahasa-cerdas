/**
 * RNG ber-seed untuk generator Teka-Teki Silang.
 *
 * - `hashString` (xmur3): string → uint32, dipakai untuk seed harian.
 * - `mulberry32`: PRNG cepat & deterministik per seed, cukup untuk permainan.
 *
 * Dengan seed yang sama generator selalu menghasilkan puzzle yang sama;
 * seed berbeda → puzzle berbeda. "Teka-Teki Hari Ini" memakai seed turunan
 * tanggal supaya semua pemain mendapat puzzle yang sama pada hari yang sama,
 * lalu berubah keesokan harinya.
 */

export function hashString(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Puzzle "Hari Ini" untuk level tertentu: sama untuk semua pemain, ganti tiap hari. */
export function dailySeed(level: number, dateStr?: string): number {
  const day = dateStr || new Date().toISOString().slice(0, 10);
  return hashString(`bc-tts-daily-v1:${day}:L${level}`);
}

/** Seed acak untuk mode "Acak" (beda tiap main). */
export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}
