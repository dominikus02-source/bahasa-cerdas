/**
 * Player progression — XP/level boundary.
 *
 * Ownership: AUTHORITATIVE. Only the progression module mutates level/xp so
 * reward flows (battle victory, quest turn-in, learning streaks) go through
 * one auditable path.
 */

import type { RPGProgression } from "./player-state";

/** Linear starter curve; replaced by data-driven curves in a later phase. */
export const RPG_XP_BASE = 100;
export const RPG_XP_GROWTH = 1.25;

export function xpForLevel(level: number): number {
  return Math.round(RPG_XP_BASE * Math.pow(RPG_XP_GROWTH, level - 1));
}

/** Grant XP; handles level-ups (possibly multiple). Returns new progression. */
export function grantXp(progression: RPGProgression, amount: number): RPGProgression {
  let { level, xp } = progression;
  let xpToNextLevel = progression.xpToNextLevel;
  xp += amount;
  while (xp >= xpToNextLevel) {
    xp -= xpToNextLevel;
    level += 1;
    xpToNextLevel = xpForLevel(level);
  }
  return { level, xp, xpToNextLevel };
}

/**
 * Canonical prototype level growth per level gained (verbatim):
 * +14 maxHp, +6 maxMp, +2 attack, +1 defense. Additive helper — the engine
 * applies it after grantXp reports new levels and restores HP/MP full
 * (prototype battleVictory verbatim). No RNG. D1 curve decision untouched:
 * this consumes grantXp output, it does not choose the curve.
 */
export function applyLevelGrowth(
  stats: { maxHp: number; maxMp: number; attack: number; defense: number },
  levelsGained: number,
): { maxHp: number; maxMp: number; attack: number; defense: number } {
  if (levelsGained <= 0) return { ...stats };
  return {
    maxHp: stats.maxHp + 14 * levelsGained,
    maxMp: stats.maxMp + 6 * levelsGained,
    attack: stats.attack + 2 * levelsGained,
    defense: stats.defense + 1 * levelsGained,
  };
}
