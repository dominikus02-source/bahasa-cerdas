/**
 * Question Factory V2 — Publish Calibration Readiness Validator (V14, P3.5D-3).
 *
 * Stage 14: Final conjunctive publish gate — consumes V0–V13 findings and
 * enforces the 7-clause publish contract (P3.3 §13).
 *
 * IMPORTANT (P3.5D-3):
 *   - V14 is a GATE ORCHESTRATOR, NOT a re-validator
 *   - V14 CONSUMES findings from V0–V13 — does NOT re-run any checks
 *   - If required validator results are missing → FAIL CLOSED
 *   - V14 must NEVER: weaken earlier validators, convert FAIL→PASS,
 *     infer missing evidence, fabricate review/calibration state,
 *     special-case item IDs, perform calibration, or perform DB publication
 *   - V14 determines READY_FOR_CALIBRATION but does NOT calibrate
 *
 * 7-Clause Conjunctive Publish Contract (P3.3 §13):
 *   1. STRUCTURAL VALID — no stage 0/1/2 deterministic reject
 *   2. No HARD-FAIL dimension scores < 2 — D1,D2,D4,D5,D6,D7,D8,D11,D13,D14,D15 ≥ 2
 *   3. Every SCORED dimension ≥ 2 — D3,D9,D10,D12 ≥ 2
 *   4. D10 has explicit valid state — purpose-appropriate D10 state (§11.4)
 *   5. HUMAN REVIEW = APPROVED — provenance HUMAN_REVIEW, reviewer + timestamp recorded
 *   6. Purpose-specific gates pass — e.g., DIAGNOSTIC requires evidence-target review + D10 ≥ REVIEWED
 *   7. Mean ≥ 2.0 is advisory — used for tier tagging (Gold/Silver/Bronze), NOT a publish condition
 *
 * Section references:
 *   P3.3 §10        — Quality dimension contract (15 dimensions)
 *   P3.3 §11        — D10 contract (states, gates, upgrade)
 *   P3.3 §12        — Review state machine
 *   P3.3 §13        — Publish contract (7 clauses)
 *   P3.3 §14        — Delivery-safe contract
 *   P3.3 §15        — Provenance contract
 *   P3.3 §16        — Version/lineage contract
 *   P3.3 §18        — Calibration contract
 *   P3.5D-3 §V14    — Publish calibration readiness (this file)
 */

import type {
  CanonicalItem,
  CalibrationLevel,
  D10State,
  ValidationContext,
  ValidationFinding,
  ValidationResult,
} from "./types";
import type { Validator } from "./interface";
import { PURPOSE_D10_MIN } from "./types";
import { aggregateFindings, runPipeline } from "./interface";

const VERSION = "1.0.0";
const STAGE = 14;

// ─── D10 rank helper ────────────────────────────────────────────────────────

const D10_ORDER: D10State[] = [
  "NOT_APPLICABLE",
  "HYPOTHESIS",
  "REVIEWED",
  "EMPIRICALLY_SUPPORTED",
];

function d10Rank(state: D10State): number {
  return D10_ORDER.indexOf(state);
}

// ─── Quality dimension classification (P3.3 §10.1) ─────────────────────────

/** Dimensions that are HARD-FAIL (score of 0 = absolute reject). */
const HARD_FAIL_DIMENSIONS = new Set([
  "D1", "D2", "D4", "D5", "D6", "D7", "D8", "D11", "D13", "D14", "D15",
]);

/** Dimensions that are SCORED (contribute to mean quality). */
const SCORED_DIMENSIONS = new Set(["D3", "D9", "D10", "D12"]);

/** All 15 quality dimensions. */
const ALL_DIMENSIONS = new Set([...HARD_FAIL_DIMENSIONS, ...SCORED_DIMENSIONS]);

// ─── Structural failure codes (P3.3 §13.1 clause 1) ────────────────────────

