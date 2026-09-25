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
  /** MP/level ride the snapshot for skill validation (enemies omit them).
   *  Additive-optional: existing actors without these fields keep working. */
  mp?: number;
  maxMp?: number;
  level?: number;
  /** Asset key resolved by the renderer for battle presentation. */
  asset?: string;
  /** Boss flag drives escape restriction + special attacks. */
  boss?: boolean;
  /** Victory accounting (stamped at startBattle from enemy defs). */
  xp?: number;
  gold?: number;
  /** Prototype spawn-type key (g/w/b/gl/sh/ga/na/tw) for flag/drop rules. */
  prototypeKey?: string;
  /** Deterministic drop resolved at kill time (e.g. "bijih"). */
  dropIntent?: string;
}

/** Terminal battle outcome (written once, see battle-core). */
export type RPGBattleResult = "WIN" | "LOSE" | "FLED";

/** World position to restore when the battle closes. */
export interface RPGBattleOrigin {
  mapId: RPGId;
  x: number;
  y: number;
}

/** Learning substate (P1.8C): a moment inside battle, never a global mode. */
export interface BattleLearningSubstate {
  encounterId: string;
  challengeId: string;
  status: "PENDING" | "RESOLVED";
  attemptId: string;
}

export interface RPGBattleState {
  /** Correlation id (local: crypto.randomUUID — never a damage seed). */
  battleId: RPGId;
  phase: RPGBattlePhase;
  player: RPGBattleActor;
  enemies: RPGBattleActor[];
  turn: number;
  origin: RPGBattleOrigin;
  /** Written exactly once at CHECK RESULT; undefined while fighting. */
  result?: RPGBattleResult;
  /** Active learning moment, if the trigger policy created one. */
  learning?: BattleLearningSubstate;
}

export function createBattle(
  player: RPGBattleActor,
  enemies: RPGBattleActor[],
  opts?: { battleId?: RPGId; origin?: RPGBattleOrigin },
): RPGBattleState {
  return {
    battleId: opts?.battleId ?? crypto.randomUUID(),
    phase: "INTRO",
    player,
    enemies,
    turn: 0,
    origin: opts?.origin ?? { mapId: "", x: 0, y: 0 },
  };
}
