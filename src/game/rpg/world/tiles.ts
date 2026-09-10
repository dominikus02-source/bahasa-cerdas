/**
 * Canonical tile collision layer — Pendekar Suryakerta (P1E.2).
 *
 * Tile/grid collision is THE canonical map collision layer (prototype
 * `SOLID` set + `gget` out-of-bounds rule, verbatim). Per-pixel collision
 * is forbidden; sprite dimensions NEVER influence collision; visual assets
 * NEVER define gameplay hitboxes.
 *
 * NOTE: world/collision.ts (circle-vs-entity, normalized space) predates this
 * module and serves the Phase-0 placeholder map. Tile collision here governs
 * canonical maps (data/world-maps.ts). The two systems do not overlap:
 * tile layer answers "is this grid cell walkable", entity layer answers
 * "does this actor overlap that actor".
 */

import type { CanonicalMap } from "../data/world-maps";
import { SOLID_TILES, RPG_TILES } from "../data/world-maps";

/** Grid cell reference (integer tile coordinates). */
export interface TileRef {
  x: number;
  y: number;
}

/** True iff the cell is inside map bounds. */
export function inBounds(map: CanonicalMap, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}

/**
 * Tile id at a cell. Out-of-bounds reads as TR (tree = solid), mirroring
 * prototype `gget` — the map border is therefore always a wall.
 */
export function tileAt(map: CanonicalMap, x: number, y: number): number {
  if (!inBounds(map, x, y)) return RPG_TILES.TR;
  return map.tiles[y * map.width + x];
}

/** True iff the raw tile id blocks movement (prototype SOLID set). */
export function isSolidTile(tileId: number): boolean {
  return SOLID_TILES.has(tileId);
}

/** True iff the cell can be stepped on (in bounds + non-solid tile). */
export function isWalkable(map: CanonicalMap, x: number, y: number): boolean {
  return inBounds(map, x, y) && !isSolidTile(tileAt(map, x, y));
}
