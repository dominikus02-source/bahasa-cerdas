/**
 * BC Agent P2 — persistence-layer errors.
 *
 * Maps database-level failures onto the typed BC Agent error taxonomy so
 * callers never branch on raw Prisma errors. Every class carries a stable
 * `code` (same convention as src/agent/core/errors.ts). The original Prisma
 * error is preserved as `cause` for diagnostics but is never the caller's
 * contract.
 */

import { AgentError } from "../core/errors";

export class AgentPersistenceError extends AgentError {
  readonly code = "AGENT_PERSISTENCE_ERROR";
  constructor(message: string, cause?: unknown) {
    super(message);
    if (cause !== undefined) this.cause = cause;
  }
}

/** Entity does not exist (task, attempt, approval). */
export class AgentNotFoundError extends AgentError {
  readonly code = "AGENT_NOT_FOUND";
  constructor(
    public readonly entity: "task" | "attempt" | "approval" | "event",
    public readonly id: string
  ) {
    super(`${entity} ${id} not found`);
  }
}

/** Unique/PK violation or concurrent-claim conflict at the DB level. */
export class AgentConflictError extends AgentError {
  readonly code = "AGENT_CONFLICT";
  constructor(
    public readonly entity: string,
    public readonly reason: string,
    cause?: unknown
  ) {
    super(`Conflict on ${entity}: ${reason}`);
    if (cause !== undefined) this.cause = cause;
  }
}

/** A guarded write lost a race (row changed between read and conditional update). */
export class AgentConcurrentModificationError extends AgentError {
  readonly code = "AGENT_CONCURRENT_MODIFICATION";
  constructor(
    public readonly entity: string,
    public readonly id: string,
    cause?: unknown
  ) {
    super(`${entity} ${id} was modified concurrently`);
    if (cause !== undefined) this.cause = cause;
  }
}

/** Claim eligibility violated (task not claimable in its current status). */
export class AgentClaimConflictError extends AgentError {
  readonly code = "AGENT_CLAIM_CONFLICT";
  constructor(
    public readonly taskId: string,
    public readonly status: string
  ) {
    super(`Task ${taskId} is not claimable (status ${status})`);
  }
}
