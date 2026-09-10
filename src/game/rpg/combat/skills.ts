/**
 * Combat-side skill boundary.
 *
 * Skill DEFINITIONS (content) live in `data/skills.ts`; this module resolves
 * definitions for the engine, including the learning-boost contract: a skill
 * with `learningBoost: true` multiplies damage when the learning answer was
 * correct (Learning → Game Effect pipeline).
 */

import type { RPGSkillDefinition } from "../data/skills";
import type { RPGLearningResult } from "../learning/learning-engine";
import { defaultLearningEffectMapper } from "./battle-engine";

/** Resolve the damage multiplier a skill receives from a learning result. */
export function resolveLearningMultiplier(
  skill: RPGSkillDefinition,
  result: RPGLearningResult | null,
): number {
  if (!skill.learningBoost || !result) return 1;
  return defaultLearningEffectMapper(result).multiplier;
}
