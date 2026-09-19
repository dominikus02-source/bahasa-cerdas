// ─── Teacher Session View ───────────────────────────────────
// View guru: penuh visibilitas operasional — termasuk data privat
// (siapa sudah menjawab, answer key untuk fase review). TANPA
// credential/token autentikasi.

import type { GameMode, SessionPhase } from '../../domain/types/session';
import type { ConnectionStatus, ParticipantRole } from '../../domain/types/participant';
import type { MainQuestionSnapshot } from '../../domain/entities/question';
import type { MainGameState } from '../../domain/types/game-state';
import type { MainTeam } from '../../domain/entities/team';
import type { RoundId, SessionId, TeamId } from '../../domain/types/ids';

/** Koneksi operator/pengamat non-peserta (teacher/projector). */
export interface OperatorConnectionInfo {
  /** Koneksi teacher/projector itu sendiri. */
  role: ParticipantRole;
  connected: boolean;
}

/** Ringkasan peserta untuk guru — identitas tampil, bukan secret. */
export interface TeacherParticipantInfo {
  playerId: string;
  displayName: string;
  teamId?: TeamId;
  userId?: string;
  connectionStatus: ConnectionStatus;
  participationStatus: 'active' | 'inactive';
  joinedRoundIndex: number;
  /** Status jawaban peserta ini pada round aktif. */
  hasAnsweredCurrentRound: boolean;
  /** Ada hanya saat fase discussion/review — bukan saat answering. */
  lastAnswerIsCorrect?: boolean;
}

/** Kontrol yang BOLEH dilakukan guru pada fase saat ini (server-enforced). */
export interface TeacherAllowedActions {
  canStartSession: boolean;
  canOpenNextRound: boolean;
  canCloseRound: boolean;
  canStartDiscussion: boolean;
  canGoToNextRound: boolean;
  canPause: boolean;
  canResume: boolean;
  canEndSession: boolean;
}

export interface TeacherSessionView {
  role: 'teacher';
  sessionId: SessionId;
  /** ISO-8601 UTC. */
  serverTime: string;
  revision: number;

  gameMode: GameMode;
  phase: SessionPhase;

  currentRoundIndex: number | null;
  totalRounds: number;
  currentRoundId: RoundId | null;
  /** Deadline round aktif ISO-8601, null bila tidak ada round terbuka. */
  currentRoundClosesAt: string | null;

  /** Snapshot soal penuh (termasuk answer key) untuk round aktif. */
  currentQuestion: MainQuestionSnapshot | null;

  teams: MainTeam[];
  participants: TeacherParticipantInfo[];

  /** Ringkasan jawaban round aktif — agregat tanpa membuka pilihan per siswa. */
  answerSummary: {
    submittedCount: number;
    eligibleCount: number;
    /** optionId → jumlah pilihan (hanya setelah round ditutup/review). */
    optionCounts: Record<string, number> | null;
  };

  gameState: MainGameState | null;
  allowedActions: TeacherAllowedActions;
}
