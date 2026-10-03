import "../src/main-bersama/infrastructure/persistence/require-test-db";
import assert from "node:assert/strict";
import { db } from "../lib/db";
import { saveQuestionPackage } from "../lib/main-bersama/save-question-package";
import { PrismaBankSoalQuestionSource } from "../src/main-bersama/adapters/bank-soal/bank-soal-source";
import { evaluatePackageCompatibility } from "../src/main-bersama/adapters/bank-soal/compatibility";
async function main() {
  const user = await db.user.create({
    data: {
      supabaseId: `author-${Date.now()}`,
      email: `author-${Date.now()}@test.invalid`,
      fullName: "Guru QA",
      role: "GURU",
    },
  });
  try {
    const questions = [
      {
        type: "PILIHAN_GANDA",
        prompt: "Kata baku?",
        options: ["Aktivitas", "Aktifitas"],
        correctIndex: 0,
        explanation: "Pembahasan",
      },
      {
        type: "BENAR_SALAH",
        prompt: "Matahari terbit di timur",
        options: ["Benar", "Salah"],
        correctIndex: 0,
        explanation: "",
      },
      {
        type: "ISIAN_SINGKAT",
        prompt: "Lawan kata besar?",
        options: [],
        correctIndex: null,
        answerText: "kecil",
        explanation: "",
      },
    ];
    const pack = await saveQuestionPackage(user.id, {
      title: "Soal buatan guru",
      kelas: "VII",
      reviewed: true,
      questions,
    });
    assert.equal(pack.questionCount, 3);
    const stored = await db.soalSet.findUniqueOrThrow({
      where: { id: pack.id },
      include: { questions: true },
    });
    const short = stored.questions.find((q) => q.type === "ISIAN_SINGKAT");
    assert(
      short && short.correctAnswer === "kecil" && short.options.length === 0,
    );
    assert.equal(stored.creatorId, user.id);
    assert.equal(stored.isPublic, false);
    assert(stored.questions.every((q) => q.uploaderId === user.id));
    const loaded = await new PrismaBankSoalQuestionSource(
      undefined,
      user.id,
    ).loadQuestions({
      kind: "SOAL_SET",
      soalSetId: pack.id,
    });
    assert(loaded.ok);
    if (!loaded.ok) throw new Error("Package not found");
    assert.deepEqual(
      loaded.questions.map((q) => q.prompt),
      questions.map((q) => q.prompt),
    );
    const privateOther = await new PrismaBankSoalQuestionSource(
      undefined,
      "other-teacher",
    ).loadQuestions({ kind: "SOAL_SET", soalSetId: pack.id });
    assert.equal(privateOther.ok, false);
    assert.equal(
      (
        await new PrismaBankSoalQuestionSource().loadQuestions({
          kind: "SOAL_SET",
          soalSetId: pack.id,
        })
      ).ok,
      false,
    );
    await db.soalSet.update({
      where: { id: pack.id },
      data: { isPublic: true },
    });
    assert(
      (
        await new PrismaBankSoalQuestionSource(
          undefined,
          "other-teacher",
        ).loadQuestions({ kind: "SOAL_SET", soalSetId: pack.id })
      ).ok,
    );
    await db.soalSet.update({
      where: { id: pack.id },
      data: { isPublic: false },
    });
    assert.equal(evaluatePackageCompatibility(loaded.questions).supported, 3);
    await assert.rejects(
      saveQuestionPackage(user.id, {
        title: "Invalid",
        kelas: "VII",
        reviewed: false,
        questions,
      }),
    );
    assert.equal(await db.soalSet.count({ where: { creatorId: user.id } }), 1);
    console.log(
      "Package persistence: ownership, privacy, order, validation, Main Bersama compatibility passed.",
    );
  } finally {
    await db.soal.deleteMany({ where: { uploaderId: user.id } });
    await db.soalSet.deleteMany({ where: { creatorId: user.id } });
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
}
void main();
