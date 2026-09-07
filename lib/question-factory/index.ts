/**
 * Question Factory V2 — Barrel Export.
 *
 * Central entry point for the deterministic validation foundation (P3.5A).
 * Validators, types, and helpers are re-exported from here.
 */

// ─── Types & Contracts ───────────────────────────────────────────────────────
export type {
  CanonicalItem,
  CalibrationLevel,
  D10State,
  ItemContent,
  ItemIdentity,
  ItemPurpose,
  ItemPurposeFields,
  ItemProvenance,
  ItemResponseModel,
  ItemReviewState,
  ItemSource,
  ItemTaxonomy,
  Severity,
  ValidationContext,
  ValidationFinding,
  ValidationResult,
} from "./types";

export {
  D10_TRANSITIONS,
  INTERNAL_FIELDS,
  PURPOSE_D10_MIN,
  VALID_TRANSITIONS,
} from "./types";

// ─── Reason-Code Registry ────────────────────────────────────────────────────
export {
  REASON_CODES,
  getBlockingReasonCodes,
  getReasonCode,
  getReasonCodesForStage,
  isValidReasonCode,
} from "./registry";
export type { ReasonCodeEntry } from "./registry";

// ─── Validator Interface ─────────────────────────────────────────────────────
export {
  aggregateFindings,
  runPipeline,
  runValidator,
} from "./interface";
export type { Validator } from "./interface";

// Re-import Validator type for internal use
import type { Validator } from "./interface";

// ─── Validators ──────────────────────────────────────────────────────────────
import { structuralValidator as _structuralValidator } from "./structural";
import { answerKeyValidator as _answerKeyValidator } from "./answer-key";
import { securityValidator as _securityValidator } from "./security";
import { purposeGateValidator as _purposeGateValidator } from "./purpose-gate";
import { duplicateDetector as _duplicateDetector } from "./duplicates";
import { stateGuardValidator as _stateGuardValidator } from "./state-guard";
import { cognitiveLabelValidator as _cognitiveLabelValidator } from "./cognitive-label";
import { distractorQualityValidator as _distractorQualityValidator } from "./distractor-quality";

export const structuralValidator = _structuralValidator;
export const answerKeyValidator = _answerKeyValidator;
export const securityValidator = _securityValidator;
export const purposeGateValidator = _purposeGateValidator;
export const duplicateDetector = _duplicateDetector;
export const stateGuardValidator = _stateGuardValidator;
export const cognitiveLabelValidator = _cognitiveLabelValidator;
export const distractorQualityValidator = _distractorQualityValidator;

// ─── Aggregation & Gate ──────────────────────────────────────────────────────
export {
  aggregateAllValidators,
  formatGateSummary,
  getAdvisoryIssues,
  getBlockingIssues,
  makeGateDecision,
} from "./aggregate";
export type { GateDecision } from "./aggregate";

// ─── State-Transition Helpers ────────────────────────────────────────────────
export { validateStateTransition } from "./state-guard";

// ─── Validation Pipeline ─────────────────────────────────────────────────────
export const DEFAULT_PIPELINE: readonly Validator[] = [
  // Stage 0–2: Structural (identity, type, content, taxonomy)
  // Note: structuralValidator handles stages 0, 1, 2 internally
  _structuralValidator,
  // Stage 3: Answer key + security (answer key check + leakage check)
  _answerKeyValidator,
  _securityValidator,
  // Stage 4: Purpose gate (D10 vs purpose)
  _purposeGateValidator,
  // Stage 5: Duplicate detection
  _duplicateDetector,
  // Stage 6: State-transition guard (static only)
  _stateGuardValidator,
  // Stage 10: Cognitive label alignment (V10, P3.5C)
  _cognitiveLabelValidator,
  // Stage 11: Distractor quality (V11, P3.5C)
  _distractorQualityValidator,
] as const;
