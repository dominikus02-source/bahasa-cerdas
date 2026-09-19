// ─── Repository Shared Types ────────────────────────────────
// Filter/opsi bersama. Interface repo TIDAK mengekspos tipe
// Prisma/Supabase — hanya tipe domain.

import type { PlayerId, RoundId, SessionId } from '../../domain/types/ids';
import type { ConnectionStatus } from '../../domain/types/participant';

/** Filter peserta per sesi + status koneksi (opsional). */
export interface PlayerQueryFilter {
  sessionId: SessionId;
  connectionStatus?: ConnectionStatus;
}

/** Filter jawaban final per round. */
export interface AnswerQueryFilter {
  sessionId: SessionId;
  roundId: RoundId;
}

/** Filter jawaban final milik satu peserta. */
export interface PlayerAnswerFilter {
  sessionId: SessionId;
  playerId: PlayerId;
}
