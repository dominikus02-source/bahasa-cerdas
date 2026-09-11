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
import { getCanonicalMap } from "../data/world-maps";
import { loadCanonicalMap, spawnPosition } from "../world/map-loader";
import { stepTile, interactTile } from "../world/world-step";
import { normToTile } from "../world/grid-coords";
import { checkCollision } from "../world/collision";
import { findNearestInteraction, processInteraction, type RPGInteractionResult } from "../world/interaction";
import type { RPGCameraState } from "../rendering/camera";
import { createCamera, followTarget, resizeCamera } from "../rendering/camera";
import type { CanvasRenderer } from "../rendering/canvas-renderer";
import { createCanvasRenderer } from "../rendering/canvas-renderer";
import { startRPGLoop, type RPGLoopHandle } from "./game-loop";
import type { RPGPersistence } from "./persistence";
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
  /** Initial map to load (canonical id like "map.desa", or placeholder default). */
  mapId?: string;
  /** Initial quest flags (quests/flags.ts vocabulary). */
  flags?: Record<string, boolean>;
  /** Already-opened chest ids (world/chest.ts idempotency). */
  openedChests?: string[];
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
  /** Write a quest flag through the authoritative state boundary. */
  setFlag(flag: string, value: boolean): void;
  /** Current quest flags (read-only snapshot). */
  getFlags(): Record<string, boolean>;
  /** Opened chest ids (read-only snapshot). */
  getOpenedChests(): string[];
  /** Persist map + position + flags + chests via the persistence boundary. */
  saveGame(persist: RPGPersistence): boolean;
  /** Subscribe to events. */
  on(event: string, handler: (data: unknown) => void): () => void;
  /** Stop the engine and clean up. */
  destroy(): void;
}

