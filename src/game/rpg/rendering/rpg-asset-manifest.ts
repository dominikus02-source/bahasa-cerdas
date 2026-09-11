/**
 * Canonical RPG asset manifest — Pendekar Suryakerta (P2.1).
 *
 * ONE manifest for all produced visual assets (Packs 01–06). Each entry
 * carries id, category, source, path, dimensions, frame/animation info,
 * origin, logical scale, alpha, status, and confidence (§14).
 *
 * Statuses (never silently converted):
 * - READY: verified slice on disk (programmatic asserts + human contact
 *   review). Safe for runtime use.
 * - REFERENCE_ONLY: presentation/master sheets kept as source reference.
 * - NEEDS_REVIEW: exists but has no provable runtime boundary yet
 *   (opaque labeled sheets, unlabeled icons, transparency-dependent VFX).
 * - MISSING: expected by contract but absent (e.g. Arga engine sheets).
 *
 * Source packs live untouched at public/game/Pendekar Suryakerta-BC/*.zip.
 * Runtime PNGs live at public/game/rpg/ (web-served for canvas loading).
 */

export type RpgAssetStatus = "READY" | "REFERENCE_ONLY" | "NEEDS_REVIEW" | "MISSING";

export interface RpgAssetEntry {
  id: string;
  category: string;
  /** Origin pack file (traceability) or "generated-runtime". */
  source: string;
  /** Web path for READY runtime art; pack-internal path for references. */
  path: string;
  width: number;
  height: number;
  frames: number;
  animationState: string | null;
  direction: string | null;
  /** Feet origin UV (terrain/items: center-bottom visual anchor). */
  origin: { x: number; y: number };
  logicalScale: number;
  alpha: boolean;
  status: RpgAssetStatus;
  confidence: "verified" | "reviewed" | "unverified";
  note?: string;
}

