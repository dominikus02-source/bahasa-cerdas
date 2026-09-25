/**
 * P8I — Model kesulitan deterministik TTS.
 *
 * Prinsip: tingkat TIDAK diberi label manual — diturunkan dari (tema, tipe
 * petunjuk, panjang jawaban) sehingga dapat dijelaskan dan diuji.
 *
 * Tingkat permainan (pemetaan 12 level produk):
 *   DASAR    = L1–3   · MENENGAH = L4–6   · LANJUT = L7–12
 *
 * Aturan gerbang kata: kata tier-N hanya boleh muncul di level yang
 * maxTierForLevel(level) ≥ N. Ini menyelesaikan masalah "kata langka di
 * level dasar" (mis. RUPAWAN/SINONIM di L4) tanpa merestrukturasi tema.
 */

import type { TtsWord } from "./types";

export type ClueType =
  | "definisi"
  | "sinonim"
  | "antonim"
  | "ejaan-baku"
  | "imbuhan"
  | "majas"
  | "ungkapan"
  | "serapan"
  | "istilah";

/** Bobot kognitif tipe petunjuk (1 = paling mudah). */
export const CLUE_TYPE_WEIGHT: Record<ClueType, number> = {
  antonim: 1,
  definisi: 1,
  serapan: 2,
  sinonim: 2,
  "ejaan-baku": 2,
  imbuhan: 3,
  ungkapan: 3,
  istilah: 4,
  majas: 4,
};

const THEME_BASE_TIER: Record<string, number> = {
  keluarga: 1,
  antonim: 1,
  "kata-serapan": 1,
  "ejaan-baku": 2,
  sinonim: 2,
  "kelas-kata": 2,
  "eyd-lanjut": 2,
  ungkapan: 3,
  imbuhan: 2,
  "unsur-sastra": 3,
  majas: 3,
};

/** Kata langka/nuansa — digerbangi dari level dasar-menengah (audit P8I §B). */
const RARE_WORDS = new Set([
  "RUPAWAN", "RANCU", "LENYAP", "AKBAR", "PENAT", "INSYAF", "SUTRA",
  "LITOTES", "ASONANSI", "ALITERASI", "ANAFORA", "METONIMIA",
  "DEMONSTRATIVA", "RELATIVA", "POSESIVA",
]);

/** Kata langka = wajib menunggu level lanjut (≥ 7) sebelum boleh muncul. */
export function isRareAnswer(answer: string): boolean {
  return RARE_WORDS.has(answer);
}

/** Klasifikasi tipe petunjuk (heuristik deterministik — tervalidasi uji). */
export function classifyClueType(clue: string, themeKey: string): ClueType {
  if (/^Ejaan baku dari/i.test(clue)) return "ejaan-baku";
  if (/^Sinonim dari/i.test(clue)) return "sinonim";
  if (/^Antonim dari/i.test(clue)) return "antonim";
  if (/Kata dasar .+ \+ (imbuhan|akhiran|awalan)/i.test(clue)) return "imbuhan";
  if (/^Majas/i.test(clue)) return "majas";
  if (/\.\.\./.test(clue)) return "ungkapan";
  if (/dari Belanda|dari Inggris|dari bahasa/i.test(clue)) return "serapan";
  const byTheme: Record<string, ClueType> = {
    "kelas-kata": "istilah",
    "unsur-sastra": "istilah",
    "eyd-lanjut": "istilah",
    majas: "majas",
  };
  return byTheme[themeKey] ?? "definisi";
}

export interface WordDifficulty {
  clueType: ClueType;
  /** Skor 1–10; makin besar makin sulit. */
  score: number;
  tier: 1 | 2 | 3;
}

/** Skor & tingkat deterministik untuk satu entri bank kata. */
export function wordDifficulty(w: TtsWord, themeKey: string): WordDifficulty {
  const clueType = classifyClueType(w.clue, themeKey);
  let score = CLUE_TYPE_WEIGHT[clueType];
  score += w.answer.length / 4;
  if (RARE_WORDS.has(w.answer)) score += 2;

  let tier: 1 | 2 | 3 = (THEME_BASE_TIER[themeKey] ?? 2) as 1 | 2 | 3;
  if (RARE_WORDS.has(w.answer) || score > 5.5) tier = 3;
  else if (score < 3 && tier === 3) tier = 2;

  return { clueType, score: Math.round(score * 10) / 10, tier };
}

