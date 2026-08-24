/**
 * Daily Action Engine 1.0 — Shared Types
 */

/** Source question representation (common across all providers) */
export interface DailyCandidate {
  /** Unique question ID from the source table */
  id: string;
  /** Source provider */
  source: "TKA" | "UKBI";
  /** Skill derived from question metadata */
  skill: string | null;
  /** Question type: PILIHAN_GANDA | BENAR_SALAH | ISIAN_SINGKAT */
  questionType: string;
  /** Difficulty (nullable, fallback to DEFAULT_DIFFICULTY) */
  difficulty: string | null;
  /** Question text for snapshot */
  questionText: string;
  /** Options as JSON string (for display, no answer) */
  options: string;
  /** Whether the question has been verified (boosts selection score) */
  isVerified: boolean;
  /** Grade/tingkat level: SMP, SMA, UMUM, etc. */
  tingkat: string | null;
  /** UKBI section (seksi) — used for audio safety filtering */
  seksi: string | null;
  /** Whether the question requires audio (UKBI listening) */
  hasAudio: boolean;
}

/** Scored candidate after weighting */
export interface ScoredCandidate extends DailyCandidate {
  score: number;
}

/** GET /api/student/daily-action response (pending action) */
export interface DailyActionPending {
  status: "PENDING";
  id: string;
  source: string;
  skill: string | null;
  questionType: string;
  difficulty: string | null;
  questionText: string;
  options: string;
  date: string;
}

/** GET /api/student/daily-action response (completed action) */
export interface DailyActionCompleted {
  status: "COMPLETED";
  id: string;
  source: string;
  skill: string | null;
  isCorrect: boolean | null;
  date: string;
}

/** GET /api/student/daily-action response (no action today) */
export interface DailyActionNone {
  status: "NONE";
}

/** POST /api/student/daily-action success response */
export interface DailyActionAnswerResult {
  correct: boolean;
  explanation: string | null;
  correctAnswer: string | null;
  xpEarned: number;
  coinEarned: number;
  /** Skill tested (e.g. READING, GRAMMAR, VOCABULARY) */
  skill: string | null;
  /** Human-readable skill label in Bahasa Indonesia */
  skillLabel: string;
  /** Source instrument used */
  source: string;
}

export type DailyActionResponse =
  | DailyActionPending
  | DailyActionCompleted
  | DailyActionNone;
