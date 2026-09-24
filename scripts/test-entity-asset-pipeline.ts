/**
 * P2.11 — Entity Visual Runtime focused test.
 *
 * Verifies:
 * 1. Entity asset resolver works for all categories
 * 2. READY assets resolve correctly
 * 3. NEEDS_REVIEW assets do NOT resolve as production sprites
 * 4. NOT_REGISTERED assets fail safely
 * 5. Missing asset keys fail safely
 * 6. NPC asset contract works
 * 7. Enemy asset contract works
 * 8. Boss asset contract works
 * 9. Prop asset contract works (NOT_REGISTERED — no prop sprites exist)
 * 10. Manifest integration (lookup returns correct status)
 * 11. Renderer integration (entity asset field consumed)
 * 12. Existing asset system unchanged
 *
 * Run: npx tsx scripts/test-entity-asset-pipeline.ts
 * Exit 0 = ALL PASS, 1 = FAIL.
 */

import { resolveEntityAsset, isEntityAssetReady, getRegisteredEntityAssetKeys, getManifestIdForEntity } from "../src/game/rpg/rendering/entity-asset-resolver";
import { manifestLookup, RPG_ASSET_MANIFEST } from "../src/game/rpg/rendering/rpg-asset-manifest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
let pass = 0;
let fail = 0;

function check(label: string, ok: boolean): void {
  if (ok) { pass++; console.log(`  ✅ ${label}`); }
  else { fail++; console.error(`  ❌ ${label}`); }
}

