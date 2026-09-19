// ─── Player ─────────────────────────────────────────────────
// MainPlayer adalah PESERTA permainan (selalu role `student`).
// Teacher & projector adalah koneksi operator/pengamat — tidak pernah
// menjadi MainPlayer (lihat contracts/views untuk view per role).

import type { AuthUserId, PlayerId, SessionId, TeamId } from '../types/ids';
import type {
  ConnectionStatus,
  ParticipationStatus,
} from '../types/participant';

export interface MainPlayer {
  id: PlayerId;
  sessionId: SessionId;

  /** Auth user id bila peserta adalah siswa BahasaCerdas terautentikasi. */
  userId?: AuthUserId;

  /** Nama tampil di layar; ditentukan guru/host saat join. */
  displayName: string;
  /** Regu saat join (mode Jelajah Kata wajib; Kota Cahaya boleh tanpa regu). */
  teamId?: TeamId;

  joinedAt: Date;

  /**
   * Round pertama tempat peserta dianggap eligible (0 untuk join di lobby).
   * Eligibility per round dikunci di MainRound agar disconnect/reconnect
   * tidak mengubah denominator perhitungan regu.
   */
  eligibleFromRoundIndex: number;

  connectionStatus: ConnectionStatus;
  participationStatus: ParticipationStatus;
}
