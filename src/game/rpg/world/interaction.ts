/**
 * Interaction system — handles player interactions with world objects.
 *
 * Pipeline:
 *   Input (E/Enter) → INTERACT Command → Find Nearest → Process → Event
 *
 * Supported interactions:
 * - NPC: Opens dialogue (future)
 * - CHEST: Gives loot
 * - PORTAL: Transitions to new map
 *
 * This is CLIENT-OWNED for now; server validates in multiplayer.
 */

import type { RPGId, RPGVec2 } from "../core/constants";
import type { RPGWorldState, RPGInteractionPoint } from "./world-state";
import type { RPGInventory } from "../player/player-state";

/** Interaction result — what happened after interacting. */
export interface RPGInteractionResult {
  /** Whether interaction was successful. */
  success: boolean;
  /** The interaction point that was activated. */
  interaction: RPGInteractionPoint | null;
  /** Type of interaction. */
  type: "NPC" | "CHEST" | "PORTAL" | "NONE";
  /** Payload data (dialogue text, loot items, target map). */
  payload: RPGInteractionPayload;
}

/** Payload varies by interaction type. */
export type RPGInteractionPayload =
  | { kind: "DIALOGUE"; npcId: RPGId; dialogueId: RPGId }
  | { kind: "LOOT"; items: Array<{ itemId: RPGId; quantity: number }> }
  | { kind: "PORTAL"; targetMapId: RPGId }
  | { kind: "NONE" };

/** Interaction range (normalized units). */
const INTERACTION_RANGE = 0.06;

/** Loot tables for chests. */
const LOOT_TABLES: Record<string, Array<{ itemId: RPGId; quantity: number }>> = {
  "loot.starter-chest": [
    { itemId: "equip.keris-singa", quantity: 1 },
    { itemId: "potion.hp", quantity: 3 },
  ],
  "loot.forest-chest": [
    { itemId: "equip.baju-tenun", quantity: 1 },
    { itemId: "potion.hp", quantity: 5 },
  ],
};

/**
 * Find the nearest interaction point within range.
 */
export function findNearestInteraction(
  world: RPGWorldState,
  position: RPGVec2,
  range = INTERACTION_RANGE,
): RPGInteractionPoint | null {
  let nearest: RPGInteractionPoint | null = null;
  let nearestDistance = Infinity;

  for (const point of world.interactions) {
    const dx = position.x - point.position.x;
    const dy = position.y - point.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= range && distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  }

  return nearest;
}

/**
 * Process an interaction and return the result.
 * Pure function — no side effects.
 */
export function processInteraction(
  interaction: RPGInteractionPoint,
  _inventory: RPGInventory,
): RPGInteractionResult {
  switch (interaction.kind) {
    case "NPC": {
      // Future: look up NPC definition, get dialogue tree
      return {
        success: true,
        interaction,
        type: "NPC",
        payload: {
          kind: "DIALOGUE",
          npcId: interaction.ref,
          dialogueId: `dlg.${interaction.ref}.intro`,
        },
      };
    }

    case "CHEST": {
      // Look up loot table
      const loot = LOOT_TABLES[interaction.ref] ?? [];
      return {
        success: true,
        interaction,
        type: "CHEST",
        payload: {
          kind: "LOOT",
          items: loot,
        },
      };
    }

    case "PORTAL": {
      return {
        success: true,
        interaction,
        type: "PORTAL",
        payload: {
          kind: "PORTAL",
          targetMapId: interaction.ref,
        },
      };
    }

    default:
      return {
        success: false,
        interaction: null,
        type: "NONE",
        payload: { kind: "NONE" },
      };
  }
}

/**
 * Check if player is near an interaction point.
 * Returns true if any interactable is within range.
 */
export function isNearInteractable(
  world: RPGWorldState,
  position: RPGVec2,
): boolean {
  return findNearestInteraction(world, position) !== null;
}
