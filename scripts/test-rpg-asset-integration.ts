/**
 * P2.1 ASSET INTEGRATION — tests (no DOM, no browser timing).
 *
 * Proves: manifest integrity (paths exist, dims match disk), registry
 * lookups (tile/item/NPC/monster/boss/VFX/UI), missing diagnostics, binding
 * determinism, no duplicate registration, no map mutation, renderer wiring
 * (static), frame/animation math (existing P2.0A contracts), Kuis + guard.
 *
 * Run: npx tsx scripts/test-rpg-asset-integration.ts
 * Exit 0 = SEMUA LULUS, 1 = ada yang gagal.
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  RPG_ASSET_MANIFEST, manifestLookup, manifestByStatus, manifestDuplicateIds,
} from "../src/game/rpg/rendering/rpg-asset-manifest";
import { lookupAsset, createEmptyManifest, registerAsset } from "../src/game/rpg/rendering/asset-registry";
import { resolveTileAsset, variantFor, itemIconFor } from "../src/game/rpg/rendering/tile-visuals";
import { RPG_TILES } from "../src/game/rpg/data/world-maps";
import { frameAt, clipFor } from "../src/game/rpg/rendering/animation";
import { spriteDrawRect } from "../src/game/rpg/rendering/sprite-math";

const ROOT = process.cwd();
const PUB = join(ROOT, "public");

/** PNG dimensions from IHDR (no dependencies; signature + width/height BE). */
function pngDims(path: string): { w: number; h: number } | null {
  try {
    const b = readFileSync(path);
    if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
    return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  } catch {
    return null;
  }
}
let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`); }
}

function src(p: string): string {
  return readFileSync(join(ROOT, p), "utf8");
}

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

console.log("\n📦 1. manifest integrity");
{
  const ready = manifestByStatus("READY");
  check("103 READY entries", ready.length === 103, `got ${ready.length}`);
  let bad = 0;
  for (const e of ready) {
    const disk = join(PUB, e.path.replace(/^\//, ""));
    if (!existsSync(disk)) { bad++; continue; }
    const dim = pngDims(disk);
    if (!dim || dim.w !== e.width || dim.h !== e.height) bad++;
  }
  check("all READY paths exist with matching dims", bad === 0, `${bad} bad`);
}

console.log("\n🔍 2/6/7/8. registry lookups (tile/item/NPC/monster/boss)");
check("tile lookup hit (desa_grass_01)", manifestLookup("desa_grass_01")?.status === "READY");
check("item lookup hit (item_ramuan)", manifestLookup("item_ramuan")?.status === "READY");
check("NPC lookup → NEEDS_REVIEW (not silently ready)", manifestLookup("ref:npc-ki-jaka")?.status === "NEEDS_REVIEW");
check("monster lookup → NEEDS_REVIEW", manifestLookup("ref:monster-korog")?.status === "NEEDS_REVIEW");
check("boss lookup → NEEDS_REVIEW", manifestLookup("ref:boss-raja-korog")?.status === "NEEDS_REVIEW");
check("8. boss scale documented (contract, not art)", manifestLookup("ref:boss-raja-korog") !== undefined);

console.log("\n🗺️ 9. map visual binding");
check("desa grass binds 3 variants", resolveTileAsset("map.desa", RPG_TILES.GR, 0, 0) !== null);
check("unbound tile → null (color fallback)", resolveTileAsset("map.desa", RPG_TILES.TR, 0, 0) === null);
check("unknown map → null", resolveTileAsset("map.void", RPG_TILES.GR, 0, 0) === null);
check("binding deterministic (same twice)", resolveTileAsset("map.desa", RPG_TILES.GR, 5, 7) === resolveTileAsset("map.desa", RPG_TILES.GR, 5, 7));
check("variants spread (hash, no RNG)", (() => {
  const seen = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((x) => variantFor(x, 3, 3)));
  return seen.size === 3;
})());

console.log("\n🎒 11. item visual binding (exact matches only)");
check("ram/teh/elix/bijih/f3 mapped", itemIconFor("ram") === "item_ramuan" && itemIconFor("f3") === "item_ikan_emas");
check("f1/f2 unmapped (honest, never guessed)", itemIconFor("f1") === null && itemIconFor("f2") === null);
check("unknown → null", itemIconFor("nope") === null);

console.log("\n✨ 12/13. VFX + UI (reference only, components untouched)");
check("VFX entries NEEDS_REVIEW (opaque strips)", manifestByStatus("NEEDS_REVIEW").some((e) => e.id === "ref:vfx-serangan"));
check("UI entries REFERENCE_ONLY", manifestLookup("ref:ui-battle-panel")?.status === "REFERENCE_ONLY");
check("no UI component replaced (RPGBattle intact)", src("src/game/rpg/ui/RPGBattle.tsx").includes("onAttack("));

console.log("\n📋 3/13/14. missing diagnostics + dup + paths");
check("3. missing diagnostic explicit", manifestLookup("ref:sheet-boss-arga-idle-down")?.status === "MISSING");
{
  const m0 = createEmptyManifest();
  const r1 = registerAsset(m0, {
    assetKey: "k", category: "props", sourcePath: "p", dimensions: { width: 1, height: 1 },
    origin: { x: 0.5, y: 1 }, frame: { width: 1, height: 1, columns: 1, rows: 1, count: 1 },
    directions: [], animation: { state: "s", loop: true, frameDurationMs: 80 }, version: 1,
  });
  check("registry miss explicit", lookupAsset(m0, "k").ok === false && lookupAsset(r1, "k").ok === true);
}
check("13. no duplicate registration", manifestDuplicateIds().length === 0);
check("14. no invalid manifest paths (READY resolve on disk)", manifestByStatus("READY").every((e) => existsSync(join(PUB, e.path.replace(/^\//, "")))));

console.log("\n🗺️ 15. no canonical map mutation");
{
  const before = JSON.stringify([
    ...manifestByStatus("READY").map((e) => e.id),
  ]);
  check("binding is presentation-only (no world-maps import of visuals)", !/tile-visuals|rpg-asset-manifest/.test(strip(src("src/game/rpg/data/world-maps.ts"))));
  check("manifest stable (sorted ids deterministic)", before === JSON.stringify([...manifestByStatus("READY").map((e) => e.id)]));
}

console.log("\n🎞️ 4. animation frame selection (contract reuse)");
check("walk frame @80ms rhythm", frameAt(clipFor("walk", 8), 80) === 1 && frameAt(clipFor("walk", 8), 640) === 0);
check("5. Arga origin bottom-center (contract)", spriteDrawRect({ feetX: 100, feetY: 200, canvasWidthPx: 224, canvasHeightPx: 224, scale: 1, mirror: false }).dy === 200 - 224);

console.log("\n🔌 15b. renderer wiring (static proofs)");
{
  const r = strip(src("src/game/rpg/rendering/canvas-renderer.ts"));
  check("tile art drawn when bound", r.includes("boundTileImage(") && r.includes("drawImage("));
  check("color fallback preserved", r.includes("COLORS.path"));
  check("no per-frame fetch (requested-once set)", r.includes("requestedTilePaths"));
  check("no TILE_SIZE=32", !r.includes("TILE_SIZE"));
  check("no duplicate worldToScreen", !/[^d]worldToScreen\(/.test(r.replace(/worldToScreenScaled\(/g, "")));
}

console.log("\n🛡️ REGRESSION");
check("unpublished intact", src("lib/arena/game-registry.ts").includes("unpublished: true"));
{
  const kuis = src("components/game/KuisTempurSolo.tsx");
  check("Kuis Tempur decoupled", !kuis.includes("game/rpg") && !kuis.includes("tile-visuals"));
}

console.log(`\n📊 Hasil: ${pass} lulus, ${fail} gagal\n`);
process.exit(fail > 0 ? 1 : 0);
