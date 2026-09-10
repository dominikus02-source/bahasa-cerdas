/**
 * Keyboard input adapter — converts keyboard events to RPGCommand.
 *
 * Pipeline:
 *   Keyboard Event → Key State → RPGCommand → Game Logic
 *
 * The adapter maintains key state and produces commands on each game loop tick.
 * This decouples input device from game logic.
 *
 * Supports:
 * - Arrow keys (↑↓←→)
 * - WASD keys
 * - Clean state on keyup (STOP_MOVE when all keys released)
 */

import type { RPGInputSource, RPGCommand } from "./input";
import type { RPGFacing } from "./constants";

/** Key state tracker. */
interface KeyState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/** Create a keyboard input source. */
export function createKeyboardInputSource(
  playerId: string,
): RPGInputSource & {
  attach(): void;
  detach(): void;
} {
  const keys: KeyState = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  let pendingCommands: RPGCommand[] = [];

  /** Map keyboard key to direction. */
  function keyToDirection(key: string): RPGFacing | null {
    switch (key) {
      case "ArrowUp":
      case "w":
      case "W":
        return "up";
      case "ArrowDown":
      case "s":
      case "S":
        return "down";
      case "ArrowLeft":
      case "a":
      case "A":
        return "left";
      case "ArrowRight":
      case "d":
      case "D":
        return "right";
      default:
        return null;
    }
  }

  /** Update key state and emit commands. */
  function handleKeyDown(e: KeyboardEvent) {
    const dir = keyToDirection(e.key);
    if (!dir) return;

    // Prevent default for arrow keys (page scroll)
    if (e.key.startsWith("Arrow")) {
      e.preventDefault();
    }

    // Only emit command if this is a new press
    if (!keys[dir]) {
      keys[dir] = true;
      pendingCommands.push({ type: "MOVE", playerId, dir });
    }
  }

  function handleKeyUp(e: KeyboardEvent) {
    const dir = keyToDirection(e.key);
    if (!dir) return;

    keys[dir] = false;

    // If no keys are pressed, emit STOP_MOVE
    if (!keys.up && !keys.down && !keys.left && !keys.right) {
      pendingCommands.push({ type: "STOP_MOVE", playerId });
    }
  }

  /** Attach keyboard listeners. */
  function attach() {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
  }

  /** Detach keyboard listeners. */
  function detach() {
    window.removeEventListener("keydown", handleKeyDown);
    window.removeEventListener("keyup", handleKeyUp);
  }

  /** Drain pending commands (called by game loop). */
  function drain(): RPGCommand[] {
    return pendingCommands.splice(0, pendingCommands.length);
  }

  return {
    attach,
    detach,
    drain,
  };
}