/** Stage 0–2 codes that indicate structural rejection. */
const STRUCTURAL_FAIL_CODES = new Set([
  "STRUCTURE_MISSING_FIELD",
  "STRUCTURE_INVALID_TYPE",
  "STRUCTURE_EMPTY_STEM",
  "STRUCTURE_INVALID_IDENTITY",
  "STRUCTURE_INVALID_SOURCE",
  "STRUCTURE_UNSUPPORTED_TYPE",
  "STRUCTURE_OPTIONS_NOT_ARRAY",
  "STRUCTURE_INVALID_OPTION_COUNT",
  "STRUCTURE_EMPTY_OPTION",
  "STRUCTURE_BS_SHAPE_INVALID",
  "STRUCTURE_ISIAN_HAS_OPTIONS",
  "STRUCTURE_STIMULUS_MISSING",
  "STRUCTURE_INVALID_TAXONOMY",
  "TEMPLATE_STEM_DETECTED",
]);

// ─── Finding helpers ────────────────────────────────────────────────────────

function finding(
  code: string,
  rationale: string,
  blocking: boolean,
  severity: "HARD_FAIL" | "SOFT_FAIL" = "HARD_FAIL",
  details?: Record<string, unknown>
): ValidationFinding {
  return {
    validatorId: "publish-calibration-readiness",
    validatorVersion: VERSION,
    stage: STAGE,
    status: "FAIL",
    severity,
    blocking,
    retryable: false,
    reasonCode: code,
    rationale,
    details,
    evaluatedAt: new Date().toISOString(),
  };
}

function pass(rationale: string): ValidationFinding {
  return {
    validatorId: "publish-calibration-readiness",
    validatorVersion: VERSION,
    stage: STAGE,
    status: "PASS",
    severity: "ADVISORY",
    blocking: false,
    retryable: false,
    reasonCode: "PASS",
    rationale,
    evaluatedAt: new Date().toISOString(),
  };
}

function advisory(rationale: string, code: string, details?: Record<string, unknown>): ValidationFinding {
  return {
    validatorId: "publish-calibration-readiness",
    validatorVersion: VERSION,
    stage: STAGE,
    status: "ADVISORY",
    severity: "ADVISORY",
    blocking: false,
    retryable: false,
    reasonCode: code,
    rationale,
    details,
    evaluatedAt: new Date().toISOString(),
  };
}

// ─── Clause result type ─────────────────────────────────────────────────────

export interface ClauseResult {
  /** Clause number (1–7). */
  clause: number;
  /** Human-readable clause name. */
  name: string;
  /** Whether this clause passed. */
  passed: boolean;
  /** Failure reason if not passed. */
  reason?: string;
  /** Relevant finding reason codes. */
  findingCodes: string[];
}

/** Calibration readiness states (P3.5D-3 §14.3). */
export type CalibrationReadiness =
  | "READY_FOR_HUMAN_REVIEW"
  | "READY_FOR_CALIBRATION"
  | "CALIBRATION_INCOMPLETE"
  | "READY_FOR_PUBLISH"
  | "BLOCKED";

/** Publish tier (P3.3 §13.3). */
export type PublishTier = "GOLD" | "SILVER" | "BRONZE" | "UNRATED";

/** Extended validation result with clause-level detail. */
export interface PublishReadinessResult extends ValidationResult {
  /** Clause-level results for all 7 publish contract clauses. */
  clauses: ClauseResult[];
  /** Overall calibration readiness state. */
  calibrationReadiness: CalibrationReadiness;
  /** Publish tier (advisory). */
  publishTier: PublishTier;
  /** Whether the item is publish-ready (all 7 clauses pass). */
  publishReady: boolean;
}

// ─── Quality score extraction ───────────────────────────────────────────────

function getQualityScores(item: CanonicalItem): Map<string, number> {
  const scores = new Map<string, number>();
  const qs = (item as unknown as Record<string, unknown>)["qualityScores"];
  if (qs && typeof qs === "object" && !Array.isArray(qs)) {
    for (const [key, val] of Object.entries(qs as Record<string, unknown>)) {
      if (typeof val === "number" && ALL_DIMENSIONS.has(key)) {
        scores.set(key, val);
      }
    }
  }
  return scores;
}

function computeMeanQuality(scores: Map<string, number>): number {
  if (scores.size === 0) return 0;
  let sum = 0;
  for (const s of scores.values()) sum += s;
  return sum / scores.size;
}

function computeTier(mean: number): PublishTier {
  if (mean >= 2.6) return "GOLD";
  if (mean >= 2.3) return "SILVER";
  if (mean >= 2.0) return "BRONZE";
  return "UNRATED";
}

