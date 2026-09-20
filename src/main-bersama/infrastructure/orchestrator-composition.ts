// ─── Orchestrator Composition Root (Main Bersama) ───────────
// SATU tempat menyusun dependensi orchestrator dari implementasi
// Prisma nyata. Route handler mengimpor dari sini; application
// tetap bebas Prisma/Next. Test memakai fake — bukan file ini.

import { db } from '@/lib/db';
import { systemClock } from '../domain/types/clock';
import type { GameEngineState } from '../games/game-router';
import type {
  MainRoundPort,
  SessionOrchestratorDeps,
} from '../application/services/orchestrator-ports';
import type { RuntimePlayer } from '../domain/entities/session-runtime-state';
import type { MainQuestionSnapshot } from '../domain/entities/question';
import { PrismaPlayerRepository } from './repositories/prisma-player-repository';
import { PrismaRoundRepository } from './repositories/prisma-round-repository';
import { PrismaAnswerRepository } from './repositories/prisma-answer-repository';
import {
  PrismaSessionRepository,
} from './repositories/prisma-session-repository';
import {
  PrismaGameStateRepository,
} from './repositories/prisma-game-state-repository';
import {
  resolvePlayerCredential,
  issuePlayerCredential,
} from './repositories/player-credential';
import {
  getSupabaseRealtimeConfig,
  sendSessionUpdateSignal,
} from './realtime/signal';
import {
  jelajahStateToJson,
  jelajahStateFromJson,
  kotaStateToJson,
  kotaStateFromJson,
} from './repositories/prisma-game-state-repository';
import {
  JELAJAH_DEFAULT_TEAMS,
  JELAJAH_TEAM_KEYS,
} from '../domain/entities/team';
import { SessionEngineResolver } from '../application/services/session-recovery';
import type { TeamId } from '../domain/types/ids';

// ─── Game state serialize/deserialize (runtime ↔ JSON store) ──
// Session-commands bekerja dengan GameEngineState runtime; store
// menyimpan bentuk JSON flat (JelajahStateJson/KotaStateJson).
// Konversi EKSPLISIT di boundary ini — jangan pernah cast diam-diam.

export function serializeGameStateForStore(state: GameEngineState): unknown {
  return state.gameMode === 'jelajah-kata'
    ? jelajahStateToJson(state.jelajah)
    : kotaStateToJson(state.kota);
}

export function deserializeGameStateFromStore(
  gameMode: 'jelajah-kata' | 'kota-cahaya',
  raw: unknown,
): GameEngineState {
  if (gameMode === 'jelajah-kata') {
    const json = jelajahStateFromJson(raw);
    const teams: Record<string, { teamId: TeamId; name: string; symbol: string; progress: number }> = {};
    for (const key of JELAJAH_TEAM_KEYS) {
      const t = json.teams[key];
      const fallback = JELAJAH_DEFAULT_TEAMS[key];
      teams[key] = {
        teamId: key as TeamId,
        name: t?.name ?? fallback.name,
        symbol: t?.symbol ?? fallback.symbol,
        progress: typeof t?.progress === 'number' ? t.progress : 0,
      };
    }
    return {
      gameMode,
      jelajah: {
        teams: teams as never,
        appliedRoundIds: json.appliedRoundIds as never,
        nextRoundIndex: json.nextRoundIndex,
        totalRounds: json.totalRounds,
      },
    };
  }
  const json = kotaStateFromJson(raw);
  return {
    gameMode,
    kota: {
      config: { targetCorrectAnswers: json.target },
      correctContribution: json.correctContribution,
      target: json.target,
      progressPercent: json.progressPercent,
      unlockedMilestones: json.unlockedMilestones as never,
      missionCompleted: json.missionCompleted,
      appliedRoundIds: json.appliedRoundIds as never,
      nextRoundIndex: json.nextRoundIndex,
    },
  };
}

// ─── Players: adapt repo existing → port orchestrator ───────

const playerRepo = new PrismaPlayerRepository();

const playersStore = {
  async saveRuntime(player: RuntimePlayer, sessionId: string): Promise<void> {
    await playerRepo.saveRuntime(player, sessionId);
  },
  async setConnected(sessionId: string, playerId: string, connected: boolean): Promise<void> {
    await playerRepo.setConnected(sessionId, playerId, connected);
  },
  async findBySession(sessionId: string): Promise<RuntimePlayer[]> {
    return playerRepo.findRuntimeBySession(sessionId);
  },
};

// ─── Sessions ───────────────────────────────────────────────

const sessionRepo = new PrismaSessionRepository();

const sessionsStore = {
  async save(session: Parameters<SessionOrchestratorDeps['sessions']['save']>[0]) {
    await sessionRepo.save(session);
  },
  async saveSessionProgress(
    sessionId: string,
    phase: Parameters<SessionOrchestratorDeps['sessions']['saveSessionProgress']>[1],
    currentRoundIndex: number | null,
  ) {
    await sessionRepo.saveSessionProgress(sessionId, phase, currentRoundIndex);
  },
  async savePauseState(sessionId: string, pause: unknown, pausedAt: Date) {
    await sessionRepo.savePauseState(
      sessionId,
      pause as never, // PauseState domain — bentuk cocok, port longgar utk test fake
      pausedAt,
    );
  },
  async findByPin(pin: string) {
    return sessionRepo.findActiveByPin(pin);
  },
  async findByPinForDisplay(pin: string) {
    return sessionRepo.findLatestByPin(pin);
  },
  async findOwnedBy(sessionId: string, teacherId: string) {
    return sessionRepo.findSessionOwnedBy(sessionId, teacherId);
  },
  async findById(sessionId: string) {
    return sessionRepo.findById(sessionId);
  },
};

