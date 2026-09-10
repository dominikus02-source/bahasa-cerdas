/**
 * Game engine — the composition root for the RPG.
 *
 * This module wires together:
 * - Game loop (fixed timestep)
 * - Input → Command pipeline
 * - Collision detection
 * - Interaction system
 * - State updates (movement, progression)
 * - Rendering (camera + canvas)
 *
 * The engine is framework-agnostic: it doesn't know about React.
 * React components create/destroy the engine as a side effect.
 *
 * Pipeline:
 *   Input → Command → Collision Check → State Change → Event → Renderer
 */

import type { RPGGameState } from "./game-state";
import { createInitialGameState } from "./game-state";
import type { RPGCommand, RPGInputSource } from "./input";
import type { RPGPlayerState } from "../player/player-state";
import { createDefaultPlayer } from "../player/player-state";
import { stepPlayer, faceDirection } from "../player/movement";
import { grantXp } from "../player/progression";
import type { RPGWorldState } from "../world/world-state";
import { MAP_VILLAGE_SQUARE } from "../data/maps";
import { checkCollision } from "../world/collision";
import { findNearestInteraction, processInteraction, type RPGInteractionResult } from "../world/interaction";
import type { RPGCameraState } from "../rendering/camera";
import { createCamera, followTarget, resizeCamera } from "../rendering/camera";
import type { CanvasRenderer } from "../rendering/canvas-renderer";
import { createCanvasRenderer } from "../rendering/canvas-renderer";
import { startRPGLoop, type RPGLoopHandle } from "./game-loop";
import type { RPGEventBus } from "../multiplayer/events";
import { createEventBus } from "../multiplayer/events";

/** Engine configuration. */
export interface RPGEngineConfig {
  /** Container element for canvas. */
  container: HTMLDivElement;
  /** Player ID (from session). */
  playerId: string;
  /** Player display name. */
  playerName: string;
  /** Initial map to load. */
  mapId?: string;
}

/** The running engine instance. */
export interface RPGEngine {
  /** Current game state (read-only for external consumers). */
  getState(): RPGGameState;
  /** Current camera state. */
  getCamera(): RPGCameraState;
  /** Check if player is near an interactable. */
  isNearInteractable(): boolean;
  /** Trigger interaction with nearest object. */
  interact(): RPGInteractionResult;
  /** Subscribe to events. */
  on(event: string, handler: (data: unknown) => void): () => void;
  /** Stop the engine and clean up. */
  destroy(): void;
}

/** Create and start the RPG engine. */
export function createEngine(config: RPGEngineConfig): RPGEngine {
  const { container, playerId, playerName } = config;

  // ── Initialize State ──────────────────────────────────────────────
  const player = createDefaultPlayer(playerId, playerName);
  const map = MAP_VILLAGE_SQUARE;

  const world: RPGWorldState = {
    mapId: map.id,
    tiles: map.tiles,
    entities: map.entities,
    interactions: map.interactions,
  };

  let state: RPGGameState = {
    ...createInitialGameState(playerId),
    player,
    world,
  };

  // ── Initialize Camera ─────────────────────────────────────────────
  const rect = container.getBoundingClientRect();
  let camera = createCamera(player.position, rect.width, rect.height);

  // ── Initialize Renderer ───────────────────────────────────────────
  const renderer: CanvasRenderer = createCanvasRenderer(container);

  // ── Initialize Event Bus ──────────────────────────────────────────
  const eventBus: RPGEventBus = createEventBus();

  // ── Input Source (placeholder — keyboard adapter wired in component)
  let inputSource: RPGInputSource = { drain: () => [] };

  /** Set the input source (called from React component). */
  function setInputSource(source: RPGInputSource) {
    inputSource = source;
  }

  // ── State Updates ─────────────────────────────────────────────────

  /** Process a single command and return new state. */
  function processCommand(
    currentState: RPGGameState,
    command: RPGCommand,
  ): RPGGameState {
    switch (command.type) {
      case "MOVE": {
        // Update facing if direction changed
        let player = currentState.player;
        if (player.facing !== command.dir) {
          player = faceDirection(player, command.dir);
        }
        // Step player in facing direction
        const stepped = stepPlayer(player, 1 / 60, true); // dt = 1 fixed timestep
        // Apply collision detection
        const collision = checkCollision(currentState.world, stepped.position);
        player = { ...stepped, position: collision.position };
        return { ...currentState, player };
      }
      case "STOP_MOVE": {
        // No state change needed — just stops receiving MOVE commands
        return currentState;
      }
      case "INTERACT": {
        // Handle interaction
        const interaction = findNearestInteraction(
          currentState.world,
          currentState.player.position,
        );
        if (interaction) {
          const result = processInteraction(interaction, currentState.player.inventory);
          // Emit event for UI to handle
          eventBus.emit({
            type: "INTERACTION",
            playerId: currentState.session.playerId,
            interactionId: interaction.id,
            result,
          });
        }
        return currentState;
      }
      default:
        return currentState;
    }
  }

  // ── Game Loop ─────────────────────────────────────────────────────

  let moving = false;
  let lastDirection: "up" | "down" | "left" | "right" = "down";

  const loop: RPGLoopHandle = startRPGLoop(
    // Update (fixed timestep)
    (dtMs: number) => {
      // Drain input commands
      const commands = inputSource.drain();

      // Process commands
      for (const cmd of commands) {
        if (cmd.type === "MOVE" && cmd.playerId === playerId) {
          moving = true;
          lastDirection = cmd.dir;
        }
        if (cmd.type === "STOP_MOVE" && cmd.playerId === playerId) {
          moving = false;
        }
        state = processCommand(state, cmd);
      }

      // Apply continuous movement if moving
      if (moving) {
        const moveCmd: RPGCommand = {
          type: "MOVE",
          playerId,
          dir: lastDirection,
        };
        state = processCommand(state, moveCmd);
      }

      // Update camera to follow player
      camera = followTarget(camera, state.player.position);
    },
    // Render (every frame)
    () => {
      renderer.render(state, camera);
    },
  );

  // ── Public API ────────────────────────────────────────────────────

  function getState(): RPGGameState {
    return state;
  }

  function getCamera(): RPGCameraState {
    return camera;
  }

  function isNearInteractable(): boolean {
    return findNearestInteraction(state.world, state.player.position) !== null;
  }

  function interact(): RPGInteractionResult {
    const interaction = findNearestInteraction(
      state.world,
      state.player.position,
    );
    if (!interaction) {
      return {
        success: false,
        interaction: null,
        type: "NONE",
        payload: { kind: "NONE" },
      };
    }
    return processInteraction(interaction, state.player.inventory);
  }

  function on(event: string, handler: (data: unknown) => void): () => void {
    return eventBus.subscribe((evt) => {
      if (evt.type === event) {
        handler(evt);
      }
    });
  }

  function destroy() {
    loop.stop();
    renderer.dispose();
  }

  return {
    getState,
    getCamera,
    isNearInteractable,
    interact,
    on,
    destroy,
    // Expose for keyboard adapter
    _setInputSource: setInputSource,
    _getInputSource: () => inputSource,
  } as RPGEngine & {
    _setInputSource: (source: RPGInputSource) => void;
    _getInputSource: () => RPGInputSource;
  };
}
