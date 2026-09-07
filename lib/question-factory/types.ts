/**
 * Question Factory V2 — Canonical Item Contract (P3.3 §1–§21).
 *
 * This file defines the ground-truth types for the validation pipeline.
 * No Prisma dependency — validators work on plain objects.
 *
 * Section references (P3.3):
 *   §2  — Validation result contract
 *   §3  — Reason-code registry (see registry.ts)
 *   §4  — Validator interface (see interface.ts)
 *   §11 — D10 states
 *   §13 — Publish contract
 *   §14 — Delivery-safe contract
 *   §15 — Provenance contract
 *   §17 — Duplicate contract
 *   §18 — Calibration contract
 */

// ─── D10 Diagnostic Value States (P3.3 §11.4, §11.5, QS v1.1 §4.4) ────────

/** D10 states (monotonic — never regress). */
export type D10State =
  | "NOT_APPLICABLE"
  | "HYPOTHESIS"
  | "REVIEWED"
  | "EMPIRICALLY_SUPPORTED";

/** Allowed monotonic transitions. */
export const D10_TRANSITIONS: Record<D10State, D10State[]> = {
  NOT_APPLICABLE: ["HYPOTHESIS"],
  HYPOTHESIS: ["REVIEWED"],
  REVIEWED: ["EMPIRICALLY_SUPPORTED"],
  EMPIRICALLY_SUPPORTED: [],
};

// ─── Purpose Model (P3.3 §3, P3.2 §8) ──────────────────────────────────────

export type ItemPurpose =
  | "PRACTICE"
  | "ACHIEVEMENT"
  | "DIAGNOSTIC"
  | "ADAPTIVE_MISCONCEPTION"
  | "CALIBRATION";

/** Minimum D10 state required per purpose. */
export const PURPOSE_D10_MIN: Record<ItemPurpose, D10State> = {
  PRACTICE: "HYPOTHESIS",
  ACHIEVEMENT: "HYPOTHESIS",
  DIAGNOSTIC: "REVIEWED",
  ADAPTIVE_MISCONCEPTION: "EMPIRICALLY_SUPPORTED",
  CALIBRATION: "NOT_APPLICABLE",
};

// ─── Delivery-Safe Fields (P3.3 §14.2) ──────────────────────────────────────

/** Fields that are NEVER sent to the student client. */
export const INTERNAL_FIELDS: readonly string[] = [
  "correctAnswer",
  "distractorRationale",
  "misconceptionTarget",
  "qualityScores",
  "reviewerComments",
  "d10State",
  "provenance",
  "aiGenerated",
  "aiProvider",
  "aiModel",
  "aiPromptVersion",
  "aiConfidence",
  "calibrationLevel",
  "calibrationHistory",
  "discriminationIndex",
  "difficultyDrift",
  "correctRate",
  "avgResponseTime",
] as const;

// ─── Calibration Levels (P3.3 §18.1) ────────────────────────────────────────

export type CalibrationLevel = 0 | 1 | 2 | 3;

// ─── Severity & Blocking (P3.3 §8, P3.4 §V.2) ──────────────────────────────

export type Severity = "HARD_FAIL" | "SOFT_FAIL" | "ADVISORY";

// ─── Validation Result Contract (P3.3 §2, P3.4 §V.2) ────────────────────────

/** A single validation finding from a validator. */
export interface ValidationFinding {
  /** Validator that produced this finding (e.g., "structural", "answer-key"). */
  validatorId: string;
  /** Semantic version of the validator. */
  validatorVersion: string;
  /** Pipeline stage (0–14, or -1 for pre-check). */
  stage: number;
  /** Status of this individual check. */
  status: "PASS" | "FAIL" | "SKIP" | "ADVISORY";
  /** Severity classification. */
  severity: Severity;
  /** If true, item cannot advance to next stage. */
  blocking: boolean;
  /** If true, this finding can be retried (e.g., transient). */
  retryable: boolean;
  /** Machine-readable reason code (see registry.ts). */
  reasonCode: string;
  /** Human-readable explanation. */
  rationale: string;
  /** Optional extra context. */
  details?: Record<string, unknown>;
  /** When this finding was produced (ISO-8601). */
  evaluatedAt: string;
}

