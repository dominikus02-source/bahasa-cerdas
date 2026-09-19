// ─── Round Repository Contract ──────────────────────────────
// Interface minimum persistence round. Snapshot soal ikut dalam
// entitas round (self-contained), tanpa join ke Bank Soal.

import type { RoundId, SessionId } from '../../domain/types/ids';
import type { MainRound } from '../../domain/entities/round';

export interface RoundRepository {
  findById(id: RoundId): Promise<MainRound | null>;
  /** Semua round sesi, terurut berdasarkan index. */
  findBySession(sessionId: SessionId): Promise<MainRound[]>;
  save(round: MainRound): Promise<void>;
}
