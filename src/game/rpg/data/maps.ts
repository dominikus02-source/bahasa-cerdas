/**
 * Map data — data-driven world definitions.
 *
 * The prototype's world/map/NPC/portal/chest concepts migrate here as pure
 * data. Nothing in `world/` or `rendering/` hardcodes map content; swapping
 * or adding a map never touches engine code.
 */

import type { RPGId } from "../core/constants";
import type { RPGTileMap, RPGWorldEntity, RPGInteractionPoint } from "../world/world-state";

export interface RPGMapDefinition {
  id: RPGId;
  name: string;
  tiles: RPGTileMap;
  entities: RPGWorldEntity[];
  interactions: RPGInteractionPoint[];
  /** Player spawn in normalized coordinates. */
  spawn: { x: number; y: number };
}

const GROUND = "ground.grass";
const PATH = "ground.path";

/** 16x12 grid; row-major. Paths form a loop around the village square. */
function makeTileGrid(): string[] {
  const grid: string[][] = Array.from({ length: 12 }, () =>
    Array.from({ length: 16 }, () => GROUND),
  );
  // Horizontal path across the middle rows.
  for (let y = 5; y <= 6; y++) {
    for (let x = 1; x <= 14; x++) grid[y][x] = PATH;
  }
  // Vertical path connecting top and bottom.
  for (let y = 1; y <= 10; y++) {
    grid[y][7] = PATH;
    grid[y][8] = PATH;
  }
  return grid.flat();
}

/** Suryakerta village square — the starter map placeholder. */
export const MAP_VILLAGE_SQUARE: RPGMapDefinition = {
  id: "map.village-square",
  name: "Alun-Alun Suryakerta",
  tiles: {
    width: 16,
    height: 12,
    tiles: makeTileGrid(),
  },
  entities: [
    { id: "ent.tree.1", type: "tree", position: { x: 0.06, y: 0.18 }, scale: 1, layer: "BEHIND_ENTITIES", solid: true, asset: "tree.round" },
    { id: "ent.tree.2", type: "tree", position: { x: 0.92, y: 0.2 }, scale: 1.15, layer: "BEHIND_ENTITIES", solid: true, asset: "tree.round" },
    { id: "ent.tree.3", type: "tree", position: { x: 0.08, y: 0.78 }, scale: 0.95, layer: "ENTITIES", solid: true, asset: "tree.round" },
    { id: "ent.tree.4", type: "tree", position: { x: 0.94, y: 0.82 }, scale: 1, layer: "ENTITIES", solid: true, asset: "tree.round" },
    { id: "ent.house.1", type: "house", position: { x: 0.22, y: 0.16 }, scale: 1, layer: "BEHIND_ENTITIES", solid: true, asset: "house.village" },
    { id: "ent.house.2", type: "house", position: { x: 0.76, y: 0.16 }, scale: 1, layer: "BEHIND_ENTITIES", solid: true, asset: "house.village" },
    { id: "ent.house.3", type: "house", position: { x: 0.78, y: 0.8 }, scale: 1.05, layer: "ENTITIES", solid: true, asset: "house.village" },
    { id: "ent.bush.1", type: "bush", position: { x: 0.35, y: 0.3 }, scale: 1, layer: "GROUND_DECOR", solid: false, asset: "bush.round" },
    { id: "ent.bush.2", type: "bush", position: { x: 0.62, y: 0.72 }, scale: 1, layer: "GROUND_DECOR", solid: false, asset: "bush.round" },
    { id: "ent.rock.1", type: "rock", position: { x: 0.5, y: 0.32 }, scale: 0.8, layer: "GROUND_DECOR", solid: false, asset: "rock.gray" },
    { id: "ent.flowers.1", type: "flowers", position: { x: 0.42, y: 0.68 }, scale: 1, layer: "GROUND_DECOR", solid: false, asset: "flowers.wild" },
    { id: "ent.fence.1", type: "fence", position: { x: 0.14, y: 0.5 }, scale: 1, layer: "BEHIND_ENTITIES", solid: true, asset: "fence.wood" },
    { id: "ent.fence.2", type: "fence", position: { x: 0.86, y: 0.5 }, scale: 1, layer: "BEHIND_ENTITIES", solid: true, asset: "fence.wood" },
  ],
  interactions: [
    { id: "int.portal.south", kind: "PORTAL", position: { x: 0.5, y: 0.94 }, ref: "map.forest-path" },
    { id: "int.chest.1", kind: "CHEST", position: { x: 0.3, y: 0.55 }, ref: "loot.starter-chest" },
  ],
  spawn: { x: 0.5, y: 0.62 },
};
