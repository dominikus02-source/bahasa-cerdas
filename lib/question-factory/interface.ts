/**
 * Question Factory V2 — Validator Interface (P3.4 §V.4).
 *
 * Every validator implements this interface. Validators are:
 *   - Pure functions (no DB access, no side effects)
 *   - Stateless (all context via ValidationContext)
 *   - Composable (pipeline = sequence of validators)
 *   - Testable in isolation
 *
 * Section references:
 *   P3.4 §V.4  — Validator contract
 *   P3.4 §V.5  — Pipeline stages (V0–V14)
 *   P3.3 §8    — Stage numbering
 */

import type {
  CanonicalItem,
  ValidationContext,
  ValidationFinding,
  ValidationResult,
} from "./types";

/**
 * A single validator that checks one aspect of an item.
 *
 * Validators return an array of findings — they NEVER throw.
 * Each finding includes the validator's identity, stage, and severity.
 */
export interface Validator {
  /** Unique identifier (e.g., "structural", "answer-key", "security"). */
  readonly id: string;
  /** Semantic version (e.g., "1.0.0"). */
  readonly version: string;
  /** Pipeline stage this validator runs at (0–14, or -1 for pre-check). */
  readonly stage: number;

  /**
   * Validate a single item.
   * @param item   The canonical item to validate.
   * @param ctx    Validation context (pre-computed data).
   * @returns      Array of findings (empty = all checks passed).
   */
  validate(item: CanonicalItem, ctx: ValidationContext): ValidationFinding[];
}

/**
 * Run a single validator and wrap results in a ValidationResult.
 */
export function runValidator(
  validator: Validator,
  item: CanonicalItem,
  ctx: ValidationContext
): ValidationResult {
  const findings = validator.validate(item, ctx);
  return aggregateFindings(findings);
}

/**
 * Run a pipeline of validators in order and aggregate all findings.
 * Short-circuit: if any blocking HARD_FAIL is found, subsequent validators
 * in the same stage still run (defense in depth), but the item is marked invalid.
 */
export function runPipeline(
  validators: Validator[],
  item: CanonicalItem,
  ctx: ValidationContext
): ValidationResult {
  const allFindings: ValidationFinding[] = [];

  for (const validator of validators) {
    const findings = validator.validate(item, ctx);
    allFindings.push(...findings);
  }

  return aggregateFindings(allFindings);
}

/**
 * Aggregate an array of findings into a ValidationResult.
 * Exported for testing and the aggregation engine (§10).
 */
export function aggregateFindings(findings: ValidationFinding[]): ValidationResult {
  let hardFails = 0;
  let softFails = 0;
  let advisories = 0;
  let passes = 0;

  for (const f of findings) {
    if (f.status === "FAIL" && f.severity === "HARD_FAIL") hardFails++;
    else if (f.status === "FAIL" && f.severity === "SOFT_FAIL") softFails++;
    else if (f.status === "ADVISORY") advisories++;
    else if (f.status === "PASS") passes++;
  }

  return {
    valid: hardFails === 0,
    findings,
    summary: { hardFails, softFails, advisories, passes },
  };
}
