// ─── Session ────────────────────────────────────────────────
// Entitas sesi: bentuk domain murni. Tanpa property UI, tanpa
// binding Prisma/Supabase. Token & credential TIDAK berada di sini.

import type { SessionId } from '../types/ids';
import type { GameMode, SessionPhase } from '../types/session';

/**
 * Label konten netral untuk sesi yang dibuat sebelum `contentTitle`
 * ada (data legacy / sesi review). Dipakai sebagai fallback tunggal
 * supaya view tidak pernah kehilangan identitas konten.
 */
export const DEFAULT_CONTENT_TITLE = 'Paket Soal';

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

  /**
   * SNAPSHOT label konten sesi saat dibuat (mis. "Antonim", judul
   * SoalSet, nama tema master). Public-safe: label tampilan saja —
   * bukan packageRef, tanpa isi soal. Opsional di tipe domain agar
   * data/konstruktor lama tetap valid; penyimpanan & view selalu
   * memakai `DEFAULT_CONTENT_TITLE` (lihat mappers/view-mappers).
   */
  contentTitle?: string;

  gameMode: GameMode;
  phase: SessionPhase;

  /** Round aktif; null sebelum round pertama dibuka. */
  currentRoundIndex: number | null;
  totalRounds: number;

  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}
