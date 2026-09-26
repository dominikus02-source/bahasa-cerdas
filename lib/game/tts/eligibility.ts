/**
 * TTS-SPECIFIC QUESTION ELIGIBILITY
 *
 * Bank Soal adalah canonical source. TTS hanya mengonsumsi subset yang lolos
 * kontrak crossword: jawaban harus berupa satu kata yang bersih, clue harus
 * berdiri sendiri sebagai petunjuk, dan stem soal pilihan ganda tidak boleh
 * dibawa mentah-mentah ke permainan.
 */
import type { TtsWord } from "./types";
import { classifyClueType, wordDifficulty, type ClueType } from "./difficulty";

export type TtsEligibilityStatus = "APPROVED" | "REVIEW" | "REJECTED";

export interface TtsEligibility {
  status: TtsEligibilityStatus;
  score: number;
  answer: string;
  clue: string;
  clueType: ClueType;
  tier: 1 | 2 | 3;
  reasons: string[];
}

export interface TtsCandidateInput {
  answer: unknown;
  clue: unknown;
  type?: string | null;
  difficulty?: string | null;
  themeKey?: string | null;
}

const GENERIC_STEM_PATTERNS: Array<[RegExp, string]> = [
  [/\bmanakah\b/i, "stem pilihan ganda"],
  [/\bpilihlah\b/i, "stem pilihan ganda"],
  [/\bpernyataan\s+(yang|berikut)/i, "stem pilihan ganda"],
  [/\bberdasarkan\s+(teks|bacaan|kutipan|ilustrasi)/i, "bergantung pada konteks bacaan"],
  [/\bbacalah\b/i, "instruksi membaca"],
  [/\byang\s+(paling\s+)?(tepat|benar|sesuai)\b/i, "stem pilihan ganda"],
  [/\bpilihan\s+(berikut|yang)\b/i, "stem pilihan ganda"],
  [/\bapa(kah)?\s+yang\s+dimaksud/i, "stem pertanyaan umum"],
];

const PLACEHOLDER_PATTERNS = [
  /undefined/i,
  /\bnull\b/i,
  /lorem/i,
  /TODO|FIXME/i,
  /_{2,}/,
  /\{\{.*?\}\}/,
];

const ANSWER_RE = /^[A-Z]{3,14}$/;

export function normalizeTtsAnswer(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase();
}

function cleanClue(value: unknown): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/^\s*(soal|pertanyaan|clue|petunjuk)\s*:\s*/i, "")
    .trim();
}

function normalizeComparable(value: string): string {
  return value.normalize("NFKD").replace(/[^A-Za-z]/g, "").toUpperCase();
}

function tierFromDifficulty(value: string | null | undefined): 1 | 2 | 3 {
  const d = String(value ?? "").toUpperCase();
  if (d === "EASY" || d === "MUDAH") return 1;
  if (d === "HARD" || d === "SULIT") return 3;
  return 2;
}

/**
 * Skor 0–100:
 * - 40 poin lexical/crossword contract
 * - 35 poin clue contract
 * - 25 poin pedagogical clarity
 *
 * APPROVED >= 80, REVIEW 65–79, REJECTED < 65.
 * REJECTED tidak pernah dikirim ke gameplay.
 */
export function evaluateTtsCandidate(input: TtsCandidateInput): TtsEligibility {
  const rawAnswer = String(input.answer ?? "").trim();
  const answer = normalizeTtsAnswer(rawAnswer);
  const clue = cleanClue(input.clue);
  const themeKey = String(input.themeKey ?? "").trim();
  const difficulty = tierFromDifficulty(input.difficulty);
  const clueType = classifyClueType(clue, themeKey);
  const reasons: string[] = [];
  let score = 100;

  if (!ANSWER_RE.test(answer) || rawAnswer !== answer) {
    score -= 40;
    reasons.push("jawaban bukan satu kata A-Z 3–14 huruf");
  }
  if (answer.length < 4) {
    score -= 8;
    reasons.push("jawaban sangat pendek");
  }
  if (clue.length < 12) {
    score -= 20;
    reasons.push("petunjuk terlalu pendek");
  } else if (clue.length > 180) {
    score -= 15;
    reasons.push("petunjuk terlalu panjang");
  }

  for (const [pattern, reason] of GENERIC_STEM_PATTERNS) {
    if (pattern.test(clue)) {
      score -= 30;
      reasons.push(reason);
      break;
    }
  }

  if (PLACEHOLDER_PATTERNS.some((p) => p.test(clue))) {
    score -= 40;
    reasons.push("petunjuk mengandung placeholder/debug");
  }

  if (/^[A-D][.)]\s/i.test(clue)) {
    score -= 30;
    reasons.push("petunjuk terlihat seperti opsi jawaban");
  }

  const clueComparable = normalizeComparable(clue);
  if (answer && clueComparable.includes(answer)) {
    score -= 35;
    reasons.push("petunjuk membocorkan jawaban");
  }

  if (clue.includes("?") && clue.length > 90) {
    score -= 10;
    reasons.push("petunjuk berbentuk pertanyaan terlalu panjang");
  }

  const derived = wordDifficulty({ answer, clue, tier: difficulty }, themeKey);
  const tier = derived.tier;

  score = Math.max(0, Math.min(100, score));
  const status: TtsEligibilityStatus =
    score >= 80 ? "APPROVED" : score >= 65 ? "REVIEW" : "REJECTED";

  return { status, score, answer, clue, clueType, tier, reasons };
}

export function isTtsEligible(candidate: TtsCandidateInput): boolean {
  return evaluateTtsCandidate(candidate).status === "APPROVED";
}

export function filterTtsWords(words: TtsWord[], minScore = 80): TtsWord[] {
  const seen = new Set<string>();
  const out: TtsWord[] = [];

  for (const word of words) {
    const result = evaluateTtsCandidate({
      answer: word.answer,
      clue: word.clue,
    });
    if (result.status !== "APPROVED" || result.score < minScore) continue;
    if (seen.has(result.answer)) continue;
    seen.add(result.answer);
    out.push({
      ...word,
      answer: result.answer,
      clue: result.clue,
      clueType: word.clueType ?? result.clueType,
      tier: word.tier ?? result.tier,
    });
  }

  return out;
}
