/**
 * Character rendering boundary.
 *
 * Reads `player/player-state.ts` and issues draw instructions. P2.0A: wired
 * to the CANONICAL camera contract (worldToScreenScaled) instead of the
 * removed renderer.ts duplicate. Feet-origin anchoring math lives in
 * ./sprite-math.ts; this module only resolves the screen anchor point.
 */

import type { RPGPlayerState } from "../player/player-state";
import type { RPGCameraState } from "./camera";
import { worldToScreenScaled } from "./camera";

export interface RPGCharacterRenderData {
  /** Screen point of the feet anchor (bottom-center of the sprite). */
  screen: { x: number; y: number };
  facing: string;
}

export function describeCharacterRender(
  player: RPGPlayerState,
  camera: RPGCameraState,
  mapWidthTiles: number,
  mapHeightTiles: number,
): RPGCharacterRenderData {
  return {
    screen: worldToScreenScaled(player.position, camera, mapWidthTiles, mapHeightTiles),
    facing: player.facing,
  };
}
