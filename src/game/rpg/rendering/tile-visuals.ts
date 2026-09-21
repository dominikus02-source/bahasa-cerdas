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
    [RPG_TILES.PA]: ["desa_stone_path"],
    [RPG_TILES.GD]: ["desa_dirt_01", "desa_dirt_02"],
    [RPG_TILES.WA]: ["desa_water_01"],
    [RPG_TILES.FL]: ["desa_grass_flowers"],
    // P2.9: Bind previously-unbound tiles to existing desa terrain sprites.
    // These give visual distinction to structures/forests/farms instead of
    // the green fallback wash. Entity shapes still draw on top for houses/trees.
    [RPG_TILES.TR]: ["desa_stone_01", "desa_stone_02"],    // tree border → darker stone ground
    [RPG_TILES.WL]: ["desa_dirt_01", "desa_dirt_02"],      // walls → earth/dirt tone
    [RPG_TILES.RF]: ["desa_stone_01", "desa_stone_02"],    // roof → stone tile appearance
    [RPG_TILES.DR]: ["desa_stone_path"],                    // door → stone path
    [RPG_TILES.WE]: ["desa_sand"],                          // well → sandy area
    [RPG_TILES.FA]: ["desa_dirt_01", "desa_dirt_02"],      // farm → earth/dirt
    [RPG_TILES.RO]: ["desa_stone_01", "desa_stone_02"],    // rock → stone
  },
  "map.gunung": {
    [RPG_TILES.GD]: ["gunung_rock_terrain_01", "gunung_rock_terrain_02"],
    [RPG_TILES.RO]: ["gunung_rock_terrain_01", "gunung_rock_terrain_02"],
    [RPG_TILES.ST]: ["gunung_rock_path_01", "gunung_rock_path_02"],
    [RPG_TILES.LV]: ["gunung_lava_01"],
    [RPG_TILES.SN]: ["gunung_rock_terrain_01"],
  },
  "map.menara": {
    [RPG_TILES.ST]: ["menara_floor_01", "menara_floor_02", "menara_floor_03", "menara_floor_04"],
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
  f3: "item_ikan_emas",
};

export function itemIconFor(itemId: string): string | null {
  return ITEM_ICONS[itemId] ?? null;
}
