/**
 * Learning runtime orchestration — Pendekar Suryakerta (P1.8C hardening).
 *
 * Pure glue between trigger/selector/encounter/evaluator/effect.
 * The engine calls these and owns state/events; ALL branching decisions live
 * here so the full loop is runtime-testable without DOM:
 *
 *   triggerBattleLearning → submitBattleAnswer → (engine injects effect)
 *
 * No React/DOM/storage/network/renderer/RNG. No battle mutation (the engine
 * applies outcomes to battle state). No quest/economy writes.
 */

import type { LearningContext, ResolvedChallenge, SoalLike } from "./rpg-challenge";
import { selectChallenge, type SelectionContext } from "./rpg-challenge-selector";
import {
  createEncounter,
  presentEncounter,
  answerEncounter,
  resolveEncounter,
  type LearningEncounter,
} from "./rpg-encounter";

export type { LearningEncounter };
import { evaluateAnswer, type LearningEvaluation } from "./rpg-evaluator";
import { resolveLearningEffect, type LearningEffect } from "./learning-effect";
import {
  shouldTriggerLearning,
  type LearningTriggerPolicy,
} from "./learning-trigger";
import { toClientChallenge, type LearningChallenge } from "./rpg-challenge";
import type { BattleLearningSubstate } from "../combat/battle-state";

/* ---------- Trigger ---------- */

export interface TriggerInput {
  policy?: LearningTriggerPolicy;
  isBoss: boolean;
  /** Battle turn at trigger time (openings only: 0). */
  battleTurn: number;
  pool: SoalLike[];
  encounterId: string;
  enemyId: string;
  seed: string;
  level: number;
}

export type TriggerResult =
  | { triggered: false; reason: "POLICY_OFF" | "BOSS_EXCLUDED" | "EMPTY_POOL" | "NO_ELIGIBLE" }
  | {
      triggered: true;
      substate: BattleLearningSubstate;
      encounter: LearningEncounter;
      resolved: ResolvedChallenge;
      client: LearningChallenge;
    };

/** Decide + build one battle learning moment (pure; engine stores results). */
export function triggerBattleLearning(input: TriggerInput): TriggerResult {
  const policy = input.policy;
  if (policy && !policy.triggerOnBattleStart) {
    return { triggered: false, reason: "POLICY_OFF" };
  }
  if (input.isBoss && !(policy?.includeBosses === true)) {
    return { triggered: false, reason: "BOSS_EXCLUDED" };
  }
  if (input.battleTurn !== 0) {
    return { triggered: false, reason: "POLICY_OFF" };
  }
  if (input.pool.length === 0) {
    return { triggered: false, reason: "EMPTY_POOL" };
  }
  const selCtx: SelectionContext = {
    encounterId: input.encounterId,
    context: "BATTLE" satisfies LearningContext,
    enemyId: input.enemyId,
    seed: input.seed,
    level: input.level,
  };
  const sel = selectChallenge(input.pool, selCtx);
  if (sel.outcome !== "SELECTED") {
    return { triggered: false, reason: "NO_ELIGIBLE" };
  }
  const encounter = presentEncounter(
    createEncounter({
      encounterKey: input.encounterId,
      context: "BATTLE",
      challengeId: sel.resolved.challengeId,
      seed: input.seed,
    }),
  );
  const attemptId = `${encounter.encounterId}:attempt-0`;
  return {
    triggered: true,
    substate: {
      encounterId: encounter.encounterId,
      challengeId: sel.resolved.challengeId,
      status: "PENDING",
      attemptId,
    },
    encounter,
    resolved: sel.resolved,
    client: toClientChallenge(sel.resolved),
  };
}

/* ---------- Submit ---------- */

export interface SubmitInput {
  substate: BattleLearningSubstate | undefined;
  encounter: LearningEncounter | null;
  /** Server-side resolved challenge (never client input). */
  resolved: ResolvedChallenge | undefined;
  answer: string | null | undefined;
  /** True once the battle reached WIN/LOSE/FLED. */
  battleTerminal: boolean;
  /** Attempt id claimed by the submission (engine-minted per encounter). */
  attemptId: string;
  /** Challenge id claimed by the submission (must match the substate). */
  claimedChallengeId: string;
}

export type SubmitResult =
  | { accepted: false; reason: "NO_PENDING" | "ID_MISMATCH" | "NO_DATA" | "TERMINAL" | "DUPLICATE" }
  | {
      accepted: true;
      evaluation: LearningEvaluation;
      effect: LearningEffect;
      encounter: LearningEncounter;
      correct: boolean;
    };

/**
 * Evaluate one answer through the canonical pipeline.
 * Exactly-once per encounter: only a PENDING substate with matching ids and
 * a live encounter object is accepted; everything else is a deterministic
 * rejection with no mutation and no RNG draw.
 */
export function submitBattleAnswer(input: SubmitInput): SubmitResult {
  const { substate, encounter, resolved } = input;
  if (input.battleTerminal) return { accepted: false, reason: "TERMINAL" };
  if (!substate || substate.status !== "PENDING") {
    return { accepted: false, reason: "NO_PENDING" };
  }
  if (input.claimedChallengeId !== substate.challengeId) {
    return { accepted: false, reason: "ID_MISMATCH" };
  }
  if (!encounter || encounter.challengeId !== substate.challengeId) {
    return { accepted: false, reason: "ID_MISMATCH" };
  }
  if (!resolved || resolved.challengeId !== substate.challengeId) {
    return { accepted: false, reason: "NO_DATA" };
  }
  if (input.attemptId !== substate.attemptId) {
    return { accepted: false, reason: "DUPLICATE" };
  }
  const evaluation = evaluateAnswer(resolved, input.answer);
  const effect = resolveLearningEffect(evaluation);
  const ans = answerEncounter(encounter, substate.attemptId, () => evaluation);
  if (!ans.applied) return { accepted: false, reason: "DUPLICATE" };
  return {
    accepted: true,
    evaluation,
    effect,
    encounter: resolveEncounter(ans.encounter),
    correct: effect.kind === "BONUS_DAMAGE",
  };
}
