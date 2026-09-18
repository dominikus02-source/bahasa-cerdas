/**
 * Multiplayer event contract.
 *
 * NO network implementation in Phase 0. This file fixes the vocabulary that
 * local gameplay already emits and a future authoritative server will
 * broadcast. Because commands → logic → state → events is the pipeline, the
 * same events work for local UI feedback and remote-player sync.
 */

import type { RPGId } from "../core/constants";
import type { LearningChallenge } from "../learning/rpg-challenge";

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
  | {
      type: "BATTLE_ACTION_RESOLVED";
      battleId: RPGId;
      turn: number;
      actorId: RPGId;
      targetId: RPGId;
      damage: number;
      crit: boolean;
    }
  | {
      type: "BATTLE_VICTORY";
      battleId: RPGId;
      xp: number;
      deadEnemyIds: RPGId[];
    }
  | {
      type: "BATTLE_DEFEAT";
      battleId: RPGId;
      respawn: { mapId: RPGId; x: number; y: number };
    }
  | { type: "DIALOGUE_START"; playerId: RPGId; npcId: RPGId; dialogueId: RPGId; nodeId: RPGId }
  | { type: "DIALOGUE_ADVANCE"; playerId: RPGId; npcId: RPGId; nodeId: RPGId }
  | { type: "DIALOGUE_END"; playerId: RPGId; npcId: RPGId; completed: boolean }
  | { type: "SHOP_OPEN"; playerId: RPGId; npcId: RPGId }
  | {
      type: "SHOP_PURCHASE";
      playerId: RPGId;
      npcId: RPGId;
      itemId: RPGId;
      quantity: number;
      totalPrice: number;
    }
  | { type: "SHOP_CLOSE"; playerId: RPGId; npcId: RPGId }
  | { type: "FORGE_OPEN"; playerId: RPGId; npcId: RPGId }
  | {
      type: "FORGE_REQUEST";
      playerId: RPGId;
      npcId: RPGId;
      equipmentId: RPGId;
      plus: number;
    }
  | { type: "FORGE_CLOSE"; playerId: RPGId; npcId: RPGId }
  | { type: "EQUIP"; playerId: RPGId; itemId: RPGId; slot: "weapon" | "armor" | "accessory" }
  | { type: "GOLD_CHANGED"; playerId: RPGId; balance: number; delta: number; reason: string }
  | { type: "ITEM_GRANTED"; playerId: RPGId; itemId: RPGId; quantity: number; source: string }
  | { type: "ITEM_CONSUMED"; playerId: RPGId; itemId: RPGId; source: string }
  | { type: "EQUIPMENT_UPGRADED"; playerId: RPGId; weaponId: RPGId; plus: number }
  | { type: "QUEST_ADVANCE"; playerId: RPGId; quest: number; kills: number }
  | {
      type: "LEARNING_CHALLENGE";
      battleId: RPGId;
      encounterId: RPGId;
      challengeId: RPGId;
      challenge: LearningChallenge;
    }
  | {
      type: "LEARNING_ANSWERED";
      battleId: RPGId;
      encounterId: RPGId;
      challengeId: RPGId;
      attemptId: RPGId;
      correct: boolean;
    }
  | { type: "INTERACTION"; playerId: RPGId; interactionId: RPGId; result: unknown }
  | {
      type: "MAP_TRANSITION";
      playerId: RPGId;
      fromMapId: RPGId;
      toMapId: RPGId;
      spawn: { x: number; y: number };
    }
  | {
      type: "PORTAL_BLOCKED";
      playerId: RPGId;
      mapId: RPGId;
      x: number;
      y: number;
      requiredFlag: string;
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
