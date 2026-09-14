/**
 * BC Agent P5 — structured worker logging (§22).
 *
 * Metadata-only by construction: the emit function's parameter type has
 * fields for correlation ids and categories but NO field that can carry a
 * prompt, tool output, or credential payload. `detail` is a bounded
 * single-line string, and callers pass only non-sensitive context
 * (tool names, error codes, statuses). Correlation: taskId/attemptId/
 * executionId.
 */

export const WORKER_LOG_EVENTS = [
  "WORKER_STARTED",
  "WORKER_STOPPING",
  "WORKER_ERROR",
  "TASK_CLAIMED",
  "TASK_STARTED",
  "PLAN_RECEIVED",
  "PLAN_REJECTED",
  "ACTION_PROPOSED",
  "ACTION_EXECUTED",
  "TASK_WAITING_APPROVAL",
  "TASK_WAITING_INTELLIGENCE",
  "TASK_VERIFYING",
  "TASK_COMPLETED",
  "TASK_FAILED",
  "RECOVERY_RECLAIMED",
] as const;

export type WorkerLogEvent = (typeof WORKER_LOG_EVENTS)[number];

export interface WorkerLogLine {
  readonly event: WorkerLogEvent;
  readonly workerId: string;
  readonly ts: string;
  readonly taskId?: string;
  readonly attemptId?: string;
  readonly executionId?: string;
  readonly toolName?: string;
  readonly category?: string;
  /** Bounded non-sensitive context (≤200 chars, single line). */
  readonly detail?: string;
}

export type WorkerLogSink = (line: WorkerLogLine) => void;

/** Default sink: one JSON line to stdout. */
export const defaultLogSink: WorkerLogSink = (line) => {
  process.stdout.write(`${JSON.stringify(line)}\n`);
};

export interface WorkerLogger {
  emit(event: WorkerLogEvent, fields?: Partial<Omit<WorkerLogLine, "event" | "workerId" | "ts">>): void;
}

export function createWorkerLogger(workerId: string, sink: WorkerLogSink = defaultLogSink): WorkerLogger {
  return {
    emit(event, fields = {}) {
      sink({
        event,
        workerId,
        ts: new Date().toISOString(),
        ...fields,
        ...(fields.detail ? { detail: fields.detail.replace(/\s+/g, " ").slice(0, 200) } : {}),
      });
    },
  };
}
