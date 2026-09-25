/**
 * Map tile → visual asset binding — Pendekar Suryakerta (P2.1 §16).
 *
 * Canonical map tiles (numeric T.*) resolve to READY sliced art per map.
 * This binding is PRESENTATION ONLY: collision, portals, chests, spawns and
 * all gameplay truth stay in data/world-maps.ts + world/tiles.ts. Unbound
 * tiles fall back to the legacy color wash (existing renderer behavior —
 * zero visual regression by construction).
 *
 * Only unambiguous core ground tiles are bound. Edge/transition art
 * (cliffs, waterfalls, bridges), interactives (chest/well/portal/lever) and
 * decor (trees/rocks/houses) have no edge-system or prop pipeline yet —
 * binding them now would invent semantics. They stay documented in the
 * manifest as READY-but-unbound until their systems land.
 *
 * Variants cycle deterministically by tile hash (no RNG, stable across
 * frames and sessions).
 */

import { RPG_TILES } from "../data/world-maps";

export type VisualMapId = "map.desa" | "map.gunung" | "map.menara";

/** tile numeric id → READY asset ids (manifest ids). */
const BINDINGS: Record<VisualMapId, Record<number, string[]>> = {
  "map.desa": {
    [RPG_TILES.GR]: ["desa_grass_01", "desa_grass_02", "desa_grass_flowers"],
    [RPG_TILES.PA]: ["desa_stone_path", "desa_stairs_stone", "desa_stairs_wood"],
    [RPG_TILES.TR]: ["desa_cliff_grass", "desa_cliff_stone", "desa_cliff_corner", "desa_cliff_dirt"],
    [RPG_TILES.WA]: ["desa_water_01", "desa_water_02", "desa_water_03", "desa_water_deep", "desa_water_edge", "desa_water_corner", "desa_bridge_water", "desa_waterfall"],
    [RPG_TILES.RO]: ["desa_stone_01", "desa_stone_02", "desa_cliff_stone"],
    [RPG_TILES.WL]: ["desa_cliff_stone", "desa_stone_01", "desa_stone_02"],
    [RPG_TILES.RF]: ["desa_stone_01", "desa_stone_02"],
    [RPG_TILES.DR]: ["desa_stairs_dirt", "desa_stairs_stone", "desa_stairs_wood"],
    [RPG_TILES.FL]: ["desa_grass_flowers", "desa_grass_02"],
    [RPG_TILES.WE]: ["desa_sand", "desa_mud"],
    [RPG_TILES.DK]: ["desa_bridge_water", "desa_water_edge"],
    [RPG_TILES.FA]: ["desa_dirt_01", "desa_dirt_02", "desa_mud"],
    [RPG_TILES.GD]: ["desa_dirt_01", "desa_dirt_02", "desa_sand", "desa_mud", "desa_ramp"],
    [RPG_TILES.RL]: ["desa_cliff_dirt", "desa_stone_02"],
    [RPG_TILES.CV]: ["desa_cliff_corner", "desa_cliff_stone"],
    [RPG_TILES.GE]: ["desa_grass_flowers", "desa_grass_01"],
    [RPG_TILES.ST]: ["desa_stairs_stone", "desa_stairs_wood", "desa_stairs_dirt"],
    [RPG_TILES.CH]: ["desa_stone_01", "desa_stone_02"],
  },
  "map.gunung": {
    [RPG_TILES.GR]: ["gunung_rock_terrain_01", "gunung_rock_terrain_02", "gunung_gravel_01", "gunung_gravel_02"],
    [RPG_TILES.GD]: ["gunung_gravel_01", "gunung_gravel_02", "gunung_rock_terrain_01", "gunung_rock_terrain_02"],
    [RPG_TILES.RO]: ["gunung_rock_terrain_01", "gunung_rock_terrain_02", "gunung_cliff_01", "gunung_cliff_02", "gunung_cliff_03", "gunung_cliff_04", "gunung_cliff_corner", "gunung_cliff_ledge", "gunung_cliff_tall"],
    [RPG_TILES.RL]: ["gunung_volcano_01", "gunung_volcano_02", "gunung_volcano_03", "gunung_volcano_04", "gunung_volcano_05", "gunung_volcano_06", "gunung_volcano_07", "gunung_volcano_08"],
    [RPG_TILES.ST]: ["gunung_rock_path_01", "gunung_rock_path_02", "gunung_rock_path_03", "gunung_rock_path_04", "gunung_cliff_stairs"],
    [RPG_TILES.LV]: ["gunung_lava_01", "gunung_lava_02", "gunung_lava_03", "gunung_lava_cracked", "gunung_lava_edge", "gunung_lava_fall", "gunung_lava_flow", "gunung_lava_pool"],
    [RPG_TILES.SN]: ["gunung_cliff_ledge", "gunung_cliff_tall", "gunung_gravel_01", "gunung_gravel_02"],
    [RPG_TILES.CV]: ["gunung_volcano_07", "gunung_volcano_08", "gunung_cliff_corner"],
    [RPG_TILES.CH]: ["gunung_rock_terrain_01", "gunung_rock_terrain_02"],
    [RPG_TILES.GE]: ["gunung_gravel_01", "gunung_gravel_02"],
    [RPG_TILES.PT]: ["gunung_volcano_03", "gunung_volcano_04"],
    [RPG_TILES.GP]: ["gunung_volcano_01", "gunung_volcano_02"],
  },
  "map.menara": {
    [RPG_TILES.ST]: ["menara_floor_01", "menara_floor_02", "menara_floor_03", "menara_floor_04", "menara_floor_pattern_01", "menara_floor_pattern_02", "menara_floor_pattern_03", "menara_floor_pattern_04", "menara_platform_01", "menara_platform_02", "menara_platform_03", "menara_platform_04", "menara_platform_05", "menara_platform_06", "menara_platform_07", "menara_platform_edge"],
    [RPG_TILES.RO]: ["menara_cloud_01", "menara_cloud_02", "menara_cloud_03", "menara_cloud_04", "menara_cloud_05", "menara_cloud_06", "menara_cloud_07"],
    [RPG_TILES.TC]: ["menara_wind_01", "menara_wind_02", "menara_wind_03", "menara_wind_04", "menara_wind_05", "menara_wind_06", "menara_wind_07", "menara_wind_vortex"],
    [RPG_TILES.PT]: ["menara_platform_01", "menara_platform_02", "menara_platform_03", "menara_platform_04", "menara_platform_edge"],
    [RPG_TILES.SR]: ["menara_wind_vortex", "menara_wind_06", "menara_wind_07"],
    [RPG_TILES.GP]: ["menara_cloud_bridge", "menara_wind_vortex"],
  },
};