/**
 * Gerbang level: tema dipetakan 1:1 ke level (axis kesulitan produk), jadi
 * yang DITEGAKKAN di sini hanya: kata langka (RARE) tidak boleh muncul
 * sebelum level 7 (LANJUT). Tier tetap menjadi metadata hadiah/analitik.
 */
/**
 * Content gate — level harus terasa sebagai kenaikan kemampuan, bukan hanya
 * grid yang makin besar. Tier 1 = fondasi, Tier 2 = menengah, Tier 3 = lanjut.
 * Rentang sengaja overlap agar pemain tetap mendapat pengulangan terarah.
 */
export function canAppearInLevel(answer: string, tier: 1 | 2 | 3, level: number): boolean {
  if (isRareAnswer(answer) && level < 9) return false;
  if (level === 1) return tier === 1;
  if (level === 2) return tier <= 2;
  if (level <= 4) return tier <= 2;
  if (level <= 6) return tier >= 1 && tier <= 2;
  if (level <= 8) return tier >= 2;
  if (level <= 10) return tier >= 2;
  return tier >= 2;
}

/** Tingkat permainan dari level produk. */
export function gameplayTierForLevel(level: number): "DASAR" | "MENENGAH" | "LANJUT" {
  if (level <= 3) return "DASAR";
  if (level <= 6) return "MENENGAH";
  return "LANJUT";
}

/**
 * P8I §KEBOCORAN SILANG — pasangan petunjuk↔jawaban yang tidak boleh berada
 * dalam puzzle yang sama: jika jawaban A sudah terpasang di grid, petunjuk
 * "Sinonim/Antonim dari 'a'" menjadi bocor lewat perpotongan huruf.
 */
export function conflictAnswersFor(answer: string, allWords: TtsWord[]): Set<string> {
  const conflicts = new Set<string>();
  const lower = answer.toLowerCase();
  for (const w of allWords) {
    if (w.answer === answer) continue;
    const quoted = w.clue.match(/'([^']+)'/g);
    if (!quoted) continue;
    for (const q of quoted) {
      if (q.replace(/'/g, "").trim().toLowerCase() === lower) {
        conflicts.add(w.answer);
        break;
      }
    }
  }
  return conflicts;
}

/**
 * P8J Obj.1 — Nudge kontekstual gratis (sekali per kata, sisi klien).
 * Informasi diturunkan dari klasifikasi clue yang SUDAH terlihat pemain
 * lewat tema/level — tidak membocorkan jawaban, tidak menghabiskan anggaran.
 */
export const HINT_NUDGE_BY_TYPE: Record<ClueType, string> = {
  definisi: "Petunjuknya berupa pengertian langsung — coba ingat istilah yang biasa dipakai.",
  sinonim: "Ini mencari padanan kata bermakna sama. Ucapkan petunjuknya, lalu cari kata lain yang mirip maknanya.",
  antonim: "Ini lawan kata. Bayangkan kebalikan dari petunjuknya.",
  "ejaan-baku": "Fokus ke ejaan KBBI — bentuk sehari-harinya memang berbeda.",
  imbuhan: "Perhatikan awalan/akhiran dan huruf dasarnya (ingat aturan peluluhan).",
  majas: "Ini istilah gaya bahasa — kenali ciri khasnya dari petunjuk.",
  ungkapan: "Lengkapi ungkapan kiasan yang umum dipakai sehari-hari.",
  serapan: "Kata ini diserap dari bahasa lain — ejaannya menyesuaikan KBBI.",
  istilah: "Ini istilah penting dalam materi Bahasa Indonesia — hafalkan setelah berhasil.",
};

export function hintNudgeFor(clueType: ClueType | undefined): string | null {
  if (!clueType) return null;
  return HINT_NUDGE_BY_TYPE[clueType] ?? null;
}
