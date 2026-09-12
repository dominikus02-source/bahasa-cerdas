/**
 * BC Agent P2 — persistence public surface.
 *
 * The rest of the app (and future P3+ modules) import from here only.
 * The P1 core remains untouched and dependency-free.
 */

export { AgentTaskService, CLAIMABLE_STATUSES, STALE_ATTEMPT_THRESHOLD_MS } from "./service";
export {
  AgentPersistenceError,
  AgentNotFoundError,
  AgentConflictError,
  AgentConcurrentModificationError,
  AgentClaimConflictError,
} from "./errors";
export type { PersistedTaskEvent } from "./mappers";
