// ─── Prisma Answer Repository ───────────────────────────────
// Implementasi AnswerRepository + submit transaksional.
//
// Dua constraint BERBEDA di database:
//  1. Business uniqueness : UNIQUE(MainAnswer.roundId, playerId)
//  2. Request idempotency : UNIQUE(MainAnswerSubmission.submissionId) global
//
// Race dua submit bersamaan → ditangani transaction + unique
// violation (P2002) yang dikonversi ke domain result — Prisma
// error TIDAK bocor keluar infrastructure.
//
// Idempotency survive restart karena attempt ledger ada di DB,
// bukan hanya Map in-memory Session Engine.

import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import type { MainAnswer } from '../../domain/entities/answer';
import type {
  AnswerQueryFilter,
  PlayerAnswerFilter,
} from '../../contracts/repositories/types';
import type { AnswerRepository } from '../../contracts/repositories/answer-repository';
import { answerToDb, answerToDomain } from '../persistence/mappers';

export type SubmitAnswerDbInput = {
  sessionId: string;
  roundId: string;
  playerId: string;
  submissionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  submittedAt: Date;
};

export type SubmitAnswerDbResult =
  | { ok: true; status: 'saved' | 'already-saved'; answer: MainAnswer }
  | {
      ok: false;
      code:
        | 'ANSWER_ALREADY_EXISTS'
        | 'SUBMISSION_ID_CONFLICT'
        | 'ROUND_NOT_FOUND';
    };

export class PrismaAnswerRepository implements AnswerRepository {
  async findByPlayerAndRound(
    filter: AnswerQueryFilter & { playerId: string },
  ): Promise<MainAnswer | null> {
    const row = await db.mainAnswer.findUnique({
      where: { roundId_playerId: { roundId: filter.roundId, playerId: filter.playerId } },
    });
    return row ? answerToDomain(row) : null;
  }

  async findByRound(filter: AnswerQueryFilter): Promise<MainAnswer[]> {
    const rows = await db.mainAnswer.findMany({
      where: { roundId: filter.roundId, sessionId: filter.sessionId },
      orderBy: { submittedAt: 'asc' },
    });
    return rows.map(answerToDomain);
  }

  async findByPlayer(filter: PlayerAnswerFilter): Promise<MainAnswer[]> {
    const rows = await db.mainAnswer.findMany({
      where: { sessionId: filter.sessionId, playerId: filter.playerId },
      orderBy: { submittedAt: 'asc' },
    });
    return rows.map(answerToDomain);
  }

  async save(answer: MainAnswer): Promise<void> {
    // Simple save (tanpa ledger) — untuk replay/test; production submit
    // memakai submitAnswer() yang transaksional.
    await db.mainAnswer.create({ data: answerToDb(answer) });
    await db.mainAnswerSubmission.create({
      data: {
        submissionId: answer.submissionId,
        sessionId: answer.sessionId,
        roundId: answer.roundId,
        playerId: answer.playerId,
        selectedOptionId: answer.selectedOptionId,
        accepted: true,
      },
    });
  }

  /**
   * Attempt lookup untuk idempotency (survive restart).
   * Null bila submissionId belum pernah tercatat.
   */
  async findAttempt(submissionId: string): Promise<{
    playerId: string;
    roundId: string;
    selectedOptionId: string;
    accepted: boolean;
  } | null> {
    const row = await db.mainAnswerSubmission.findUnique({
      where: { submissionId },
    });
    if (!row) return null;
    return {
      playerId: row.playerId,
      roundId: row.roundId,
      selectedOptionId: row.selectedOptionId,
      accepted: row.accepted,
    };
  }

