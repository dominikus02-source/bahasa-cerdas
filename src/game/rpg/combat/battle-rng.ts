/**
 * Seeded deterministic RNG for combat — Pendekar Suryakerta (P1.4B).
 *
 * Same mix family as the P1E.2 map scatter (mulberry32), repackaged as an
 * explicit immutable counter: every draw returns a new RNG value, so
 * `same seed + same draw order = same sequence`, with no hidden global state
 * and no Math.random() anywhere in battle resolution.
 *
 * Draw order is fixed by the resolver (variance → crit → special → flee →
 * drops, in action order), which is what makes full-battle replays identical.
 * The seed is supplied per battle (server-issued in multiplayer); battleId is
 * correlation only and NEVER feeds draws.
 */

/** Immutable RNG cursor. */
export interface BattleRng {
  seed: number;
  /** Current mixer state (evolves per draw). */
  state: number;
  /** Draws consumed so far (audit/replay). */
  count: number;
}

/** Initialize a cursor from a battle seed. */
export function createBattleRng(seed: number): BattleRng {
  return { seed: seed | 0, state: seed | 0, count: 0 };
}

function mixStep(a: number): number {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return t ^ (t >>> 14);
}

/** Draw a float in [0, 1). Pure — input cursor is never mutated. */
export function rngNext(rng: BattleRng): { value: number; rng: BattleRng } {
  const state = mixStep(rng.state);
  return {
    value: (state >>> 0) / 4294967296,
    rng: { seed: rng.seed, state, count: rng.count + 1 },
  };
}
