/**
 * Canonical world maps — Pendekar Suryakerta (P1E.2 WORLD/MAP MIGRATION).
 *
 * SOURCE OF TRUTH: src/game/rpg/legacy/pendekar-suryakerta.prototype.html
 * (1788 lines). Map builders below are VERBATIM ports of the prototype's
 * buildDesa / buildGunung / buildMenara (including seeded scatter via
 * mulberry32) — no redesigned topology, no invented tiles, no procedural
 * guesses. Seeded RNG makes output byte-deterministic across runs.
 *
 * Verified against source:
 * - DESA SURYAKERTA 46x36, GUNUNG KARANG 40x36, MENARA ANGIN 24x20
 * - 4 portals (2 flag-gated: bossDead, nagaDead), 4 chests (cv1, g1, g2, g3)
 * - NPC positions + enemy edefs transcribed verbatim from MAPS
 * - Player spawn desa (12,19) from prototype newGame state
 *
 * Gameplay data only — rendering consumes world coordinates via
 * world/grid-coords.ts. Tile art NEVER defines collision (see world/tiles.ts).
 */

/** Prototype tile ids — numeric values VERBATIM (TS=16 in prototype). */
export const RPG_TILES = {
  GR: 0, // grass
  PA: 1, // path
  TR: 2, // tree (solid, border)
  WA: 3, // water
  RO: 4, // rock
  WL: 5, // wall
  RF: 6, // roof
  DR: 7, // door
  FL: 8, // flower
  WE: 9, // well
  CV: 10, // cave mouth (portal tile)
  DK: 11, // dock
  FA: 12, // farm field
  GD: 13, // dry ground
  RL: 14, // lava rock (gunung decor)
  CH: 15, // chest (interactable tile)
  GE: 16, // golden flower (pickable)
  ST: 17, // stairs
  SN: 18, // snow
  LV: 19, // lava (animated)
  PT: 20, // pillar
  SR: 21, // stairs-up (menara ascent trigger)
  GP: 22, // gate portal (portal tile)
  TC: 23, // torch
} as const;

/** Prototype SOLID set — VERBATIM (line 333). Out-of-bounds reads as TR. */
export const SOLID_TILES: ReadonlySet<number> = new Set([
  RPG_TILES.TR, RPG_TILES.WA, RPG_TILES.RO, RPG_TILES.WL,
  RPG_TILES.RF, RPG_TILES.DR, RPG_TILES.WE, RPG_TILES.CV,
  RPG_TILES.DK, RPG_TILES.CH, RPG_TILES.LV, RPG_TILES.PT,
  RPG_TILES.GP, RPG_TILES.TC,
]);

/* ---------- Prototype grid helpers (verbatim) ---------- */

function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface ProtoGrid { w: number; h: number; t: Uint8Array }

function newGrid(w: number, h: number): ProtoGrid {
  return { w, h, t: new Uint8Array(w * h) };
}

function gget(m: ProtoGrid, x: number, y: number): number {
  return x < 0 || y < 0 || x >= m.w || y >= m.h ? RPG_TILES.TR : m.t[y * m.w + x];
}

function gset(m: ProtoGrid, x: number, y: number, t: number): void {
  if (x >= 0 && y >= 0 && x < m.w && y < m.h) m.t[y * m.w + x] = t;
}

function grect(m: ProtoGrid, x: number, y: number, w: number, h: number, t: number): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) gset(m, i, j, t);
}

/* ---------- Map builders (verbatim ports) ---------- */

