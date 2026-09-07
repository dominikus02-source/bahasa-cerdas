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

  // --- Stage 12: Duplicate/Similarity (V12, P3.5D-1) ---
  {
    code: "DUPLICATE_NEAR_TEXT",
    label: "Near-text duplicate",
    stage: 12,
    severity: "SOFT_FAIL",
    blocking: false,
    description: "High text similarity detected between items (stem Lev ≥ 0.85 or token Jaccard ≥ 0.75). Requires human review.",
  },
  {
    code: "DUPLICATE_STRUCTURAL",
    label: "Structural duplicate",
    stage: 12,
    severity: "SOFT_FAIL",
    blocking: false,
    description: "Same question type, skill, subskill, cognitive target, and similar stem — may be structurally duplicated.",
  },
  {
    code: "DUPLICATE_CROSS_THEME",
    label: "Cross-theme duplicate",
    stage: 12,
    severity: "SOFT_FAIL",
    blocking: false,
    description: "Same skill and subskill, different topic, but near-identical stem — likely cross-theme duplication.",
  },
  {
    code: "DUPLICATE_OPTION",
    label: "Duplicate option in item",
    stage: 12,
    severity: "HARD_FAIL",
    blocking: true,
    description: "Two or more options within the item are near-duplicates (high Levenshtein or Jaccard similarity).",
  },
  {
    code: "DUPLICATE_SIMILARITY_REVIEW",
    label: "Duplicate similarity review",
    stage: 12,
    severity: "ADVISORY",
    blocking: false,
    description: "Ambiguous similarity detected — not strong enough for FAIL but warrants human review.",
  },

  // --- Stage 13: Difficulty-Cognitive Consistency (V13, P3.5D-2) ---
  {
    code: "DIFFICULTY_COGNITIVE_MISMATCH",
    label: "Difficulty-cognitive mismatch",
    stage: 13,
    severity: "SOFT_FAIL",
    blocking: false,
    description: "Declared difficulty is inconsistent with cognitive demand (e.g., EASY difficulty with R5/R6 cognitive level, or HARD difficulty with R1 cognitive level).",
  },
  {
    code: "DIFFICULTY_DEMAND_TOO_LOW",
    label: "Difficulty demand too low",
    stage: 13,
    severity: "SOFT_FAIL",
    blocking: false,
    description: "Item structural features (stimulus, options, stem) are too simple for declared difficulty level.",
  },
  {
    code: "DIFFICULTY_DEMAND_TOO_HIGH",
    label: "Difficulty demand too high",
    stage: 13,
    severity: "SOFT_FAIL",
    blocking: false,
    description: "Item structural features suggest lower difficulty than declared (e.g., very short stem, trivial content, no stimulus).",
  },
  {
    code: "DIFFICULTY_EVIDENCE_INSUFFICIENT",
    label: "Difficulty evidence insufficient",
    stage: 13,
    severity: "ADVISORY",
    blocking: false,
    description: "Insufficient deterministic evidence to assess difficulty-cognitive consistency. Human review recommended.",
  },
  {
    code: "DIFFICULTY_DISCRIMINATION_LOW",
    label: "Difficulty discrimination low",
    stage: 13,
    severity: "SOFT_FAIL",
    blocking: false,
    description: "Distractors are all trivially wrong for declared difficulty — item lacks discrimination power.",
  },
  {
    code: "DIFFICULTY_STIMULUS_COMPLEXITY_MISMATCH",
    label: "Stimulus complexity mismatch",
    stage: 13,
    severity: "SOFT_FAIL",
    blocking: false,
    description: "Stimulus (reading passage) complexity does not match declared difficulty level.",
  },
  {
    code: "DIFFICULTY_RESPONSE_COMPLEXITY_MISMATCH",
    label: "Response complexity mismatch",
    stage: 13,
    severity: "SOFT_FAIL",
    blocking: false,
    description: "Expected response (correct answer + distractors) complexity does not match declared difficulty level.",
  },
  {
    code: "DIFFICULTY_CALIBRATION_REQUIRED",
    label: "Difficulty calibration required",
    stage: 13,
    severity: "ADVISORY",
    blocking: false,
    description: "Item has fewer than 30 responses — difficulty assignment requires empirical calibration.",
  },

  // --- Stage 14: Publish Calibration Readiness (V14, P3.5D-3) ---
  {
    code: "PUBLISH_CLAUSE_1_STRUCTURAL_REJECT",
    label: "Publish clause 1: structural reject",
    stage: 14,
    severity: "HARD_FAIL",
    blocking: true,
    description: "Upstream pipeline contains a structural rejection finding — clause 1 of the publish contract fails.",
  },
  {
    code: "PUBLISH_CLAUSE_2_HARDFAIL_BELOW_MINIMUM",
    label: "Publish clause 2: HARD-FAIL dimension below minimum",
    stage: 14,
    severity: "HARD_FAIL",
    blocking: true,
    description: "A HARD-FAIL quality dimension (D1,D2,D4,D5,D6,D7,D8,D11,D13,D14,D15) has score < 2.",
  },
  {
    code: "PUBLISH_CLAUSE_3_SCORED_BELOW_MINIMUM",
    label: "Publish clause 3: SCORED dimension below minimum",
    stage: 14,
    severity: "HARD_FAIL",
    blocking: true,
    description: "A SCORED quality dimension (D3,D9,D10,D12) has score < 2.",
  },
  {
    code: "PUBLISH_CLAUSE_4_D10_INVALID",
    label: "Publish clause 4: D10 state invalid",
    stage: 14,
    severity: "HARD_FAIL",
    blocking: true,
    description: "D10 state is not a valid state or does not meet the purpose-appropriate minimum.",
  },
  {
    code: "PUBLISH_CLAUSE_4_D10_INSUFFICIENT",
    label: "Publish clause 4: D10 insufficient for purpose",
    stage: 14,
    severity: "HARD_FAIL",
    blocking: true,
    description: "D10 state does not meet the minimum required for the item's purpose (e.g., DIAGNOSTIC needs ≥ REVIEWED).",
  },
  {
    code: "PUBLISH_CLAUSE_5_NO_HUMAN_REVIEW",
    label: "Publish clause 5: no human review",
    stage: 14,
    severity: "HARD_FAIL",
    blocking: true,
    description: "No human review recorded — provenance is not HUMAN_REVIEW and reviewState is not APPROVED.",
  },
  {
    code: "PUBLISH_CLAUSE_5_REVIEW_STATE_NOT_APPROVED",
    label: "Publish clause 5: review state not approved",
    stage: 14,
    severity: "HARD_FAIL",
    blocking: true,
    description: "Review state is not APPROVED despite having human review provenance.",
  },
  {
    code: "PUBLISH_CLAUSE_6_EVIDENCE_MISSING",
    label: "Publish clause 6: evidence target missing",
    stage: 14,
    severity: "HARD_FAIL",
    blocking: true,
    description: "DIAGNOSTIC or ADAPTIVE_MISCONCEPTION purpose requires evidenceTarget.",
  },
  {
    code: "PUBLISH_CLAUSE_6_MISCONCEPTION_MISSING",
    label: "Publish clause 6: misconception target missing",
    stage: 14,
    severity: "HARD_FAIL",
    blocking: true,
    description: "DIAGNOSTIC or ADAPTIVE_MISCONCEPTION purpose requires misconceptionTarget[].",
  },
  {
    code: "PUBLISH_CLAUSE_6_D10_INSUFFICIENT_FOR_PURPOSE",
    label: "Publish clause 6: D10 insufficient for purpose-specific gate",
    stage: 14,
    severity: "HARD_FAIL",
    blocking: true,
    description: "D10 state does not meet the purpose-specific gate requirement (e.g., DIAGNOSTIC needs ≥ REVIEWED).",
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
