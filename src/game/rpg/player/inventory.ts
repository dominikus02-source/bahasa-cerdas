/**
 * Player inventory boundary.
 *
 * Pure operations over the authoritative inventory slice. Item DEFINITIONS
 * come from `data/equipment.ts`; this module only manipulates counts/slots.
 */

import type { RPGInventory, RPGInventoryItem } from "./player-state";
import type { RPGEquipment } from "./player-state";
import type { RPGEquipmentSlot } from "../data/equipment";

/** Add quantity for an item (stacking); inserts a new stack if absent. */
export function addItem(inventory: RPGInventory, itemId: string, quantity = 1): RPGInventory {
  const items = inventory.items.map((i) => ({ ...i }));
  const existing = items.find((i) => i.itemId === itemId);
  if (existing) existing.quantity += quantity;
  else items.push({ itemId, quantity });
  return { items };
}

/** Remove quantity; drops the stack at zero. Returns unchanged if insufficient. */
export function removeItem(inventory: RPGInventory, itemId: string, quantity = 1): RPGInventory {
  const existing = inventory.items.find((i) => i.itemId === itemId);
  if (!existing || existing.quantity < quantity) return inventory;
  const items = inventory.items
    .map((i) => (i.itemId === itemId ? { ...i, quantity: i.quantity - quantity } : i))
    .filter((i): i is RPGInventoryItem => i.quantity > 0);
  return { items };
}

/** Equip an item by slot; returns the updated equipment slice. */
export function equipItem(equipment: RPGEquipment, slot: RPGEquipmentSlot, itemId: string): RPGEquipment {
  return { ...equipment, [slot === "weapon" ? "weaponId" : slot === "armor" ? "armorId" : "accessoryId"]: itemId };
}
