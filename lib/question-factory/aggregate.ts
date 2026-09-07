/**
 * Question Factory V2 — Aggregation Engine (P3.4 §V.10).
 *
 * Combines all validator results into a single gate decision.
 * Publish contract is CONJUNCTIVE (P3.3 §8, §13):
 *   All blockers must pass; any single HARD_FAIL blocks publication.
 *
 * Section references:
 *   P3.4 §V.10  — Aggregation engine specification
 *   P3.3 §8     — Publish contract (S2 principle)
 *   P3.3 §13    — Publish gates
 */

import type {
  CanonicalItem,
  ValidationContext,
  ValidationFinding,
  ValidationResult,
} from "./types";
import type { Validator } from "./interface";
import { aggregateFindings, runPipeline } from "./interface";

/** Gate decision for an item. */
export interface GateDecision {
  /** True if item passes ALL gates. */
  passed: boolean;
  /** True if item can proceed to next stage. */
  canAdvance: boolean;
  /** True if item is blocked. */
  blocked: boolean;
  /** Aggregate validation result. */
  result: ValidationResult;
  /** Whether the item is eligible for publication. */
  publishEligible: boolean;
  /** Issues that must be resolved before publication. */
  blockers: string[];
  /** Advisory items that are not blocking. */
  advisories: string[];
}

/**
 * Run all validators and produce a gate decision.
 *
 * @param validators  The full validator pipeline (in stage order).
 * @param item        The canonical item to validate.
 * @param ctx         Validation context.
 * @returns           Gate decision with all findings.
 */
export function aggregateAllValidators(
  validators: Validator[],
  item: CanonicalItem,
  ctx: ValidationContext
): GateDecision {
  const result = runPipeline(validators, item, ctx);
  return makeGateDecision(result);
}

/**
 * Produce a gate decision from an existing ValidationResult.
 * Useful for re-checking after fixing issues.
 */
export function makeGateDecision(result: ValidationResult): GateDecision {
  const blockers: string[] = [];
  const advisories: string[] = [];

  for (const finding of result.findings) {
    if (finding.status === "FAIL" && finding.severity === "HARD_FAIL") {
      blockers.push(finding.reasonCode);
    }
    if (finding.status === "ADVISORY") {
      advisories.push(finding.reasonCode);
    }
  }

  const blocked = blockers.length > 0;
  const passed = !blocked;
  const publishEligible = passed && result.summary.hardFails === 0;

  return {
    passed,
    canAdvance: !blocked,
    blocked,
    result,
    publishEligible,
    blockers,
    advisories,
  };
}

/**
 * Helper: Get all blocking issues from a gate decision.
 */
export function getBlockingIssues(decision: GateDecision): ValidationFinding[] {
  return decision.result.findings.filter(
    (f) => f.status === "FAIL" && f.severity === "HARD_FAIL"
  );
}

/**
 * Helper: Get all advisory issues from a gate decision.
 */
export function getAdvisoryIssues(decision: GateDecision): ValidationFinding[] {
  return decision.result.findings.filter((f) => f.severity === "ADVISORY");
}

/**
 * Helper: Format gate decision as human-readable summary.
 */
export function formatGateSummary(decision: GateDecision): string {
  const s = decision.result.summary;
  const lines = [
    `Gate Decision: ${decision.passed ? "PASS" : "BLOCKED"}`,
    `  Hard Fails: ${s.hardFails}`,
    `  Soft Fails: ${s.softFails}`,
    `  Advisories: ${s.advisories}`,
    `  Passes: ${s.passes}`,
  ];

  if (decision.blockers.length > 0) {
    lines.push(`  Blockers: ${decision.blockers.join(", ")}`);
  }
  if (decision.advisories.length > 0) {
    lines.push(`  Advisories: ${decision.advisories.join(", ")}`);
  }

  return lines.join("\n");
}
