/**
 * Tile rendering boundary.
 *
 * PHASE 0: resolves tile ids → asset keys for the renderer. The visual style
 * (flat placeholder colors today, hand-painted tiles later) is entirely a
 * renderer/asset concern; this mapping is pure data.
 */

import type { RPGTileId } from "../world/world-state";

/** Maps tile id → asset key. Rebind at runtime for themed tilesets. */
export type RPGTileAssetResolver = (tileId: RPGTileId) => string;

/** Default resolver: tiles render by their own id as asset key. */
export function defaultTileResolver(tileId: RPGTileId): string {
  return tileId;
}
