/**
 * BC Agent Core — task lifecycle state machine.
 *
 * Pure transition functions: no mutation, no I/O, no clocks, no randomness.
 * Illegal transitions throw InvalidTaskTransitionError (deterministic, typed).
 *
 * Canonical graph (P0 §7.2):
 *
 *   PENDING → RUNNING | CANCELLED
 *   RUNNING → WAITING_APPROVAL | WAITING_INTELLIGENCE | VERIFYING | FAILED | CANCELLED
 *   WAITING_APPROVAL → RUNNING | FAILED | CANCELLED
 *   WAITING_INTELLIGENCE → RUNNING | FAILED | CANCELLED
 *   VERIFYING → COMPLETED | FAILED | RUNNING   (bounded rework cycle)
 *   COMPLETED | FAILED | CANCELLED → (terminal — no outgoing transitions)
 *
 * Time policy: transitions take an explicit `now` ISO timestamp from the
 * caller (the future worker passes real time; tests pass fixed time). The
 * core itself never reads a clock — that would be a side effect.
 */

import {
  AgentTask,
  TaskEvent,
  TaskStatus,
  TransitionResult,
} from "./types";
import {
  InvalidTaskError,
  InvalidTaskTransitionError,
} from "./errors";

const TRANSITIONS: Record<TaskStatus, readonly TaskEvent["type"][]> = {
  PENDING: ["CLAIM", "CANCEL"],
  RUNNING: [
    "APPROVAL_REQUIRED",
    "INTELLIGENCE_WAIT",
    "WORK_COMPLETED",
    "FAILURE",
    "CANCEL",
  ],
  WAITING_APPROVAL: ["APPROVAL_GRANTED", "APPROVAL_REJECTED", "APPROVAL_EXPIRED", "FAILURE", "CANCEL"],
  WAITING_INTELLIGENCE: ["INTELLIGENCE_RECOVERED", "FAILURE", "CANCEL"],
  VERIFYING: ["VERIFICATION_PASSED", "VERIFICATION_FAILED", "REWORK", "CANCEL"],
  COMPLETED: [],
  FAILED: [],
  CANCELLED: [],
};

function eventTarget(status: TaskStatus, event: TaskEvent): TaskStatus {
  switch (event.type) {
    case "CLAIM":
      return "RUNNING";
    case "APPROVAL_REQUIRED":
      return "WAITING_APPROVAL";
    case "INTELLIGENCE_WAIT":
      return "WAITING_INTELLIGENCE";
    case "INTELLIGENCE_RECOVERED":
    case "APPROVAL_GRANTED":
    case "REWORK":
      return "RUNNING";
    case "WORK_COMPLETED":
      return "VERIFYING";
    case "VERIFICATION_PASSED":
      return "COMPLETED";
    case "APPROVAL_REJECTED":
    case "APPROVAL_EXPIRED":
    case "VERIFICATION_FAILED":
    case "FAILURE":
      return "FAILED";
    case "CANCEL":
      return "CANCELLED";
    default: {
      const exhaustive: never = event;
      throw new Error(`Unhandled task event: ${JSON.stringify(exhaustive)}`);
    }
  }
}

/**
 * Apply an event to a task, returning a NEW task (input is never mutated).
 * Illegal transitions throw InvalidTaskTransitionError.
 */
export function transitionTask(task: AgentTask, event: TaskEvent, now: string): TransitionResult {
  const from = task.status;
  const legal = TRANSITIONS[from];
  if (!legal.includes(event.type)) {
    return {
      ok: false,
      error: new InvalidTaskTransitionError(from, event.type, task.id),
    };
  }
  const to = eventTarget(from, event);
  return {
    ok: true,
    task: {
      ...task,
      status: to,
      updatedAt: now,
      resolvedBy: event.type === "CANCEL" ? (event.by ?? task.resolvedBy) : task.resolvedBy,
    },
  };
}

/** True if `event` is legal from `status` — for UIs/gates that pre-check. */
export function isTransitionLegal(status: TaskStatus, event: TaskEvent): boolean {
  return TRANSITIONS[status].includes(event.type);
}

// ─── Factories ─────────────────────────────────────────────────────────

export function createTask(input: {
  id: string;
  instruction: string;
  intentType: AgentTask["intentType"];
  channel: AgentTask["channel"];
  createdBy: string;
  createdAt: string;
}): AgentTask {
  if (!input.id) throw new InvalidTaskError("id is required");
  if (!input.instruction || !input.instruction.trim()) {
    throw new InvalidTaskError("instruction is required");
  }
  if (!input.createdBy) throw new InvalidTaskError("createdBy is required");
  return {
    id: input.id,
    instruction: input.instruction,
    intentType: input.intentType,
    channel: input.channel,
    createdBy: input.createdBy,
    createdAt: input.createdAt,
    updatedAt: input.createdAt,
    status: "PENDING",
    attemptCount: 0,
    currentAttemptId: null,
    approvalIds: [],
  };
}

/** Attach a fresh attempt to a task (immutably) — used on claim and on retry. */
export function withCurrentAttempt(task: AgentTask, attemptId: string, now: string): AgentTask {
  return {
    ...task,
    currentAttemptId: attemptId,
    attemptCount: task.attemptCount + 1,
    updatedAt: now,
  };
}

/** Detach the current attempt (attempt finished, task may be retried later). */
export function withoutCurrentAttempt(task: AgentTask, now: string): AgentTask {
  return { ...task, currentAttemptId: null, updatedAt: now };
}