/** [id, category, path, w, h] — generated from disk, verified by tests. */
const READY_TABLE: Array<[string, string, string, number, number]> = [
    ["item_bijih", "items", "/game/rpg/items/item_bijih.png", 52, 60],
    ["item_bulu", "items", "/game/rpg/items/item_bulu.png", 48, 58],
    ["item_bunga_emas", "items", "/game/rpg/items/item_bunga_emas.png", 48, 58],
    ["item_elixir", "items", "/game/rpg/items/item_elixir.png", 52, 60],
    ["item_ikan_biru", "items", "/game/rpg/items/item_ikan_biru.png", 52, 60],
    ["item_ikan_emas", "items", "/game/rpg/items/item_ikan_emas.png", 52, 60],
    ["item_ikan_merah", "items", "/game/rpg/items/item_ikan_merah.png", 52, 60],
    ["item_kristal", "items", "/game/rpg/items/item_kristal.png", 48, 58],
    ["item_kunci", "items", "/game/rpg/items/item_kunci.png", 48, 58],
    ["item_peta", "items", "/game/rpg/items/item_peta.png", 48, 58],
    ["item_ramuan", "items", "/game/rpg/items/item_ramuan.png", 52, 60],
    ["item_surat", "items", "/game/rpg/items/item_surat.png", 48, 58],
    ["item_teh", "items", "/game/rpg/items/item_teh.png", 52, 60],
    ["desa_bridge_water", "terrain", "/game/rpg/terrain/desa_bridge_water.png", 72, 83],
    ["desa_cliff_corner", "terrain", "/game/rpg/terrain/desa_cliff_corner.png", 70, 85],
    ["desa_cliff_dirt", "terrain", "/game/rpg/terrain/desa_cliff_dirt.png", 70, 85],
    ["desa_cliff_grass", "terrain", "/game/rpg/terrain/desa_cliff_grass.png", 70, 85],
    ["desa_cliff_stone", "terrain", "/game/rpg/terrain/desa_cliff_stone.png", 70, 85],
    ["desa_dirt_01", "terrain", "/game/rpg/terrain/desa_dirt_01.png", 70, 66],
    ["desa_dirt_02", "terrain", "/game/rpg/terrain/desa_dirt_02.png", 70, 66],
    ["desa_grass_01", "terrain", "/game/rpg/terrain/desa_grass_01.png", 70, 66],
    ["desa_grass_02", "terrain", "/game/rpg/terrain/desa_grass_02.png", 70, 66],
    ["desa_grass_flowers", "terrain", "/game/rpg/terrain/desa_grass_flowers.png", 70, 66],
    ["desa_mud", "terrain", "/game/rpg/terrain/desa_mud.png", 70, 69],
    ["desa_ramp", "terrain", "/game/rpg/terrain/desa_ramp.png", 70, 80],
    ["desa_sand", "terrain", "/game/rpg/terrain/desa_sand.png", 70, 69],
    ["desa_stairs_dirt", "terrain", "/game/rpg/terrain/desa_stairs_dirt.png", 70, 80],
    ["desa_stairs_stone", "terrain", "/game/rpg/terrain/desa_stairs_stone.png", 70, 80],
    ["desa_stairs_wood", "terrain", "/game/rpg/terrain/desa_stairs_wood.png", 70, 80],
    ["desa_stone_01", "terrain", "/game/rpg/terrain/desa_stone_01.png", 70, 69],
    ["desa_stone_02", "terrain", "/game/rpg/terrain/desa_stone_02.png", 70, 69],
    ["desa_stone_path", "terrain", "/game/rpg/terrain/desa_stone_path.png", 70, 69],
    ["desa_water_01", "terrain", "/game/rpg/terrain/desa_water_01.png", 72, 76],
    ["desa_water_02", "terrain", "/game/rpg/terrain/desa_water_02.png", 72, 76],
    ["desa_water_03", "terrain", "/game/rpg/terrain/desa_water_03.png", 72, 76],
    ["desa_water_corner", "terrain", "/game/rpg/terrain/desa_water_corner.png", 72, 83],
    ["desa_water_deep", "terrain", "/game/rpg/terrain/desa_water_deep.png", 72, 76],
    ["desa_water_edge", "terrain", "/game/rpg/terrain/desa_water_edge.png", 72, 83],
    ["desa_waterfall", "terrain", "/game/rpg/terrain/desa_waterfall.png", 72, 83],
    ["gunung_cliff_01", "terrain", "/game/rpg/terrain/gunung_cliff_01.png", 76, 72],
    ["gunung_cliff_02", "terrain", "/game/rpg/terrain/gunung_cliff_02.png", 76, 72],
    ["gunung_cliff_03", "terrain", "/game/rpg/terrain/gunung_cliff_03.png", 76, 72],
    ["gunung_cliff_04", "terrain", "/game/rpg/terrain/gunung_cliff_04.png", 76, 72],
    ["gunung_cliff_corner", "terrain", "/game/rpg/terrain/gunung_cliff_corner.png", 76, 72],
    ["gunung_cliff_ledge", "terrain", "/game/rpg/terrain/gunung_cliff_ledge.png", 76, 72],
    ["gunung_cliff_stairs", "terrain", "/game/rpg/terrain/gunung_cliff_stairs.png", 76, 72],
    ["gunung_cliff_tall", "terrain", "/game/rpg/terrain/gunung_cliff_tall.png", 76, 72],
    ["gunung_gravel_01", "terrain", "/game/rpg/terrain/gunung_gravel_01.png", 76, 71],
    ["gunung_gravel_02", "terrain", "/game/rpg/terrain/gunung_gravel_02.png", 76, 71],
    ["gunung_lava_01", "terrain", "/game/rpg/terrain/gunung_lava_01.png", 76, 71],
    ["gunung_lava_02", "terrain", "/game/rpg/terrain/gunung_lava_02.png", 76, 71],
    ["gunung_lava_03", "terrain", "/game/rpg/terrain/gunung_lava_03.png", 76, 71],
    ["gunung_lava_cracked", "terrain", "/game/rpg/terrain/gunung_lava_cracked.png", 76, 73],
    ["gunung_lava_edge", "terrain", "/game/rpg/terrain/gunung_lava_edge.png", 76, 71],
    ["gunung_lava_fall", "terrain", "/game/rpg/terrain/gunung_lava_fall.png", 76, 73],
    ["gunung_lava_flow", "terrain", "/game/rpg/terrain/gunung_lava_flow.png", 76, 73],
    ["gunung_lava_pool", "terrain", "/game/rpg/terrain/gunung_lava_pool.png", 76, 73],
    ["gunung_rock_path_01", "terrain", "/game/rpg/terrain/gunung_rock_path_01.png", 76, 71],
    ["gunung_rock_path_02", "terrain", "/game/rpg/terrain/gunung_rock_path_02.png", 76, 71],
    ["gunung_rock_path_03", "terrain", "/game/rpg/terrain/gunung_rock_path_03.png", 76, 71],
    ["gunung_rock_path_04", "terrain", "/game/rpg/terrain/gunung_rock_path_04.png", 76, 71],
    ["gunung_rock_terrain_01", "terrain", "/game/rpg/terrain/gunung_rock_terrain_01.png", 76, 71],
    ["gunung_rock_terrain_02", "terrain", "/game/rpg/terrain/gunung_rock_terrain_02.png", 76, 71],
    ["gunung_volcano_01", "terrain", "/game/rpg/terrain/gunung_volcano_01.png", 76, 71],
    ["gunung_volcano_02", "terrain", "/game/rpg/terrain/gunung_volcano_02.png", 76, 71],
    ["gunung_volcano_03", "terrain", "/game/rpg/terrain/gunung_volcano_03.png", 76, 71],
    ["gunung_volcano_04", "terrain", "/game/rpg/terrain/gunung_volcano_04.png", 76, 71],
    ["gunung_volcano_05", "terrain", "/game/rpg/terrain/gunung_volcano_05.png", 76, 71],
    ["gunung_volcano_06", "terrain", "/game/rpg/terrain/gunung_volcano_06.png", 76, 71],
    ["gunung_volcano_07", "terrain", "/game/rpg/terrain/gunung_volcano_07.png", 76, 71],
    ["gunung_volcano_08", "terrain", "/game/rpg/terrain/gunung_volcano_08.png", 76, 71],
    ["menara_cloud_01", "terrain", "/game/rpg/terrain/menara_cloud_01.png", 76, 74],
    ["menara_cloud_02", "terrain", "/game/rpg/terrain/menara_cloud_02.png", 76, 74],
    ["menara_cloud_03", "terrain", "/game/rpg/terrain/menara_cloud_03.png", 76, 74],
    ["menara_cloud_04", "terrain", "/game/rpg/terrain/menara_cloud_04.png", 76, 74],
    ["menara_cloud_05", "terrain", "/game/rpg/terrain/menara_cloud_05.png", 76, 76],
    ["menara_cloud_06", "terrain", "/game/rpg/terrain/menara_cloud_06.png", 76, 76],
    ["menara_cloud_07", "terrain", "/game/rpg/terrain/menara_cloud_07.png", 76, 76],
    ["menara_cloud_bridge", "terrain", "/game/rpg/terrain/menara_cloud_bridge.png", 76, 76],
    ["menara_floor_01", "terrain", "/game/rpg/terrain/menara_floor_01.png", 76, 74],
    ["menara_floor_02", "terrain", "/game/rpg/terrain/menara_floor_02.png", 76, 74],
    ["menara_floor_03", "terrain", "/game/rpg/terrain/menara_floor_03.png", 76, 74],
    ["menara_floor_04", "terrain", "/game/rpg/terrain/menara_floor_04.png", 76, 74],
    ["menara_floor_pattern_01", "terrain", "/game/rpg/terrain/menara_floor_pattern_01.png", 76, 76],
    ["menara_floor_pattern_02", "terrain", "/game/rpg/terrain/menara_floor_pattern_02.png", 76, 76],
    ["menara_floor_pattern_03", "terrain", "/game/rpg/terrain/menara_floor_pattern_03.png", 76, 76],
    ["menara_floor_pattern_04", "terrain", "/game/rpg/terrain/menara_floor_pattern_04.png", 76, 76],
    ["menara_platform_01", "terrain", "/game/rpg/terrain/menara_platform_01.png", 78, 75],
    ["menara_platform_02", "terrain", "/game/rpg/terrain/menara_platform_02.png", 78, 75],
    ["menara_platform_03", "terrain", "/game/rpg/terrain/menara_platform_03.png", 78, 75],
    ["menara_platform_04", "terrain", "/game/rpg/terrain/menara_platform_04.png", 78, 75],
    ["menara_platform_05", "terrain", "/game/rpg/terrain/menara_platform_05.png", 78, 77],
    ["menara_platform_06", "terrain", "/game/rpg/terrain/menara_platform_06.png", 78, 77],
    ["menara_platform_07", "terrain", "/game/rpg/terrain/menara_platform_07.png", 78, 77],
    ["menara_platform_edge", "terrain", "/game/rpg/terrain/menara_platform_edge.png", 78, 77],
    ["menara_wind_01", "terrain", "/game/rpg/terrain/menara_wind_01.png", 78, 74],
    ["menara_wind_02", "terrain", "/game/rpg/terrain/menara_wind_02.png", 78, 74],
    ["menara_wind_03", "terrain", "/game/rpg/terrain/menara_wind_03.png", 78, 74],
    ["menara_wind_04", "terrain", "/game/rpg/terrain/menara_wind_04.png", 78, 74],
    ["menara_wind_05", "terrain", "/game/rpg/terrain/menara_wind_05.png", 78, 77],
    ["menara_wind_06", "terrain", "/game/rpg/terrain/menara_wind_06.png", 78, 77],
    ["menara_wind_07", "terrain", "/game/rpg/terrain/menara_wind_07.png", 78, 77],
    ["menara_wind_vortex", "terrain", "/game/rpg/terrain/menara_wind_vortex.png", 78, 77],
];

