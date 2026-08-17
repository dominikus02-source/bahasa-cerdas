/**
 * Konfigurasi 12 level Teka-Teki Silang (11 tema + Ujian Akhir).
 *
 * Ukuran grid memakai "band" (min/max) bukan angka pasti: generator menempatkan
 * kata secara prosedural lalu menghitung bbox, sehingga grid selalu pas dengan
 * isi — tidak ada sel kosong sisa seperti puzzle tulis tangan dulu.
 *
 * Level 1–11 = satu tema per level (bank kata ~30 entri/tema); level 12 =
 * "Ujian Akhir" campuran semua tema dengan grid & jumlah kata terbesar.
 */

import type { Mascot } from "./types";
import { TTS_BANK } from "./word-bank";

export interface TtsLevelConfig {
  level: number;
  title: string;
  subtitle: string;
  mascot: Mascot;
  minRows: number;
  minCols: number;
  maxRows: number;
  maxCols: number;
  /** Jumlah kata yang diusahakan generator. */
  targetWords: number;
  /** Batas bawah: di bawah ini generator mencoba ulang. */
  minWords: number;
}

const BANKS: Record<number, { title: string; subtitle: string; mascot: Mascot }> = Object.fromEntries(
  TTS_BANK.map((b, i) => [i + 1, { title: b.title, subtitle: b.subtitle, mascot: b.mascot }])
);

export const TTS_LEVELS: TtsLevelConfig[] = [
  { level: 1, minRows: 5, minCols: 5, maxRows: 9, maxCols: 9, targetWords: 5, minWords: 4, ...BANKS[1] },
  { level: 2, minRows: 7, minCols: 7, maxRows: 11, maxCols: 11, targetWords: 6, minWords: 5, ...BANKS[2] },
  { level: 3, minRows: 8, minCols: 6, maxRows: 12, maxCols: 12, targetWords: 6, minWords: 5, ...BANKS[3] },
  { level: 4, minRows: 8, minCols: 7, maxRows: 12, maxCols: 12, targetWords: 7, minWords: 5, ...BANKS[4] },
  { level: 5, minRows: 7, minCols: 9, maxRows: 12, maxCols: 14, targetWords: 7, minWords: 5, ...BANKS[5] },
  { level: 6, minRows: 9, minCols: 8, maxRows: 13, maxCols: 13, targetWords: 7, minWords: 6, ...BANKS[6] },
  { level: 7, minRows: 9, minCols: 9, maxRows: 13, maxCols: 13, targetWords: 8, minWords: 6, ...BANKS[7] },
  { level: 8, minRows: 8, minCols: 9, maxRows: 13, maxCols: 14, targetWords: 8, minWords: 6, ...BANKS[8] },
  { level: 9, minRows: 10, minCols: 10, maxRows: 15, maxCols: 16, targetWords: 9, minWords: 7, ...BANKS[9] },
  { level: 10, minRows: 10, minCols: 10, maxRows: 15, maxCols: 16, targetWords: 9, minWords: 7, ...BANKS[10] },
  { level: 11, minRows: 10, minCols: 10, maxRows: 15, maxCols: 16, targetWords: 9, minWords: 7, ...BANKS[11] },
  {
    level: 12,
    title: "Ujian Akhir",
    subtitle: "Campuran semua tema — level terberat",
    mascot: "alby",
    minRows: 11,
    minCols: 11,
    maxRows: 16,
    maxCols: 17,
    targetWords: 10,
    minWords: 7,
  },
];

export function levelConfig(level: number): TtsLevelConfig {
  return TTS_LEVELS.find((l) => l.level === level) ?? TTS_LEVELS[0];
}
