// ─── Round ──────────────────────────────────────────────────
// Round mengunci daftar peserta eligible SEBELUM round dibuka,
// sehingga disconnect yang terjadi saat round berjalan tidak
// mengubah denominator regu.

import type { PlayerId, RoundId, SessionId } from '../types/ids';
import type { RoundPhase } from '../types/session';
import type { MainQuestionSnapshot } from './question';

export interface MainRound {
  id: RoundId;
  sessionId: SessionId;
  /** Urutan round berbasis 0; konsisten dengan currentRoundIndex sesi. */
  index: number;

  /** Snapshot soal mandiri untuk round ini. */
  question: MainQuestionSnapshot;

  /**
   * Peserta yang dihitung untuk round ini — dikunci saat round
   * disiapkan (sebelum openedAt), bukan saat round ditutup.
   */
  eligiblePlayerIds: PlayerId[];

  /** Fase round individual. */
  phase: RoundPhase;

  openedAt?: Date;
  /** Deadline server untuk submit (sumber kebenaran, bukan waktu client). */
  closesAt?: Date;
  closedAt?: Date;

  /**
   * Snapshot team yang berlaku SAAT round dibuka (per eligible player).
   * Sumber kebenaran scoring historis — MainPlayer.teamId yang mutable
   * TIDAK boleh dipakai untuk menghitung ulang round.
   */
  eligibleTeamIds?: Record<string, string | undefined>;
}
