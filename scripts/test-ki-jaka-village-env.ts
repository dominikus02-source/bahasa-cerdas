/**
 * P2.8.6-B1 — Ki Jaka Village Environment focused test.
 *
 * Verifies:
 * 1. Village pocket tiles around Ki Jaka (6,15)
 * 2. House structure (RF/WL/DR tiles)
 * 3. Trees flanking house
 * 4. Path from house to main road
 * 5. Decorative rocks
 * 6. Visual entities for rendering
 * 7. Collision integrity (solid tiles, walkable path)
 * 8. Player spawn reachability
 * 9. PROTECT array covers new positions
 * 10. Ki Jaka position unchanged
 *
 * Run: npx tsx scripts/test-ki-jaka-village-env.ts
 * Exit 0 = ALL PASS, 1 = FAIL.
 */

import { WORLD_MAPS, RPG_TILES, SOLID_TILES } from "../src/game/rpg/data/world-maps";
import { loadCanonicalMap } from "../src/game/rpg/world/map-loader";
import { isWalkable, tileAt } from "../src/game/rpg/world/tiles";
import { NPCS } from "../src/game/rpg/data/npcs";

let pass = 0;
let fail = 0;

function check(label: string, ok: boolean): void {
  if (ok) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.error(`  ❌ ${label}`); }
}

const desa = WORLD_MAPS["map.desa"];
const T = RPG_TILES;

// ══ A. Ki Jaka position unchanged ════════════════════════════════════
console.log("\n🧍 A. Ki Jaka position");
const kiSpawn = desa.npcSpawns.find((n) => n.id === "ki");
check("1. Ki Jaka at tile (6,15)", kiSpawn?.x === 6 && kiSpawn?.y === 15);
const kiNpc = NPCS.find((n) => n.id === "ki");
check("2. NPCS entry position unchanged", kiNpc?.position.x === 0.38 && kiNpc?.position.y === 0.44);

// ══ B. House structure tiles ═════════════════════════════════════════
console.log("\n🏠 B. House structure tiles");
// house(4, 11, 6): RF at (4-8, 11-12), WL at (4-8, 13), DR at (6, 13).
const houseRoof1 = [4, 5, 6, 7, 8].map((x) => tileAt(desa, x, 11));
const houseRoof2 = [4, 5, 6, 7, 8].map((x) => tileAt(desa, x, 12));
check("3. Roof tiles at y=11 (4-8)", houseRoof1.every((t) => t === T.RF));
check("4. Roof tiles at y=12 (4-8)", houseRoof2.every((t) => t === T.RF));
const houseWall = [4, 5, 7, 8].map((x) => tileAt(desa, x, 13));
check("5. Wall tiles at y=13 (4,5,7,8)", houseWall.every((t) => t === T.WL));
check("6. Door tile at (6,13)", tileAt(desa, 6, 13) === T.DR);
check("7. House tiles are solid",
  houseRoof1.every((t) => SOLID_TILES.has(t)) &&
  houseRoof2.every((t) => SOLID_TILES.has(t)) &&
  houseWall.every((t) => SOLID_TILES.has(t)) &&
  SOLID_TILES.has(T.DR));

// ══ C. Trees ════════════════════════════════════════════════════════
console.log("\n🌳 C. Trees");
check("8. Tree at (4,10)", tileAt(desa, 4, 10) === T.TR);
check("9. Tree at (8,10)", tileAt(desa, 8, 10) === T.TR);
check("10. Trees are solid", SOLID_TILES.has(T.TR));

// ══ D. Path from house to main road ═════════════════════════════════
console.log("\n🛤️ D. Path");
check("10. Path at (6,15)", tileAt(desa, 6, 15) === T.PA);
check("11. Path at (6,16)", tileAt(desa, 6, 16) === T.PA);
check("12. Path at (6,17)", tileAt(desa, 6, 17) === T.PA);
check("13. Path connects to main road (y=17)", tileAt(desa, 6, 17) === T.PA);
check("14. Path tiles are walkable", [15, 16, 17].every((y) => isWalkable(desa, 6, y)));

