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
  /** Preserved equipment intents (unmapped prototype gear). */
  equipmentIntents?: Array<{ source: string; kind: "wpn" | "arm"; key: string }>;
  /** Authoritative main-line quest state (P1.7). */
  quest?: { main: number; kills: number; flowers: number };
  /** Picked golden-flower tiles `map:x,y` (Bunga Emas, P1.9B). */
  pickedGe?: string[];
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
    equipmentIntents?: Array<{ source: string; kind: "wpn" | "arm"; key: string }>;
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
