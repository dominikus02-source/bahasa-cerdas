// ─── Game State (Domain, Non-Visual) ────────────────────────
// State permainan dipisah dari hasil akademik dan dari visual.
// Aturan skor: poin regu hanya naik — tidak pernah dikurangi.

import type { TeamId } from './ids';

export interface JelajahKataState {
  /** Progres normalisasi 0..100 per regu. Bukan posisi pixel/avatar. */
  teamProgress: Record<TeamId, number>;
}

export interface KotaCahayaState {
  /** Akumulasi kontribusi benar seluruh peserta/regu (poin cahaya). */
  correctContribution: number;
  /** Target poin cahaya misi. */
  target: number;
  /** Persentase 0..100, clamp oleh application layer. */
  progressPercent: number;
  /** Kunci milestone yang sudah terbuka (mis. "kota-pagi", "menara-1"). */
  unlockedMilestones: string[];
}

/** Union state per game — ditentukan oleh `gameMode` sesi. */
export type MainGameState =
  | { gameMode: 'jelajah-kata'; jelajahKata: JelajahKataState }
  | { gameMode: 'kota-cahaya'; kotaCahaya: KotaCahayaState };
