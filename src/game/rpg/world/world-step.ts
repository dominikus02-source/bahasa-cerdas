/**
 * Canonical world step — Pendekar Suryakerta (P1E.3 WORLD RUNTIME).
 *
 * Pure, deterministic resolution of one tile-step against canonical map data.
 * This is the SINGLE runtime rule engine for movement/collision/portal/chest
 * decisions; the game loop (core/game-engine.ts) calls it, tests call it
 * directly. No DOM, no canvas, no RNG, no side effects.
 *
 * Prototype semantics mirrored (tryMove / interact / solidFor, verbatim):
 * - 4-directional steps only (command vocabulary has no diagonal).
 * - Portal trigger evaluated BEFORE solid collision (portal tiles CV/GP are
 *   SOLID — without portal-first precedence they could never trigger).
 * - Gated portal + unmet req → blocked, caller throttles the notice
 *   (prototype: once per 1.5s).
 * - Chest interact is facing-adjacent; first open grants, re-open is empty.
 * - Unknown map ids → LEGACY (caller keeps its pre-P1E.3 behavior).
 */

import type { RPGFacing } from "../core/constants";
import type { CanonicalMapId, CanonicalChestReward } from "../data/world-maps";
import { getCanonicalMap } from "../data/world-maps";
import { tileAt, isSolidTile, inBounds } from "./tiles";
import type { TileRef } from "./tiles";
import { findPortalAt, resolvePortal } from "./portal";
import { findChestAt, openChest } from "./chest";

/** Step outcome — exactly one per call (no double processing). */
export type WorldStepOutcome =
  | { kind: "MOVED"; tile: TileRef }
  | { kind: "BLOCKED"; reason: "SOLID" | "OOB"; tile: TileRef }
  | { kind: "TRANSITION"; to: CanonicalMapId; tx: number; ty: number }
  | { kind: "PORTAL_BLOCKED"; flag: string; tile: TileRef }
  | { kind: "LEGACY" };

const DIR_DELTA: Record<RPGFacing, TileRef> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** Neighbor tile in a facing direction. */
export function facingTile(from: TileRef, dir: RPGFacing): TileRef {
  const d = DIR_DELTA[dir];
  return { x: from.x + d.x, y: from.y + d.y };
}

/**
 * Resolve one step from `from` toward `to` (usually an adjacent tile).
 * Non-adjacent targets are still resolved by destination content only —
 * callers pass the entered tile, so continuous movement and discrete tests
 * share one rule path.
 */
export function stepTile(args: {
  mapId: string;
  from: TileRef;
  to: TileRef;
  flags: Record<string, boolean>;
}): WorldStepOutcome {
  const map = getCanonicalMap(args.mapId);
  if (!map) return { kind: "LEGACY" };

  // 1. Portal trigger BEFORE solid collision (prototype tryMove order).
  const portal = findPortalAt(map, args.to.x, args.to.y);
  if (portal) {
    const r = resolvePortal(portal, args.flags);
    if (r.ok) return { kind: "TRANSITION", to: r.to, tx: r.tx, ty: r.ty };
    return { kind: "PORTAL_BLOCKED", flag: r.blockedByFlag, tile: args.from };
  }

  // 2. Bounds, then solid tiles.
  if (!inBounds(map, args.to.x, args.to.y)) {
    return { kind: "BLOCKED", reason: "OOB", tile: args.from };
  }
  if (isSolidTile(tileAt(map, args.to.x, args.to.y))) {
    return { kind: "BLOCKED", reason: "SOLID", tile: args.from };
  }

  return { kind: "MOVED", tile: args.to };
}

/** Interact outcome for the facing-adjacent tile. */
export type WorldInteractOutcome =
  | { kind: "CHEST_OPENED"; chestId: string; give: CanonicalChestReward; msg: string }
  | { kind: "CHEST_EMPTY"; chestId: string }
  | { kind: "NPC"; npcId: string }
  | { kind: "NOTHING" }
  | { kind: "LEGACY" };

/**
 * Resolve interaction with the facing-adjacent tile (prototype interact:
 * fx = tx+dx, fy = ty+dy). Chest idempotency via caller-held opened set.
 */
export function interactTile(args: {
  mapId: string;
  tile: TileRef;
  dir: RPGFacing;
  openedChests: ReadonlySet<string>;
}): WorldInteractOutcome {
  const map = getCanonicalMap(args.mapId);
  if (!map) return { kind: "LEGACY" };

  const t = facingTile(args.tile, args.dir);
  const chest = findChestAt(map, t.x, t.y);
  if (chest) {
    const r = openChest(chest, args.openedChests);
    if (r.opened) {
      return { kind: "CHEST_OPENED", chestId: r.chestId, give: r.give, msg: r.msg };
    }
    return { kind: "CHEST_EMPTY", chestId: r.chestId };
  }
  const npc = map.npcSpawns.find((n) => n.x === t.x && n.y === t.y);
  if (npc) return { kind: "NPC", npcId: npc.id };
  return { kind: "NOTHING" };
}
