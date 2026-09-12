/**
 * BC Agent Core — attempt isolation.
 *
 * P1 rule: a retry MUST start from a clean deterministic state. Anything that
 * describes "how a particular execution went" lives on the attempt, never on
 * the task. `createAttempt` produces a blank-slate attempt; `createRetry`
 * produces a fresh attempt for the same task and *refuses* to copy any
 * attempt-scoped state (decisions, verification, evidence, tool outputs,
 * errors, execution metadata).
 *
 * Pure data + pure functions only.
 */

import { AgentTask, TaskStatus, TaskVerification } from "./types";
import { InvalidAttemptError } from "./errors";

/** Status of one attempt (a task-level WAITING_* maps to attempt-level waiting flags). */
export type AttemptStatus = "ACTIVE" | "COMPLETED" | "FAILED" | "CANCELLED";

/**
 * One deterministic execution pass over a task's intent.
 * Every field except identity/scheduling is scoped to THIS attempt and is
 * never carried into a retry.
 */
export interface TaskAttempt {
  readonly id: string;
  readonly taskId: string;
  /** 1-based sequence number within the task. */
  readonly sequence: number;
  readonly startedAt: string; // ISO
  readonly finishedAt: string | null;
  readonly status: AttemptStatus;
  /** The plan derived for this attempt (P0: a plan is an artifact, not a state). */
  readonly plan: readonly PlanStep[];
  /** Policy decisions made during this attempt (attempt-scoped). */
  readonly decisions: readonly PolicyDecisionRef[];
  /** Verification result for THIS attempt only. */
  readonly verification: TaskVerification;
  /** Evidence ids produced by this attempt. */
  readonly evidenceIds: readonly string[];
  /** Tool executions performed by this attempt. */
  readonly toolExecutionIds: readonly string[];
  /** Failure reason if status FAILED. */
  readonly error: string | null;
  /** Execution metadata (worker id, node id, timings). Never inherited on retry. */
  readonly metadata: Readonly<Record<string, string>>;
}

export interface PlanStep {
  readonly id: string;
  readonly description: string;
  readonly done: boolean;
}

/** Minimal reference to a policy decision taken during an attempt. */
export interface PolicyDecisionRef {
  readonly toolName: string;
  readonly outcome: "ALLOWED" | "DENIED" | "APPROVAL_REQUIRED";
  readonly at: string;
}

/** Blank-slate attempt for a task. */
export function createAttempt(input: {
  id: string;
  task: AgentTask;
  startedAt: string;
}): TaskAttempt {
  if (!input.id) throw new InvalidAttemptError("id is required");
  if (input.task.currentAttemptId !== null) {
    throw new InvalidAttemptError(
      `task ${input.task.id} already has an active attempt (${input.task.currentAttemptId})`
    );
  }
  return {
    id: input.id,
    taskId: input.task.id,
    sequence: input.task.attemptCount + 1,
    startedAt: input.startedAt,
    finishedAt: null,
    status: "ACTIVE",
    plan: [],
    decisions: [],
    verification: { status: "NOT_REQUIRED" },
    evidenceIds: [],
    toolExecutionIds: [],
    error: null,
    metadata: {},
  };
}

/**
 * Create a retry attempt. Returns a fresh blank-slate attempt plus the
 * updated task. Stale attempt-scoped state is structurally impossible to
 * inherit: the new attempt starts from `createAttempt`'s blank slate and
 * only the task's *intent* (id, instruction, intentType) carries forward.
 */
export function createRetryAttempt(input: {
  id: string;
  task: AgentTask;
  previousAttempt: TaskAttempt;
  startedAt: string;
}): { attempt: TaskAttempt; task: AgentTask } {
  if (input.previousAttempt.taskId !== input.task.id) {
    throw new InvalidAttemptError(
      `previous attempt ${input.previousAttempt.id} belongs to task ${input.previousAttempt.taskId}, not ${input.task.id}`
    );
  }
  // Note: intentionally ignores previousAttempt.plan/decisions/verification/
  // evidence/toolExecutionIds/error/metadata — attempt-scoped state dies here.
  const attempt = createAttempt({ id: input.id, task: input.task, startedAt: input.startedAt });
  return {
    attempt,
    task: withRetryTaskState(input.task, attempt.id, input.startedAt),
  };
}

function withRetryTaskState(task: AgentTask, attemptId: string, now: string): AgentTask {
  return {
    ...task,
    status: "RUNNING" as TaskStatus,
    currentAttemptId: attemptId,
    attemptCount: task.attemptCount + 1,
    updatedAt: now,
  };
}

/** Immutably record a policy decision on the attempt. */
export function withDecision(attempt: TaskAttempt, ref: PolicyDecisionRef): TaskAttempt {
  return { ...attempt, decisions: [...attempt.decisions, ref] };
}

/** Immutably record verification on the attempt. */
export function withVerification(attempt: TaskAttempt, verification: TaskVerification): TaskAttempt {
  return { ...attempt, verification };
}

/** Immutably attach evidence/tool-execution references. */
export function withEvidenceRef(attempt: TaskAttempt, evidenceId: string): TaskAttempt {
  return { ...attempt, evidenceIds: [...attempt.evidenceIds, evidenceId] };
}

export function withToolExecutionRef(attempt: TaskAttempt, executionId: string): TaskAttempt {
  return { ...attempt, toolExecutionIds: [...attempt.toolExecutionIds, executionId] };
}

/** Mark an attempt finished. status must be a terminal attempt status. */
export function finishAttempt(
  attempt: TaskAttempt,
  status: Exclude<AttemptStatus, "ACTIVE">,
  finishedAt: string,
  error?: string
): TaskAttempt {
  if (attempt.status !== "ACTIVE") {
    throw new InvalidAttemptError(`attempt ${attempt.id} is already finished (${attempt.status})`);
  }
  if (status === "FAILED" && !error) {
    throw new InvalidAttemptError("a FAILED attempt requires an error reason");
  }
  return { ...attempt, status, finishedAt, error: error ?? null };
}
