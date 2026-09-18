/**
 * P2.6I.5 — Inventory & Equipment Server Authority: Unit + Integration Tests
 */

import { resolveEquipmentKey, EQUIPMENT_KEY_MAP } from "../src/game/rpg/data/equipment-mapping";
import { EQUIPMENT } from "../src/game/rpg/data/equipment";
import * as fs from "fs";

let pass = 0;
let fail = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.error(`  ✗ FAIL: ${name}`);
  }
}

async function readFile(rel: string): Promise<string> {
  return fs.readFileSync(new URL(rel, import.meta.url).pathname, "utf-8");
}

async function main() {
  // ── 1. Equipment-mapping ──────────────────────────────────────────────
  console.log("\n1. equipment-mapping.ts");
  assertEqual(resolveEquipmentKey("wpn"), "equip.keris-singa", "wpn → equip.keris-singa");
  assertEqual(resolveEquipmentKey("arm"), "equip.baju-tenun", "arm → equip.baju-tenun");
  assertEqual(resolveEquipmentKey("keris"), "equip.keris-singa", "keris → equip.keris-singa");
  assertEqual(resolveEquipmentKey("equip.keris-singa"), "equip.keris-singa", "canonical passes through");
  assertEqual(resolveEquipmentKey("ring"), "equip.cincin-pasir", "ring → equip.cincin-pasir");
  assert(Object.keys(EQUIPMENT_KEY_MAP).length >= 6, "map has ≥6 entries");

  // ── 2. EQUIPMENT catalog has expected IDs ──────────────────────────────
  console.log("\n2. EQUIPMENT catalog");
  assert(EQUIPMENT.length === 3, "3 equipment defs");
  assert(EQUIPMENT.find((e) => e.id === "equip.keris-singa") !== undefined, "has keris-singa");
  assert(EQUIPMENT.find((e) => e.id === "equip.baju-tenun") !== undefined, "has baju-tenun");
  assert(EQUIPMENT.find((e) => e.id === "equip.cincin-pasir") !== undefined, "has cincin-pasir");

  // ── 3. Server-api-client has mutateEquipment and mutateInventory ──────
  console.log("\n3. server-api-client exports");
  const apiSrc = await readFile("../lib/game/rpg/server-api-client.ts");
  assert(apiSrc.includes("export async function mutateEquipment("), "mutateEquipment exported");
  assert(apiSrc.includes("export async function mutateInventory("), "mutateInventory exported");
  assert(apiSrc.includes("EquipmentMutationInput"), "imports EquipmentMutationInput");
  assert(apiSrc.includes("InventoryMutationInput"), "imports InventoryMutationInput");

  // ── 4. Events type includes EQUIP ──────────────────────────────────────
  console.log("\n4. RPGEvent type includes EQUIP");
  const eventsSrc = await readFile("../src/game/rpg/multiplayer/events.ts");
  assert(eventsSrc.includes('"EQUIP"'), "EQUIP in RPGEvent union");

  // ── 5. Game-engine has EQUIP case + all 6 inventory calls ──────────────
  console.log("\n5. game-engine.ts");
  const engineSrc = await readFile("../src/game/rpg/core/game-engine.ts");
  assert(engineSrc.includes('case "EQUIP":'), "EQUIP case in processCommand");
  assert(engineSrc.includes('mutateEquipment("FORGE_UPGRADE"'), "FORGE_UPGRADE fireServerCall exists");
  assert(engineSrc.includes('mutateEquipment("EQUIP"'), "EQUIP fireServerCall exists");
  assert(engineSrc.includes('mutateEquipment("UNEQUIP"'), "UNEQUIP fireServerCall exists");
  assert(engineSrc.includes('mutateInventory("SHOP_PURCHASE"'), "SHOP_PURCHASE inventory call");
  assert(engineSrc.includes('mutateInventory("FISH_SELL"'), "FISH_SELL inventory call");
  assert(engineSrc.includes('mutateInventory("BATTLE_DROP"'), "BATTLE_DROP inventory call");
  assert(engineSrc.includes('mutateInventory("CONSUME"'), "CONSUME inventory call");
  assert(engineSrc.includes('mutateInventory("FORGE_COST"'), "FORGE_COST inventory call");
  assert(engineSrc.includes('mutateInventory("CHEST_GRANT"'), "CHEST_GRANT inventory call");
  // Verify EQUIP handler uses lowercase slot names (not WEAPON/ARMOR/ACCESSORY)
  assert(!engineSrc.includes('equipDef.slot === "WEAPON"'), "no uppercase WEAPON comparison");
  assert(engineSrc.includes('equipDef.slot === "weapon"'), "lowercase weapon comparison");
  assert(engineSrc.includes('equipDef.slot === "armor"'), "lowercase armor comparison");
  assert(engineSrc.includes('equipDef.slot === "accessory"'), "lowercase accessory comparison");

  // ── 6. Persistence weaponPlus hydration ────────────────────────────────
  console.log("\n6. persistence.ts");
  const persistSrc = await readFile("../src/game/rpg/core/persistence.ts");
  assert(persistSrc.includes("weaponPlus: ws.equipment.weaponPlus ?? 0"), "hydrates weaponPlus from server state");
  assert(persistSrc.includes("equipmentKey: string"), "equipmentKey in intents type");

  // ── 7. server-state.ts has both methods ────────────────────────────────
  console.log("\n7. server-state.ts");
  const ssSrc = await readFile("../lib/game/rpg/server-state.ts");
  assert(ssSrc.includes("async mutateEquipment("), "mutateEquipment method exists");
  assert(ssSrc.includes("async mutateInventory("), "mutateInventory method exists");
  assert(ssSrc.includes("EQUIPMENT.find((e) => e.id ==="), "uses .find() not array index");

  // ── 8. rewards.ts uses equipmentKey ────────────────────────────────────
  console.log("\n8. rewards.ts");
  const rewardsSrc = await readFile("../src/game/rpg/economy/rewards.ts");
  assert(rewardsSrc.includes("resolveEquipmentKey"), "imports resolveEquipmentKey");
  assert(rewardsSrc.includes("equipmentKey:"), "sets equipmentKey on intents");

  // ── 9. server-contracts has new types ──────────────────────────────────
  console.log("\n9. server-contracts.ts");
  const contractsSrc = await readFile("../lib/game/rpg/server-contracts.ts");
  assert(contractsSrc.includes("EquipmentMutationInput"), "EquipmentMutationInput type");
  assert(contractsSrc.includes("EquipmentMutationResult"), "EquipmentMutationResult type");
  assert(contractsSrc.includes("InventoryMutationInput"), "InventoryMutationInput type");
  assert(contractsSrc.includes("InventoryMutationResult"), "InventoryMutationResult type");
  assert(contractsSrc.includes("weaponPlus: number"), "weaponPlus in equipment type");

  // ── 10. input.ts has EQUIP command ─────────────────────────────────────
  console.log("\n10. input.ts");
  const inputSrc = await readFile("../src/game/rpg/core/input.ts");
  assert(inputSrc.includes('"EQUIP"'), "EQUIP command type defined");

  // ── Summary ────────────────────────────────────────────────────────────
  console.log(`\n${"═".repeat(60)}`);
  console.log(`P2.6I.5 Tests: ${pass} passed, ${fail} failed`);
  if (fail > 0) {
    process.exit(1);
  } else {
    console.log("All P2.6I.5 tests passed.");
  }
}

function assertEqual<T>(actual: T, expected: T, name: string) {
  assert(actual === expected, `${name} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`);
}

main();
