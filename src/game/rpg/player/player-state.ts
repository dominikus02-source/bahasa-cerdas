/**
 * Player state boundary.
 *
 * Player data is plain serializable state, fully separated from rendering.
 * The renderer READS this state; it is never the source of truth.
 *
 * Ownership: everything in this file is AUTHORITATIVE once multiplayer lands
 * (position, stats, progression, inventory, equipment). Clients may predict
 * movement but the server corrects via events.
 */

import type { RPGId, RPGVec2, RPGFacing } from "../core/constants";

export interface RPGPlayerStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
}

/** XP/level economy; curves arrive with progression data in a later phase. */
export interface RPGProgression {
  level: number;
  xp: number;
  xpToNextLevel: number;
}

export interface RPGInventoryItem {
  itemId: RPGId;
  quantity: number;
}

export interface RPGInventory {
  items: RPGInventoryItem[];
}

export interface RPGEquipment {
  weaponId: RPGId | null;
  armorId: RPGId | null;
  accessoryId: RPGId | null;
}

/** The authoritative player slice. */
export interface RPGPlayerState {
  id: RPGId;
  name: string;
  position: RPGVec2;
  facing: RPGFacing;
  stats: RPGPlayerStats;
  progression: RPGProgression;
  inventory: RPGInventory;
  equipment: RPGEquipment;
}

export function createDefaultPlayer(id: RPGId, name: string): RPGPlayerState {
  return {
    id,
    name,
    position: { x: 0.5, y: 0.5 },
    facing: "down",
    stats: { hp: 100, maxHp: 100, attack: 10, defense: 5, speed: 1 },
    progression: { level: 1, xp: 0, xpToNextLevel: 100 },
    inventory: { items: [] },
    equipment: { weaponId: null, armorId: null, accessoryId: null },
  };
}
