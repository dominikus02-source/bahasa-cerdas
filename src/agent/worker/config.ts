/**
 * BC Agent P5 — worker configuration.
 *
 * Explicit, validated, fail-fast. The worker never silently invents
 * dangerous defaults: every value is checked before the loop starts
 * (`parseWorkerConfig`) and an invalid value throws
 * InvalidWorkerConfigError BEFORE any task is claimed.
 *
 * All durations are milliseconds. All bounds are integers.
 */

import { AgentError } from "../core/errors";

export class InvalidWorkerConfigError extends AgentError {
  readonly code = "INVALID_WORKER_CONFIG";
  constructor(reason: string) {
    super(`Invalid worker config: ${reason}`);
  }
}

/** Milliseconds between worker heartbeat refreshes for active work (§15). */
export const HEARTBEAT_INTERVAL_MS = 30_000;
/** An ACTIVE attempt older (heartbeat) than this is stale and recoverable (§11). */
export const STALE_THRESHOLD_MS = 15 * 60 * 1000; // matches P2 STALE_ATTEMPT_THRESHOLD_MS
/** Wall-clock ceiling for one task processed by one attempt (§9, safety net). */
export const TASK_TIME_LIMIT_MS = 30 * 60 * 1000;
/** Interval between recovery sweeps for stale RUNNING attempts (§11). */
export const RECOVERY_SCAN_INTERVAL_MS = 60_000;

export interface WorkerConfig {
  readonly heartbeatIntervalMs: number;
  readonly staleThresholdMs: number;
  readonly taskTimeLimitMs: number;
  readonly recoveryScanIntervalMs: number;
  readonly pollIntervalMs: number;
  readonly maxPollIntervalMs: number;
  readonly maxConsecutiveErrors: number;
  /** Hard cap on actions in one AI plan (§5). */
  readonly maxActionsPerPlan: number;
  /** Hard cap on plan JSON size, characters (§5). */
  readonly maxPlanChars: number;
  /** Concurrency — default 1 per P5 brief §13. */
  readonly concurrency: number;
  /** Graceful-shutdown grace period before giving up on in-flight work (§16). */
  readonly shutdownTimeoutMs: number;
}

/** Fixed backoff ladder (§14): no busy polling, max delay 10s, appears alive. */
export const BACKOFF_LADDER_MS: readonly number[] = [100, 250, 500, 1_000, 2_000, 5_000, 10_000];

const isPositiveInt = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n > 0;

/**
 * Validate a partial config and fill safe defaults. Throws
 * InvalidWorkerConfigError on any violation (§27) — never coerces.
 */
export function parseWorkerConfig(input: Partial<WorkerConfig> = {}): WorkerConfig {
  const cfg: WorkerConfig = {
    heartbeatIntervalMs: input.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS,
    staleThresholdMs: input.staleThresholdMs ?? STALE_THRESHOLD_MS,
    taskTimeLimitMs: input.taskTimeLimitMs ?? TASK_TIME_LIMIT_MS,
    recoveryScanIntervalMs: input.recoveryScanIntervalMs ?? RECOVERY_SCAN_INTERVAL_MS,
    pollIntervalMs: input.pollIntervalMs ?? 500,
    maxPollIntervalMs: input.maxPollIntervalMs ?? 10_000,
    maxConsecutiveErrors: input.maxConsecutiveErrors ?? 5,
    maxActionsPerPlan: input.maxActionsPerPlan ?? 10,
    maxPlanChars: input.maxPlanChars ?? 50_000,
    concurrency: input.concurrency ?? 1,
    shutdownTimeoutMs: input.shutdownTimeoutMs ?? 10_000,
  };

  for (const key of [
    "heartbeatIntervalMs",
    "staleThresholdMs",
    "taskTimeLimitMs",
    "recoveryScanIntervalMs",
    "pollIntervalMs",
    "maxPollIntervalMs",
    "shutdownTimeoutMs",
  ] as const) {
    if (!isPositiveInt(cfg[key])) throw new InvalidWorkerConfigError(`${key} must be a positive integer`);
  }
  for (const key of ["maxConsecutiveErrors", "maxActionsPerPlan"] as const) {
    if (!isPositiveInt(cfg[key])) throw new InvalidWorkerConfigError(`${key} must be a positive integer`);
  }
  if (!isPositiveInt(cfg.maxPlanChars) || cfg.maxPlanChars < 100) {
    throw new InvalidWorkerConfigError("maxPlanChars must be an integer ≥ 100");
  }
  if (!isPositiveInt(cfg.concurrency) || cfg.concurrency > 8) {
    throw new InvalidWorkerConfigError("concurrency must be an integer in 1..8");
  }
  if (cfg.pollIntervalMs > cfg.maxPollIntervalMs) {
    throw new InvalidWorkerConfigError("pollIntervalMs must not exceed maxPollIntervalMs");
  }
  if (cfg.heartbeatIntervalMs >= cfg.staleThresholdMs / 2) {
    throw new InvalidWorkerConfigError("heartbeatIntervalMs must be < staleThresholdMs/2 (heartbeat must beat well before staleness)");
  }
  return cfg;
}
