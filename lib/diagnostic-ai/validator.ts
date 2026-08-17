import { hasSkill, hasSubskill, SUBSKILLS } from "@/lib/question-metadata/taxonomy";
import { AI_DIAGNOSTIC_DIFFICULTIES } from "./config";
import type { AiCognitiveTarget, AiDiagnosticItem, AiQuestionType } from "./types";

export interface AiValidationContext {
  avoidStems: string[];
  avoidIds: string[];
}

export interface AiValidationResult {
  valid: boolean;
  issues: string[];
  item?: AiDiagnosticItem;
}

const QUESTION_TYPES: AiQuestionType[] = ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"];
const COGNITIVE_TARGETS: AiCognitiveTarget[] = [
  "MENGINGAT",
  "MEMAHAMI",
  "MENERAPKAN",
  "MENGANALISIS",
  "MENGEVALUASI",
  "MENCIPTAKAN",
];

export function normalizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueStrings(values: unknown): { ok: boolean; value: string[] } {
  if (!Array.isArray(values)) return { ok: false, value: [] };
  const cleaned: string[] = [];
  for (const value of values) {
    if (typeof value !== "string" || !value.trim()) continue;
    cleaned.push(value.trim());
  }
  if (cleaned.length === 0) return { ok: false, value: [] };
  if (cleaned.some((value) => value.length < 2 || value.length > 160)) return { ok: false, value: [] };
  const seen = new Set<string>();
  for (const value of cleaned) {
    const key = normalizeText(value);
    if (seen.has(key)) return { ok: false, value: [] };
    seen.add(key);
  }
  return { ok: true, value: cleaned };
}

