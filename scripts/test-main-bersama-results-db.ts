import "../src/main-bersama/infrastructure/persistence/require-test-db";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { db } from "../lib/db";
import { saveSessionResultsToKelasku } from "../lib/main-bersama/save-class-results";
import { saveQuestionPackage } from "../lib/main-bersama/save-question-package";
import {
  questionPackageSummarySelect,
  questionPackageSummary,
  questionPackageWhere,
} from "../lib/main-bersama/question-package-library";
import { PrismaBankSoalQuestionSource } from "../src/main-bersama/adapters/bank-soal/bank-soal-source";

async function main() {
  const prefix = `results-qa-${randomUUID()}`;
  const users: string[] = [];
  const sessions: string[] = [];
  try {
    for (const [index, role] of (
      ["GURU", "GURU", "MURID", "MURID", "MURID"] as const
    ).entries()) {
      const user = await db.user.create({
        data: {
          supabaseId: `${prefix}-${index}`,
          email: `${prefix}-${index}@test.invalid`,
          fullName: `QA ${index}`,
          role,
        },
      });
      users.push(user.id);
    }
    const [teacher, otherTeacher, full, late, outside] = users;
    const group = await db.group.create({
      data: {
        name: "QA destination",
        grade: "VII",
        accessCode: randomUUID(),
        teacherId: teacher,
        members: { create: [{ userId: full }, { userId: late }] },
      },
    });
    const otherGroup = await db.group.create({
      data: {
        name: "Other teacher",
        grade: "VII",
        accessCode: randomUUID(),
        teacherId: otherTeacher,
      },
    });
    const session = await db.mainSession.create({
      data: {
        pin: randomUUID(),
        teacherId: teacher,
        gameMode: "JELAJAH_KATA",
        phase: "ENDED",
        contentTitle: "QA recap",
        totalRounds: 2,
      },
    });
    sessions.push(session.id);
    const players = await Promise.all(
      [full, `${prefix}-3`, outside, null].map((userId, index) =>
        db.mainPlayer.create({
          data: {
            sessionId: session.id,
            userId,
            displayName: `QA player ${index}`,
          },
        }),
      ),
    );
    for (const index of [0, 1]) {
      const question = await db.mainQuestionSnapshot.create({
        data: {
          sessionId: session.id,
          position: index,
          sourceQuestionId: randomUUID(),
          type: "single-choice",
          prompt: "QA?",
          options: [{ id: "A", text: "Answer" }],
          correctOptionId: "A",
        },
      });
      const round = await db.mainRound.create({
        data: {
          sessionId: session.id,
          questionSnapshotId: question.id,
          index,
          status: "CLOSED",
          eligible: {
            create: [0, 2, 3, ...(index === 1 ? [1] : [])].map((i) => ({
              playerId: players[i].id,
            })),
          },
        },
      });
      await db.mainAnswer.create({
        data: {
          sessionId: session.id,
          roundId: round.id,
          playerId: players[0].id,
          submissionId: randomUUID(),
          selectedOptionId: index === 0 ? "A" : "B",
          isCorrect: index === 0,
          submittedAt: new Date(),
        },
      });
      if (index === 1)
        await db.mainAnswer.create({
          data: {
            sessionId: session.id,
            roundId: round.id,
            playerId: players[1].id,
            submissionId: randomUUID(),
            selectedOptionId: "A",
            isCorrect: true,
            submittedAt: new Date(),
          },
        });
    }
    assert.deepEqual(
      await saveSessionResultsToKelasku(session.id, otherTeacher, group.id),
      { ok: false, code: "SESSION_NOT_FOUND" },
    );
    assert.deepEqual(await saveSessionResultsToKelasku(session.id, teacher), {
      ok: false,
      code: "CLASS_NOT_LINKED",
    });
    assert.deepEqual(
      await saveSessionResultsToKelasku(session.id, teacher, otherGroup.id),
      { ok: false, code: "CLASS_NOT_FOUND" },
    );
    await db.mainSession.update({
      where: { id: session.id },
      data: { phase: "LOBBY" },
    });
    assert.deepEqual(
      await saveSessionResultsToKelasku(session.id, teacher, group.id),
      { ok: false, code: "INVALID_PHASE" },
    );
    await db.mainSession.update({
      where: { id: session.id },
      data: { phase: "SUMMARY" },
    });
    await db.nilaiKategori.create({
      data: { groupId: group.id, nama: "Main Bersama", bobot: 20 },
    });
    const responses = await Promise.all(
      [1, 2, 3].map(() =>
        saveSessionResultsToKelasku(session.id, teacher, group.id),
      ),
    );
    assert(responses.every((response) => response.ok && response.saved === 2));
    await db.mainSession.update({
      where: { id: session.id },
      data: { phase: "ENDED" },
    });
    assert(
      (await saveSessionResultsToKelasku(session.id, teacher, group.id)).ok,
    );
    const values = await db.nilai.findMany({
      where: { sumberId: session.id },
      orderBy: { skor: "asc" },
    });
    assert.deepEqual(
      values.map((row) => row.skor),
      [50, 100],
    );
    assert(values.every((row) => [full, late].includes(row.userId)));
    assert.equal(
      await db.nilaiKategori
        .findUniqueOrThrow({
          where: { groupId_nama: { groupId: group.id, nama: "Main Bersama" } },
        })
        .then((row) => row.bobot),
      20,
    );
    await db.groupMember.delete({
      where: { groupId_userId: { groupId: group.id, userId: full } },
    });
    assert(
      (await saveSessionResultsToKelasku(session.id, teacher, group.id)).ok,
    );
    assert.equal(await db.nilai.count({ where: { sumberId: session.id } }), 2);

    const freshClass = await db.group.create({
      data: {
        name: "QA new category",
        grade: "VII",
        accessCode: randomUUID(),
        teacherId: teacher,
        members: { create: [{ userId: full }, { userId: late }] },
      },
    });
    const firstSaves = await Promise.all(
      [1, 2, 3].map(() =>
        saveSessionResultsToKelasku(session.id, teacher, freshClass.id),
      ),
    );
    assert(firstSaves.every((response) => response.ok && response.saved === 2));
    assert.equal(
      await db.nilai.count({
        where: { sumberId: session.id, groupId: freshClass.id },
      }),
      2,
    );
    assert.equal(
      await db.nilaiKategori.count({ where: { groupId: freshClass.id } }),
      1,
    );

    const input = {
      title: `${prefix} public`,
      kelas: "VII",
      reviewed: true,
      isPublic: true,
      questions: [
        {
          type: "PILIHAN_GANDA",
          prompt: "Kata baku?",
          options: ["Aktivitas", "Aktifitas"],
          correctIndex: 0,
          explanation: "",
        },
      ],
    };
    const pack = await saveQuestionPackage(teacher, input);
    await saveQuestionPackage(otherTeacher, {
      ...input,
      title: `${prefix} hidden`,
      isPublic: false,
    });
    const rows = await db.soalSet.findMany({
      where: questionPackageWhere(otherTeacher, "public", prefix),
      select: questionPackageSummarySelect,
    });
    assert.equal(rows.length, 1);
    const summary = questionPackageSummary(rows[0], otherTeacher);
    assert.equal(summary.isOwner, false);
    assert.equal(summary.isPublic, true);
    assert(!("questions" in summary) && !("creatorId" in summary));
    const source = new PrismaBankSoalQuestionSource(undefined, otherTeacher);
    assert(
      (await source.loadQuestions({ kind: "SOAL_SET", soalSetId: pack.id })).ok,
    );
    assert.equal(
      (
        await db.soalSet.updateMany({
          where: { id: pack.id, creatorId: otherTeacher },
          data: { isPublic: false },
        })
      ).count,
      0,
    );
    await db.soalSet.updateMany({
      where: { id: pack.id, creatorId: teacher },
      data: { isPublic: false },
    });
    assert.equal(
      (await source.loadQuestions({ kind: "SOAL_SET", soalSetId: pack.id })).ok,
      false,
    );
    assert.equal(
      await db.soalSet.count({
        where: questionPackageWhere(otherTeacher, "public", prefix),
      }),
      0,
    );
    assert.equal(
      await db.soalSet.count({
        where: questionPackageWhere(teacher, "mine", prefix),
      }),
      1,
    );
    console.log(
      "PASS DB: owned sessions/classes, summary/ended results, late join scores, membership, concurrent idempotency, category weights, public discovery/play, private revocation and owner-only editing.",
    );
  } finally {
    await db.nilai.deleteMany({ where: { sumberId: { in: sessions } } });
    await db.mainSession.deleteMany({ where: { id: { in: sessions } } });
    await db.soal.deleteMany({ where: { uploaderId: { in: users } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
