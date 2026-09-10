/**
 * Input → Command boundary.
 *
 * Pipeline (multiplayer-ready, see README.md):
 *
 *   Input (device-specific, client-owned)
 *     → Command (serializable, unambiguous)
 *       → Authoritative game logic
 *         → State change
 *           → Event (broadcast)
 *             → Client rendering
 *
 * Raw intents may originate from keyboard, touch, or UI buttons. Commands are
 * what the authoritative layer consumes — they carry intent + target, never
 * rendering info. This is why the same command set works locally today and
 * over the network later.
 */

import type { RPGId, RPGFacing } from "./constants";

export type RPGCommand =
  | { type: "MOVE"; playerId: RPGId; dir: RPGFacing }
  | { type: "STOP_MOVE"; playerId: RPGId }
  | { type: "INTERACT"; playerId: RPGId; targetId?: RPGId }
  | { type: "ATTACK"; playerId: RPGId; targetId: RPGId; skillId: RPGId }
  | { type: "USE_ITEM"; playerId: RPGId; itemId: RPGId }
  | { type: "EQUIP"; playerId: RPGId; itemId: RPGId }
  | { type: "OPEN_DIALOGUE"; playerId: RPGId; npcId: RPGId }
  | { type: "SUBMIT_LEARNING_ANSWER"; playerId: RPGId; challengeId: RPGId; answer: string };

/** Anything that can produce commands (keyboard adapter, touch stick, UI tap). */
export interface RPGInputSource {
  /** Poll/pull pending commands; the game loop drains this each tick. */
  drain(): RPGCommand[];
}

/** Trivial in-memory source for tests and UI-button wiring. */
export function createMemoryInputSource(): RPGInputSource & { push(cmd: RPGCommand): void } {
  const queue: RPGCommand[] = [];
  return {
    push(cmd: RPGCommand): void {
      queue.push(cmd);
    },
    drain(): RPGCommand[] {
      return queue.splice(0, queue.length);
    },
  };
}