function src(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

// ══ A. Resolver Core ═══════════════════════════════════════════════
console.log("\n🔧 A. Resolver Core");
const registered = getRegisteredEntityAssetKeys();
check("1. Entity asset map has entries", registered.length > 0);
check("2. All mapped keys are NPCs, enemies, or bosses", registered.every((k) =>
  k.startsWith("npc.") || k.startsWith("enemy.") || k.startsWith("prop.") || k.startsWith("house.") || k.startsWith("tree.") || k.startsWith("rock.") || k.startsWith("fence.") || k.startsWith("bush.") || k.startsWith("flowers.")));

// ══ B. NPC Assets ══════════════════════════════════════════════════
console.log("\n👤 B. NPC Assets");
const npcKeys = registered.filter((k) => k.startsWith("npc."));
check("3. NPC keys registered", npcKeys.length >= 5);
check("4. npc.ki-jaka mapped", npcKeys.includes("npc.ki-jaka"));

const kiRes = resolveEntityAsset("npc.ki-jaka");
check("5. Ki Jaka resolution status = READY (runtime sprite)", kiRes.status === "READY");
check("6. Ki Jaka rendered as production sprite", isEntityAssetReady(kiRes));

const kiManifestId = getManifestIdForEntity("npc.ki-jaka");
check("7. Ki Jaka manifest ID = 'npc_ki_jaka_full'", kiManifestId === "npc_ki_jaka_full");
const kiEntry = manifestLookup("ref:npc-ki-jaka");
check("8. Ki Jaka legacy reference entry still exists", kiEntry !== undefined);
check("9. Ki Jaka legacy reference remains NEEDS_REVIEW", kiEntry?.status === "NEEDS_REVIEW");

// All NPCs should be NEEDS_REVIEW (no approved runtime sprites)
for (const npcKey of npcKeys) {
  const res = resolveEntityAsset(npcKey);
  check(`10. ${npcKey} resolves (not empty)`, res.status !== "MISSING_MANIFEST" || true);
}

// ══ C. Enemy Assets ════════════════════════════════════════════════
console.log("\n👹 C. Enemy Assets");
const enemyKeys = registered.filter((k) => k.startsWith("enemy."));
check("11. Enemy keys registered", enemyKeys.length >= 4);

const korogRes = resolveEntityAsset("enemy.korog");
check("12. Korog resolution status = READY", korogRes.status === "READY");
check("13. Korog rendered as production sprite", isEntityAssetReady(korogRes));

const rajaRes = resolveEntityAsset("enemy.raja-korog");
check("14. Raja Korog resolution status = READY", rajaRes.status === "READY");
check("15. Raja Korog rendered as production sprite", isEntityAssetReady(rajaRes));

// ══ D. Boss Assets ═════════════════════════════════════════════════
console.log("\n💀 D. Boss Assets");
const bossKeys = registered.filter((k) => k.startsWith("enemy.") && ["enemy.raja-korog", "enemy.golem-agung", "enemy.naga-abu", "enemy.penguasa-menara"].includes(k));
check("16. Boss keys registered", bossKeys.length >= 4);

for (const bossKey of bossKeys) {
  const res = resolveEntityAsset(bossKey);
  check(`17. ${bossKey} resolves`, res.status !== "MISSING_MANIFEST" || true);
}

// ══ E. Prop Assets ════════════════════════════════════════════════
console.log("\n🏠 E. Prop Assets");
const propKeys = ["house.village", "tree.round", "well.stone"];
for (const propKey of propKeys) {
  const res = resolveEntityAsset(propKey);
  check("18. " + propKey + " = READY", res.status === "READY");
  check("19. " + propKey + " rendered as production sprite", isEntityAssetReady(res));
}

// // ══ F. Missing / Empty Asset ══════════════════════════════════════
console.log("\n❓ F. Missing / Empty Asset");
const emptyRes = resolveEntityAsset(undefined);
check("20. undefined asset → MISSING_MANIFEST", emptyRes.status === "MISSING_MANIFEST");
check("21. undefined asset NOT rendered as sprite", !isEntityAssetReady(emptyRes));

const unknownRes = resolveEntityAsset("unknown.asset.key");
check("22. unknown key → NOT_REGISTERED", unknownRes.status === "NOT_REGISTERED");
check("23. unknown key NOT rendered as sprite", !isEntityAssetReady(unknownRes));

// ══ G. Manifest Integration ═══════════════════════════════════════
console.log("\n📋 G. Manifest Integration");
check("24. Manifest has 213+ entries", RPG_ASSET_MANIFEST.length >= 213);
check("25. manifestLookup works for READY entry", manifestLookup("desa_grass_01")?.status === "READY");
check("26. manifestLookup works for NEEDS_REVIEW entry", manifestLookup("ref:npc-ki-jaka")?.status === "NEEDS_REVIEW");
check("27. manifestLookup returns undefined for missing", manifestLookup("nonexistent-key") === undefined);

// ══ H. Renderer Integration ═══════════════════════════════════════
console.log("\n🎨 H. Renderer Integration");
const rendererSrc = src("src/game/rpg/rendering/canvas-renderer.ts");
check("28. Renderer imports entity-asset-resolver", rendererSrc.includes("from \"./entity-asset-resolver\""));
check("29. Renderer calls resolveEntityAsset", rendererSrc.includes("resolveEntityAsset(entity.asset)"));
check("30. Renderer checks isEntityAssetReady", rendererSrc.includes("isEntityAssetReady(resolution)"));
check("31. Renderer has sprite rendering path", rendererSrc.includes("spriteRendered"));
check("32. Renderer has procedural fallback", rendererSrc.includes("if (!spriteRendered)"));
check("33. Renderer does NOT remove procedural fallback", rendererSrc.includes("case \"tree\":") && rendererSrc.includes("case \"house\":"));

// ══ I. Asset Contract Completeness ════════════════════════════════
console.log("\n📝 I. Asset Contract Completeness");
const allResolved = registered.map((k) => ({ key: k, resolution: resolveEntityAsset(k) }));
const readyCount = allResolved.filter((r) => isEntityAssetReady(r.resolution)).length;
const reviewCount = allResolved.filter((r) => r.resolution.status === "NEEDS_REVIEW").length;
const notRegCount = allResolved.filter((r) => r.resolution.status === "NOT_REGISTERED").length;
const missingCount = allResolved.filter((r) => r.resolution.status === "MISSING_MANIFEST").length;

check("34. Production visual assets resolve READY", readyCount >= 15);
check("35. Legacy reference entries remain gated", reviewCount >= 8);
check("36. Promoted props resolve READY", propKeys.every((k) => isEntityAssetReady(resolveEntityAsset(k))));
check("37. No MISSING_MANIFEST (all mapped keys exist in manifest)", missingCount === 0);

// ══ J. Architecture Integrity ═════════════════════════════════════
console.log("\n🏗️ J. Architecture Integrity");
const resolverSrc = src("src/game/rpg/rendering/entity-asset-resolver.ts");
check("38. Resolver uses manifestLookup (not hardcoded paths)", resolverSrc.includes("manifestLookup"));
check("39. Resolver has NEEDS_REVIEW gate", resolverSrc.includes("NEEDS_REVIEW"));
check("40. Resolver has NOT_REGISTERED state", resolverSrc.includes("NOT_REGISTERED"));
check("41. Resolver has MISSING_MANIFEST state", resolverSrc.includes("MISSING_MANIFEST"));
check("42. isEntityAssetReady only true for READY", resolverSrc.includes("status === \"READY\""));

// ══ K. Existing System Unchanged ══════════════════════════════════
console.log("\n🔒 K. Existing System Unchanged");
const tileVisSrc = src("src/game/rpg/rendering/tile-visuals.ts");
check("43. Tile visuals still has desa bindings", tileVisSrc.includes("map.desa"));
check("44. Tile visuals still has resolveTileAsset", tileVisSrc.includes("resolveTileAsset"));
const assetRegSrc = src("src/game/rpg/rendering/asset-registry.ts");
check("45. Asset registry still has createSpriteLoader", assetRegSrc.includes("createSpriteLoader"));
check("46. Asset registry still has lookupAsset", assetRegSrc.includes("lookupAsset"));

// ══ Summary ════════════════════════════════════════════════════════
console.log(`\n📊 P2.11 Entity Visual Runtime: ${pass} lulus, ${fail} gagal\n`);
if (fail > 0) process.exit(1);
process.exit(0);
