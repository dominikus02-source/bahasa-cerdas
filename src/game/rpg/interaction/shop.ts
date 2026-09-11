/**
 * Shop domain — Pendekar Suryakerta (P1.5).
 *
 * Pure catalog + validation over canonical prototype stock. No React, no DOM,
 * no storage, no network, no RNG. All currency/material availability arrives
 * as explicit params — the engine supplies them (currently 0/empty: no
 * spendable balance exists yet, so purchases deterministically fail with
 * INSUFFICIENT_GOLD until the economy phase; the intent pipeline is proven
 * by tests with injected balances).
 *
 * Canonical stock (prototype shopRatmi/shopEmpu, verbatim prices/keys):
 * - Bu Ratmi: ram 30G, teh 25G, elix 80G. Sell-all-fish is DATA-deferred
 *   (needs fish counts + gold credit — see SHOP_SELL_FISH_NOTE).
 * - Pak Empu: wpn baja 150, arm kulit 120, wpn empu 450, arm baja 380.
 *   Keys stay prototype-verbatim (wpn/arm); there is deliberately NO silent
 *   mapping to equip.* production ids (mapping is inventory-phase work).
 */

export interface ShopListing {
  key: string;
  label: string;
  price: number;
  /** Prototype equipment slot for gear, consumable otherwise. */
  slot: "consumable" | "wpn" | "arm";
}

/** Greeting lines verbatim (first vs repeat visit, ratmiMet/empuMet flags). */
export interface ShopMenu {
  npcId: string;
  greetingFirst: string[];
  greetingRepeat: string[];
  metFlag: "ratmiMet" | "empuMet";
  stock: ShopListing[];
}

export const SHOP_MENUS: Record<string, ShopMenu> = {
  ratmi: {
    npcId: "ratmi",
    greetingFirst: ["Selamat datang di warung Bu Ratmi! Ramuan segar, murah meriah!"],
    greetingRepeat: ["Ada yang bisa Bu Ratmi bantu, Nak?"],
    metFlag: "ratmiMet",
    stock: [
      { key: "ram", label: "Ramuan", price: 30, slot: "consumable" },
      { key: "teh", label: "Teh Gunung", price: 25, slot: "consumable" },
      { key: "elix", label: "Elixir", price: 80, slot: "consumable" },
    ],
  },
  empu: {
    npcId: "empu",
    greetingFirst: [
      "Selamat datang di bengkel Pak Empu! Pandai besi turun-temurun.",
      "Bawa Bijih Besi dari golem, kubuatkan senjatamu makin tajam!",
    ],
    greetingRepeat: ["Ada pesanan? Baja panas, hati hangat, hahaha!"],
    metFlag: "empuMet",
    stock: [
      { key: "wpn:baja", label: "Pedang Baja — Serang +4", price: 150, slot: "wpn" },
      { key: "arm:kulit", label: "Zirah Kulit — Tahan +3", price: 120, slot: "arm" },
      { key: "wpn:empu", label: "Pedang Empu — Serang +9", price: 450, slot: "wpn" },
      { key: "arm:baja", label: "Zirah Baja — Tahan +7", price: 380, slot: "arm" },
    ],
  },
};

/** Sell-all-fish formula verbatim (f1x20+f2x60+f3x150); UNWIRED until the
 *  economy phase provides fish counts + gold credit (SHOP_SELL_FISH_NOTE). */
export const SHOP_SELL_FISH_NOTE = "DEFERRED: needs fish counts + gold credit (economy phase)";

export function getShopMenu(npcId: string): ShopMenu | undefined {
  return SHOP_MENUS[npcId];
}

/** Active shop session (engine-held, never persisted). */
export interface ShopSession {
  kind: "SHOP";
  npcId: string;
}

export type PurchaseRejection =
  | "UNKNOWN_SHOP"
  | "UNKNOWN_ITEM"
  | "INVALID_QUANTITY"
  | "INSUFFICIENT_GOLD";

export interface PurchaseIntent {
  npcId: string;
  itemKey: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type PurchaseResult =
  | { ok: true; intent: PurchaseIntent }
  | { ok: false; reason: PurchaseRejection };

/**
 * Validate a purchase. Returns an INTENT (never mutates inventory/gold —
 * the engine/applier owns mutation). Deterministic, no RNG.
 */
export function validatePurchase(args: {
  npcId: string;
  itemKey: string;
  quantity: number;
  goldAvailable: number;
}): PurchaseResult {
  const menu = SHOP_MENUS[args.npcId];
  if (!menu) return { ok: false, reason: "UNKNOWN_SHOP" };
  const listing = menu.stock.find((s) => s.key === args.itemKey);
  if (!listing) return { ok: false, reason: "UNKNOWN_ITEM" };
  if (!Number.isInteger(args.quantity) || args.quantity <= 0) {
    return { ok: false, reason: "INVALID_QUANTITY" };
  }
  const totalPrice = listing.price * args.quantity;
  if (args.goldAvailable < totalPrice) {
    return { ok: false, reason: "INSUFFICIENT_GOLD" };
  }
  return {
    ok: true,
    intent: {
      npcId: args.npcId,
      itemKey: args.itemKey,
      quantity: args.quantity,
      unitPrice: listing.price,
      totalPrice,
    },
  };
}