/** Create and start the RPG engine. */
export function createEngine(config: RPGEngineConfig): RPGEngine {
  const { container, playerId, playerName } = config;

  // ── Initialize State ──────────────────────────────────────────────
  // Canonical maps (P1E.2) load via map-loader; unknown ids keep the
  // Phase-0 placeholder world (regression-safe default).
  const canonicalStart = config.mapId ? getCanonicalMap(config.mapId) : undefined;
  const loadedWorld = canonicalStart ? loadCanonicalMap(canonicalStart.id) : null;

  const basePlayer = createDefaultPlayer(playerId, playerName);
  const player = loadedWorld && canonicalStart
    ? { ...basePlayer, position: spawnPosition(canonicalStart, canonicalStart.spawn.x, canonicalStart.spawn.y) }
    : basePlayer;
  const map = MAP_VILLAGE_SQUARE;

  const world: RPGWorldState = loadedWorld ?? {
    mapId: map.id,
    tiles: map.tiles,
    entities: map.entities,
    interactions: map.interactions,
  };

  // Map-side runtime state: quest flags + opened chests (authoritative,
  // server-owned in multiplayer; persisted via RPGMapSideState).
  let flags: Record<string, boolean> = { ...(config.flags ?? {}) };
  const openedChests = new Set<string>(config.openedChests ?? []);
  // Throttle for gated-portal notices (prototype: once per 1.5s equivalent —
  // here: emit only when the blocked signature changes).
  let lastPortalBlocked: string | null = null;

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
        // Step player in facing direction (continuous glide preserved)
        const stepped = stepPlayer(player, 1 / 60, true); // dt = 1 fixed timestep
        // Canonical maps: resolve the entered tile against tile rules
        // (portal-first, then solid — prototype tryMove order).
        const canon = getCanonicalMap(currentState.world.mapId);
        if (canon) {
          const fromTile = normToTile(canon, player.position);
          const toTile = normToTile(canon, stepped.position);
          if (!fromTile || !toTile) return currentState; // non-finite guard
          const outcome = stepTile({ mapId: canon.id, from: fromTile, to: toTile, flags });
          switch (outcome.kind) {
            case "TRANSITION": {
              const dest = getCanonicalMap(outcome.to);
              const nextWorld = loadCanonicalMap(outcome.to);
              if (!dest || !nextWorld) return currentState;
              eventBus.emit({
                type: "MAP_TRANSITION",
                playerId: currentState.session.playerId,
                fromMapId: canon.id,
                toMapId: dest.id,
                spawn: { x: outcome.tx, y: outcome.ty },
              });
              lastPortalBlocked = null;
              player = {
                ...player,
                position: spawnPosition(dest, outcome.tx, outcome.ty),
              };
              return { ...currentState, player, world: nextWorld };
            }
            case "PORTAL_BLOCKED": {
              const sig = `${canon.id}:${toTile.x},${toTile.y}:${outcome.flag}`;
              if (sig !== lastPortalBlocked) {
                lastPortalBlocked = sig;
                eventBus.emit({
                  type: "PORTAL_BLOCKED",
                  playerId: currentState.session.playerId,
                  mapId: canon.id,
                  x: toTile.x,
                  y: toTile.y,
                  requiredFlag: outcome.flag,
                });
              }
              return { ...currentState, player };
            }
            case "BLOCKED":
              lastPortalBlocked = null;
              return { ...currentState, player };
            case "MOVED":
              lastPortalBlocked = null;
              return { ...currentState, player: stepped };
            case "LEGACY":
              return { ...currentState, player: stepped };
          }
        }
        // Legacy placeholder path (pre-P1E.3 behavior, unchanged).
        const collision = checkCollision(currentState.world, stepped.position);
        player = { ...stepped, position: collision.position };
        return { ...currentState, player };
      }
      case "STOP_MOVE": {
        // No state change needed — just stops receiving MOVE commands
        return currentState;
      }
      case "INTERACT": {
        // Canonical maps: facing-adjacent tile (prototype interact order —
        // chest, then NPC). Reward keys stay canonical-verbatim here; the
        // inventory mapping is owned by a later phase (documented).
        const canon = getCanonicalMap(currentState.world.mapId);
        if (canon) {
          const tile = normToTile(canon, currentState.player.position);
          if (tile) {
            const out = interactTile({
              mapId: canon.id,
              tile,
              dir: currentState.player.facing,
              openedChests,
            });
            if (out.kind === "CHEST_OPENED") {
              openedChests.add(out.chestId);
              eventBus.emit({
                type: "INTERACTION",
                playerId: currentState.session.playerId,
                interactionId: `int.chest.${out.chestId}`,
                result: {
                  kind: "LOOT",
                  items: [],
                  canonicalGive: out.give,
                  rewardMapping: "DEFERRED",
                },
              });
            } else if (out.kind === "CHEST_EMPTY") {
              eventBus.emit({
                type: "INTERACTION",
                playerId: currentState.session.playerId,
                interactionId: `int.chest.${out.chestId}`,
                result: { kind: "CHEST_EMPTY", chestId: out.chestId },
              });
            } else if (out.kind === "NPC") {
              eventBus.emit({
                type: "INTERACTION",
                playerId: currentState.session.playerId,
                interactionId: `int.npc.${out.npcId}`,
                result: {
                  kind: "DIALOGUE",
                  npcId: out.npcId,
                  dialogueId: `dlg.${out.npcId}.intro`,
                },
              });
            }
          }
          return currentState;
        }
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

  function setFlag(flag: string, value: boolean): void {
    flags = { ...flags, [flag]: value };
  }

  function getFlags(): Record<string, boolean> {
    return { ...flags };
  }

  function getOpenedChests(): string[] {
    return [...openedChests];
  }

  function saveGame(persist: RPGPersistence): boolean {
    return persist.save({
      ...state,
      flags: { ...flags },
      openedChests: [...openedChests],
    });
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
    setFlag,
    getFlags,
    getOpenedChests,
    saveGame,
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
