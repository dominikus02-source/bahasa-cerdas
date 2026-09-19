// ─── Prisma Player Repository ───────────────────────────────
// Implementasi PlayerRepository. Persist identity + team +
// eligibleFromRoundIndex. Liveness (connected) juga dipersist
// sebagai data — realtime layer yang memutakhirkan.

import { db } from '@/lib/db';
import type { MainPlayer } from '../../domain/entities/player';
import type {
  RuntimePlayer,
} from '../../domain/entities/session-runtime-state';
import type { PlayerRepository } from '../../contracts/repositories/player-repository';
import type { PlayerQueryFilter } from '../../contracts/repositories/types';
import {
  playerEntityToRuntime,
  playerToDbCreate,
  playerToRuntime,
  runtimeToPlayerEntity,
} from '../persistence/mappers';

export class PrismaPlayerRepository implements PlayerRepository {
  async findById(id: string): Promise<MainPlayer | null> {
    const row = await db.mainPlayer.findUnique({ where: { id } });
    return row ? runtimeToPlayerEntity(playerToRuntime(row), row.sessionId) : null;
  }

  async findBySession(filter: PlayerQueryFilter): Promise<MainPlayer[]> {
    const rows = await db.mainPlayer.findMany({
      where: {
        sessionId: filter.sessionId,
        ...(filter.connectionStatus
          ? { connected: filter.connectionStatus === 'connected' }
          : {}),
      },
      orderBy: { joinedAt: 'asc' },
    });
    return rows.map((row) => runtimeToPlayerEntity(playerToRuntime(row), row.sessionId));
  }

  /** Runtime form — dipakai loader engine (superset MainPlayer). */
  async findRuntimeBySession(sessionId: string): Promise<RuntimePlayer[]> {
    const rows = await db.mainPlayer.findMany({
      where: { sessionId },
      orderBy: { joinedAt: 'asc' },
    });
    return rows.map((row) => playerToRuntime(row));
  }

  async save(player: MainPlayer): Promise<void> {
    const runtime = playerEntityToRuntime(player);
    await db.mainPlayer.upsert({
      where: { id: player.id },
      create: playerToDbCreate(runtime, player.sessionId),
      update: {
        displayName: runtime.displayName,
        teamId: runtime.teamId,
        eligibleFromRoundIndex: runtime.eligibleFromRoundIndex,
        connected: runtime.connected,
      },
    });
  }

  /** Join dengan guard race: unique(sessionId, userId) untuk authed. */
  async saveRuntime(player: RuntimePlayer, sessionId: string): Promise<void> {
    await db.mainPlayer.upsert({
      where: { id: player.id },
      create: playerToDbCreate(player, sessionId),
      update: {
        displayName: player.displayName,
        teamId: player.teamId,
        connected: player.connected,
      },
    });
  }

  /** Toggle koneksi (disconnect/reconnect) — scoped session+player. */
  async setConnected(sessionId: string, playerId: string, connected: boolean): Promise<void> {
    await db.mainPlayer.updateMany({
      where: { id: playerId, sessionId },
      data: { connected },
    });
  }
}
