/**
 * Minimal fixed-timestep game loop.
 *
 * Deliberately framework- and DOM-agnostic: it only needs a timing callback,
 * so the same loop runs in the browser, in Node-based tests, and later on an
 * authoritative server. Rendering is an optional callback — the loop never
 * touches canvas/DOM itself (that is `rendering/renderer.ts`).
 *
 * PHASE 0 scope: accumulator loop with explicit start/stop. No interpolation,
 * no rollback — added when multiplayer makes them necessary.
 */

import { RPG_FIXED_TIMESTEP_MS, RPG_MAX_STEPS_PER_FRAME } from "./constants";

export type RPGLoopUpdate = (fixedDtMs: number) => void;
export type RPGLoopRender = () => void;

export interface RPGLoopHandle {
  stop(): void;
  /** True while the loop is running. */
  readonly isRunning: boolean;
}

/**
 * Runs `onUpdate` in fixed timestep steps and `onRender` once per animation
 * frame (or once per timer tick in non-DOM environments).
 */
export function startRPGLoop(
  onUpdate: RPGLoopUpdate,
  onRender: RPGLoopRender | null,
  /** Injectable clock for tests; defaults to browser/Node timers. */
  schedule: (cb: () => void, delayMs: number) => () => void = (cb, d) => {
    const t = setInterval(cb, d);
    return () => clearInterval(t);
  },
): RPGLoopHandle {
  let running = true;
  let last = now();
  let acc = 0;

  const cancel = schedule(tick, RPG_FIXED_TIMESTEP_MS);

  function now(): number {
    return typeof performance !== "undefined" ? performance.now() : Date.now();
  }

  function tick(): void {
    if (!running) return;

    const time = now();
    acc += Math.min(time - last, RPG_FIXED_TIMESTEP_MS * RPG_MAX_STEPS_PER_FRAME);
    last = time;

    let steps = 0;
    while (acc >= RPG_FIXED_TIMESTEP_MS && steps < RPG_MAX_STEPS_PER_FRAME) {
      onUpdate(RPG_FIXED_TIMESTEP_MS);
      acc -= RPG_FIXED_TIMESTEP_MS;
      steps += 1;
    }

    onRender?.();
  }

  return {
    stop(): void {
      running = false;
      cancel();
    },
    get isRunning(): boolean {
      return running;
    },
  };
}
