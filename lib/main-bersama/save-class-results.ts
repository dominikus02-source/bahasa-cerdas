import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { buildClassGradePlan } from "./result-grades";

export async function saveSessionResultsToKelasku(
  sessionId: string,
  teacherId: string,
  classId?: string,
) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(
        async (tx) => {
          const session = await tx.mainSession.findFirst({
            where: { id: sessionId, teacherId },
            select: {
              id: true,
              phase: true,
              classId: true,
              contentTitle: true,
            },
          });
          if (!session)
            return { ok: false as const, code: "SESSION_NOT_FOUND" as const };
          if (session.phase !== "SUMMARY" && session.phase !== "ENDED")
            return { ok: false as const, code: "INVALID_PHASE" as const };
          const destination = classId || session.classId;
          if (!destination)
            return { ok: false as const, code: "CLASS_NOT_LINKED" as const };
          const group = await tx.group.findFirst({
            where: { id: destination, teacherId, isActive: true },
            select: {
              id: true,
              name: true,
              members: {
                select: { user: { select: { id: true, supabaseId: true } } },
              },
            },
          });
          if (!group)
            return { ok: false as const, code: "CLASS_NOT_FOUND" as const };
          const [rounds, answers, players] = await Promise.all([
            tx.mainRound.findMany({
              where: { sessionId },
              select: { id: true, eligible: { select: { playerId: true } } },
            }),
            tx.mainAnswer.findMany({
              where: { sessionId },
              select: { playerId: true, roundId: true, isCorrect: true },
            }),
            tx.mainPlayer.findMany({
              where: { sessionId },
              select: { id: true, userId: true },
            }),
          ]);
          const plan = buildClassGradePlan(
            players,
            group.members,
            rounds,
            answers,
          );
          if (!plan.entries.length)
            return {
              ok: false as const,
              code: "NO_CLASS_RESULTS" as const,
              skipped: plan.skipped,
            };
          const category = await tx.nilaiKategori.upsert({
            where: {
              groupId_nama: { groupId: group.id, nama: "Main Bersama" },
            },
            update: {},
            create: { groupId: group.id, nama: "Main Bersama", bobot: 100 },
            select: { id: true },
          });
          const source = {
            groupId: group.id,
            kategoriId: category.id,
            sumberType: "MAIN_BERSAMA",
            sumberId: session.id,
          };
          const existing = await tx.nilai.findMany({
            where: {
              ...source,
              userId: { in: plan.entries.map((entry) => entry.userId) },
            },
            select: { id: true, userId: true },
          });
          const byUser = new Map(
            existing.map((entry) => [entry.userId, entry.id]),
          );
          const values = plan.entries.map((entry) => ({
            ...source,
            userId: entry.userId,
            skor: entry.score,
            keterangan: `Main Bersama: ${session.contentTitle} (${entry.correct}/${entry.eligible} benar)`,
          }));
          const additions = values.filter((entry) => !byUser.has(entry.userId));
          if (additions.length) await tx.nilai.createMany({ data: additions });
          await Promise.all(
            values.flatMap((entry) => {
              const id = byUser.get(entry.userId);
              return id
                ? [
                    tx.nilai.update({
                      where: { id },
                      data: { skor: entry.skor, keterangan: entry.keterangan },
                    }),
                  ]
                : [];
            }),
          );
          return {
            ok: true as const,
            saved: plan.entries.length,
            className: group.name,
            classId: group.id,
            skipped: plan.skipped,
          };
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 15000,
        },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 2
      )
        continue;
      throw error;
    }
  }
}
