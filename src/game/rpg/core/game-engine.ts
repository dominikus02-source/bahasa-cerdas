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
import { stepTile, interactTile, facingTile } from "../world/world-step";
import { loadCanonicalMap, spawnPosition, enemySpawnsOf } from "../world/map-loader";
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
import type { RPGBattleState } from "../combat/battle-state";
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
  pendakiEntryNode,
  type DialogueSession,
} from "../interaction/dialogue";
import { getDialogueTree, NPC_ROUTING } from "../data/dialogues";
import { getShopMenu, validatePurchase, type ShopSession } from "../interaction/shop";
import { validateForge, type ForgeSession } from "../interaction/forge";
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
  /** Restored gold ledger (dedup continuity across save/load). */
  goldLedger?: GoldLedgerEntry[];
  /** Restored equipment intents (preserved across save/load). */
  equipmentIntents?: EquipmentIntent[];
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
  /** Active battle state, if any (renderer/UI consume only). */
  getBattle(): RPGBattleState | null;
  /** Live encounter table snapshot (debug/tests). */
  getLiveEnemies(): LiveEnemy[];
  /** Unclaimed gold intents for the future economy phase. */
  getGoldIntents(): Array<{ battleId: string; amount: number }>;
  /** Defeated boss instance ids (persisted, never respawn). */
  getDeadBossIds(): string[];
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
  /** Subscribe to events. */
  on(event: string, handler: (data: unknown) => void): () => void;
  /** Stop the engine and clean up. */
  destroy(): void;
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
  // Battle runtime (P1.4C): live encounter table, defeated bosses, unclaimed
  // gold intents, applied-result dedup, and the active battle session.
  // The BATTLE CORE stays pure — this closure owns all mutation.
  const deadBossIds = new Set<string>(config.deadBossIds ?? []);
  let liveEnemies: LiveEnemy[] = [];
  let goldIntents: Array<{ battleId: string; amount: number }> = [
    ...(config.goldIntents ?? []),
  ];
  const appliedBattleIds = new Set<string>();
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
  if (canonicalStart) {
    const built = buildEncounterTable(enemySpawnsOf(canonicalStart), deadBossIds);
    liveEnemies = built.table;
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

  /** Rebuild the live table for a map (portal transitions + defeat respawn). */
  function reloadLiveEnemies(mapId: string): void {
    const canon = getCanonicalMap(mapId);
    if (!canon) return;
    liveEnemies = buildEncounterTable(enemySpawnsOf(canon), deadBossIds).table;
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
    eventBus.emit({ type: "BATTLE_END", battleId: battle.battleId, winnerId: player.id });
    activeBattle = null;
    return { ...currentState, player, battle: null };
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
            const out = interactTile({
              mapId: canon.id,
              tile,
              dir: currentState.player.facing,
              openedChests,
            });
            if (out.kind === "CHEST_OPENED") {
              openedChests.add(out.chestId);
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
                const startNode =
                  out.npcId === "pendaki"
                    ? pendakiEntryNode(Date.now(), restCooldownUntilMs)
                    : undefined;
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
        if (!activeBattle || currentState.battle === null) return currentState;
        if (command.playerId !== playerId) return currentState;
        const b = activeBattle;
        const out = playerAct(
          b.state,
          {
            battleId: b.state.battleId,
            turn: b.state.turn,
            actorId: currentState.player.id,
            targetId: command.targetId,
            skillId: command.skillId,
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
        if (eb.state.result === "LOSE") return applyDefeatFlow(next, eb.state, foeId);
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
          // Enemy stays alive; player keeps position. No rewards.
          eventBus.emit({ type: "BATTLE_END", battleId: b.state.battleId, winnerId: null });
          activeBattle = null;
          next = { ...next, battle: null };
        }
        return next;
      }
      case "USE_ITEM": {
        // Consumables: WORLD mode only. Battle menu (ram/teh/elix) is a
        // battle-UI concern owned by a later phase; the domain gate
        // (BATTLE_RESTRICTED for fish) is already enforced by applyConsume.
        // Prototype parity: STATUS-menu eating is world-side; BARANG-menu
        // battle eating arrives with battle UI. Documented gap, not silence.
        if (currentState.battle !== null || session !== null) return currentState;
        if (command.playerId !== playerId) return currentState;
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
        // P1.7 hook: prototype side-effects as data, explicitly UNAPPLIED.
        if (signals.length > 0) {
          eventBus.emit({
            type: "INTERACTION",
            playerId: currentState.session.playerId,
            interactionId: `int.npc.${npcId}`,
            result: { kind: "DIALOGUE_COMPLETE", npcId, signals, applied: false },
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
      deadBossIds: [...deadBossIds],
      goldIntents: goldIntents.map((g) => ({ ...g })),
      gold: gold.balance,
      goldLedger: gold.ledger.map((e) => ({ ...e })),
      equipmentIntents: equipmentIntents.map((e) => ({ ...e })),
    });
  }

  function getBattle(): RPGBattleState | null {
    return activeBattle?.state ?? null;
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
    getLiveEnemies,
    getGoldIntents,
    getDeadBossIds,
    getGold,
    getGoldLedger,
    getEquipmentIntents,
    getMode,
    getSession,
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
