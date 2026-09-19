// ─── Answer Repository Contract ─────────────────────────────
// Interface minimum persistence jawaban final. Uniqueness bisnis
// (session + round + player) ditangani implementasi pada tahap
// berikutnya — interface ini tidak mengekspose constraint DB.

import type { PlayerId } from '../../domain/types/ids';
import type { MainAnswer } from '../../domain/entities/answer';
import type {
  AnswerQueryFilter,
  PlayerAnswerFilter,
} from './types';

export interface AnswerRepository {
  /** Jawaban final milik satu peserta untuk satu round (atau null). */
  findByPlayerAndRound(
    filter: AnswerQueryFilter & { playerId: PlayerId },
  ): Promise<MainAnswer | null>;
  /** Semua jawaban final per round (untuk scoring/discussion). */
  findByRound(filter: AnswerQueryFilter): Promise<MainAnswer[]>;
  /** Riwayat jawaban seorang peserta dalam satu sesi. */
  findByPlayer(filter: PlayerAnswerFilter): Promise<MainAnswer[]>;
  /** Simpan jawaban final; implementasi wajib menegakkan uniqueness bisnis. */
  save(answer: MainAnswer): Promise<void>;
}
