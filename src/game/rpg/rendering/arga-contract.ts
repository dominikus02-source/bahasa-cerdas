/**
 * Arga production asset contract — Pendekar Suryakerta (P2.0A).
 *
 * STATUS: CONTRACT ONLY — no production Arga artwork exists in the repo.
 * This file fixes WHAT the art delivery must contain (states, directions,
 * frame counts per Visual Bible §14) so validation + runtime wiring can be
 * built and tested BEFORE art lands. It contains zero pixel data and must
 * never be mistaken for the asset itself.
 *
 * Naming (Bible §19): sheet-char-arga-<state>-<dir>.png + sidecar JSON.
 * Dirs: down/up/side (side mirrors for left/right at load).
 */

import { FRAME_MS, HERO_CANVAS_PX } from "./world-scale";

export type ArgaState =
  | "idle" | "walk" | "run" | "attack" | "skill"
  | "hurt" | "defeat" | "victory" | "interact";

export type ArgaDir = "down" | "up" | "side";

/** Expected frame counts per state (Visual Bible §14 table). */
export const ARGA_FRAMES: Record<ArgaState, number> = {
  idle: 6,
  walk: 8,
  run: 10,
  attack: 6,
  skill: 8,
  hurt: 4,
  defeat: 8,
  victory: 8,
  interact: 6,
};

/** Directions authored per state (locomotion 4-dir with side mirror). */
export function argaDirsFor(state: ArgaState): ArgaDir[] {
  switch (state) {
    case "idle":
      // P2.4C: idle-side added per founder directive (true profile, not mirror)
      return ["down", "side"];
    case "walk":
    case "run":
    case "attack":
      return ["down", "up", "side"];
    default:
      return ["down"];
  }
}

/** Canonical asset key for an Arga sheet (Bible §19). */
export function argaAssetKey(state: ArgaState, dir: ArgaDir): string {
  return `sheet-char-arga-${state}-${dir}`;
}

/** All expected sheet keys for a complete Arga delivery. */
export function expectedArgaSheets(): string[] {
  const out: string[] = [];
  (Object.keys(ARGA_FRAMES) as ArgaState[]).forEach((state) => {
    for (const dir of argaDirsFor(state)) out.push(argaAssetKey(state, dir));
  });
  return out;
}

export const ARGA_CANVAS_PX = HERO_CANVAS_PX;
export const ARGA_FRAME_MS = FRAME_MS;
/** Feet origin bottom-center (bible, non-negotiable). */
export const ARGA_ORIGIN = { x: 0.5, y: 1.0 } as const;