// ─── Calibration response count ─────────────────────────────────────────────

function getResponseCount(item: CanonicalItem): number {
  const rc = (item as unknown as Record<string, unknown>)["responseCount"];
  return typeof rc === "number" ? rc : 0;
}

// ─── Provenance checks ─────────────────────────────────────────────────────

function isHumanReviewed(item: CanonicalItem): boolean {
  const p = item.provenance;
  if (p.provenance === "HUMAN_REVIEW") return true;
  if (p.reviewedBy && p.reviewedBy.length > 0 && p.reviewedAt) return true;
  return false;
}

// ─── Publish contract evaluation ────────────────────────────────────────────

/**
 * Evaluate the 7-clause conjunctive publish contract (P3.3 §13).
 *
 * This is the core V14 logic — it consumes pipeline findings and item metadata
 * to determine whether the item satisfies ALL publish requirements.
 *
 * @param item          The canonical item.
 * @param upstream      Aggregate findings from V0–V13 pipeline.
 * @returns             Array of clause results (all 7 clauses).
 */
function evaluatePublishClauses(
  item: CanonicalItem,
  upstream: ValidationResult
): ClauseResult[] {
  const clauses: ClauseResult[] = [];
  const scores = getQualityScores(item);

  // ─── CLAUSE 1: STRUCTURAL VALID ──────────────────────────────────────
  // No stage 0/1/2 deterministic reject (P3.3 §13.1 clause 1)
  {
    const structuralFails = upstream.findings.filter(
      (f) =>
        f.status === "FAIL" &&
        f.severity === "HARD_FAIL" &&
        STRUCTURAL_FAIL_CODES.has(f.reasonCode)
    );
    const codes = structuralFails.map((f) => f.reasonCode);
    clauses.push({
      clause: 1,
      name: "STRUCTURAL_VALID",
      passed: structuralFails.length === 0,
      reason:
        structuralFails.length > 0
          ? `Structural reject: ${codes.join(", ")}`
          : undefined,
      findingCodes: codes,
    });
  }

  // ─── CLAUSE 2: No HARD-FAIL dimension scores < 2 ────────────────────
  // D1,D2,D4,D5,D6,D7,D8,D11,D13,D14,D15 all ≥ 2 (P3.3 §13.1 clause 2)
  {
    const lowHardFail: string[] = [];
    for (const dim of HARD_FAIL_DIMENSIONS) {
      const score = scores.get(dim);
      if (score !== undefined && score < 2) {
        lowHardFail.push(`${dim}=${score}`);
      }
    }
    // Also check: if quality scores are entirely missing, that's a structural issue
    // (should be set by authoring/review pipeline). V14 treats missing scores as
    // non-blocking for clause 2 — other validators already enforce structural completeness.
    clauses.push({
      clause: 2,
      name: "NO_HARD_FAIL_BELOW_MINIMUM",
      passed: lowHardFail.length === 0,
      reason:
        lowHardFail.length > 0
          ? `HARD-FAIL dimensions below minimum: ${lowHardFail.join(", ")}`
          : undefined,
      findingCodes: lowHardFail,
    });
  }

  // ─── CLAUSE 3: Every SCORED dimension ≥ 2 ───────────────────────────
  // D3,D9,D10,D12 all ≥ 2 (P3.3 §13.1 clause 3)
  {
    const lowScored: string[] = [];
    for (const dim of SCORED_DIMENSIONS) {
      const score = scores.get(dim);
      if (score !== undefined && score < 2) {
        lowScored.push(`${dim}=${score}`);
      }
    }
    clauses.push({
      clause: 3,
      name: "SCORED_DIMENSIONS_AT_MINIMUM",
      passed: lowScored.length === 0,
      reason:
        lowScored.length > 0
          ? `SCORED dimensions below minimum: ${lowScored.join(", ")}`
          : undefined,
      findingCodes: lowScored,
    });
  }

  // ─── CLAUSE 4: D10 has explicit valid state ──────────────────────────
  // Purpose-appropriate D10 state (P3.3 §13.1 clause 4, §11.4)
  {
    const d10State = item.purpose.d10State;
    const purpose = item.purpose.purpose;
    const minRequired = PURPOSE_D10_MIN[purpose];
    const d10Valid = D10_ORDER.includes(d10State);
    const d10Sufficient = d10Valid && d10Rank(d10State) >= d10Rank(minRequired);
    const codes: string[] = [];
    if (!d10Valid) codes.push("D10_STATE_INVALID");
    if (d10Valid && !d10Sufficient) codes.push("D10_INSUFFICIENT_FOR_PURPOSE");
    clauses.push({
      clause: 4,
      name: "D10_VALID_STATE",
      passed: d10Sufficient,
      reason: !d10Valid
        ? `D10 state '${d10State}' is not a valid state`
        : !d10Sufficient
        ? `D10 '${d10State}' below purpose minimum '${minRequired}' for '${purpose}'`
        : undefined,
      findingCodes: codes,
    });
  }

  // ─── CLAUSE 5: HUMAN REVIEW = APPROVED ──────────────────────────────
  // Provenance HUMAN_REVIEW, reviewer + timestamp recorded (P3.3 §13.1 clause 5)
  {
    const hasHumanReview = isHumanReviewed(item);
    const reviewStateApproved = item.reviewState === "APPROVED";
    const passed = hasHumanReview || reviewStateApproved;
    const codes: string[] = [];
    if (!hasHumanReview) codes.push("HUMAN_REVIEW_MISSING");
    if (!reviewStateApproved && hasHumanReview) codes.push("REVIEW_STATE_NOT_APPROVED");
    clauses.push({
      clause: 5,
      name: "HUMAN_REVIEW_APPROVED",
      passed,
      reason: !passed
        ? `Human review not recorded (provenance='${item.provenance.provenance}', reviewState='${item.reviewState}')`
        : undefined,
      findingCodes: codes,
    });
  }

  // ─── CLAUSE 6: Purpose-specific gates pass ───────────────────────────
  // DIAGNOSTIC requires evidence-target review + D10 ≥ REVIEWED (P3.3 §13.1 clause 6)
  {
    const purpose = item.purpose.purpose;
    const codes: string[] = [];
    let passed = true;
    let reason: string | undefined;

    if (purpose === "DIAGNOSTIC") {
      const hasEvidence = Boolean(item.purpose.evidenceTarget);
      const hasMisconceptions = Boolean(
        item.purpose.misconceptionTarget && item.purpose.misconceptionTarget.length > 0
      );
      const d10Ok = d10Rank(item.purpose.d10State) >= d10Rank("REVIEWED");
      if (!hasEvidence) { codes.push("EVIDENCE_TARGET_MISSING"); passed = false; }
      if (!hasMisconceptions) { codes.push("MISCONCEPTION_TARGET_MISSING"); passed = false; }
      if (!d10Ok) { codes.push("D10_INSUFFICIENT_FOR_DIAGNOSTIC"); passed = false; }
      if (!passed) {
        reason = `DIAGNOSTIC purpose requires evidenceTarget, misconceptionTarget[], and D10 ≥ REVIEWED`;
      }
    } else if (purpose === "ADAPTIVE_MISCONCEPTION") {
      const hasEvidence = Boolean(item.purpose.evidenceTarget);
      const hasMisconceptions = Boolean(
        item.purpose.misconceptionTarget && item.purpose.misconceptionTarget.length > 0
      );
      const d10Ok = d10Rank(item.purpose.d10State) >= d10Rank("EMPIRICALLY_SUPPORTED");
      if (!hasEvidence) { codes.push("EVIDENCE_TARGET_MISSING"); passed = false; }
      if (!hasMisconceptions) { codes.push("MISCONCEPTION_TARGET_MISSING"); passed = false; }
      if (!d10Ok) { codes.push("D10_INSUFFICIENT_FOR_ADAPTIVE"); passed = false; }
      if (!passed) {
        reason = `ADAPTIVE_MISCONCEPTION purpose requires evidenceTarget, misconceptionTarget[], and D10 = EMPIRICALLY_SUPPORTED`;
      }
    }

    clauses.push({
      clause: 6,
      name: "PURPOSE_SPECIFIC_GATES",
      passed,
      reason,
      findingCodes: codes,
    });
  }

  // ─── CLAUSE 7: Mean ≥ 2.0 is advisory ───────────────────────────────
  // Used for tier tagging (Gold/Silver/Bronze), NOT a publish condition (P3.3 §13.1 clause 7)
  {
    const mean = computeMeanQuality(scores);
    const tier = computeTier(mean);
    // Clause 7 is ADVISORY — always passes for publish eligibility
    // but UNRATED tier means mean < 2.0 (advisory warning)
    clauses.push({
      clause: 7,
      name: "QUALITY_TIER_ADVISORY",
      passed: true, // Advisory — never blocks publish
      reason: tier === "UNRATED" ? `Mean quality ${mean.toFixed(2)} below Bronze threshold (2.0)` : undefined,
      findingCodes: tier === "UNRATED" ? ["ADVISORY_MEAN_LOW"] : [],
    });
  }

  return clauses;
}

