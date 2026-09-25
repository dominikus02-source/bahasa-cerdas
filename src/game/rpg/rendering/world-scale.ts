/**
 * Canonical world scale — Pendekar Suryakerta visual foundation (P2.0A).
 *
 * SINGLE source for every visual size constant (Visual Bible §14, §18).
 * Gameplay coordinates stay normalized (core/constants.ts) and gameplay
 * collision stays tile/grid-based (world/tiles.ts) — this module converts
 * those truths to pixels and NEVER feeds sizes back into gameplay.
 *
 * - LOGICAL_TILE_PX: 40×40 per tile at zoom 1 (world-authoritative unit).
 * - ART_SCALE: 2× (tiles ship around 80×80; hero canvas 160×160 = 80 logical).
 * - FRAME_MS: 80ms rhythm (12-fps feel).
 * - ZOOM: fixed logical zoom, range 0.8 (desktop wide) – 1.25 (mobile).
 */

export const LOGICAL_TILE_PX = 40;
export const ART_SCALE = 2;
export const ART_TILE_PX = LOGICAL_TILE_PX * ART_SCALE;
export const HERO_CANVAS_PX = 160;
export const HERO_LOGICAL_PX = HERO_CANVAS_PX / ART_SCALE;
export const FRAME_MS = 80;
export const MIN_ZOOM = 0.8;
export const MAX_ZOOM = 1.25;
export const DEFAULT_ZOOM = 1.0;

/** Clamp a zoom value into the bible range. */
export function clampZoom(zoom: number): number {
  if (!Number.isFinite(zoom)) return DEFAULT_ZOOM;
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** Pixels per normalized world unit along one axis. */
export function pxPerUnit(mapTiles: number, zoom: number): number {
  return LOGICAL_TILE_PX * clampZoom(zoom) * mapTiles;
}
