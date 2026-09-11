/**
 * Battle result appliers — Pendekar Suryakerta (P1.4C BATTLE RUNTIME).
 *
 * Pure functions translating a terminal BattleResultData into authoritative
 * slice updates. The ENGINE owns mutation + dedup (appliedBattleIds);
 * battle-core owns resolution. Neither touches inventory, wallet, or DB:
 *
 * - XP flows through the existing progression boundary (grantXp — production
 *   curve; the prototype/production curve conflict is a Founder decision D1
 *   and is surfaced, not resolved, here).
 * - Gold has no production economy state: the intent is preserved verbatim in
 *   a gold ledger the economy phase will consume (adapter, never dropped).
 * - HP/MP sync + defeat restore follow prototype rules verbatim
 *   (battleVictory full-restore-on-levelup is progression-owned and NOT
 *   replicated: grantXp does not restore, and this module does not invent it).
 * - nagaDead is never produced (battle-core guarantees it; re-asserted here
 *   by type: flagIntents pass through untouched, no additions).
 */

import type { RPGPlayerStats, RPGProgression } from "../player/player-state";
import { grantXp } from "../player/progression";
import type { BattleResultData } from "./battle-core";

export interface GoldIntent {
  battleId: string;
  amount: number;
}

export interface VictoryApplied {
  stats: RPGPlayerStats;
  progression: RPGProgression;
  flagsAdded: Record<string, boolean>;
  deadBossIds: string[];
  goldIntent: GoldIntent | null;
}

/**
 * Apply a WIN result. Idempotent by construction when the caller guards on
 * battleId (engine appliedBattleIds) — this function itself is a pure
 * transform and must be invoked exactly once per result (documented).
 */
export function applyVictory(args: {
  stats: RPGPlayerStats;
  progression: RPGProgression;
  battleHp: number;
  battleMp: number;
  result: BattleResultData;
  /** Boss instance ids among the dead (from the live table). */
  bossIds: ReadonlySet<string>;
}): VictoryApplied {
  const { result } = args;
  return {
    stats: { ...args.stats, hp: args.battleHp, mp: args.battleMp },
    progression: grantXp(args.progression, result.xp),
    flagsAdded: { ...result.flagIntents },
    deadBossIds: result.deadEnemyIds.filter((id) => args.bossIds.has(id)),
    goldIntent:
      result.goldIntent > 0
        ? { battleId: result.battleId, amount: result.goldIntent }
        : null,
  };
}

export interface DefeatApplied {
  hp: number;
  mp: number;
  maxHp: number;
  maxMp: number;
  respawn: { mapId: string; x: number; y: number } | null;
}

/**
 * Apply a LOSE result. HP/MP rule verbatim (prototype battleDefeat:
 * hp = ceil(maxHp/2), mp = full). Respawn passes through from the result
 * (core-computed verbatim rule); null only if the result lacks one.
 */
export function applyDefeat(args: {
  stats: RPGPlayerStats;
  result: BattleResultData;
}): DefeatApplied {
  return {
    hp: Math.ceil(args.stats.maxHp / 2),
    mp: args.stats.maxMp,
    maxHp: args.stats.maxHp,
    maxMp: args.stats.maxMp,
    respawn: args.result.respawn
      ? { mapId: args.result.respawn.mapId, x: args.result.respawn.x, y: args.result.respawn.y }
      : null,
  };
}
