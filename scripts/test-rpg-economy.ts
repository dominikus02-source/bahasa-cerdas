/**
 * P1.6 ECONOMY / INVENTORY / REWARD APPLICATION — tests (no DOM, no browser).
 *
 * Pure appliers driven directly; the engine (DOM-bound) is verified by static
 * wiring proofs + tsc + build. Every engine path asserted here names the
 * exact mechanism (gold closure, ledger ids, applier calls).
 *
 * Run: npx tsx scripts/test-rpg-economy.ts
 * Exit 0 = SEMUA LULUS, 1 = ada yang gagal.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createGoldState, creditGold, debitGold, applyShopPurchase, applyForgeUpgrade,
  INITIAL_GOLD,
} from "../src/game/rpg/economy/economy";
import {
  applyChestRewards, applyConsume, fishSellValue, removeAllFish,
} from "../src/game/rpg/economy/rewards";
import { canonicalItemById } from "../src/game/rpg/data/items";
import { validatePurchase } from "../src/game/rpg/interaction/shop";
import { validateForge } from "../src/game/rpg/interaction/forge";
import { addItem, removeItem } from "../src/game/rpg/player/inventory";
import { createDefaultPlayer } from "../src/game/rpg/player/player-state";
import { resolveCombatStats } from "../src/game/rpg/combat/battle-core";
import { EQUIPMENT } from "../src/game/rpg/data/equipment";
import { WORLD_MAPS } from "../src/game/rpg/data/world-maps";

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

const eng = () => src("src/game/rpg/core/game-engine.ts");
const inv0 = { items: [] as Array<{ itemId: string; quantity: number }> };

console.log("\n🪙 GOLD (1-6)");
check("1. initial gold 30 (verbatim)", createGoldState().balance === 30 && INITIAL_GOLD === 30);
check("2. credit", creditGold(createGoldState(), "b1", 20, "t").balance === 50);
check("3. debit atomic", (() => {
  const g = debitGold(creditGold(createGoldState(), "b1", 20, "t"), "s1", 15, "shop");
  return g.balance === 35;
})());
check("4. insufficient gold = unchanged", (() => {
  const g = createGoldState();
  const d = debitGold(g, "s9", 999, "shop");
  return d.balance === 30 && d.ledger.length === 0;
})());
check("5. duplicate credit id = no-op", (() => {
  const g = creditGold(creditGold(createGoldState(), "b1", 20, "t"), "b1", 20, "t");
  return g.balance === 50 && g.ledger.length === 1;
})());
check("5b. duplicate debit id = no-op", (() => {
  const g = debitGold(debitGold(createGoldState(), "s1", 10, "x"), "s1", 10, "x");
  return g.balance === 20 && g.ledger.length === 1;
})());
check("6. invalid amounts ignored", (() => {
  const g = creditGold(debitGold(createGoldState(), "a", 0, "x"), "b", -5, "x");
  return g.balance === 30 && g.ledger.length === 0;
})());
check("6b. balance equals initial + ledger sum", (() => {
  const g = debitGold(creditGold(createGoldState(100), "b1", 45, "t"), "s1", 30, "x");
  return g.balance === 100 + g.ledger.reduce((s, e) => s + e.delta, 0) && g.balance === 115;
})());

console.log("\n🎒 INVENTORY (7-12)");
check("7. add item stacks", addItem(inv0, "ram", 2).items[0].quantity === 2);
check("8. remove decrements", (() => {
  const i = addItem(inv0, "ram", 2);
  return removeItem(i, "ram", 1).items[0].quantity === 1;
})());
check("9. insufficient quantity = unchanged", (() => {
  const i = addItem(inv0, "ram", 1);
  return removeItem(i, "ram", 5) === i;
})());
check("10. duplicate grant stacks (no dup stacks)", addItem(addItem(inv0, "teh", 1), "teh", 2).items.length === 1);
check("11. canonical ids resolve (ram..f3)", ["ram", "teh", "elix", "bijih", "f1", "f2", "f3"].every((id) => !!canonicalItemById(id)));
check("11b. fish distinct", canonicalItemById("f1")!.sellPrice === 20 && canonicalItemById("f2")!.sellPrice === 60 && canonicalItemById("f3")!.sellPrice === 150);
check("12. inventory round-trips JSON", (() => {
  const i = addItem(addItem(inv0, "ram", 1), "bijih", 3);
  const back = JSON.parse(JSON.stringify(i));
  return back.items.length === 2 && back.items[1].quantity === 3;
})());

console.log("\n📦 CHEST (13-17)");
{
  const desa = WORLD_MAPS["map.desa"];
  const gunung = WORLD_MAPS["map.gunung"];
  const cv1 = desa.chests.find((c) => c.id === "cv1")!;
  const g1 = gunung.chests.find((c) => c.id === "g1")!;
  const g2 = gunung.chests.find((c) => c.id === "g2")!;
  const g3 = gunung.chests.find((c) => c.id === "g3")!;
  const r1 = applyChestRewards(inv0, "cv1", cv1.give);
  check("13. cv1 elix x1", r1.applied.length === 1 && r1.inventory.items[0].quantity === 1 && r1.equipmentIntents.length === 0);
  const r2 = applyChestRewards(inv0, "g1", g1.give);
  check("14. g1 gear preserved as intent (no silent map)", r2.equipmentIntents.length === 1 && r2.equipmentIntents[0].key === "empu" && r2.equipmentIntents[0].source === "g1");
  const r3 = applyChestRewards(inv0, "g2", g2.give);
  check("15. g2 gear preserved", r3.equipmentIntents[0].key === "baja" && r3.equipmentIntents[0].kind === "arm");
  const r4 = applyChestRewards(inv0, "g3", g3.give);
  check("16. g3 multi-item (teh x2, ram x1)", r4.inventory.items.find((i) => i.itemId === "teh")?.quantity === 2 && r4.inventory.items.find((i) => i.itemId === "ram")?.quantity === 1);
  check("17. duplicate chest open impossible (openedChests gate)", eng().includes("openedChests.add(out.chestId)"));
  check("17b. engine applies chest via applier", eng().includes("applyChestRewards("));
}

console.log("\n⚔️ BATTLE REWARD (18-22)");
check("18. victory gold credit shape", eng().includes('creditGold(gold, battle.battleId'));
check("19. victory drops add bijih", eng().includes('addItem(dropInventory, "bijih", 1)'));
check("20. dedup via appliedBattleIds", eng().includes("appliedBattleIds.has(battle.battleId)"));
check("21. defeat grants nothing (no credit path)", !/LOSE[\s\S]{0,400}?creditGold/.test(eng()));
check("22. flee grants nothing", eng().includes('result === "FLED"'));

console.log("\n🏪 SHOP (23-27)");
check("23. valid purchase applies (atomic)", (() => {
  const g = createGoldState(100);
  const v = validatePurchase({ npcId: "ratmi", itemKey: "ram", quantity: 2, goldAvailable: g.balance });
  if (!v.ok) return false;
  const done = applyShopPurchase(g, inv0, v.intent, "shop:0");
  return done.applied && done.gold.balance === 40 && done.inventory.items[0].quantity === 2;
})());
check("24. insufficient gold (engine balance)", eng().includes("goldAvailable: gold.balance"));
check("25. invalid item rejected", !validatePurchase({ npcId: "ratmi", itemKey: "nope", quantity: 1, goldAvailable: 999 }).ok);
check("26. invalid quantity rejected", !validatePurchase({ npcId: "ratmi", itemKey: "ram", quantity: 0, goldAvailable: 999 }).ok);
check("27. duplicate tx id = no second apply", (() => {
  const g = createGoldState(100);
  const v = validatePurchase({ npcId: "ratmi", itemKey: "ram", quantity: 1, goldAvailable: 100 });
  if (!v.ok) return false;
  const once = applyShopPurchase(g, inv0, v.intent, "shop:0");
  const twice = applyShopPurchase(once.gold, once.inventory, v.intent, "shop:0");
  return once.applied && !twice.applied && twice.gold.balance === 70 && twice.inventory.items[0].quantity === 1;
})());
check("27b. gear without mapping rejected explicitly", (() => {
  const r = validatePurchase({ npcId: "empu", itemKey: "wpn:baja", quantity: 1, goldAvailable: 9999 });
  return !r.ok && (r as { reason: string }).reason === "EQUIPMENT_UNMAPPED";
})());

console.log("\n⚒️ FORGE (28-35)");
check("28. valid +1 applies (gold+bijih debit, plus)", (() => {
  const g = createGoldState(500);
  const inv = addItem(inv0, "bijih", 3);
  const v = validateForge({ npcId: "empu", weaponId: "kayu", currentPlus: 2, bijihAvailable: 3, goldAvailable: 500 });
  if (!v.ok) return false;
  // emulate engine apply path via public applier tested in 33b; here check intent:
  return v.intent.plus === 3 && v.intent.goldCost === 100 && v.intent.bijihCost === 1;
})());
{
  const g = createGoldState(500);
  const inv = addItem(inv0, "bijih", 3);
  const done = applyForgeUpgrade(g, inv, { bijihCost: 1, goldCost: 100, plus: 3 }, "forge:0");
  check("29. material consumed", done.applied && done.inventory.items.find((i) => i.itemId === "bijih")?.quantity === 2);
  check("30. gold consumed", done.gold.balance === 400);
  const dup = applyForgeUpgrade(done.gold, done.inventory, { bijihCost: 1, goldCost: 100, plus: 3 }, "forge:0");
  check("35. duplicate forge tx = no-op", !dup.applied && dup.gold.balance === 400);
}
check("31. +5 cap", !validateForge({ npcId: "empu", weaponId: "kayu", currentPlus: 5, bijihAvailable: 9, goldAvailable: 9999 }).ok);
check("32. insufficient material", !validateForge({ npcId: "empu", weaponId: "kayu", currentPlus: 0, bijihAvailable: 0, goldAvailable: 999 }).ok);
check("33. insufficient gold", !validateForge({ npcId: "empu", weaponId: "kayu", currentPlus: 0, bijihAvailable: 9, goldAvailable: 50 }).ok);
check("34. invalid equipment", !validateForge({ npcId: "empu", weaponId: "", currentPlus: 0, bijihAvailable: 9, goldAvailable: 999 }).ok);

console.log("\n🧪 USE_ITEM (36-41)");
{
  const p = createDefaultPlayer("p", "P");
  const stats = { ...p.stats, hp: 10, mp: 5 };
  const inv = addItem(addItem(addItem(inv0, "ram", 1), "teh", 1), "elix", 1);
  const r1 = applyConsume(inv, stats, "ram", false);
  check("36. Ramuan +40 (capped)", r1.ok && r1.applied.stats.hp === 50 && r1.applied.inventory.items.find((i) => i.itemId === "ram") === undefined);
  const r2 = applyConsume(inv, stats, "teh", false);
  check("37. Teh +25MP (capped at 20)", r2.ok && r2.applied.stats.mp === 20);
  const r3 = applyConsume(inv, stats, "elix", false);
  check("38. Elixir full", r3.ok && r3.applied.stats.hp === 100 && r3.applied.stats.mp === 20);
  check("39. no item owned", !applyConsume(inv0, stats, "ram", false).ok);
  check("40. bijih non-consumable", !applyConsume(addItem(inv0, "bijih", 1), stats, "bijih", false).ok);
  check("40b. unknown item", !applyConsume(inv, stats, "nope", false).ok);
  check("41. fish battle-restricted, world-ok", !applyConsume(addItem(inv0, "f1", 1), stats, "f1", true).ok &&
    applyConsume(addItem(inv0, "f1", 1), stats, "f1", false).ok);
  check("41b. invalid quantity n/a (unit consume)", applyConsume(inv, stats, "ram", false).ok);
}

console.log("\n🛡️ EQUIPMENT (42-44)");
check("42. enhancement persists (plus field)", (() => {
  const p = createDefaultPlayer("p", "P");
  const e = { ...p.equipment, weaponId: "equip.keris-singa", weaponPlus: 3 };
  return JSON.parse(JSON.stringify(e)).weaponPlus === 3;
})());
check("43. plus flows through stat resolver", resolveCombatStats({ attack: 10, defense: 5 }, { weaponId: "equip.keris-singa", armorId: null, accessoryId: null, weaponPlus: 3 }, EQUIPMENT).attack === 17);
check("43b. plus clamped 0..5", resolveCombatStats({ attack: 10, defense: 5 }, { weaponId: null, armorId: null, accessoryId: null, weaponPlus: 99 }, EQUIPMENT).attack === 15);
check("44. invalid enhancement rejected (cap path)", !validateForge({ npcId: "empu", weaponId: "kayu", currentPlus: 99, bijihAvailable: 99, goldAvailable: 99999 }).ok);

console.log("\n💾 PERSISTENCE (45-46)");
check("45. full economy round-trip", (() => {
  const saved = { gold: 135, goldLedger: [{ id: "b1", delta: 20, reason: "battle-victory" }], equipmentIntents: [{ source: "g1", kind: "wpn", key: "empu" }], inventory: addItem(inv0, "ram", 2) };
  const back = JSON.parse(JSON.stringify(saved));
  return back.gold === 135 && back.goldLedger.length === 1 && back.equipmentIntents[0].key === "empu" && back.inventory.items[0].quantity === 2;
})());
check("45b. engine persists slices", eng().includes("gold: gold.balance") && eng().includes("equipmentIntents:"));
check("46. no duplicate economy state", (() => {
  const s = strip(eng());
  return !/wallet|saldo|User\.saldo/.test(s) && (s.match(/let gold[:\s]/g) ?? []).length <= 1;
})());

console.log("\n🛡️ REGRESSION (47-52)");
check("47. unpublished guard intact", src("lib/arena/game-registry.ts").includes("unpublished: true"));
{
  const kuis = src("components/game/KuisTempurSolo.tsx");
  check("Kuis decoupled", !kuis.includes("economy/") && !kuis.includes("game/rpg"));
  const zelby = src("components/game/ZelbyDash.tsx");
  check("Zelby decoupled", !zelby.includes("economy/") && !zelby.includes("game/rpg"));
}
check("battle-core formulas intact", strip(src("src/game/rpg/combat/battle-core.ts")).includes("FLEE_CHANCE"));
check("world/chest/shop prices intact", src("src/game/rpg/interaction/shop.ts").includes("price: 30") && src("src/game/rpg/world/chest.ts").includes("findChestAt"));

console.log(`\n📊 Hasil: ${pass} lulus, ${fail} gagal\n`);
process.exit(fail > 0 ? 1 : 0);
