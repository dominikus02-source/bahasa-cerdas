/**
 * Multiplayer session boundary.
 *
 * PHASE 0: session identity and membership ONLY — no websocket, no database,
 * no matchmaking. The `RPGSessionManager` contract is the seam a real
 * transport will implement; local single-player satisfies it trivially.
 *
 * Ownership reminder (core/game-state.ts): session membership and world
 * snapshots are AUTHORITATIVE concerns; prediction/interpolation is client.
 */

import type { RPGId } from "../core/constants";

export interface RPGPlayerSessionInfo {
  playerId: RPGId;
  displayName: string;
  joinedAt: number;
}

/** Contract for future local or networked session management. */
export interface RPGSessionManager {
  join(playerId: RPGId, displayName: string): RPGPlayerSessionInfo;
  leave(playerId: RPGId): void;
  list(): readonly RPGPlayerSessionInfo[];
}

/** Local single-player implementation used until a server exists. */
export function createLocalSessionManager(hostId: RPGId, hostName: string): RPGSessionManager {
  const players = new Map<RPGId, RPGPlayerSessionInfo>();
  players.set(hostId, { playerId: hostId, displayName: hostName, joinedAt: Date.now() });
  return {
    join(playerId, displayName) {
      const info: RPGPlayerSessionInfo = { playerId, displayName, joinedAt: Date.now() };
      players.set(playerId, info);
      return info;
    },
    leave(playerId) {
      players.delete(playerId);
    },
    list() {
      return [...players.values()];
    },
  };
}