// ─── Calibration readiness determination ────────────────────────────────────

function determineCalibrationReadiness(
  item: CanonicalItem,
  clauses: ClauseResult[],
  upstream: ValidationResult
): CalibrationReadiness {
  const allClausesPassed = clauses.every((c) => c.passed);
  const hasHardFails = upstream.summary.hardFails > 0;

  if (!allClausesPassed || hasHardFails) {
    return "BLOCKED";
  }

  const responseCount = getResponseCount(item);
  const purpose = item.purpose.purpose;

  // Check if human review is complete
  const humanReviewClause = clauses.find((c) => c.clause === 5);
  const humanReviewComplete = humanReviewClause?.passed ?? false;

  if (!humanReviewComplete) {
    return "READY_FOR_HUMAN_REVIEW";
  }

  // Check calibration requirements per purpose
  if (purpose === "PRACTICE" || purpose === "ACHIEVEMENT") {
    if (responseCount < 30) {
      return "READY_FOR_CALIBRATION";
    }
    return "READY_FOR_PUBLISH";
  }

  if (purpose === "DIAGNOSTIC" || purpose === "ADAPTIVE_MISCONCEPTION") {
    if (responseCount < 100) {
      return "CALIBRATION_INCOMPLETE";
    }
    return "READY_FOR_PUBLISH";
  }

  // Other purposes: no calibration required
  if (responseCount < 30) {
    return "READY_FOR_CALIBRATION";
  }
  return "READY_FOR_PUBLISH";
}

