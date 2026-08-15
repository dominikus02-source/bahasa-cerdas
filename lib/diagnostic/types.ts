import type { DifficultyId, QuestionTypeId } from "@/lib/question-metadata/taxonomy";
import type { DiagnosticConfidence, DiagnosticPlacementBand } from "./config";

export type DiagnosticQuestionType = Extract<QuestionTypeId, "PILIHAN_GANDA" | "BENAR_SALAH" | "ISIAN_SINGKAT">;

export interface DiagnosticCandidate {
  id: string;
  text: string;
  options: string[];
  questionType: DiagnosticQuestionType;
  skill: string;
  subskill: string | null;
  difficulty: DifficultyId | null;
  topic: string | null;
  seenAt: Date | null;
}

/** Komposisi yang diminta (Part B): skill yang diuji + jumlah target. */
export interface DiagnosticRequestedSkill {
  skill: string;
  label: string;
  count: number;
}

/** Komposisi yang benar-benar diantarkan + variasi tipe soal (Part C). */
export interface DiagnosticDeliveredSkill {
  skill: string;
  label: string;
  count: number;
  questionTypes: DiagnosticQuestionType[];
}

/** Fallback jujur bila korpus tidak mendukung (Part B/E/F/Q). */
export interface DiagnosticFallbackEntry {
  skill: string;
  label: string;
  requested: number;
  delivered: number;
  reason: "MISSING_CORPUS" | "DIFFICULTY_UNAVAILABLE" | "SEE_AGAIN";
  note: string;
}

export interface DiagnosticComposition {
  requested: DiagnosticRequestedSkill[];
  delivered: DiagnosticDeliveredSkill[];
  fallback: DiagnosticFallbackEntry[];
  totalRequested: number;
  totalDelivered: number;
  difficultyPlan: DifficultyId[];
}

export interface DiagnosticSelection {
  questions: DiagnosticCandidate[];
  size: number;
  skillsCovered: string[];
  difficultiesUsed: DifficultyId[];
  composition: DiagnosticComposition;
  fallback: boolean;
  fallbackReason: string | null;
}

export type DiagnosticCategory = "STRONG" | "DEVELOPING" | "WEAK" | "INSUFFICIENT_EVIDENCE";

/** Detail evidence per-butir (difficulty tertinggi benar) — read-only. */
export interface DiagnosticEvidenceDetail {
  skill: string;
  difficulty: DifficultyId | null;
  isCorrect: boolean;
}

export interface DiagnosticSkillResult {
  skill: string;
  label: string;
  attempts: number;
  correct: number;
  accuracy: number | null;
  category: DiagnosticCategory;
  confidence: DiagnosticConfidence;
  band: { minLevel: number; maxLevel: number } | null;
  evidenceCount: number;
  strongestEvidence: DifficultyId | null;
  recommendation: "EASY" | "MEDIUM" | "HARD" | null;
}

export interface DiagnosticProfile {
  overallAccuracy: number | null;
  perSkill: DiagnosticSkillResult[];
  strongest: string | null;
  weakest: string | null;
  developing: string[];
  insufficient: string[];
  confidence: DiagnosticConfidence;
  insightText: string | null;
  placement: {
    band: DiagnosticPlacementBand;
    label: string;
    minLevel: number;
    maxLevel: number;
    provisional: boolean;
    note: string;
  } | null;
}