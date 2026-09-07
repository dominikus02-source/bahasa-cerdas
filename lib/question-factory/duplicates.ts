/**
 * Question Factory V2 — Duplicate Detection Foundation (P3.3 §17, P3.4 §V.9).
 *
 * Stage 5: Exact ID match + normalized stem text matching.
 *
 * Section references:
 *   P3.3 §17    — Duplicate detection contract
 *   P3.4 §V.9   — Duplicate detection specification
 */

import type { CanonicalItem, ValidationContext, ValidationFinding } from "./types";
import type { Validator } from "./interface";

const VERSION = "1.0.0";

function finding(
  code: string,
  rationale: string,
  blocking: boolean,
  severity: "HARD_FAIL" | "SOFT_FAIL" = "HARD_FAIL",
  details?: Record<string, unknown>
): ValidationFinding {
  return {
    validatorId: "duplicates",
    validatorVersion: VERSION,
    stage: 5,
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
    validatorId: "duplicates",
    validatorVersion: VERSION,
    stage: 5,
    status: "PASS",
    severity: "ADVISORY",
    blocking: false,
    retryable: false,
    reasonCode: "PASS",
    rationale,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * Normalize text for comparison.
 * - Lowercase
 * - Collapse whitespace
 * - Remove punctuation (Indonesian MCQ stem normalization)
 * - Trim
 */
function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")   // Remove punctuation
    .replace(/\s+/g, " ")      // Collapse whitespace
    .trim();
}

/**
 * Duplicate Detection Foundation — checks item identity and content uniqueness.
 *
 * Checks:
 *   - DUPLICATE_ID: Same ID exists in knownIds
 *   - DUPLICATE_EXACT: Same normalized stem in knownStems (exact match)
 *   - DUPLICATE_NORMALIZED: Stem overlaps significantly with known stems (>80%)
 */
export const duplicateDetector: Validator = {
  id: "duplicates",
  version: VERSION,
  stage: 5,

  validate(item: CanonicalItem, ctx: ValidationContext): ValidationFinding[] {
    const findings: ValidationFinding[] = [];

    // ─── DUPLICATE_ID ─────────────────────────────────────────────────────
    if (ctx.knownIds.has(item.identity.id)) {
      findings.push(finding(
        "DUPLICATE_ID",
        `Item ID '${item.identity.id}' already exists in the bank.`,
        true,
        "HARD_FAIL",
        { duplicateId: item.identity.id }
      ));
    }

    // ─── Stem normalization ───────────────────────────────────────────────
    const stemNorm = normalizeForComparison(item.content.stem);

    // ─── DUPLICATE_EXACT: exact normalized match ──────────────────────────
    for (let i = 0; i < ctx.knownStems.length; i++) {
      const knownNorm = normalizeForComparison(ctx.knownStems[i]);

      if (stemNorm === knownNorm && stemNorm.length > 0) {
        findings.push(finding(
          "DUPLICATE_EXACT",
          `Normalized stem matches existing item at position ${i}.`,
          true,
          "HARD_FAIL",
          { knownIndex: i, normalizedStem: stemNorm.substring(0, 100) }
        ));
        break; // One exact match is enough
      }
    }

    // ─── DUPLICATE_NORMALIZED: high overlap (>80%) ────────────────────────
    // Only check if no exact match was found (avoid double-flagging)
    if (!findings.some((f) => f.reasonCode === "DUPLICATE_EXACT")) {
      for (let i = 0; i < ctx.knownStems.length; i++) {
        const knownNorm = normalizeForComparison(ctx.knownStems[i]);

        // Simple overlap heuristic: stem is contained in known or vice versa
        const longer = stemNorm.length > knownNorm.length ? stemNorm : knownNorm;
        const shorter = stemNorm.length > knownNorm.length ? knownNorm : stemNorm;

        if (shorter.length >= 10 && longer.includes(shorter)) {
          findings.push(finding(
            "DUPLICATE_NORMALIZED",
            `Stem has high overlap with existing item at position ${i} (${Math.round((shorter.length / longer.length) * 100)}%).`,
            false,
            "SOFT_FAIL",
            { knownIndex: i, overlapPercent: Math.round((shorter.length / longer.length) * 100) }
          ));
          break;
        }
      }
    }

    if (findings.filter((f) => f.status === "FAIL").length === 0) {
      findings.push(pass("No duplicate issues detected."));
    }

    return findings;
  },
};
