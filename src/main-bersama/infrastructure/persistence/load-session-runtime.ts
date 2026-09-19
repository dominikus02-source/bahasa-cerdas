// ─── Session Runtime Loader (Recovery) ──────────────────────
// PostgreSQL → SessionRuntimeState valid untuk SessionEngine.
// Dipakai saat server restart agar sesi berjalan bisa dilanjutkan:
// phase, players, rounds + eligible snapshot, answers, pause info,
// question snapshots.
// TIDAK menghitung ulang scoring — hanya map dari DB.

import type { PrismaClient } from '@prisma/client';
import { db } from '@/lib/db';
import type { Clock } from '../../domain/types/clock';
import type {
  SessionQuestionSource,
  SessionRuntimeState,
} from '../../domain/entities/session-runtime-state';
import type { MainQuestionSnapshot } from '../../domain/entities/question';
import { SessionEngine } from '../../application/services/session-engine';
import {
  gameModeToDomain,
  optionsFromJson,
  pauseFromRow,
  phaseToDomain,
  playerToRuntime,
  roundStatusToDomain,
} from './mappers';

export interface LoadSessionRuntimeOptions {
  sessionId: string;
  clock: Clock;
  /** Durasi round untuk pembukaan round berikutnya (ms). */
  roundDurationMs?: number;
  /** Tx client opsional (untuk test). */
  tx?: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;
}

export type LoadSessionRuntimeResult =
  | { ok: true; engine: SessionEngine }
  | { ok: false; reason: 'SESSION_NOT_FOUND' };

/**
 * Muat sesi + seluruh dependensinya, lalu bangun SessionEngine
 * yang state-nya setara dengan kondisi sebelum restart:
 *  - session (phase, pause durability, currentRoundIndex);
 *  - players (identity, team, eligibleFromRoundIndex, connected);
 *  - question snapshots (position order);
 *  - rounds (opened/closes/closed timestamps + eligible snapshot);
 *  - accepted answers (business uniqueness dijaga DB).
 */
export async function loadSessionRuntime(
  options: LoadSessionRuntimeOptions,
): Promise<LoadSessionRuntimeResult> {
  const client = options.tx ?? db;

  const sessionRow = await client.mainSession.findUnique({
    where: { id: options.sessionId },
  });
  if (!sessionRow) return { ok: false, reason: 'SESSION_NOT_FOUND' };

  const playerRows = await client.mainPlayer.findMany({
    where: { sessionId: sessionRow.id },
    orderBy: { joinedAt: 'asc' },
  });
  const snapshotRows = await client.mainQuestionSnapshot.findMany({
    where: { sessionId: sessionRow.id },
    orderBy: { position: 'asc' },
  });
  const roundRows = await client.mainRound.findMany({
    where: { sessionId: sessionRow.id },
    orderBy: { index: 'asc' },
    include: { eligible: true },
  });
  const answerRows = await client.mainAnswer.findMany({
    where: { sessionId: sessionRow.id },
    orderBy: { submittedAt: 'asc' },
  });

  const snapshots: MainQuestionSnapshot[] = snapshotRows.map((row) => ({
    id: row.id,
    sourceQuestionId: row.sourceQuestionId,
    type: row.type as MainQuestionSnapshot['type'],
    prompt: row.prompt,
    options: optionsFromJson(row.options),
    correctOptionId: row.correctOptionId,
    ...(row.explanation !== null ? { explanation: row.explanation } : {}),
    ...(row.passageContent !== null
      ? {
          passage: {
            content: row.passageContent,
            ...(row.passageTitle !== null ? { title: row.passageTitle } : {}),
          },
        }
      : {}),
  }));

  const questionSource: SessionQuestionSource = {
    sessionId: sessionRow.id,
    gameMode: gameModeToDomain(sessionRow.gameMode),
    snapshots,
  };

  // Bangun engine dengan session hasil map DB (bukan object baru).
  const session = {
    id: sessionRow.id,
    pin: sessionRow.pin,
    teacherId: sessionRow.teacherId,
    classId: sessionRow.classId ?? undefined,
    className: sessionRow.className ?? undefined,
    gameMode: gameModeToDomain(sessionRow.gameMode),
    phase: phaseToDomain(sessionRow.phase),
    currentRoundIndex: sessionRow.currentRoundIndex,
    totalRounds: sessionRow.totalRounds,
    createdAt: sessionRow.createdAt,
    startedAt: sessionRow.startedAt ?? undefined,
    endedAt: sessionRow.endedAt ?? undefined,
  };

  const engine = new SessionEngine({
    session,
    questions: questionSource,
    clock: options.clock,
    roundDurationMs: options.roundDurationMs,
  });

  // Players.
  for (const row of playerRows) {
    engine.state.players.set(row.id, playerToRuntime(row));
  }

  // Rounds + eligible snapshot (teamId per player dari DB).
  for (const row of roundRows) {
    const eligibleTeamIds: Record<string, string | undefined> = {};
    for (const entry of row.eligible) {
      eligibleTeamIds[entry.playerId] = entry.teamId ?? undefined;
    }
    const question = snapshots[row.index];
    if (!question) {
      return { ok: false, reason: 'SESSION_NOT_FOUND' }; // snapshot hilang = korup
    }
    engine.state.rounds.push({
      id: row.id,
      sessionId: row.sessionId,
      index: row.index,
      question,
      eligiblePlayerIds: row.eligible.map((entry) => entry.playerId),
      phase: roundStatusToDomain(row.status),
      openedAt: row.openedAt ?? undefined,
      closesAt: row.closesAt ?? undefined,
      closedAt: row.closedAt ?? undefined,
      eligibleTeamIds,
    });
  }

  // Answers (accepted final) + attempt ledger (idempotency survive
  // restart — Tahap 6 §29: retry identik setelah reload tetap
  // already-saved, bukan ditolak sebagai duplicate).
  for (const row of answerRows) {
    let perRound = engine.state.answersByRound.get(row.roundId);
    if (!perRound) {
      perRound = new Map();
      engine.state.answersByRound.set(row.roundId, perRound);
    }
    perRound.set(row.playerId, {
      sessionId: row.sessionId,
      roundId: row.roundId,
      playerId: row.playerId,
      submissionId: row.submissionId,
      selectedOptionId: row.selectedOptionId,
      submittedAt: row.submittedAt,
      source: 'individual',
      isCorrect: row.isCorrect,
      provenance: 'first-accepted',
    });
    let attempts = engine.state.attemptsByRound.get(row.roundId);
    if (!attempts) {
      attempts = new Map();
      engine.state.attemptsByRound.set(row.roundId, attempts);
    }
    attempts.set(row.submissionId, {
      submissionId: row.submissionId,
      roundId: row.roundId,
      playerId: row.playerId,
      selectedOptionId: row.selectedOptionId,
      accepted: true,
    });
  }

  // Pause durability.
  const pause = pauseFromRow(sessionRow);
  if (pause) {
    if (pause.fromPhase === 'question') {
      const activeIndex = sessionRow.currentRoundIndex ?? 0;
      const activeRound = engine.state.rounds[activeIndex];
      pause.roundId = activeRound?.id ?? '';
    }
    engine.state.pause = pause;
  }

  engine.state.activeRoundIndex = sessionRow.currentRoundIndex;

  return { ok: true, engine };
}
