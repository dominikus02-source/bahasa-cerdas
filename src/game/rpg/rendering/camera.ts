/**
 * Camera abstraction — transforms world coordinates to screen coordinates.
 *
 * The camera follows the player and never mutates world state.
 * World coordinates are NORMALIZED (0..1); the camera outputs screen pixels.
 *
 * Pipeline:
 *   World Coordinates → Camera Transform → Screen Coordinates
 *
 * The camera is CLIENT-OWNED (never broadcast in multiplayer).
 */

import type { RPGFacing, RPGVec2 } from "../core/constants";
import { DEFAULT_ZOOM, pxPerUnit, clampZoom } from "./world-scale";

/** Camera state — follows player with smooth interpolation. */
export interface RPGCameraState {
  /** Current camera position in normalized world space. */
  position: RPGVec2;
  /** Viewport size in CSS pixels. */
  viewportWidth: number;
  viewportHeight: number;
  /** Smoothing factor (0 = no follow, 1 = instant snap). */
  smoothing: number;
  /** Logical zoom (Visual Bible range 0.8–1.25, default 1.0). */
  zoom: number;
}

/** Create a camera centered on a position. */
export function createCamera(
  position: RPGVec2,
  viewportWidth: number,
  viewportHeight: number,
): RPGCameraState {
  return {
    position: { ...position },
    viewportWidth,
    viewportHeight,
    smoothing: 0.1, // Smooth follow
    zoom: DEFAULT_ZOOM,
  };
}

/**
 * Update camera to follow a target position (e.g., player).
 * Returns new camera state (immutable update).
 */
export function followTarget(
  camera: RPGCameraState,
  target: RPGVec2,
): RPGCameraState {
  const dx = target.x - camera.position.x;
  const dy = target.y - camera.position.y;
  return {
    ...camera,
    position: {
      x: camera.position.x + dx * camera.smoothing,
      y: camera.position.y + dy * camera.smoothing,
    },
  };
}

/**
 * Camera follow with a restrained look-ahead.
 *
 * The look-ahead is presentation-only: gameplay position remains unchanged.
 * It gives exploration/combat more spatial awareness without the aggressive
 * camera swing common to action games.
 */
export function followTargetWithFeel(
  camera: RPGCameraState,
  target: RPGVec2,
  facing: RPGFacing,
  mapWidthTiles: number,
  mapHeightTiles: number,
): RPGCameraState {
  const leadTiles = 0.75;
  const leadX = leadTiles / Math.max(1, mapWidthTiles);
  const leadY = leadTiles / Math.max(1, mapHeightTiles);
  const lead = {
    x: facing === "left" ? -leadX : facing === "right" ? leadX : 0,
    y: facing === "up" ? -leadY : facing === "down" ? leadY : 0,
  };
  const framed = {
    x: Math.min(1, Math.max(0, target.x + lead.x)),
    y: Math.min(1, Math.max(0, target.y + lead.y)),
  };
  return followTarget(camera, framed);
}

/**
 * Convert normalized world coordinates to screen pixels.
 * Center of camera = center of viewport.
 *
 * LEGACY contract (pre-zoom): world unit == viewport width. Pinned by
 * existing tests — do not change. New code uses worldToScreenScaled below.
 */
export function worldToScreen(
  world: RPGVec2,
  camera: RPGCameraState,
): { x: number; y: number } {
  return {
    x: (world.x - camera.position.x) * camera.viewportWidth + camera.viewportWidth / 2,
    y: (world.y - camera.position.y) * camera.viewportHeight + camera.viewportHeight / 2,
  };
}

/**
 * CANONICAL world→screen contract (P2.0A): normalized world → camera
 * transform → zoom → screen pixels. World scale is authoritative
 * (64 logical px per tile × map tile counts); screens scale around it —
 * never the reverse. Feet-origin sprites anchor their bottom-center to the
 * returned point (see rendering/sprite-math.ts).
 */
export function worldToScreenScaled(
  world: RPGVec2,
  camera: RPGCameraState,
  mapWidthTiles: number,
  mapHeightTiles: number,
): { x: number; y: number } {
  const zoom = camera.zoom ?? DEFAULT_ZOOM;
  const sx = pxPerUnit(mapWidthTiles, zoom);
  const sy = pxPerUnit(mapHeightTiles, zoom);
  return {
    x: (world.x - camera.position.x) * sx + camera.viewportWidth / 2,
    y: (world.y - camera.position.y) * sy + camera.viewportHeight / 2,
  };
}

/**
 * Convert screen pixels to normalized world coordinates using the canonical
 * zoomed world scale. This is the exact inverse of worldToScreenScaled.
 */
export function screenToWorldScaled(
  screen: { x: number; y: number },
  camera: RPGCameraState,
  mapWidthTiles: number,
  mapHeightTiles: number,
): RPGVec2 {
  const zoom = camera.zoom ?? DEFAULT_ZOOM;
  const sx = pxPerUnit(mapWidthTiles, zoom);
  const sy = pxPerUnit(mapHeightTiles, zoom);
  return {
    x: (screen.x - camera.viewportWidth / 2) / sx + camera.position.x,
    y: (screen.y - camera.viewportHeight / 2) / sy + camera.position.y,
  };
}

/**
 * Legacy screen→world conversion retained for pre-P2.0 callers.
 * New interaction code should use screenToWorldScaled so the map scale is
 * explicit and the result is guaranteed to invert worldToScreenScaled.
 */
export function screenToWorld(
  screen: { x: number; y: number },
  camera: RPGCameraState,
): RPGVec2 {
  return {
    x: (screen.x - camera.viewportWidth / 2) / camera.viewportWidth + camera.position.x,
    y: (screen.y - camera.viewportHeight / 2) / camera.viewportHeight + camera.position.y,
  };
}

/** Resize camera viewport. */
export function resizeCamera(
  camera: RPGCameraState,
  width: number,
  height: number,
): RPGCameraState {
  return { ...camera, viewportWidth: width, viewportHeight: height };
}

/** Set logical zoom, clamped to the Visual Bible range (0.8–1.25). */
export function setZoom(camera: RPGCameraState, zoom: number): RPGCameraState {
  return { ...camera, zoom: clampZoom(zoom) };
}
