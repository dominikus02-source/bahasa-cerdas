/**
 * Character rendering boundary.
 *
 * Reads `player/player-state.ts` and issues draw instructions. PHASE 0 keeps
 * this a contract + coordinate helper; the sprite pipeline is built when the
 * renderer gets its canvas implementation.
 */

import type { RPGPlayerState } from "../player/player-state";
import { worldToScreen, type RPGCamera } from "./renderer";

export interface RPGCharacterRenderData {
  screen: { x: number; y: number };
  facing: string;
}

export function describeCharacterRender(
  player: RPGPlayerState,
  camera: RPGCamera,
): RPGCharacterRenderData {
  return {
    screen: worldToScreen(player.position, camera),
    facing: player.facing,
  };
}
