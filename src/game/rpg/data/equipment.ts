/**
 * Equipment data — data-driven equipment definitions.
 *
 * Stats are additive modifiers applied by the (future) stat-resolution step in
 * the combat engine. Item ids are referenced by inventory and equipment state.
 */

export type RPGEquipmentSlot = "weapon" | "armor" | "accessory";

export interface RPGEquipmentDefinition {
  id: string;
  name: string;
  slot: RPGEquipmentSlot;
  /** Additive stat modifiers. */
  modifiers: Partial<{ hp: number; attack: number; defense: number; speed: number }>;
  /** Asset key resolved by the renderer. */
  asset: string;
}

export const EQUIPMENT: RPGEquipmentDefinition[] = [
  {
    id: "equip.keris-singa",
    name: "Keris Singa",
    slot: "weapon",
    modifiers: { attack: 4 },
    asset: "equip.keris",
  },
  {
    id: "equip.baju-tenun",
    name: "Baju Tenun",
    slot: "armor",
    modifiers: { defense: 3, hp: 10 },
    asset: "equip.armor",
  },
  {
    id: "equip.cincin-pasir",
    name: "Cincin Pasir",
    slot: "accessory",
    modifiers: { speed: 1 },
    asset: "equip.ring",
  },
];
