/**
 * Canonical map loader — Pendekar Suryakerta (P1E.2).
 *
 * Builds runtime RPGWorldState from canonical map data (data/world-maps.ts).
 * The loader is the ONLY bridge between canonical maps and the world-state
 * pipeline: gameplay code never reads baked grids directly for rendering.
 *
 * Tile grid ids are opaque strings (`tile.<n>`) derived deterministically
 * from canonical numeric tiles. No invented terrain semantics — the existing
 * renderer draws unknown ids with its generic fallback, which is correct:
 * the world must work without final visual assets.
 *
 * Portals, chests and NPCs become RPGInteractionPoints (kind PORTAL / CHEST /
 * NPC, ref = target map id / chest id / npc id). Enemy spawns are exposed
 * for the future spawner/battle phases and are NOT instantiated here
 * (no enemy AI redesign in this phase).
 */

import type { CanonicalMap, CanonicalMapId, CanonicalEnemySpawn } from "../data/world-maps";
import { getCanonicalMap, RPG_TILES } from "../data/world-maps";
import { tileToNorm } from "./grid-coords";
import type { RPGWorldState, RPGInteractionPoint } from "./world-state";

/** Opaque but deterministic tile id for a canonical numeric tile. */
export function canonicalTileId(tile: number): string {
  return `tile.${tile}`;
}

/** Load a canonical map into runtime world state. Null = unknown map id. */
export function loadCanonicalMap(
  mapId: CanonicalMapId,
  pickedGe?: ReadonlySet<string>,
): RPGWorldState | null {
  const map = getCanonicalMap(mapId);
  if (!map) return null;

  const interactions: RPGInteractionPoint[] = [
    ...map.portals.map((p, i): RPGInteractionPoint => ({
      id: `int.portal.${map.id}.${i}`,
      kind: "PORTAL",
      position: tileToNorm(map, p.x, p.y),
      ref: p.to,
    })),
    ...map.chests.map((c): RPGInteractionPoint => ({
      id: `int.chest.${c.id}`,
      kind: "CHEST",
      position: tileToNorm(map, c.x, c.y),
      ref: `chest.${c.id}`,
    })),
    ...map.npcSpawns.map((n): RPGInteractionPoint => ({
      id: `int.npc.${n.id}`,
      kind: "NPC",
      position: tileToNorm(map, n.x, n.y),
      ref: `npc.${n.id}`,
    })),
  ];

  // Already-picked golden flowers render as grass (prototype rebuilds maps
  // from builders on load; picked[] blocks re-pickup — same semantics here:
  // canonical grids stay pristine, only the loaded copy is stripped).
  const tiles = map.tiles.map(canonicalTileId);
  if (pickedGe) {
    for (const key of pickedGe) {
      const [m, rest] = key.split(":");
      if (m !== map.id || !rest) continue;
      const [xs, ys] = rest.split(",");
      const x = Number(xs);
      const y = Number(ys);
      if (Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < map.width && y < map.height) {
        tiles[y * map.width + x] = canonicalTileId(RPG_TILES.GR);
      }
    }
  }

  return {
    mapId: map.id,
    tiles: {
      width: map.width,
      height: map.height,
      tiles,
    },
    entities: [],
    interactions,
  };
}

/** Enemy spawn list for a map (future spawner input — positions verbatim). */
export function enemySpawnsOf(map: CanonicalMap): CanonicalEnemySpawn[] {
  return map.enemySpawns;
}

/**
 * Player placement after entering a map: canonical spawn tile → normalized
 * center. Used for fresh spawns AND portal destinations (prototype goPortal
 * sets tx/ty then px=tx*TS — tile-anchored, same semantics).
 */
export function spawnPosition(map: CanonicalMap, x: number, y: number) {
  return tileToNorm(map, x, y);
}
