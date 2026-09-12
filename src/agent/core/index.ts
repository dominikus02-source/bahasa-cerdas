/**
 * BC Agent Core — public surface.
 *
 * P1 scope ONLY: types, task state machine, attempt isolation, policy,
 * approval, tool contract, canonical hashing, typed errors. Everything is
 * pure — no I/O, no clocks, no randomness, no network, no DB, no AI.
 *
 * P2+ (per P0 roadmap): persistence, worker loop, intelligence port,
 * channels, execution nodes. Those modules import from here.
 */

// Types & lifecycle
export * from "./types";

// Typed errors
export * from "./errors";

// Task state machine
// (withCurrentAttempt / withoutCurrentAttempt are owned by task.ts and
// exported exactly once — the P1 audit removed their duplicate re-export
// from attempt.ts.)
export {
  transitionTask,
  isTransitionLegal,
  createTask,
  withCurrentAttempt,
  withoutCurrentAttempt,
} from "./task";

// Attempt isolation
// (isTerminal is owned by types.ts and exported via `export *` above —
// the P1 audit removed task.ts's duplicate re-export of it.)
export {
  createAttempt,
  createRetryAttempt,
  withDecision,
  withVerification,
  withEvidenceRef,
  withToolExecutionRef,
  finishAttempt,
} from "./attempt";
export type { TaskAttempt, AttemptStatus, PlanStep, PolicyDecisionRef } from "./attempt";

// Canonical hashing
export { canonicalize, hashCanonicalInput } from "./hash";

// Approval contract
export {
  validateApproval,
  consumeApproval,
  rejectApproval,
  revokeApproval,
  expireApproval,
} from "./approval";
export type { Approval, ApprovalStatus, ApprovalCheckResult } from "./approval";

// Tool contract
export { defineTool, validateToolDefinition } from "./tool";
export type {
  ToolDefinition,
  ToolRisk,
  AutonomyLevel,
  ProductionImpact,
  ToolCategory,
  ToolContext,
  ToolResult,
} from "./tool";

// Policy engine
export { evaluatePolicy, decideWithApproval } from "./policy";
export type { PolicyDecision, PolicyEvaluation, ApprovalCandidate } from "./policy";