/** Aggregate validation result for a single item through the pipeline. */
export interface ValidationResult {
  /** True iff zero HARD_FAIL/FAIL findings with blocking=true. */
  valid: boolean;
  /** All findings from all validators. */
  findings: ValidationFinding[];
  /** Count by severity. */
  summary: {
    hardFails: number;
    softFails: number;
    advisories: number;
    passes: number;
  };
}

// ─── Canonical Item (P3.3 §1.2–§1.21) ───────────────────────────────────────

/** Core identity fields (Group A). */
export interface ItemIdentity {
  id: string;
  version: number;
  source: ItemSource;
  createdAt: string;
  createdById: string;
}

export type ItemSource =
  | "MASTER_BANK"
  | "AI"
  | "IMPORT"
  | "MANUAL"
  | "UKBI"
  | "TKA"
  | "V2_PILOT";

/** Content fields (Group B). */
export interface ItemContent {
  stem: string;
  options: string[];
  stimulusContent?: string;
  explanation?: string;
}

/** Response model fields (Group C). */
export interface ItemResponseModel {
  questionType: "PILIHAN_GANDA" | "BENAR_SALAH" | "ISIAN_SINGKAT";
  correctAnswer: string;
  distractorRationale?: string[];
}

/** Purpose & diagnostic fields (Group D). */
export interface ItemPurposeFields {
  purpose: ItemPurpose;
  d10State: D10State;
  evidenceTarget?: { skill: string; confidence: "LOW" | "MEDIUM" | "HIGH" };
  misconceptionTarget?: Array<{ option: string; misconception: string }>;
  calibrationLevel?: CalibrationLevel;
}

/** Taxonomy fields (Group I). */
export interface ItemTaxonomy {
  skill: string;
  subskill?: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  topic?: string;
  cognitiveTarget?: string;
}

/** Provenance fields (P3.3 §15, immutable after set). */
export interface ItemProvenance {
  provenance: "AUTHOR" | "CURRICULUM" | "EXISTING_DATA" | "AI_ASSISTED" | "HUMAN_REVIEW" | "EMPIRICAL";
  aiGenerated?: boolean;
  aiProvider?: string;
  aiModel?: string;
  aiPromptVersion?: string;
  aiConfidence?: number;
  reviewedBy?: string[];
  reviewedAt?: string;
}

/** State machine (P3.3 §8, §11). */
export type ItemReviewState =
  | "NOT_REVIEWED"
  | "PENDING"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "REVISION"
  | "RE_SUBMITTED"
  | "PUBLISHED";

export const VALID_TRANSITIONS: Record<ItemReviewState, ItemReviewState[]> = {
  NOT_REVIEWED: ["PENDING"],
  PENDING: ["IN_REVIEW", "REJECTED"],
  IN_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: ["PUBLISHED"],
  REJECTED: ["REVISION"],
  REVISION: ["RE_SUBMITTED"],
  RE_SUBMITTED: ["PENDING"],
  PUBLISHED: [],
};

/**
 * The canonical item object — carries ALL DNA fields (Groups A–T).
 * Validators work on this shape, NOT on Prisma models.
 * (P3.3 §1, P3.4 §V.1)
 */
export interface CanonicalItem {
  identity: ItemIdentity;
  content: ItemContent;
  responseModel: ItemResponseModel;
  purpose: ItemPurposeFields;
  taxonomy: ItemTaxonomy;
  provenance: ItemProvenance;
  reviewState: ItemReviewState;

  /** Legacy adapter field — kodeSoal from Soal row. */
  kodeSoal?: string;
  /** Legacy adapter field — source string from Soal row. */
  sourceString?: string;
}

// ─── Validation Context ──────────────────────────────────────────────────────

/**
 * Context passed to validators (P3.4 §V.3).
 * Contains pre-computed data that validators need but don't own.
 */
export interface ValidationContext {
  /** All existing item IDs (for duplicate detection). */
  knownIds: Set<string>;
  /** All existing stems (normalized, for duplicate detection). */
  knownStems: string[];
  /** Target purpose for this validation run. */
  purpose: ItemPurpose;
  /** Whether this is a negative test corpus run (MASTER_BANK). */
  isNegativeCorpus?: boolean;
}
