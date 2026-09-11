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

// NOTE (P2.0A): the duplicate worldToScreen that lived here (plain scale,
// no camera) is REMOVED. The canonical contract is worldToScreenScaled in
// ./camera.ts (legacy worldToScreen there is pinned for old callers).
// Do not reintroduce a second transform.
