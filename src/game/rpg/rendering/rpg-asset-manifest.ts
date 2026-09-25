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
 * Runtime PNGs live at public/game/rpg/ (web-served for canvas loading).\n * P2.11 shared atlas remains NEEDS_REVIEW until the binary file is present and verified.
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
  /** Optional sub-rectangle inside a shared runtime atlas. */
  sourceRect?: { x: number; y: number; width: number; height: number };
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
    // P2.9C: Ki Jaka runtime idle sprite (extracted from reference sheet).
    ["npc_ki_jaka_idle", "npcs", "/game/rpg/characters/npcs/npc_ki_jaka_idle.png", 125, 118],
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

/** Arga runtime sheets — rescued from calibration + Pack07 hurt. */
const ARGA_RUNTIME_ENTRIES: RpgAssetEntry[] = [
  // READY: extracted + normalized to 224×224 per frame, horizontal strip
  {
    id: "sheet-char-arga-walk-down", category: "characters", source: "rescued-runtime",
    path: "/game/rpg/characters/sheet-char-arga-walk-down.png",
    width: 1792, height: 224, frames: 8, animationState: "walk", direction: "down",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: true,
    status: "READY", confidence: "verified",
    note: "rescued from calibration sheet, 8 frames, scale 2.22, feet-aligned",
  },
  {
    id: "sheet-char-arga-walk-up", category: "characters", source: "rescued-runtime",
    path: "/game/rpg/characters/sheet-char-arga-walk-up.png",
    width: 1792, height: 224, frames: 8, animationState: "walk", direction: "up",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: true,
    status: "READY", confidence: "verified",
    note: "rescued from calibration sheet, 8 frames, scale 2.17, feet-aligned",
  },
  {
    id: "sheet-char-arga-walk-side", category: "characters", source: "rescued-runtime",
    path: "/game/rpg/characters/sheet-char-arga-walk-side.png",
    width: 1792, height: 224, frames: 8, animationState: "walk", direction: "side",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: true,
    status: "READY", confidence: "verified",
    note: "P2.4C: canonical SIDE production asset. Rescued from calibration sheet (right row, mirrored at load), 8 frames, scale 2.33. TRUE PROFILE verified.",
  },
  {
    id: "sheet-char-arga-hurt-down", category: "characters", source: "rescued-runtime",
    path: "/game/rpg/characters/sheet-char-arga-hurt-down.png",
    width: 896, height: 224, frames: 4, animationState: "hurt", direction: "down",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: true,
    status: "NEEDS_REVIEW", confidence: "unverified",
    note: "INCOMPATIBLE: Gen-B blue outfit + armor. Cannot be used as Arga runtime asset. Needs replacement.",
  },
  // NEEDS_REVIEW: P2.3D rebuild — 6 frames from side-view (04-06) via affine warp breathing cycle
  {
    id: "sheet-char-arga-idle-down", category: "characters", source: "p2.3d-rebuild",
    path: "/game/rpg/characters/review/sheet-char-arga-idle-down-a2-rebuild.png",
    width: 1344, height: 224, frames: 6, animationState: "idle", direction: "down",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: true,
    status: "NEEDS_REVIEW", confidence: "reviewed",
    note: "P2.3D rebuild: side-view frames only (removed front3/4 angle mismatch), affine warp breathing, avg height=209px, baseline=216 uniform. A2 idle-down calibration REMOVED (P2.4C.1 duplicate reconciliation).",
  },
  // NEEDS_REVIEW: P2.3D rebuild — frame 04 interpolated from 03+05 (was headless), backgrounds cleaned
  {
    id: "sheet-char-arga-run-down", category: "characters", source: "p2.3d-rebuild",
    path: "/game/rpg/characters/review/sheet-char-arga-run-down-a2-rebuild.png",
    width: 2240, height: 224, frames: 10, animationState: "run", direction: "down",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: true,
    status: "NEEDS_REVIEW", confidence: "reviewed",
    note: "P2.3D rebuild: frame 04 morphed from 03+05 (was headless), all backgrounds cleaned, avg height=197px, baseline=216 uniform. A2 run-down calibration → REFERENCE_ONLY (P2.4C.1).",
  },
  {
    id: "sheet-char-arga-run-up", category: "characters", source: "none",
    path: "(no extractable source artwork)",
    width: 0, height: 0, frames: 10, animationState: "run", direction: "up",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "MISSING", confidence: "unverified",
    note: "Pack07 ref: 4 frames/band, need 10; ~35px frames too small",
  },
  {
    id: "sheet-char-arga-run-side", category: "characters", source: "pack01-extraction",
    path: "assets-src/rpg/characters/arga/side-extraction/run-side-{1..10}-native.png",
    width: 0, height: 0, frames: 10, animationState: "run", direction: "side",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: true,
    status: "REFERENCE_ONLY", confidence: "reviewed",
    note: "P2.4C.2: 10 frames extracted from Pack01 RIGHT row (native 13-29×65-67px). TRUE PROFILE verified. Requires upscale to 224×224 for production. NOT READY — reference only.",
  },
  // P2.4C: idle-side — true profile, 6 frames. Added per founder directive.
  {
    id: "sheet-char-arga-idle-side", category: "characters", source: "pack01-extraction",
    path: "assets-src/rpg/characters/arga/side-extraction/idle-side-{1..5}-native.png",
    width: 0, height: 0, frames: 5, animationState: "idle", direction: "side",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: true,
    status: "REFERENCE_ONLY", confidence: "reviewed",
    note: "P2.4C.2: 5 of 6 frames extracted from Pack01 RIGHT row (native 26-42×66px). Frame 6 missing (1px gap artifact at x=79). TRUE PROFILE verified. Requires upscale to 224×224 for production. NOT READY — reference only.",
  },
  // NEEDS_REVIEW: P2.3D rebuild — frame 04 interpolated from 03+05, brown bg patches cleaned from 01-03
  {
    id: "sheet-char-arga-attack-down", category: "characters", source: "p2.3d-rebuild",
    path: "/game/rpg/characters/review/sheet-char-arga-attack-down-a2-rebuild.png",
    width: 1344, height: 224, frames: 6, animationState: "attack", direction: "down",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: true,
    status: "NEEDS_REVIEW", confidence: "reviewed",
    note: "P2.3D rebuild: frame 04 morphed from 03+05 (was headless), brown bg cleaned from 01-03, avg height=201px, baseline=216 uniform. A2 attack-down calibration → REFERENCE_ONLY (P2.4C.1).",
  },
  // REFERENCE_ONLY: P2.4A master character reference (founder-locked canon)
  // --- P2.4B.2: A2 Calibration Individual Frames (224×224 RGBA, transparent) ---
  // P2.4C.1 RECONCILIATION: idle-down-a2 REMOVED (duplicate of idle-down p2.3d-rebuild).
  // run-down-a2 and attack-down-a2 converted from NEEDS_REVIEW to REFERENCE_ONLY
  // (A2 calibration metadata, not production candidates — no canonical state:direction duplicate).
  {
    id: "sheet-char-arga-run-down-a2", category: "characters", source: "pack12-a2-calibration",
    path: "/game/rpg/characters/review/arga-run-down-a2/",
    width: 224, height: 224, frames: 10, animationState: "run", direction: "down",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: true,
    status: "REFERENCE_ONLY", confidence: "reviewed",
    note: "P2.4B.2 A2 calibration: 10 individual frames, 224×224 RGBA, transparent, canon colors present. VISUAL INCONSISTENCY with walk sheets (pixel diff 61.0). A2 motion reference only — never promote to READY.",
  },
  {
    id: "sheet-char-arga-attack-down-a2", category: "characters", source: "pack12-a2-calibration",
    path: "/game/rpg/characters/review/arga-attack-down-a2/",
    width: 224, height: 224, frames: 6, animationState: "attack", direction: "down",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: true,
    status: "REFERENCE_ONLY", confidence: "reviewed",
    note: "P2.4B.2 A2 calibration: 6 individual frames, 224×224 RGBA, transparent, canon colors present. VISUAL INCONSISTENCY with walk sheets (pixel diff 61.0). A2 motion reference only — never promote to READY.",
  },
  // --- P2.4B.2: Reference Sheets from Complete Animation Pack ---
  {
    id: "ref:arga-complete-pack-down", category: "characters", source: "complete-animation-pack",
    path: "package/DOWN_CORE_IDLE_WALK_RUN.png",
    width: 1536, height: 1024, frames: 1, animationState: null, direction: "down",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed",
    note: "P2.4B.2 Complete Pack: DOWN reference sheet (idle/walk/run, front-facing). RGB, baked background. Art-direction reference only.",
  },
  {
    id: "ref:arga-complete-pack-up", category: "characters", source: "complete-animation-pack",
    path: "package/UP_CORE_IDLE_WALK_RUN.png",
    width: 1536, height: 1024, frames: 1, animationState: null, direction: "up",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed",
    note: "P2.4B.2 Complete Pack: UP reference sheet (idle/walk/run, back-facing). RGB, baked background. Art-direction reference only.",
  },
  {
    id: "ref:arga-complete-pack-all", category: "characters", source: "complete-animation-pack",
    path: "package/ALL_DIRECTIONS_ALL_STATES_REFERENCE.png",
    width: 1536, height: 1024, frames: 1, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: true,
    status: "REFERENCE_ONLY", confidence: "reviewed",
    note: "P2.4B.2 Complete Pack: All-directions all-states overview. RGBA but 99.5% opaque. Art-direction reference only.",
  },
  {
    id: "ref:arga-master-turnaround-v2-founder", category: "characters", source: "complete-animation-pack",
    path: "package/ARGA_MASTER_TURNAROUND_V2_FOUNDER_REVIEW.png",
    width: 1536, height: 1024, frames: 1, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed",
    note: "P2.4B.2 Complete Pack: Master turnaround founder review copy. RGB, baked background. Canonical visual reference (FOUNDER_LOCKED).",
  },
  // --- P2.4A.2 existing references ---
  {
    id: "ref:arga-master-character", category: "characters", source: "p2.4a-composite",
    path: "/game/rpg/characters/ARGA_MASTER_CHARACTER_REFERENCE.png",
    width: 1774, height: 1100, frames: 1, animationState: "idle", direction: "down",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: true,
    status: "REFERENCE_ONLY", confidence: "reviewed",
    note: "P2.4A master: Pack01 portrait + rescued Gen-A walk 4-dir composite. FOUNDER_REVIEW_REQUIRED.",
  },
  // REFERENCE_ONLY: P2.4A.2 Pack01 animation reference sheet (founder-supplied review)
  {
    id: "ref:arga-turnaround-v2", category: "characters", source: "p2.4a-pack01",
    path: "/game/rpg/characters/ARGA_MASTER_TURNAROUND_V2.png",
    width: 1536, height: 1024, frames: 1, animationState: "idle", direction: "down",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed",
    note: "P2.4A.2 Pack01 animation reference sheet. Founder review required. RGB, baked background.",
  },
  {
    id: "sheet-char-arga-attack-up", category: "characters", source: "none",
    path: "(no extractable source artwork)",
    width: 0, height: 0, frames: 6, animationState: "attack", direction: "up",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "MISSING", confidence: "unverified",
    note: "Pack07 ref: 4 frames/band, need 6; ~35px frames too small",
  },
  {
    id: "sheet-char-arga-attack-side", category: "characters", source: "complete-animation-pack-extraction",
    path: "assets-src/rpg/characters/arga/side-extraction/attack-side-{1..6}-native.png",
    width: 0, height: 0, frames: 6, animationState: "attack", direction: "side",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: true,
    status: "REFERENCE_ONLY", confidence: "reviewed",
    note: "P2.4C.2: 6 frames extracted from Complete Animation Package SIDE section (native 35-37×28px). TRUE PROFILE verified. Requires upscale to 224×224 for production. NOT READY — reference only.",
  },
  {
    id: "sheet-char-arga-skill-down", category: "characters", source: "none",
    path: "(no extractable source artwork)",
    width: 0, height: 0, frames: 8, animationState: "skill", direction: "down",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "MISSING", confidence: "unverified",
    note: "Pack07 ref: 3-4 frames mixed, need 8; ~35px frames too small",
  },
  {
    id: "sheet-char-arga-defeat-down", category: "characters", source: "none",
    path: "(no extractable source artwork)",
    width: 0, height: 0, frames: 8, animationState: "defeat", direction: "down",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "MISSING", confidence: "unverified",
    note: "Pack07 ref: 4-6 frames mixed, need 8; ~35px frames too small",
  },
  {
    id: "sheet-char-arga-victory-down", category: "characters", source: "none",
    path: "(no extractable source artwork)",
    width: 0, height: 0, frames: 8, animationState: "victory", direction: "down",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "MISSING", confidence: "unverified",
    note: "Pack07 ref: 1 large band, need 8 separate frames; ~35px too small",
  },
  {
    id: "sheet-char-arga-interact-down", category: "characters", source: "none",
    path: "(no extractable source artwork)",
    width: 0, height: 0, frames: 6, animationState: "interact", direction: "down",
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "MISSING", confidence: "unverified",
    note: "Pack07 ref: 1 frame band, need 6; ~35px frames too small",
  },
];

