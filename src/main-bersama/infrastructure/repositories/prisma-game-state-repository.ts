// ─── Prisma Game State Repository ───────────────────────────
// Persistence state Game Engine (Jelajah/Kota):
//  - snapshot state (fast recovery),
//  - per-round result sebagai bukti durable (auditable);
//    round sama di-apply ulang → P2002 → ROUND_ALREADY_APPLIED.
// Tidak ada scoring di sini — hanya save/load/map.

import { Prisma, MainGameMode } from '@prisma/client';
import { db } from '@/lib/db';
import type { GameEngineErrorCode } from '../../domain/types/game-engine-result';
import type { GameMode } from '../../domain/types/session';
import type { RoundId } from '../../domain/types/ids';
import { gameModeToDb, gameModeToDomain } from '../persistence/mappers';

// ─── Serializers eksplisit (domain state ↔ JSON) ────────────

export interface JelajahStateJson {
  teams: Record<string, { name: string; symbol: string; progress: number }>;
  appliedRoundIds: string[];
  nextRoundIndex: number;
  totalRounds: number;
}

export interface KotaStateJson {
  target: number;
  correctContribution: number;
  progressPercent: number;
  unlockedMilestones: string[];
  missionCompleted: boolean;
  appliedRoundIds: string[];
  nextRoundIndex: number;
}

export function jelajahStateToJson(state: {
  teams: Record<string, { teamId: string; name: string; symbol: string; progress: number }>;
  appliedRoundIds: string[];
  nextRoundIndex: number;
  totalRounds: number;
}): JelajahStateJson {
  const teams: JelajahStateJson['teams'] = {};
  for (const [teamId, team] of Object.entries(state.teams)) {
    teams[teamId] = { name: team.name, symbol: team.symbol, progress: team.progress };
  }
  return {
    teams,
    appliedRoundIds: [...state.appliedRoundIds],
    nextRoundIndex: state.nextRoundIndex,
    totalRounds: state.totalRounds,
  };
}

export function jelajahStateFromJson(json: unknown): JelajahStateJson {
  if (typeof json !== 'object' || json === null) {
    throw new Error('MainGameState.state korup — bukan objek');
  }
  const obj = json as Record<string, unknown>;
  if (
    typeof obj.teams !== 'object' ||
    obj.teams === null ||
    !Array.isArray(obj.appliedRoundIds) ||
    typeof obj.nextRoundIndex !== 'number' ||
    typeof obj.totalRounds !== 'number'
  ) {
    throw new Error('MainGameState.state korup — struktur jelajah tidak valid');
  }
  return {
    teams: obj.teams as JelajahStateJson['teams'],
    appliedRoundIds: obj.appliedRoundIds as string[],
    nextRoundIndex: obj.nextRoundIndex,
    totalRounds: obj.totalRounds,
  };
}

export function kotaStateToJson(state: {
  target: number;
  correctContribution: number;
  progressPercent: number;
  unlockedMilestones: string[];
  missionCompleted: boolean;
  appliedRoundIds: string[];
  nextRoundIndex: number;
}): KotaStateJson {
  return {
    target: state.target,
    correctContribution: state.correctContribution,
    progressPercent: state.progressPercent,
    unlockedMilestones: [...state.unlockedMilestones],
    missionCompleted: state.missionCompleted,
    appliedRoundIds: [...state.appliedRoundIds],
    nextRoundIndex: state.nextRoundIndex,
  };
}

