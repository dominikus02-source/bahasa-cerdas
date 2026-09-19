// ─── Session Phase Transitions ──────────────────────────────
// State machine murni: fungsi murni tanpa I/O, tanpa waktu.
// Pemisahan ini membuat legalitas fase dapat diuji tanpa engine.

import type { SessionPhase } from '../types/session';
import type { SessionEngineErrorCode } from '../types/engine-result';

/**
 * Transition legal antar fase. `paused` ditangani terpisah oleh
 * engine (karena butuh fase asal + sisa waktu), jadi tidak ada
 * edge ke/dari `paused` di tabel ini.
 *
 * Rundown kelas: preparing → lobby → question ⇄ closed →
 * discussion → (question berikutnya | summary) → ended.
 */
export const SESSION_TRANSITIONS: Record<SessionPhase, readonly SessionPhase[]> = {
  preparing: ['lobby', 'ended'],
  lobby: ['question', 'paused', 'ended'],
  question: ['closed', 'paused', 'ended'],
  closed: ['discussion', 'paused', 'ended'],
  discussion: ['question', 'summary', 'paused', 'ended'],
  summary: ['ended'],
  ended: [],
  paused: [],
};

export type TransitionCheckResult =
  | { ok: true }
  | { ok: false; code: Extract<SessionEngineErrorCode, 'INVALID_PHASE' | 'SESSION_ENDED'> };

/** Cek legalitas transition fase. Ended = terminal (mutasi ditolak). */
export function canTransition(
  from: SessionPhase,
  to: SessionPhase,
): TransitionCheckResult {
  if (from === 'ended') return { ok: false, code: 'SESSION_ENDED' };
  if (SESSION_TRANSITIONS[from].includes(to)) return { ok: true };
  return { ok: false, code: 'INVALID_PHASE' };
}
