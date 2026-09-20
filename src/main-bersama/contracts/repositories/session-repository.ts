// ─── Session Repository Contract ────────────────────────────
// Interface minimum persistence sesi. Implementasi (Prisma/Postgres)
// ada di infrastructure pada tahap berikutnya — interface ini tidak
// mengekspos tipe generated ORM.

import type { SessionId } from '../../domain/types/ids';
import type { MainSession } from '../../domain/entities/session';

export interface SessionRepository {
  findById(id: SessionId): Promise<MainSession | null>;
  /** Cari sesi aktif (belum ended) berdasarkan PIN join. */
  findActiveByPin(pin: string): Promise<MainSession | null>;
  /**
   * Cari sesi TERBARU berdasarkan PIN untuk kebutuhan DISPLAY
   * read-only (layar kelas/proyektor). Berbeda dari findActiveByPin:
   * sesi final (SUMMARY/ENDED) tetap dapat ditampilkan supaya layar
   * kelas tidak mati setelah permainan selesai.
   *
   * Semantik "terbaru": PIN hanya boleh dipakai satu sesi aktif, dan
   * sesi final yang berbagi PIN selalu lebih lama — urutan
   * createdAt DESC karena itu memberi sesi yang sedang atau baru saja
   * selesai. TIDAK dipakai jalur join/command.
   */
  findLatestByPin(pin: string): Promise<MainSession | null>;
  save(session: MainSession): Promise<void>;
}
