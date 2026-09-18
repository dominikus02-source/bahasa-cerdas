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
import { grantXp, applyLevelGrowth } from "../player/progression";
import type { RPGWorldState } from "../world/world-state";
import { MAP_VILLAGE_SQUARE } from "../data/maps";
import { getCanonicalMap, RPG_TILES } from "../data/world-maps";
import { stepTile, interactTile, facingTile } from "../world/world-step";
import { tileAt } from "../world/tiles";
import {
  startServerBattle,
  startServerLearning,
  submitServerLearningAnswer,
  submitServerBattleAction,
  createServerRewardReceipt,
  settleServerReward,
  mutateQuestState,
  generateRequestKey,
  fetchStateProjection,
  fetchServerWithRetry,
  projectionToBattleState,
  type ServerApiError,
} from "../../../../lib/game/rpg/server-api-client";
import {
  classifyError,
  PendingServerCalls,
  NetworkError,
  type ServerCallStatus,
} from "../../../../lib/game/rpg/network-resilience";
import { loadCanonicalMap, spawnPosition, enemySpawnsOf, canonicalTileId } from "../world/map-loader";
import {
  buildEncounterTable,
  findEncounterAt,
  markDead,
  tickRespawns,
  type LiveEnemy,
} from "../combat/encounter";
import {
  startBattle,
  playerAct,
  enemyAct,
  escapeBattle,
  toBattleResult,
  hashBattleId,
} from "../combat/battle-core";
import type { RPGBattleState, RPGBattlePhase } from "../combat/battle-state";
import { applyVictory, applyDefeat } from "../combat/battle-apply";
import { EQUIPMENT } from "../data/equipment";
import { normToTile } from "../world/grid-coords";
import {
  createGoldState,
  creditGold,
  applyShopPurchase,
  applyForgeUpgrade,
  INITIAL_GOLD,
  type GoldState,
  type GoldLedgerEntry,
} from "../economy/economy";
import {
  applyChestRewards,
  applyConsume,
  fishSellValue,
  removeAllFish,
  type EquipmentIntent,
} from "../economy/rewards";
import { addItem } from "../player/inventory";
import {
  startDialogue,
  advanceDialogue,
  collectSignals,
  currentNode,
  selectDialogueStart,
  type DialogueSession,
} from "../interaction/dialogue";
import { getDialogueTree, NPC_ROUTING } from "../data/dialogues";
import { getShopMenu, validatePurchase, type ShopSession } from "../interaction/shop";
import { validateForge, type ForgeSession } from "../interaction/forge";
import {
  triggerBattleLearning,
  submitBattleAnswer,
  type LearningEncounter,
} from "../learning/learning-runtime";
import type { SoalLike, ResolvedChallenge, LearningChallenge } from "../learning/rpg-challenge";
import { toClientChallenge } from "../learning/rpg-challenge";
import type { LearningTriggerPolicy } from "../learning/learning-trigger";
import {
  createQuestLineState,
  isValidQuestTransition,
  type QuestLineState,
} from "../quests/quest-engine";
import { QUEST_FLAG_NAMES } from "../quests/flags";
import { canonicalItemById } from "../data/items";
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
  /** Boss instance ids already defeated (persisted, never respawn). */
  deadBossIds?: string[];
  /** Unclaimed gold intents carried for the future economy phase. */
  goldIntents?: Array<{ battleId: string; amount: number }>;
  /** Spendable gold override (default INITIAL_GOLD for fresh players). */
  gold?: number;
  /** Restored picked golden-flower tiles (default none). */
  pickedGe?: string[];
  /**
   * Restored player slice (P1.9C save/load): stats, progression, inventory,
   * equipment, position, facing. Absent = fresh default player. Each field
   * optional; missing pieces fall back to defaults (additive, no migration).
   */
  initialPlayer?: {
    stats?: { hp: number; maxHp: number; mp: number; maxMp: number; attack: number; defense: number; speed: number };
    progression?: { level: number; xp: number; xpToNextLevel: number };
    inventory?: { items: Array<{ itemId: string; quantity: number }> };
    equipment?: { weaponId: string | null; armorId: string | null; accessoryId: string | null; weaponPlus?: number };
    position?: { x: number; y: number };
    facing?: "up" | "down" | "left" | "right";
  };
  /** Restored gold ledger (dedup continuity across save/load). */
  goldLedger?: GoldLedgerEntry[];
  /** Restored equipment intents (preserved across save/load). */
  equipmentIntents?: EquipmentIntent[];
  /** Restored main-line quest state (default fresh: quest 0, kills 0). */
  quest?: QuestLineState;
  /**
   * Optional controlled-slice allowlist. When supplied, only these canonical
   * encounter instances are materialized. This is presentation/scope
   * selection, not a new encounter model or a change to canonical map data.
   */
  allowedEncounterIds?: readonly string[];
  /** Optional NPC allowlist for a deliberately narrow playable slice. */
  allowedNpcIds?: readonly string[];
  /**
   * Learning runtime (P1.8C): canonical Soal pool (plain data, never Prisma
   * in the engine) + trigger policy. Absent = no learning encounters.
   */
  learning?: { pool: SoalLike[]; policy?: LearningTriggerPolicy };
}

/** P2.6H.2: Server reward/settlement state for last victory. */
export type ServerRewardState =
  | { status: "PENDING"; battleId: string }
  | { status: "CONFIRMED"; battleId: string; xpEarned: number; goldEarned: number }
  | { status: "RETRYABLE_FAILURE"; battleId: string; error: string }
  | { status: "FAILED"; battleId: string; error: string }
  | null;

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
  /** Active battle state, if any (renderer/UI consume only). */
  getBattle(): RPGBattleState | null;
  /** P1.9A slice: pending client-safe challenge (null unless PENDING). */
  getLearningChallenge(): LearningChallenge | null;
  /** P1.9A slice: last answer feedback until consumed. */
  getLearningFeedback(): { correct: boolean } | null;
  /** P1.9A slice: submit an answer through the SUBMIT pipeline. */
  submitLearningAnswer(answer: string): boolean;
  /** P1.9C slice: basic attack vs first living enemy. */
  attackBasic(): boolean;
  /** P1.9C slice: skill attack vs first living enemy (validated in core). */
  attackWithSkill(skillId: string): boolean;
  /** P1.9C slice: use a consumable (world or battle, validated in core). */
  useItem(itemId: string): boolean;
  /** P1.9C slice: attempt escape through the canonical path. */
  fleeBattle(): boolean;
  /** Live encounter table snapshot (debug/tests). */
  getLiveEnemies(): LiveEnemy[];
  /** Unclaimed gold intents for the future economy phase. */
  getGoldIntents(): Array<{ battleId: string; amount: number }>;
  /** Defeated boss instance ids (persisted, never respawn). */
  getDeadBossIds(): string[];
  /** Authoritative main-line quest state snapshot. */
  getQuest(): QuestLineState;
  /** Picked golden-flower tiles snapshot. */
  getPickedGe(): string[];
  /** Spendable gold balance (canonical economy). */
  getGold(): number;
  /** Gold audit ledger (append-only; balance must equal its sum). */
  getGoldLedger(): GoldLedgerEntry[];
  /** Preserved equipment intents (unmapped prototype gear). */
  getEquipmentIntents(): EquipmentIntent[];
  /** Interaction mode: exactly one of WORLD/DIALOGUE/SHOP/FORGE/BATTLE. */
  getMode(): RPGInteractionMode;
  /** Active interaction session snapshot, if any. */
  getSession(): DialogueSession | ShopSession | ForgeSession | null;
  /** Advance the active dialogue through the canonical command path. */
  advanceActiveDialogue(): boolean;
  /** End the active dialogue and atomically apply its validated signals. */
  endActiveDialogue(): boolean;
  /** Subscribe to events. */
  on(event: string, handler: (data: unknown) => void): () => void;
  /** Stop the engine and clean up. */
  destroy(): void;
  /** P2.6H: Server-authoritative battle ID (null until server responds). */
  getServerBattleId(): string | null;
  /** P2.6H.2: Server reward/settlement state for last victory. */
  getServerRewardState(): ServerRewardState;
}

/** Interaction mode — exactly one owner of input at a time (P1.5 §15). */
export type RPGInteractionMode = "WORLD" | "DIALOGUE" | "SHOP" | "FORGE" | "BATTLE";

