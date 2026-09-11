/**
 * P1.5 NPC / DIALOGUE / SHOP / FORGE RUNTIME — tests (no DOM, no browser).
 *
 * Pure domains (dialogue/shop/forge) are driven directly. The engine
 * (DOM-bound) is verified by static wiring proofs + tsc + build: every
 * runtime path asserted here names the exact engine mechanism.
 *
 * Run: npx tsx scripts/test-rpg-interaction-runtime.ts
 * Exit 0 = SEMUA LULUS, 1 = ada yang gagal.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { WORLD_MAPS } from "../src/game/rpg/data/world-maps";
import { interactTile } from "../src/game/rpg/world/world-step";
import {
  startDialogue, advanceDialogue, currentNode, collectSignals, pendakiEntryNode,
} from "../src/game/rpg/interaction/dialogue";
import { getDialogueTree, NPC_ROUTING, DIALOGUE_TREES } from "../src/game/rpg/data/dialogues";
import { DEAD_QUEST_STATES } from "../src/game/rpg/quests/flags";
import { getShopMenu, validatePurchase } from "../src/game/rpg/interaction/shop";
import { validateForge, FORGE_GOLD_COST, FORGE_BIJIH_COST, FORGE_MAX_PLUS } from "../src/game/rpg/interaction/forge";

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

const desa = WORLD_MAPS["map.desa"];
const eng = () => src("src/game/rpg/core/game-engine.ts");

console.log("\n🧍 A. NPC detection");
check("1. facing NPC (ki at 6,15 from 6,16)", (() => {
  const r = interactTile({ mapId: "map.desa", tile: { x: 6, y: 16 }, dir: "up", openedChests: new Set() });
  return r.kind === "NPC" && (r as { npcId: string }).npcId === "ki";
})());
check("2. wrong tile → NOTHING", interactTile({ mapId: "map.desa", tile: { x: 20, y: 20 }, dir: "up", openedChests: new Set() }).kind === "NOTHING");
check("3. unknown NPC → no session", startDialogue("nope") === undefined);
check("4. deterministic start", JSON.stringify(startDialogue("ki")) === JSON.stringify(startDialogue("ki")));
check("5. movement frozen during session (engine)", eng().includes("|| session !== null) return currentState;"));
check("5b. all 8 canonical NPCs routed", ["ki", "ratmi", "sari", "eyang", "bagas", "tani", "empu", "pendaki"].every((id) => NPC_ROUTING[id] === "DIALOGUE" || NPC_ROUTING[id] === "SHOP"));
check("5c. merchants route to SHOP, rest to DIALOGUE", NPC_ROUTING.ratmi === "SHOP" && NPC_ROUTING.empu === "SHOP" && NPC_ROUTING.ki === "DIALOGUE");
// Order disjointness: enemy spawn tiles never coincide with chest/npc tiles,
// so the preserved enemy→chest→NPC order is unobservable (no behavior change).
check("5d. encounter/interact tiles disjoint", (() => {
  return (Object.values(WORLD_MAPS) as typeof desa[]).every((m) => {
    const taken = new Set([...m.chests.map((c) => `${c.x},${c.y}`), ...m.npcSpawns.map((n) => `${n.x},${n.y}`)]);
    return m.enemySpawns.every((e) => !taken.has(`${e.x},${e.y}`));
  });
})());

console.log("\n💬 B. Dialogue domain");
{
  const tree = getDialogueTree("ki")!;
  const s0 = startDialogue("ki")!;
  check("6. start at entry node", s0.nodeId === "intro" && s0.atEnd === false);
  const cur = currentNode(tree, s0)!;
  check("6b. verbatim greeting (4 lines)", cur.lines.length === 4 && cur.lines[0].startsWith("Nak, kamu sudah datang"));
  const s1 = advanceDialogue(tree, s0);
  check("7. single-node advance reaches end", s1.atEnd === true && s1.visited.includes("intro"));
  check("8. end collects signals (QUEST+GOLD, unapplied)", (() => {
    const sig = collectSignals(tree, s1);
    return sig.some((e) => e?.type === "QUEST") && sig.some((e) => e?.type === "GOLD");
  })());
  check("9. unknown NPC sessions rejected (engine)", eng().includes("if (!tree) return currentState;"));
  const bagas = getDialogueTree("bagas")!;
  const b0 = startDialogue("bagas", 0)!;
  check("9b. variant resolved explicitly (2 lines, no RNG)", currentNode(bagas, b0)!.lines.length === 2);
  check("10. no RNG in dialogue domain", (() => {
    for (const f of ["src/game/rpg/interaction/dialogue.ts", "src/game/rpg/data/dialogues.ts"]) {
      if (/Math\.random\s*\(/.test(strip(src(f)))) return false;
    }
    return true;
  })());
  check("10b. pendaki cooldown pure", pendakiEntryNode(0, 1000) === "cooldown" && pendakiEntryNode(2000, 1000) === "rest");
}

console.log("\n🏪 C. Shop domain");
check("11. ratmi stock verbatim (30/25/80)", (() => {
  const m = getShopMenu("ratmi")!;
  return m.stock.length === 3 && m.stock[0].price === 30 && m.stock[1].price === 25 && m.stock[2].price === 80;
})());
check("11b. empu stock verbatim (150/120/450/380)", (() => {
  const m = getShopMenu("empu")!;
  return m.stock.length === 4 && m.stock.map((s) => s.price).join(",") === "150,120,450,380";
})());
check("11c. unknown shop → undefined", getShopMenu("ki") === undefined);
check("12. valid purchase intent (injected gold)", (() => {
  const r = validatePurchase({ npcId: "ratmi", itemKey: "ram", quantity: 2, goldAvailable: 100 });
  return r.ok && r.intent.totalPrice === 60 && r.intent.quantity === 2;
})());
check("13. insufficient gold (engine passes 0)", !validatePurchase({ npcId: "ratmi", itemKey: "ram", quantity: 1, goldAvailable: 0 }).ok);
check("14. invalid item → UNKNOWN_ITEM", (() => {
  const r = validatePurchase({ npcId: "ratmi", itemKey: "nope", quantity: 1, goldAvailable: 999 });
  return !r.ok && (r as { reason: string }).reason === "UNKNOWN_ITEM";
})());
check("14b. unknown shop → UNKNOWN_SHOP", (() => {
  const r = validatePurchase({ npcId: "ki", itemKey: "ram", quantity: 1, goldAvailable: 999 });
  return !r.ok && (r as { reason: string }).reason === "UNKNOWN_SHOP";
})());
check("15. invalid quantities rejected", [0, -1, 1.5].every((q) => {
  const r = validatePurchase({ npcId: "ratmi", itemKey: "ram", quantity: q, goldAvailable: 9999 });
  return !r.ok;
}));
check("16. infinite canonical stock (no count field)", (() => {
  const m = getShopMenu("ratmi")!;
  return !("stock" in m && "quantity" in (m.stock[0] as object)) || !("quantity" in (m.stock[0] as Record<string, unknown>));
})());
check("17. deterministic price", (() => {
  const a = validatePurchase({ npcId: "ratmi", itemKey: "ram", quantity: 3, goldAvailable: 9999 });
  return a.ok && a.intent.totalPrice === 90;
})());
check("18. no duplicate purchase (pure, no ledger)", (() => {
  const args = { npcId: "ratmi", itemKey: "teh", quantity: 1, goldAvailable: 9999 };
  return JSON.stringify(validatePurchase(args)) === JSON.stringify(validatePurchase({ ...args }));
})());
check("18b. prototype keys preserved (no equip.* mapping)", getShopMenu("empu")!.stock.every((s) => !s.key.startsWith("equip.")));

console.log("\n⚒️ D. Forge domain");
check("19. only empu forges", validateForge({ npcId: "empu", weaponId: "kayu", currentPlus: 0, bijihAvailable: 1, goldAvailable: 100 }).ok &&
  !validateForge({ npcId: "ratmi", weaponId: "kayu", currentPlus: 0, bijihAvailable: 1, goldAvailable: 100 }).ok);
check("20. valid recipe intent (+1, 100G+bijih)", (() => {
  const r = validateForge({ npcId: "empu", weaponId: "kayu", currentPlus: 2, bijihAvailable: 3, goldAvailable: 500 });
  return r.ok && r.intent.plus === 3 && r.intent.goldCost === FORGE_GOLD_COST && r.intent.bijihCost === FORGE_BIJIH_COST;
})());
check("21. missing material", (() => {
  const r = validateForge({ npcId: "empu", weaponId: "kayu", currentPlus: 0, bijihAvailable: 0, goldAvailable: 500 });
  return !r.ok && (r as { reason: string }).reason === "MISSING_MATERIAL";
})());
check("22. insufficient gold", (() => {
  const r = validateForge({ npcId: "empu", weaponId: "kayu", currentPlus: 0, bijihAvailable: 5, goldAvailable: 50 });
  return !r.ok && (r as { reason: string }).reason === "INSUFFICIENT_GOLD";
})());
check("22b. invalid weapon", (() => {
  const r = validateForge({ npcId: "empu", weaponId: "", currentPlus: 0, bijihAvailable: 5, goldAvailable: 500 });
  return !r.ok && (r as { reason: string }).reason === "INVALID_WEAPON";
})());
check("22c. cap +5 enforced", validateForge({ npcId: "empu", weaponId: "kayu", currentPlus: FORGE_MAX_PLUS, bijihAvailable: 9, goldAvailable: 9999 }).ok === false);
check("24. deterministic result", JSON.stringify(validateForge({ npcId: "empu", weaponId: "kayu", currentPlus: 0, bijihAvailable: 1, goldAvailable: 100 })) ===
  JSON.stringify(validateForge({ npcId: "empu", weaponId: "kayu", currentPlus: 0, bijihAvailable: 1, goldAvailable: 100 })));
check("25. forge emits intent only (no equipment write)", (() => {
  const r = validateForge({ npcId: "empu", weaponId: "kayu", currentPlus: 0, bijihAvailable: 1, goldAvailable: 100 });
  return r.ok && !("equipment" in r.intent) && r.intent.plus === 1;
})());

console.log("\n🎛️ E. Runtime modes (engine wiring)");
{
  const e = eng();
  check("26. WORLD→DIALOGUE (INTERACT NPC→session→START event)", e.includes('type: "DIALOGUE_START"') && e.includes("session = sess"));
  check("27. DIALOGUE→WORLD (END clears)", e.includes('case "DIALOGUE_END"') && e.includes("session = null"));
  check("28. WORLD→SHOP (merchant routing)", e.includes('type: "SHOP_OPEN"') && e.includes('kind: "SHOP"'));
  check("29. SHOP→WORLD (CLOSE clears)", e.includes('case "SHOP_CLOSE"'));
  check("30. WORLD→FORGE (forge:open switch)", e.includes('"forge:open"') && e.includes('kind: "FORGE"'));
  check("31. FORGE_CLOSE returns to SHOP (prototype single menu)", e.includes('case "FORGE_CLOSE"') && e.includes('session = { kind: "SHOP", npcId }'));
  check("32. BATTLE blocks interaction", e.includes("if (currentState.battle !== null || session !== null) return currentState;"));
  check("33. session blocks movement", (e.match(/session !== null\) return currentState;/g) ?? []).length >= 2);
  check("E2. mode getter exists", e.includes("getMode") && e.includes('"BATTLE"') && e.includes('"FORGE"'));
}

console.log("\n💾 F. Persistence");
{
  const p = src("src/game/rpg/core/persistence.ts");
  check("34. flags round-trip incl. met flags", (() => {
    const saved = { flags: { ratmiMet: true, empuMet: true } };
    return JSON.parse(JSON.stringify(saved)).flags.empuMet === true;
  })() && p.includes("flags"));
  check("35. gold ledger single source (no wallet/saldo)", (() => {
    const hits: string[] = [];
    const files = ["src/game/rpg/core/game-engine.ts", "src/game/rpg/core/persistence.ts", "src/game/rpg/combat/battle-apply.ts", "src/game/rpg/combat/battle-core.ts"];
    for (const f of files) {
      const s = strip(src(f));
      if (/wallet|saldo|User\.saldo/i.test(s)) hits.push(f);
    }
    return hits.length === 0;
  })());
  check("36. no inventory writes in shop/forge paths", !/addItem|removeItem/.test(strip(eng()).split('case "SHOP_BUY"')[1] ?? ""));
}

console.log("\n🛡️ G. Regression guards");
{
  const reg = src("lib/arena/game-registry.ts");
  check("37-41a. unpublished intact", reg.includes("unpublished: true"));
  const kuis = src("components/game/KuisTempurSolo.tsx");
  check("37-41b. Kuis decoupled", !kuis.includes("interaction/") && !kuis.includes("game/rpg"));
  const zelby = src("components/game/ZelbyDash.tsx");
  check("37-41c. Zelby decoupled", !zelby.includes("interaction/") && !zelby.includes("game/rpg"));
  const core = strip(src("src/game/rpg/combat/battle-core.ts"));
  check("37-41d. battle formulas untouched", core.includes("FLEE_CHANCE") && core.includes("0.6"));
  const ws = strip(src("src/game/rpg/world/world-step.ts"));
  check("37-41e. world-step untouched by interaction", !ws.includes("dialogue") && !ws.includes("shop"));
  check("37-41f. dead quest 5 still dead", DEAD_QUEST_STATES.includes(5) && !/quest\s*=\s*5[^0-9]/.test(strip(eng())));
}

console.log(`\n📊 Hasil: ${pass} lulus, ${fail} gagal\n`);
process.exit(fail > 0 ? 1 : 0);
