/**
 * Player movement — pure functions over authoritative player state.
 *
 * Movement math is unit-testable and server-reusable: the same `stepPlayer`
 * runs locally today and on the authoritative server later (with server-side
 * validation of requested moves). No DOM/canvas/timing dependencies.
 */

import type { RPGPlayerState } from "./player-state";
import type { RPGFacing, RPGVec2 } from "../core/constants";
import { clampToWorld } from "../core/constants";

/** Normalized world units traversed per second at speed 1. */
export const RPG_BASE_SPEED_UNITS_PER_SEC = 0.25;

const DIRECTION_VECTORS: Record<RPGFacing, RPGVec2> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/**
 * Advance a player one fixed step in their facing direction.
 * Solid-entity collision is applied by the caller (world layer) — this stays
 * a pure kinematics function.
 */
export function stepPlayer(player: RPGPlayerState, dtSeconds: number, moving: boolean): RPGPlayerState {
  if (!moving) return player;
  const v = DIRECTION_VECTORS[player.facing];
  const next = clampToWorld({
    x: player.position.x + v.x * RPG_BASE_SPEED_UNITS_PER_SEC * player.stats.speed * dtSeconds,
    y: player.position.y + v.y * RPG_BASE_SPEED_UNITS_PER_SEC * player.stats.speed * dtSeconds,
  });
  return { ...player, position: next };
}

/** Update facing without moving (rotation on input change). */
export function faceDirection(player: RPGPlayerState, facing: RPGFacing): RPGPlayerState {
  return { ...player, facing };
}
