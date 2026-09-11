/**
 * Canonical items — Pendekar Suryakerta (P1.6).
 *
 * DATA ONLY. Ids are prototype inventory keys VERBATIM (ram/teh/elix/bijih/
 * f1/f2/f3); effects and sell prices transcribe prototype FISH + STATUS-menu
 * eat list + shop prices (legacy lines 496, 1583-1585). Fish stay distinct
 * (f1/f2/f3 never collapsed). Nothing here mutates state.
 */

export type CanonicalItemKind = "consumable" | "material" | "fish";

export interface CanonicalItemDef {
  id: string;
  name: string;
  kind: CanonicalItemKind;
  /** HP restore (capped at maxHp by the applier). */
  healHp?: number;
  /** MP restore (capped at maxMp by the applier). */
  healMp?: number;
  /** Full HP+MP restore (Elixir, Ikan Emas). */
  fullRestore?: boolean;
  /** Ratmi buy-back price (fish only). */
  sellPrice?: number;
  /** Edible in battle (prototype BARANG menu: ram/teh/elix only). */
  battleUsable?: boolean;
}

export const CANONICAL_ITEMS: Record<string, CanonicalItemDef> = {
  ram: { id: "ram", name: "Ramuan", kind: "consumable", healHp: 40, battleUsable: true },
  teh: { id: "teh", name: "Teh Gunung", kind: "consumable", healMp: 25, battleUsable: true },
  elix: { id: "elix", name: "Elixir", kind: "consumable", fullRestore: true, battleUsable: true },
  bijih: { id: "bijih", name: "Bijih Besi", kind: "material" },
  f1: { id: "f1", name: "Ikan Kecil", kind: "fish", healHp: 40, sellPrice: 20 },
  f2: { id: "f2", name: "Ikan Besar", kind: "fish", healHp: 80, sellPrice: 60 },
  f3: { id: "f3", name: "Ikan Emas Nusantara", kind: "fish", fullRestore: true, sellPrice: 150 },
};

export function canonicalItemById(id: string): CanonicalItemDef | undefined {
  return CANONICAL_ITEMS[id];
}
