// ─── Persistence Mappers ────────────────────────────────────
// Pemetaan EKSPLISIT Prisma row ↔ domain entity.
// Aturan: tipe Prisma TIDAK keluar dari infrastructure; domain
// TIDAK tahu bentuk kolom. Hanya save/load/map/transaction di
// sini — TIDAK ada logika scoring/eligibility/correctness.

import {
  MainGameMode,
  MainRoundStatus,
  MainSessionPhase,
  Prisma,
} from '@prisma/client';
import type { GameMode, SessionPhase, RoundPhase } from '../../domain/types/session';
import type {
  MainQuestionOption,
  MainQuestionSnapshot,
} from '../../domain/entities/question';
import { DEFAULT_CONTENT_TITLE, type MainSession } from '../../domain/entities/session';
import type { MainPlayer } from '../../domain/entities/player';
import type { MainRound } from '../../domain/entities/round';
import type { MainAnswer } from '../../domain/entities/answer';
import type {
  PauseState,
  RuntimePlayer,
} from '../../domain/entities/session-runtime-state';

// ─── GameMode ───────────────────────────────────────────────

export function gameModeToDb(mode: GameMode): MainGameMode {
  return mode === 'jelajah-kata' ? MainGameMode.JELAJAH_KATA : MainGameMode.KOTA_CAHAYA;
}

export function gameModeToDomain(mode: MainGameMode): GameMode {
  return mode === MainGameMode.JELAJAH_KATA ? 'jelajah-kata' : 'kota-cahaya';
}

// ─── Session Phase ──────────────────────────────────────────

const PHASE_TO_DB: Record<SessionPhase, MainSessionPhase> = {
  preparing: MainSessionPhase.PREPARING,
  lobby: MainSessionPhase.LOBBY,
  question: MainSessionPhase.QUESTION,
  closed: MainSessionPhase.CLOSED,
  discussion: MainSessionPhase.DISCUSSION,
  paused: MainSessionPhase.PAUSED,
  summary: MainSessionPhase.SUMMARY,
  ended: MainSessionPhase.ENDED,
};

export function phaseToDb(phase: SessionPhase): MainSessionPhase {
  return PHASE_TO_DB[phase];
}

export function phaseToDomain(phase: MainSessionPhase): SessionPhase {
  const entry = Object.entries(PHASE_TO_DB).find(([, db]) => db === phase);
  if (!entry) throw new Error(`MainSessionPhase tidak dikenal: ${phase}`);
  return entry[0] as SessionPhase;
}

// ─── Round Phase ────────────────────────────────────────────

const ROUND_STATUS_TO_DB: Record<RoundPhase, MainRoundStatus> = {
  pending: MainRoundStatus.PENDING,
  open: MainRoundStatus.OPEN,
  review: MainRoundStatus.REVIEW,
  closed: MainRoundStatus.CLOSED,
};

export function roundStatusToDb(status: RoundPhase): MainRoundStatus {
  return ROUND_STATUS_TO_DB[status];
}

export function roundStatusToDomain(status: MainRoundStatus): RoundPhase {
  const entry = Object.entries(ROUND_STATUS_TO_DB).find(([, db]) => db === status);
  if (!entry) throw new Error(`MainRoundStatus tidak dikenal: ${status}`);
  return entry[0] as RoundPhase;
}

// ─── Session ────────────────────────────────────────────────

type SessionRow = Prisma.MainSessionGetPayload<object>;

export function sessionToDbCreate(session: MainSession): Prisma.MainSessionUncheckedCreateInput {
  return {
    id: session.id,
    pin: session.pin,
    teacherId: session.teacherId,
    classId: session.classId,
    className: session.className,
    // Label konten WAJIB terisi (kolom NOT NULL): sesi baru selalu
    // membawa snapshot dari create-session; data legacy memakai label
    // netral sehingga tidak pernah menulis null.
    contentTitle: session.contentTitle?.trim() || DEFAULT_CONTENT_TITLE,
    gameMode: gameModeToDb(session.gameMode),
    phase: phaseToDb(session.phase),
    currentRoundIndex: session.currentRoundIndex,
    totalRounds: session.totalRounds,
    createdAt: session.createdAt,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
  };
}

