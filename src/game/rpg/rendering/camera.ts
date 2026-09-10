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

import type { RPGVec2 } from "../core/constants";

/** Camera state — follows player with smooth interpolation. */
export interface RPGCameraState {
  /** Current camera position in normalized world space. */
  position: RPGVec2;
  /** Viewport size in CSS pixels. */
  viewportWidth: number;
  viewportHeight: number;
  /** Smoothing factor (0 = no follow, 1 = instant snap). */
  smoothing: number;
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
 * Convert normalized world coordinates to screen pixels.
 * Center of camera = center of viewport.
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
 * Convert screen pixels to normalized world coordinates.
 * Useful for click/touch interaction.
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