export function validateAiDiagnosticItem(raw: unknown, ctx: AiValidationContext): AiValidationResult {
  const issues: string[] = [];
  if (!isRecord(raw)) return { valid: false, issues: ["Bukan objek JSON"] };

  const questionType = raw.questionType as AiQuestionType;
  if (!QUESTION_TYPES.includes(questionType)) issues.push("R1: questionType tidak didukung");

  const text = typeof raw.text === "string" ? raw.text.trim() : "";
  if (text.length < 20 || text.length > 400) issues.push("R2: teks soal harus 20–400 karakter");

  const skill = typeof raw.skill === "string" ? raw.skill : "";
  if (!hasSkill(skill)) issues.push("R3: skill tidak valid");
  if (skill === "LISTENING" || skill === "SPEAKING") issues.push("R3: skill dengar/bicara belum didukung");

  const subskill = raw.subskill === null || raw.subskill === undefined ? null : typeof raw.subskill === "string" ? raw.subskill.trim() : "";
  if (subskill !== null) {
    if (subskill.length < 2 || subskill.length > 120) issues.push("R4: subskill tidak valid");
    if (skill && hasSkill(skill) && !hasSubskill(skill, subskill)) issues.push("R4: subskill tidak cocok untuk skill");
  }

  const difficulty = typeof raw.difficulty === "string" ? raw.difficulty : "";
  if (!AI_DIAGNOSTIC_DIFFICULTIES.includes(difficulty as (typeof AI_DIAGNOSTIC_DIFFICULTIES)[number])) {
    issues.push("R5: difficulty harus EASY/MEDIUM/HARD");
  }

  const topic = raw.topic === null || raw.topic === undefined ? null : typeof raw.topic === "string" ? raw.topic.trim() : null;
  if (topic !== null && (topic.length < 2 || topic.length > 120)) issues.push("R6: topic tidak valid");

  const cognitiveTarget =
    raw.cognitiveTarget === null || raw.cognitiveTarget === undefined
      ? null
      : (typeof raw.cognitiveTarget === "string" ? raw.cognitiveTarget : "");
  if (cognitiveTarget !== null && !COGNITIVE_TARGETS.includes(cognitiveTarget as AiCognitiveTarget)) {
    issues.push("R7: cognitiveTarget tidak valid");
  }

  const extraction = uniqueStrings(raw.options);
  const hasRawOptions = Array.isArray(raw.options) && raw.options.some((value) => typeof value === "string" && value.trim().length > 0);
  if (questionType === "ISIAN_SINGKAT") {
    if (hasRawOptions) issues.push("R8: isian singkat tidak boleh punya opsi");
  } else if (!extraction.ok) {
    issues.push("R8: options harus berisi 2–4 teks unik s/d 160 karakter");
  }

  if (questionType === "PILIHAN_GANDA" && extraction.ok && extraction.value.length !== 4) {
    issues.push("R8: pilihan ganda butuh tepat 4 opsi");
  }
  if (questionType === "BENAR_SALAH" && extraction.ok) {
    if (extraction.value.length !== 2) {
      issues.push("R8: benar-salah butuh tepat 2 opsi");
    } else {
      const shape = extraction.value.map((value) => normalizeText(value));
      if (shape[0] !== "benar" || shape[1] !== "salah") {
        issues.push("R8: benar-salah harus berisi opsi Benar dan Salah");
      }
    }
  }

  const correctAnswer =
    raw.correctAnswer === undefined || raw.correctAnswer === null ? null : raw.correctAnswer;
  let correctIndex: number | null = null;
  if (questionType !== "ISIAN_SINGKAT") {
    if (typeof correctAnswer === "number" && Number.isInteger(correctAnswer)) correctIndex = correctAnswer;
    else if (typeof correctAnswer === "string" && /^\d+$/.test(correctAnswer)) correctIndex = Number(correctAnswer);
    if (correctIndex === null || !extraction.ok || correctIndex < 0 || correctIndex >= extraction.value.length) {
      issues.push("R9: correctAnswer harus index opsi yang valid");
    }
  } else {
    if (typeof correctAnswer !== "string" || correctAnswer.trim().length < 1 || correctAnswer.trim().length > 80) {
      issues.push("R9: correctAnswer isian harus teks 1–80 karakter");
    }
  }

  const explanation = typeof raw.explanation === "string" ? raw.explanation.trim() : "";
  if (explanation.length < 20) issues.push("R10: explanation wajib minimal 20 karakter");

  const misconceptionMap = isRecord(raw.misconceptionMap) ? raw.misconceptionMap : {};
  if (questionType === "PILIHAN_GANDA" && correctIndex !== null && extraction.ok) {
    for (let i = 0; i < extraction.value.length; i += 1) {
      if (i === correctIndex) continue;
      const explanationText = misconceptionMap[String(i)];
      if (typeof explanationText !== "string" || explanationText.trim().length < 10) {
        issues.push(`R11: misconceptionMap[${i}] wajib menjelaskan miskonsepsi (min 10 karakter)`);
      }
    }
  }

  const evidenceTarget = isRecord(raw.evidenceTarget) ? raw.evidenceTarget : null;
  if (!evidenceTarget || typeof evidenceTarget.skill !== "string" || !hasSkill(evidenceTarget.skill)) {
    issues.push("R12: evidenceTarget.skill tidak valid");
  }
  if (
    !evidenceTarget ||
    !["LOW", "MEDIUM", "HIGH"].includes(evidenceTarget.confidence as string)
  ) {
    issues.push("R12: evidenceTarget.confidence tidak valid");
  }

  const rationale = typeof raw.diagnosticRationale === "string" ? raw.diagnosticRationale.trim() : "";
  if (rationale.length < 20) issues.push("R13: diagnosticRationale wajib minimal 20 karakter");

  if (text && correctIndex !== null && extraction.ok) {
    const stem = normalizeText(text);
    const correct = normalizeText(extraction.value[correctIndex]);
    if (correct.length >= 4 && stem.includes(correct)) {
      issues.push("R14: jawaban benar tidak boleh tertulis di stem soal");
    }
  }

  if (text && ctx.avoidStems.length > 0) {
    const stem = normalizeText(text);
    for (const avoided of ctx.avoidStems) {
      if (normalizeText(avoided) === stem) issues.push("R15: soal duplikat dari yang sudah dikeluarkan");
    }
  }

  if (typeof raw.id !== "string" || !raw.id) {
    issues.push("R16: id soal wajib diisi");
  } else if (ctx.avoidIds.includes(raw.id)) {
    issues.push("R16: id soal sudah dipakai");
  }

  if (issues.length > 0) return { valid: false, issues };

  const item: AiDiagnosticItem = {
    id: typeof raw.id === "string" && raw.id ? raw.id : "",
    text,
    options: extraction.value,
    questionType,
    skill,
    subskill,
    difficulty: difficulty as AiDiagnosticItem["difficulty"],
    topic,
    cognitiveTarget: (cognitiveTarget as AiCognitiveTarget | null) ?? null,
    correctAnswer:
      questionType === "ISIAN_SINGKAT"
        ? String(correctAnswer).trim()
        : String(correctIndex),
    explanation,
    misconceptionMap: misconceptionMap as Record<string, string>,
    evidenceTarget: {
      skill: typeof evidenceTarget?.skill === "string" ? evidenceTarget.skill : "",
      confidence: (evidenceTarget?.confidence as "LOW" | "MEDIUM" | "HIGH") ?? "MEDIUM",
    },
    diagnosticRationale: rationale,
  };
  return { valid: true, issues, item };
}