/** File-level reference entries (source sheets, mockups, unlabeled strips). */
const REFERENCE_ENTRIES: RpgAssetEntry[] = [
  {
    id: "ref:rt-arga-idle", category: "characters", source: "pack-reference", path: "Pack07/arga_reference_sheets/arga_idle_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "4-dir idle preview grid (~70px frames, not 224px contract)",
  },
  {
    id: "ref:rt-arga-walk", category: "characters", source: "pack-reference", path: "Pack07/arga_reference_sheets/arga_walk_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "4-dir walk preview grid",
  },
  {
    id: "ref:rt-arga-run", category: "characters", source: "pack-reference", path: "Pack07/arga_reference_sheets/arga_run_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "4-dir run preview grid",
  },
  {
    id: "ref:rt-arga-attack", category: "characters", source: "pack-reference", path: "Pack07/arga_reference_sheets/arga_attack_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "attack preview grid",
  },
  {
    id: "ref:rt-arga-skill", category: "characters", source: "pack-reference", path: "Pack07/arga_reference_sheets/arga_skill_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "skill preview grid",
  },
  {
    id: "ref:rt-arga-hurt", category: "characters", source: "pack-reference", path: "Pack07/arga_reference_sheets/arga_hurt_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "hurt preview grid",
  },
  {
    id: "ref:rt-arga-defeat", category: "characters", source: "pack-reference", path: "Pack07/arga_reference_sheets/arga_defeat_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "defeat preview grid",
  },
  {
    id: "ref:rt-arga-victory", category: "characters", source: "pack-reference", path: "Pack07/arga_reference_sheets/arga_victory_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "victory preview grid",
  },
  {
    id: "ref:rt-arga-interact", category: "characters", source: "pack-reference", path: "Pack07/arga_reference_sheets/arga_interact_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "interact preview grid",
  },
  {
    id: "ref:rt-npc-ki-jaka", category: "npcs", source: "pack-reference", path: "Pack08/npc_reference_sheets/ki_jaka_idle_walk_talk_interact_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled design sheet, same format as Pack01",
  },
  {
    id: "ref:rt-npc-bu-ratmi", category: "npcs", source: "pack-reference", path: "Pack08/npc_reference_sheets/bu_ratmi_idle_walk_talk_interact_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled design sheet, same format as Pack01",
  },
  {
    id: "ref:rt-npc-bu-sari", category: "npcs", source: "pack-reference", path: "Pack08/npc_reference_sheets/bu_sari_idle_walk_talk_interact_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled design sheet, same format as Pack01",
  },
  {
    id: "ref:rt-npc-eyang-kartala", category: "npcs", source: "pack-reference", path: "Pack08/npc_reference_sheets/eyang_kartala_idle_walk_talk_interact_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled design sheet, same format as Pack01",
  },
  {
    id: "ref:rt-npc-pak-empu", category: "npcs", source: "pack-reference", path: "Pack08/npc_reference_sheets/pak_empu_idle_walk_talk_interact_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled design sheet, same format as Pack01",
  },
  {
    id: "ref:rt-mon-korog", category: "monsters", source: "pack-reference", path: "Pack09/monster_reference_sheets/korog_idle_walk_attack_hurt_defeat_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "labeled sheet, semi alpha noise throughout",
  },
  {
    id: "ref:rt-mon-korog-perang", category: "monsters", source: "pack-reference", path: "Pack09/monster_reference_sheets/korog_perang_idle_walk_attack_hurt_defeat_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "labeled sheet, semi alpha noise throughout",
  },
  {
    id: "ref:rt-mon-golem-batu", category: "monsters", source: "pack-reference", path: "Pack09/monster_reference_sheets/golem_batu_idle_walk_attack_hurt_defeat_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "labeled sheet, semi alpha noise throughout",
  },
  {
    id: "ref:rt-mon-korog-bayangan", category: "monsters", source: "pack-reference", path: "Pack09/monster_reference_sheets/korog_bayangan_idle_walk_attack_hurt_defeat_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "labeled sheet, semi alpha noise throughout",
  },
  {
    id: "ref:rt-boss-raja-korog", category: "bosses", source: "pack-reference", path: "Pack10/boss_reference_sheets/raja_korog_idle_walk_attack_skill_hurt_defeat_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled sheet, strips interleaved with text",
  },
  {
    id: "ref:rt-boss-golem-agung", category: "bosses", source: "pack-reference", path: "Pack10/boss_reference_sheets/golem_agung_idle_walk_attack_skill_hurt_defeat_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled sheet, strips interleaved with text",
  },
  {
    id: "ref:rt-boss-naga-abu", category: "bosses", source: "pack-reference", path: "Pack10/boss_reference_sheets/naga_abu_idle_walk_attack_skill_hurt_defeat_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled sheet, strips interleaved with text",
  },
  {
    id: "ref:rt-boss-penguasa-menara", category: "bosses", source: "pack-reference", path: "Pack10/boss_reference_sheets/penguasa_menara_idle_walk_attack_skill_hurt_defeat_4dir_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled sheet, strips interleaved with text",
  },
  {
    id: "ref:rt-vfx-movement", category: "vfx", source: "pack-reference", path: "Pack11/combat/01_movement_footstep_dash_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled strips, needs transparency re-export",
  },
  {
    id: "ref:rt-vfx-attack", category: "vfx", source: "pack-reference", path: "Pack11/combat/02_attack_effects_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled strips, needs transparency re-export",
  },
  {
    id: "ref:rt-vfx-skill", category: "vfx", source: "pack-reference", path: "Pack11/skill_magic/03_skill_magic_effects_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled strips, needs transparency re-export",
  },
  {
    id: "ref:rt-vfx-elemental", category: "vfx", source: "pack-reference", path: "Pack11/elemental/04_elemental_effects_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled strips, needs transparency re-export",
  },
  {
    id: "ref:rt-vfx-hit", category: "vfx", source: "pack-reference", path: "Pack11/damage/05_hit_damage_effects_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled strips, needs transparency re-export",
  },
  {
    id: "ref:rt-vfx-status", category: "vfx", source: "pack-reference", path: "Pack11/status/06_status_effects_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled strips, needs transparency re-export",
  },
  {
    id: "ref:rt-vfx-environment", category: "vfx", source: "pack-reference", path: "Pack11/environment/07_environment_effects_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled strips, needs transparency re-export",
  },
  {
    id: "ref:rt-vfx-ui", category: "vfx", source: "pack-reference", path: "Pack11/ui_feedback/08_ui_feedback_effects_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled strips, needs transparency re-export",
  },
  {
    id: "ref:rt-vfx-interaction", category: "vfx", source: "pack-reference", path: "Pack11/interaction/09_interaction_effects_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "NEEDS_REVIEW", confidence: "reviewed", note: "opaque labeled strips, needs transparency re-export",
  },
  {
    id: "ref:rt-master-arga", category: "characters", source: "pack-reference", path: "Pack07/source/arga_runtime_master_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed", note: "master presentation",
  },
  {
    id: "ref:rt-master-npc", category: "npcs", source: "pack-reference", path: "Pack08/source/npc_pack_08_master_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed", note: "master presentation",
  },
  {
    id: "ref:rt-master-monster", category: "monsters", source: "pack-reference", path: "Pack09/source/monster_pack_09_master_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed", note: "master presentation",
  },
  {
    id: "ref:rt-master-boss", category: "bosses", source: "pack-reference", path: "Pack10/source/boss_pack_10_master_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed", note: "master presentation",
  },
  {
    id: "ref:rt-master-vfx", category: "vfx", source: "pack-reference", path: "Pack11/source/vfx_pack_11_master_reference.png",
    width: 0, height: 0, frames: 0, animationState: null, direction: null,
    origin: { x: 0.5, y: 1.0 }, logicalScale: 1, alpha: false,
    status: "REFERENCE_ONLY", confidence: "reviewed", note: "master presentation",
  },
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
];


