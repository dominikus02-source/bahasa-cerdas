// ─── Answer ─────────────────────────────────────────────────
// Jawaban final per peserta. Aturan bisnis (untuk tahap implementasi):
// session + round + player = SATU jawaban final.
// `submissionId` hanyalah idempotency identifier per percobaan kirim,
// BUKAN kunci uniqueness bisnis.

import type {
  PlayerId,
  RoundId,
  SessionId,
  SubmissionId,
} from '../types/ids';
import type { AnswerSource } from '../types/session';

export interface MainAnswer {
  sessionId: SessionId;
  roundId: RoundId;
  playerId: PlayerId;

  /** Idempotency key dari client untuk percobaan submit ini. */
  submissionId: SubmissionId;

  selectedOptionId: string;

  /** Waktu server menerima jawaban final. */
  submittedAt: Date;
  /** Sumber jawaban (individual / konsensus regu). */
  source: AnswerSource;

  /** Kebenaran dihitung server saat scoring — tidak pernah dikirim ke siswa sebelum reveal. */
  isCorrect: boolean;
}
