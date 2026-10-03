import assert from "node:assert/strict";
import {
  packageDraftSchema,
  parseQuestionText,
} from "../lib/main-bersama/question-authoring";
import { adaptQuestion } from "../src/main-bersama/adapters/bank-soal/adapt-question";
import {
  validateQuestionSnapshot,
  toPublicQuestionView,
} from "../src/main-bersama/domain/rules/question-snapshot";
import {
  computeCorrectness,
  evaluateAnswerSubmission,
} from "../src/main-bersama/domain/rules/answer-rules";
import { SessionEngine } from "../src/main-bersama/application/services/session-engine";
import { FakeClock } from "../src/main-bersama/domain/types/clock";
const parsed = parseQuestionText(
  "1. Matahari terbit dari timur.\nJenis: Benar Salah\nJawaban: Benar\n2. Lawan kata besar?\nJenis: Isian Singkat\nJawaban: kecil",
);
assert.equal(parsed.warnings.length, 0);
assert.equal(parsed.questions[0].correctIndex, 0);
assert.equal(parsed.questions[1].answerText, "kecil");
const draft = packageDraftSchema.parse({
  title: "Paket campuran",
  kelas: "Umum",
  reviewed: true,
  questions: [
    ...parsed.questions,
    {
      prompt: "Kata baku?",
      options: ["Aktivitas", "Aktifitas"],
      correctIndex: 0,
    },
  ],
});
for (const q of draft.questions) {
  const result = adaptQuestion({
    sourceQuestionId: "source",
    type: q.type,
    prompt: q.prompt,
    options: q.options,
    correctAnswer:
      q.type === "ISIAN_SINGKAT" ? q.answerText : String(q.correctIndex),
  });
  assert(result.ok);
  assert(validateQuestionSnapshot(result.question).valid);
  const publicView = toPublicQuestionView(result.question);
  assert(!("correctOptionId" in publicView));
  if (q.type === "ISIAN_SINGKAT") {
    assert.deepEqual(publicView.options, []);
    assert(computeCorrectness(result.question, "  KECIL  "));
    assert(!computeCorrectness(result.question, "besar"));
    const now = new Date();
    const context = {
      round: {
        id: "round",
        index: 0,
        question: result.question,
        closesAt: new Date(now.getTime() + 30000),
      },
      now,
      playerId: "p1",
      submissionId: "submission1",
      existingAnswer: null,
      existingAttempt: null,
      isEligible: true,
    };
    const correct = evaluateAnswerSubmission({
      ...context,
      selectedOptionId: "KECIL",
    });
    assert(correct.ok && correct.isCorrect);
    const wrong = evaluateAnswerSubmission({
      ...context,
      selectedOptionId: "besar",
    });
    assert(wrong.ok && !wrong.isCorrect);
    assert(
      !evaluateAnswerSubmission({
        ...context,
        selectedOptionId: " ".repeat(10),
      }).ok,
    );
    assert(
      !evaluateAnswerSubmission({
        ...context,
        selectedOptionId: "a".repeat(201),
      }).ok,
    );
    assert(
      !evaluateAnswerSubmission({
        ...context,
        now: new Date(now.getTime() + 40000),
        selectedOptionId: "kecil",
      }).ok,
    );
  }
}
assert(
  !packageDraftSchema.safeParse({
    ...draft,
    questions: [{ ...draft.questions[1], answerText: "" }],
  }).success,
);
assert(
  !packageDraftSchema.safeParse({
    ...draft,
    questions: [{ ...draft.questions[0], options: ["Ya", "Tidak"] }],
  }).success,
);
const legacy = adaptQuestion({
  sourceQuestionId: "legacy",
  type: "ISIAN_SINGKAT",
  prompt: "Tuliskan frasa",
  options: ["gagasan utama"],
  correctAnswer: "0",
});
assert(legacy.ok && computeCorrectness(legacy.question, " Gagasan   UTAMA "));
console.log(
  "Mixed question types: validation, import, adapter, server scoring, deadlines and answer-key isolation passed.",
);

if (legacy.ok) {
  const clock = new FakeClock();
  const snapshot = { ...legacy.question, id: "typed-question" };
  for (const gameMode of ["jelajah-kata", "kota-cahaya"] as const) {
    const engine = new SessionEngine({
      session: {
        id: "typed-session",
        pin: "123456",
        teacherId: "t1",
        gameMode,
        phase: "preparing",
        currentRoundIndex: null,
        totalRounds: 1,
        createdAt: clock.now(),
      },
      questions: {
        sessionId: "typed-session",
        gameMode,
        snapshots: [snapshot],
      },
      clock,
    });
    assert(engine.openLobby().ok);
    assert(
      engine.joinPlayer({
        playerId: "p1",
        displayName: "Siswa",
        teamId: "elang",
      }).ok,
    );
    assert(engine.openRound().ok);
    const payload = {
      roundId: "round-typed-session-0",
      playerId: "p1",
      submissionId: "typed-submit",
      selectedOptionId: "GAGASAN UTAMA",
    };
    assert(engine.submitAnswer(payload).ok);
    assert(engine.submitAnswer(payload).ok);
    assert(
      engine.state.answersByRound.get(payload.roundId)?.get("p1")?.isCorrect,
    );
    assert(
      !engine.submitAnswer({ ...payload, selectedOptionId: "changed" }).ok,
    );
    assert(engine.closeRound().ok);
  }
  console.log(
    "Short-answer sessions and retry safety passed for Jelajah Kata and Kota Cahaya.",
  );
}
