/**
 * BC Agent Core — approval contract (pure).
 *
 * P0 §9: an approval is single-use, expiring, and bound to
 * (taskId, attemptId, toolName, inputHash). It can never authorize another
 * task, attempt, tool, or input. Approval does NOT replace policy — a valid
 * approval for an action the policy denies outright still results in DENY
 * (see policy.ts decideWithApproval).
 *
 * Time is injected (`now`) — the core never reads a clock.
 */

import { ApprovalExpiredError, ApprovalConsumedError, ApprovalInvalidError, ApprovalMismatchError } from "./errors";

export type ApprovalStatus = "PENDING" | "CONSUMED" | "EXPIRED" | "REVOKED" | "REJECTED";

export interface Approval {
  readonly approvalId: string;
  readonly taskId: string;
  readonly attemptId: string;
  readonly toolName: string;
  /** Canonical input hash binding (hash.ts). */
  readonly inputHash: string;
  readonly issuedAt: string; // ISO
  readonly expiresAt: string; // ISO
  readonly approvedBy: string;
  readonly usedAt: string | null;
  readonly status: ApprovalStatus;
  /** Execution that consumed this approval (set at consumption). */
  readonly consumedBy?: string | null;
}

export type ApprovalCheckResult =
  | { ok: true; approval: Approval }
  | { ok: false; error: ApprovalInvalidError | ApprovalExpiredError | ApprovalConsumedError | ApprovalMismatchError };

/**
 * Validate an approval for a specific (task, attempt, tool, inputHash) at
 * time `now`. Pure — the input approval object is never mutated; consumption
 * is a separate step (`consumeApproval`).
 *
 * Time policy (P1-audit closure):
 * - `expiresAt` is the LAST valid instant: `now >= expiresAt` is expired.
 *   The exact-boundary case is pinned by a dedicated test.
 * - Timestamps must be well-formed ISO 8601 (same representation the P2
 *   persistence layer exchanges); malformed values are `ApprovalInvalidError`,
 *   never silently accepted or lexically compared.
 * - `usedAt`/`status` must be coherent: `usedAt` is only set on CONSUMED.
 *   A PENDING approval with a `usedAt` is malformed (F2).
 */
export function validateApproval(
  approval: Approval,
  expected: { taskId: string; attemptId: string; toolName: string; inputHash: string },
  now: string
): ApprovalCheckResult {
  const malformed = malformedReason(approval);
  if (malformed) return { ok: false, error: new ApprovalInvalidError(malformed) };

  if (approval.taskId !== expected.taskId) {
    return {
      ok: false,
      error: new ApprovalMismatchError("taskId", expected.taskId, approval.taskId),
    };
  }
  if (approval.attemptId !== expected.attemptId) {
    return {
      ok: false,
      error: new ApprovalMismatchError("attemptId", expected.attemptId, approval.attemptId),
    };
  }
  if (approval.toolName !== expected.toolName) {
    return {
      ok: false,
      error: new ApprovalMismatchError("toolName", expected.toolName, approval.toolName),
    };
  }
  if (approval.inputHash !== expected.inputHash) {
    return {
      ok: false,
      error: new ApprovalMismatchError("inputHash", expected.inputHash, approval.inputHash),
    };
  }
  if (approval.status === "CONSUMED") {
    return { ok: false, error: new ApprovalConsumedError(approval.approvalId, approval.usedAt ?? "unknown") };
  }
  if (approval.status === "EXPIRED" || approval.status === "REVOKED" || approval.status === "REJECTED") {
    return { ok: false, error: new ApprovalInvalidError(`approval status is ${approval.status}`) };
  }
  // Boundary policy: expiresAt is the LAST valid instant — equality is expired.
  if (now >= approval.expiresAt) {
    return { ok: false, error: new ApprovalExpiredError(approval.approvalId, approval.expiresAt) };
  }
  return { ok: true, approval };
}

/** Atomically consume a validated approval (immutably). */
export function consumeApproval(approval: Approval, now: string, executionId: string): Approval {
  if (approval.status !== "PENDING") {
    throw new ApprovalInvalidError(`cannot consume approval in status ${approval.status}`);
  }
  if (approval.usedAt !== null) {
    // F2 invariant: usedAt is only ever set together with status CONSUMED.
    throw new ApprovalConsumedError(approval.approvalId, approval.usedAt);
  }
  return { ...approval, status: "CONSUMED", usedAt: now, consumedBy: executionId };
}

/** Immutably mark an approval rejected (founder decision). */
export function rejectApproval(approval: Approval): Approval {
  return { ...approval, status: "REJECTED" };
}

/** Immutably mark an approval revoked (e.g. task cancelled). */
export function revokeApproval(approval: Approval): Approval {
  return { ...approval, status: "REVOKED" };
}

/** Immutably mark an approval expired (founder/worker reconciliation). */
export function expireApproval(approval: Approval, now: string): Approval {
  // Consistent with validate: at exactly expiresAt the window has closed.
  if (now < approval.expiresAt && approval.status === "PENDING") {
    throw new ApprovalInvalidError("cannot expire an approval that has not yet expired");
  }
  return { ...approval, status: "EXPIRED" };
}

function malformedReason(a: Approval): string | null {
  if (!a || typeof a !== "object") return "approval is not an object";
  if (!a.approvalId) return "approvalId is required";
  if (!a.taskId) return "taskId is required";
  if (!a.attemptId) return "attemptId is required";
  if (!a.toolName) return "toolName is required";
  if (typeof a.inputHash !== "string" || !a.inputHash) return "inputHash must be a non-empty string";
  if (!a.issuedAt) return "issuedAt is required";
  if (!a.expiresAt) return "expiresAt is required";
  if (!isIsoTimestamp(a.issuedAt)) return "issuedAt must be a valid ISO 8601 timestamp";
  if (!isIsoTimestamp(a.expiresAt)) return "expiresAt must be a valid ISO 8601 timestamp";
  if (a.expiresAt <= a.issuedAt) return "expiresAt must be after issuedAt";
  if (!a.approvedBy) return "approvedBy is required";
  if (a.usedAt !== null && typeof a.usedAt !== "string") return "usedAt must be null or a string";
  if (a.usedAt !== null && !isIsoTimestamp(a.usedAt)) return "usedAt must be a valid ISO 8601 timestamp";
  // F2: usedAt is only ever set together with status CONSUMED — a PENDING
  // (or EXPIRED/REVOKED/REJECTED) approval carrying a usedAt is incoherent.
  if (a.status !== "CONSUMED" && a.usedAt !== null) {
    return "usedAt must be null unless status is CONSUMED";
  }
  return null;
}

/**
 * Strict ISO 8601 instant check (used by malformedReason).
 * The P1/P2 contract exchanges timestamps as ISO strings; any value that
 * Date cannot round-trip (or that carries non-UTC/local-time offsets, which
 * the service layer never produces) is rejected rather than compared.
 */
function isIsoTimestamp(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
    return false;
  }
  const t = Date.parse(value);
  return !Number.isNaN(t) && new Date(t).toISOString() === value;
}