function buildDesaGrid(): ProtoGrid {
  const T = RPG_TILES;
  const m = newGrid(46, 36);

  // Authored village layout: a readable central settlement, clear road
  // hierarchy, a river with one meaningful crossing, and quiet residential
  // pockets. Gameplay coordinates remain tile-authoritative.
  grect(m, 0, 0, 46, 36, T.GR);

  // River on the eastern edge of the village. It is deliberately continuous;
  // the bridge crossing below is the only walkable cut through it.
  grect(m, 31, 2, 3, 32, T.WA);
  grect(m, 31, 18, 3, 1, T.PA);

  // Main village road: vertical spine + central plaza + short branches.
  grect(m, 17, 4, 3, 27, T.PA);
  grect(m, 6, 17, 27, 3, T.PA);
  grect(m, 9, 10, 11, 2, T.PA);
  grect(m, 20, 10, 9, 2, T.PA);
  grect(m, 8, 25, 10, 2, T.PA);
  grect(m, 20, 25, 10, 2, T.PA);

  // Central plaza.
  grect(m, 14, 15, 9, 7, T.PA);

  // Two cultivated pockets provide visual identity without becoming noise.
  grect(m, 5, 27, 7, 4, T.FA);
  grect(m, 23, 27, 6, 4, T.FA);

  // Small dirt transition areas around the homes.
  grect(m, 4, 8, 5, 3, T.GD);
  grect(m, 23, 8, 6, 3, T.GD);
  grect(m, 4, 21, 6, 3, T.GD);
  grect(m, 23, 21, 6, 3, T.GD);

  // A few authored rocks/flowers are gameplay-neutral decorative tiles.
  gset(m, 5, 6, T.FL); gset(m, 8, 7, T.FL);
  gset(m, 27, 6, T.FL); gset(m, 29, 7, T.FL);
  gset(m, 5, 24, T.RO); gset(m, 29, 24, T.RO);
  gset(m, 6, 32, T.FL); gset(m, 27, 32, T.FL);

  // Village edge. Collision still treats out-of-bounds as solid, but the
  // authored border keeps the camera visually framed.
  for (let x = 0; x < 46; x++) {
    gset(m, x, 0, T.TR); gset(m, x, 1, T.TR);
    gset(m, x, 34, T.TR); gset(m, x, 35, T.TR);
  }
  for (let y = 0; y < 36; y++) {
    gset(m, 0, y, T.TR); gset(m, 1, y, T.TR);
    gset(m, 44, y, T.TR); gset(m, 45, y, T.TR);
  }

  return m;
}

function buildGunungGrid(): ProtoGrid {
  const T = RPG_TILES;
  const m = newGrid(40, 36);
  grect(m, 0, 0, 40, 36, T.GD);
  const rnd = mulberry32(777001);
  for (let y = 2; y < 34; y++) for (let x = 2; x < 38; x++) {
    const r = rnd();
    if (r < 0.30) gset(m, x, y, T.RO);
    else if (r < 0.34) gset(m, x, y, T.LV);
    else if (y < 12 && r < 0.5) gset(m, x, y, T.SN);
  }
  grect(m, 20, 28, 1, 6, T.ST);
  grect(m, 12, 28, 9, 1, T.ST);
  grect(m, 12, 22, 1, 7, T.ST);
  grect(m, 12, 22, 15, 1, T.ST);
  grect(m, 26, 16, 1, 7, T.ST);
  grect(m, 14, 16, 13, 1, T.ST);
  grect(m, 14, 10, 1, 7, T.ST);
  grect(m, 14, 10, 7, 1, T.ST);
  grect(m, 20, 6, 1, 5, T.ST);
  grect(m, 17, 3, 7, 4, T.ST);
  grect(m, 19, 7, 1, 3, T.RO); grect(m, 21, 7, 1, 3, T.RO);
  gset(m, 20, 33, T.CV);
  gset(m, 11, 25, T.CH); gset(m, 27, 19, T.CH); gset(m, 13, 15, T.CH);
  gset(m, 12, 24, T.GE);
  gset(m, 17, 3, T.PT); gset(m, 23, 3, T.PT);
  gset(m, 20, 3, T.GP);
  gset(m, 13, 23, T.GD);
  for (let x = 0; x < 40; x++) { gset(m, x, 0, T.RO); gset(m, x, 1, T.RO); gset(m, x, 34, T.RO); gset(m, x, 35, T.RO); }
  for (let y = 0; y < 36; y++) { gset(m, 0, y, T.RO); gset(m, 1, y, T.RO); gset(m, 38, y, T.RO); gset(m, 39, y, T.RO); }
  return m;
}