/** Founder Lab runtime atlas — vector production fallback for the full vertical slice. */
const VISUAL_RUNTIME_ATLAS = "/game/rpg/visual/rpg_runtime_atlas.svg";
const VISUAL_ATLAS_LAYOUT: Array<[string, string, number, number]> = [
  ["npc_ki_jaka_full","npcs",0,0], ["npc_bu_ratmi","npcs",240,0], ["npc_bu_sari","npcs",480,0], ["npc_eyang_kartala","npcs",720,0],
  ["enemy_korog","monsters",0,160], ["enemy_korog_perang","monsters",240,160], ["enemy_golem_batu","monsters",480,160], ["enemy_korog_bayangan","monsters",720,160],
  ["boss_raja_korog","bosses",0,320], ["boss_golem_agung","bosses",240,320], ["boss_naga_abu","bosses",480,320], ["boss_penguasa_menara","bosses",720,320],
  ["prop_house_village","props",0,480], ["prop_tree_round","props",240,480], ["prop_well","props",480,480], ["prop_banner","props",720,480],
];
const VISUAL_ATLAS_ENTRIES: RpgAssetEntry[] = VISUAL_ATLAS_LAYOUT.map(([id, category, x, y]) => ({
  id, category, source: "generated-runtime-atlas",
  path: VISUAL_RUNTIME_ATLAS, width: 960, height: 640, frames: 1,
  animationState: null, direction: null, origin: { x: 0.5, y: 1.0 },
  logicalScale: 1, alpha: true, status: "READY" as const, confidence: "reviewed" as const,
  sourceRect: { x, y, width: 240, height: 160 },
  note: "Founder Lab vector atlas: cohesive Nusantara storybook silhouettes; replace with final painted source art without changing entity keys.",
}));

export const RPG_ASSET_MANIFEST: RpgAssetEntry[] = [
  ...VISUAL_ATLAS_ENTRIES,
  ...READY_TABLE.map(readyEntry),
  ...ARGA_RUNTIME_ENTRIES,
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

/** All Arga runtime sheets that are READY (rescued). */
export function argaRuntimeReady(): RpgAssetEntry[] {
  return RPG_ASSET_MANIFEST.filter(
    (e) => e.id.startsWith("sheet-char-arga-") && e.status === "READY",
  );
}

/** All Arga runtime sheets that are MISSING (no extractable source). */
export function argaRuntimeMissing(): RpgAssetEntry[] {
  return RPG_ASSET_MANIFEST.filter(
    (e) => e.id.startsWith("sheet-char-arga-") && e.status === "MISSING",
  );
}
