/**
 * World state boundary.
 *
 * The world is a set of independently placeable entities over a tile map —
 * never a single flattened background. Positions are NORMALIZED (0..1) world
 * coordinates (see core/constants.ts) so one map definition renders correctly
 * at any viewport size/orientation.
 *
 * PHASE 0: state shape + invariants only. Map *data* lives in `data/maps.ts`,
 * and the prototype's existing map/NPC/portal/chest concepts migrate here.
 */

import type { RPGId, RPGVec2, RPGLayer } from "../core/constants";

/** Tile identity inside the tile grid; concrete palettes arrive with map data. */
export type RPGTileId = string;

export interface RPGTileMap {
  /** Grid dimensions. World entities use normalized coords, tiles are discrete. */
  width: number;
  height: number;
  /** Row-major tile ids; empty/unset tiles render as the map's default ground. */
  tiles: RPGTileId[];
}

/** A placeable world object: tree, house, bush, rock, flower, fence, prop... */
export interface RPGWorldEntity {
  id: RPGId;
  type: string;
  /** Normalized world position (anchor = base center of the sprite). */
  position: RPGVec2;
  scale: number;
  /** Draw order hint; entities also depth-sort by position.y. */
  layer: RPGLayer;
  /** Blocks movement when true (houses, rocks); false for decor like flowers. */
  solid: boolean;
  /** Asset key resolved by the renderer; swap values without touching logic. */
  asset: string;
}

/** Interaction points migrated from the prototype: NPCs, portals, chests. */
export interface RPGInteractionPoint {
  id: RPGId;
  kind: "NPC" | "PORTAL" | "CHEST";
  position: RPGVec2;
  /** Data ids: NPC id in data/npcs, target map id for portals, loot table for chests. */
  ref: RPGId;
}

/** Authoritative world state slice. */
export interface RPGWorldState {
  mapId: RPGId;
  tiles: RPGTileMap;
  entities: RPGWorldEntity[];
  interactions: RPGInteractionPoint[];
}

/** Minimal invariant checks for a world slice. */
export function validateWorldState(world: RPGWorldState): string[] {
  const errors: string[] = [];
  if (world.tiles.tiles.length !== world.tiles.width * world.tiles.height) {
    errors.push(`tiles length ${world.tiles.tiles.length} != ${world.tiles.width}x${world.tiles.height}`);
  }
  for (const e of world.entities) {
    if (e.position.x < 0 || e.position.x > 1 || e.position.y < 0 || e.position.y > 1) {
      errors.push(`entity ${e.id} position out of normalized bounds`);
    }
  }
  return errors;
}
