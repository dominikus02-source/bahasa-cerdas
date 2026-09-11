/**
 * Learning trigger policy — Pendekar Suryakerta (P1.8C).
 *
 * Deterministic, configurable answer to "WHEN should the RPG ask?".
 * Default: exactly one learning moment per NON-BOSS battle, at battle start
 * (before the first player action). Bosses are excluded by default — BOSS
 * context exists for explicit/manual encounters, not auto-trigger.
 *
 * The policy is data (not scattered engine checks): callers pass it in,
 * tests pin it, balance changes never touch GameEngine.
 *
 * Pure + deterministic. No React/DOM/storage/network/renderer/RNG.
 */

export interface LearningTriggerPolicy {
  /** Auto-trigger at battle start (before the first player action). */
  triggerOnBattleStart: boolean;
  /** Include boss battles in auto-trigger (default false). */
  includeBosses: boolean;
}

export const DEFAULT_TRIGGER_POLICY: LearningTriggerPolicy = {
  triggerOnBattleStart: true,
  includeBosses: false,
};

/**
 * Decide whether a battle opening earns a learning encounter.
 * battleTurn must be 0 (openings only — never mid-battle reinserts).
 */
export function shouldTriggerLearning(args: {
  policy?: LearningTriggerPolicy;
  isBoss: boolean;
  battleTurn: number;
  hasPool: boolean;
}): boolean {
  const policy = args.policy ?? DEFAULT_TRIGGER_POLICY;
  if (!policy.triggerOnBattleStart) return false;
  if (args.isBoss && !policy.includeBosses) return false;
  if (args.battleTurn !== 0) return false;
  if (!args.hasPool) return false;
  return true;
}
