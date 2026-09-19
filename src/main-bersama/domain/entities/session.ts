// ─── Session ────────────────────────────────────────────────
// Entitas sesi: bentuk domain murni. Tanpa property UI, tanpa
// binding Prisma/Supabase. Token & credential TIDAK berada di sini.

import type { SessionId } from '../types/ids';
import type { GameMode, SessionPhase } from '../types/session';

export interface MainSession {
  id: SessionId;
  /** PIN join 6 digit unik per sesi aktif (nilai, bukan secret). */
  pin: string;

  /** Auth user id guru pembuka sesi. */
  teacherId: string;
  /** KelasKu yang dipakai (opsional — sesi bisa terbuka tanpa kelas). */
  classId?: string;
  /** Nama kelas untuk ditampilkan (denormalisasi aman untuk proyektor). */
  className?: string;

  gameMode: GameMode;
  phase: SessionPhase;

  /** Round aktif; null sebelum round pertama dibuka. */
  currentRoundIndex: number | null;
  totalRounds: number;

  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}
