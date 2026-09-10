/**
 * Battle engine contract.
 *
 * Combat calculation is PURE — no DOM, no canvas, no React. The engine
 * consumes state + inputs and produces new state + events, which is exactly
 * what a server-authoritative multiplayer battle needs later.
 *
 * PHASE 0: pure functions for damage resolution and phase transitions.
 * Turn scheduling and full encounter flow arrive with the combat phase.
 */

import type { RPGBattleState, RPGBattleActor } from "./battle-state";
import type { RPGEvent } from "../multiplayer/events";
import type { RPGLearningResult, RPGLearningEffect } from "../learning/learning-engine";
import type { RPGSkillDefinition } from "../data/skills";

/** Resolve damage of one skill use. Pure: returns values, mutates nothing. */
export function computeDamage(
  attacker: RPGBattleActor,
  defender: RPGBattleActor,
  skill: Pick<RPGSkillDefinition, "baseDamage">,
  /** Learning multiplier (1.0 = normal; >1 from a correct answer). */
  learningMultiplier = 1,
): { damage: number; learningMultiplier: number } {
  const raw = Math.max(1, skill.baseDamage + attacker.attack - defender.defense);
  return { damage: Math.round(raw * learningMultiplier), learningMultiplier };
}

/** Default learning result → effect mapping (correct answer = bonus damage). */
export const defaultLearningEffectMapper: (result: RPGLearningResult) => RPGLearningEffect = (
  result,
) => ({ kind: result.correct ? "BONUS_DAMAGE" : "NORMAL_DAMAGE", multiplier: result.correct ? 1.5 : 1 });

/** Apply damage to an actor, clamping at 0. Returns the updated actor copy. */
export function applyDamage(actor: RPGBattleActor, damage: number): RPGBattleActor {
  return { ...actor, hp: Math.max(0, actor.hp - damage) };
}

/** Transition a battle's phase (e.g. after intro cinematic or final blow). */
export function transitionPhase(state: RPGBattleState, phase: RPGBattleState["phase"]): RPGBattleState {
  return { ...state, phase };
}

/** Battle-related events emitted by the engine (contract, not transport). */
export type RPGBattleEvent = Extract<RPGEvent, { type: "BATTLE_START" | "BATTLE_END" }>;
