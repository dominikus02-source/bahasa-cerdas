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
  grect(m, 0, 0, 46, 36, T.GR);
  grect(m, 27, 2, 2, 32, T.WA);
  grect(m, 27, 17, 2, 1, T.PA); // P2.8.6-B2: dock crossing → walkable path tiles
  const house = (x0: number, y0: number, dx: number) => {
    grect(m, x0, y0, 5, 2, T.RF); grect(m, x0, y0 + 2, 5, 1, T.WL); gset(m, dx, y0 + 2, T.DR);
  };
  house(4, 12, 6); house(11, 12, 13); house(5, 22, 7);
  // P2.8.6-B1: Ki Jaka's house — compact village pocket VISIBLE in camera viewport.
  // Camera centers on player at (12,19), viewport y≈0.430-0.653 → visible tiles y≈14-24.
  // House below main road: RF(16-20,18-19), WL(16-20,20), DR(18,20).
  house(16, 18, 18);
  // Trees on main road flanking house entrance.
  gset(m, 16, 17, T.TR); gset(m, 20, 17, T.TR);
  // Path from Ki Jaka area down.
  gset(m, 18, 21, T.PA); gset(m, 18, 22, T.PA);
  // Decorative rocks near house.
  gset(m, 15, 20, T.RO); gset(m, 20, 20, T.RO);
  gset(m, 11, 18, T.WE);
  grect(m, 5, 17, 22, 1, T.PA);
  grect(m, 12, 18, 1, 10, T.PA);
  grect(m, 7, 28, 10, 4, T.FA);
  grect(m, 29, 2, 15, 32, T.GD);
  const rnd = mulberry32(20240613);
  for (let y = 2; y < 34; y++) for (let x = 29; x < 44; x++)
    if (gget(m, x, y) === T.GD && rnd() < 0.52) gset(m, x, y, T.TR);
  grect(m, 29, 17, 5, 1, T.PA);
  grect(m, 33, 8, 2, 10, T.GD);
  grect(m, 34, 8, 5, 1, T.GD);
  grect(m, 31, 18, 2, 9, T.GD);
  grect(m, 29, 25, 5, 3, T.GD);
  grect(m, 39, 3, 5, 6, T.RO);
  grect(m, 39, 8, 5, 3, T.RL);
  gset(m, 41, 8, T.CV);
  gset(m, 31, 26, T.CH);
  grect(m, 32, 22, 3, 1, T.GD); grect(m, 33, 21, 3, 3, T.GD);
  gset(m, 34, 22, T.GE);
  gset(m, 4, 26, T.GE);
  const PROTECT = [[6,15],[13,15],[7,25],[11,18],[9,19],[17,20],[14,27],[12,18],[12,19],[31,26],
    [16,20],[18,20],[17,19],[17,21],[10,18],[12,20],[13,27],[15,27],[16,16],[4,26],[34,22],[41,8],[41,9],
    [16,17],[20,17],[18,21],[15,20],[20,20],[18,19]]; // P2.8.6-B1: Ki Jaka village pocket (viewport-visible)
  const prot = (x: number, y: number) => PROTECT.some((p) => Math.abs(p[0] - x) <= 1 && Math.abs(p[1] - y) <= 1);
  for (let y = 2; y < 34; y++) for (let x = 2; x < 27; x++) {
    if (gget(m, x, y) !== T.GR || prot(x, y)) continue;
    const r = rnd();
    if (r < 0.07) gset(m, x, y, T.FL);
    else if (r < 0.09) gset(m, x, y, T.TR);
    else if (r < 0.105) gset(m, x, y, T.RO);
  }
  for (let x = 0; x < 46; x++) { gset(m, x, 0, T.TR); gset(m, x, 1, T.TR); gset(m, x, 34, T.TR); gset(m, x, 35, T.TR); }
  for (let y = 0; y < 36; y++) { gset(m, 0, y, T.TR); gset(m, 1, y, T.TR); gset(m, 44, y, T.TR); gset(m, 45, y, T.TR); }
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
  layer: "BEHIND_ENTITIES" | "ENTITIES" | "GROUND_DECOR";
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
  ),
  "map.menara": toMap(
    "map.menara", "Menara Angin", menaraGrid,
    { x: 12, y: 16 }, // portal-entry spawn (gunung→menara destination)
    portalsOf("map.menara"),
    chestsOf("map.menara"),
    [],
    [], // menara waves are combat-phase content (spawnWave), not map spawns
  ),
};

export function getCanonicalMap(id: string): CanonicalMap | undefined {
  if (id === "map.desa" || id === "map.gunung" || id === "map.menara") return WORLD_MAPS[id];
  return undefined;
}
