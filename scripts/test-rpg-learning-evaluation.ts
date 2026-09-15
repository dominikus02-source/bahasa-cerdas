/** P2.6G.2 real-PostgreSQL learning lifecycle and evaluation tests. */

import { PrismaClient } from "@prisma/client";

const localUser = process.env.USER || process.env.USERNAME || "postgres";
const localUrl = `postgresql://${localUser}@localhost:5432/bahasacerdas_staging`;
if (!/^localhost$|^127\.0\.0\.1$/.test(new URL(localUrl).hostname)) {
  throw new Error("FATAL: P2.6G.2 tests refuse a non-localhost database");
}
process.env.DATABASE_URL = localUrl;
process.env.DIRECT_URL = localUrl;

import { isEligibleForGameplay } from "../lib/game-questions/quality";
import { parseSubmitLearningAnswerInput } from "../lib/game/rpg/server-contracts";
import {
  PendekarLearningError,
  PendekarOwnershipError,
  PendekarStateService,
} from "../lib/game/rpg/server-state";
import { soalToGameQuestion } from "../src/game/rpg/learning/rpg-challenge-selector";

const prisma = new PrismaClient({ datasources: { db: { url: localUrl } } });
const service = new PendekarStateService(prisma);
const source = "PENDEKAR_SURYA_KERTA_BATTLE";
let passed = 0;
let failed = 0;
let sequence = 0;
const failures: string[] = [];
const fixtureUsers: string[] = [];
const runId = `p26g2_${Date.now().toString(36)}`;
const testSoalSelect = {
  id: true,
  text: true,
  type: true,
  options: true,
  correctAnswer: true,
  difficulty: true,
  topik: true,
} as const;

function nextId(label: string): string {
  sequence += 1;
  return `${runId}_${sequence}_${label}`;
}

