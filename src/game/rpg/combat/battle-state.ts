/**
 * Battle state boundary.
 *
 * Battle state is plain data, computed by `battle-engine.ts` and rendered by
 * `rendering/`. Combat resolution must run without DOM/canvas so the exact
 * same engine can later run server-side (authoritative multiplayer).
 */

import type { RPGId } from "../core/constants";

export type RPGBattlePhase = "INTRO" | "CHALLENGE" | "RESOLVE" | "VICTORY" | "DEFEAT";

/** Snapshot of one combatant for the duration of a battle. */
export interface RPGBattleActor {
  id: RPGId;
  name: string;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
}

export interface RPGBattleState {
  phase: RPGBattlePhase;
  player: RPGBattleActor;
  enemies: RPGBattleActor[];
  turn: number;
}

export function createBattle(
  player: RPGBattleActor,
  enemies: RPGBattleActor[],
): RPGBattleState {
  return { phase: "INTRO", player, enemies, turn: 0 };
}
