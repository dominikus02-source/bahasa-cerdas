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
