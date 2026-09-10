/**
 * Learning state boundary.
 *
 * Learning is a FIRST-CLASS system, not a UI overlay: challenges feed results,
 * results feed game effects (correct answer → bonus damage, wrong answer →
 * normal damage / risk). The mapping result → effect lives in the combat
 * engine; this module owns the learning-specific state and contracts.
 *
 * PHASE 0: state + contracts. Challenge content authoring comes later.
 */

import type { RPGId } from "../core/constants";

/** Learner profile driving challenge selection difficulty. */
export interface RPGLearnerProfile {
  playerId: RPGId;
  /** Coarse mastery per skill tag (e.g. "sinonim", "ejaan"); 0..1. */
  mastery: Record<string, number>;
}

export interface RPGLearningState {
  profile: RPGLearnerProfile;
  /** Currently presented challenge id, if any. */
  activeChallengeId: RPGId | null;
}

/**
 * A concrete challenge the player answers. Content/schema of the prompt is
 * owned by `challenge-types.ts`; the engine only needs identity + metadata.
 */
export interface RPGLearningChallenge {
  id: RPGId;
  /** Skill tag used for mastery tracking. */
  skillTag: string;
  /** Display context (battle interruption, quest dialogue, free practice). */
  context: RPGLearningContext;
}

export type RPGLearningContext = "BATTLE" | "QUEST" | "PRACTICE";

export interface RPGLearningResult {
  challengeId: RPGId;
  playerId: RPGId;
  correct: boolean;
  /** ms the player took; feeds adaptive difficulty later. */
  timeMs: number;
}

/** Effect the game applies from a learning result. */
export interface RPGLearningEffect {
  kind: "BONUS_DAMAGE" | "NORMAL_DAMAGE" | "PENALTY";
  multiplier: number;
}

/** Pure contract: map a result to a gameplay effect (implemented in combat phase). */
export type RPGLearningEffectMapper = (result: RPGLearningResult) => RPGLearningEffect;

/** Authoritative recording of a result; returns updated learning state. */
export function recordLearningResult(
  state: RPGLearningState,
  result: RPGLearningResult,
): RPGLearningState {
  return { ...state, activeChallengeId: null };
}
