// ─── Prisma Session Repository ──────────────────────────────
// Implementasi SessionRepository (Tahap 2) + persistence pause &
// ownership. Semua query scoped by sessionId; ownership via
// findSessionOwnedBy(sessionId, teacherId).
// Tipe Prisma TIDAK keluar dari file ini.

import { db } from '@/lib/db';
import type { MainSession } from '../../domain/entities/session';
import type { PauseState } from '../../domain/entities/session-runtime-state';
import type { SessionRepository } from '../../contracts/repositories/session-repository';
import {
  pauseToDb,
  pauseFromRow,
  phaseToDb,
  sessionToDbCreate,
  sessionToDbUpdate,
  sessionToDomain,
} from '../persistence/mappers';

export class PrismaSessionRepository implements SessionRepository {
  async findById(id: string): Promise<MainSession | null> {
    const row = await db.mainSession.findUnique({ where: { id } });
    return row ? sessionToDomain(row) : null;
  }

  async findActiveByPin(pin: string): Promise<MainSession | null> {
    const row = await db.mainSession.findFirst({
      where: {
        pin,
        phase: { notIn: ['SUMMARY', 'ENDED'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    return row ? sessionToDomain(row) : null;
  }

  /** Ownership: guru hanya melihat/mengelola sesinya sendiri. */
  async findSessionOwnedBy(
    sessionId: string,
    teacherId: string,
  ): Promise<MainSession | null> {
    const row = await db.mainSession.findFirst({
      where: { id: sessionId, teacherId },
    });
    return row ? sessionToDomain(row) : null;
  }

  async save(session: MainSession): Promise<void> {
    const data = sessionToDbUpdate(session);
    await db.mainSession.upsert({
      where: { id: session.id },
      create: { ...sessionToDbCreate(session) },
      update: data,
    });
  }

  /** Persist pause state (dipanggil engine service saat pause/resume). */
  async savePauseState(
    sessionId: string,
    pause: PauseState | null,
    pausedAt: Date,
  ): Promise<void> {
    await db.mainSession.update({
      where: { id: sessionId },
      data: pauseToDb(pause, pausedAt),
    });
  }

  /** Rekonstruksi PauseState dari kolom durability (restart recovery). */
  async loadPauseState(sessionId: string): Promise<PauseState | null> {
    const row = await db.mainSession.findUnique({ where: { id: sessionId } });
    if (!row) return null;
    return pauseFromRow(row);
  }

  /** Cek PIN terpakai sesi aktif (untuk generator PIN). */
  async isPinActive(pin: string): Promise<boolean> {
    const count = await db.mainSession.count({
      where: { pin, phase: { notIn: ['SUMMARY', 'ENDED'] } },
    });
    return count > 0;
  }

  /** Simpan index round aktif + fase (flush ringan). */
  async saveSessionProgress(
    sessionId: string,
    phase: Parameters<typeof phaseToDb>[0],
    currentRoundIndex: number | null,
  ): Promise<void> {
    await db.mainSession.update({
      where: { id: sessionId },
      data: { phase: phaseToDb(phase), currentRoundIndex },
    });
  }
}
