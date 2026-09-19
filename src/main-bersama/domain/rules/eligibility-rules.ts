// ─── Eligibility Rules ──────────────────────────────────────
// Aturan murni untuk eligibility dan late join. Snapshot
// eligiblePlayerIds DIKUNCI saat round dibuka dan TIDAK dihitung
// ulang setelahnya — disconnect tidak mengubah denominator.

import type { PlayerId, RoundId } from '../types/ids';
import type { SessionPhase } from '../types/session';
import type {
  RuntimePlayer,
  SessionRuntimeState,
} from '../entities/session-runtime-state';

/**
 * Late join:
 * - join saat lobby → eligible mulai round 0;
 * - join saat preparing DITOLAK (guru belum membuka ruangan);
 * - join saat round aktif ke-N (berjalan/ditutup/dibahas) →
 *   eligible mulai round N+1 — TIDAK masuk snapshot round aktif;
 * - fase summary/ended → join gameplay ditolak.
 */
export function computeEligibleFromRoundIndex(
  phase: SessionPhase,
  activeRoundIndex: number | null,
): { ok: true; eligibleFromRoundIndex: number } | { ok: false; code: 'SESSION_ENDED' | 'INVALID_PHASE' } {
  switch (phase) {
    case 'lobby':
      return { ok: true, eligibleFromRoundIndex: 0 };
    case 'preparing':
      return { ok: false, code: 'INVALID_PHASE' };
    case 'question':
    case 'closed':
    case 'discussion':
    case 'paused': {
      const next = (activeRoundIndex ?? 0) + 1;
      return { ok: true, eligibleFromRoundIndex: next };
    }
    case 'summary':
    case 'ended':
      return { ok: false, code: 'SESSION_ENDED' };
    default:
      return { ok: false, code: 'INVALID_PHASE' };
  }
}

/** Peserta eligible untuk round index tertentu (based on joined snapshot). */
export function isPlayerEligibleForRound(
  player: RuntimePlayer,
  roundIndex: number,
): boolean {
  return roundIndex >= player.eligibleFromRoundIndex && player.participationStatus === 'active';
}

/**
 * Kunci daftar peserta eligible untuk round yang akan dibuka.
 * Dipanggil SATU KALI saat openRound — hasilnya disimpan di
 * round.eligiblePlayerIds dan tidak dihitung ulang.
 */
export function lockEligiblePlayerIds(
  state: SessionRuntimeState,
  roundIndex: number,
): PlayerId[] {
  const eligible: PlayerId[] = [];
  for (const player of state.players.values()) {
    if (isPlayerEligibleForRound(player, roundIndex)) {
      eligible.push(player.id);
    }
  }
  return eligible;
}

/** Cek keanggotaan player terhadap sesi (data isolation dasar). */
export function findPlayerInSession(
  state: SessionRuntimeState,
  playerId: PlayerId,
): RuntimePlayer | null {
  return state.players.get(playerId) ?? null;
}

/** Reconnect memakai player yang sama — bukan membuat player baru. */
export function markPlayerConnection(
  state: SessionRuntimeState,
  playerId: PlayerId,
  connected: boolean,
): boolean {
  const player = state.players.get(playerId);
  if (!player) return false;
  player.connected = connected;
  return true;
}

/** Rekap partisipasi factual round (tanpa scoring game). */
export function roundParticipation(
  state: SessionRuntimeState,
  roundId: RoundId,
): { eligibleCount: number; submittedCount: number } {
  const answers = state.answersByRound.get(roundId);
  const round = state.rounds.find((r) => r.id === roundId);
  return {
    eligibleCount: round ? round.eligiblePlayerIds.length : 0,
    submittedCount: answers ? answers.size : 0,
  };
}
