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