// ─── Rounds ─────────────────────────────────────────────────

const roundRepo = new PrismaRoundRepository();

const roundsStore = {
  async save(round: MainRoundPort): Promise<void> {
    await roundRepo.save({
      id: round.id,
      sessionId: round.sessionId,
      index: round.index,
      question: round.question as MainQuestionSnapshot,
      eligiblePlayerIds: round.eligiblePlayerIds,
      eligibleTeamIds: round.eligibleTeamIds,
      phase: round.phase,
      openedAt: round.openedAt,
      closesAt: round.closesAt,
      closedAt: round.closedAt,
    });
  },
};

// ─── Answers ────────────────────────────────────────────────

const answerRepo = new PrismaAnswerRepository();

const answersStore = {
  async submitAnswer(input: Parameters<
    SessionOrchestratorDeps['answers']['submitAnswer']
  >[0]) {
    const result = await answerRepo.submitAnswer(input);
    if (!result.ok) {
      // ROUND_NOT_FOUND pada tahap ini tidak mungkin (round sudah
      // divalidasi engine) — petakan defensif ke ROUND_NOT_OPEN semantik.
      const code = result.code === 'ROUND_NOT_FOUND'
        ? ('ANSWER_ALREADY_EXISTS' as const)
        : result.code;
      return { ok: false as const, code };
    }
    return { ok: true as const, status: result.status };
  },
};

// ─── Game states + Kota target ──────────────────────────────

const gameStateRepo = new PrismaGameStateRepository();

const gameStatesStore = {
  async saveGameState(input: {
    sessionId: string;
    gameMode: 'jelajah-kata' | 'kota-cahaya';
    state: unknown;
    final: boolean;
  }) {
    await gameStateRepo.saveGameState({
      sessionId: input.sessionId,
      gameMode: input.gameMode,
      state: serializeGameStateForStore(input.state as GameEngineState) as never,
      final: input.final,
    });
  },
  async saveGameRoundResult(input: Parameters<
    SessionOrchestratorDeps['gameStates']['saveGameRoundResult']
  >[0]) {
    return gameStateRepo.saveGameRoundResult(input);
  },
  async loadGameState(sessionId: string) {
    const gs = await gameStateRepo.loadGameState(sessionId);
    if (!gs) return null;
    return {
      gameMode: gs.gameMode,
      status: gs.status,
      state: deserializeGameStateFromStore(gs.gameMode, gs.state),
    };
  },
};

const kotaTargetStore = {
  async saveKotaTarget(sessionId: string, target: number): Promise<void> {
    await db.mainSession.update({
      where: { id: sessionId },
      data: { kotaTargetCorrect: target },
    });
  },
};

// ─── Credentials (stateless HMAC — §7/§20) ──────────────────

const credentialsStore = {
  issue(playerId: string, sessionId: string): string {
    return issuePlayerCredential(playerId, sessionId);
  },
  async resolve(credential: unknown) {
    return resolvePlayerCredential(credential);
  },
};

// ─── Realtime signal (hardening §3): Supabase Broadcast ─────
// Sinyal invalidation lintas-instance via Supabase realtime server.
// Best-effort: kegagalan TIDAK mengubah hasil command (correctness
// tetap dari HTTP command + GET authoritative, §5). Kegagalan sinyal
// hanya menurunkan freshness UI sampai poll berikutnya.

const realtimeSignal = {
  async sendSessionUpdate(sessionId: string): Promise<void> {
    const config = getSupabaseRealtimeConfig();
    if (!config) return; // dev tanpa env — client fallback polling.
    // Fire-and-forget dengan logging minimal; tidak pernah throw.
    const result = await sendSessionUpdateSignal(config, sessionId, {
      type: 'session:update',
    });
    if (!result.ok) {
      console.warn(
        `[main-bersama] sinyal realtime gagal (${result.code}) — state tetap authoritative via GET.`,
      );
    }
  },
};

// ─── Composed deps ──────────────────────────────────────────

let composed: SessionOrchestratorDeps | null = null;

/**
 * Deps orchestrator production (singleton per proses).
 * Round duration default 60s (session-defaults) — dipakai engine
 * hanya saat membuka round BARU (recovery tidak mengubah deadline).
 */
export function getOrchestratorDeps(): SessionOrchestratorDeps {
  if (!composed) {
    const next: SessionOrchestratorDeps = {
      clock: systemClock,
      resolver: new SessionEngineResolver({
        clock: systemClock,
        roundDurationMs: 60_000,
      }),
      players: playersStore,
      sessions: sessionsStore,
      rounds: roundsStore,
      answers: answersStore,
      gameStates: gameStatesStore,
      kotaTarget: kotaTargetStore,
      credentials: credentialsStore,
      realtimeSignal,
    };
    composed = next;
  }
  return composed;
}
