/**
 * Chest model — Pendekar Suryakerta (P1E.2).
 *
 * Migrates the 4 prototype chests EXACTLY (location, reward payload,
 * message). Opening semantics mirror the prototype:
 *
 * - First open: mark opened, grant reward, persist (caller saves).
 * - Already opened: "empty" notice, NO repeated reward (idempotent).
 *
 * Reward application (payload keys → production inventory ids) is owned by
 * a later inventory phase — this module preserves the canonical payload
 * verbatim and proves idempotency + persistence compatibility
 * (opened ids ride the save boundary, see core/persistence.ts).
 */

import type { CanonicalChest, CanonicalMap } from "../data/world-maps";

/** Result of attempting to open a chest. */
export type ChestOpenResult =
  | { opened: true; chestId: string; give: CanonicalChest["give"]; msg: string }
  | { opened: false; chestId: string; alreadyOpened: true };

/** Chest defined at a tile, if the map defines one there. */
export function findChestAt(map: CanonicalMap, x: number, y: number): CanonicalChest | undefined {
  return map.chests.find((c) => c.x === x && c.y === y);
}

/**
 * Open a chest against the set of already-opened chest ids.
 * Pure + idempotent: the same (chest, opened) input always yields the
 * same output and never double-grants.
 */
export function openChest(
  chest: CanonicalChest,
  openedIds: ReadonlySet<string>,
): ChestOpenResult {
  if (openedIds.has(chest.id)) {
    return { opened: false, chestId: chest.id, alreadyOpened: true };
  }
  return { opened: true, chestId: chest.id, give: chest.give, msg: chest.msg };
}
