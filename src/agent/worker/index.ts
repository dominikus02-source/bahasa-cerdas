/**
 * BC Agent P5 — worker public surface.
 *
 * The composition root (`run.ts`) wires: P2 task service, P3 intelligence
 * adapter, P4 registry/executor, and this loop. Nothing in this module
 * knows about providers, tools' internals, or channel transports.
 */

export { parseWorkerConfig, InvalidWorkerConfigError, BACKOFF_LADDER_MS } from "./config";
export type { WorkerConfig } from "./config";
export { WORKER_LOG_EVENTS, createWorkerLogger, defaultLogSink } from "./logger";
export type { WorkerLogger, WorkerLogEvent, WorkerLogLine, WorkerLogSink } from "./logger";
export { planResponseSchema, validatePlan, PLAN_LIMITS } from "./plan";
export type { AgentPlan, ProposedAction, PlanValidationResult } from "./plan";
export { reclaimStaleAttempt, failOrphanedTask, parseLease } from "./lease";
export type { AttemptLease } from "./lease";
export { verifyAttemptCompletion } from "./verify";
export type { VerificationResult, VerificationStatus } from "./verify";
export { buildTaskReport } from "./report";
export type { TaskReport, TaskOutcome } from "./report";
export { recordExecution, recordEvidence } from "./execution-store";
export { Worker, InvalidPlanError } from "./loop";
export type { WorkerDeps, WorkerHealth, StopReason } from "./loop";
