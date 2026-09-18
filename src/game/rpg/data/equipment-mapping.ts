/**
 * Equipment prototype-to-production mapping.
 *
 * The prototype stores weapon/armor IDs as short keys (`wpn`, `arm`, `f1` etc.).
 * The server-authoritative system uses canonical IDs (`equip.keris-singa`, etc.).
 * This mapping resolves prototype keys to production equipment IDs.
 *
 * Used by: rewards.ts (equipmentIntents), shop.ts (shop purchase flow).
 */

export const EQUIPMENT_KEY_MAP: Record<string, string> = {
  // Prototype weapon → production weapon
  wpn: "equip.keris-singa",
  keris: "equip.keris-singa",
  // Prototype armor → production armor
  arm: "equip.baju-tenun",
  armor: "equip.baju-tenun",
  // Prototype accessory → production accessory
  ring: "equip.cincin-pasir",
  accessory: "equip.cincin-pasir",
};

/**
 * Resolve a prototype equipment key to its canonical production ID.
 * Returns the original key if no mapping exists (already canonical).
 */
export function resolveEquipmentKey(prototypeKey: string): string {
  return EQUIPMENT_KEY_MAP[prototypeKey] ?? prototypeKey;
}
