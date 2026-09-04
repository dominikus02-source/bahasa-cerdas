import type { DiagnosticCandidate } from "@/lib/diagnostic/types";
import { AI_DIAGNOSTIC_DIFFICULTIES } from "./config";
import { normalizeText } from "./validator";
import { isDiagnosticSafeItem } from "./bank-gate";
import type { AiDiagnosticItem } from "./types";

export interface FallbackPlan {
  skill: string;
  difficulty: string;
}

export function pickBankFallbackCandidate(
  pool: DiagnosticCandidate[],
  plan: FallbackPlan,
  avoidIds: string[],
  avoidStems: string[] = []
): DiagnosticCandidate | null {
  const avoidStemSet = new Set(avoidStems.map((value) => normalizeText(value)));
  const eligible = pool.filter(
    (candidate) =>
      candidate.skill === plan.skill &&
      !avoidIds.includes(candidate.id) &&
      !avoidStemSet.has(normalizeText(String(candidate.text ?? "")))
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

/**
 * Pilih kandidat fallback paling cocok yang LULUS bank gate (defense in depth).
 *
 * Kandidat terbaik per peringkat kesulitan diuji ulang dengan kunci jawaban
 * aslinya; yang gagal disingkirkan dan dicoba kandidat aman berikutnya.
 * MURNI (tanpa DB) — keyOf dipasok pemanggil. Kembalikan null bila tidak ada
 * kandidat aman tersisa (pemanggil memakai perilaku terminal terkendali).
 */
export function pickSafeBankFallbackCandidate(
  pool: DiagnosticCandidate[],
  plan: FallbackPlan,
  avoidIds: string[],
  avoidStems: string[],
  keyOf: (id: string) => string | undefined
): { candidate: DiagnosticCandidate; correctAnswer: string } | null {
  const rejected: string[] = [];
  for (let attempt = 0; attempt <= pool.length; attempt += 1) {
    const candidate = pickBankFallbackCandidate(pool, plan, [...avoidIds, ...rejected], avoidStems);
    if (!candidate) return null;
    const correctAnswer = String(keyOf(candidate.id) ?? "");
    const result = isDiagnosticSafeItem({
      id: candidate.id,
      text: candidate.text,
      options: candidate.options,
      questionType: candidate.questionType,
      correctAnswer,
      avoidStems,
    });
    if (result.safe) return { candidate, correctAnswer };
    // Telemetri server-side saja (tanpa kunci/isi sensitif).
    console.warn("diagnostic fallback rejected candidate", {
      questionId: candidate.id,
      reasons: result.reasons,
      source: "BANK_SOAL",
    });
    rejected.push(candidate.id);
  }
  return null;
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