function check(condition: boolean, label: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ✅ ${label}`);
  } else {
    failed += 1;
    failures.push(label);
    console.log(`  ❌ ${label}`);
  }
}

async function rejects<T extends Error>(
  action: () => Promise<unknown>,
  expected: new (...args: never[]) => T,
  label: string,
  code?: string,
): Promise<void> {
  try {
    await action();
    check(false, `${label} (no error)`);
  } catch (error) {
    const codeMatches = code === undefined || (error instanceof expected && "code" in error && error.code === code);
    check(error instanceof expected && codeMatches, `${label} (${error instanceof Error ? error.name : "unknown"})`);
  }
}

async function createUser(label: string): Promise<string> {
  const id = nextId(`user_${label}`);
  fixtureUsers.push(id);
  await prisma.$executeRaw`
    INSERT INTO "User" ("id", "supabaseId", "email", "fullName", "updatedAt")
    VALUES (${id}, ${`${id}_supabase`}, ${`${id}@example.test`}, ${`P2.6G.2 ${label}`}, NOW())
  `;
  return id;
}

async function createQuestion(uploaderId: string, label: string, valid: boolean): Promise<string> {
  const id = nextId(`soal_${label}`);
  await prisma.$executeRaw`
    INSERT INTO "Soal" ("id", "text", "type", "options", "correctAnswer", "kelas", "source", "uploaderId", "updatedAt")
    VALUES (
      ${id},
      ${valid ? "Manakah jawaban yang benar untuk latihan Pendekar?" : "x"},
      'PILIHAN_GANDA',
      ARRAY['ALPHA-CORRECT', 'BETA', 'GAMMA', 'DELTA'],
      ${valid ? "ALPHA-CORRECT" : "NOT-IN-OPTIONS"},
      'SMP',
      'MANUAL',
      ${uploaderId},
      NOW()
    )
  `;
  return id;
}

async function startBattle(userId: string, encounterId: "e1" | "e2" | "e3", label: string): Promise<string> {
  const started = await service.startAuthoritativeBattle(userId, {
    encounterId,
    requestId: `battle-${label}-${runId}`,
  });
  return started.battle.id;
}

async function expireBattle(battleId: string): Promise<void> {
  await prisma.pendekarBattleSession.update({
    where: { id: battleId },
    data: { status: "EXPIRED", endedAt: new Date() },
  });
}

async function questionForBattle(battleId: string) {
  const learning = await prisma.pendekarLearningSession.findUniqueOrThrow({ where: { battleSessionId: battleId } });
  const question = await prisma.soal.findUniqueOrThrow({ where: { id: learning.soalId }, select: testSoalSelect });
  return { learning, question };
}

async function testLearningLifecycle(userA: string, userB: string, invalidQuestionId: string): Promise<void> {
  console.log("\n▶ Server-owned learning session and question integrity");
  const battleA = await startBattle(userA, "e1", "a-learning");
  const before = {
    player: await service.getOwnedPendekarPlayer(userA),
    rewards: await prisma.pendekarRewardReceipt.count(),
    wallet: await prisma.pendekarWalletEntry.count(),
    coins: await prisma.coinTransaction.count({ where: { userId: userA } }),
    quests: await prisma.pendekarQuestProgress.count(),
  };
  const started = await service.startAuthoritativeLearningSession(userA, battleA);
  const existing = await service.startAuthoritativeLearningSession(userA, battleA);
  const bound = await questionForBattle(battleA);
  check(started.category === "STARTED" && existing.category === "EXISTING", "owned active battle creates exactly one learning session");
  check(bound.learning.battleSessionId === battleA, "learning session is bound to the owned battle");
  check(started.learning.challenge.challengeId.startsWith(`soal:${bound.question.id}:battle`), "server selects and binds one canonical question");
  check(!("answer" in started.learning.challenge) && !JSON.stringify(started.learning.challenge).includes("correctAnswer"), "challenge DTO never exposes an answer key field");
  check(isEligibleForGameplay(soalToGameQuestion({
    id: bound.question.id,
    text: bound.question.text,
    type: bound.question.type,
    options: bound.question.options,
    correctAnswer: bound.question.correctAnswer,
    difficulty: bound.question.difficulty,
    topik: bound.question.topik,
  })), "server-selected question passes the canonical gameplay quality gate");

  const battleB = await startBattle(userB, "e1", "b-learning");
  await service.startAuthoritativeLearningSession(userB, battleB);
  check((await service.getOwnedLearningSession(userB, bound.learning.id)) === null, "user B cannot access user A learning session");
  await rejects(
    () => service.submitAuthoritativeLearningAnswer(userB, battleA, { answer: "ALPHA-CORRECT", requestKey: `foreign-${runId}` }),
    PendekarOwnershipError,
    "user B cannot submit to user A battle",
  );
  const foreignStart = await Promise.allSettled([service.startAuthoritativeLearningSession(userB, battleA)]);
  check(foreignStart[0]?.status === "rejected" && foreignStart[0].reason instanceof PendekarOwnershipError, "user B cannot start/access user A learning through battle id");

  const injected = parseSubmitLearningAnswerInput({
    answer: "ALPHA-CORRECT", requestKey: `inject-${runId}`,
    userId: userA, playerId: "forged", battleId: battleA, learningSessionId: bound.learning.id, questionId: invalidQuestionId,
    correctAnswer: "ALPHA-CORRECT", correctness: true, score: 1, xp: 999, coin: 999, reward: 999, damage: 999,
  });
  check(!injected.ok && injected.error.code === "INVALID_INPUT", "identity, question, answer-key, correctness, score, XP, coin, reward, and damage injection is rejected");
  check(!parseSubmitLearningAnswerInput({ answer: "", requestKey: `empty-${runId}` }).ok, "malformed empty answer is rejected");
  check(!parseSubmitLearningAnswerInput({ answer: "ALPHA-CORRECT", requestKey: "" }).ok, "malformed request key is rejected");

  const invalidBattle = await startBattle(await createUser("invalid"), "e1", "invalid-question");
  await rejects(
    () => service.createLearningSession(fixtureUsers[fixtureUsers.length - 1]!, invalidBattle, {
      soalId: invalidQuestionId,
      attemptId: `invalid-${runId}`,
      expiresAt: new Date(Date.now() + 60_000),
    }),
    PendekarLearningError,
    "retired/broken question cannot be bound through the legacy server seed primitive",
    "QUESTION_NOT_ELIGIBLE",
  );

  const after = {
    player: await service.getOwnedPendekarPlayer(userA),
    rewards: await prisma.pendekarRewardReceipt.count(),
    wallet: await prisma.pendekarWalletEntry.count(),
    coins: await prisma.coinTransaction.count({ where: { userId: userA } }),
    quests: await prisma.pendekarQuestProgress.count(),
  };
  check(before.player?.rpgXp === after.player?.rpgXp && before.player?.goldBalance === after.player?.goldBalance, "learning-session start does not mutate XP or Pendekar wallet");
  check(before.rewards === after.rewards && before.wallet === after.wallet && before.coins === after.coins && before.quests === after.quests, "learning-session start does not settle rewards, coins, wallet, or quests");

  await expireBattle(battleA);
  await expireBattle(battleB);
}

async function testAnswerEvaluation(userA: string, userB: string): Promise<void> {
  console.log("\n▶ Authoritative answer evaluation, evidence, replay, and expiry");
  const battleCorrect = await startBattle(userA, "e2", "correct");
  await service.startAuthoritativeLearningSession(userA, battleCorrect);
  const correctFixture = await questionForBattle(battleCorrect);
  const before = {
    player: await service.getOwnedPendekarPlayer(userA),
    rewards: await prisma.pendekarRewardReceipt.count(),
    wallet: await prisma.pendekarWalletEntry.count(),
    coins: await prisma.coinTransaction.count({ where: { userId: userA } }),
    quests: await prisma.pendekarQuestProgress.count(),
  };
  const key = `answer-correct-${runId}`;
  const correct = await service.submitAuthoritativeLearningAnswer(userA, battleCorrect, {
    answer: correctFixture.question.correctAnswer,
    requestKey: key,
  });
  const replay = await service.submitAuthoritativeLearningAnswer(userA, battleCorrect, {
    answer: correctFixture.question.correctAnswer,
    requestKey: key,
  });
  const evidence = await prisma.learningEvidence.findMany({
    where: { userId: userA, source, activityId: battleCorrect, questionId: correctFixture.question.id },
  });
  check(correct.category === "EVALUATED" && correct.evaluation.correct && correct.evaluation.score === 1, "correct answer is evaluated server-side");
  check(replay.category === "REPLAYED" && replay.evaluation.correct, "same answer request key replays the authoritative result");
  check(evidence.length === 1 && evidence[0]?.isCorrect === true && evidence[0]?.score === 1, "one authoritative LearningEvidence row records result and request binding");
  await rejects(
    () => service.submitAuthoritativeLearningAnswer(userA, battleCorrect, { answer: "different answer", requestKey: key }),
    PendekarLearningError,
    "conflicting replay is rejected",
    "ANSWER_REPLAY_CONFLICT",
  );
  await rejects(
    () => service.submitAuthoritativeLearningAnswer(userA, battleCorrect, { answer: correctFixture.question.correctAnswer, requestKey: `again-${runId}` }),
    PendekarLearningError,
    "completed challenge cannot be completed twice",
    "LEARNING_ALREADY_COMPLETED",
  );

  const battleIncorrect = await startBattle(userB, "e2", "incorrect");
  await service.startAuthoritativeLearningSession(userB, battleIncorrect);
  const incorrect = await service.submitAuthoritativeLearningAnswer(userB, battleIncorrect, {
    answer: "not-the-canonical-answer",
    requestKey: `answer-incorrect-${runId}`,
  });
  check(!incorrect.evaluation.correct && incorrect.evaluation.score === 0, "incorrect answer is evaluated server-side without a client correctness field");
  await rejects(
    () => service.submitAuthoritativeLearningAnswer(userB, battleIncorrect, { answer: "not-the-canonical-answer", requestKey: key }),
    PendekarLearningError,
    "user B cannot reuse user A globally unique request key",
    "ANSWER_REPLAY_CONFLICT",
  );

  const battleExpired = await startBattle(await createUser("expired"), "e3", "expired");
  const expiredUser = fixtureUsers[fixtureUsers.length - 1]!;
  await service.startAuthoritativeLearningSession(expiredUser, battleExpired);
  const expired = await questionForBattle(battleExpired);
  await prisma.pendekarLearningSession.update({ where: { id: expired.learning.id }, data: { expiresAt: new Date(Date.now() - 1_000) } });
  await rejects(
    () => service.submitAuthoritativeLearningAnswer(expiredUser, battleExpired, { answer: expired.question.correctAnswer, requestKey: `expired-${runId}` }),
    PendekarLearningError,
    "expired learning session is rejected",
    "LEARNING_EXPIRED",
  );

  const after = {
    player: await service.getOwnedPendekarPlayer(userA),
    rewards: await prisma.pendekarRewardReceipt.count(),
    wallet: await prisma.pendekarWalletEntry.count(),
    coins: await prisma.coinTransaction.count({ where: { userId: userA } }),
    quests: await prisma.pendekarQuestProgress.count(),
  };
  check(before.player?.rpgXp === after.player?.rpgXp && before.player?.goldBalance === after.player?.goldBalance, "answer evaluation does not award XP or Pendekar gold");
  check(before.rewards === after.rewards && before.wallet === after.wallet && before.coins === after.coins && before.quests === after.quests, "answer evaluation does not settle rewards, coins, wallet, or quests");

  await expireBattle(battleCorrect);
  await expireBattle(battleIncorrect);
}

async function testConcurrentAnswer(userA: string): Promise<void> {
  console.log("\n▶ Concurrent answer completion");
  const battle = await startBattle(userA, "e3", "concurrent");
  await service.startAuthoritativeLearningSession(userA, battle);
  const fixture = await questionForBattle(battle);
  const requestKey = `parallel-${runId}`;
  const results = await Promise.all([
    service.submitAuthoritativeLearningAnswer(userA, battle, { answer: fixture.question.correctAnswer, requestKey }),
    service.submitAuthoritativeLearningAnswer(userA, battle, { answer: fixture.question.correctAnswer, requestKey }),
  ]);
  const evidenceCount = await prisma.learningEvidence.count({ where: { userId: userA, source, activityId: battle, questionId: fixture.question.id } });
  const learning = await prisma.pendekarLearningSession.findUniqueOrThrow({ where: { battleSessionId: battle } });
  check(results.filter((result) => result.category === "EVALUATED").length === 1 && results.filter((result) => result.category === "REPLAYED").length === 1, "concurrent same request produces one evaluation and one replay");
  check(evidenceCount === 1 && learning.status === "ANSWERED" && learning.isCorrect === true, "concurrent submission leaves one final session and one evidence row");
}

async function main(): Promise<void> {
  const userA = await createUser("A");
  const userB = await createUser("B");
  const invalidQuestionId = await createQuestion(userA, "invalid", false);
  await createQuestion(userA, "valid", true);
  try {
    await testLearningLifecycle(userA, userB, invalidQuestionId);
    await testAnswerEvaluation(userA, userB);
    await testConcurrentAnswer(userA);
  } finally {
    for (const id of fixtureUsers) {
      await prisma.$executeRaw`DELETE FROM "User" WHERE "id" = ${id}`;
    }
    await prisma.$disconnect();
  }
  console.log(`\nP2.6G.2 learning-evaluation tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  }
}

void main();
