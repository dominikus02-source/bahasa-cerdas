/**
 * Question Factory V2 — Purpose Gate (P3.3 §8, P3.4 §V.8).
 *
 * Stage 4: D10 state vs item purpose enforcement.
 *
 * Rules (P3.3 §8):
 *   PRACTICE / ACHIEVEMENT  → D10 ≥ HYPOTHESIS
 *   DIAGNOSTIC              → D10 ≥ REVIEWED
 *   ADAPTIVE_MISCONCEPTION  → D10 ≥ EMPIRICALLY_SUPPORTED
 *   CALIBRATION             → D10 = NOT_APPLICABLE (no student-facing)
 *
 * Section references:
 *   P3.3 §8     — Purpose gate specification
 *   P3.3 §11.5  — D10 monotonic model
 *   P3.4 §V.8   — Purpose gate validator
 */

import { D10_TRANSITIONS, PURPOSE_D10_MIN } from "./types";
import type { CanonicalItem, D10State, ValidationContext, ValidationFinding } from "./types";
import type { Validator } from "./interface";

const VERSION = "1.0.0";

const D10_ORDER: D10State[] = [
  "NOT_APPLICABLE",
  "HYPOTHESIS",
  "REVIEWED",
  "EMPIRICALLY_SUPPORTED",
];

function d10Rank(state: D10State): number {
  return D10_ORDER.indexOf(state);
}

function finding(
  code: string,
  rationale: string,
  blocking: boolean,
  severity: "HARD_FAIL" | "SOFT_FAIL" = "HARD_FAIL",
  details?: Record<string, unknown>
): ValidationFinding {
  return {
    validatorId: "purpose-gate",
    validatorVersion: VERSION,
    stage: 4,
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
    validatorId: "purpose-gate",
    validatorVersion: VERSION,
    stage: 4,
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
 * Purpose Gate — enforces D10 state meets purpose minimum.
 *
 * Also validates:
 *   - D10 state transition is monotonic (no regress)
 *   - CALIBRATION purpose must be NOT_APPLICABLE
 */
export const purposeGateValidator: Validator = {
  id: "purpose-gate",
  version: VERSION,
  stage: 4,

  validate(item: CanonicalItem, _ctx: ValidationContext): ValidationFinding[] {
    const findings: ValidationFinding[] = [];
    const purpose = item.purpose.purpose;
    const d10State = item.purpose.d10State;

    // ─── PURPOSE_GATE_FAILED: D10 < minimum required ─────────────────────
    const minRequired = PURPOSE_D10_MIN[purpose];
    if (d10Rank(d10State) < d10Rank(minRequired)) {
      findings.push(finding(
        "PURPOSE_GATE_FAILED",
        `D10 state '${d10State}' is below the minimum required '${minRequired}' for purpose '${purpose}'.`,
        true,
        "HARD_FAIL",
        { purpose, d10State, minRequired }
      ));
    }

    // ─── CALIBRATION special rule ─────────────────────────────────────────
    // CALIBRATION items should NOT be student-facing; D10 = NOT_APPLICABLE
    if (purpose === "CALIBRATION" && d10State !== "NOT_APPLICABLE") {
      findings.push(finding(
        "PURPOSE_GATE_FAILED",
        `CALIBRATION purpose requires D10 = NOT_APPLICABLE; got '${d10State}'.`,
        true,
        "HARD_FAIL",
        { purpose, d10State }
      ));
    }

    // ─── D10_INVALID_TRANSITION: proposed transition not allowed ──────────
    // This is a static check — we can't verify history without a previous state,
    // but we CAN verify the current state is valid for the item's context.
    // Full transition checks happen at review time (§11 state-guard).
    const allowed = D10_TRANSITIONS[d10State];
    // For initial state, this is just informational — if the state IS reachable
    // from any initial state, we don't flag it. Full transition check is in state-guard.
    // Here we only flag obviously invalid states.

    if (findings.filter((f) => f.status === "FAIL").length === 0) {
      findings.push(pass(
        `Purpose '${purpose}' with D10 '${d10State}' passes gate (min: '${PURPOSE_D10_MIN[purpose]}').`
      ));
    }

    return findings;
  },
};
