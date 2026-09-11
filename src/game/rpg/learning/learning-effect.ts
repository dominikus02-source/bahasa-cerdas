/**
 * RPG learning effect contract — Pendekar Suryakerta (P1.8A).
 *
 * Maps a LearningEvaluation to an RPG consequence WITHOUT inventing numbers:
 * the ONLY numerical policy in this phase is the pre-existing canonical one
 * (correct → ×1.5 bonus damage, otherwise ×1.0 — battle-core compatible via
 * the existing `learningCorrect` battle parameter; formulas untouched).
 *
 * - Incorrect is NEVER punitive here (no death/damage/XP/item/quest loss —
 *   NORMAL signal, canonical non-punitive behavior).
 * - Effect values live behind LearningEffectPolicy (explicit boundary, never
 *   scattered); the default policy mirrors defaultLearningEffectMapper.
 * - Application is idempotent on (challengeId + attemptId): the pure
 *   applySubmission returns the stored evaluation for duplicates
 *   (applied:false) — no double XP/multiplier/quest progress, ever.
 * - Learning lives as a SUBSTATE of battle/quest interaction (no new global
 *   mode): in battle, the effect rides the existing battle resolver input;
 *   with no effect present, battle behavior is byte-identical to baseline.
 *
 * Pure + deterministic. No React/DOM/storage/network/renderer/RNG.
 */

import type { LearningEvaluation } from "./rpg-evaluator";

export type LearningEffectKind = "BONUS_DAMAGE" | "NORMAL_DAMAGE";

export interface LearningEffect {
  kind: LearningEffectKind;
  multiplier: number;
}

/**
 * Explicit policy boundary (§6). Default mirrors the canonical
 * defaultLearningEffectMapper (correct→×1.5, else ×1.0); balance changes
 * happen here, never in GameEngine, never in battle-core.
 */
export interface LearningEffectPolicy {
  correctMultiplier: number;
  incorrectMultiplier: number;
}

export const DEFAULT_LEARNING_POLICY: LearningEffectPolicy = {
  correctMultiplier: 1.5,
  incorrectMultiplier: 1,
};

/** Map an evaluation to an effect under a policy (default = canonical). */
export function resolveLearningEffect(
  evaluation: LearningEvaluation,
  policy: LearningEffectPolicy = DEFAULT_LEARNING_POLICY,
): LearningEffect {
  if (evaluation.signal === "CORRECT") {
    return { kind: "BONUS_DAMAGE", multiplier: policy.correctMultiplier };
  }
  return { kind: "NORMAL_DAMAGE", multiplier: policy.incorrectMultiplier };
}

/** A submitted answer with anti-cheat identity (challenge + attempt). */
export interface LearningSubmission {
  challengeId: string;
  attemptId: string;
  answer: string | null | undefined;
}

export interface SubmissionOutcome {
  evaluation: LearningEvaluation;
  /** False for duplicate (challengeId+attemptId) submissions. */
  applied: boolean;
}

/**
 * Idempotent application over an explicit evaluated-attempts record.
 * The record lives engine-side later; this function only computes.
 * `evaluate` is injected so the applier never touches canonical answers
 * directly (server splits client evaluation from storage).
 */
export function applySubmission(
  evaluated: Record<string, LearningEvaluation>,
  submission: LearningSubmission,
  evaluate: () => LearningEvaluation,
): { record: Record<string, LearningEvaluation>; outcome: SubmissionOutcome } {
  if (!submission.challengeId || !submission.attemptId) {
    throw new Error("submission requires challengeId + attemptId");
  }
  const key = `${submission.challengeId}::${submission.attemptId}`;
  const stored = evaluated[key];
  if (stored) {
    return { record: evaluated, outcome: { evaluation: stored, applied: false } };
  }
  const evaluation = evaluate();
  return {
    record: { ...evaluated, [key]: evaluation },
    outcome: { evaluation, applied: true },
  };
}

/**
 * QUEST integration hook (P1.8C §12/§18): shape a quest-bound signal from
 * an evaluation WITHOUT mutating quest state — the quest engine stays
 * authoritative and decides application later. Null when there is no quest
 * linkage (caller passes no questId).
 */
export interface QuestLearningSignal {
  questId: string;
  challengeId: string;
  signal: "CORRECT" | "INCORRECT";
}

export function questSignalForEvaluation(
  questId: string | undefined,
  challengeId: string,
  evaluation: { signal: "CORRECT" | "INCORRECT" },
): QuestLearningSignal | null {
  if (!questId) return null;
  return { questId, challengeId, signal: evaluation.signal };
}
