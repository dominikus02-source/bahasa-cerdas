/**
 * Collision detection — pure game logic for world collision.
 *
 * This module is CLIENT-OWNED for now but will become AUTHORITATIVE
 * in multiplayer (server validates moves before applying).
 *
 * Pipeline:
 *   Input → Command → Collision Check → State Change → Event → Rendering
 *
 * Rules:
 * - Collision is pure logic — no DOM/canvas dependencies
 * - Solid entities block movement
 * - Player cannot walk through trees, houses, rocks, fences
 * - Decorative entities (bushes, flowers) do not block
 */

import type { RPGVec2 } from "../core/constants";
import type { RPGWorldEntity, RPGWorldState } from "./world-state";

/** Collision result — what happened when checking a move. */
export interface RPGCollisionResult {
  /** Whether the move is allowed. */
  allowed: boolean;
  /** The position after collision resolution (may be clamped). */
  position: RPGVec2;
  /** The entity that blocked the move, if any. */
  blockedBy: RPGWorldEntity | null;
}

/** Collision radius for the player (normalized units). */
const PLAYER_RADIUS = 0.02;

/** Collision radius for entities (normalized units). */
function getEntityRadius(entity: RPGWorldEntity): number {
  // Scale radius based on entity type and scale
  const baseRadius: Record<string, number> = {
    tree: 0.03,
    house: 0.06,
    rock: 0.02,
    fence: 0.015,
    bush: 0.015,
    flowers: 0.01,
    bamboo: 0.04,
    shrine: 0.055,
    lantern: 0.012,
    bridge: 0.045,
  };
  return (baseRadius[entity.type] ?? 0.02) * entity.scale;
}

/**
 * Check if a circle overlaps with a rectangle (AABB).
 * Used for player-entity collision.
 */
function circleRectOverlap(
  circleCenter: RPGVec2,
  circleRadius: number,
  rectMin: RPGVec2,
  rectMax: RPGVec2,
): boolean {
  // Find closest point on rectangle to circle center
  const closestX = Math.max(rectMin.x, Math.min(circleCenter.x, rectMax.x));
  const closestY = Math.max(rectMin.y, Math.min(circleCenter.y, rectMax.y));

  // Calculate distance from circle center to closest point
  const dx = circleCenter.x - closestX;
  const dy = circleCenter.y - closestY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  return distance < circleRadius;
}

/**
 * Check collision between player position and all solid entities.
 * Returns the resolved position (clamped if blocked).
 */
export function checkCollision(
  world: RPGWorldState,
  position: RPGVec2,
): RPGCollisionResult {
  let resolvedPosition = { ...position };
  let blockedBy: RPGWorldEntity | null = null;

  // Check each solid entity
  for (const entity of world.entities) {
    if (!entity.solid) continue;

    const entityRadius = getEntityRadius(entity);

    // Entity AABB (axis-aligned bounding box)
    const rectMin = {
      x: entity.position.x - entityRadius,
      y: entity.position.y - entityRadius,
    };
    const rectMax = {
      x: entity.position.x + entityRadius,
      y: entity.position.y + entityRadius,
    };

    // Check if player circle overlaps entity rectangle
    if (circleRectOverlap(resolvedPosition, PLAYER_RADIUS, rectMin, rectMax)) {
      // Push player out of entity
      const pushDirection = {
        x: resolvedPosition.x - entity.position.x,
        y: resolvedPosition.y - entity.position.y,
      };

      // Normalize push direction
      const length = Math.sqrt(
        pushDirection.x * pushDirection.x + pushDirection.y * pushDirection.y,
      );

      if (length > 0) {
        // Push player to the edge of the entity
        const normalized = {
          x: pushDirection.x / length,
          y: pushDirection.y / length,
        };

        resolvedPosition = {
          x: entity.position.x + normalized.x * (entityRadius + PLAYER_RADIUS),
          y: entity.position.y + normalized.y * (entityRadius + PLAYER_RADIUS),
        };
      }

      blockedBy = entity;
    }
  }

  return {
    allowed: !blockedBy,
    position: resolvedPosition,
    blockedBy,
  };
}

/**
 * Check if a position is within interaction range of an interactable.
 * Returns the nearest interactable within range, if any.
 */
export function findNearestInteractable(
  world: RPGWorldState,
  position: RPGVec2,
  range = 0.05,
): RPGWorldEntity | null {
  let nearest: RPGWorldEntity | null = null;
  let nearestDistance = Infinity;

  for (const entity of world.entities) {
    // Only check interactable types
    if (!["NPC", "PORTAL", "CHEST"].includes(entity.type)) continue;

    const dx = position.x - entity.position.x;
    const dy = position.y - entity.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < range && distance < nearestDistance) {
      nearest = entity;
      nearestDistance = distance;
    }
  }

  return nearest;
}