function buildMenaraGrid(): ProtoGrid {
  const T = RPG_TILES;
  const m = newGrid(24, 20);
  grect(m, 0, 0, 24, 20, T.ST);
  for (let x = 0; x < 24; x++) { gset(m, x, 0, T.RO); gset(m, x, 19, T.RO); }
  for (let y = 0; y < 20; y++) { gset(m, 0, y, T.RO); gset(m, 23, y, T.RO); }
  [[3,1],[8,1],[15,1],[20,1],[1,6],[1,13],[22,6],[22,13]].forEach(([x, y]) => gset(m, x, y, T.TC));
  [[4,4],[19,4],[4,14],[19,14]].forEach(([x, y]) => gset(m, x, y, T.PT));
  gset(m, 12, 17, T.GP);
  gset(m, 12, 2, T.SR);
  return m;
}

/* ---------- Canonical map records ---------- */

export type CanonicalMapId = "map.desa" | "map.gunung" | "map.menara";

export interface CanonicalPortal {
  /** Source map + tile. */
  from: CanonicalMapId; x: number; y: number;
  /** Destination map + spawn tile. */
  to: CanonicalMapId; tx: number; ty: number;
  /** Required quest flag (verbatim prototype `req`), if any. */
  req?: string;
}

export interface CanonicalChestReward {
  gold?: number; ram?: number; teh?: number; elix?: number; bijih?: number;
  wpn?: string; arm?: string;
}

export interface CanonicalChest {
  map: CanonicalMapId; x: number; y: number; id: string;
  /** Reward payload VERBATIM from prototype `give` (keys ram/teh/elix/bijih/wpn/arm/gold).
   *  Application to production inventory ids is owned by a later (inventory) phase. */
  give: CanonicalChestReward;
  msg: string;
}

export interface CanonicalNpcSpawn {
  id: string; name: string; x: number; y: number; dir: string;
}

export interface CanonicalEnemySpawn {
  id: string; type: string; x: number; y: number;
  /** Patrol radius in tiles (0 = stationary boss). */
  r: number;
}

export interface CanonicalEntity {
  id: string;
  type: string;
  /** Tile position (converted to normalized by map-loader). */
  x: number; y: number;
  scale: number;
  layer: "BEHIND_ENTITIES" | "ENTITIES" | "FRONT_OF_ENTITIES" | "GROUND_DECOR";
  solid: boolean;
  asset: string;
}

export interface CanonicalMap {
  id: CanonicalMapId;
  name: string;
  width: number;
  height: number;
  /** Row-major prototype tile ids (RPG_TILES values). Deterministic. */
  tiles: number[];
  /** Player spawn tile (prototype newGame / portal-entry semantics). */
  spawn: { x: number; y: number };
  portals: CanonicalPortal[];
  chests: CanonicalChest[];
  npcSpawns: CanonicalNpcSpawn[];
  enemySpawns: CanonicalEnemySpawn[];
  entities: CanonicalEntity[];
}

function toMap(
  id: CanonicalMapId, name: string, grid: ProtoGrid,
  spawn: { x: number; y: number },
  portals: CanonicalPortal[], chests: CanonicalChest[],
  npcSpawns: CanonicalNpcSpawn[], enemySpawns: CanonicalEnemySpawn[],
  entities: CanonicalEntity[] = [],
): CanonicalMap {
  return { id, name, width: grid.w, height: grid.h, tiles: Array.from(grid.t), spawn, portals, chests, npcSpawns, enemySpawns, entities };
}

const desaGrid = buildDesaGrid();
const gunungGrid = buildGunungGrid();
const menaraGrid = buildMenaraGrid();

/** Portals VERBATIM (prototype PORTALS, lines 482-487). */
const PORTALS: CanonicalPortal[] = [
  { from: "map.desa", x: 41, y: 8, to: "map.gunung", tx: 20, ty: 32, req: "bossDead" },
  { from: "map.gunung", x: 20, y: 33, to: "map.desa", tx: 41, ty: 9 },
  { from: "map.gunung", x: 20, y: 3, to: "map.menara", tx: 12, ty: 16, req: "nagaDead" },
  { from: "map.menara", x: 12, y: 17, to: "map.gunung", tx: 20, ty: 4 },
];