  /**
   * Submit transaksional — menggabungkan aturan 3A (idempotency,
   * business uniqueness) dengan enforcement database:
   *
   * Urutan dalam transaksi:
   *   1. Cek attempt ledger (submissionId global):
   *      - sama player+round+option, accepted → already-saved
   *      - beda payload/player → SUBMISSION_ID_CONFLICT
   *   2. Cek existing answer (business uniqueness):
   *      sudah ada → ANSWER_ALREADY_EXISTS (jawaban pertama tetap)
   *   3. INSERT answer (UNIQUE roundId+playerId menangkap race)
   *      + INSERT ledger accepted=true.
   *
   * Prisma P2002 dikonversi ke domain result yang tepat.
   */
  async submitAnswer(input: SubmitAnswerDbInput): Promise<SubmitAnswerDbResult> {
    try {
      const answer = await db.$transaction(async (tx) => {
        // 1. Request idempotency (ledger global).
        const attempt = await tx.mainAnswerSubmission.findUnique({
          where: { submissionId: input.submissionId },
        });
        if (attempt) {
          const samePayload =
            attempt.playerId === input.playerId &&
            attempt.roundId === input.roundId &&
            attempt.selectedOptionId === input.selectedOptionId;
          if (!samePayload) throw new ConflictError();
          if (attempt.accepted) {
            const existing = await tx.mainAnswer.findUnique({
              where: {
                roundId_playerId: {
                  roundId: input.roundId,
                  playerId: input.playerId,
                },
              },
            });
            if (!existing) throw new ConflictError(); // korup: ledger accepted tanpa answer
            return { status: 'already-saved' as const, row: existing };
          }
          // Attempt sebelumnya ditolak → coba lagi di bawah (evaluasi baru).
        }

        // 2. Business uniqueness (fast path dalam tx).
        const existing = await tx.mainAnswer.findUnique({
          where: {
            roundId_playerId: {
              roundId: input.roundId,
              playerId: input.playerId,
            },
          },
        });
        if (existing) {
          if (existing.submissionId === input.submissionId) {
            // Jawaban yang tersimpan justru attempt submissionId ini —
            // retry identik yang kalah race → idempotent (already-saved).
            return { status: 'already-saved' as const, row: existing };
          }
          throw new AlreadyExistsError();
        }

        // 3. INSERT — UNIQUE(roundId, playerId) menangkap race.
        const created = await tx.mainAnswer.create({
          data: answerToDb({
            sessionId: input.sessionId,
            roundId: input.roundId,
            playerId: input.playerId,
            submissionId: input.submissionId,
            selectedOptionId: input.selectedOptionId,
            submittedAt: input.submittedAt,
            source: 'individual',
            isCorrect: input.isCorrect,
          }),
        });
        await tx.mainAnswerSubmission.create({
          data: {
            submissionId: input.submissionId,
            sessionId: input.sessionId,
            roundId: input.roundId,
            playerId: input.playerId,
            selectedOptionId: input.selectedOptionId,
            accepted: true,
          },
        });
        return { status: 'saved' as const, row: created };
      });

      return {
        ok: true,
        status: answer.status,
        answer: answerToDomain(answer.row),
      };
    } catch (error) {
      if (error instanceof ConflictError) {
        return { ok: false, code: 'SUBMISSION_ID_CONFLICT' };
      }
      if (error instanceof AlreadyExistsError) {
        return { ok: false, code: 'ANSWER_ALREADY_EXISTS' };
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Reconcile via attempt ledger dulu: bila submissionId ini sudah
          // tercatat accepted dengan payload sama dan answer-nya ada,
          // itu race retry identik → already-saved (bukan duplicate).
          const attempt = await db.mainAnswerSubmission.findUnique({
            where: { submissionId: input.submissionId },
          });
          const samePayload =
            attempt !== null &&
            attempt.accepted &&
            attempt.playerId === input.playerId &&
            attempt.roundId === input.roundId &&
            attempt.selectedOptionId === input.selectedOptionId;
          if (samePayload) {
            const existing = await db.mainAnswer.findUnique({
              where: {
                roundId_playerId: {
                  roundId: input.roundId,
                  playerId: input.playerId,
                },
              },
            });
            if (existing) {
              return { ok: true, status: 'already-saved', answer: answerToDomain(existing) };
            }
          }
          // P2002 di ledger (submissionId) dengan payload beda → conflict;
          // P2002 di answer (roundId, playerId) → business duplicate (Kasus C).
          const target = (error.meta as { target?: string[] } | undefined)?.target ?? [];
          if (target.includes('submissionId')) {
            return { ok: false, code: 'SUBMISSION_ID_CONFLICT' };
          }
          return { ok: false, code: 'ANSWER_ALREADY_EXISTS' };
        }
        if (error.code === 'P2025') {
          return { ok: false, code: 'ROUND_NOT_FOUND' };
        }
      }
      throw error; // unexpected — biarkan naik (programming error)
    }
  }

  /** Ledger rejected attempt (untuk audit retry yang ditolak). */
  async recordRejectedAttempt(input: {
    submissionId: string;
    sessionId: string;
    roundId: string;
    playerId: string;
    selectedOptionId: string;
  }): Promise<void> {
    await db.mainAnswerSubmission
      .create({
        data: { ...input, accepted: false },
      })
      .catch(() => {
        // submissionId sudah tercatat — abaikan (idempotent).
      });
  }

  /** Hitung accepted answer per round (verifikasi test). */
  async countAcceptedByRound(roundId: string): Promise<number> {
    return db.mainAnswer.count({ where: { roundId } });
  }
}

class ConflictError extends Error {}
class AlreadyExistsError extends Error {}
