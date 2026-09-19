// ─── Answer Submission Result ───────────────────────────────
// ACK jawaban: TIDAK PERNAH memuat kebenaran jawaban sebelum reveal.
// Mendukung retry via `submissionId` (idempotency key per percobaan kirim).

import type { SubmissionId } from './ids';

export type AnswerSubmitResult =
  | {
      ok: true;
      status: 'saved' | 'already-saved';
      submissionId: SubmissionId;
    }
  | {
      ok: false;
      code:
        | 'SESSION_NOT_FOUND'
        | 'ROUND_NOT_OPEN'
        | 'PLAYER_NOT_ELIGIBLE'
        | 'INVALID_OPTION'
        | 'ANSWER_ALREADY_EXISTS'
        | 'SUBMISSION_ID_CONFLICT'
        | 'UNAUTHORIZED';
    };

/** Alasan sebuah jawaban final ditolak/diganti oleh server. */
export type AnswerRejectionCode =
  | 'not-eligible'
  | 'late-submission'
  | 'duplicate-final'
  | 'malformed';
