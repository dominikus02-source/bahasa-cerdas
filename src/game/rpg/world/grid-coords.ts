/**
 * Canonical coordinate translation boundary — Pendekar Suryakerta (P1E.2).
 *
 * THE single place where grid (integer tile) coordinates convert to/from
 * normalized world coordinates (0..1). Rules:
 *
 * - Gameplay collision uses TILE coordinates (world/tiles.ts).
 * - The renderer consumes NORMALIZED coordinates (core/constants.ts).
 * - The camera is presentation-only and never converts grids.
 * - No other module may implement tile<->norm math (no duplicate
 *   conversions, no ad-hoc multiplication in gameplay code).
 *
 * KNOWN PRE-EXISTING EXCEPTION (Visual Bible §25 R1, out of scope here):
 * rendering/canvas-renderer.ts stretches tiles to the viewport
 * (`tileW = width / tiles.width`). That renderer math is viewport scaling,
 * not gameplay coordinates, and is migrated at sprite integration — not here.
 */

import type { RPGVec2 } from "../core/constants";
import type { CanonicalMap } from "../data/world-maps";
import type { TileRef } from "./tiles";

/** Tile center in normalized world space. Deterministic. */
export function tileToNorm(map: CanonicalMap, x: number, y: number): RPGVec2 {
  return { x: (x + 0.5) / map.width, y: (y + 0.5) / map.height };
}

/** Normalized position to containing tile. Returns null when NaN/Infinity. */
export function normToTile(map: CanonicalMap, pos: RPGVec2): TileRef | null {
  if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return null;
  return { x: Math.floor(pos.x * map.width), y: Math.floor(pos.y * map.height) };
}

/** True for finite normalized positions (guards NaN/Infinity poisoning). */
export function isValidWorldPos(pos: RPGVec2): boolean {
  return Number.isFinite(pos.x) && Number.isFinite(pos.y);
}