export function sessionToDbUpdate(session: MainSession): Prisma.MainSessionUncheckedUpdateInput {
  return {
    phase: phaseToDb(session.phase),
    currentRoundIndex: session.currentRoundIndex,
    totalRounds: session.totalRounds,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
  };
}

/** Pause state (dari SessionRuntimeState) → kolom durability sesi. */
export function pauseToDb(
  pause: PauseState | null,
  pausedAt: Date,
): Pick<
  Prisma.MainSessionUncheckedUpdateInput,
  'pausedFromPhase' | 'pausedRemainingMs' | 'pausedAt'
> {
  if (!pause) {
    return { pausedFromPhase: null, pausedRemainingMs: null, pausedAt: null };
  }
  if (pause.fromPhase === 'question') {
    return {
      pausedFromPhase: phaseToDb('question'),
      pausedRemainingMs: pause.remainingMs,
      pausedAt,
    };
  }
  return {
    pausedFromPhase: phaseToDb(pause.fromPhase),
    pausedRemainingMs: null,
    pausedAt,
  };
}

export function sessionToDomain(row: SessionRow): MainSession {
  const session: MainSession = {
    id: row.id,
    pin: row.pin,
    teacherId: row.teacherId,
    classId: row.classId ?? undefined,
    className: row.className ?? undefined,
    contentTitle: row.contentTitle || DEFAULT_CONTENT_TITLE,
    gameMode: gameModeToDomain(row.gameMode),
    phase: phaseToDomain(row.phase),
    currentRoundIndex: row.currentRoundIndex,
    totalRounds: row.totalRounds,
    createdAt: row.createdAt,
    startedAt: row.startedAt ?? undefined,
    endedAt: row.endedAt ?? undefined,
  };
  return session;
}

/** Rekonstruksi PauseState dari kolom durability. */
export function pauseFromRow(row: SessionRow): PauseState | null {
  if (!row.pausedFromPhase || row.phase !== MainSessionPhase.PAUSED) return null;
  const fromPhase = phaseToDomain(row.pausedFromPhase);
  if (fromPhase === 'question' && row.pausedRemainingMs !== null) {
    return {
      fromPhase: 'question',
      roundId: '', // diisi loader dari activeRoundIndex
      remainingMs: row.pausedRemainingMs,
    };
  }
  if (fromPhase === 'question') {
    throw new Error('Paused dari question tanpa remainingMs — data korup');
  }
  return { fromPhase: fromPhase as Exclude<SessionPhase, 'question' | 'paused'> };
}

// ─── Player ─────────────────────────────────────────────────

type PlayerRow = Prisma.MainPlayerGetPayload<object>;

/** Row → RuntimePlayer (superset domain entity, untuk engine recovery). */
export function playerToRuntime(row: PlayerRow): RuntimePlayer {
  return {
    id: row.id,
    userId: row.userId ?? undefined,
    displayName: row.displayName,
    teamId: row.teamId ?? undefined,
    joinedAt: row.joinedAt,
    eligibleFromRoundIndex: row.eligibleFromRoundIndex,
    connected: row.connected,
    participationStatus: 'active',
  };
}

/** RuntimePlayer → MainPlayer (entity domain Tahap 2). */
export function runtimeToPlayerEntity(
  player: RuntimePlayer,
  sessionId: string,
): MainPlayer {
  return {
    id: player.id,
    sessionId,
    userId: player.userId,
    displayName: player.displayName,
    teamId: player.teamId,
    joinedAt: player.joinedAt,
    eligibleFromRoundIndex: player.eligibleFromRoundIndex,
    connectionStatus: player.connected ? 'connected' : 'disconnected',
    participationStatus: player.participationStatus,
  };
}

