/**
 * Persistence boundary — save/load game state.
 *
 * This module defines the contract for saving and loading game state.
 * The current implementation uses localStorage, but the architecture
 * allows swapping to server persistence without changing game systems.
 *
 * Pipeline:
 *   Game State → Serialize → Save → (localStorage | server)
 *   (localStorage | server) → Load → Deserialize → Game State
 *
 * Rules:
 * - Serialization must be lossless (JSON round-trip)
 * - Invalid saves are rejected (fallback to defaults)
 * - Save key is namespaced to avoid collisions
 */

import type { RPGGameState } from "./game-state";
import type { RPGPlayerState } from "../player/player-state";
import type { RPGPlayerStats } from "../player/player-state";
import type { RPGWorldState } from "../world/world-state";
import type { RPGProgression } from "../player/player-state";
import type { PendekarWorldState } from "@/lib/game/rpg/server-contracts";
import type { RPGQuestStatus } from "../quests/quest-engine";

/** Persistence interface — implementable for localStorage or server. */
export interface RPGPersistence {
  save(state: RPGGameState & Partial<RPGMapSideState>): boolean;
  load(): (RPGGameState & Partial<RPGMapSideState>) | null;
  clear(): void;
  exists(): boolean;
}

/**
 * Optional map-side runtime state (quest flags, opened chests).
 * Tracked by later phases; the save schema already carries it so first use
 * needs no migration and no SAVE_VERSION bump (absent = defaults).
 */
