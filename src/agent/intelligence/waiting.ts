/**
 * BC Agent P3 — WAITING_INTELLIGENCE helper (§4).
 *
 * Mapping rule (single source of truth for the Agent loop):
 *
 *   recoverable (timeout / rate limit / unavailable / provider error)
 *     → RUNNING --INTELLIGENCE_WAIT--> WAITING_INTELLIGENCE
 *       (durable via P2 AgentTaskService; later INTELLIGENCE_RECOVERED → RUNNING)
 *
 *   permanent (auth error / invalid request / response invalid after bounded
 *     retry) → task --FAILURE--> FAILED
 *       (re-entry only via P2 retryTask, which creates a fresh attempt)
 *
 * The adapter NEVER retries past its bound into an indefinite wait, and a
 * provider failure never silently creates a new TaskAttempt — task retry
 * stays an explicit P2 operation (§12).
 */

import type { AgentTaskService } from "../persistence/service";
import { InvalidTaskTransitionError } from "../core/errors";
import { IntelligenceError, isRecoverableIntelligenceError } from "./errors";

export type IntelligenceFailureDisposition = "WAITING_INTELLIGENCE" | "FAILED";

export interface IntelligenceFailureOutcome {
  readonly disposition: IntelligenceFailureDisposition;
  readonly category: IntelligenceError["category"];
  readonly recoverable: boolean;
}

/** Classify without touching task state (pure decision). */
export function classifyIntelligenceFailure(e: unknown): IntelligenceFailureOutcome {
  if (isRecoverableIntelligenceError(e)) {
    return { disposition: "WAITING_INTELLIGENCE", category: e.category, recoverable: true };
  }
  const category = e instanceof IntelligenceError ? e.category : "INTELLIGENCE_PROVIDER_ERROR";
  return { disposition: "FAILED", category, recoverable: false };
}

/**
 * Handle a provider failure for a RUNNING task durably.
 *
 * Recoverable → INTELLIGENCE_WAIT transition (task becomes
 * WAITING_INTELLIGENCE; the P2 event log records category metadata).
 * Permanent   → FAILURE transition (task becomes FAILED; recovery only
 * through explicit retryTask elsewhere).
 *
 * Returns the disposition applied. Race losses (task concurrently moved —
 * including a duplicate recoverable failure while already WAITING_INTELLIGENCE)
 * return the typed outcome unchanged; only unexpected persistence-layer
 * failures throw (the intelligence error itself is captured in the audit
 * event metadata).
 */
export async function handleIntelligenceFailure(
  service: AgentTaskService,
  taskId: string,
  error: unknown,
  actor = "AGENT"
): Promise<IntelligenceFailureOutcome> {
  const outcome = classifyIntelligenceFailure(error);

  if (outcome.disposition === "WAITING_INTELLIGENCE") {
    try {
      await service.transitionTask(taskId, { type: "INTELLIGENCE_WAIT" }, {
        actor,
        metadata: { intelligenceCategory: outcome.category },
      });
    } catch (e) {
      // Race-safe, same as the permanent branch: a second recoverable failure
      // arriving while the task is already WAITING_INTELLIGENCE (premature
      // retry, loop bug, concurrent handler) makes INTELLIGENCE_WAIT illegal —
      // the state is already what we want, so return the typed outcome instead
      // of crashing the caller with a raw transition error.
      if (e instanceof InvalidTaskTransitionError) return outcome;
      throw e;
    }
    return outcome;
  }

  const reason =
    error instanceof IntelligenceError
      ? `${outcome.category}`
      : "INTELLIGENCE_PROVIDER_ERROR";
  try {
    await service.transitionTask(taskId, { type: "FAILURE", reason }, {
      actor,
      metadata: { intelligenceCategory: outcome.category },
    });
  } catch (e) {
    // A task that was concurrently cancelled (or otherwise moved) makes the
    // FAILURE transition illegal — that's a legitimate race, not a bug.
    if (e instanceof InvalidTaskTransitionError) return outcome;
    throw e;
  }
  return outcome;
}

/**
 * Resume a WAITING_INTELLIGENCE task after intelligence becomes reachable
 * again (manual check, sweeper, or operator action). Uses the legal
 * INTELLIGENCE_RECOVERED transition back to RUNNING; the current attempt
 * continues — no new attempt is created here.
 */
export async function resumeIntelligenceWait(
  service: AgentTaskService,
  taskId: string,
  actor = "AGENT"
): Promise<void> {
  await service.transitionTask(taskId, { type: "INTELLIGENCE_RECOVERED" }, { actor });
}
