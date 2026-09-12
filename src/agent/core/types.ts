/**
 * BC Agent Core — canonical types.
 *
 * Source of truth: docs/BC_AGENT_V0_1_BLUEPRINT.md (P0), §7 Task Engine.
 *
 * LIFECYCLE RESOLUTION (P1 brief asked this be resolved explicitly):
 * The P0 blueprint defines a "Final 8" lifecycle — PENDING, RUNNING,
 * WAITING_APPROVAL, WAITING_INTELLIGENCE, VERIFYING, COMPLETED, FAILED,
 * CANCELLED — collapsing PLANNING and READY into RUNNING (a plan is an
 * artifact on the attempt, not a state). That 8-state set is canonical here.
 * The brief's 10-state example was a proposal; P0 is the source of truth.
 *
 * Zero I/O. Zero side effects. Pure types only.
 */

/** Minimal canonical lifecycle (P0 §7.1 "Final 8"). */
export const TASK_STATUSES = [
  "PENDING",
  "RUNNING",
  "WAITING_APPROVAL",
  "WAITING_INTELLIGENCE",
  "VERIFYING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === "string" && (TASK_STATUSES as readonly string[]).includes(value);
}

/** Terminal states — no legal outgoing transitions. */
export const TERMINAL_STATUSES: readonly TaskStatus[] = ["COMPLETED", "FAILED", "CANCELLED"];

export function isTerminal(status: TaskStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

/** Where an instruction came from. Channels are adapters; the core is channel-agnostic. */
export type TaskChannel = "WEB" | "TELEGRAM";

/** What kind of work the task represents (open set; new kinds are added deliberately). */
export type TaskIntentType =
  | "ANALYZE_REPO"
  | "AUDIT_DB"
  | "AUDIT_DEPLOYMENT"
  | "QA_RUN"
  | "RESEARCH"
  | "REPO_EDIT"
  | "CREATE_PR"
  | "DEPLOY_PREVIEW"
  | "DB_MIGRATE"
  | "REPORT"
  | "OTHER";

/** Result of verification for an attempt (§10 Evidence/Verification). */
export type VerificationStatus = "NOT_REQUIRED" | "PASSED" | "FAILED";

export interface TaskVerification {
  status: VerificationStatus;
  /** Human-readable strategy reference, e.g. "test-suite:scripts/test-foo.ts". */
  strategy?: string;
  summary?: string;
}

/**
 * AgentTask — the unit of founder intent.
 * Fields that describe *what* to do live here; fields that describe *how a
 * particular execution went* live on TaskAttempt (attempt isolation, §7.3).
 */
export interface AgentTask {
  readonly id: string;
  readonly instruction: string;
  readonly intentType: TaskIntentType;
  readonly channel: TaskChannel;
  readonly createdBy: string;
  readonly createdAt: string; // ISO 8601
  readonly updatedAt: string; // ISO 8601
  readonly status: TaskStatus;
  /** Monotonic retry counter — number of attempts created so far. */
  readonly attemptCount: number;
  /** Id of the active attempt, if one exists. */
  readonly currentAttemptId: string | null;
  /** Ids of approvals bound to this task (references only — state lives in Approval). */
  readonly approvalIds: readonly string[];
  /** Reference to the founder who approved/rejected/cancelled, where applicable. */
  readonly resolvedBy?: string;
}

/** Events that drive task transitions. */
export type TaskEvent =
  | { type: "CLAIM" }
  | { type: "APPROVAL_REQUIRED" }
  | { type: "INTELLIGENCE_WAIT" }
  | { type: "INTELLIGENCE_RECOVERED" }
  | { type: "WORK_COMPLETED" }
  | { type: "VERIFICATION_PASSED" }
  | { type: "VERIFICATION_FAILED" }
  | { type: "REWORK" }
  | { type: "FAILURE"; reason?: string }
  | { type: "APPROVAL_GRANTED" }
  | { type: "APPROVAL_REJECTED" }
  | { type: "APPROVAL_EXPIRED" }
  // Note: there is deliberately NO RETRY event — retry is not an in-place
  // transition. A retry creates a fresh TaskAttempt (attempt.ts), carrying
  // none of the previous attempt's state. This is the structural fix for
  // retry state contamination (P0 §7.3).
  | { type: "CANCEL"; by?: string };

/** Result of applying an event to a task. */
export type TransitionResult =
  | { ok: true; task: AgentTask }
  | { ok: false; error: InvalidTaskTransitionError };

import { InvalidTaskTransitionError } from "./errors";
