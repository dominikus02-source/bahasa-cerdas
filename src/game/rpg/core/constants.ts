/**
 * Pendekar Suryakerta — Legenda Nusantara
 * Core engine constants and shared primitives.
 *
 * STANDALONE RPG. Do not import from Kuis Tempur or any existing game module;
 * the dependency direction is one-way: this package must never be imported by
 * existing games, and this package must not import them.
 *
 * PHASE 0 boundary: only engine-level vocabulary lives here. Game data belongs
 * in `data/`, runtime state in the owning subsystem.
 */

/** Universal identifier for RPG entities (players, enemies, NPCs, items). */
export type RPGId = string;

/**
 * Numeric position in NORMALIZED world space (0..1 on both axes).
 *
 * The foundation standardizes on normalized coordinates so the same world data
 * maps cleanly to any viewport/orientation; a camera later converts world
 * space → screen space. Pixel math stays out of state and logic.
 */
export interface RPGVec2 {
  x: number;
  y: number;
}

export const RPG_WORLD_BOUNDS: { min: RPGVec2; max: RPGVec2 } = {
  min: { x: 0, y: 0 },
  max: { x: 1, y: 1 },
};

/** Face direction for characters in a 2D top-down/side world. */
export type RPGFacing = "up" | "down" | "left" | "right";

/** High-level simulation modes the game loop can run in. */
export type RPGGameMode = "ADVENTURE" | "BATTLE" | "DIALOGUE";

/** Logical layer used by the renderer to order draw calls. */
export type RPGLayer =
  | "TERRAIN"
  | "GROUND_DECOR"
  | "BEHIND_ENTITIES"
  | "ENTITIES"
  | "FRONT_OF_ENTITIES"
  | "OVERLAY";

/** Deterministic fixed timestep for the game loop (ms). */
export const RPG_FIXED_TIMESTEP_MS = 1000 / 60;

/** Cap on accumulated steps per frame to avoid spiral-of-death after tab stalls. */
export const RPG_MAX_STEPS_PER_FRAME = 5;

/** Guard for normalized coordinate writes. */
export function clampToWorld(v: RPGVec2): RPGVec2 {
  return {
    x: Math.min(RPG_WORLD_BOUNDS.max.x, Math.max(RPG_WORLD_BOUNDS.min.x, v.x)),
    y: Math.min(RPG_WORLD_BOUNDS.max.y, Math.max(RPG_WORLD_BOUNDS.min.y, v.y)),
  };
}
