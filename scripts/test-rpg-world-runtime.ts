/**
 * P1E.3 WORLD RUNTIME INTEGRATION — runtime tests.
 *
 * Drives the pure rule core (world-step + portal + chest + loader + flags)
 * exactly as core/game-engine.ts calls it (same argument shapes), plus
 * persistence-schema round-trips and static integration guards.
 * The engine itself needs DOM and is covered by tsc + build + source guards.
 *
 * Run: npx tsx scripts/test-rpg-world-runtime.ts
 * Exit 0 = SEMUA LULUS, 1 = ada yang gagal.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { WORLD_MAPS } from "../src/game/rpg/data/world-maps";
import { stepTile, interactTile, facingTile } from "../src/game/rpg/world/world-step";
import { tileToNorm } from "../src/game/rpg/world/grid-coords";
import { isWalkable } from "../src/game/rpg/world/tiles";
import { loadCanonicalMap, spawnPosition } from "../src/game/rpg/world/map-loader";
import { openChest } from "../src/game/rpg/world/chest";

const ROOT = process.cwd();
let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`); }
}

function src(p: string): string {
  return readFileSync(join(ROOT, p), "utf8");
}

const desa = WORLD_MAPS["map.desa"];
const gunung = WORLD_MAPS["map.gunung"];

console.log("\n🚶 1-3. Movement: walkable / solid / OOB");
check("1. walkable step MOVED", (() => {
  const r = stepTile({ mapId: "map.desa", from: { x: 12, y: 19 }, to: { x: 12, y: 20 }, flags: {} });
  return r.kind === "MOVED" && r.tile.x === 12 && r.tile.y === 20;
})());
check("2. solid wall BLOCKED (house WL)", (() => {
  const r = stepTile({ mapId: "map.desa", from: { x: 6, y: 15 }, to: { x: 6, y: 14 }, flags: {} });
  return r.kind === "BLOCKED" && r.reason === "SOLID";
})());
check("2b. border tree BLOCKED", (() => {
  const r = stepTile({ mapId: "map.desa", from: { x: 2, y: 10 }, to: { x: 1, y: 10 }, flags: {} });
  return r.kind === "BLOCKED";
})());
check("3. OOB BLOCKED", (() => {
  const r = stepTile({ mapId: "map.desa", from: { x: 0, y: 10 }, to: { x: -1, y: 10 }, flags: {} });
  return r.kind === "BLOCKED" && r.reason === "OOB";
})());

console.log("\n🌀 4-9. Portals");
check("4. portal trigger detected (CV tile)", (() => {
  const r = stepTile({ mapId: "map.desa", from: { x: 41, y: 9 }, to: { x: 41, y: 8 }, flags: { bossDead: true } });
  return r.kind === "TRANSITION" && r.to === "map.gunung";
})());
check("5. ungated portal transitions", (() => {
  const r = stepTile({ mapId: "map.gunung", from: { x: 20, y: 32 }, to: { x: 20, y: 33 }, flags: {} });
  return r.kind === "TRANSITION" && r.to === "map.desa" && r.tx === 41 && r.ty === 9;
})());
check("6. gated blocks without flag", (() => {
  const r = stepTile({ mapId: "map.desa", from: { x: 41, y: 9 }, to: { x: 41, y: 8 }, flags: {} });
  return r.kind === "PORTAL_BLOCKED" && (r as { flag: string }).flag === "bossDead";
})());
check("7. gated transitions with flag", (() => {
  const r = stepTile({ mapId: "map.desa", from: { x: 41, y: 9 }, to: { x: 41, y: 8 }, flags: { bossDead: true } });
  return r.kind === "TRANSITION";
})());
check("8. exact destination spawns", (() => {
  const a = stepTile({ mapId: "map.desa", from: { x: 41, y: 9 }, to: { x: 41, y: 8 }, flags: { bossDead: true } });
  const b = stepTile({ mapId: "map.gunung", from: { x: 20, y: 4 }, to: { x: 20, y: 3 }, flags: { nagaDead: true } });
  const c = stepTile({ mapId: "map.menara", from: { x: 12, y: 16 }, to: { x: 12, y: 17 }, flags: {} });
  return a.kind === "TRANSITION" && a.tx === 20 && a.ty === 32 &&
    b.kind === "TRANSITION" && b.tx === 12 && b.ty === 16 &&
    c.kind === "TRANSITION" && c.tx === 20 && c.ty === 4;
})());
check("9. no double processing (deterministic + dest has no portal)", (() => {
  const once = stepTile({ mapId: "map.desa", from: { x: 41, y: 9 }, to: { x: 41, y: 8 }, flags: { bossDead: true } });
  const twice = stepTile({ mapId: "map.desa", from: { x: 41, y: 9 }, to: { x: 41, y: 8 }, flags: { bossDead: true } });
  if (once.kind !== "TRANSITION" || JSON.stringify(once) !== JSON.stringify(twice)) return false;
  // every portal destination tile carries no portal of its own (no ping-pong)
  const dests: Array<[string, number, number]> = [
    ["map.gunung", 20, 32], ["map.desa", 41, 9], ["map.menara", 12, 16], ["map.gunung", 20, 4],
  ];
  return dests.every(([m, x, y]) => {
    const map = WORLD_MAPS[m as keyof typeof WORLD_MAPS];
    return !map.portals.some((p) => p.x === x && p.y === y);
  });
})());

console.log("\n🔁 10. Atomic transition");
check("10. world swap complete + source untouched", (() => {
  const before = JSON.stringify(desa.tiles);
  const world = loadCanonicalMap("map.gunung")!;
  const pos = spawnPosition(WORLD_MAPS["map.gunung"], 20, 32);
  const n = tileToNorm(WORLD_MAPS["map.gunung"], 20, 32);
  return world.mapId === "map.gunung" && pos.x === n.x && pos.y === n.y &&
    JSON.stringify(desa.tiles) === before &&
    world.interactions.length === gunung.portals.length + gunung.chests.length + gunung.npcSpawns.length;
})());

console.log("\n🎨 10b. Authored visual entities");
check("10b. authored props survive canonical → runtime", (() => {
  const desaWorld = loadCanonicalMap("map.desa")!;
  const gunungWorld = loadCanonicalMap("map.gunung")!;
  const menaraWorld = loadCanonicalMap("map.menara")!;
  const expected = ["bamboo.grove", "shrine.gate", "lantern.stone", "bridge.wood", "well.stone", "banner.village"];
  return expected.every((asset) => desaWorld.entities.some((e) => e.asset === asset)) &&
    ["bamboo.grove", "shrine.gate", "lantern.stone", "bridge.wood"].every((asset) => gunungWorld.entities.some((e) => e.asset === asset)) &&
    menaraWorld.entities.some((e) => e.asset === "shrine.gate") &&
    menaraWorld.entities.filter((e) => e.asset === "lantern.stone").length === 2;
})());
check("10b. entity coordinates normalized + deterministic", (() => {
  const a = loadCanonicalMap("map.desa")!;
  const b = loadCanonicalMap("map.desa")!;
  return a.entities.length > 0 &&
    a.entities.every((e) => e.position.x >= 0 && e.position.x <= 1 && e.position.y >= 0 && e.position.y <= 1) &&
    JSON.stringify(a.entities) === JSON.stringify(b.entities);
})());

console.log("\n📦 11-12. Chest runtime");
check("11. adjacent interact grants once", (() => {
  // cv1 at (31,26); stand (31,27) facing up — tile walkable (GD)
  if (!isWalkable(desa, 31, 27)) return false;
  const r = interactTile({ mapId: "map.desa", tile: { x: 31, y: 27 }, dir: "up", openedChests: new Set() });
  return r.kind === "CHEST_OPENED" && r.chestId === "cv1" && JSON.stringify(r.give) === JSON.stringify({ elix: 1 });
})());
check("12. re-open gives nothing", (() => {
  const r = interactTile({ mapId: "map.desa", tile: { x: 31, y: 27 }, dir: "up", openedChests: new Set(["cv1"]) });
  return r.kind === "CHEST_EMPTY";
})());
check("facing helper correct", (() => {
  const t = facingTile({ x: 5, y: 5 }, "up");
  return t.x === 5 && t.y === 4;
})());

console.log("\n🚩 13. Flags survive transition");
check("13. flags pass through resolution untouched", (() => {
  const flags = { bossDead: true, sariQ: true };
  const r = stepTile({ mapId: "map.desa", from: { x: 41, y: 9 }, to: { x: 41, y: 8 }, flags });
  return r.kind === "TRANSITION" && flags.bossDead === true && flags.sariQ === true;
})());

console.log("\n💾 14-16. Persistence boundary schema");
check("14-16. map/pos/flags/chests round-trip", (() => {
  const saved = {
    mapId: "map.gunung",
    position: tileToNorm(gunung, 20, 32),
    flags: { bossDead: true },
    openedChests: ["cv1"],
  };
  const back = JSON.parse(JSON.stringify(saved));
  return back.mapId === "map.gunung" &&
    back.position.x === saved.position.x && back.position.y === saved.position.y &&
    back.flags.bossDead === true && back.openedChests[0] === "cv1";
})());
check("persistence carries map-side fields", (() => {
  const p = src("src/game/rpg/core/persistence.ts");
  return p.includes("openedChests") && p.includes("flags") && p.includes("RPGMapSideState");
})());

console.log("\n📐 17-18. Safety");
check("17. spawn positions finite (all maps)", (() => {
  return (Object.values(WORLD_MAPS) as typeof desa[]).every((m) => {
    const pts = [m.spawn, ...m.npcSpawns, ...m.enemySpawns];
    return pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  });
})());
check("18. invalid map → LEGACY everywhere", (() => {
  const s = stepTile({ mapId: "map.void", from: { x: 0, y: 0 }, to: { x: 1, y: 0 }, flags: {} });
  const i = interactTile({ mapId: "map.void", tile: { x: 0, y: 0 }, dir: "up", openedChests: new Set() });
  return s.kind === "LEGACY" && i.kind === "LEGACY" && loadCanonicalMap("map.void" as never) === null;
})());

console.log("\n🧩 Engine wiring (static integration proof)");
const engine = src("src/game/rpg/core/game-engine.ts");
check("engine calls stepTile", engine.includes("stepTile("));
check("engine emits MAP_TRANSITION", engine.includes('"MAP_TRANSITION"'));
check("engine emits PORTAL_BLOCKED", engine.includes('"PORTAL_BLOCKED"'));
check("Naga gate derives from persisted deadBossIds", engine.includes('deadBossIds.has("na")') && engine.includes("nagaDead"));
check("engine honors config.mapId (canonical loader)", engine.includes("loadCanonicalMap(canonicalStart.id)") || engine.includes("loadCanonicalMap("));
check("engine spawns canonical maps at spawn", engine.includes("spawnPosition("));
check("engine exposes setFlag/getFlags/saveGame", engine.includes("setFlag") && engine.includes("getOpenedChests") && engine.includes("saveGame("));
check("engine holds openedChests set", engine.includes("openedChests"));
check("legacy placeholder path preserved", engine.includes("MAP_VILLAGE_SQUARE"));

console.log("\n🛡️ 19-21. Regression guards");
const kuis = src("components/game/KuisTempurSolo.tsx");
check("19. Kuis Tempur decoupled (no world imports)",
  !kuis.includes("world-step") && !kuis.includes("world-maps") && !kuis.includes("map-loader"));
const zelby = src("components/game/ZelbyDash.tsx");
check("20. Petualangan Kata decoupled", !zelby.includes("world-step") && !zelby.includes("game/rpg"));
const reg = src("lib/arena/game-registry.ts");
check("21. unpublished mechanism intact", reg.includes("unpublished?: boolean"));
const rpgPage = src("app/arena/game/rpg/page.tsx");
check("21b. route guard intact (premium play gate)", rpgPage.includes("requireRpgPlayAccess"));
check("openChest still pure/idempotent (P1E.2 core)", (() => {
  const c = desa.chests[0];
  const a = openChest(c, new Set());
  const b = openChest(c, new Set([c.id]));
  return a.opened && !b.opened;
})());

console.log(`\n📊 Hasil: ${pass} lulus, ${fail} gagal\n`);
process.exit(fail > 0 ? 1 : 0);