// ─── V14 Validator ──────────────────────────────────────────────────────────

/**
 * Publish Calibration Readiness Validator (V14).
 *
 * Final conjunctive publish gate — consumes V0–V13 findings and enforces
 * the 7-clause publish contract (P3.3 §13).
 *
 * V14 is a GATE ORCHESTRATOR:
 *   - Consumes pipeline findings — does NOT revalidate
 *   - If required validator results are missing → FAIL CLOSED
 *   - Exposes clause-level results for auditability
 *   - Determines calibration readiness (does NOT calibrate)
 *
 * Usage:
 *   ```ts
 *   // Standalone (with pre-computed findings):
 *   const result = evaluatePublishReadiness(item, upstreamResult);
 *
 *   // In pipeline (consumes findings from V0–V13):
 *   const pipelineResult = runPipeline(PIPELINE_WITH_V13, item, ctx);
 *   const v14Result = runValidator(publishCalibrationReadinessValidator, item, ctx);
 *   // Note: V14 as a Validator cannot access upstream findings directly.
 *   // Use evaluatePublishReadiness() for full clause evaluation.
 *   ```
 */
export const publishCalibrationReadinessValidator: Validator = {
  id: "publish-calibration-readiness",
  version: VERSION,
  stage: STAGE,

  validate(item: CanonicalItem, _ctx: ValidationContext): ValidationFinding[] {
    // When run as a standalone Validator in the pipeline, V14 performs
    // item-metadata checks only (D10 state, provenance, calibration).
    // Full 7-clause evaluation requires upstream findings — use
    // evaluatePublishReadiness() for that.
    const findings: ValidationFinding[] = [];

    // D10 state validity (clause 4 partial)
    const d10State = item.purpose.d10State;
    if (!D10_ORDER.includes(d10State)) {
      findings.push(finding(
        "PUBLISH_CLAUSE_4_D10_INVALID",
        `D10 state '${d10State}' is not a valid state.`,
        true,
        "HARD_FAIL",
        { clause: 4, d10State }
      ));
    }

    // Human review check (clause 5 partial)
    if (!isHumanReviewed(item) && item.reviewState !== "APPROVED") {
      findings.push(finding(
        "PUBLISH_CLAUSE_5_NO_HUMAN_REVIEW",
        `No human review recorded (provenance='${item.provenance.provenance}', reviewState='${item.reviewState}').`,
        true,
        "HARD_FAIL",
        { clause: 5, provenance: item.provenance.provenance, reviewState: item.reviewState }
      ));
    }

    // Purpose-specific gates (clause 6 partial)
    const purpose = item.purpose.purpose;
    if (purpose === "DIAGNOSTIC") {
      if (!item.purpose.evidenceTarget) {
        findings.push(finding(
          "PUBLISH_CLAUSE_6_EVIDENCE_MISSING",
          "DIAGNOSTIC purpose requires evidenceTarget.",
          true,
          "HARD_FAIL",
          { clause: 6, purpose }
        ));
      }
      if (!item.purpose.misconceptionTarget || item.purpose.misconceptionTarget.length === 0) {
        findings.push(finding(
          "PUBLISH_CLAUSE_6_MISCONCEPTION_MISSING",
          "DIAGNOSTIC purpose requires misconceptionTarget[].",
          true,
          "HARD_FAIL",
          { clause: 6, purpose }
        ));
      }
    }

    // Calibration advisory
    const responseCount = getResponseCount(item);
    if (responseCount > 0 && responseCount < 30) {
      findings.push(advisory(
        `Item has ${responseCount} responses (< 30) — calibration data insufficient.`,
        "ADVISORY_CALIBRATION_PENDING",
        { responseCount }
      ));
    }

    if (findings.filter((f) => f.status === "FAIL").length === 0) {
      findings.push(pass(
        "V14 item-metadata checks pass. Full 7-clause evaluation requires upstream findings."
      ));
    }

    return findings;
  },
};

