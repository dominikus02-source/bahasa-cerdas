// ─── Session Runtime State ──────────────────────────────────
// State runtime yang dipegang SessionEngine — pemilik keputusan
// authoritative untuk fase, peserta, round, dan jawaban.
// Ini BUKAN entity Prisma; persistence menyusul di infrastructure.
//
// Fase `preparing` memungkinkan guru menyiapkan snapshot soal
// sebelum lobby dibuka (rundown: preparing → lobby → question → …).

import type {
  AnswerSource,
  GameMode,
  SessionPhase,
} from '../types/session';
import type {
  AuthUserId,
  PlayerId,
  RoundId,
  SessionId,
  SubmissionId,
  TeamId,
} from '../types/ids';
import type { MainAnswer } from './answer';
import type { MainQuestionSnapshot } from './question';
import type { MainRound } from './round';
import type { MainSession } from './session';

export interface RuntimePlayer {
  id: PlayerId;
  userId?: AuthUserId;
  displayName: string;
  teamId?: TeamId;
  joinedAt: Date;
  /** Round pertama tempat peserta boleh menjawab. */
  eligibleFromRoundIndex: number;
  connected: boolean;
  participationStatus: 'active' | 'inactive';
}

// ─── Catatan Pause ──────────────────────────────────────────
// Pause menyimpan fase asal + sisa waktu agar resume tidak
// mengurangi waktu answering siswa.

export interface PausedFromQuestion {
  fromPhase: 'question';
  roundId: RoundId;
  /** Sisa waktu answering (ms) saat pause terjadi. */
  remainingMs: number;
}

export interface PausedFromOther {
  fromPhase: Exclude<SessionPhase, 'question' | 'paused'>;
}

export type PauseState = PausedFromQuestion | PausedFromOther;

/** Jawaban final yang tersimpan — correctness hanya data internal server. */
export interface StoredAnswer extends MainAnswer {
  /** Penanda bahwa ini attempt pertama yang diterima (bukan overwrite). */
  readonly provenance: 'first-accepted';
}

/** Satu attempt submit tercatat per submissionId (untuk idempotency). */
export interface AttemptRecord {
  submissionId: SubmissionId;
  roundId: RoundId;
  playerId: PlayerId;
  selectedOptionId: string;
  accepted: boolean;
}

export interface SessionRuntimeState {
  session: MainSession;
  players: Map<PlayerId, RuntimePlayer>;
  /** Round berdasarkan index (0-based) — source of truth jumlah soal. */
  rounds: MainRound[];
  /** Jawaban final per round → per player (business uniqueness). */
  answersByRound: Map<RoundId, Map<PlayerId, StoredAnswer>>;
  /** Attempt register per round untuk idempotency submissionId. */
  attemptsByRound: Map<RoundId, Map<SubmissionId, AttemptRecord>>;
  /** Index round aktif, null bila belum ada round dibuka. */
  activeRoundIndex: number | null;
  /** Fase asal + sisa waktu saat pause. Null bila tidak paused. */
  pause: PauseState | null;
}

/** Sumber snapshot soal sesi — disiapkan sebelum lobby dibuka. */
export interface SessionQuestionSource {
  readonly sessionId: SessionId;
  readonly gameMode: GameMode;
  readonly snapshots: readonly MainQuestionSnapshot[];
}
