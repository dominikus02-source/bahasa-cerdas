// ─── Realtime Invalidation Signal (Tahap 6 Hardening §3/§5) ──
// KONTRAK MURNI (tanpa I/O): Supabase Realtime Broadcast hanya
// dipakai sebagai SINYAL "state berubah" — BUKAN source of truth,
// BUKAN pembawa data sesi. Client WAJIB menarik state role-nya via
// GET authoritative setelah notifikasi (pull-on-notify).
//
// Transport dipilih: Supabase Broadcast (server → REST Broadcast
// API; client → supabase-js channel publik). Dipilih karena:
//  - Vercel serverless TIDAK menjamin request/connection sesi yang
//    sama berjalan pada instance yang sama (in-memory hub invalid);
//  - ecosystem Supabase sudah ada di repo (tanpa dependency baru);
//  - guest dapat subscribe channel publik tanpa auth Supabase.

/** Nama event broadcast (kontrak §3). */
export const SESSION_UPDATE_EVENT = 'session:update' as const;

/**
 * Topic channel per sesi. sessionId unik per sesi (bukan PIN) —
 * hanya peserta yang berhasil join yang menerima sessionId.
 */
export function sessionTopic(sessionId: string): string {
  return `main-bersama:session:${sessionId}`;
}

/**
 * Payload broadcast — MINIMAL (§3). Tidak boleh berisi: answer,
 * selectedOptionId, correctOptionId, isCorrect, explanation,
 * userId, reconnect credential, identitas guru, game state,
 * snapshot Bank Soal.
 */
export interface SessionUpdateSignalPayload {
  type: typeof SESSION_UPDATE_EVENT;
  /** Revision state saat publikasi — informasional, BUKAN final. */
  revision?: number;
}

/** Guard payload sinyal (dipakai client + test forbidden-key). */
export function isSessionUpdateSignalPayload(
  payload: unknown,
): payload is SessionUpdateSignalPayload {
  if (typeof payload !== 'object' || payload === null) return false;
  const p = payload as Record<string, unknown>;
  if (p.type !== SESSION_UPDATE_EVENT) return false;
  if (p.revision !== undefined && typeof p.revision !== 'number') return false;
  return true;
}