export function playerEntityToRuntime(
  player: MainPlayer,
): RuntimePlayer {
  return {
    id: player.id,
    userId: player.userId,
    displayName: player.displayName,
    teamId: player.teamId,
    joinedAt: player.joinedAt,
    eligibleFromRoundIndex: player.eligibleFromRoundIndex,
    connected: player.connectionStatus === 'connected',
    participationStatus: player.participationStatus,
  };
}

export function playerToDbCreate(
  player: RuntimePlayer,
  sessionId: string,
): Prisma.MainPlayerUncheckedCreateInput {
  return {
    id: player.id,
    sessionId,
    userId: player.userId,
    displayName: player.displayName,
    teamId: player.teamId,
    eligibleFromRoundIndex: player.eligibleFromRoundIndex,
    joinedAt: player.joinedAt,
    connected: player.connected,
  };
}

// ─── Question Snapshot ──────────────────────────────────────

type SnapshotRow = Prisma.MainQuestionSnapshotGetPayload<object>;

/** Validasi & normalisasi options JSON dari DB (guard korupsi). */
export function optionsFromJson(value: unknown): MainQuestionOption[] {
  if (!Array.isArray(value)) {
    throw new Error('MainQuestionSnapshot.options korup — bukan array');
  }
  return value.map((option, index) => {
    if (
      typeof option !== 'object' ||
      option === null ||
      typeof (option as Record<string, unknown>).id !== 'string' ||
      typeof (option as Record<string, unknown>).text !== 'string'
    ) {
      throw new Error(`MainQuestionSnapshot.options[${index}] korup`);
    }
    const o = option as Record<string, unknown>;
    return { id: o.id as string, text: o.text as string };
  });
}

export function snapshotToDb(
  snapshot: MainQuestionSnapshot,
  sessionId: string,
  position: number,
): Prisma.MainQuestionSnapshotUncheckedCreateInput {
  return {
    id: snapshot.id,
    sessionId,
    position,
    sourceQuestionId: snapshot.sourceQuestionId,
    type: snapshot.type,
    prompt: snapshot.prompt,
    options: snapshot.options as unknown as Prisma.InputJsonValue,
    correctOptionId: snapshot.correctOptionId,
    explanation: snapshot.explanation,
    passageTitle: snapshot.passage?.title,
    passageContent: snapshot.passage?.content,
  };
}

export function snapshotToDomain(row: SnapshotRow): MainQuestionSnapshot {
  const snapshot: MainQuestionSnapshot = {
    id: row.id,
    sourceQuestionId: row.sourceQuestionId,
    type: row.type as MainQuestionSnapshot['type'],
    prompt: row.prompt,
    options: optionsFromJson(row.options),
    correctOptionId: row.correctOptionId,
  };
  if (row.explanation !== null) snapshot.explanation = row.explanation;
  if (row.passageContent !== null) {
    snapshot.passage = {
      content: row.passageContent,
      ...(row.passageTitle !== null ? { title: row.passageTitle } : {}),
    };
  }
  return snapshot;
}

// ─── Answer ─────────────────────────────────────────────────

export function answerToDb(
  answer: MainAnswer,
): Prisma.MainAnswerUncheckedCreateInput {
  return {
    sessionId: answer.sessionId,
    roundId: answer.roundId,
    playerId: answer.playerId,
    submissionId: answer.submissionId,
    selectedOptionId: answer.selectedOptionId,
    isCorrect: answer.isCorrect,
    submittedAt: answer.submittedAt,
  };
}

type AnswerRow = Prisma.MainAnswerGetPayload<object>;

export function answerToDomain(row: AnswerRow): MainAnswer {
  return {
    sessionId: row.sessionId,
    roundId: row.roundId,
    playerId: row.playerId,
    submissionId: row.submissionId,
    selectedOptionId: row.selectedOptionId,
    submittedAt: row.submittedAt,
    source: 'individual',
    isCorrect: row.isCorrect,
  };
}