export function kotaStateFromJson(json: unknown): KotaStateJson {
  if (typeof json !== 'object' || json === null) {
    throw new Error('MainGameState.state korup — bukan objek');
  }
  const obj = json as Record<string, unknown>;
  if (
    typeof obj.target !== 'number' ||
    typeof obj.correctContribution !== 'number' ||
    typeof obj.progressPercent !== 'number' ||
    !Array.isArray(obj.unlockedMilestones) ||
    typeof obj.missionCompleted !== 'boolean' ||
    !Array.isArray(obj.appliedRoundIds) ||
    typeof obj.nextRoundIndex !== 'number'
  ) {
    throw new Error('MainGameState.state korup — struktur kota tidak valid');
  }
  return {
    target: obj.target,
    correctContribution: obj.correctContribution,
    progressPercent: obj.progressPercent,
    unlockedMilestones: obj.unlockedMilestones as string[],
    missionCompleted: obj.missionCompleted,
    appliedRoundIds: obj.appliedRoundIds as string[],
    nextRoundIndex: obj.nextRoundIndex,
  };
}

// ─── Repository ─────────────────────────────────────────────

export type SaveGameRoundResultOutcome =
  | { ok: true; alreadyApplied: boolean }
  | { ok: false; code: Extract<GameEngineErrorCode, 'ROUND_ALREADY_APPLIED'> };

export class PrismaGameStateRepository {
  /** Upsert snapshot state (fast recovery). Idempotent per sesi. */
  async saveGameState(input: {
    sessionId: string;
    gameMode: GameMode;
    state: JelajahStateJson | KotaStateJson;
    final: boolean;
  }): Promise<void> {
    await db.mainGameState.upsert({
      where: { sessionId: input.sessionId },
      create: {
        sessionId: input.sessionId,
        gameMode: gameModeToDb(input.gameMode),
        status: input.final ? 'FINAL' : 'ACTIVE',
        state: input.state as unknown as Prisma.InputJsonValue,
      },
      update: {
        state: input.state as unknown as Prisma.InputJsonValue,
        status: input.final ? 'FINAL' : 'ACTIVE',
      },
    });
  }

  async loadGameState(sessionId: string): Promise<{
    gameMode: GameMode;
    status: 'ACTIVE' | 'FINAL';
    state: unknown;
  } | null> {
    const row = await db.mainGameState.findUnique({ where: { sessionId } });
    if (!row) return null;
    return {
      gameMode: gameModeToDomain(row.gameMode),
      status: row.status === 'FINAL' ? 'FINAL' : 'ACTIVE',
      state: row.state,
    };
  }

  /**
   * Bukti apply round — durable idempotency.
   * Insert pertama ok; P2002 (sessionId+gameMode+roundId) → sudah applied.
   */
  async saveGameRoundResult(input: {
    sessionId: string;
    gameMode: GameMode;
    roundId: RoundId;
    result: unknown;
  }): Promise<SaveGameRoundResultOutcome> {
    const state = await db.mainGameState.findUnique({
      where: { sessionId: input.sessionId },
      select: { id: true },
    });
    if (!state) return { ok: false, code: 'ROUND_ALREADY_APPLIED' };
    try {
      await db.mainGameRoundResult.create({
        data: {
          sessionId: input.sessionId,
          gameStateId: state.id,
          roundId: input.roundId,
          gameMode: gameModeToDb(input.gameMode),
          result: input.result as unknown as Prisma.InputJsonValue,
        },
      });
      return { ok: true, alreadyApplied: false };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return { ok: false, code: 'ROUND_ALREADY_APPLIED' };
      }
      throw error;
    }
  }

  /** Semua round result sesi (recovery/audit/report). */
  async findGameRoundResults(sessionId: string): Promise<
    { roundId: RoundId; gameMode: GameMode; result: unknown; createdAt: Date }[]
  > {
    const rows = await db.mainGameRoundResult.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => ({
      roundId: row.roundId as RoundId,
      gameMode: gameModeToDomain(row.gameMode),
      result: row.result,
      createdAt: row.createdAt,
    }));
  }

  /** Round result sudah ada? (cek idempotency tanpa insert) */
  async hasGameRoundResult(
    sessionId: string,
    roundId: RoundId,
  ): Promise<boolean> {
    const count = await db.mainGameRoundResult.count({
      where: { sessionId, roundId },
    });
    return count > 0;
  }
}

export { MainGameMode };
