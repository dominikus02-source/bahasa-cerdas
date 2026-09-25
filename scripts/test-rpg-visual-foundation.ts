/**
 * P2.0A VISUAL INTEGRATION FOUNDATION — tests (no DOM, no browser timing).
 *
 * Pure visual-runtime contracts driven directly (transforms, manifest,
 * loader with injected factory, animation, sprite math, depth, Arga
 * contract); renderer wiring verified by static proofs + tsc + build
 * (canvas needs DOM). No fake production assets anywhere in this file.
 *
 * Run: npx tsx scripts/test-rpg-visual-foundation.ts
 * Exit 0 = SEMUA LULUS, 1 = ada yang gagal.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LOGICAL_TILE_PX, ART_SCALE, ART_TILE_PX, HERO_CANVAS_PX, HERO_LOGICAL_PX,
  FRAME_MS, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM, clampZoom, pxPerUnit,
} from "../src/game/rpg/rendering/world-scale";
import {
  createCamera, followTarget, setZoom, worldToScreen, worldToScreenScaled,
} from "../src/game/rpg/rendering/camera";
import { describeCharacterRender } from "../src/game/rpg/rendering/characters";
import {
  createEmptyManifest, registerAsset, lookupAsset, diagnoseAsset,
  createSpriteLoader,
} from "../src/game/rpg/rendering/asset-registry";
import {
  ARGA_FRAMES, argaDirsFor, argaAssetKey, expectedArgaSheets,
  ARGA_CANVAS_PX, ARGA_FRAME_MS, ARGA_ORIGIN,
} from "../src/game/rpg/rendering/arga-contract";
import {
  frameAt, clipFinished, selectLocomotion, mirrorForDirection, clipFor,
} from "../src/game/rpg/rendering/animation";
import { spriteDrawRect, spriteFrameRect, shadowRadii } from "../src/game/rpg/rendering/sprite-math";
import { compareDepth, sortEntitiesForDepth } from "../src/game/rpg/rendering/canvas-renderer";
import { createDefaultPlayer } from "../src/game/rpg/player/player-state";

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

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

async function main(): Promise<void> {
console.log("\n📐 WORLD SCALE (canonical constants)");
check("64 logical / 128 art / 224 hero / 112 logical hero", LOGICAL_TILE_PX === 64 && ART_TILE_PX === 128 && HERO_CANVAS_PX === 224 && HERO_LOGICAL_PX === 112 && ART_SCALE === 2);
check("80ms rhythm, zoom 0.8–1.25 default 1.0", FRAME_MS === 80 && MIN_ZOOM === 0.8 && MAX_ZOOM === 1.25 && DEFAULT_ZOOM === 1.0);
check("clampZoom guards NaN/range", clampZoom(NaN) === 1.0 && clampZoom(5) === 1.25 && clampZoom(0.1) === 0.8 && clampZoom(1.1) === 1.1);
check("pxPerUnit = 64 × zoom × tiles", pxPerUnit(46, 1) === 2944 && pxPerUnit(10, 1.25) === 800);

console.log("\n📷 A. world-to-screen transform");
{
  const cam = createCamera({ x: 0.5, y: 0.5 }, 800, 600);
  check("legacy contract pinned (center = center)", (() => {
    const s = worldToScreen({ x: 0.5, y: 0.5 }, cam);
    return s.x === 400 && s.y === 300;
  })());
  check("legacy follow math untouched", (() => {
    const c2 = followTarget(cam, { x: 0.6, y: 0.5 });
    return Math.abs(c2.position.x - 0.51) < 1e-9;
  })());
  check("scaled: center maps to viewport center", (() => {
    const s = worldToScreenScaled({ x: 0.5, y: 0.5 }, cam, 46, 36);
    return s.x === 400 && s.y === 300;
  })());
  check("scaled: one tile = 64px at zoom 1", (() => {
    const a = worldToScreenScaled({ x: 0, y: 0 }, cam, 46, 36);
    const b = worldToScreenScaled({ x: 1 / 46, y: 0 }, cam, 46, 36);
    return Math.abs(b.x - a.x - 64) < 1e-9;
  })());
  check("scaled: zoom multiplies linearly", (() => {
    const z1 = worldToScreenScaled({ x: 0.6, y: 0.5 }, cam, 46, 36);
    const z2 = worldToScreenScaled({ x: 0.6, y: 0.5 }, setZoom(cam, 1.25), 46, 36);
    return Math.abs((z2.x - 400) / (z1.x - 400) - 1.25) < 1e-9;
  })());
  check("setZoom clamps", setZoom(cam, 9).zoom === 1.25 && setZoom(cam, 1).zoom === 1);
  check("duplicate removed from renderer.ts", !/export function worldToScreen/.test(strip(src("src/game/rpg/rendering/renderer.ts"))));
}

console.log("\n🗂️ B. asset manifest lookup");
{
  const m0 = createEmptyManifest();
  check("miss is explicit", lookupAsset(m0, "sheet-char-arga-idle-down").ok === false);
  const m1 = registerAsset(m0, {
    assetKey: "tile-grass-a", category: "environments", sourcePath: "public/game/rpg/tiles/tile-grass-a.png",
    dimensions: { width: 128, height: 128 }, origin: { x: 0.5, y: 0.5 },
    frame: { width: 128, height: 128, columns: 1, rows: 1, count: 1 },
    directions: [], animation: { state: "static", loop: true, frameDurationMs: 80 }, version: 1,
  });
  const hit = lookupAsset(m1, "tile-grass-a");
  check("hit resolves registrado", hit.ok && hit.entry.sourcePath.endsWith("tile-grass-a.png"));
  check("register is immutable (no shared mutation)", lookupAsset(m0, "tile-grass-a").ok === false);
  check("diagnose missing is explicit (no fake path)", diagnoseAsset(m0, "sheet-char-arga-idle-down").includes("MISSING"));
  check("diagnose hit reports path", diagnoseAsset(m1, "tile-grass-a").includes("OK"));
}

console.log("\n💾 B2. sprite loader (injected factory, no DOM)");
{
  let calls = 0;
  const loader = createSpriteLoader(async (sr: string) => {
    calls++;
    if (sr.includes("missing")) throw new Error("404");
    return { width: 224, height: 224, complete: true };
  });
  const r1 = await loader.load("a.png");
  const r2 = await loader.load("a.png");
  check("load ok + cached (factory called once)", r1.ok && r2.ok && calls === 1 && loader.cacheSize() === 1);
  const [f1, f2] = await Promise.all([loader.load("b.png"), loader.load("b.png")]);
  check("concurrent dedupe", f1.ok && f2.ok && calls === 2);
  const bad = await loader.load("missing.png");
  check("failure explicit (no silent fallback)", !bad.ok && (bad as { error: string }).error === "404");
}

console.log("\n🎞️ D/E. animation state + frames");
check("frameAt loops (8f @80ms: t=700 → 0)", frameAt(clipFor("walk", 8), 700) === 0);
check("frameAt mid (t=250 → 3)", frameAt(clipFor("walk", 8), 250) === 3);
check("non-loop clamps at end", frameAt(clipFor("attack", 6, false), 9999) === 5 && clipFinished(clipFor("attack", 6, false), 480));
check("loop never finishes", !clipFinished(clipFor("idle", 6), 99999));
check("selectLocomotion idle/walk/run", selectLocomotion(false) === "idle" && selectLocomotion(true, 1.5, 1) === "walk" && selectLocomotion(true, 1.5, 2) === "run");
check("side mirrors left only", mirrorForDirection("left") === true && mirrorForDirection("right") === false && mirrorForDirection("down") === false);

console.log("\n🦶 F/G/H. feet origin, scale, shadow");
{
  const r = spriteDrawRect({ feetX: 400, feetY: 300, canvasWidthPx: 224, canvasHeightPx: 224, scale: 1, mirror: false });
  check("bottom-center anchor (dx=x-w/2, dy=y-h)", r.dx === 288 && r.dy === 76 && r.dw === 224 && r.dh === 224 && r.mirror === false);
  const s = spriteDrawRect({ feetX: 100, feetY: 100, canvasWidthPx: 224, canvasHeightPx: 224, scale: 0.5, mirror: true });
  check("scale + mirror flag pass through", s.dw === 112 && s.dy === 100 - 112 && s.mirror === true);
  const f = spriteFrameRect({ frameWidthPx: 224, frameHeightPx: 224, columns: 8, index: 5 });
  check("sheet frame math (col 5)", f.sx === 1120 && f.sy === 0 && f.sw === 224);
  const sh = shadowRadii(224, 1);
  check("shadow subtle ellipse at feet scale", sh.rx > 0 && sh.ry < sh.rx && Math.abs(sh.rx - 224 * 0.32) < 1e-9);
}

console.log("\n🧭 I/J. direction + player integration");
{
  const p = createDefaultPlayer("p", "P");
  const cam = createCamera({ x: 0.5, y: 0.5 }, 800, 600);
  const d = describeCharacterRender(p, cam, 46, 36);
  check("anchor == scaled transform of position", d.screen.x === 400 && d.screen.y === 300 && d.facing === "down");
  const left = describeCharacterRender({ ...p, facing: "left" }, cam, 46, 36);
  check("facing passes through (mirror decided at draw)", left.facing === "left" && mirrorForDirection(left.facing) === true);
}

console.log("\n🥷 ARGA CONTRACT (no fake assets)");
check("9 states, bible counts (idle6/walk8/run10/attack6/skill8/hurt4/defeat8/victory8/interact6)",
  ARGA_FRAMES.idle === 6 && ARGA_FRAMES.walk === 8 && ARGA_FRAMES.run === 10 && ARGA_FRAMES.attack === 6 &&
  ARGA_FRAMES.skill === 8 && ARGA_FRAMES.hurt === 4 && ARGA_FRAMES.defeat === 8 && ARGA_FRAMES.victory === 8 && ARGA_FRAMES.interact === 6);
check("direction canon: locomotion authored down/up/true-profile side; idle down/side", argaDirsFor("walk").join() === "down,up,side" && argaDirsFor("run").join() === "down,up,side" && argaDirsFor("attack").join() === "down,up,side" && argaDirsFor("idle").join() === "down,side");
check("naming sheet-char-arga-<state>-<dir>", argaAssetKey("walk", "side") === "sheet-char-arga-walk-side");
check("expected sheet count = idle2 + locomotion3×3 + down-only5", expectedArgaSheets().length === 16);
check("canvas 224, 80ms, origin bottom-center", ARGA_CANVAS_PX === 224 && ARGA_FRAME_MS === 80 && ARGA_ORIGIN.x === 0.5 && ARGA_ORIGIN.y === 1.0);
check("renderer wires only READY Arga locomotion with a technical idle fallback", (() => {
  const renderer = strip(src("src/game/rpg/rendering/canvas-renderer.ts"));
  return renderer.includes("sheet-char-arga-walk-${direction}") &&
    renderer.includes('entry?.status === "READY"') &&
    renderer.includes("moving ? frameAt") && renderer.includes(": 0;") &&
    !renderer.includes("sheet-char-arga-hurt-down");
})());

console.log("\n🗂️ DEPTH SORTING (foundation)");
{
  const a = { layer: "ENTITIES", position: { x: 0.1, y: 0.9 } };
  const b = { layer: "BEHIND_ENTITIES", position: { x: 0.1, y: 0.1 } };
  const c = { layer: "ENTITIES", position: { x: 0.2, y: 0.2 } };
  check("layer order beats y", compareDepth(a, b) > 0);
  check("y-sort within layer", compareDepth(a, c) > 0);
  check("sort is pure (input unmutated)", (() => {
    const arr = [a, b, c];
    const out = sortEntitiesForDepth(arr);
    return arr[0] === a && out[0] === b;
  })());
  check("renderer uses shared comparator", strip(src("src/game/rpg/rendering/canvas-renderer.ts")).includes("sortEntitiesForDepth("));
  check("Desa plaza uses a compact visual stone core", (() => {
    const r = strip(src("src/game/rpg/rendering/canvas-renderer.ts"));
    return r.includes("desaPlazaPresentationAsset") &&
      r.includes("x >= 17 && x <= 27 && y >= 15 && y <= 19") &&
      r.includes("desa_grass_01") &&
      r.includes("desa_dirt_01");
  })());
check("scene atmosphere is applied after world render", (() => {
  const r = strip(src("src/game/rpg/rendering/canvas-renderer.ts"));
  return r.includes("function renderAtmosphere(") && r.includes("renderAtmosphere(state);");
})());
}

console.log("\n🔌 RENDERER WIRING (static proofs)");
{
  const r = strip(src("src/game/rpg/rendering/canvas-renderer.ts"));
  check("TILE_SIZE=32 dead code removed", !r.includes("TILE_SIZE"));
  check("stretch math removed (no width/tiles.width)", !/width\s*\/\s*tiles\.width/.test(r));
  check("scaled transform everywhere", (r.match(/worldToScreenScaled\(/g) ?? []).length >= 4);
  check("viewport culling present", r.includes("tilePx") && r.includes("continue"));
  check("no legacy worldToScreen calls remain", !/[^d]worldToScreen\(/.test(r.replace(/worldToScreenScaled\(/g, "")));
}

console.log("\n🛡️ K/L. battle + persistence compatibility");
check("K. no battle imports in visual modules", ["src/game/rpg/rendering/world-scale.ts", "src/game/rpg/rendering/camera.ts", "src/game/rpg/rendering/asset-registry.ts", "src/game/rpg/rendering/animation.ts", "src/game/rpg/rendering/sprite-math.ts", "src/game/rpg/rendering/arga-contract.ts"].every((f) => !/battle|combat/.test(strip(src(f)))));
check("L. no persistence in visual modules", ["src/game/rpg/rendering/asset-registry.ts", "src/game/rpg/rendering/animation.ts"].every((f) => !/localStorage|persistence/i.test(strip(src(f)))));

console.log("\n🛡️ REGRESSION GUARDS");
check("unpublished mechanism intact", src("lib/arena/game-registry.ts").includes("unpublished?: boolean"));
{
  const kuis = src("components/game/KuisTempurSolo.tsx");
  check("Kuis Tempur decoupled", !kuis.includes("game/rpg") && !kuis.includes("rendering/"));
}

console.log(`\n📊 Hasil: ${pass} lulus, ${fail} gagal\n`);
}

main().then(
  () => process.exit(fail > 0 ? 1 : 0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