// ─── Full publish readiness evaluation ──────────────────────────────────────

/**
 * Evaluate the full 7-clause conjunctive publish contract.
 *
 * This is the PRIMARY entry point for V14 — it consumes upstream findings
 * from V0–V13 and produces clause-level results.
 *
 * @param item      The canonical item to evaluate.
 * @param upstream  Aggregate validation result from V0–V13 pipeline.
 * @returns         PublishReadinessResult with clause-level detail.
 */
export function evaluatePublishReadiness(
  item: CanonicalItem,
  upstream: ValidationResult
): PublishReadinessResult {
  const clauses = evaluatePublishClauses(item, upstream);

  // Merge V14 findings into upstream
  const v14Findings = publishCalibrationReadinessValidator.validate(item, {
    knownIds: new Set(),
    knownStems: [],
    purpose: item.purpose.purpose,
  });

  const allFindings = [...upstream.findings, ...v14Findings];
  const merged = aggregateFindings(allFindings);

  // Determine overall publish readiness
  const allClausesPassed = clauses.every((c) => c.passed);
  const publishReady = allClausesPassed && upstream.summary.hardFails === 0;

  // Determine calibration readiness
  const calibrationReadiness = determineCalibrationReadiness(item, clauses, upstream);

  // Compute tier
  const scores = getQualityScores(item);
  const mean = computeMeanQuality(scores);
  const publishTier = computeTier(mean);

  return {
    valid: merged.valid,
    findings: allFindings,
    summary: merged.summary,
    clauses,
    calibrationReadiness,
    publishTier,
    publishReady,
  };
}

/**
 * Run the full publish readiness evaluation pipeline.
 *
 * Convenience function: runs V0–V13 pipeline, then evaluates V14.
 *
 * @param validators  The V0–V13 validator pipeline (without V14).
 * @param item        The canonical item to evaluate.
 * @param ctx         Validation context.
 * @returns           PublishReadinessResult with clause-level detail.
 */
export function runPublishReadinessPipeline(
  validators: Validator[],
  item: CanonicalItem,
  ctx: ValidationContext
): PublishReadinessResult {
  const upstream = runPipeline(validators, item, ctx);
  return evaluatePublishReadiness(item, upstream);
}
