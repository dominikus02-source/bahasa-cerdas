import type { DiagnosticCandidate } from "@/lib/diagnostic/types";
import { AI_DIAGNOSTIC_DIFFICULTIES } from "./config";
import type { AiDiagnosticItem } from "./types";

export interface FallbackPlan {
  skill: string;
  difficulty: string;
}

export function pickBankFallbackCandidate(
  pool: DiagnosticCandidate[],
  plan: FallbackPlan,
  avoidIds: string[]
): DiagnosticCandidate | null {
  const eligible = pool.filter(
    (candidate) => candidate.skill === plan.skill && !avoidIds.includes(candidate.id)
  );
  if (eligible.length === 0) return null;
  const diffs = AI_DIAGNOSTIC_DIFFICULTIES;
  const targetIndex = diffs.indexOf(plan.difficulty as (typeof AI_DIAGNOSTIC_DIFFICULTIES)[number]);
  const ranked = [...eligible].sort((a, b) => {
    const aScore = Math.abs((diffs.indexOf(a.difficulty as (typeof AI_DIAGNOSTIC_DIFFICULTIES)[number]) || 0) - targetIndex);
    const bScore = Math.abs((diffs.indexOf(b.difficulty as (typeof AI_DIAGNOSTIC_DIFFICULTIES)[number]) || 0) - targetIndex);
    if (aScore !== bScore) return aScore - bScore;
    const aSeen = a.seenAt ? 1 : 0;
    const bSeen = b.seenAt ? 1 : 0;
    if (aSeen !== bSeen) return aSeen - bSeen;
    return a.id.localeCompare(b.id);
  });
  return ranked[0] ?? null;
}

export function toFallbackAiItem(
  candidate: DiagnosticCandidate,
  correctAnswer: string
): AiDiagnosticItem {
  return {
    id: candidate.id,
    text: candidate.text,
    options: candidate.options,
    questionType: candidate.questionType,
    skill: candidate.skill,
    subskill: candidate.subskill,
    difficulty: candidate.difficulty ?? "MEDIUM",
    topic: candidate.topic,
    cognitiveTarget: null,
    correctAnswer,
    explanation: "Soal dari bank soal BahasaCerdas yang sudah melewati pemeriksaan kualitas.",
    misconceptionMap: {},
    evidenceTarget: { skill: candidate.skill, confidence: "HIGH" },
    diagnosticRationale: "Soal bank terkurasi dipakai saat generator AI tidak tersedia.",
  };
}