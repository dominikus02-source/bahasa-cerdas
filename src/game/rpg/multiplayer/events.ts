/**
 * Multiplayer event contract.
 *
 * NO network implementation in Phase 0. This file fixes the vocabulary that
 * local gameplay already emits and a future authoritative server will
 * broadcast. Because commands → logic → state → events is the pipeline, the
 * same events work for local UI feedback and remote-player sync.
 */

import type { RPGId } from "../core/constants";

export type RPGEvent =
  | { type: "PLAYER_MOVE"; playerId: RPGId; x: number; y: number }
  | { type: "PLAYER_STOP"; playerId: RPGId }
  | { type: "PLAYER_ATTACK"; playerId: RPGId; targetId: RPGId; skillId: RPGId }
  | { type: "ENTITY_SPAWN"; entityId: RPGId; entityType: string }
  | { type: "ENTITY_DESPAWN"; entityId: RPGId }
  | { type: "QUEST_PROGRESS"; playerId: RPGId; questId: RPGId; progress: number }
  | { type: "LEARNING_RESULT"; playerId: RPGId; challengeId: RPGId; correct: boolean }
  | { type: "BATTLE_START"; battleId: RPGId; participantIds: RPGId[] }
  | { type: "BATTLE_END"; battleId: RPGId; winnerId: RPGId | null }
  | { type: "INTERACTION"; playerId: RPGId; interactionId: RPGId; result: unknown }
  | {
      type: "MAP_TRANSITION";
      playerId: RPGId;
      fromMapId: RPGId;
      toMapId: RPGId;
      spawn: { x: number; y: number };
    };

export type RPGEventHandler = (event: RPGEvent) => void;

/** Minimal event bus so systems can emit/subscribe without a transport. */
export function createEventBus() {
  const handlers = new Set<RPGEventHandler>();
  return {
    emit(event: RPGEvent): void {
      for (const h of handlers) h(event);
    },
    subscribe(handler: RPGEventHandler): () => void {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
  };
}

export type RPGEventBus = ReturnType<typeof createEventBus>;