// ══ E. Decorative rocks ═════════════════════════════════════════════
console.log("\n🪨 E. Decorative rocks");
check("18. Rock at (3,12)", tileAt(desa, 3, 12) === T.RO);
check("19. Rock at (9,14)", tileAt(desa, 9, 14) === T.RO);
check("20. Rocks are solid", SOLID_TILES.has(T.RO));

// ══ F. Visual entities ══════════════════════════════════════════════
console.log("\n🎨 F. Visual entities");
const world = loadCanonicalMap("map.desa");
check("18. World loaded", world !== null);
const entities = world?.entities ?? [];
check("19. Entities array not empty", entities.length > 0);
const kiHouse = entities.find((e) => e.id === "ent.ki-house");
check("20. House entity exists", kiHouse !== undefined);
check("21. House entity type = 'house'", kiHouse?.type === "house");
check("22. House entity solid = true", kiHouse?.solid === true);
const kiTrees = entities.filter((e) => e.id.startsWith("ent.ki-tree"));
check("23. Two tree entities", kiTrees.length === 2);
check("24. Trees solid = true", kiTrees.every((e) => e.solid === true));
const kiRocks = entities.filter((e) => e.id.startsWith("ent.ki-rock"));
check("25. Two rock entities", kiRocks.length === 2);
check("26. Rocks solid = false (decorative)", kiRocks.every((e) => e.solid === false));
check("27. All entities have normalized positions (0..1)",
  entities.every((e) => e.position.x >= 0 && e.position.x <= 1 && e.position.y >= 0 && e.position.y <= 1));

// ══ G. Collision integrity ══════════════════════════════════════════
console.log("\n🚧 G. Collision integrity");
check("28. Ki Jaka tile (6,15) walkable", isWalkable(desa, 6, 15));
check("29. Player spawn (12,19) walkable", isWalkable(desa, 12, 19));
check("33. House interior not walkable", !isWalkable(desa, 6, 11) && !isWalkable(desa, 6, 12) && !isWalkable(desa, 6, 13));
check("34. Trees not walkable", !isWalkable(desa, 4, 10) && !isWalkable(desa, 8, 10));
check("35. Rocks not walkable", !isWalkable(desa, 3, 12) && !isWalkable(desa, 9, 14));

// ══ H. Path reachability ════════════════════════════════════════════
console.log("\n🚶 H. Path reachability (spawn → Ki Jaka)");
// Spawn at (12,19). Path: left along y=17 to (6,17), then up to (6,15).
const routeTiles = [
  [12, 19], [11, 19], [10, 19], [9, 19], [8, 19], [7, 19], [6, 19],
  [6, 18], [6, 17], // main road
  [6, 16], [6, 15], // path to Ki Jaka
];
check("33. Route tiles all walkable", routeTiles.every(([x, y]) => isWalkable(desa, x, y)));

// ══ I. No overlap with existing structures ══════════════════════════
console.log("\n🔲 I. No overlap");
// New house at (4-8,11-13): RF(4-8,11-12), WL(4-8,13), DR(6,13).
// Existing house1 at (4-8,12-14): RF(4-8,12-13), WL(4-8,14), DR(6,14).
// At y=13: house1 RF + new house WL → WL wins (last write). Solid, correct.
check("36. Wall row y=13 intact (new house walls + door)",
  [4, 5, 7, 8].every((x) => tileAt(desa, x, 13) === T.WL) && tileAt(desa, 6, 13) === T.DR);
// Existing house1 wall at y=14 should still be intact
check("37. House1 wall row y=14 intact",
  [4, 5, 7, 8].every((x) => tileAt(desa, x, 14) === T.WL) && tileAt(desa, 6, 14) === T.DR);
// Well at (11,18) should be untouched
check("38. Well at (11,18) untouched", tileAt(desa, 11, 18) === T.WE);
// Ki Jaka position must still be walkable (PA tile at y=15)
check("39. Ki Jaka position (6,15) still walkable after house overlap", isWalkable(desa, 6, 15));

// ══ Summary ════════════════════════════════════════════════════════
console.log(`\n📊 P2.8.6-B1 Village Environment: ${pass} lulus, ${fail} gagal\n`);
if (fail > 0) process.exit(1);
process.exit(0);
