// ─── Engine Result ──────────────────────────────────────────
// Typed result untuk error gameplay yang diharapkan — TIDAK throw.
// Unexpected programming error tetap boleh throw.

/** Kode kegagalan operasi engine yang diharapkan. */
export type SessionEngineErrorCode =
  | 'INVALID_PHASE'
  | 'ROUND_NOT_OPEN'
  | 'ROUND_MISMATCH'
  | 'PLAYER_NOT_FOUND'
  | 'PLAYER_NOT_ELIGIBLE'
  | 'INVALID_OPTION'
  | 'DEADLINE_PASSED'
  | 'ANSWER_ALREADY_EXISTS'
  | 'SUBMISSION_ID_CONFLICT'
  | 'SESSION_ENDED'
  | 'SESSION_NOT_FOUND'
  | 'UNAUTHORIZED';

export type SessionEngineResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: SessionEngineErrorCode };
