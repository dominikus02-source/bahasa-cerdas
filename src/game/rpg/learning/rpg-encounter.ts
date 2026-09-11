/**
 * RPG learning encounter — Pendekar Suryakerta (P1.8B).
 *
 * Pure encounter lifecycle for ONE explicitly-requested learning moment
 * (§18: no random spam, no procedural placement — the runtime asks):
 *
 *   CREATED → PRESENTED → ANSWERED → RESOLVED
 *
 * - Identity is deterministic: `enc:<context>:<encounterKey>` (§7, §41).
 * - Answer application reuses the P1.8A idempotent applier
 *   (challengeId + attemptId exactly-once, §13/§17).
 * - Learning is a SUBSTATE of battle/quest interaction (§19): no new global
 *   mode is created here; the encounter record is consumed by whichever
 *   runtime owns the moment.
 * - Nothing persists UI state (§18): the record is transient; a future
 *   LearningAttempt row (persistence boundary, selector doc-block) would
 *   carry attempts across sessions.
 *
 * Pure + deterministic. No React/DOM/storage/network/renderer/RNG.
 */

import type { LearningContext } from "./rpg-challenge";
import type { LearningEvaluation } from "./rpg-evaluator";
import { applySubmission } from "./learning-effect";

export type LearningEncounterStatus = "CREATED" | "PRESENTED" | "ANSWERED" | "RESOLVED";

export interface LearningEncounter {
  /** Deterministic identity: `enc:<context-lower>:<encounterKey>`. */
  encounterId: string;
  context: LearningContext;
  challengeId: string;
  /** Seed used for selection (audit/replay). */
  seed: string;
  status: LearningEncounterStatus;
  /** Evaluated attempts record (P1.8A applier state, transient). */
  evaluated: Record<string, LearningEvaluation>;
  /** Last evaluation, once answered. */
  evaluation?: LearningEvaluation;
}

/** Create an encounter for an explicitly-requested moment. Pure. */
export function createEncounter(args: {
  encounterKey: string;
  context: LearningContext;
  challengeId: string;
  seed: string;
}): LearningEncounter {
  const context = args.context.toLowerCase();
  return {
    encounterId: `enc:${context}:${args.encounterKey}`,
    context: args.context,
    challengeId: args.challengeId,
    seed: args.seed,
    status: "CREATED",
    evaluated: {},
  };
}

/** Mark presented (client shows the safe challenge). */
export function presentEncounter(encounter: LearningEncounter): LearningEncounter {
  if (encounter.status !== "CREATED") return encounter;
  return { ...encounter, status: "PRESENTED" };
}

/**
 * Answer an encounter. `evaluate` is the server-side evaluation closure
 * (owns the canonical answer). Duplicate (challengeId+attemptId) calls
 * return the stored evaluation with applied:false — never double effects.
 * Invalid lifecycle transitions (e.g. answering a RESOLVED encounter)
 * are deterministic rejections (null evaluation, applied:false).
 */
export function answerEncounter(
  encounter: LearningEncounter,
  attemptId: string,
  evaluate: () => LearningEvaluation,
): { encounter: LearningEncounter; applied: boolean; evaluation: LearningEvaluation | null } {
  if (!attemptId) {
    return { encounter, applied: false, evaluation: null };
  }
  if (encounter.status === "RESOLVED") {
    const stored = encounter.evaluated[`${encounter.challengeId}::${attemptId}`];
    return { encounter, applied: false, evaluation: stored ?? null };
  }
  if (encounter.status !== "PRESENTED" && encounter.status !== "ANSWERED") {
    return { encounter, applied: false, evaluation: null };
  }
  // Single evaluation (pure/deterministic); identity checked before storing.
  const evaluation = evaluate();
  if (evaluation.challengeId !== encounter.challengeId) {
    return { encounter, applied: false, evaluation: null };
  }
  const { record, outcome } = applySubmission(encounter.evaluated, {
    challengeId: encounter.challengeId,
    attemptId,
    answer: null,
  }, () => evaluation);
  return {
    encounter: {
      ...encounter,
      evaluated: record,
      evaluation: outcome.evaluation,
      status: "ANSWERED",
    },
    applied: outcome.applied,
    evaluation: outcome.evaluation,
  };
}

/** Resolve an answered encounter (effect application happens downstream). */
export function resolveEncounter(
  encounter: LearningEncounter,
): LearningEncounter {
  if (encounter.status !== "ANSWERED") return encounter;
  return { ...encounter, status: "RESOLVED" };
}
