// ─── Student Session View ───────────────────────────────────
// View siswa adalah discriminated union per fase. Bentuk non-reveal
// secara TIPE tidak memiliki field kebenaran jawaban — server tidak
// mungkin membocorkan answer key lewat view ini karena field-nya
// tidak ada untuk diisi (compile-time guarantee, bukan konvensi).

import type { GameMode } from '../../domain/types/session';
import type { ConnectionStatus } from '../../domain/types/participant';
import type { PublicQuestionView } from '../../domain/entities/question';
import type { RoundId, SessionId, TeamId } from '../../domain/types/ids';
import type { TeamPublicInfo } from './common';

interface StudentViewBase {
  role: 'student';
  sessionId: SessionId;
  /** ISO-8601 UTC — kapan state ini dibangun server. */
  serverTime: string;
  revision: number;
  gameMode: GameMode;
  /** Nama tampil milik peserta ini (bukan identitas user internal). */
  displayName: string;
  team?: TeamPublicInfo;
  connectionStatus: ConnectionStatus;
}

/**
 * Fase pre-round: preparing/lobby/closed/paused.
 * `closed` dan `paused` hanya membedakan pesan — bukan union baru.
 */
interface StudentPreRoundView extends StudentViewBase {
  phase: 'preparing' | 'lobby' | 'closed' | 'paused';
  /** Jumlah peserta yang sudah bergabung (tanpa identitas). */
  participantCount: number;
}

/** Soal aktif — tanpa correctOptionId, isCorrect, atau explanation. */
interface StudentQuestionView extends StudentViewBase {
  phase: 'question';
  /** Id round aktif — dibalikkan saat submit (bukan secret). */
  roundId: RoundId;
  roundIndex: number;
  totalRounds: number;
  /** Soal aktif — sudah di-strip dari answer key oleh server. */
  question: PublicQuestionView;
  /** Status jawaban MILIK peserta ini — bukan kebenaran jawaban. */
  ownAnswerStatus: 'not-submitted' | 'saved' | 'stale-rejected';
  /** Deadline submit ISO-8601 (server clock). */
  closesAt: string;
}

/**
 * Fase discussion/summary/ended — pembahasan sudah terbuka sehingga
 * reveal untuk round yang dibahas diperbolehkan.
 */
interface StudentRevealView extends StudentViewBase {
  phase: 'discussion' | 'summary' | 'ended';
  roundIndex: number;
  totalRounds: number;
  /** Round yang sedang/terakhir dibahas. */
  revealedRound: {
    roundId: RoundId;
    question: PublicQuestionView;
    correctOptionId: string;
    explanation?: string;
    /** Distribusi agregat pilihan (tanpa identitas pemilih). */
    optionCounts: Record<string, number>;
  };
  /** Kebenaran jawaban MILIK peserta ini — hanya ada setelah reveal. */
  ownAnswerIsCorrect: boolean;
  /** Progres game yang aman untuk siswa. */
  gameProgress: {
    teamProgress: Record<TeamId, number>;
  };
}

/**
 * View sesi untuk siswa. Server memilih varian sesuai fase —
 * client tidak bisa mengakses field fase lain (type-safe).
 */
export type StudentSessionView =
  | StudentPreRoundView
  | StudentQuestionView
  | StudentRevealView;
