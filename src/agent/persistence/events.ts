/**
 * BC Agent P2 — audit-event vocabulary.
 *
 * The P1 core's `TaskEvent` union is the set of *transition commands*.
 * The durable event log additionally records lifecycle actions that are not
 * transitions (RETRY creates a fresh attempt; RECOVERY reclaims a stale one),
 * so the persisted event type is a superset. Audit-only events never appear
 * in `transitionTask` — FAILED stays terminal at the transition level.
 */

/** Core transition commands. */
export const TRANSITION_EVENT_TYPES = [
  "CLAIM",
  "APPROVAL_REQUIRED",
  "INTELLIGENCE_WAIT",
  "INTELLIGENCE_RECOVERED",
  "WORK_COMPLETED",
  "VERIFICATION_PASSED",
  "VERIFICATION_FAILED",
  "REWORK",
  "FAILURE",
  "APPROVAL_GRANTED",
  "APPROVAL_REJECTED",
  "APPROVAL_EXPIRED",
  "CANCEL",
] as const;

/** Audit-only lifecycle actions (no task-state change by themselves). */
export const AUDIT_ONLY_EVENT_TYPES = ["RETRY", "RECOVERY"] as const;

export type TaskEventType = (typeof TRANSITION_EVENT_TYPES)[number] | (typeof AUDIT_ONLY_EVENT_TYPES)[number];

export function isTransitionEventType(t: string): t is (typeof TRANSITION_EVENT_TYPES)[number] {
  return (TRANSITION_EVENT_TYPES as readonly string[]).includes(t);
}

export function isAuditOnlyEventType(t: string): t is (typeof AUDIT_ONLY_EVENT_TYPES)[number] {
  return (AUDIT_ONLY_EVENT_TYPES as readonly string[]).includes(t);
}
