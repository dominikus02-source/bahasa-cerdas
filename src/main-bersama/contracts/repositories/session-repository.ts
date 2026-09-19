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
  save(session: MainSession): Promise<void>;
}
