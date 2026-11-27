import { isJalurAnswerCorrect } from "@/lib/jalur-cerdas/scoring";
import { asRecord } from "@/lib/roblox/json";

export type StoredRobloxQuestion = {
  id: string;
  type: string;
  prompt: string;
  options: string[];
  jawaban: string | number;
  explanation: string | null;
};

export type PublicRobloxQuestion = {
  id: string;
  type: string;
  prompt: string;
  options: string[];
};

const MAX_PROMPT = 2000;
const MAX_OPTION = 300;
const MAX_OPTIONS = 6;

export function parseUnitQuestions(content: string | null | undefined): StoredRobloxQuestion[] {
  if (!content) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return [];
  }
  const root = asRecord(parsed);
  const list = root && Array.isArray(root.questions) ? root.questions : [];
  const questions: StoredRobloxQuestion[] = [];

  for (const item of list) {
    const row = asRecord(item);
    if (!row) continue;
    const id = typeof row.id === "string" ? row.id.trim() : "";
    if (!id || id.length > 80) continue;
    const promptRaw = typeof row.soal === "string"
      ? row.soal
      : typeof row.prompt === "string"
        ? row.prompt
        : typeof row.text === "string"
          ? row.text
          : "";
    const prompt = promptRaw.trim().slice(0, MAX_PROMPT);
    if (!prompt) continue;
    const jawaban = row.jawaban;
    if (typeof jawaban !== "string" && typeof jawaban !== "number") continue;
    if (typeof jawaban === "string" && (jawaban.length === 0 || jawaban.length > 200)) continue;
    if (typeof jawaban === "number" && !Number.isInteger(jawaban)) continue;
    const optionsRaw = Array.isArray(row.opsi) ? row.opsi : Array.isArray(row.options) ? row.options : [];
    const options = optionsRaw
      .filter((option): option is string => typeof option === "string")
      .map((option) => option.trim().slice(0, MAX_OPTION))
      .filter(Boolean)
      .slice(0, MAX_OPTIONS);
    const typeRaw = typeof row.tipe === "string" ? row.tipe : typeof row.type === "string" ? row.type : "pilihan_ganda";
    const explanationRaw = typeof row.penjelasan === "string"
      ? row.penjelasan
      : typeof row.explanation === "string"
        ? row.explanation
        : "";
    questions.push({
      id,
      type: typeRaw.slice(0, 40),
      prompt,
      options,
      jawaban,
      explanation: explanationRaw.trim().slice(0, 500) || null,
    });
  }

  return questions;
}

export function toPublicQuestion(question: StoredRobloxQuestion): PublicRobloxQuestion {
  return {
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    options: question.options,
  };
}

export function sampleQuestions<T>(items: T[], count: number, random: () => number = Math.random): T[] {
  const copy = items.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swap];
    copy[swap] = current;
  }
  return copy.slice(0, Math.max(0, Math.min(count, copy.length)));
}

export function clampQuestionCount(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 5;
  return Math.max(1, Math.min(10, Math.floor(parsed)));
}

/** Indeks angka atau teks pilihan sama-sama diterima. Kunci tidak pernah dikirim ke klien. */
export function gradeRobloxAnswer(expected: string | number, actual: unknown, options: string[]): boolean {
  if (actual === undefined || actual === null) return false;
  if (typeof actual !== "string" && typeof actual !== "number" && typeof actual !== "boolean") return false;
  if (isJalurAnswerCorrect(expected, actual)) return true;
  if (typeof expected === "number" && Number.isInteger(expected)) {
    const choice = options[expected];
    if (typeof choice === "string" && String(actual).trim().toLowerCase() === choice.trim().toLowerCase()) return true;
  }
  return false;
}
