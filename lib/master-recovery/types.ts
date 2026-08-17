export type QuestionType = "PILIHAN_GANDA" | "BENAR_SALAH" | "ISIAN_SINGKAT";

export interface MasterQuestion {
  kodeSoal: string;
  judul: string;
  tema: string;
  kelas: string;
  semester: number;
  kompetensi: string;
  indikator: string;
  difficulty: string;
  levelBerpikir: number;
  type: QuestionType;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  kataKunci: string[];
  estimasiWaktu: number;
  isHOTS: boolean;
  file: string;
}

export const ISSUE_CATEGORIES = [
  "NO_CORRECT",
  "WRONG_KEY",
  "MULTI_CORRECT",
  "DUPLICATE",
  "NEAR_DUPLICATE",
  "TAUTOLOGY",
  "BAD_TEMPLATE",
  "EMPTY_CONTEXT",
  "BROKEN_CONTEXT",
  "BROKEN_CONTENT",
  "INVALID_OPTION",
  "AMBIGUOUS",
  "CONTEXT_MISMATCH",
  "SKILL_MISMATCH",
  "DIFFICULTY_MISMATCH",
  "EXPLANATION_MISMATCH",
  "LANGUAGE_ERROR",
  "UNSUPPORTED_CLAIM",
  "WRONG_METADATA",
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export type RepairDisposition =
  | "GOLD"
  | "AUTO_REPAIR_ALLOWED"
  | "AI_REPAIR_CANDIDATE"
  | "HUMAN_REVIEW_REQUIRED"
  | "REJECT";

export interface ClassificationResult {
  kodeSoal: string;
  file: string;
  text: string;
  type: QuestionType;
  difficulty: string;
  flags: IssueCategory[];
  disposition: RepairDisposition;
  gold: boolean;
  repair: {
    type?: QuestionType;
    reason?: string;
  } | null;
  reason: string[];
  duplicateOf?: string;
  nearDuplicateOf?: string[];
}
