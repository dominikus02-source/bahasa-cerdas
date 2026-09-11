/**
 * Canonical gold economy — Pendekar Suryakerta (P1.6).
 *
 * Exactly ONE spendable balance lives in the engine closure; this module owns
 * the pure transitions. The append-only ledger is the audit trail (battle
 * credits reference battleId; debits reference tx ids). No wallet, no saldo,
 * no second balance — the pre-existing `goldIntents` battle-credit audit is
 * preserved untouched and credited through here exactly once per battleId.
 *
 * Canonical initial gold: 30 (prototype newGame, verbatim).
 * Pure + deterministic: invalid transactions change nothing, consume no RNG.
 */

import type { RPGInventory } from "../player/player-state";
import { addItem, removeItem } from "../player/inventory";

/** Canonical starting gold (prototype newGame gold:30). */
export const INITIAL_GOLD = 30;

export interface GoldLedgerEntry {
  /** battleId for credits, tx id for debits. */
  id: string;
  /** Positive = credit, negative = debit. */
  delta: number;
  reason: string;
}

export interface GoldState {
  balance: number;
  ledger: GoldLedgerEntry[];
}

export function createGoldState(initial = INITIAL_GOLD): GoldState {
  return { balance: initial, ledger: [] };
}

/** Credit exactly once per id (duplicate credit = no-op). */
export function creditGold(
  state: GoldState,
  id: string,
  amount: number,
  reason: string,
): GoldState {
  if (amount <= 0) return state;
  if (state.ledger.some((e) => e.id === id)) return state;
  return {
    balance: state.balance + amount,
    ledger: [...state.ledger, { id, delta: amount, reason }],
  };
}

/** Debit iff sufficient funds; otherwise unchanged (atomic, all-or-nothing). */
export function debitGold(
  state: GoldState,
  id: string,
  amount: number,
  reason: string,
): GoldState {
  if (amount <= 0) return state;
  if (state.ledger.some((e) => e.id === id)) return state;
  if (state.balance < amount) return state;
  return {
    balance: state.balance - amount,
    ledger: [...state.ledger, { id, delta: -amount, reason }],
  };
}

/**
 * Idempotent application over the ledger (the ledger id IS the dedup key —
 * no separate applied-set needed). Defensive balance recheck keeps the
 * all-or-nothing invariant even if validation and application ever split.
 */
export function applyShopPurchase(
  gold: GoldState,
  inventory: RPGInventory,
  intent: { itemKey: string; quantity: number; totalPrice: number },
  txId: string,
): { gold: GoldState; inventory: RPGInventory; applied: boolean } {
  if (gold.ledger.some((e) => e.id === txId)) {
    return { gold, inventory, applied: false };
  }
  if (gold.balance < intent.totalPrice) return { gold, inventory, applied: false };
  return {
    gold: debitGold(gold, txId, intent.totalPrice, "shop-buy"),
    inventory: addItem(inventory, intent.itemKey, intent.quantity),
    applied: true,
  };
}

/** Forge application: gold + bijih debit, plus upgrade. Same ledger dedup. */
export function applyForgeUpgrade(
  gold: GoldState,
  inventory: RPGInventory,
  intent: { bijihCost: number; goldCost: number; plus: number },
  txId: string,
): {
  gold: GoldState;
  inventory: RPGInventory;
  /** New plus on success; undefined = unchanged (rejected/duplicate). */
  weaponPlus?: number;
  applied: boolean;
} {
  if (gold.ledger.some((e) => e.id === txId)) {
    return { gold, inventory, applied: false };
  }
  const bijih = inventory.items.find((i) => i.itemId === "bijih")?.quantity ?? 0;
  if (bijih < intent.bijihCost || gold.balance < intent.goldCost) {
    return { gold, inventory, applied: false };
  }
  return {
    gold: debitGold(gold, txId, intent.goldCost, "forge"),
    inventory: removeItem(inventory, "bijih", intent.bijihCost),
    weaponPlus: intent.plus,
    applied: true,
  };
}