/** Chests VERBATIM (prototype CHESTS, lines 488-493). */
const CHESTS: CanonicalChest[] = [
  { map: "map.desa", x: 31, y: 26, id: "cv1", give: { elix: 1 }, msg: "Dapat 1 ELIXIR! Pemulihan penuh saat bertarung!" },
  { map: "map.gunung", x: 11, y: 25, id: "g1", give: { wpn: "empu" }, msg: "Pedang EMPU ditemukan! Serang +9!" },
  { map: "map.gunung", x: 27, y: 19, id: "g2", give: { arm: "baja" }, msg: "Zirah BAJA ditemukan! Tahan +7!" },
  { map: "map.gunung", x: 13, y: 15, id: "g3", give: { teh: 2, ram: 1 }, msg: "2 Teh Gunung & 1 Ramuan!" },
];

const portalsOf = (map: CanonicalMapId): CanonicalPortal[] =>
  PORTALS.filter((p) => p.from === map);
const chestsOf = (map: CanonicalMapId): CanonicalChest[] =>
  CHESTS.filter((c) => c.map === map);

export const WORLD_MAPS: Record<CanonicalMapId, CanonicalMap> = {
  "map.desa": toMap(
    "map.desa", "Desa Suryakerta", desaGrid,
    { x: 12, y: 19 }, // prototype newGame spawn (line 511)
    portalsOf("map.desa"),
    chestsOf("map.desa"),
    [
      { id: "ki", name: "Ki Jaka", x: 18, y: 19, dir: "down" },
      { id: "ratmi", name: "Bu Ratmi", x: 13, y: 15, dir: "down" },
      { id: "sari", name: "Bu Sari", x: 7, y: 25, dir: "down" },
      { id: "eyang", name: "Eyang Kartala", x: 17, y: 20, dir: "down" },
      { id: "bagas", name: "Bagas", x: 9, y: 19, dir: "down" },
      { id: "tani", name: "Pak Warsa", x: 14, y: 27, dir: "down" },
      { id: "empu", name: "Pak Empu", x: 16, y: 16, dir: "down" },
    ],
    [
      { id: "e1", type: "g", x: 33, y: 11, r: 2 }, { id: "e2", type: "g", x: 34, y: 14, r: 2 },
      { id: "e3", type: "g", x: 31, y: 21, r: 2 }, { id: "e4", type: "g", x: 32, y: 24, r: 2 },
      { id: "e5", type: "w", x: 34, y: 9, r: 2 }, { id: "e6", type: "w", x: 39, y: 10, r: 1 },
      { id: "eboss", type: "b", x: 41, y: 10, r: 0 },
    ],
    [
      // P2.8.6-B1: Ki Jaka village pocket — visual entities over tile structures.
      // House: RF(16-20,18-19), WL(16-20,20), DR(18,20). Entity at house center.
      { id: "ent.ki-house", type: "house", x: 18, y: 18, scale: 1, layer: "BEHIND_ENTITIES", solid: true, asset: "house.village" },
      { id: "ent.ki-tree.1", type: "tree", x: 16, y: 17, scale: 1, layer: "BEHIND_ENTITIES", solid: true, asset: "tree.round" },
      { id: "ent.ki-tree.2", type: "tree", x: 20, y: 17, scale: 1.1, layer: "BEHIND_ENTITIES", solid: true, asset: "tree.round" },
      { id: "ent.ki-rock.1", type: "rock", x: 15, y: 20, scale: 0.8, layer: "GROUND_DECOR", solid: false, asset: "rock.gray" },
      { id: "ent.ki-rock.2", type: "rock", x: 20, y: 20, scale: 0.7, layer: "GROUND_DECOR", solid: false, asset: "rock.gray" },
      { id: "ent.desa-bamboo", type: "bamboo", x: 23, y: 17, scale: 1, layer: "BEHIND_ENTITIES", solid: true, asset: "bamboo.grove" },
      { id: "ent.desa-shrine", type: "shrine", x: 8, y: 27, scale: 0.9, layer: "BEHIND_ENTITIES", solid: true, asset: "shrine.gate" },
      { id: "ent.desa-lantern", type: "lantern", x: 15, y: 18, scale: 0.85, layer: "FRONT_OF_ENTITIES", solid: false, asset: "lantern.stone" },
      { id: "ent.desa-well", type: "well", x: 11, y: 18, scale: 0.95, layer: "BEHIND_ENTITIES", solid: true, asset: "well.stone" },
      { id: "ent.desa-banner", type: "banner", x: 9, y: 27, scale: 0.8, layer: "FRONT_OF_ENTITIES", solid: false, asset: "banner.village" },
      { id: "ent.desa-bridge", type: "bridge", x: 28, y: 17, scale: 1, layer: "BEHIND_ENTITIES", solid: true, asset: "bridge.wood" },
    ],
  ),
  "map.gunung": toMap(
    "map.gunung", "Gunung Karang", gunungGrid,
    { x: 20, y: 32 }, // portal-entry spawn (desa→gunung destination)
    portalsOf("map.gunung"),
    chestsOf("map.gunung"),
    [{ id: "pendaki", name: "Pak Pendaki", x: 13, y: 23, dir: "down" }],
    [
      { id: "mgl1", type: "gl", x: 18, y: 28, r: 2 }, { id: "mgl2", type: "gl", x: 24, y: 20, r: 2 },
      { id: "msh1", type: "sh", x: 12, y: 19, r: 2 }, { id: "msh2", type: "sh", x: 25, y: 16, r: 2 },
      { id: "ga", type: "ga", x: 20, y: 8, r: 0 },
      { id: "na", type: "na", x: 20, y: 4, r: 0 },
    ],
    [
      { id: "ent.gunung-bamboo", type: "bamboo", x: 7, y: 12, scale: 1.05, layer: "BEHIND_ENTITIES", solid: true, asset: "bamboo.grove" },
      { id: "ent.gunung-shrine", type: "shrine", x: 17, y: 6, scale: 0.8, layer: "BEHIND_ENTITIES", solid: true, asset: "shrine.gate" },
      { id: "ent.gunung-lantern.1", type: "lantern", x: 13, y: 22, scale: 0.8, layer: "FRONT_OF_ENTITIES", solid: false, asset: "lantern.stone" },
      { id: "ent.gunung-lantern.2", type: "lantern", x: 26, y: 15, scale: 0.8, layer: "FRONT_OF_ENTITIES", solid: false, asset: "lantern.stone" },
      { id: "ent.gunung-bridge", type: "bridge", x: 20, y: 28, scale: 0.9, layer: "BEHIND_ENTITIES", solid: true, asset: "bridge.wood" },
    ],
  ),
  "map.menara": toMap(
    "map.menara", "Menara Angin", menaraGrid,
    { x: 12, y: 16 }, // portal-entry spawn (gunung→menara destination)
    portalsOf("map.menara"),
    chestsOf("map.menara"),
    [],
    [], // menara waves are combat-phase content (spawnWave), not map spawns
    [
      { id: "ent.menara-shrine", type: "shrine", x: 12, y: 6, scale: 0.85, layer: "BEHIND_ENTITIES", solid: true, asset: "shrine.gate" },
      { id: "ent.menara-lantern.1", type: "lantern", x: 6, y: 5, scale: 0.8, layer: "FRONT_OF_ENTITIES", solid: false, asset: "lantern.stone" },
      { id: "ent.menara-lantern.2", type: "lantern", x: 18, y: 5, scale: 0.8, layer: "FRONT_OF_ENTITIES", solid: false, asset: "lantern.stone" },
    ],
  ),
};

export function getCanonicalMap(id: string): CanonicalMap | undefined {
  if (id === "map.desa" || id === "map.gunung" || id === "map.menara") return WORLD_MAPS[id];
  return undefined;
}
