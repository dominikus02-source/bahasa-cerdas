// ─── Prisma Round Repository ────────────────────────────────
// Implementasi RoundRepository. openRound memakai TRANSAKSI:
// snapshot soal + round + eligible players dibersamaan atomik —
// snapshot eligibility WAJIB durable sebelum round bisa dijawab.

import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import type { MainRound } from '../../domain/entities/round';
import type {
  MainQuestionSnapshot,
} from '../../domain/entities/question';
import type { RoundRepository } from '../../contracts/repositories/round-repository';
import {
  optionsFromJson,
  roundStatusToDb,
  roundStatusToDomain,
  snapshotToDb,
  snapshotToDomain,
} from '../persistence/mappers';

type EligibleInput = { playerId: string; teamId?: string };

export class PrismaRoundRepository implements RoundRepository {
  async startIndependentJelajah(sessionId: string, now: Date): Promise<{ roundId: string }> {
    return db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "MainSession" WHERE id = ${sessionId} FOR UPDATE`;
      const session = await tx.mainSession.findUniqueOrThrow({ where: { id: sessionId } });
      if (session.gameMode === 'JELAJAH_KATA' && session.phase === 'QUESTION') {
        const existing = await tx.mainRound.findFirst({ where: { sessionId, index: 0, closesAt: null } });
        if (existing) return { roundId: existing.id };
      }
      if (session.phase !== 'LOBBY' || session.gameMode !== 'JELAJAH_KATA') throw new Error('Sesi belum siap dimulai.');
      const players = await tx.mainPlayer.findMany({ where: { sessionId, eligibleFromRoundIndex: 0 } });
      const questions = await tx.mainQuestionSnapshot.findMany({ where: { sessionId }, orderBy: { position: 'asc' } });
      if (players.length === 0 || questions.length !== session.totalRounds) throw new Error('Peserta atau soal belum siap.');
      const rounds = questions.map((question) => ({
        id: randomUUID(), sessionId, questionSnapshotId: question.id, index: question.position,
        status: 'OPEN' as const, openedAt: now, closesAt: null,
      }));
      await tx.mainRound.createMany({ data: rounds });
      await tx.mainRoundEligiblePlayer.createMany({ data: rounds.flatMap((round) => players.map((player) => ({
        roundId: round.id, playerId: player.id, teamId: player.teamId,
      }))) });
      await tx.mainSession.update({ where: { id: sessionId }, data: { phase: 'QUESTION', currentRoundIndex: 0, startedAt: now } });
      return { roundId: rounds[0].id };
    }, { timeout: 20000 });
  }

  async findById(id: string): Promise<MainRound | null> {
    const row = await db.mainRound.findUnique({
      where: { id },
      include: { question: true, eligible: true },
    });
    return row ? this.rowToDomain(row) : null;
  }

  async findBySession(sessionId: string): Promise<MainRound[]> {
    const rows = await db.mainRound.findMany({
      where: { sessionId },
      orderBy: { index: 'asc' },
      include: { question: true, eligible: true },
    });
    return rows.map((row) => this.rowToDomain(row));
  }

  async save(round: MainRound): Promise<void> {
    await db.$transaction(async (tx) => {
      // Snapshot soal dibuat sekali per sesi (idempotent per sessionId+position).
      await tx.mainQuestionSnapshot.upsert({
        where: {
          sessionId_position: {
            sessionId: round.sessionId,
            position: round.index,
          },
        },
        create: snapshotToDb(round.question, round.sessionId, round.index),
        update: {}, // snapshot TIDAK pernah di-update — immutability
      });
      const snapshot = await tx.mainQuestionSnapshot.findUnique({
        where: {
          sessionId_position: {
            sessionId: round.sessionId,
            position: round.index,
          },
        },
      });
      if (!snapshot) throw new Error('Snapshot gagal dibuat');

      await tx.mainRound.upsert({
        where: { sessionId_index: { sessionId: round.sessionId, index: round.index } },
        create: {
          id: round.id,
          sessionId: round.sessionId,
          questionSnapshotId: snapshot.id,
          index: round.index,
          status: roundStatusToDb(round.phase),
          openedAt: round.openedAt,
          closesAt: round.closesAt,
          closedAt: round.closedAt,
        },
        update: {
          status: roundStatusToDb(round.phase),
          openedAt: round.openedAt,
          closesAt: round.closesAt,
          closedAt: round.closedAt,
        },
      });

      // Eligible snapshot: buat sekali (idempotent), JANGAN diubah belakangan.
      for (const playerId of round.eligiblePlayerIds) {
        await tx.mainRoundEligiblePlayer.upsert({
          where: {
            roundId_playerId: { roundId: round.id, playerId },
          },
          create: {
            roundId: round.id,
            playerId,
            teamId: round.eligibleTeamIds?.[playerId],
          },
          update: {}, // snapshot — tidak boleh berubah setelah dibuat
        });
      }
    });
  }

  /** Upsert snapshot soal tanpa membuat round (persiapan preparing). */
  async saveQuestionSnapshots(
    sessionId: string,
    snapshots: MainQuestionSnapshot[],
  ): Promise<void> {
    await db.$transaction(async (tx) => {
      for (let position = 0; position < snapshots.length; position++) {
        await tx.mainQuestionSnapshot.upsert({
          where: {
            sessionId_position: { sessionId, position },
          },
          create: snapshotToDb(snapshots[position], sessionId, position),
          update: {},
        });
      }
    });
  }

  /** Muat snapshot soal per sesi (recovery engine). */
  async findQuestionSnapshots(sessionId: string): Promise<MainQuestionSnapshot[]> {
    const rows = await db.mainQuestionSnapshot.findMany({
      where: { sessionId },
      orderBy: { position: 'asc' },
    });
    return rows.map((row) => snapshotToDomain(row));
  }

  /**
   * Team snapshot per round: Map<roundId, Map<playerId, teamId>>.
   * Sumber kebenaran scoring historis — BUKAN MainPlayer.teamId.
   */
  async findEligibleSnapshots(
    sessionId: string,
  ): Promise<Map<string, Map<string, string | undefined>>> {
    const rows = await db.mainRoundEligiblePlayer.findMany({
      where: { round: { sessionId } },
      select: { roundId: true, playerId: true, teamId: true },
    });
    const result = new Map<string, Map<string, string | undefined>>();
    for (const row of rows) {
      let perRound = result.get(row.roundId);
      if (!perRound) {
        perRound = new Map();
        result.set(row.roundId, perRound);
      }
      perRound.set(row.playerId, row.teamId ?? undefined);
    }
    return result;
  }

  /** Simpan team snapshot eksplisit (bila caller punya data authoritatif). */
  async saveEligibleSnapshot(
    roundId: string,
    eligible: EligibleInput[],
  ): Promise<void> {
    await db.$transaction(async (tx) => {
      for (const entry of eligible) {
        await tx.mainRoundEligiblePlayer.upsert({
          where: {
            roundId_playerId: { roundId, playerId: entry.playerId },
          },
          create: { roundId, playerId: entry.playerId, teamId: entry.teamId },
          update: {}, // snapshot immutability
        });
      }
    });
  }

  /** Close round idempotent: bila closedAt sudah ada, tidak berubah. */
  async closeRound(roundId: string, closedAt: Date): Promise<boolean> {
    const existing = await db.mainRound.findUnique({ where: { id: roundId } });
    if (!existing) return false;
    if (existing.closedAt !== null) return true; // idempotent
    await db.mainRound.update({
      where: { id: roundId },
      data: { closedAt, status: roundStatusToDb('closed') },
    });
    return true;
  }

  /**
   * Satu-satunya request yang berhasil mengubah round OPEN menjadi CLOSED
   * menjadi pemilik auto-advance Jelajah. Session dipindah ke DISCUSSION di
   * transaksi yang sama agar engine yang direhidrasi bisa membuka soal baru
   * tanpa pernah menerima jawaban tambahan untuk round lama.
   */
  async claimAutoAdvance(input: {
    sessionId: string;
    roundId: string;
    roundIndex: number;
    closedAt: Date;
  }): Promise<boolean> {
    return db.$transaction(async (tx) => {
      const closed = await tx.mainRound.updateMany({
        where: {
          id: input.roundId,
          sessionId: input.sessionId,
          index: input.roundIndex,
          status: 'OPEN',
        },
        data: { status: 'CLOSED', closedAt: input.closedAt },
      });
      if (closed.count !== 1) return false;

      const transitioned = await tx.mainSession.updateMany({
        where: {
          id: input.sessionId,
          phase: 'QUESTION',
          currentRoundIndex: input.roundIndex,
        },
        data: { phase: 'DISCUSSION' },
      });
      if (transitioned.count !== 1) {
        throw new Error('Auto-advance tidak dapat mengklaim fase sesi');
      }
      return true;
    });
  }

  private rowToDomain(row: {
    id: string;
    sessionId: string;
    index: number;
    status: Parameters<typeof roundStatusToDomain>[0];
    openedAt: Date | null;
    closesAt: Date | null;
    closedAt: Date | null;
    question: Parameters<typeof snapshotToDomain>[0];
    eligible: { playerId: string; teamId: string | null }[];
  }): MainRound {
    const eligibleTeamIds: Record<string, string | undefined> = {};
    for (const entry of row.eligible) {
      eligibleTeamIds[entry.playerId] = entry.teamId ?? undefined;
    }
    const round: MainRound = {
      id: row.id,
      sessionId: row.sessionId,
      index: row.index,
      question: snapshotToDomain(row.question),
      eligiblePlayerIds: row.eligible.map((entry) => entry.playerId),
      phase: roundStatusToDomain(row.status),
      openedAt: row.openedAt ?? undefined,
      closesAt: row.closesAt ?? undefined,
      closedAt: row.closedAt ?? undefined,
      eligibleTeamIds,
    };
    return round;
  }
}