function readyEntry(row: [string, string, string, number, number]): RpgAssetEntry {
  const [id, category, path, width, height] = row;
  return {
    id, category, source: "generated-runtime", path, width, height,
    frames: 1, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1,
    alpha: category === "items",
    status: "READY", confidence: "verified",
  };
}

/** File-level reference entries (source sheets, mockups, unlabeled strips). */
const REFERENCE_ENTRIES: RpgAssetEntry[] = [
  {
    id: "ref:arga-master", category: "characters", source: "pack-reference", path: "Pack01/arga/arga_master_character.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed", note: "master illustration (transparent, full-body, no frames)",
  },
  {
    id: "ref:arga-animation-sheet", category: "characters", source: "pack-reference", path: "Pack01/arga/arga_animation_reference_sheet.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "labeled sheet; frames ~50px, not 224px contract",
  },
  {
    id: "ref:monster-korog", category: "monsters", source: "pack-reference", path: "Pack01/monster/monster_korog_batch1.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled design sheet, no clean frames",
  },
  {
    id: "ref:monster-korog-perang", category: "monsters", source: "pack-reference", path: "Pack01/monster/monster_korog_perang_batch1.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled design sheet",
  },
  {
    id: "ref:monster-golem-batu", category: "monsters", source: "pack-reference", path: "Pack01/monster/monster_golem_batu_batch1.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled design sheet",
  },
  {
    id: "ref:monster-korog-bayangan", category: "monsters", source: "pack-reference", path: "Pack01/monster/monster_korog_bayangan_batch1.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled design sheet",
  },
  {
    id: "ref:npc-ki-jaka", category: "npcs", source: "pack-reference", path: "Pack01/npc/npc_ki_jaka_batch1.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled design sheet",
  },
  {
    id: "ref:npc-bu-ratmi", category: "npcs", source: "pack-reference", path: "Pack01/npc/npc_bu_ratmi_batch1.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled design sheet",
  },
  {
    id: "ref:npc-bu-sari", category: "npcs", source: "pack-reference", path: "Pack01/npc/npc_bu_sari_batch1.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled design sheet",
  },
  {
    id: "ref:npc-eyang-kartala", category: "npcs", source: "pack-reference", path: "Pack01/npc/npc_eyang_kartala_batch1.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled design sheet",
  },
  {
    id: "ref:npc-pak-empu", category: "npcs", source: "pack-reference", path: "Pack01/npc/npc_pak_empu_batch1.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled design sheet",
  },
  {
    id: "ref:boss-raja-korog", category: "bosses", source: "pack-reference", path: "Pack03/bosses/01_raja_korog.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled sheet, strips interleaved with text",
  },
  {
    id: "ref:boss-golem-agung", category: "bosses", source: "pack-reference", path: "Pack03/bosses/02_golem_agung.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled sheet",
  },
  {
    id: "ref:boss-naga-abu", category: "bosses", source: "pack-reference", path: "Pack03/bosses/03_naga_abu.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled sheet",
  },
  {
    id: "ref:boss-penguasa-menara", category: "bosses", source: "pack-reference", path: "Pack03/bosses/04_penguasa_menara.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled sheet",
  },
  {
    id: "ref:boss-batch1-sheet", category: "bosses", source: "pack-reference", path: "Pack02/boss/boss_batch_1_reference_sheet.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed", note: "reference presentation",
  },
  {
    id: "ref:tileset-desa", category: "environments", source: "pack-reference", path: "Pack02/environment/tileset_desa_suryakerta.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "mixed prop sheet, non-uniform",
  },
  {
    id: "ref:tileset-gunung", category: "environments", source: "pack-reference", path: "Pack02/environment/tileset_gunung_karang.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "mixed prop sheet",
  },
  {
    id: "ref:tileset-menara", category: "environments", source: "pack-reference", path: "Pack02/environment/tileset_menara_angin.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "mixed prop sheet",
  },
  {
    id: "ref:tileset-alam-props", category: "environments", source: "pack-reference", path: "Pack02/environment/tileset_alam_props.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "mixed prop sheet",
  },
  {
    id: "ref:terrain-variasi", category: "environments", source: "pack-reference", path: "Pack02/environment/terrain_variasi.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "mixed sheet",
  },
  {
    id: "ref:tile-variations-09", category: "environments", source: "pack-reference", path: "Pack04/terrain/09_tile_variations.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "sub-group structure ambiguous",
  },
  {
    id: "ref:ground-row3", category: "environments", source: "pack-reference", path: "Pack04/terrain/01_ground_tiles.png#row3",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "unlabeled cliff/tree row",
  },
  {
    id: "ref:equipment-strip", category: "equipment", source: "pack-reference", path: "Pack02/items/equipment.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "unlabeled icon row, no id mapping",
  },
  {
    id: "ref:chest-loot-strip", category: "props", source: "pack-reference", path: "Pack02/items/chest_loot.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "unlabeled loot icons",
  },
  {
    id: "ref:vfx-serangan", category: "vfx", source: "pack-reference", path: "Pack02/vfx/effect_serangan.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque strip, needs transparency re-export",
  },
  {
    id: "ref:vfx-skill", category: "vfx", source: "pack-reference", path: "Pack02/vfx/effect_skill.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque strip",
  },
  {
    id: "ref:vfx-monster-damage", category: "vfx", source: "pack-reference", path: "Pack02/vfx/effect_monster_damage.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque strip",
  },
  {
    id: "ref:vfx-interact", category: "vfx", source: "pack-reference", path: "Pack02/vfx/effect_interact.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque strip",
  },
  {
    id: "ref:vfx-learning", category: "vfx", source: "pack-reference", path: "Pack02/vfx/effect_learning.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque strip",
  },
  {
    id: "ref:vfx-portals", category: "vfx", source: "pack-reference", path: "Pack02/vfx/effect_portal_special.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque strip",
  },
  {
    id: "ref:vfx-victory", category: "vfx", source: "pack-reference", path: "Pack02/vfx/effect_victory_defeat.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque strip",
  },
  {
    id: "ref:vfx-status", category: "vfx", source: "pack-reference", path: "Pack02/vfx/effect_status.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque strip",
  },
  {
    id: "ref:vfx-desa-overlay", category: "vfx", source: "pack-reference", path: "Pack04/effects/11_overlay_effects.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "mixed sheet",
  },
  {
    id: "ref:vfx-gunung-effects", category: "vfx", source: "pack-reference", path: "Pack05/effects/11_effects.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "mixed sheet",
  },
  {
    id: "ref:vfx-menara-wind", category: "vfx", source: "pack-reference", path: "Pack06/effects/11_wind_magic_effects.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "mixed sheet",
  },
  {
    id: "ref:ui-battle-panel", category: "ui", source: "pack-reference", path: "Pack02/ui/ui_battle_panel.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed", note: "labeled mockup, not components",
  },
  {
    id: "ref:ui-dialogue", category: "ui", source: "pack-reference", path: "Pack02/ui/ui_dialogue.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed", note: "labeled mockup",
  },
  {
    id: "ref:ui-menu", category: "ui", source: "pack-reference", path: "Pack02/ui/ui_menu.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed", note: "labeled mockup",
  },
  {
    id: "ref:ui-notification", category: "ui", source: "pack-reference", path: "Pack02/ui/ui_notification.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed", note: "labeled mockup",
  },
  {
    id: "ref:ui-learning", category: "ui", source: "pack-reference", path: "Pack02/ui/ui_learning_challenge.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed", note: "labeled mockup",
  },
  {
    id: "ref:atlas-desa", category: "environments", source: "pack-reference", path: "Pack04/source/desa_suryakerta_master_atlas.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed", note: "master presentation",
  },
  {
    id: "ref:atlas-gunung", category: "environments", source: "pack-reference", path: "Pack05/source/gunung_karang_master_atlas.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed", note: "master presentation",
  },
  {
    id: "ref:atlas-menara", category: "environments", source: "pack-reference", path: "Pack06/source/menara_angin_master_atlas.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed", note: "master presentation",
  },
  {
    id: "ref:source-monster-batch1", category: "monsters", source: "pack-reference", path: "Pack01/source_sheets/monster_batch_1_source_sheet.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed", note: "master presentation",
  },
  {
    id: "ref:source-npc-batch1", category: "npcs", source: "pack-reference", path: "Pack01/source_sheets/npc_batch_1_source_sheet.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed", note: "master presentation",
  },
  {
    id: "ref:source-pack01-collage", category: "environments", source: "pack-reference", path: "Pack02/source_sheets/asset_pack_01_full_collage.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed", note: "master presentation",
  },
  {
    id: "ref:source-pack02-master", category: "environments", source: "pack-reference", path: "Pack02/source_sheets/asset_pack_02_master_sheet.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed", note: "master presentation",
  },
  {
    id: "ref:source-boss-master", category: "bosses", source: "pack-reference", path: "Pack03/source/boss_batch_1_master_sheet.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed", note: "master presentation",
  },
  {
    id: "ref:collision-helpers", category: "environments", source: "pack-reference", path: "Pack04/collision_reference/12_collision_helpers.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed", note: "reference doc, not runtime",
  },
  {
    id: "ref:sheet-boss-arga-idle-down", category: "characters", source: "pack-reference", path: "(expected delivery, absent)",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "MISSING", confidence: "unverified", note: "engine sheet per arga-contract, not delivered",
  },
];

export const RPG_ASSET_MANIFEST: RpgAssetEntry[] = [
  ...READY_TABLE.map(readyEntry),
  ...REFERENCE_ENTRIES,
];

/** Lookup by id (registry semantics: miss is explicit, use lookupAsset). */
export function manifestLookup(id: string): RpgAssetEntry | undefined {
  return RPG_ASSET_MANIFEST.find((e) => e.id === id);
}

/** All ids with a given status (audit helper). */
export function manifestByStatus(status: RpgAssetStatus): RpgAssetEntry[] {
  return RPG_ASSET_MANIFEST.filter((e) => e.status === status);
}

/** Duplicate registration check (audit helper). */
export function manifestDuplicateIds(): string[] {
  const seen = new Map<string, number>();
  for (const e of RPG_ASSET_MANIFEST) seen.set(e.id, (seen.get(e.id) ?? 0) + 1);
  return [...seen.entries()].filter(([, n]) => n > 1).map(([id]) => id);
}
