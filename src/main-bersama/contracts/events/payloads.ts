// ─── Event Payloads ─────────────────────────────────────────
// Payload event realtime. Timestamp ISO-8601 string (bukan Date).
// View per role dipakai sebagai payload `state:sync` — satu sumber
// kebenaran untuk shape state per role.

import type { StudentSessionView } from '../views/student';
import type { TeacherSessionView } from '../views/teacher';
import type { ProjectorSessionView } from '../views/projector';
import type { AnswerSubmitResult } from '../../domain/types/answers';
import type { SessionPhase } from '../../domain/types/session';
import type { ParticipantRole } from '../../domain/types/participant';
import type {
  PlayerId,
  RoundId,
  SessionId,
  SubmissionId,
} from '../../domain/types/ids';

// ─── Client → Server ────────────────────────────────────────

export interface SessionJoinRequest {
  event: 'session:join';
  sessionId: SessionId;
  /** PIN sebagai bukti keanggotaan sesi (bukan credential pribadi). */
  pin: string;
  role: 'student' | 'projector';
  displayName?: string;
  /** Ada bila student adalah siswa terautentikasi; kosong untuk guest. */
  userId?: string;
}

export interface StateRequest {
  event: 'state:request';
  sessionId: SessionId;
  /** Role pengirim — menentukan bentuk view yang dikirim balik. */
  requestedRole: ParticipantRole;
  playerId?: PlayerId;
}

export interface AnswerSubmitRequest {
  event: 'answer:submit';
  sessionId: SessionId;
  roundId: RoundId;
  playerId: PlayerId;
  /** Idempotency key per percobaan kirim — mendukung retry aman. */
  submissionId: SubmissionId;
  selectedOptionId: string;
}

// ─── Teacher → Server ───────────────────────────────────────
// Semua command guru membawa sessionId sebagai target.

export interface SessionStartCommand {
  event: 'session:start';
  sessionId: SessionId;
}

export interface RoundNextCommand {
  event: 'round:next';
  sessionId: SessionId;
}

export interface RoundCloseCommand {
  event: 'round:close';
  sessionId: SessionId;
}

export interface RoundDiscussCommand {
  event: 'round:discuss';
  sessionId: SessionId;
}

export interface SessionPauseCommand {
  event: 'session:pause';
  sessionId: SessionId;
}

export interface SessionResumeCommand {
  event: 'session:resume';
  sessionId: SessionId;
}

export interface SessionEndCommand {
  event: 'session:end';
  sessionId: SessionId;
}

export type TeacherCommand =
  | SessionStartCommand
  | RoundNextCommand
  | RoundCloseCommand
  | RoundDiscussCommand
  | SessionPauseCommand
  | SessionResumeCommand
  | SessionEndCommand;

// ─── Server → Client ────────────────────────────────────────

/** Sync state penuh sesuai role penerima. */
export type StateSyncPayload =
  | { role: 'student'; view: StudentSessionView }
  | { role: 'teacher'; view: TeacherSessionView }
  | { role: 'projector'; view: ProjectorSessionView };

/** ACK jawaban — TANPA kebenaran jawaban sebelum reveal. */
export type AnswerAckPayload = AnswerSubmitResult;

/** Update parsial — untuk perubahan yang tidak perlu sync penuh. */
export interface SessionUpdatePayload {
  sessionId: SessionId;
  phase?: SessionPhase;
  revision: number;
  /** ISO-8601 UTC. */
  serverTime: string;
}
