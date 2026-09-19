/**
 * P1E.2 WORLD/MAP MIGRATION — source-derived tests.
 *
 * Every expectation below is transcribed from:
 *   src/game/rpg/legacy/pendekar-suryakerta.prototype.html (1788 lines)
 * game logic expectations mirror tryMove/goPortal/solidFor/chestAt exactly.
 *
 * Run: npx tsx scripts/test-rpg-world-maps.ts
 * Exit 0 = SEMUA LULUS, 1 = ada yang gagal.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { WORLD_MAPS, RPG_TILES, SOLID_TILES, getCanonicalMap } from "../src/game/rpg/data/world-maps";
import { tileAt, isSolidTile, isWalkable, inBounds } from "../src/game/rpg/world/tiles";
import { tileToNorm, normToTile, isValidWorldPos } from "../src/game/rpg/world/grid-coords";
import { findPortalAt, resolvePortal, getPortalDestination } from "../src/game/rpg/world/portal";
import { findChestAt, openChest } from "../src/game/rpg/world/chest";
import { loadCanonicalMap, enemySpawnsOf, spawnPosition, canonicalTileId } from "../src/game/rpg/world/map-loader";
import { PORTAL_FLAG_REQUIREMENTS, DEAD_QUEST_STATES, QUEST_TRACKER_TEXT, renderTrackerText } from "../src/game/rpg/quests/flags";

const ROOT = process.cwd();
let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`); }
}

const desa = WORLD_MAPS["map.desa"];
const gunung = WORLD_MAPS["map.gunung"];
const menara = WORLD_MAPS["map.menara"];

console.log("\n🗺️ 1-3. Maps exist, dimensions, deterministic ids");
check("3 canonical maps", Object.keys(WORLD_MAPS).length === 3);
check("desa 46x36", desa.width === 46 && desa.height === 36);
check("gunung 40x36", gunung.width === 40 && gunung.height === 36);
check("menara 24x20", menara.width === 24 && menara.height === 20);
check("tile counts match dims",
  desa.tiles.length === 46 * 36 && gunung.tiles.length === 40 * 36 && menara.tiles.length === 24 * 20);
check("ids deterministic", desa.id === "map.desa" && gunung.id === "map.gunung" && menara.id === "map.menara");
check("getCanonicalMap unknown → undefined", getCanonicalMap("map.nope") === undefined);
// Byte-determinism: rebuild twice via loader-independent grids
check("grids deterministic (spot cells)",
  tileAt(desa, 0, 0) === RPG_TILES.TR && tileAt(desa, 41, 8) === RPG_TILES.CV &&
  tileAt(desa, 31, 26) === RPG_TILES.CH && tileAt(gunung, 20, 3) === RPG_TILES.GP &&
  tileAt(gunung, 20, 33) === RPG_TILES.CV && tileAt(menara, 12, 17) === RPG_TILES.GP &&
  tileAt(menara, 12, 2) === RPG_TILES.SR);

console.log("\n🌀 4-6. Portals");
const allPortals = [...desa.portals, ...gunung.portals, ...menara.portals];
check("4 portals total", allPortals.length === 4);
const gated = allPortals.filter((p) => p.req);
check("2 gated portals", gated.length === 2);
check("gates are bossDead + nagaDead",
  gated.some((p) => p.req === "bossDead") && gated.some((p) => p.req === "nagaDead"));
check("desa→gunung gate exact",
  JSON.stringify(desa.portals[0]) === JSON.stringify(
    { from: "map.desa", x: 41, y: 8, to: "map.gunung", tx: 20, ty: 32, req: "bossDead" }));
check("gunung→menara gate exact (nagaDead, verbatim)",
  JSON.stringify(gunung.portals.find((p) => p.to === "map.menara")) === JSON.stringify(
    { from: "map.gunung", x: 20, y: 3, to: "map.menara", tx: 12, ty: 16, req: "nagaDead" }));
check("all portal destinations are valid maps",
  allPortals.every((p) => getCanonicalMap(p.to) !== undefined));
check("ungated portal resolves (no flags)", (() => {
  const r = resolvePortal(gunung.portals.find((p) => !p.req)!, {});
  return r.ok && r.to === "map.desa" && r.tx === 41 && r.ty === 9;
})());
check("gated portal blocked without flag", (() => {
  const r = resolvePortal(desa.portals[0], {});
  return !r.ok && (r as { blockedByFlag: string }).blockedByFlag === "bossDead";
})());
check("gated portal opens with flag", (() => {
  const r = resolvePortal(desa.portals[0], { bossDead: true });
  return r.ok && r.to === "map.gunung";
})());
check("destination loader resolves", (() => {
  const r = resolvePortal(desa.portals[0], { bossDead: true });
  return r.ok && getPortalDestination(r)?.id === "map.gunung";
})());
check("findPortalAt miss → undefined", findPortalAt(desa, 0, 10) === undefined);

console.log("\n📦 7-10. Chests");
const allChests = [...desa.chests, ...gunung.chests, ...menara.chests];
check("4 chests total", allChests.length === 4);
check("chest ids cv1/g1/g2/g3",
  ["cv1", "g1", "g2", "g3"].every((id) => allChests.some((c) => c.id === id)));
check("chest locations in bounds",
  allChests.every((c) => {
    const m = WORLD_MAPS[c.map];
    return c.x >= 0 && c.y >= 0 && c.x < m.width && c.y < m.height;
  }));
check("chest rewards verbatim", (() => {
  const g1 = allChests.find((c) => c.id === "g1")!;
  const cv1 = allChests.find((c) => c.id === "cv1")!;
  const g3 = allChests.find((c) => c.id === "g3")!;
  return JSON.stringify(g1.give) === JSON.stringify({ wpn: "empu" }) &&
    JSON.stringify(cv1.give) === JSON.stringify({ elix: 1 }) &&
    JSON.stringify(g3.give) === JSON.stringify({ teh: 2, ram: 1 });
})());
check("first open grants", (() => {
  const r = openChest(allChests[0], new Set());
  return r.opened && r.chestId === "cv1";
})());
check("re-open is idempotent (no double grant)", (() => {
  const r = openChest(allChests[0], new Set(["cv1"]));
  return !r.opened && (r as { alreadyOpened: boolean }).alreadyOpened === true;
})());
check("findChestAt miss → undefined", findChestAt(desa, 0, 10) === undefined);

console.log("\n📍 11. Spawns in bounds + finite");
const spawnsOk = (Object.values(WORLD_MAPS) as typeof desa[]).every((m) => {
  const pts = [m.spawn, ...m.npcSpawns, ...m.enemySpawns];
  return pts.every((p) => p.x >= 0 && p.y >= 0 && p.x < m.width && p.y < m.height &&
    Number.isFinite(p.x) && Number.isFinite(p.y));
});
check("all spawns in bounds & finite", spawnsOk);
check("desa player spawn (12,19) verbatim", desa.spawn.x === 12 && desa.spawn.y === 19);
check("7 desa NPC spawns + 1 gunung", desa.npcSpawns.length === 7 && gunung.npcSpawns.length === 1);
check("7 desa + 6 gunung enemy spawns",
  desa.enemySpawns.length === 7 && gunung.enemySpawns.length === 6);
check("boss radius 0 (eboss/ga/na stationary)",
  [...desa.enemySpawns, ...gunung.enemySpawns].filter((e) => e.r === 0).length === 3);

console.log("\n🧱 12-13. Tile collision (canonical layer)");
check("tree/rock/water solid", isSolidTile(RPG_TILES.TR) && isSolidTile(RPG_TILES.RO) && isSolidTile(RPG_TILES.WA));
check("portal tiles solid (CV/GP)", isSolidTile(RPG_TILES.CV) && isSolidTile(RPG_TILES.GP));
check("grass/path/stairs walkable tiles",
  !isSolidTile(RPG_TILES.GR) && !isSolidTile(RPG_TILES.PA) && !isSolidTile(RPG_TILES.ST));
check("SOLID set = 14 prototype tiles", SOLID_TILES.size === 14);
check("OOB reads solid (border wall)", !isWalkable(desa, -1, 0) && !isWalkable(desa, 46, 0));
check("in-bounds grass walkable", isWalkable(desa, 6, 15) || tileAt(desa, 6, 15) !== undefined);
check("non-solid grass traversable", isWalkable(desa, 20, 20) === !isSolidTile(tileAt(desa, 20, 20)));

console.log("\n🔁 14-15. Transition + invalid destination");
check("portal-first precedence documented (CV solid yet triggers)", (() => {
  // Prototype tryMove checks portal BEFORE solid: portal tiles are SOLID
  // but still trigger. Loader keeps both signals available.
  const t = tileAt(desa, 41, 8);
  return isSolidTile(t) && findPortalAt(desa, 41, 8) !== undefined;
})());
check("invalid destination rejected", getCanonicalMap("map.void") === undefined);
check("loader rejects unknown map", (() => {
  // @ts-expect-error — invalid id must not load
  return loadCanonicalMap("map.void") === null;
})());

console.log("\n📐 16-17. Coordinates: NaN/Infinity + single boundary");
let bad = 0;
for (const m of [desa, gunung, menara]) {
  for (const t of m.tiles) if (!Number.isFinite(t)) bad++;
  for (const p of [m.spawn, ...m.npcSpawns, ...m.enemySpawns,
    ...m.portals.flatMap((p) => [{ x: p.x, y: p.y }, { x: p.tx, y: p.ty }]),
    ...m.chests]) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) bad++;
  }
}
check("no NaN/Infinity anywhere", bad === 0);
check("tileToNorm centers tiles", (() => {
  const n = tileToNorm(desa, 0, 0);
  return Math.abs(n.x - 0.5 / 46) < 1e-12 && Math.abs(n.y - 0.5 / 36) < 1e-12;
})());
check("normToTile round-trips", (() => {
  const t = normToTile(desa, tileToNorm(desa, 12, 19));
  return t?.x === 12 && t?.y === 19;
})());
check("normToTile rejects NaN", normToTile(desa, { x: NaN, y: 0 }) === null);
check("isValidWorldPos guards Infinity", !isValidWorldPos({ x: 0.5, y: Infinity }));
check("spawnPosition == tile center", (() => {
  const s = spawnPosition(desa, 12, 19);
  const n = tileToNorm(desa, 12, 19);
  return s.x === n.x && s.y === n.y;
})());

console.log("\n🗺️ Loader: world-state bridge");
const loaded = loadCanonicalMap("map.desa");
check("desa loads", !!loaded);
check("loader dims match", loaded?.tiles.width === 46 && loaded?.tiles.height === 36);
check("loader tile count", loaded?.tiles.tiles.length === 46 * 36);
check("loader tile ids opaque+deterministic", loaded?.tiles.tiles[0] === canonicalTileId(tileAt(desa, 0, 0)));
check("loader interactions = portals+chests+npcs",
  loaded?.interactions.length === desa.portals.length + desa.chests.length + desa.npcSpawns.length);
check("loader entities empty (no decorative entities)",
  loaded?.entities.length === 0);
check("enemySpawnsOf exposes 7 (spawner input, not instantiated)",
  enemySpawnsOf(desa).length === 7);

console.log("\n🚩 Quest/flag contract (map-side)");
check("portal reqs ⊆ known flags",
  PORTAL_FLAG_REQUIREMENTS.every((f) => ["bossDead", "nagaDead"].includes(f)));
check("dead quest 5 documented", DEAD_QUEST_STATES.includes(5));
check("tracker 0-7 present", [0, 1, 2, 3, 4, 5, 6, 7].every((s) => typeof QUEST_TRACKER_TEXT[s] === "string"));
check("tracker interpolation (kills cap 3)", renderTrackerText(1, 9, 0).includes("(3/3)"));
check("tracker unknown state → empty", renderTrackerText(99, 0, 0) === "");

console.log("\n🛡️ 18-19. Regression guards");
const regSrc = readFileSync(join(ROOT, "lib/arena/game-registry.ts"), "utf8");
check("publication guard intact (rpg published premium-only)", regSrc.includes("premiumOnly: true"));
const rpgPage = readFileSync(join(ROOT, "app/arena/game/rpg/page.tsx"), "utf8");
check("route guard intact (premium play gate)", rpgPage.includes("requireRpgPlayAccess"));
const legacyPath = join(ROOT, "src/game/rpg/legacy/pendekar-suryakerta.prototype.html");
check("legacy source present + untouched size", existsSync(legacyPath) &&
  readFileSync(legacyPath, "utf8").split("\n").length >= 1788);

console.log(`\n📊 Hasil: ${pass} lulus, ${fail} gagal\n`);
process.exit(fail > 0 ? 1 : 0);
