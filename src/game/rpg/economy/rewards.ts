/**
 * Reward application — Pendekar Suryakerta (P1.6).
 *
 * Pure appliers translating canonical reward payloads into inventory/stats
 * updates. Uses the EXISTING inventory boundary (player/inventory.ts —
 * addItem/removeItem); no second inventory is created here.
 *
 * Key mapping (explicit, documented):
 * - Consumables/materials/fish (ram/teh/elix/bijih/f1/f2/f3) resolve via
 *   data/items.ts and apply directly.
 * - Equipment keys (wpn/arm prototype keys: empu/baja/kulit) have NO
 *   production counterpart on this branch → preserved as EQUIPMENT intents
 *   (never silently mapped, never dropped). The inventory phase resolves them.
 *
 * Consumable effects verbatim (legacy 1583-1585 + FISH table line 496):
 * ram +40HP, teh +25MP, elix full, f1 +40HP, f2 +80HP, f3 full. bijih is
 * material (never consumable). Battle menu allows ram/teh/elix only.
 */

import type { RPGInventory, RPGPlayerStats } from "../player/player-state";
import { addItem, removeItem } from "../player/inventory";
import { canonicalItemById } from "../data/items";
import { resolveEquipmentKey } from "../data/equipment-mapping";
import type { CanonicalChestReward } from "../data/world-maps";

/** Equipment reward resolved to canonical production key. */
export interface EquipmentIntent {
  source: string;
  kind: "wpn" | "arm";
  key: string;
  /** Canonical production equipment ID (e.g. "equip.keris-singa"). */
  equipmentKey: string;
}

export interface ChestApplied {
  inventory: RPGInventory;
  equipmentIntents: EquipmentIntent[];
  applied: Array<{ itemId: string; quantity: number }>;
}

/** Apply a chest `give` payload: items now, gear as preserved intents. */
export function applyChestRewards(
  inventory: RPGInventory,
  sourceId: string,
  give: CanonicalChestReward,
): ChestApplied {
  let inv = inventory;
  const equipmentIntents: EquipmentIntent[] = [];
  const applied: Array<{ itemId: string; quantity: number }> = [];
  const grant = (id: string, qty: number) => {
    inv = addItem(inv, id, qty);
    applied.push({ itemId: id, quantity: qty });
  };
  if (give.ram) grant("ram", give.ram);
  if (give.teh) grant("teh", give.teh);
  if (give.elix) grant("elix", give.elix);
  if (give.bijih) grant("bijih", give.bijih);
  if (give.gold) {
    // Prototype chests never carry gold; the type allows it, so fail closed.
    throw new Error(`chest ${sourceId}: gold rewards have no canonical path`);
  }
  if (give.wpn) {
    const equipmentKey = resolveEquipmentKey(give.wpn);
    equipmentIntents.push({ source: sourceId, kind: "wpn", key: give.wpn, equipmentKey });
    grant(equipmentKey, 1);
  }
  if (give.arm) {
    const equipmentKey = resolveEquipmentKey(give.arm);
    equipmentIntents.push({ source: sourceId, kind: "arm", key: give.arm, equipmentKey });
    grant(equipmentKey, 1);
  }
  return { inventory: inv, equipmentIntents, applied };
}

export type ConsumeRejection =
  | "UNKNOWN_ITEM"
  | "NOT_CONSUMABLE"
  | "NONE_OWNED"
  | "BATTLE_RESTRICTED";

export interface ConsumeApplied<S = RPGPlayerStats> {
  inventory: RPGInventory;
  stats: S;
}

export type ConsumeResult<S = RPGPlayerStats> =
  | { ok: true; applied: ConsumeApplied<S> }
  | { ok: false; reason: ConsumeRejection };

/**
 * Consume one unit. `inBattle` gates fish out (prototype BARANG menu:
 * ram/teh/elix only; fish via STATUS menu = world-side). Pure + atomic.
 *
 * Stats are generic over {hp,maxHp,mp,maxMp} so battle snapshots
 * (RPGBattleActor, no speed field) flow through the same gate.
 */
export function applyConsume<S extends { hp: number; maxHp: number; mp: number; maxMp: number }>(
  inventory: RPGInventory,
  stats: S,
  itemId: string,
  inBattle: boolean,
): ConsumeResult<S> {
  const def = canonicalItemById(itemId);
  if (!def) return { ok: false, reason: "UNKNOWN_ITEM" };
  if (def.kind === "material") return { ok: false, reason: "NOT_CONSUMABLE" };
  if (inBattle && def.battleUsable !== true) {
    return { ok: false, reason: "BATTLE_RESTRICTED" };
  }
  const owned = inventory.items.find((i) => i.itemId === itemId)?.quantity ?? 0;
  if (owned <= 0) return { ok: false, reason: "NONE_OWNED" };
  const nextStats = def.fullRestore
    ? { ...stats, hp: stats.maxHp, mp: stats.maxMp }
    : {
        ...stats,
        hp: Math.min(stats.maxHp, stats.hp + (def.healHp ?? 0)),
        mp: Math.min(stats.maxMp, stats.mp + (def.healMp ?? 0)),
      };
  return {
    ok: true,
    applied: { inventory: removeItem(inventory, itemId, 1), stats: nextStats },
  };
}

/** Sell-all-fish value verbatim (f1x20+f2x60+f3x150, prototype shopRatmi). */
export function fishSellValue(inventory: RPGInventory): {
  total: number;
  counts: { f1: number; f2: number; f3: number };
} {
  const qty = (id: string) => inventory.items.find((i) => i.itemId === id)?.quantity ?? 0;
  const counts = { f1: qty("f1"), f2: qty("f2"), f3: qty("f3") };
  return { total: counts.f1 * 20 + counts.f2 * 60 + counts.f3 * 150, counts };
}

/** Remove all fish after a sale (caller credits gold atomically). Pure. */
export function removeAllFish(inventory: RPGInventory): RPGInventory {
  let inv = inventory;
  for (const id of ["f1", "f2", "f3"] as const) {
    const qty = inv.items.find((i) => i.itemId === id)?.quantity ?? 0;
    if (qty > 0) inv = removeItem(inv, id, qty);
  }
  return inv;
}
