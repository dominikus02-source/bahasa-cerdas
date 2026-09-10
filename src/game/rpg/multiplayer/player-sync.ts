/**
 * Remote player representation for multiplayer rendering.
 *
 * PHASE 0: data shape + interpolation contract only. Client-side prediction
 * is NOT implemented; when the server arrives, remote players are advanced by
 * PLAYER_MOVE events and smoothed by `interpolateToward`.
 */

import type { RPGId, RPGVec2, RPGFacing } from "../core/constants";

export interface RPGRemotePlayer {
  playerId: RPGId;
  position: RPGVec2;
  facing: RPGFacing;
  /** Timestamp of the last authoritative position update (ms). */
  lastUpdateAt: number;
}

/** Linear move toward a target — sufficient smoothing until rollback exists. */
export function interpolateToward(p: RPGRemotePlayer, target: RPGVec2, alpha: number): void {
  p.position = {
    x: p.position.x + (target.x - p.position.x) * alpha,
    y: p.position.y + (target.y - p.position.y) * alpha,
  };
}