export interface RPGMapSideState {
  flags?: Record<string, boolean>;
  openedChests?: string[];
  /** Defeated boss instance ids (persisted; bosses never respawn). */
  deadBossIds?: string[];
  /** Unclaimed gold intents for the future economy phase (never dropped). */
  goldIntents?: Array<{ battleId: string; amount: number }>;
  /** Spendable gold balance (canonical economy, P1.6). */
  gold?: number;
  /** Gold audit ledger (append-only). */
  goldLedger?: Array<{ id: string; delta: number; reason: string }>;
  /** Preserved equipment intents (resolved prototype gear). */
  equipmentIntents?: Array<{ source: string; kind: "wpn" | "arm"; key: string; equipmentKey: string }>;
  /** Authoritative main-line quest state (P1.7). */
  quest?: { main: number; kills: number; flowers: number };
  /** Picked golden-flower tiles `map:x,y` (Bunga Emas, P1.9B). */
  pickedGe?: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// P2.6I.1: Server-snapshot cache — replaces legacy localStorage as authority.
// ────────────────────────────────────────────────────────────────────────────

/** Cache version — bumped when the cache schema changes. Old versions fail closed. */
const RPG_STATE_CACHE_VERSION = 1;

/** localStorage key prefix for the versioned server-snapshot cache. */
const SERVER_CACHE_KEY_PREFIX = "bahasacerdas.rpg.server_cache.";

/** Legacy save key (pre-P2.6I.1) — used only for migration detection. */
const LEGACY_SAVE_KEY_PREFIX = "bahasacerdas.rpg.save.";

export interface ServerSnapshotCache {
  version: number;
  cachedAt: number;
  playerId: string;
  /** Server version (optimistic concurrency token). */
  serverVersion: number;
  /** Server stateSchemaVersion. */
  stateSchemaVersion: number;
  player: {
    mapKey: string;
    position: { x: number; y: number };
    facing: string;
    stats: { hp: number; maxHp: number; mp: number; maxMp: number; attack: number; defense: number; speed: number };
    progression: { level: number; xp: number };
    wallet: { goldBalance: number };
  };
  inventory: Array<{ itemKey: string; quantity: number }>;
  quests: Array<{ questKey: string; status: string; progress: number; target: number; definitionVersion: string; version: number }>;
  worldState: PendekarWorldState;
  activeBattle: unknown | null;
  activeLearning: unknown | null;
}

function isServerSnapshotCache(value: unknown, expectedPlayerId: string): value is ServerSnapshotCache {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (obj.version !== RPG_STATE_CACHE_VERSION) return false;
  if (typeof obj.playerId !== "string" || obj.playerId !== expectedPlayerId) return false;
  if (typeof obj.serverVersion !== "number") return false;
  if (typeof obj.stateSchemaVersion !== "number") return false;
  if (typeof obj.player !== "object" || obj.player === null) return false;
  return true;
}

/**
 * Read the server-snapshot cache. Returns null if missing, stale, malformed,
 * or belonging to a different player. Does NOT mutate localStorage.
 */
export function readServerSnapshotCache(playerId: string): ServerSnapshotCache | null {
  try {
    const key = `${SERVER_CACHE_KEY_PREFIX}${playerId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isServerSnapshotCache(parsed, playerId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Write the server-snapshot cache. Fails closed on any error (returns false).
 */
export function writeServerSnapshotCache(playerId: string, snapshot: ServerSnapshotCache): boolean {
  try {
    const key = `${SERVER_CACHE_KEY_PREFIX}${playerId}`;
    localStorage.setItem(key, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear the server-snapshot cache for a player.
 */
export function clearServerSnapshotCache(playerId: string): void {
  try {
    localStorage.removeItem(`${SERVER_CACHE_KEY_PREFIX}${playerId}`);
  } catch {
    // Storage may be unavailable; best-effort.
  }
}

/**
 * Clear the legacy localStorage save key for a player.
 * Called after successful server hydration to prevent stale local saves
 * from overriding server state on next load.
 */
export function clearLegacySave(playerId: string): void {
  try {
    localStorage.removeItem(`${LEGACY_SAVE_KEY_PREFIX}${playerId}`);
  } catch {
    // Best-effort.
  }
}

// ────────────────────────────────────────────────────────────────────────────
// P2.6I.1: Hydration — convert server snapshot → client game state.
// ────────────────────────────────────────────────────────────────────────────

import type { RPGEquipment } from "../player/player-state";
import type { RPGQuestState } from "../quests/quest-engine";
import type { RPGLearningState } from "../learning/learning-engine";

/** XP required per level. Level 1 needs 100, each subsequent level +50%. */
import { xpForLevel } from "../player/progression";

const xpToNextLevel = xpForLevel;

/**
 * Hydrate a `RPGGameState` + `RPGMapSideState` from a server snapshot cache.
 *
 * This is the **sole bridge** between the server-authoritative persistence
 * layer and the client game engine. The resulting state is fully populated
 * and ready to hand to the engine's `load()` path.
 */
export function hydrateFromServerSnapshot(
  snapshot: ServerSnapshotCache,
  playerId: string,
): RPGGameState & Partial<RPGMapSideState> {
  const ws = snapshot.worldState;

  const stats: RPGPlayerStats = {
    hp: snapshot.player.stats.hp,
    maxHp: snapshot.player.stats.maxHp,
    mp: snapshot.player.stats.mp,
    maxMp: snapshot.player.stats.maxMp,
    attack: snapshot.player.stats.attack,
    defense: snapshot.player.stats.defense,
    speed: snapshot.player.stats.speed,
  };

  const level = snapshot.player.progression.level;
  const xp = snapshot.player.progression.xp;

  const progression: RPGProgression = {
    level,
    xp,
    xpToNextLevel: xpToNextLevel(level),
  };

  const equipment: RPGEquipment = {
    weaponId: ws.equipment.weaponId,
    armorId: ws.equipment.armorId,
    accessoryId: ws.equipment.accessoryId,
    weaponPlus: ws.equipment.weaponPlus ?? 0,
  };

  const player: RPGPlayerState = {
    id: playerId,
    name: "Pendekar",
    position: { ...snapshot.player.position },
    facing: snapshot.player.facing as "up" | "down" | "left" | "right",
    stats,
    progression,
    inventory: {
      items: snapshot.inventory.map((it) => ({ itemId: it.itemKey, quantity: it.quantity })),
    },
    equipment,
  };

  const world: RPGWorldState = {
    mapId: snapshot.player.mapKey,
    tiles: { width: 0, height: 0, tiles: [] },
    entities: [],
    interactions: [],
  } as RPGWorldState;

  const quests: RPGQuestState = {
    active: snapshot.quests
      .filter((q) => q.status !== "COMPLETED")
      .map((q) => ({
        questId: q.questKey,
        status: q.status as RPGQuestStatus,
        progress: q.progress,
      })),
    completed: snapshot.quests
      .filter((q) => q.status === "COMPLETED")
      .map((q) => ({
        questId: q.questKey,
        status: "COMPLETED" as const,
        progress: q.progress,
      })),
  };

  const learning: RPGLearningState = {
    profile: { playerId, mastery: {} },
    activeChallengeId: null,
  };

  return {
    session: {
      sessionId: crypto.randomUUID(),
      playerId,
      startedAt: snapshot.cachedAt,
      mode: "ADVENTURE",
    },
    player,
    world,
    battle: null,
    quests,
    learning,
    // MapSideState (P2.6I.1 world-state columns)
    flags: ws.flags,
    openedChests: ws.openedChests,
    deadBossIds: ws.deadBossIds,
    equipmentIntents: [],
    gold: snapshot.player.wallet.goldBalance,
    goldLedger: [],
    goldIntents: [],
    quest: ws.quest,
    pickedGe: ws.pickedGe,
  };
}

/**
 * Read the server-snapshot cache for a given player, hydrate it into a full
 * game state, and optionally clear the legacy localStorage save.
 *
 * Returns `null` if:
 * - No cache exists for this player
 * - Cache is stale / malformed / cross-player
 * - Hydration produces invalid state
 */
export function loadServerSnapshot(
  playerId: string,
  opts?: { clearLegacy?: boolean },
): (RPGGameState & Partial<RPGMapSideState>) | null {
  const snapshot = readServerSnapshotCache(playerId);
  if (!snapshot) return null;

  try {
    const state = hydrateFromServerSnapshot(snapshot, playerId);

    // Clear legacy save after successful hydration (one-time migration)
    if (opts?.clearLegacy) {
      clearLegacySave(playerId);
    }

    return state;
  } catch {
    // Hydration failed — treat as stale cache
    clearServerSnapshotCache(playerId);
    return null;
  }
}

/** Save data format — what gets serialized. */
interface RPGSaveData {
  version: number;
  timestamp: number;
  session: {
    sessionId: string;
    playerId: string;
  };
  player: {
    id: string;
    name: string;
    position: { x: number; y: number };
    facing: string;
    stats: RPGPlayerStats;
    progression: {
      level: number;
      xp: number;
      xpToNextLevel: number;
    };
    inventory: {
      items: Array<{ itemId: string; quantity: number }>;
    };
    equipment: {
      weaponId: string | null;
      armorId: string | null;
      accessoryId: string | null;
    };
  };
  world: {
    mapId: string;
    /** Quest flags (quests/flags.ts vocabulary). Absent = all false. */
    flags?: Record<string, boolean>;
    openedChests?: string[];
    deadBossIds?: string[];
    goldIntents?: Array<{ battleId: string; amount: number }>;
    gold?: number;
    goldLedger?: Array<{ id: string; delta: number; reason: string }>;
  equipmentIntents?: Array<{ source: string; kind: "wpn" | "arm"; key: string; equipmentKey: string }>;
    quest?: { main: number; kills: number; flowers: number };
    pickedGe?: string[];
  };
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isValidOptionalWorldState(world: UnknownRecord): boolean {
  if (world.flags !== undefined && (!isRecord(world.flags) || !Object.values(world.flags).every((value) => typeof value === "boolean"))) return false;
  if (world.openedChests !== undefined && !isStringArray(world.openedChests)) return false;
  if (world.deadBossIds !== undefined && !isStringArray(world.deadBossIds)) return false;
  if (world.pickedGe !== undefined && !isStringArray(world.pickedGe)) return false;
  if (world.gold !== undefined && (!isFiniteNumber(world.gold) || world.gold < 0)) return false;
  if (world.quest !== undefined) {
    const quest = world.quest;
    if (!isRecord(quest) || !["main", "kills", "flowers"].every((key) => Number.isInteger(quest[key]) && (quest[key] as number) >= 0)) return false;
  }
  return true;
}

/**
 * Reject partial or cross-player JSON before it reaches the engine. The save
 * is still deliberately browser-owned, but a damaged localStorage entry must
 * recover to a clean slice rather than produce invalid player/world state.
 */
function isUsableSaveData(value: unknown, expectedPlayerId: string): value is RPGSaveData {
  if (!isRecord(value) || value.version !== SAVE_VERSION) return false;
  if (!isRecord(value.session) || value.session.playerId !== expectedPlayerId) return false;
  if (!isRecord(value.player) || value.player.id !== expectedPlayerId) return false;
  if (!isRecord(value.world) || typeof value.world.mapId !== "string" || !value.world.mapId || !isValidOptionalWorldState(value.world)) return false;

  const position = value.player.position;
  if (!isRecord(position) || !isFiniteNumber(position.x) || !isFiniteNumber(position.y)) return false;
  if (position.x < 0 || position.x > 1 || position.y < 0 || position.y > 1) return false;

  const stats = value.player.stats;
  if (!isRecord(stats) || !["hp", "maxHp", "mp", "maxMp", "attack", "defense", "speed"].every((key) => isFiniteNumber(stats[key]))) {
    return false;
  }
  if ((stats.maxHp as number) <= 0 || (stats.maxMp as number) < 0 || (stats.hp as number) < 0 || (stats.hp as number) > (stats.maxHp as number) || (stats.mp as number) < 0 || (stats.mp as number) > (stats.maxMp as number)) {
    return false;
  }

  const progression = value.player.progression;
  if (!isRecord(progression) || !["level", "xp", "xpToNextLevel"].every((key) => isFiniteNumber(progression[key]))) {
    return false;
  }
  if ((progression.level as number) < 1 || (progression.xp as number) < 0 || (progression.xpToNextLevel as number) <= 0) return false;

  const inventory = value.player.inventory;
  const equipment = value.player.equipment;
  if (!isRecord(inventory) || !Array.isArray(inventory.items) || !inventory.items.every((item) => isRecord(item) && typeof item.itemId === "string" && Number.isInteger(item.quantity) && (item.quantity as number) >= 0)) {
    return false;
  }
  return isRecord(equipment) && ["weaponId", "armorId", "accessoryId"].every((key) => equipment[key] === null || typeof equipment[key] === "string");
}

/** Current save format version. */
const SAVE_VERSION = 1;

/** localStorage key prefix. */
const SAVE_KEY_PREFIX = "bahasacerdas.rpg.save.";

/**
 * Create a localStorage-based persistence implementation.
 */
export function createLocalStoragePersistence(
  playerId: string,
): RPGPersistence {
  const saveKey = `${SAVE_KEY_PREFIX}${playerId}`;

  function save(state: RPGGameState & Partial<RPGMapSideState>): boolean {
    try {
      const saveData: RPGSaveData = {
        version: SAVE_VERSION,
        timestamp: Date.now(),
        session: {
          sessionId: state.session.sessionId,
          playerId: state.session.playerId,
        },
        player: {
          id: state.player.id,
          name: state.player.name,
          position: { ...state.player.position },
          facing: state.player.facing,
          stats: { ...state.player.stats },
          progression: { ...state.player.progression },
          inventory: {
            items: state.player.inventory.items.map((i) => ({ ...i })),
          },
          equipment: { ...state.player.equipment },
        },
        world: {
          mapId: state.world.mapId,
          flags: state.flags,
          openedChests: state.openedChests,
          deadBossIds: state.deadBossIds,
          goldIntents: state.goldIntents,
          gold: state.gold,
          goldLedger: state.goldLedger,
          equipmentIntents: state.equipmentIntents,
          quest: state.quest,
          pickedGe: state.pickedGe,
        },
      };

      localStorage.setItem(saveKey, JSON.stringify(saveData));
      return true;
    } catch {
      return false;
    }
  }

  function load(): (RPGGameState & Partial<RPGMapSideState>) | null {
    try {
      const raw = localStorage.getItem(saveKey);
      if (!raw) return null;

      const data: unknown = JSON.parse(raw);
      if (!isUsableSaveData(data, playerId)) {
        console.warn("Invalid or incompatible RPG save, clearing");
        localStorage.removeItem(saveKey);
        return null;
      }

      // Reconstruct minimal game state
      // Note: full world state would need to be reloaded from map data
      return {
        session: {
          sessionId: data.session.sessionId || crypto.randomUUID(),
          playerId: data.session.playerId,
          startedAt: data.timestamp,
          mode: "ADVENTURE",
        },
        player: {
          id: data.player.id,
          name: data.player.name || "Pendekar",
          position: data.player.position || { x: 0.5, y: 0.5 },
          facing: (data.player.facing as "up" | "down" | "left" | "right") || "down",
          stats: data.player.stats || {
            hp: 100,
            maxHp: 100,
            mp: 20,
            maxMp: 20,
            attack: 10,
            defense: 5,
            speed: 1,
          },
          progression: data.player.progression || {
            level: 1,
            xp: 0,
            xpToNextLevel: 100,
          },
          inventory: data.player.inventory || { items: [] },
          equipment: data.player.equipment || {
            weaponId: null,
            armorId: null,
            accessoryId: null,
          },
        },
        // World grid is rebuilt from map data by the engine; the saved mapId
        // rides along so callers can reload the right map (P1.9C slice).
        world: { mapId: data.world?.mapId ?? "map.village-square" } as RPGWorldState,
        battle: null,
        quests: { active: [], completed: [] },
        flags: data.world?.flags ?? {},
        openedChests: data.world?.openedChests ?? [],
        deadBossIds: data.world?.deadBossIds ?? [],
        goldIntents: data.world?.goldIntents ?? [],
        gold: data.world?.gold,
        goldLedger: data.world?.goldLedger,
        equipmentIntents: data.world?.equipmentIntents,
        quest: data.world?.quest ?? { main: 0, kills: 0, flowers: 0 },
        pickedGe: data.world?.pickedGe ?? [],
        learning: {
          profile: { playerId: data.session.playerId, mastery: {} },
          activeChallengeId: null,
        },
      };
    } catch (e) {
      console.warn("Failed to load save, clearing:", e);
      try {
        localStorage.removeItem(saveKey);
      } catch {
        // Storage may itself be unavailable; load still safely falls back.
      }
      return null;
    }
  }

  function clear(): void {
    localStorage.removeItem(saveKey);
  }

  function exists(): boolean {
    return localStorage.getItem(saveKey) !== null;
  }

  return { save, load, clear, exists };
}

/**
 * Create a no-op persistence (for tests or server-side).
 */
export function createNoopPersistence(): RPGPersistence {
  return {
    save: () => false,
    load: () => null,
    clear: () => {},
    exists: () => false,
  };
}
