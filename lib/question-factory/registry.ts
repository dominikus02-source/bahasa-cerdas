/**
 * Question Factory V2 — Reason-Code Registry (P3.3 §3).
 *
 * Exhaustive list of machine-readable validation reason codes.
 * Every ValidationFinding.reasonCode MUST come from this registry.
 * New codes require updating this file + test suite.
 *
 * Section references (P3.3 §3):
 *   40+ hard-fail conditions mapped to codes.
 *   No arithmetic override, no semantic fuzz, no AI-based classification.
 */

import type { Severity } from "./types";

/** Registered reason code with metadata. */
export interface ReasonCodeEntry {
  /** Machine-readable code (UPPER_SNAKE_CASE). */
  code: string;
  /** Human-readable label. */
  label: string;
  /** Pipeline stage (0–14, or -1 for pre-check). */
  stage: number;
  /** Severity classification. */
  severity: Severity;
  /** If true, item cannot advance to next stage. */
  blocking: boolean;
  /** Short description of what triggers this code. */
  description: string;
}

// ─── Structural Codes (Stage 0–2, P3.4 §V.5) ───────────────────────────────

export const REASON_CODES: readonly ReasonCodeEntry[] = [
  // --- Stage 0: Identity & Required Fields ---
  {
    code: "STRUCTURE_MISSING_FIELD",
    label: "Missing required field",
    stage: 0,
    severity: "HARD_FAIL",
    blocking: true,
    description: "A required field (id, stem, type, options, correctAnswer) is missing or empty.",
  },
  {
    code: "STRUCTURE_INVALID_TYPE",
    label: "Invalid field type",
    stage: 0,
    severity: "HARD_FAIL",
    blocking: true,
    description: "A field has an unexpected type (e.g., options is not an array, correctAnswer is not a string).",
  },
  {
    code: "STRUCTURE_EMPTY_STEM",
    label: "Empty stem",
    stage: 0,
    severity: "HARD_FAIL",
    blocking: true,
    description: "The question stem is empty or whitespace-only.",
  },
  {
    code: "STRUCTURE_INVALID_IDENTITY",
    label: "Invalid identity",
    stage: 0,
    severity: "HARD_FAIL",
    blocking: true,
    description: "Item id is missing, empty, or not a string.",
  },
  {
    code: "STRUCTURE_INVALID_SOURCE",
    label: "Invalid source",
    stage: 0,
    severity: "HARD_FAIL",
    blocking: true,
    description: "Item source is not a recognized ItemSource value.",
  },

  // --- Stage 1: Type & Response Model ---
  {
    code: "STRUCTURE_UNSUPPORTED_TYPE",
    label: "Unsupported question type",
    stage: 1,
    severity: "HARD_FAIL",
    blocking: true,
    description: "questionType is not PILIHAN_GANDA, BENAR_SALAH, or ISIAN_SINGKAT.",
  },
  {
    code: "STRUCTURE_OPTIONS_NOT_ARRAY",
    label: "Options not an array",
    stage: 1,
    severity: "HARD_FAIL",
    blocking: true,
    description: "options field is not an array.",
  },
  {
    code: "STRUCTURE_INVALID_OPTION_COUNT",
    label: "Invalid option count",
    stage: 1,
    severity: "HARD_FAIL",
    blocking: true,
    description: "PG requires exactly 4 options; BENAR_SALAH requires exactly 2.",
  },
  {
    code: "STRUCTURE_EMPTY_OPTION",
    label: "Empty option",
    stage: 1,
    severity: "HARD_FAIL",
    blocking: true,
    description: "One or more options are empty or whitespace-only.",
  },
  {
    code: "STRUCTURE_BS_SHAPE_INVALID",
    label: "BENAR_SALAH shape invalid",
    stage: 1,
    severity: "HARD_FAIL",
    blocking: true,
    description: "BENAR_SALAH options are not exactly ['Benar', 'Salah'].",
  },
  {
    code: "STRUCTURE_ISIAN_HAS_OPTIONS",
    label: "ISIAN_SINGKAT has options",
    stage: 1,
    severity: "HARD_FAIL",
    blocking: true,
    description: "ISIAN_SINGKAT question has non-empty options array.",
  },
  {
    code: "STRUCTURE_STIMULUS_MISSING",
    label: "Stimulus missing",
    stage: 1,
    severity: "HARD_FAIL",
    blocking: true,
    description: "Stimulus-based question (reading passage) has no stimulusContent.",
  },
  {
    code: "STRUCTURE_INVALID_TAXONOMY",
    label: "Invalid taxonomy references",
    stage: 1,
    severity: "HARD_FAIL",
    blocking: true,
    description: "skill/subskill/difficulty references are invalid or inconsistent.",
  },

  // --- Stage 2: Content Quality & Template Detection ---
  {
    code: "TEMPLATE_STEM_DETECTED",
    label: "Template stem detected",
    stage: 2,
    severity: "HARD_FAIL",
    blocking: true,
    description: "Stem matches known template pattern (e.g., 'Berikut ini yang termasuk contoh...').",
  },
  {
    code: "CONTENT_STEM_TOO_SHORT",
    label: "Stem too short",
    stage: 2,
    severity: "SOFT_FAIL",
    blocking: false,
    description: "Stem is shorter than minimum character threshold.",
  },
  {
    code: "CONTENT_EXPLANATION_MISSING",
    label: "Explanation missing",
    stage: 2,
    severity: "SOFT_FAIL",
    blocking: false,
    description: "Explanation field is empty or missing.",
  },

  // --- Stage 3: Answer-Key & Security (P3.3 §6, §7) ---
  {
    code: "ANSWER_KEY_MISSING",
    label: "Answer key missing",
    stage: 3,
    severity: "HARD_FAIL",
    blocking: true,
    description: "correctAnswer is empty or missing for a question that requires one.",
  },
  {
    code: "ANSWER_KEY_INVALID_INDEX",
    label: "Answer key invalid index",
    stage: 3,
    severity: "HARD_FAIL",
    blocking: true,
    description: "correctAnswer is not a valid index into the options array.",
  },
  {
    code: "MULTIPLE_DEFENSIBLE_ANSWERS",
    label: "Multiple defensible answers",
    stage: 3,
    severity: "HARD_FAIL",
    blocking: true,
    description: "Two or more options could be defensibly correct.",
  },
  {
    code: "ANSWER_KEY_CONTRADICTION",
    label: "Answer key contradicts explanation",
    stage: 3,
    severity: "HARD_FAIL",
    blocking: true,
    description: "The explanation contradicts the stated correct answer.",
  },
  {
    code: "SECURITY_LEAK",
    label: "Answer key leakage in stem",
    stage: 3,
    severity: "HARD_FAIL",
    blocking: true,
    description: "The correct answer text appears verbatim in the question stem.",
  },
  {
    code: "SECURITY_LEAK_METADATA",
    label: "Metadata leakage",
    stage: 3,
    severity: "HARD_FAIL",
    blocking: true,
    description: "Internal metadata (D10, misconception, provenance) detected in student-facing content.",
  },
  {
    code: "KEY_IN_STEM",
    label: "Answer key in stem",
    stage: 3,
    severity: "HARD_FAIL",
    blocking: true,
    description: "The correct answer option text appears verbatim in the question stem.",
  },

  // --- Stage 4: Purpose Gate (P3.3 §8) ---
  {
    code: "PURPOSE_GATE_FAILED",
    label: "Purpose gate failed",
    stage: 4,
    severity: "HARD_FAIL",
    blocking: true,
    description: "D10 state does not meet the minimum required for the item's purpose.",
  },
  {
    code: "D10_INVALID_TRANSITION",
    label: "D10 invalid transition",
    stage: 4,
    severity: "HARD_FAIL",
    blocking: true,
    description: "Proposed D10 state transition is not allowed by the monotonic D10 model.",
  },

  // --- Stage 5: Duplicate Detection (P3.3 §17) ---
  {
    code: "DUPLICATE_EXACT",
    label: "Exact duplicate",
    stage: 5,
    severity: "HARD_FAIL",
    blocking: true,
    description: "An item with the same normalized stem already exists.",
  },
  {
    code: "DUPLICATE_NORMALIZED",
    label: "Normalized text duplicate",
    stage: 5,
    severity: "SOFT_FAIL",
    blocking: false,
    description: "An item with a highly similar normalized stem exists.",
  },
  {
    code: "DUPLICATE_ID",
    label: "Duplicate ID",
    stage: 5,
    severity: "HARD_FAIL",
    blocking: true,
    description: "An item with the same ID already exists in the bank.",
  },

  // --- Stage 6: State-Transition Guard (P3.3 §8) ---
  {
    code: "STATE_TRANSITION_INVALID",
    label: "Invalid state transition",
    stage: 6,
    severity: "HARD_FAIL",
    blocking: true,
    description: "The proposed review-state transition is not allowed by the state machine.",
  },
  {
    code: "AI_SELF_APPROVAL",
    label: "AI self-approval attempt",
    stage: 6,
    severity: "HARD_FAIL",
    blocking: true,
    description: "AI attempted to approve its own output — prohibited.",
  },

  // --- Stage 7: Delivery Safety (P3.3 §14) ---
  {
    code: "DELIVERY_UNSAFE_FIELDS",
    label: "Unsafe fields in delivery object",
    stage: 7,
    severity: "HARD_FAIL",
    blocking: true,
    description: "Internal fields detected in the student-facing delivery object.",
  },

  // --- Stage 10: Cognitive Label (V10, P3.5C) ---
  {
    code: "COGNITIVE_LABEL_MISSING",
    label: "Cognitive label missing",
    stage: 10,
    severity: "SOFT_FAIL",
    blocking: false,
    description: "No cognitiveTarget declared in taxonomy. Cannot validate cognitive alignment.",
  },
  {
    code: "COGNITIVE_LABEL_MISMATCH",
    label: "Cognitive label mismatch",
    stage: 10,
    severity: "SOFT_FAIL",
    blocking: false,
    description: "Declared cognitive level differs from inferred actual task operation by ≥2 levels.",
  },
  {
    code: "COGNITIVE_LABEL_INSUFFICIENT_EVIDENCE",
    label: "Cognitive label insufficient evidence",
    stage: 10,
    severity: "ADVISORY",
    blocking: false,
    description: "Insufficient deterministic evidence to infer cognitive level. Human review recommended.",
  },

  // --- Stage 11: Distractor Quality (V11, P3.5C) ---
  {
    code: "DISTRACTOR_NEAR_DUPLICATE",
    label: "Distractor near-duplicate",
    stage: 11,
    severity: "SOFT_FAIL",
    blocking: false,
    description: "Two or more distractors are near-duplicates (high token Jaccard or Levenshtein similarity).",
  },
  {
    code: "DISTRACTOR_NEAR_ANSWER",
    label: "Distractor near correct answer",
    stage: 11,
    severity: "SOFT_FAIL",
    blocking: false,
    description: "A distractor is near-identical to the correct answer (Levenshtein ≥ 0.85).",
  },
  {
    code: "DISTRACTOR_LENGTH_OUTLIER",
    label: "Distractor length outlier",
    stage: 11,
    severity: "SOFT_FAIL",
    blocking: false,
    description: "A distractor has anomalous length compared to the median option length.",
  },
  {
    code: "DISTRACTOR_PARALLELISM_BREAK",
    label: "Distractor parallelism break",
    stage: 11,
    severity: "SOFT_FAIL",
    blocking: false,
    description: "A distractor breaks grammatical parallelism with the other options.",
  },
  {
    code: "DISTRACTOR_SUBSET_OF_ANSWER",
    label: "Distractor is subset of answer",
    stage: 11,
    severity: "SOFT_FAIL",
    blocking: false,
    description: "Distractor tokens are predominantly contained in the correct answer — may be answer-derived.",
  },

  // --- Advisory / Informational ---
  {
    code: "ADVISORY_MEAN_LOW",
    label: "Mean quality score below threshold",
    stage: 14,
    severity: "ADVISORY",
    blocking: false,
    description: "Mean quality score is below the Silver tier threshold (advisory only).",
  },
  {
    code: "ADVISORY_CALIBRATION_PENDING",
    label: "Calibration pending",
    stage: 14,
    severity: "ADVISORY",
    blocking: false,
    description: "Item has fewer than 30 responses — calibration data insufficient.",
  },
] as const;

// ─── Lookup helpers ──────────────────────────────────────────────────────────

const CODE_MAP = new Map<string, ReasonCodeEntry>(
  REASON_CODES.map((entry) => [entry.code, entry])
);

/** Get a reason code entry by code. Returns undefined if not found. */
export function getReasonCode(code: string): ReasonCodeEntry | undefined {
  return CODE_MAP.get(code);
}

/** Get all reason codes for a specific stage. */
export function getReasonCodesForStage(stage: number): ReasonCodeEntry[] {
  return REASON_CODES.filter((entry) => entry.stage === stage);
}

/** Get all blocking reason codes. */
export function getBlockingReasonCodes(): ReasonCodeEntry[] {
  return REASON_CODES.filter((entry) => entry.blocking);
}

/** Check if a code is valid (exists in registry). */
export function isValidReasonCode(code: string): boolean {
  return CODE_MAP.has(code);
}
