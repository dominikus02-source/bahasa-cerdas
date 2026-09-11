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
  };
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

      const data = JSON.parse(raw) as RPGSaveData;

      // Validate version
      if (data.version !== SAVE_VERSION) {
        console.warn("Incompatible save version, clearing");
        localStorage.removeItem(saveKey);
        return null;
      }

      // Validate required fields
      if (!data.session?.playerId || !data.player?.id) {
        console.warn("Invalid save data, clearing");
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
        // World will be reloaded from map data by the engine
        world: {} as RPGWorldState,
        battle: null,
        quests: { active: [], completed: [] },
        flags: data.world?.flags ?? {},
        openedChests: data.world?.openedChests ?? [],
        deadBossIds: data.world?.deadBossIds ?? [],
        goldIntents: data.world?.goldIntents ?? [],
        gold: data.world?.gold,
        goldLedger: data.world?.goldLedger,
        equipmentIntents: data.world?.equipmentIntents,
        learning: {
          profile: { playerId: data.session.playerId, mastery: {} },
          activeChallengeId: null,
        },
      };
    } catch (e) {
      console.warn("Failed to load save:", e);
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
