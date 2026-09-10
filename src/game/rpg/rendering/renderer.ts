/**
 * Renderer boundary.
 *
 * PHASE 0: defines WHAT the renderer consumes (state in, draw calls out) —
 * not HOW it draws. Keeping rendering strictly downstream of state is what
 * allows the canvas implementation later to change freely without touching
 * gameplay systems.
 */

import type { RPGGameState } from "../core/game-state";

/** Viewport mapping from normalized world space to screen pixels. */
export interface RPGCamera {
  /** Screen size in CSS pixels. */
  width: number;
  height: number;
}

/**
 * Rendering contract. Implementations receive immutable-ish state and issue
 * draw calls; they must never mutate state (that is the engine's job).
 */
export interface RPGRenderer {
  render(state: RPGGameState, camera: RPGCamera): void;
  dispose(): void;
}

/** Convert normalized world coordinates to screen pixels. */
export function worldToScreen(world: { x: number; y: number }, camera: RPGCamera): { x: number; y: number } {
  return { x: world.x * camera.width, y: world.y * camera.height };
}
