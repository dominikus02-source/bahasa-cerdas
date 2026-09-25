/**
 * Encounter table — Pendekar Suryakerta (P1.4C BATTLE RUNTIME).
 *
 * Pure runtime model over canonical spawns (data/world-maps.ts):
 * - Bosses stay dead once defeated (persisted via deadBossIds).
 * - Non-bosses respawn on the prototype timer (70s, retried in 1.5s while
 *   the player camps the spawn) at their spawn tile.
 * - No enemy AI, no pathfinding, no rendering info — positions are tiles.
 *
 * Transcribed behavior: prototype loadEnemies (boss filter via G.dead) +
 * updateWorld respawn block (rt-=dt; revive if manhattan(player,spawn)>3
 * else rt=1.5; revive at sx,sy).
 */

import type { CanonicalEnemySpawn } from "../data/world-maps";
import type { RPGEnemyDefinition } from "../data/enemies";
import { canonicalEnemyByPrototypeKey } from "../data/enemies";

/** Prototype respawn cadence, verbatim (seconds → ms). */
export const ENEMY_RESPAWN_MS = 70000;
export const ENEMY_RESPAWN_RETRY_MS = 1500;
/** Revive only when the player is farther than this (manhattan, tiles). */
export const ENEMY_RESPAWN_DISTANCE = 3;

/** One live (or respawning) enemy instance. */
export interface LiveEnemy {
  instanceId: string;
  def: RPGEnemyDefinition;
  tile: { x: number; y: number };
  spawnTile: { x: number; y: number };
  boss: boolean;
  alive: boolean;
  /** ms until respawn check (non-bosses only; 0 = ready/alive). */
  respawnMs: number;
}

/**
 * Build the live table for a map. Bosses in deadBossIds are excluded.
 * Spawns whose type has no canonical definition are SKIPPED (reported, never
 * invented) — all 13 shipped spawns resolve, so this stays empty in practice.
 */
export function buildEncounterTable(
  spawns: CanonicalEnemySpawn[],
  deadBossIds: ReadonlySet<string>,
): { table: LiveEnemy[]; skippedSpawnIds: string[] } {
  const table: LiveEnemy[] = [];
  const skippedSpawnIds: string[] = [];
  for (const s of spawns) {
    const def = canonicalEnemyByPrototypeKey(s.type);
    if (!def) {
      skippedSpawnIds.push(s.id);
      continue;
    }
    if (def.boss === true && deadBossIds.has(s.id)) continue;
    table.push({
      instanceId: s.id,
      def,
      tile: { x: s.x, y: s.y },
      spawnTile: { x: s.x, y: s.y },
      boss: def.boss === true,
      alive: true,
      respawnMs: 0,
    });
  }
  return { table, skippedSpawnIds };
}



/** Canonical Menara Angin wave builder, ported from prototype spawnWave(). */
export function buildTowerWave(
  floor: number,
  deadBossIds: ReadonlySet<string>,
): LiveEnemy[] {
  const fl = Math.max(1, Math.floor(floor));
  const spots: Array<[number, number]> = [
    [5, 5], [18, 5], [5, 13], [18, 13], [12, 8], [8, 16], [15, 16],
  ];

  let types: string[];
  if (fl === 5) {
    types = ["ga"];
  } else if (fl === 10) {
    types = ["tw", "sh"];
  } else {
    const pool =
      fl < 3 ? ["g", "g", "w"]
      : fl < 5 ? ["w", "w", "gl", "sh"]
      : fl < 8 ? ["w", "gl", "sh", "gl"]
      : fl < 10 ? ["sh", "gl", "w", "ga"]
      : ["ga", "sh", "gl", "gl"];
    const count = Math.min(5, 3 + Math.floor(fl / 3));
    // Prototype used seeded placement only for wave composition; use a small
    // deterministic indexer here so tests and replays remain stable.
    types = Array.from({ length: count }, (_, i) => pool[(fl * 7919 + 13 + i * 17) % pool.length]);
  }

  return types.flatMap((prototypeKey, i) => {
    const def = canonicalEnemyByPrototypeKey(prototypeKey);
    if (!def) return [];
    const boss = def.boss === true;
    const instanceId = `twr${fl}_${i}`;
    if (boss && deadBossIds.has(instanceId)) return [];
    const multiplier = 1 + 0.16 * (fl - 1);
    const scaled: RPGEnemyDefinition = {
      ...def,
      base: {
        hp: Math.round(def.base.hp * multiplier),
        attack: Math.max(1, Math.round(def.base.attack * (0.85 + 0.16 * (fl - 1)))),
        defense: def.base.defense + Math.floor(fl * 0.6),
      },
      xp: Math.round((def.xp ?? 0) * (0.8 + 0.14 * (fl - 1))),
      gold: Math.round((def.gold ?? 0) * (0.8 + 0.12 * (fl - 1))),
    };
    const [x, y] = spots[(i * 3 + fl) % spots.length];
    return [{
      instanceId,
      def: scaled,
      tile: { x, y },
      spawnTile: { x, y },
      boss,
      alive: true,
      respawnMs: 0,
    }];
  });
}

/** Live enemy occupying a tile, if any. */
export function findEncounterAt(
  table: LiveEnemy[],
  tile: { x: number; y: number },
): LiveEnemy | undefined {
  return table.find((e) => e.alive && e.tile.x === tile.x && e.tile.y === tile.y);
}

/** Mark defeated (new array). Bosses stay dead; non-bosses arm the timer. */
export function markDead(table: LiveEnemy[], instanceId: string): LiveEnemy[] {
  return table.map((e) =>
    e.instanceId !== instanceId
      ? e
      : e.boss
        ? { ...e, alive: false, respawnMs: 0 }
        : { ...e, alive: false, respawnMs: ENEMY_RESPAWN_MS },
  );
}

/** Manhattan distance in tiles. */
function manhattan(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Advance respawn timers (dtMs from the fixed-timestep loop) and revive due
 * non-bosses at their spawn tile. Pure — caller owns the clock.
 */
export function tickRespawns(
  table: LiveEnemy[],
  dtMs: number,
  playerTile: { x: number; y: number },
): LiveEnemy[] {
  return table.map((e) => {
    if (e.alive || e.boss || e.respawnMs <= 0) return e;
    const left = e.respawnMs - dtMs;
    if (left > 0) return { ...e, respawnMs: left };
    if (manhattan(playerTile, e.spawnTile) > ENEMY_RESPAWN_DISTANCE) {
      return { ...e, alive: true, tile: { ...e.spawnTile }, respawnMs: 0 };
    }
    return { ...e, respawnMs: ENEMY_RESPAWN_RETRY_MS };
  });
}