/** Create and start the RPG engine. */
export function createEngine(config: RPGEngineConfig): RPGEngine {
  const { container, playerId, playerName } = config;

  // ── Initialize State ──────────────────────────────────────────────
  // Canonical maps (P1E.2) load via map-loader; unknown ids keep the
  // Phase-0 placeholder world (regression-safe default).
  const canonicalStart = config.mapId ? getCanonicalMap(config.mapId) : undefined;
  const loadedWorld = canonicalStart ? loadCanonicalMap(canonicalStart.id) : null;

  const basePlayer = createDefaultPlayer(playerId, playerName);
  const restored = config.initialPlayer;
  const mergedPlayer = restored
    ? {
        ...basePlayer,
        stats: { ...basePlayer.stats, ...(restored.stats ?? {}) },
        progression: { ...basePlayer.progression, ...(restored.progression ?? {}) },
        inventory: restored.inventory ?? basePlayer.inventory,
        equipment: { ...basePlayer.equipment, ...(restored.equipment ?? {}) },
        position: restored.position ?? basePlayer.position,
        facing: restored.facing ?? basePlayer.facing,
      }
    : basePlayer;
  const player = loadedWorld && canonicalStart
    ? {
        ...mergedPlayer,
        position: restored?.position ?? spawnPosition(canonicalStart, canonicalStart.spawn.x, canonicalStart.spawn.y),
      }
    : mergedPlayer;
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
  // Battle runtime (P1.4C): live encounter table, defeated bosses, unclaimed
  // gold intents, applied-result dedup, and the active battle session.
  // The BATTLE CORE stays pure — this closure owns all mutation.
  const deadBossIds = new Set<string>(config.deadBossIds ?? []);
  let liveEnemies: LiveEnemy[] = [];
  let goldIntents: Array<{ battleId: string; amount: number }> = [
    ...(config.goldIntents ?? []),
  ];
  const appliedBattleIds = new Set<string>();

  // P2.6H.2: Track server reward/settlement state for last victory.
  // Exposed via getServerRewardState() for the UI layer.
  let serverRewardState: ServerRewardState = null;
  // Canonical economy (P1.6): ONE spendable balance + audit ledger, both
  // engine-owned (server-authoritative later). No wallet, no second balance.
  let gold: GoldState = {
    balance: config.gold ?? INITIAL_GOLD,
    ledger: (config.goldLedger ?? []).map((e) => ({ ...e })),
  };
  // Preserved equipment intents (prototype wpn/arm keys without production
  // counterpart — never silently mapped, never dropped).
  let equipmentIntents: EquipmentIntent[] = (config.equipmentIntents ?? []).map((e) => ({ ...e }));
  let txSeq = 0;
  let activeBattle: { state: RPGBattleState; rng: import("../combat/battle-rng").BattleRng } | null = null;
  let battleSeq = 0;
  // P1.8C learning runtime (transient, never persisted): server-side resolved
  // challenges keyed by challengeId, the active encounter object, and the
  // pending effect consumed by the NEXT attack (cleared on use/close).
  const learningChallenges = new Map<string, ResolvedChallenge>();
  let activeEncounter: LearningEncounter | null = null;
  let pendingLearning: { correct: boolean } | null = null;
  // P1.9A: last feedback retained for UI until consumed by an attack or
  // the battle closes (transient presentation state, never persisted).
  let lastLearningFeedback: { correct: boolean } | null = null;
  // P2.6H.3 GAP-3: Defeat is deferred until server reconciliation confirms
  // the terminal state. The client optimistically applies local effects but
  // waits for the authoritative server response before removing activeBattle.
  let pendingDefeat: { state: RPGBattleState; foeId: string } | null = null;

  // ── P2.6H server-authoritative state ──────────────────────────────────
  // The engine keeps local RPGBattleState for synchronous rendering, but
  // fires server API calls in the background. The server's battle ID is
  // used for all subsequent API calls (learning, action, reward, settle).
  let serverBattleId: string | null = null;
  let serverLearningId: string | null = null;
  // P2.6H.5: Track in-flight calls with explicit lifecycle (not just Set<Promise>).
  // This allows the UI layer to inspect call status and show retry UX.
  const pendingServerCalls = new PendingServerCalls();

  /**
   * P2.6H.5: Fire a server call as background task (non-blocking, never blocks rAF).
   *
   * Lifecycle: PENDING → CONFIRMED | RETRYABLE_FAILURE | FAILED | UNKNOWN
   *
   * For idempotent calls, this uses fetchServerWithRetry which applies bounded
   * retry with the SAME requestKey. Non-idempotent calls get no retry.
   */
  function fireServerCall<T>(
    promise: Promise<T>,
    options?: { key?: string; idempotent?: boolean },
  ): Promise<T> {
    const key = options?.key ?? `call-${crypto.randomUUID()}`;
    pendingServerCalls.track(key);
    promise
      .then((data) => {
        pendingServerCalls.confirm(key, data);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        const errorClass = err instanceof NetworkError
          ? classifyError(0, err.code)
          : classifyError(0, "NETWORK_ERROR");
        if (errorClass === "PERMANENT") {
          pendingServerCalls.failed(key, msg);
        } else {
          // RETRYABLE or UNKNOWN — caller may inspect and retry
          pendingServerCalls.retryableFailure(key, msg);
        }
      });
    return promise;
  }

  // P2.6H.4 GAP-7: Track the last processed server revision to reject stale
  // responses that could overwrite newer authoritative state.
  let lastServerRevision = -1;

  /** Reconcile server battle projection into local state (server = truth). */
  function reconcileServerBattle(projection: {
    id: string;
    status: string;
    phase: string;
    turn: number;
    actionRevision: number;
    player: { hp: number; maxHp: number; mp?: number; maxMp?: number; attack: number; defense: number };
    enemies: Array<{ id: string; hp: number; maxHp: number; attack: number; defense: number }>;
  }): void {
    if (!activeBattle) return;

    // P2.6H.4 GAP-7: Stale response protection. An older server response
    // (lower actionRevision) must not overwrite a newer one. This prevents
    // out-of-order background calls from reverting authoritative state.
    if (projection.actionRevision < lastServerRevision) return;
    lastServerRevision = projection.actionRevision;

    const b = activeBattle.state;

    // P2.6H.4 GAP-7: Terminal state protection. Once the local battle has
    // a result (WIN/LOSE/FLED), it must never be reopened to ACTIVE by a
    // stale or mis-ordered server response.
    if (b.result !== undefined && projection.status === "ACTIVE") return;

    // P2.6H.4 GAP-7: Server status → local result mapping. Server is
    // authoritative for terminal transitions.
    if (projection.status === "WON" && b.result === undefined) {
      b.result = "WIN";
    } else if (projection.status === "LOST" && b.result === undefined) {
      b.result = "LOSE";
    } else if (projection.status === "FLED" && b.result === undefined) {
      b.result = "FLED";
    }

    // Apply server HP/turn/phase to local state (server is authoritative).
    const serverPlayer = {
      ...b.player,
      hp: projection.player.hp,
      maxHp: projection.player.maxHp,
      mp: projection.player.mp ?? b.player.mp,
      maxMp: projection.player.maxMp ?? b.player.maxMp,
      attack: projection.player.attack,
      defense: projection.player.defense,
    };
    const serverEnemies = b.enemies.map((e) => {
      const se = projection.enemies.find((s) => s.id === e.id);
      return se ? { ...e, hp: se.hp, maxHp: se.maxHp, attack: se.attack, defense: se.defense } : e;
    });
    const reconciled: RPGBattleState = {
      ...b,
      player: serverPlayer,
      enemies: serverEnemies,
      turn: projection.turn,
      phase: projection.phase as RPGBattlePhase,
    };
    activeBattle = { state: reconciled, rng: activeBattle.rng };
  }

  /** Get the server-authoritative battle ID (null until server responds). */
  function getServerBattleId(): string | null { return serverBattleId; }
  function getServerRewardState(): ServerRewardState { return serverRewardState; }
  /** P2.6H.5: Expose server call lifecycle status for UI inspection. */
  function getServerCallStatus(): Record<ServerCallStatus, number> {
    return pendingServerCalls.summary();
  }

  function visibleEncounterTable(mapId: string): LiveEnemy[] {
    const canon = getCanonicalMap(mapId);
    if (!canon) return [];
    const table = buildEncounterTable(enemySpawnsOf(canon), deadBossIds).table;
    if (!config.allowedEncounterIds) return table;
    const allowed = new Set(config.allowedEncounterIds);
    return table.filter((enemy) => allowed.has(enemy.instanceId));
  }

  if (canonicalStart) {
    const built = buildEncounterTable(enemySpawnsOf(canonicalStart), deadBossIds);
    liveEnemies = config.allowedEncounterIds
      ? built.table.filter((enemy) => config.allowedEncounterIds?.includes(enemy.instanceId))
      : built.table;
    for (const id of built.skippedSpawnIds) {
      console.warn(`[rpg] spawn without canonical definition skipped: ${id}`);
    }
  }
  // Interaction session (P1.5): exactly one of DIALOGUE/SHOP/FORGE, else
  // WORLD mode. Sessions freeze world input; battle freezes sessions.
  // Never persisted mid-session (prototype never saves open menus either).
  let session: DialogueSession | ShopSession | ForgeSession | null = null;
  // Pendaki campfire cooldown (wall-clock, runtime-only like prototype restT).
  let restCooldownUntilMs = 0;
  // Authoritative main-line quest state (P1.7): {main 0..7, kills}.
  // Dead state 5 is never admitted (validator rejects both directions).
  let quest: QuestLineState = { ...createQuestLineState(), ...(config.quest ?? {}) };
  // Golden-flower pickups `map:x,y` (Bunga Emas; prototype picked[] verbatim).
  const pickedGe = new Set<string>(config.pickedGe ?? []);
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

  // ── Battle runtime helpers (P1.4C; pure core does resolution) ──────

  /** Clear transient learning runtime on battle close (all terminals). */
  function clearLearning(challengeId?: string): void {
    activeEncounter = null;
    pendingLearning = null;
    lastLearningFeedback = null;
    if (challengeId) learningChallenges.delete(challengeId);
    // P2.6H: Reset server learning tracking on battle close.
    serverBattleId = null;
    serverLearningId = null;
  }

  /** Rebuild the live table for a map (portal transitions + defeat respawn). */
  function reloadLiveEnemies(mapId: string): void {
    liveEnemies = visibleEncounterTable(mapId);
  }

  /** Start a battle from a live enemy (movement frozen from here on). */
  function startEncounterBattle(
    currentState: RPGGameState,
    mapId: string,
    tile: { x: number; y: number },
    foe: LiveEnemy,
    playerState: RPGPlayerState,
  ): RPGGameState {
    const battleId = crypto.randomUUID();
    const seed = hashBattleId(`${battleId}#${battleSeq++}`);
    const started = startBattle({
      battleId,
      player: playerState,
      equipmentTable: EQUIPMENT,
      enemies: [{ def: foe.def, instanceId: foe.instanceId }],
      origin: { mapId, x: tile.x, y: tile.y },
      seed,
    });
    activeBattle = { state: started.state, rng: started.rng };
    for (const ev of started.events) eventBus.emit(ev);

    // P2.6H: Fire server-authoritative battle start in background.
    // The server creates its own battle state; we store its ID for
    // subsequent API calls (learning, action, reward, settle).
    // encounterId = foe.instanceId (static key like "e1", "e2", "e3").
    const encounterId = foe.instanceId;
    const requestKey = generateRequestKey();
    fireServerCall(
      startServerBattle(encounterId, requestKey).then((res) => {
        if (res.ok && res.data.category === "STARTED") {
          serverBattleId = res.data.battle.id;
          // Reconcile server projection into local state (server = truth).
          reconcileServerBattle(res.data.battle);
        }
      }),
      { key: `start-${encounterId}`, idempotent: true },
    );

    // P1.8C hardening: trigger decision + encounter build live in the pure
    // learning-runtime module (runtime-tested); the engine only stores and
    // emits. Selection uses its own string seed — battle RNG untouched.
    const trig = triggerBattleLearning({
      policy: config.learning?.policy,
      isBoss: foe.def.boss === true,
      battleTurn: 0,
      pool: config.learning?.pool ?? [],
      encounterId: battleId,
      enemyId: foe.instanceId,
      seed: `${battleId}:learn`,
      level: playerState.progression.level,
    });
    if (trig.triggered) {
      learningChallenges.set(trig.resolved.challengeId, trig.resolved);
      activeEncounter = trig.encounter;
      const withLearning: RPGBattleState = {
        ...started.state,
        learning: { ...trig.substate },
      };
      activeBattle = { state: withLearning, rng: started.rng };
      eventBus.emit({
        type: "LEARNING_CHALLENGE",
        battleId,
        encounterId: trig.substate.encounterId,
        challengeId: trig.substate.challengeId,
        challenge: trig.client,
      });

      // P2.6H: Fire server learning start in background.
      // Server picks its own question from the pool; we store the learning ID.
      if (serverBattleId) {
        fireServerCall(
          startServerLearning(serverBattleId).then((lr) => {
            if (lr.ok && lr.data && typeof lr.data === "object" && "learning" in lr.data) {
              const learning = (lr.data as { learning?: { status?: string } }).learning;
              if (learning?.status) {
                serverLearningId = serverBattleId; // track that server learning is active
              }
            }
          }),
          { key: `learn-${serverBattleId}`, idempotent: false },
        );
      }

      return { ...currentState, battle: withLearning };
    }
    return { ...currentState, battle: started.state };
  }

  /** Apply a WIN result exactly once (dedup on battleId). */
  function applyWinFlow(
    currentState: RPGGameState,
    battle: RPGBattleState,
  ): RPGGameState {
    if (appliedBattleIds.has(battle.battleId)) return currentState;
    appliedBattleIds.add(battle.battleId);
    const res = toBattleResult(battle);
    if (!res || res.outcome !== "WIN") return currentState;
    const bossIds = new Set(
      liveEnemies.filter((e) => e.boss).map((e) => e.instanceId),
    );
    const applied = applyVictory({
      stats: currentState.player.stats,
      progression: currentState.player.progression,
      battleHp: battle.player.hp,
      battleMp: battle.player.mp ?? currentState.player.stats.mp,
      result: res,
      bossIds,
    });
    for (const [k, v] of Object.entries(applied.flagsAdded)) flags[k] = v;
    for (const id of applied.deadBossIds) deadBossIds.add(id);
    for (const id of res.deadEnemyIds) liveEnemies = markDead(liveEnemies, id);

    // P2.6I.3: Sync battle-origin world state to server-authoritative columns.
    for (const id of applied.deadBossIds) {
      fireServerCall(
        mutateQuestState("BOSS_KILL", `qk-boss-${battle.battleId}-${id}`, { bossId: id }),
        { key: `q-boss-${battle.battleId}-${id}`, idempotent: true },
      );
    }
    for (const [k, v] of Object.entries(applied.flagsAdded)) {
      if (v) {
        fireServerCall(
          mutateQuestState("FLAG", `qk-bflag-${battle.battleId}-${k}`, { flagName: k }),
          { key: `q-bflag-${battle.battleId}-${k}`, idempotent: true },
        );
      }
    }
    if (applied.goldIntent) {
      goldIntents = [...goldIntents, applied.goldIntent];
      // Spendable credit through the canonical applier (dedup on battleId).
      const before = gold.balance;
      gold = creditGold(gold, battle.battleId, applied.goldIntent.amount, "battle-victory");
      if (gold.balance !== before) {
        eventBus.emit({
          type: "GOLD_CHANGED",
          playerId: currentState.session.playerId,
          balance: gold.balance,
          delta: applied.goldIntent.amount,
          reason: "battle-victory",
        });
      }
    }
    // Battle drops (canonical bijih) go straight to inventory.
    let dropInventory = currentState.player.inventory;
    for (const d of res.dropIntents) {
      if (d.kind === "bijih") {
        dropInventory = addItem(dropInventory, "bijih", 1);
        eventBus.emit({
          type: "ITEM_GRANTED",
          playerId: currentState.session.playerId,
          itemId: "bijih",
          quantity: 1,
          source: battle.battleId,
        });
      }
    }
    const player = {
      ...currentState.player,
      inventory: dropInventory,
      stats: applied.stats,
      progression: applied.progression,
    };
    // P1.7: level growth + full restore per level gained (prototype verbatim;
    // grantXp above already advanced the level via the production curve —
    // D1 intentionally undecided, curve untouched).
    const gained = applied.progression.level - currentState.player.progression.level;
    let grownPlayer = player;
    if (gained > 0) {
      const grown = applyLevelGrowth(
        {
          maxHp: player.stats.maxHp,
          maxMp: player.stats.maxMp,
          attack: player.stats.attack,
          defense: player.stats.defense,
        },
        gained,
      );
      grownPlayer = {
        ...player,
        stats: { ...player.stats, ...grown, hp: grown.maxHp, mp: grown.maxMp },
      };
    }
    // P1.7: quest signals from victory — kills++ for non-boss wins,
    // QUEST 3 on RAJA (from quest 2), QUEST 7 on tower victory (<7).
    // bossDead/towerDone flags already applied from flagIntents above.
    const slainBoss = battle.enemies.some((e) => e.hp <= 0 && e.boss === true);
    if (!slainBoss) {
      quest = { ...quest, kills: quest.kills + 1 };
    }
    const bKey = battle.enemies.find((e) => e.hp <= 0)?.prototypeKey;
    if (bKey === "b" || bKey === "tw") {
      const to = bKey === "b" ? 3 : 7;
      if (isValidQuestTransition(quest.main, to, { quest: quest.main, kills: quest.kills, flags })) {
        quest = { ...quest, main: to };
        eventBus.emit({
          type: "QUEST_ADVANCE",
          playerId: currentState.session.playerId,
          quest: quest.main,
          kills: quest.kills,
        });
      }
    }

    // P2.6I.2: Sync battle quest mutations to server-authoritative state.
    // Fire-and-forget after client mutations; server validates independently.
    // We send individual mutations so each is independently validated on the server.
    {
      if (!slainBoss) {
        fireServerCall(
          mutateQuestState("KILL", `qk-kill-${battle.battleId}`),
          { key: `q-kill-${battle.battleId}`, idempotent: true },
        );
      }
      const questTarget = battle.enemies.find((e) => e.hp <= 0)?.prototypeKey;
      if (questTarget === "b" || questTarget === "tw") {
        const toQ = questTarget === "b" ? 3 : 7;
        if (isValidQuestTransition(quest.main, toQ, { quest: quest.main, kills: quest.kills, flags })) {
          fireServerCall(
            mutateQuestState("QUEST_ADVANCE", `qk-adv-${battle.battleId}`, { to: toQ }),
            { key: `q-adv-${battle.battleId}`, idempotent: true },
          );
        }
      }
    }

    eventBus.emit({ type: "BATTLE_END", battleId: battle.battleId, winnerId: player.id });
    activeBattle = null;
    clearLearning(battle.learning?.challengeId);

    // P2.6H: Fire server-authoritative reward + settlement in background.
    // Server creates a reward receipt and settles XP/gold into the DB.
    // Client already applied rewards locally (above); server is the
    // authoritative ledger for persistence and cross-device sync.
    // P2.6H.5: Uses idempotent retry with same requestKey for reward
    // receipt and settlement (both idempotent on server).
    if (serverBattleId) {
      const rewardKey = generateRequestKey();
      serverRewardState = { status: "PENDING", battleId: serverBattleId };
      fireServerCall(
        createServerRewardReceipt(serverBattleId, rewardKey).then((receiptRes) => {
          if (!receiptRes.ok) {
            const msg = receiptRes.error?.message ?? "Reward receipt failed";
            const errorClass = classifyError(receiptRes.error.status, receiptRes.error.code);
            serverRewardState = {
              status: errorClass === "PERMANENT" ? "FAILED" : "RETRYABLE_FAILURE",
              battleId: serverBattleId!,
              error: msg,
            };
            console.error(`[rpg] server reward receipt failed (${errorClass}): ${msg}`);
            return;
          }
          const settleKey = generateRequestKey();
          return settleServerReward(serverBattleId!, settleKey).then((settleRes) => {
            if (!settleRes.ok) {
              const msg = settleRes.error?.message ?? "Settlement failed";
              const errorClass = classifyError(settleRes.error.status, settleRes.error.code);
              serverRewardState = {
                status: errorClass === "PERMANENT" ? "FAILED" : "RETRYABLE_FAILURE",
                battleId: serverBattleId!,
                error: msg,
              };
              console.error(`[rpg] server settlement failed (${errorClass}): ${msg}`);
              return;
            }
            // Server settlement complete; XP/gold persisted to DB.
            const entitlement = receiptRes.data.receipt?.entitlement;
            const applied = settleRes.data.settlement?.applied;
            serverRewardState = {
              status: "CONFIRMED",
              battleId: serverBattleId!,
              xpEarned: applied?.rpgXp ?? entitlement?.rpgXp ?? 0,
              goldEarned: applied?.gold ?? entitlement?.gold ?? 0,
            };
            // Fetch authoritative server state after successful settlement.
            fetchStateProjection().catch((err) => {
              console.warn("[rpg] post-settlement state fetch failed:", err);
            });
          });
        }).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          serverRewardState = { status: "FAILED", battleId: serverBattleId!, error: msg };
          console.error(`[rpg] server reward chain error: ${msg}`);
        }),
        { key: `reward-${serverBattleId}`, idempotent: true },
      );
    }

    return { ...currentState, player: grownPlayer, battle: null };
  }

  /** Apply a LOSE result exactly once (dedup on battleId). */
  function applyDefeatFlow(
    currentState: RPGGameState,
    battle: RPGBattleState,
    foeId: string,
  ): RPGGameState {
    if (appliedBattleIds.has(battle.battleId)) return currentState;
    appliedBattleIds.add(battle.battleId);
    const res = toBattleResult(battle);
    if (!res || res.outcome !== "LOSE" || !res.respawn) return currentState;
    const applied = applyDefeat({ stats: currentState.player.stats, result: res });
    const dest = getCanonicalMap(res.respawn.mapId);
    if (!dest) return currentState;
    const nextWorld = loadCanonicalMap(dest.id);
    if (!nextWorld) return currentState;
    reloadLiveEnemies(dest.id);
    const player = {
      ...currentState.player,
      stats: {
        ...currentState.player.stats,
        hp: applied.hp,
        mp: applied.mp,
      },
      position: spawnPosition(dest, res.respawn.x, res.respawn.y),
      facing: "down" as const,
    };
    eventBus.emit({ type: "BATTLE_END", battleId: battle.battleId, winnerId: foeId });
    activeBattle = null;
    clearLearning(battle.learning?.challengeId);
    return { ...currentState, player, world: nextWorld, battle: null };
  }

  // ── State Updates ─────────────────────────────────────────────────

  /** Process a single command and return new state. */
  function processCommand(
    currentState: RPGGameState,
    command: RPGCommand,
  ): RPGGameState {
    switch (command.type) {
      case "MOVE": {
        // World movement is frozen while a battle OR interaction session
        // (dialogue/shop/forge) is active.
        if (currentState.battle !== null || session !== null) return currentState;
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
              reloadLiveEnemies(dest.id);
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
              // Enemy encounter (prototype tryMove: portal → enemy → solid).
              // Spawns sit on walkable tiles, so this check belongs here.
              {
                const foe = findEncounterAt(liveEnemies, outcome.tile);
                if (foe) {
                  return startEncounterBattle(currentState, canon.id, outcome.tile, foe, player);
                }
              }
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
        // No world interaction while a battle OR session is active.
        if (currentState.battle !== null || session !== null) return currentState;
        // Canonical maps: facing-adjacent tile (prototype interact order —
        // chest, then NPC). Reward keys stay canonical-verbatim here; the
        // inventory mapping is owned by a later phase (documented).
        const canon = getCanonicalMap(currentState.world.mapId);
        if (canon) {
          const tile = normToTile(canon, currentState.player.position);
          if (tile) {
            // Enemy first (prototype: npc → enemy → chest-tile).
            const facing = facingTile(tile, currentState.player.facing);
            const foe = findEncounterAt(liveEnemies, facing);
            if (foe) {
              return startEncounterBattle(currentState, canon.id, tile, foe, currentState.player);
            }
            // Golden flower pickup (prototype GE branch verbatim): first pick
            // grants flowers+1 and turns the loaded tile to grass; re-pickup
            // is blocked by pickedGe (canonical grids stay pristine).
            if (tileAt(canon, facing.x, facing.y) === RPG_TILES.GE) {
              const key = `${canon.id}:${facing.x},${facing.y}`;
              if (!pickedGe.has(key)) {
                pickedGe.add(key);
                quest = { ...quest, flowers: quest.flowers + 1 };

                // P2.6I.2: Sync flower pickup to server-authoritative state.
                fireServerCall(
                  mutateQuestState("FLOWER_PICK", `qk-flower-${key}`),
                  { key: `q-flower-${key}`, idempotent: true },
                );

                // P2.6I.3: Sync golden-flower tile key to server-authoritative world state.
                fireServerCall(
                  mutateQuestState("GE_PICK", `qk-ge-${key}`, { geKey: key }),
                  { key: `q-ge-${key}`, idempotent: true },
                );

                const tiles = [...currentState.world.tiles.tiles];
                tiles[facing.y * canon.width + facing.x] = canonicalTileId(RPG_TILES.GR);
                const world = {
                  ...currentState.world,
                  tiles: { ...currentState.world.tiles, tiles },
                };
                eventBus.emit({
                  type: "INTERACTION",
                  playerId: currentState.session.playerId,
                  interactionId: `int.flower.${facing.x}.${facing.y}`,
                  result: { kind: "GE_PICKED", flowers: quest.flowers },
                });
                return { ...currentState, world };
              }
            }
            const out = interactTile({
              mapId: canon.id,
              tile,
              dir: currentState.player.facing,
              openedChests,
            });
            if (out.kind === "CHEST_OPENED") {
              openedChests.add(out.chestId);
              // P2.6I.3: Sync chest open to server-authoritative world state.
              fireServerCall(
                mutateQuestState("CHEST_OPEN", `qk-chest-${out.chestId}`, { chestId: out.chestId }),
                { key: `q-chest-${out.chestId}`, idempotent: true },
              );
              // Canonical application: consumables/materials now, gear as
              // preserved intents (no silent mapping, no loss).
              const applied = applyChestRewards(
                currentState.player.inventory,
                out.chestId,
                out.give,
              );
              const player = {
                ...currentState.player,
                inventory: applied.inventory,
              };
              equipmentIntents = [...equipmentIntents, ...applied.equipmentIntents];
              for (const a of applied.applied) {
                eventBus.emit({
                  type: "ITEM_GRANTED",
                  playerId: currentState.session.playerId,
                  itemId: a.itemId,
                  quantity: a.quantity,
                  source: `chest:${out.chestId}`,
                });
              }
              eventBus.emit({
                type: "INTERACTION",
                playerId: currentState.session.playerId,
                interactionId: `int.chest.${out.chestId}`,
                result: {
                  kind: "LOOT",
                  items: applied.applied.map((a) => a.itemId),
                  canonicalGive: out.give,
                  rewardMapping: "APPLIED",
                },
              });
              return { ...currentState, player };
            } else if (out.kind === "CHEST_EMPTY") {
              eventBus.emit({
                type: "INTERACTION",
                playerId: currentState.session.playerId,
                interactionId: `int.chest.${out.chestId}`,
                result: { kind: "CHEST_EMPTY", chestId: out.chestId },
              });
            } else if (out.kind === "NPC") {
              if (config.allowedNpcIds && !config.allowedNpcIds.includes(out.npcId)) {
                return currentState;
              }
              // Route by canonical NPC role: merchants open SHOP sessions
              // (greeting preserved in data; met-flag persisted via flags),
              // others open DIALOGUE sessions. No story content invented.
              const route = NPC_ROUTING[out.npcId];
              if (route === "SHOP") {
                const menu = getShopMenu(out.npcId);
                if (!menu) return currentState;
                flags[menu.metFlag] = true;
                session = { kind: "SHOP", npcId: out.npcId };
                eventBus.emit({
                  type: "SHOP_OPEN",
                  playerId: currentState.session.playerId,
                  npcId: out.npcId,
                });
              } else {
                const tree = getDialogueTree(out.npcId);
                if (!tree) return currentState;
                // Canonical branch selection (prototype talkTo order verbatim).
                const startNode = selectDialogueStart(out.npcId, {
                  quest: quest.main,
                  kills: quest.kills,
                  flowers: quest.flowers,
                  flags,
                  nowMs: Date.now(),
                  restCooldownUntilMs,
                });
                const sess = startDialogue(out.npcId, 0, startNode);
                if (!sess) return currentState;
                session = sess;
                // REST applies on display (prototype campfire): full heal.
                const cur = currentNode(tree, sess);
                const rest = cur?.node.effects?.some((e) => e.type === "REST") === true;
                let playerNow = currentState.player;
                if (rest) {
                  playerNow = {
                    ...playerNow,
                    stats: {
                      ...playerNow.stats,
                      hp: playerNow.stats.maxHp,
                      mp: playerNow.stats.maxMp,
                    },
                  };
                  restCooldownUntilMs = Date.now() + 120000;
                }
                eventBus.emit({
                  type: "DIALOGUE_START",
                  playerId: currentState.session.playerId,
                  npcId: out.npcId,
                  dialogueId: tree.dialogueId,
                  nodeId: sess.nodeId,
                });
                return { ...currentState, player: playerNow };
              }
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
      case "ATTACK": {
        // Battle-only command (ignored outside battle). The enemy responds
        // in the same tick (prototype turn order); victory/defeat apply once.
        // P1.8C: a resolved learning moment is consumed by the NEXT attack
        // via the existing learningCorrect boundary (formulas untouched).
        if (!activeBattle || currentState.battle === null) return currentState;
        if (command.playerId !== playerId) return currentState;
        const b = activeBattle;
        const learned = pendingLearning;
        pendingLearning = null;
        lastLearningFeedback = null;
        const out = playerAct(
          b.state,
          {
            battleId: b.state.battleId,
            turn: b.state.turn,
            actorId: currentState.player.id,
            targetId: command.targetId,
            skillId: command.skillId,
            learningCorrect: learned ? learned.correct : undefined,
          },
          b.rng,
        );
        if (!out.ok) return currentState;
        activeBattle = { state: out.state, rng: out.rng };
        let next = { ...currentState, battle: out.state };
        for (const ev of out.events) eventBus.emit(ev);
        if (out.state.result === "WIN") return applyWinFlow(next, out.state);
        if (out.state.result !== undefined) return next;
        const foeId = out.state.enemies.find((e) => e.hp > 0)?.id;
        if (!foeId) return next;
        const eb = enemyAct(
          out.state,
          {
            battleId: out.state.battleId,
            turn: out.state.turn,
            actorId: foeId,
            enemyId: foeId,
            charm: flags.charm === true,
          },
          out.rng,
        );
        if (!eb.ok) return next;
        activeBattle = { state: eb.state, rng: eb.rng };
        next = { ...next, battle: eb.state };
        for (const ev of eb.events) eventBus.emit(ev);
        // P2.6H.3 GAP-3: Defer defeat until server reconciliation confirms
        // the terminal state. Apply optimistic local effects immediately but
        // keep activeBattle alive for server reconciliation.
        if (eb.state.result === "LOSE") {
          pendingDefeat = { state: eb.state, foeId };
          return next;
        }
        return next;
      }
      case "BATTLE_ESCAPE": {
        if (!activeBattle || currentState.battle === null) return currentState;
        if (command.playerId !== playerId) return currentState;
        const b = activeBattle;
        const out = escapeBattle(
          b.state,
          { battleId: b.state.battleId, turn: b.state.turn, actorId: currentState.player.id },
          b.rng,
        );
        if (!out.ok) return currentState;
        activeBattle = { state: out.state, rng: out.rng };
        let next: RPGGameState = { ...currentState, battle: out.state };
        for (const ev of out.events) eventBus.emit(ev);
        if (out.state.result === "FLED") {
          // Enemy stays alive; player keeps position. Snapshot HP/MP syncs
          // back (prototype shares one player object: damage taken and heals
          // persist through flee). No rewards.
          eventBus.emit({ type: "BATTLE_END", battleId: b.state.battleId, winnerId: null });
          activeBattle = null;
          clearLearning(out.state.learning?.challengeId);
          const fledPlayer = {
            ...currentState.player,
            stats: {
              ...currentState.player.stats,
              hp: out.state.player.hp,
              mp: out.state.player.mp ?? currentState.player.stats.mp,
            },
          };
          next = { ...next, player: fledPlayer, battle: null };
        }
        // P2.6H.3 GAP-3: Handle defeat from failed flee (enemy kills player).
        // Defer until server reconciliation confirms the terminal state.
        if (out.state.result === "LOSE") {
          const foe = out.state.enemies.find((e) => e.hp > 0);
          if (foe) pendingDefeat = { state: out.state, foeId: foe.id };
        }
        return next;
      }
      case "SUBMIT_LEARNING_ANSWER": {
        // P1.8C hardening: evaluation pipeline lives in pure
        // learning-runtime (submitBattleAnswer); the engine stores the
        // outcome and emits. Rejections: no battle, wrong player, no pending
        // moment, terminal battle, id/challenge mismatch, duplicates.
        if (!activeBattle || currentState.battle === null) return currentState;
        if (command.playerId !== playerId) return currentState;
        const sub = activeBattle.state.learning;
        const resolved = sub ? learningChallenges.get(sub.challengeId) : undefined;
        const out = submitBattleAnswer({
          substate: sub,
          encounter: activeEncounter,
          resolved,
          answer: command.answer,
          battleTerminal: activeBattle.state.result !== undefined,
          attemptId: `${sub?.encounterId ?? ""}:attempt-0`,
          claimedChallengeId: command.challengeId,
        });
        if (!out.accepted) return currentState;
        activeEncounter = out.encounter;
        pendingLearning = { correct: out.correct };
        lastLearningFeedback = { correct: out.correct };
        const nb: RPGBattleState = {
          ...activeBattle.state,
          learning: sub ? { ...sub, status: "RESOLVED" } : sub,
        };
        activeBattle = { state: nb, rng: activeBattle.rng };
        eventBus.emit({
          type: "LEARNING_ANSWERED",
          battleId: nb.battleId,
          encounterId: sub?.encounterId ?? "",
          challengeId: sub?.challengeId ?? "",
          attemptId: sub?.attemptId ?? "",
          correct: out.correct,
        });
        return { ...currentState, battle: nb };
      }
      case "USE_ITEM": {
        // Consumables in WORLD (STATUS-menu eating, prototype verbatim) and
        // in BATTLE (BARANG menu: ram/teh/elix only — fish/bijih gated by
        // applyConsume). Battle use consumes the turn and the enemy responds
        // (prototype loop order); sessions freeze USE_ITEM.
        if (command.playerId !== playerId) return currentState;
        if (session !== null) return currentState;
        if (currentState.battle !== null) {
          if (!activeBattle) return currentState;
          const b = activeBattle;
          if (b.state.result !== undefined || b.state.phase !== "CHALLENGE") {
            return currentState;
          }
          const snapStats = {
            hp: b.state.player.hp,
            maxHp: b.state.player.maxHp,
            mp: b.state.player.mp ?? currentState.player.stats.mp,
            maxMp: b.state.player.maxMp ?? currentState.player.stats.maxMp,
          };
          const res = applyConsume(
            currentState.player.inventory,
            snapStats,
            command.itemId,
            true,
          );
          if (!res.ok) return currentState;
          const nbattle: RPGBattleState = {
            ...b.state,
            player: {
              ...b.state.player,
              hp: res.applied.stats.hp,
              mp: res.applied.stats.mp,
            },
            turn: b.state.turn + 1,
          };
          activeBattle = { state: nbattle, rng: b.rng };
          const player = { ...currentState.player, inventory: res.applied.inventory };
          let next = { ...currentState, player, battle: nbattle };
          eventBus.emit({
            type: "ITEM_CONSUMED",
            playerId: currentState.session.playerId,
            itemId: command.itemId,
            source: "battle-use",
          });
          const foeId = nbattle.enemies.find((e) => e.hp > 0)?.id;
          if (foeId && nbattle.result === undefined) {
            const eb = enemyAct(
              nbattle,
              {
                battleId: nbattle.battleId,
                turn: nbattle.turn,
                actorId: foeId,
                enemyId: foeId,
                charm: flags.charm === true,
              },
              b.rng,
            );
            if (eb.ok) {
              activeBattle = { state: eb.state, rng: eb.rng };
              next = { ...next, battle: eb.state };
              for (const ev of eb.events) eventBus.emit(ev);
              // P2.6H.3 GAP-3: Defer defeat until server reconciliation confirms
              // the terminal state.
              if (eb.state.result === "LOSE") {
                pendingDefeat = { state: eb.state, foeId };
              }
            }
          }
          return next;
        }
        const res = applyConsume(
          currentState.player.inventory,
          currentState.player.stats,
          command.itemId,
          false,
        );
        if (!res.ok) return currentState;
        const player = {
          ...currentState.player,
          inventory: res.applied.inventory,
          stats: res.applied.stats,
        };
        eventBus.emit({
          type: "ITEM_CONSUMED",
          playerId: currentState.session.playerId,
          itemId: command.itemId,
          source: "world-use",
        });
        return { ...currentState, player };
      }
      case "DIALOGUE_ADVANCE": {
        if (!session || session.kind !== "DIALOGUE") return currentState;
        if (command.playerId !== playerId) return currentState;
        const tree = getDialogueTree(session.npcId);
        if (!tree) return currentState;
        session = advanceDialogue(tree, session);
        eventBus.emit({
          type: "DIALOGUE_ADVANCE",
          playerId: currentState.session.playerId,
          npcId: session.npcId,
          nodeId: session.nodeId,
        });
        return currentState;
      }
      case "DIALOGUE_END": {
        if (!session || session.kind !== "DIALOGUE") return currentState;
        if (command.playerId !== playerId) return currentState;
        const tree = getDialogueTree(session.npcId);
        const signals = tree ? collectSignals(tree, session) : [];
        const npcId = session.npcId;
        const completed = session.atEnd;
        session = null;
        eventBus.emit({
          type: "DIALOGUE_END",
          playerId: currentState.session.playerId,
          npcId,
          completed,
        });
        // P1.7: validated quest-signal application (atomic, no partials).
        // SKILL signals record only (availability derives from level).
        if (signals.length > 0) {
          const applied = applyQuestSignals(currentState, `dlg:${npcId}`, signals);
          if (applied) {
            eventBus.emit({
              type: "INTERACTION",
              playerId: currentState.session.playerId,
              interactionId: `int.npc.${npcId}`,
              result: { kind: "DIALOGUE_COMPLETE", npcId, signals, applied: applied.applied },
            });
            return applied.state;
          }
          eventBus.emit({
            type: "INTERACTION",
            playerId: currentState.session.playerId,
            interactionId: `int.npc.${npcId}`,
            result: { kind: "DIALOGUE_COMPLETE", npcId, signals, applied: [] },
          });
        }
        return currentState;
      }
      case "SHOP_BUY": {
        if (!session || session.kind !== "SHOP") return currentState;
        if (command.playerId !== playerId) return currentState;
        // Empu forge entry: switch SHOP → FORGE (prototype single menu).
        if (command.itemId === "forge:open") {
          if (session.npcId !== "empu") return currentState;
          session = { kind: "FORGE", npcId: session.npcId };
          eventBus.emit({
            type: "FORGE_OPEN",
            playerId: currentState.session.playerId,
            npcId: session.npcId,
          });
          return currentState;
        }
        // Ratmi sell-all-fish (verbatim formula; counts from inventory).
        if (command.itemId === "fish:sell-all") {
          if (session.npcId !== "ratmi") return currentState;
          const { total, counts } = fishSellValue(currentState.player.inventory);
          const units = counts.f1 + counts.f2 + counts.f3;
          if (total <= 0 || units <= 0) return currentState;
          const txId = `fish-sell:${txSeq++}`;
          const player = {
            ...currentState.player,
            inventory: removeAllFish(currentState.player.inventory),
          };
          gold = creditGold(gold, txId, total, "fish-sell");
          eventBus.emit({
            type: "SHOP_PURCHASE",
            playerId: currentState.session.playerId,
            npcId: session.npcId,
            itemId: "fish:sell-all",
            quantity: units,
            totalPrice: total,
          });
          eventBus.emit({
            type: "GOLD_CHANGED",
            playerId: currentState.session.playerId,
            balance: gold.balance,
            delta: total,
            reason: "fish-sell",
          });
          return { ...currentState, player };
        }
        // Atomic purchase: validate (real balance) → ledger-guarded apply.
        const res = validatePurchase({
          npcId: session.npcId,
          itemKey: command.itemId,
          quantity: command.quantity,
          goldAvailable: gold.balance,
        });
        if (!res.ok) return currentState;
        {
          const txId = `shop:${txSeq++}`;
          const done = applyShopPurchase(gold, currentState.player.inventory, res.intent, txId);
          if (!done.applied) return currentState;
          const player = { ...currentState.player, inventory: done.inventory };
          gold = done.gold;
          eventBus.emit({
            type: "SHOP_PURCHASE",
            playerId: currentState.session.playerId,
            npcId: res.intent.npcId,
            itemId: res.intent.itemKey,
            quantity: res.intent.quantity,
            totalPrice: res.intent.totalPrice,
          });
          eventBus.emit({
            type: "GOLD_CHANGED",
            playerId: currentState.session.playerId,
            balance: gold.balance,
            delta: -res.intent.totalPrice,
            reason: "shop-buy",
          });
          eventBus.emit({
            type: "ITEM_GRANTED",
            playerId: currentState.session.playerId,
            itemId: res.intent.itemKey,
            quantity: res.intent.quantity,
            source: txId,
          });
          return { ...currentState, player };
        }
      }
      case "SHOP_CLOSE": {
        if (!session || session.kind !== "SHOP") return currentState;
        if (command.playerId !== playerId) return currentState;
        const npcId = session.npcId;
        session = null;
        eventBus.emit({
          type: "SHOP_CLOSE",
          playerId: currentState.session.playerId,
          npcId,
        });
        return currentState;
      }
      case "FORGE_CRAFT": {
        if (!session || session.kind !== "FORGE") return currentState;
        if (command.playerId !== playerId) return currentState;
        // Forge upgrades the CURRENT weapon only (prototype verbatim).
        if (command.equipmentId !== currentState.player.equipment.weaponId) {
          return currentState;
        }
        // currentPlus/bijih/gold availability: real inventory + balance.
        // weaponPlus has no persisted history yet → session starts at the
        // production default (0); the cap is enforced against it (documented).
        const bijih =
          currentState.player.inventory.items.find((i) => i.itemId === "bijih")?.quantity ?? 0;
        const res = validateForge({
          npcId: session.npcId,
          weaponId: command.equipmentId,
          currentPlus: currentState.player.equipment.weaponPlus ?? 0,
          bijihAvailable: bijih,
          goldAvailable: gold.balance,
        });
        if (!res.ok) return currentState;
        {
          const txId = `forge:${txSeq++}`;
          const done = applyForgeUpgrade(gold, currentState.player.inventory, res.intent, txId);
          if (!done.applied || done.weaponPlus === undefined) return currentState;
          const player = {
            ...currentState.player,
            inventory: done.inventory,
            equipment: { ...currentState.player.equipment, weaponPlus: done.weaponPlus },
          };
          gold = done.gold;
          eventBus.emit({
            type: "FORGE_REQUEST",
            playerId: currentState.session.playerId,
            npcId: res.intent.npcId,
            equipmentId: res.intent.weaponId,
            plus: res.intent.plus,
          });
          eventBus.emit({
            type: "GOLD_CHANGED",
            playerId: currentState.session.playerId,
            balance: gold.balance,
            delta: -res.intent.goldCost,
            reason: "forge",
          });
          eventBus.emit({
            type: "EQUIPMENT_UPGRADED",
            playerId: currentState.session.playerId,
            weaponId: res.intent.weaponId,
            plus: res.intent.plus,
          });
          return { ...currentState, player };
        }
      }
      case "FORGE_CLOSE": {
        if (!session || session.kind !== "FORGE") return currentState;
        if (command.playerId !== playerId) return currentState;
        const npcId = session.npcId;
        // Return to the shop menu (prototype single menu), silently.
        session = { kind: "SHOP", npcId };
        eventBus.emit({
          type: "FORGE_CLOSE",
          playerId: currentState.session.playerId,
          npcId,
        });
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

      // Respawn timers for defeated non-boss enemies (canonical maps,
      // no active battle). Wall-clock dt from the fixed-timestep loop.
      {
        const cm = getCanonicalMap(state.world.mapId);
        if (cm && state.battle === null) {
          const pt = normToTile(cm, state.player.position);
          if (pt) liveEnemies = tickRespawns(liveEnemies, dtMs, pt);
        }
      }

      // Update camera to follow player
      camera = followTarget(camera, state.player.position);
    },
    // Render (every frame)
    () => {
      renderer.render(state, camera, liveEnemies, config.allowedNpcIds);
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
    const interaction = findNearestInteraction(state.world, state.player.position);
    if (!interaction) return false;
    if (interaction.kind !== "NPC" || !config.allowedNpcIds) return true;
    return config.allowedNpcIds.includes(interaction.ref.replace(/^npc\./, ""));
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

    const result = processInteraction(interaction, state.player.inventory);
    // Programmatic callers (such as the touch-friendly preview control) must
    // take the same reducer path as the E key. Returning an interaction summary
    // alone was presentation-only and could not start a canonical dialogue.
    state = processCommand(state, { type: "INTERACT", playerId });
    return result;
  }

  function setFlag(flag: string, value: boolean): void {
    flags = { ...flags, [flag]: value };
  }

  /**
   * Validate + apply a dialogue/victory quest-signal set atomically (P1.7).
   * Returns applied signal kinds, or null when the set is rejected whole
   * (no partial mutation, no RNG). QUEST validated against the canonical
   * transition table; FLAG against the 16-name vocab; GOLD/ITEM structurally;
   * SKILL recorded only (availability derives from level, no state).
   */
  function applyQuestSignals(
    currentState: RPGGameState,
    source: string,
    signals: Array<{
      type: string;
      name?: string;
      amount?: number;
      key?: string;
      quantity?: number;
    }>,
  ): { state: RPGGameState; applied: string[] } | null {
    const ctx = { quest: quest.main, kills: quest.kills, flags };
    for (const s of signals) {
      if (s.type === "QUEST") {
        if (typeof s.amount !== "number" || !isValidQuestTransition(quest.main, s.amount, ctx)) {
          return null;
        }
      } else if (s.type === "FLAG") {
        if (!s.name || !QUEST_FLAG_NAMES.includes(s.name)) return null;
      } else if (s.type === "GOLD") {
        if (typeof s.amount !== "number" || s.amount <= 0) return null;
      } else if (s.type === "ITEM") {
        if (!s.key || !canonicalItemById(s.key) || typeof s.quantity !== "number" || s.quantity <= 0) {
          return null;
        }
      } else if (s.type === "SKILL") {
        if (!s.key) return null;
      } else {
        return null;
      }
    }
    let player = currentState.player;
    const applied: string[] = [];
    let questChanged = false;
    for (const s of signals) {
      if (s.type === "QUEST" && typeof s.amount === "number") {
        if (quest.main !== s.amount) {
          quest = { ...quest, main: s.amount };
          questChanged = true;
        }
        applied.push("QUEST");
      } else if (s.type === "FLAG" && s.name) {
        flags = { ...flags, [s.name]: true };
        applied.push("FLAG");
      } else if (s.type === "GOLD" && typeof s.amount === "number") {
        const txId = `quest:${source}`;
        const before = gold.balance;
        gold = creditGold(gold, txId, s.amount, `quest:${source}`);
        if (gold.balance !== before) {
          eventBus.emit({
            type: "GOLD_CHANGED",
            playerId: currentState.session.playerId,
            balance: gold.balance,
            delta: s.amount,
            reason: `quest:${source}`,
          });
        }
        applied.push("GOLD");
      } else if (s.type === "ITEM" && s.key && typeof s.quantity === "number") {
        player = {
          ...player,
          inventory: addItem(player.inventory, s.key, s.quantity),
        };
        eventBus.emit({
          type: "ITEM_GRANTED",
          playerId: currentState.session.playerId,
          itemId: s.key,
          quantity: s.quantity,
          source: `quest:${source}`,
        });
        applied.push("ITEM");
      } else if (s.type === "SKILL") {
        applied.push("SKILL");
      }
    }
    if (questChanged) {
      eventBus.emit({
        type: "QUEST_ADVANCE",
        playerId: currentState.session.playerId,
        quest: quest.main,
        kills: quest.kills,
      });
    }

    // P2.6I.2: Sync dialogue quest/flag mutations to server-authoritative state.
    // Fire-and-forget; server validates independently.
    if (applied.includes("QUEST")) {
      const lastQuest = signals.findLast((s) => s.type === "QUEST" && typeof s.amount === "number");
      if (lastQuest && typeof lastQuest.amount === "number") {
        fireServerCall(
          mutateQuestState("QUEST_ADVANCE", `qk-dlg-${source}`, { to: lastQuest.amount }),
          { key: `q-dlg-${source}`, idempotent: true },
        );
      }
    }
    if (applied.includes("FLAG")) {
      const flagSignals = signals.filter((s) => s.type === "FLAG" && typeof s.name === "string");
      for (const fs of flagSignals) {
        if (fs.name) {
          fireServerCall(
            mutateQuestState("FLAG", `qk-flag-${source}-${fs.name}`, { flagName: fs.name }),
            { key: `q-flag-${source}-${fs.name}`, idempotent: true },
          );
        }
      }
    }

    return { state: { ...currentState, player }, applied };
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
      deadBossIds: [...deadBossIds],
      goldIntents: goldIntents.map((g) => ({ ...g })),
      gold: gold.balance,
      goldLedger: gold.ledger.map((e) => ({ ...e })),
      equipmentIntents: equipmentIntents.map((e) => ({ ...e })),
      quest: { ...quest },
      pickedGe: [...pickedGe],
    });
  }

  function getBattle(): RPGBattleState | null {
    return activeBattle?.state ?? null;
  }

  /**
   * P1.9A learning UX slice (thin pipeline entry points — same validation
   * as input commands; no direct mutation, no client authority).
   */

  /** Client-safe challenge for the pending moment (null unless PENDING). */
  function getLearningChallenge(): LearningChallenge | null {
    const sub = activeBattle?.state.learning;
    if (!sub || sub.status !== "PENDING") return null;
    const resolved = learningChallenges.get(sub.challengeId);
    return resolved ? toClientChallenge(resolved) : null;
  }

  /** Last answer feedback (retained until consumed by an attack/close). */
  function getLearningFeedback(): { correct: boolean } | null {
    return lastLearningFeedback ? { ...lastLearningFeedback } : null;
  }

  /** Submit an answer through the canonical SUBMIT pipeline. */
  function submitLearningAnswer(answer: string): boolean {
    const sub = activeBattle?.state.learning;
    if (!sub || sub.status !== "PENDING") return false;
    state = processCommand(state, {
      type: "SUBMIT_LEARNING_ANSWER",
      playerId,
      challengeId: sub.challengeId,
      answer,
    });

    // P2.6H: Fire server-authoritative learning answer in background.
    // Server evaluates the answer and records the result.
    if (serverBattleId) {
      const requestKey = generateRequestKey();
      fireServerCall(
        submitServerLearningAnswer(serverBattleId, answer, requestKey).then((res) => {
          if (res.ok && res.data.category === "EVALUATED") {
            // P2.6H.4 GAP-5: Server evaluation is authoritative. Update
            // feedback if the server disagrees with the local evaluation.
            // Local processCommand already showed immediate feedback for
            // responsiveness; this correction ensures the final displayed
            // result matches the server's canonical answer.
            const serverCorrect = res.data.evaluation.correct;
            if (lastLearningFeedback && lastLearningFeedback.correct !== serverCorrect) {
              lastLearningFeedback = { correct: serverCorrect };
            }
            if (pendingLearning && pendingLearning.correct !== serverCorrect) {
              pendingLearning = { correct: serverCorrect };
            }
          }
        }),
        { key: `answer-${serverBattleId}`, idempotent: true },
      );
    }

    return activeBattle?.state.learning?.status === "RESOLVED";
  }

  /** Attack the first living enemy with a basic attack (slice flow). */
  function attackBasic(): boolean {
    if (!activeBattle || state.battle === null) return false;
    const foeId = activeBattle.state.enemies.find((e) => e.hp > 0)?.id;
    if (!foeId) return false;
    const before = activeBattle.state.turn;
    state = processCommand(state, {
      type: "ATTACK",
      playerId,
      targetId: foeId,
      skillId: "basic",
    });

    // P2.6H: Fire server-authoritative battle action in background.
    // Server resolves damage/HP/turn and returns updated projection.
    if (serverBattleId) {
      const requestKey = generateRequestKey();
      fireServerCall(
        submitServerBattleAction(serverBattleId, "basic_attack", requestKey).then((res) => {
          if (res.ok) {
            reconcileServerBattle(res.data.battle);
            // P2.6H.3 GAP-3: Settle deferred defeat after server confirms
            // the terminal state. Only applies when server returns LOST and
            // local defeat was deferred in processCommand.
            if (res.data.battle.status === "LOST" && pendingDefeat) {
              const pd = pendingDefeat;
              pendingDefeat = null;
              state = applyDefeatFlow(state, pd.state, pd.foeId);
            }
          }
        }),
        { key: `action-${serverBattleId}`, idempotent: true },
      );
    }

    return (activeBattle?.state.turn ?? before) > before;
  }

  /** Skill attack vs first living enemy (core validates unlock/MP/turn). */
  function attackWithSkill(skillId: string): boolean {
    if (!activeBattle || state.battle === null) return false;
    const foeId = activeBattle.state.enemies.find((e) => e.hp > 0)?.id;
    if (!foeId) return false;
    const before = activeBattle.state.turn;
    state = processCommand(state, {
      type: "ATTACK",
      playerId,
      targetId: foeId,
      skillId,
    });

    // P2.6H.2: Fire server-authoritative skill action in background.
    // Server validates skill against canonical definitions and resolves damage.
    if (serverBattleId) {
      const requestKey = generateRequestKey();
      fireServerCall(
        submitServerBattleAction(serverBattleId, "skill", requestKey, skillId).then((res) => {
          if (res.ok) {
            reconcileServerBattle(res.data.battle);
            // P2.6H.3 GAP-3: Settle deferred defeat after server confirms
            // the terminal state.
            if (res.data.battle.status === "LOST" && pendingDefeat) {
              const pd = pendingDefeat;
              pendingDefeat = null;
              state = applyDefeatFlow(state, pd.state, pd.foeId);
            }
          }
        }),
        { key: `action-${serverBattleId}`, idempotent: true },
      );
    }

    return (activeBattle?.state.turn ?? before) > before;
  }

  /** Consumable through the canonical USE_ITEM path (world or battle). */
  function useItem(itemId: string): boolean {
    if (state.battle !== null && !activeBattle) return false;
    if (state.battle !== null) {
      const beforeHp = activeBattle?.state.player.hp;
      const beforeInv = JSON.stringify(state.player.inventory);
      state = processCommand(state, { type: "USE_ITEM", playerId, itemId });
      // P2.6H.3 GAP-3: USE_ITEM has no server call — settle deferred defeat
      // immediately (server doesn't track item usage).
      if (pendingDefeat) {
        const pd = pendingDefeat;
        pendingDefeat = null;
        state = applyDefeatFlow(state, pd.state, pd.foeId);
      }
      return (
        JSON.stringify(state.player.inventory) !== beforeInv ||
        activeBattle?.state.player.hp !== beforeHp
      );
    }
    const before = JSON.stringify(state.player.inventory) + JSON.stringify(state.player.stats);
    state = processCommand(state, { type: "USE_ITEM", playerId, itemId });
    return JSON.stringify(state.player.inventory) + JSON.stringify(state.player.stats) !== before;
  }

  /** Escape through the canonical BATTLE_ESCAPE path. */
  function fleeBattle(): boolean {
    if (!activeBattle || state.battle === null) return false;
    const id = activeBattle.state.battleId;
    state = processCommand(state, { type: "BATTLE_ESCAPE", playerId, battleId: id });

    // P2.6H.3 GAP-2: Fire server-authoritative flee action in background.
    // Server resolves flee probability, boss restriction, and persists FLED status.
    if (serverBattleId) {
      const requestKey = generateRequestKey();
      fireServerCall(
        submitServerBattleAction(serverBattleId, "flee", requestKey).then((res) => {
          if (res.ok) {
            reconcileServerBattle(res.data.battle);
            // P2.6H.3 GAP-3: Settle deferred defeat after server confirms
            // the terminal state (failed flee → enemy kills player).
            if (res.data.battle.status === "LOST" && pendingDefeat) {
              const pd = pendingDefeat;
              pendingDefeat = null;
              state = applyDefeatFlow(state, pd.state, pd.foeId);
            }
          }
        }),
        { key: `flee-${serverBattleId}`, idempotent: true },
      );
    }

    return activeBattle?.state.battleId !== id || activeBattle?.state.result === "FLED";
  }

  function getLiveEnemies(): LiveEnemy[] {
    return liveEnemies.map((e) => ({ ...e, tile: { ...e.tile }, spawnTile: { ...e.spawnTile } }));
  }

  function getGoldIntents(): Array<{ battleId: string; amount: number }> {
    return goldIntents.map((g) => ({ ...g }));
  }

  function getDeadBossIds(): string[] {
    return [...deadBossIds];
  }

  function getQuest(): QuestLineState {
    return { ...quest };
  }

  function getPickedGe(): string[] {
    return [...pickedGe];
  }

  function getGold(): number {
    return gold.balance;
  }

  function getGoldLedger(): GoldLedgerEntry[] {
    return gold.ledger.map((e) => ({ ...e }));
  }

  function getEquipmentIntents(): EquipmentIntent[] {
    return equipmentIntents.map((e) => ({ ...e }));
  }

  function getMode(): RPGInteractionMode {
    if (state.battle !== null) return "BATTLE";
    if (!session) return "WORLD";
    return session.kind;
  }

  function getSession(): DialogueSession | ShopSession | ForgeSession | null {
    return session ? { ...session } : null;
  }

  function advanceActiveDialogue(): boolean {
    if (!session || session.kind !== "DIALOGUE") return false;
    const before = `${session.nodeId}:${session.atEnd}`;
    state = processCommand(state, { type: "DIALOGUE_ADVANCE", playerId });
    return session !== null && `${session.nodeId}:${session.atEnd}` !== before;
  }

  function endActiveDialogue(): boolean {
    if (!session || session.kind !== "DIALOGUE") return false;
    state = processCommand(state, { type: "DIALOGUE_END", playerId });
    return session === null;
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
    getBattle,
    getLearningChallenge,
    getLearningFeedback,
    submitLearningAnswer,
    attackBasic,
    attackWithSkill,
    useItem,
    fleeBattle,
    getLiveEnemies,
    getGoldIntents,
    getDeadBossIds,
    getQuest,
    getPickedGe,
    getGold,
    getGoldLedger,
    getEquipmentIntents,
    getMode,
    getSession,
    advanceActiveDialogue,
    endActiveDialogue,
    on,
    destroy,
    getServerBattleId,
    getServerRewardState,
    getServerCallStatus,
    // Expose for keyboard adapter
    _setInputSource: setInputSource,
    _getInputSource: () => inputSource,
  } as RPGEngine & {
    _setInputSource: (source: RPGInputSource) => void;
    _getInputSource: () => RPGInputSource;
  };
}
