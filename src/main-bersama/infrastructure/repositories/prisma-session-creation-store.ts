// ─── Infrastructure Store: Pembuatan Sesi Transaksional ────
// Satu-satunya tempat session + question snapshots + initial game
// state dibuat ATOMIK (Prisma $transaction). Bila langkah mana pun
// gagal, TIDAK ada sisa: session tanpa soal atau snapshot yatim
// tidak pernah tercipta.
//
// PIN collision (P2002 di MainSession) dikonversi ke PIN_TAKEN —
// caller bisa retry dengan PIN baru. Prisma error TIDAK bocor.

import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import type { MainSession } from '../../domain/entities/session';
import type { GameMode } from '../../domain/types/session';
import type { GameEngineState } from '../../games/game-router';
import type {
  MainSessionCreationStore,
  MainSessionCreationSnapshot,
} from '../../application/use-cases/ports';
import { gameModeToDb, phaseToDb, snapshotToDb } from '../persistence/mappers';
import {
  jelajahStateToJson,
  kotaStateToJson,
} from '../repositories/prisma-game-state-repository';

export class PrismaMainSessionCreationStore implements MainSessionCreationStore {
  async createMainSessionWithRuntime(input: {
    session: MainSession;
    kotaTargetCorrect: number | null;
    snapshots: MainSessionCreationSnapshot[];
    /** Null = Kota Cahaya PENDING_ROSTER (target belum difinalisasi). */
    initialState: GameEngineState | null;
    gameMode: GameMode;
  }): Promise<{ ok: true } | { ok: false; code: 'PIN_TAKEN' | 'SESSION_CREATION_FAILED' }> {
    try {
      await db.$transaction(async (tx) => {
        // 1. Sesi — phase PREPARING (mapping eksplisit, bukan string).
        await tx.mainSession.create({
          data: {
            id: input.session.id,
            pin: input.session.pin,
            teacherId: input.session.teacherId,
            classId: input.session.classId ?? null,
            className: input.session.className ?? null,
            gameMode: gameModeToDb(input.gameMode),
            phase: phaseToDb(input.session.phase),
            currentRoundIndex: input.session.currentRoundIndex,
            totalRounds: input.session.totalRounds,
            kotaTargetCorrect: input.kotaTargetCorrect,
            createdAt: input.session.createdAt,
          },
        });

        // 2. Snapshot soal — urutan paket = position (0-based).
        for (let position = 0; position < input.snapshots.length; position++) {
          const snap = input.snapshots[position]!;
          await tx.mainQuestionSnapshot.create({
            data: snapshotToDb(
              {
                id: snap.id,
                sourceQuestionId: snap.sourceQuestionId,
                type: snap.type,
                prompt: snap.prompt,
                options: snap.options.map((o) => ({ id: o.id, text: o.text })),
                correctOptionId: snap.correctOptionId,
                ...(snap.explanation !== undefined ? { explanation: snap.explanation } : {}),
                ...(snap.passage ? { passage: snap.passage } : {}),
              },
              input.session.id,
              position,
            ),
          });
        }

        // 3. Initial game state — empat regu / misi kota, revision awal.
        //     Kota PENDING_ROSTER (initialState null): TIDAK ada baris
        //     game state — dibuat saat finalisasi target nanti.
        if (input.initialState !== null) {
          const stateJson =
            input.initialState.gameMode === 'jelajah-kata'
              ? jelajahStateToJson(input.initialState.jelajah)
              : kotaStateToJson({
                  target: input.initialState.kota.target,
                  correctContribution: input.initialState.kota.correctContribution,
                  progressPercent: input.initialState.kota.progressPercent,
                  unlockedMilestones: input.initialState.kota.unlockedMilestones,
                  missionCompleted: input.initialState.kota.missionCompleted,
                  appliedRoundIds: input.initialState.kota.appliedRoundIds,
                  nextRoundIndex: input.initialState.kota.nextRoundIndex,
                });
          await tx.mainGameState.create({
            data: {
              sessionId: input.session.id,
              gameMode: gameModeToDb(input.gameMode),
              status: 'ACTIVE',
              state: stateJson as unknown as Prisma.InputJsonValue,
            },
          });
        }
      });
      return { ok: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // Unique violation pada PIN sesi (constraint terkecil yang
        // relevan di jalur ini) → caller retry dengan PIN baru.
        return { ok: false, code: 'PIN_TAKEN' };
      }
      // Detail infrastruktur berhenti di sini — tidak bocor ke domain.
      return { ok: false, code: 'SESSION_CREATION_FAILED' };
    }
  }
}
