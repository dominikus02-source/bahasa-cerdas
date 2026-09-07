/**
 * Question Factory V2 — State-Transition Guard (P3.3 §8, P3.4 §V.11).
 *
 * Stage 6: Prevent illegal review-state transitions + AI self-approval guard.
 *
 * Rules:
 *   - Only allowed transitions per VALID_TRANSITIONS
 *   - AI agent must not approve its own output
 *   - REJECTED items must go through REVISION → RE_SUBMITTED
 *
 * Section references:
 *   P3.3 §8     — State machine, VALID_TRANSITIONS
 *   P3.3 §11.2  — AI self-approval prohibition
 *   P3.4 §V.11  — State-transition guard specification
 */

import { VALID_TRANSITIONS, type CanonicalItem, type ItemReviewState, type ValidationContext, type ValidationFinding } from "./types";
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
    validatorId: "state-guard",
    validatorVersion: VERSION,
    stage: 6,
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
    validatorId: "state-guard",
    validatorVersion: VERSION,
    stage: 6,
    status: "PASS",
    severity: "ADVISORY",
    blocking: false,
    retryable: false,
    reasonCode: "PASS",
    rationale,
    evaluatedAt: new Date().toISOString(),
  };
}

/** Check if a state transition is allowed. */
function isTransitionAllowed(from: ItemReviewState, to: ItemReviewState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * State-Transition Guard — validates review-state transitions.
 *
 * @param item          The canonical item.
 * @param targetState   The proposed new review state (null = no state change).
 * @param actorIsAI     True if the actor is an AI agent (not a human).
 * @param actorUserId   The user ID of the actor performing the transition.
 */
export function validateStateTransition(
  item: CanonicalItem,
  targetState: ItemReviewState | null,
  actorIsAI: boolean,
  actorUserId: string
): ValidationFinding[] {
  const findings: ValidationFinding[] = [];

  if (targetState === null) {
    // No state change requested — just validate current state is valid
    return [pass("No state change requested; current state accepted.")];
  }

  // ─── STATE_TRANSITION_INVALID ──────────────────────────────────────────
  if (!isTransitionAllowed(item.reviewState, targetState)) {
    findings.push(finding(
      "STATE_TRANSITION_INVALID",
      `Transition '${item.reviewState}' → '${targetState}' is not allowed. Valid transitions: ${(VALID_TRANSITIONS[item.reviewState] ?? []).join(", ")}.`,
      true,
      "HARD_FAIL",
      { from: item.reviewState, to: targetState }
    ));
  }

  // ─── AI_SELF_APPROVAL ──────────────────────────────────────────────────
  // If target is APPROVED and actor is AI
  if (targetState === "APPROVED" && actorIsAI) {
    findings.push(finding(
      "AI_SELF_APPROVAL",
      `AI agent (userId='${actorUserId}') attempted to APPROVE an item. Human review required.`,
      true,
      "HARD_FAIL",
      { actorUserId, targetState }
    ));
  }

  // ─── AI cannot PUBLISH ─────────────────────────────────────────────────
  if (targetState === "PUBLISHED" && actorIsAI) {
    findings.push(finding(
      "AI_SELF_APPROVAL",
      `AI agent (userId='${actorUserId}') attempted to PUBLISH an item. Human review required.`,
      true,
      "HARD_FAIL",
      { actorUserId, targetState }
    ));
  }

  // ─── REJECTED → must go through REVISION ───────────────────────────────
  // If current state is REJECTED and someone tries to APPROVE/PUBLISH directly
  if (item.reviewState === "REJECTED" &&
      (targetState === "APPROVED" || targetState === "PUBLISHED")) {
    findings.push(finding(
      "STATE_TRANSITION_INVALID",
      `Item is REJECTED; must go through REVISION → RE_SUBMITTED before APPROVAL.`,
      true,
      "HARD_FAIL",
      { from: "REJECTED", to: targetState }
    ));
  }

  if (findings.filter((f) => f.status === "FAIL").length === 0) {
    findings.push(pass(
      `Transition '${item.reviewState}' → '${targetState}' is allowed.`
    ));
  }

  return findings;
}

/**
 * State-Transition Validator — implements the Validator interface.
 *
 * Validates that the item's current review state is consistent with
 * its context. Full transition validation requires knowing the target state
 * (via validateStateTransition function above).
 */
export const stateGuardValidator: Validator = {
  id: "state-guard",
  version: VERSION,
  stage: 6,

  validate(item: CanonicalItem, _ctx: ValidationContext): ValidationFinding[] {
    // Static check: is the current review state valid?
    const validStates = [
      "NOT_REVIEWED", "PENDING", "IN_REVIEW",
      "APPROVED", "REJECTED", "REVISION", "RE_SUBMITTED", "PUBLISHED"
    ] as ItemReviewState[];

    if (!validStates.includes(item.reviewState)) {
      return [finding(
        "STATE_TRANSITION_INVALID",
        `Current review state '${item.reviewState}' is not a valid state.`,
        true
      )];
    }

    return [pass(`Current review state '${item.reviewState}' is valid.`)];
  },
};
