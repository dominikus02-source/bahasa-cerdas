/**
 * Animation contract — Pendekar Suryakerta (P2.0A).
 *
 * Data-driven playback: clips carry frames + timing (from asset metadata
 * when available, from the Arga contract otherwise); frameAt() resolves the
 * frame for an elapsed time with zero allocation beyond the return. Side
 * facing mirrors at draw time (bible: side mirrors left/right at load).
 * 12-fps feel via ~80ms frame rhythm (FRAME_MS).
 *
 * Pure + deterministic. No DOM, no RNG.
 */

import { FRAME_MS } from "./world-scale";

export interface AnimationClip {
  state: string;
  frames: number;
  frameDurationMs: number;
  loop: boolean;
}

/** Frame index for elapsed ms since the state started. */
export function frameAt(clip: AnimationClip, elapsedMs: number): number {
  if (clip.frames <= 0) return 0;
  const t = Math.max(0, elapsedMs);
  const idx = Math.floor(t / Math.max(1, clip.frameDurationMs));
  if (clip.loop) return idx % clip.frames;
  return Math.min(idx, clip.frames - 1);
}

/** True when a non-looping clip has finished. */
export function clipFinished(clip: AnimationClip, elapsedMs: number): boolean {
  if (clip.loop) return false;
  return elapsedMs >= clip.frames * Math.max(1, clip.frameDurationMs);
}

/** Locomotion selection: idle below threshold, walk, run at speed. */
export function selectLocomotion(moving: boolean, runThreshold = 1.5, speed = 1): "idle" | "walk" | "run" {
  if (!moving) return "idle";
  return speed >= runThreshold ? "run" : "walk";
}

/** Mirror a side-facing frame for leftward travel (bible side-mirror rule). */
export function mirrorForDirection(facing: string): boolean {
  return facing === "left";
}

/** Default clip from frame count (contract/metadata shape). */
export function clipFor(state: string, frames: number, loop = true, frameDurationMs: number = FRAME_MS): AnimationClip {
  return { state, frames, frameDurationMs, loop };
}
