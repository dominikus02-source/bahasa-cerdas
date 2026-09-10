/**
 * Portal model — Pendekar Suryakerta (P1E.2).
 *
 * Migrates the 4 prototype portals EXACTLY (source/position, destination,
 * flag requirement, trigger-before-solid precedence from tryMove).
 *
 * Semantics (prototype tryMove, verbatim behavior):
 * - Stepping onto a portal tile checks the portal FIRST (before enemy and
 *   before solid collision). Portal tiles (CV/GP) are SOLID tiles — without
 *   portal-first precedence the player could never trigger them.
 * - Ungated portal (no req) or satisfied req → transition.
 * - Gated portal with unmet req → blocked with "belum memanggil" notice,
 *   throttled by the caller (prototype: once per 1.5s).
 *
 * A transition is data ({ to, tx, ty }), never a renderer mutation — the
 * caller emits it as an RPGEvent (MAP_TRANSITION) and rebuilds world state
 * via world/map-loader.ts.
 */

import type { CanonicalMap, CanonicalMapId, CanonicalPortal } from "../data/world-maps";
import { WORLD_MAPS } from "../data/world-maps";

/** Result of resolving a portal step. */
export type PortalResolution =
  | { ok: true; to: CanonicalMapId; tx: number; ty: number }
  | { ok: false; blockedByFlag: string };

/** Portal at a tile, if the map defines one there. */
export function findPortalAt(map: CanonicalMap, x: number, y: number): CanonicalPortal | undefined {
  return map.portals.find((p) => p.x === x && p.y === y);
}

/**
 * Resolve a portal step against quest flags.
 * Mirrors `if(!p.req||G.flags[p.req])` — no invented gating logic.
 */
export function resolvePortal(
  portal: CanonicalPortal,
  flags: Record<string, boolean>,
): PortalResolution {
  if (!portal.req || flags[portal.req]) {
    return { ok: true, to: portal.to, tx: portal.tx, ty: portal.ty };
  }
  return { ok: false, blockedByFlag: portal.req };
}

/** Destination map must exist — invalid destinations are rejected. */
export function getPortalDestination(resolution: Extract<PortalResolution, { ok: true }>): CanonicalMap | undefined {
  return WORLD_MAPS[resolution.to];
}
