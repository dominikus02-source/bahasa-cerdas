/**
 * Canonical RPG game state — the single composition root for all subsystem state.
 *
 * OWNERSHIP CONTRACT (the most important rule in this codebase):
 *
 *   AUTHORITATIVE (server-owned once multiplayer lands — clients receive events,
 *   never write these directly):
 *     player.position, player.stats, player.progression, player.inventory,
 *     player.equipment, world entity positions, battle resolution/results,
 *     quest progress, learning results, rewards.
 *
 *   CLIENT-OWNED (optimistic/presentational — server may correct via events):
 *     camera, animation phase, transient input, local visual effects,
 *     UI open/closed state.
 *
 * State is plain serializable data. No class instances, no DOM references, no
 * canvas handles — that is what makes it transferable to an authoritative
 * server and diffable for multiplayer sync later.
 */

import type { RPGId, RPGGameMode, RPGVec2, RPGFacing } from "./constants";
import type { RPGWorldState } from "../world/world-state";
import type { RPGBattleState } from "../combat/battle-state";
import type { RPGQuestState } from "../quests/quest-engine";
import type { RPGLearningState } from "../learning/learning-engine";

/** Session identity. Authoritative once a server exists. */
export interface RPGSessionState {
  sessionId: RPGId;
  /** Local player identity; becomes a server-issued id in multiplayer. */
  playerId: RPGId;
  startedAt: number;
  mode: RPGGameMode;
}

/** The single game state tree. Subsystems own their slice; nothing else may mutate it. */
export interface RPGGameState {
  session: RPGSessionState;
  player: import("../player/player-state").RPGPlayerState;
  world: RPGWorldState;
  /** `null` while exploring; battle is entered/left through the battle engine. */
  battle: RPGBattleState | null;
  quests: RPGQuestState;
  learning: RPGLearningState;
}

/**
 * Pure reducer for state transitions. Command handling later flows through
 * this function, which keeps state changes serializable and replayable —
 * the prerequisite for server authority and rollback-based sync.
 */
export type RPGStateReducer = (state: RPGGameState) => RPGGameState;

/** Shallow-clone helper: explicit immutable updates without a state library. */
export function cloneState(state: RPGGameState): RPGGameState {
  return { ...state };
}

/** Initial minimal state; subsystem slices are created by their own modules. */
export function createInitialGameState(playerId: RPGId): RPGGameState {
  return {
    session: {
      sessionId: crypto.randomUUID(),
      playerId,
      startedAt: Date.now(),
      mode: "ADVENTURE",
    },
    // Player/world/quest/learning slices are composed in later phases as they
    // gain real content; the boundary (types above) is fixed from day one.
    player: {} as import("../player/player-state").RPGPlayerState,
    world: {} as RPGWorldState,
    battle: null,
    quests: {} as RPGQuestState,
    learning: {} as RPGLearningState,
  };
}

/** Convenience types re-exported for subsystem modules. */
export type { RPGVec2, RPGFacing };
