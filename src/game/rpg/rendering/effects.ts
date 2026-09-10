/**
 * Visual effects boundary (client-owned presentation).
 *
 * PHASE 0: lifecycle contract for transient effects (hits, sparkles, level-up
 * flashes). Effects are spawned from events, never from state directly, so
 * they remain purely presentational in multiplayer.
 */

import type { RPGId } from "../core/constants";
import type { RPGEvent } from "../multiplayer/events";

export interface RPGVisualEffect {
  id: RPGId;
  kind: "HIT" | "HEAL" | "LEVEL_UP" | "QUEST_COMPLETE";
  /** Normalized world position. */
  x: number;
  y: number;
  /** Remaining lifetime in ms. */
  ttlMs: number;
}

/** Effect spawn rules driven by events (client-owned). */
export function effectsForEvent(event: RPGEvent): RPGVisualEffect[] {
  switch (event.type) {
    case "BATTLE_END":
      return [];
    case "LEARNING_RESULT":
      return event.correct
        ? [{ id: crypto.randomUUID(), kind: "LEVEL_UP" as const, x: 0.5, y: 0.4, ttlMs: 600 }]
        : [];
    default:
      return [];
  }
}
