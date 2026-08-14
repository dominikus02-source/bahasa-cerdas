/**
 * GAME QUESTION QUALITY — normalizer.
 *
 * Mengubah bentuk bank existing ke kontrak kanonik GameQuestion TANPA
 * mengubah format asli game:
 * - BankQuestion (lib/game/question-bank): { soal, opsi[], jawaban(index), ... }
 * - KataPlayQuestion (kataplay-content): { type, instruction, correctAnswer, options[] }
 * - HarvestQuestion (lib/game/harvest): { id, soal, opsi[], jawaban(index), ... }
 */

import type { GameQuestion } from "./types";

export interface BankQuestionLike {
  soal: string;
  opsi: string[];
  jawaban: number;
  penjelasan?: string;
  kategori?: string;
}

export interface KataPlayQuestionLike {
  type: string;
  instruction: string;
  correctAnswer: string;
  options?: string[];
  sentence?: string;
  hint?: string;
}

export interface HarvestQuestionLike {
  id: string;
  soal: string;
  opsi: string[];
  jawaban: number;
  penjelasan?: string;
  lvl?: number;
}

const clean = (s: unknown): string => (typeof s === "string" ? s.trim() : "");

function difficultyFromLevel(lvl?: number): GameQuestion["difficulty"] {
  if (lvl == null) return undefined;
  if (lvl <= 4) return "EASY";
  if (lvl <= 8) return "MEDIUM";
  return "HARD";
}

/** Tipe Katastra yang model jawabannya bukan opsi (bebas teks). */
const FREE_TEXT_TYPES = new Set(["fillBlank", "arrangeWord", "susunKata", "isi_blank", "tebakKata"]);

export function normalizeBankQuestion(q: BankQuestionLike, index: number, source = "bank"): GameQuestion {
  return {
    id: `${source}_${index}`,
    question: clean(q.soal),
    options: (q.opsi || []).map(clean),
    correctAnswer: clean((q.opsi || [])[q.jawaban]),
    explanation: clean(q.penjelasan) || undefined,
    topic: clean(q.kategori) || undefined,
    skill: undefined,
    source,
  };
}

export function normalizeKataPlayQuestion(
  q: KataPlayQuestionLike,
  index: number,
  lessonTitle = "katastra",
  source = "katastra"
): GameQuestion {
  const freeText = FREE_TEXT_TYPES.has(q.type);
  const options = (q.options || []).map(clean);
  return {
    id: `${source}_${index}`,
    question: clean(q.instruction),
    options,
    correctAnswer: clean(q.correctAnswer),
    explanation: clean(q.hint) || undefined,
    topic: `${lessonTitle} · ${q.type}`,
    skill: q.type,
    source,
    freeText,
  };
}

export function normalizeHarvestQuestion(q: HarvestQuestionLike): GameQuestion {
  return {
    id: q.id,
    question: clean(q.soal),
    options: (q.opsi || []).map(clean),
    correctAnswer: clean((q.opsi || [])[q.jawaban]),
    explanation: clean(q.penjelasan) || undefined,
    difficulty: difficultyFromLevel(q.lvl),
    source: "harvest",
  };
}