/** Deterministic variant index from tile coords (FNV-1a, no RNG). */
export function variantFor(x: number, y: number, count: number): number {
  if (count <= 1) return 0;
  let h = 0x811c9dc5;
  h ^= x | 0; h = Math.imul(h, 0x01000193);
  h ^= y | 0; h = Math.imul(h, 0x01000193);
  return Math.abs(h) % count;
}

/** Resolve a bound asset id, or null when the tile has no visual binding. */
export function resolveTileAsset(
  mapId: string,
  tile: number,
  x: number,
  y: number,
): string | null {
  const table = (BINDINGS as Record<string, Record<number, string[]>>)[mapId];
  if (!table) return null;
  const options = table[tile];
  if (!options || options.length === 0) return null;
  return options[variantFor(x, y, options.length)];
}

/** Canonical item id → READY icon asset id (exact matches only).
 *  f1/f2 (Ikan Kecil/Besar) have NO confident mapping to the Biru/Merah art
 *  (color≠size semantics) — they stay unmapped (NEEDS_REVIEW), never guessed. */
const ITEM_ICONS: Record<string, string> = {
  ram: "item_ramuan",
  teh: "item_teh",
  elix: "item_elixir",
  bijih: "item_bijih",
  f1: "item_ikan_biru",
  f2: "item_ikan_merah",
  f3: "item_ikan_emas",
};

export function itemIconFor(itemId: string): string | null {
  return ITEM_ICONS[itemId] ?? null;
}
