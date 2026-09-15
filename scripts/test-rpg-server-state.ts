/**
 * P2.6F real-PostgreSQL contract tests for the Pendekar server-state
 * foundation. This script refuses every non-localhost database and only uses
 * the disposable `bahasacerdas_staging` database used by existing repository
 * persistence tests.
 */

import { PrismaClient } from "@prisma/client";

const localUser = process.env.USER || process.env.USERNAME || "postgres";
const localUrl = `postgresql://${localUser}@localhost:5432/bahasacerdas_staging`;
const parsedUrl = new URL(localUrl);
if (!/^localhost$|^127\.0\.0\.1$/.test(parsedUrl.hostname)) {
  throw new Error("FATAL: P2.6F tests refuse a non-localhost database");
}

process.env.DATABASE_URL = localUrl;
process.env.DIRECT_URL = localUrl;

import {
  PendekarConflictError,
  PendekarOwnershipError,
  PendekarStateService,
} from "../lib/game/rpg/server-state";

const prisma = new PrismaClient({ datasources: { db: { url: localUrl } } });
const service = new PendekarStateService(prisma);

let passed = 0;
let failed = 0;
const failures: string[] = [];
let sequence = 0;
const runId = `p26f_${Date.now().toString(36)}`;
const fixtureIds: string[] = [];

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

async function rejects(action: () => Promise<unknown>, expected: new (...args: never[]) => Error, label: string): Promise<void> {
  try {
    await action();
    check(false, `${label} (no error)`);
  } catch (error) {
    check(error instanceof expected, `${label} (${error instanceof Error ? error.name : "unknown error"})`);
  }
}

async function createUser(label: string): Promise<string> {
  const id = nextId(`user_${label}`);
  fixtureIds.push(id);
  // The local disposable DB intentionally lags unrelated User columns (for
  // example `nickname`). Insert only its stable required parent columns; this
  // test must not migrate or alter User merely to create fixtures.
  await prisma.$executeRaw`
    INSERT INTO "User" ("id", "supabaseId", "email", "fullName", "updatedAt")
    VALUES (${id}, ${`${id}_supabase`}, ${`${id}@example.test`}, ${`P2.6F ${label}`}, NOW())
  `;
  return id;
}

async function createCanonicalQuestion(uploaderId: string): Promise<string> {
  const id = nextId("soal");
  await prisma.$executeRaw`
    INSERT INTO "Soal" ("id", "text", "options", "correctAnswer", "kelas", "uploaderId", "updatedAt")
    VALUES (${id}, 'Pilih jawaban benar', ARRAY['A', 'B'], 'A', 'SMP', ${uploaderId}, NOW())
  `;
  return id;
}

function battleSeed(label: string, encounterKey = "e1") {
  return {
    encounterKey,
    encounterDefinitionVersion: "p2.6c",
    battleState: { phase: "INTRO", label },
    rngState: `server-rng-${label}`,
    origin: { mapKey: "map.desa", x: 0.2717391304347826, y: 0.5416666666666666 },
    startRequestId: `start-${label}`,
    expiresAt: new Date(Date.now() + 60_000),
  };
}

async function testPlayerAndQuest(userA: string): Promise<void> {
  console.log("\n▶ Player and quest identity");
  const players = await Promise.all(Array.from({ length: 2 }, () => service.getOrCreatePendekarPlayer(userA)));
  check(players[0].id === players[1].id, "concurrent player creation returns one player");
  check(await prisma.pendekarPlayer.count({ where: { userId: userA } }) === 1, "database unique user ownership prevents duplicate player");

  const quests = await Promise.all(Array.from({ length: 2 }, () => service.getOrCreateQuestProgress(userA)));
  check(quests[0].id === quests[1].id, "concurrent quest bootstrap returns one quest row");
  check(await prisma.pendekarQuestProgress.count({ where: { playerId: players[0].id, questKey: "jejak-korog" } }) === 1, "quest identity is unique per player/static key");

  await prisma.pendekarQuestProgress.update({
    where: { id: quests[0].id },
    data: { status: "ACTIVE", progress: 3, target: 3 },
  });
  const completions = await Promise.all([
    service.completeQuestWithServerReward(userA, { idempotencyKey: `quest-${runId}`, rpgXp: 0, goldDelta: 60 }),
    service.completeQuestWithServerReward(userA, { idempotencyKey: `quest-${runId}`, rpgXp: 0, goldDelta: 60 }),
  ]);
  check(completions.filter((result) => result.completed).length === 1, "concurrent quest completion creates one reward receipt");
  const questReceipts = await prisma.pendekarRewardReceipt.findMany({ where: { playerId: players[0].id, sourceType: "QUEST" } });
  check(questReceipts.length === 1, "quest completion has one authoritative receipt");
}

async function testBattleLearningAndOwnership(userA: string, userB: string): Promise<void> {
  console.log("\n▶ Battle, learning, expiry, and ownership");
  const starts = await Promise.all([
    service.createBattleSession(userA, battleSeed(`replay-${runId}`)),
    service.createBattleSession(userA, battleSeed(`replay-${runId}`)),
  ]);
  check(starts[0].value.id === starts[1].value.id, "same battle start request replays one battle");
  check(starts.filter((result) => result.created).length === 1, "same battle start has one creation result");

  const battle = starts[0].value;
  const soalId = await createCanonicalQuestion(userA);
  const learning = await service.createLearningSession(userA, battle.id, {
    soalId,
    attemptId: `attempt-${runId}`,
    expiresAt: new Date(Date.now() + 30_000),
  });
  const learningReplay = await service.createLearningSession(userA, battle.id, {
    soalId,
    attemptId: `attempt-${runId}`,
    expiresAt: new Date(Date.now() + 30_000),
  });
  check(learning.created && !learningReplay.created && learning.value?.id === learningReplay.value?.id, "learning is uniquely bound to one battle");
  check((await service.getOwnedBattleSession(userB, battle.id)) === null, "user B cannot read user A battle through owned lookup");
  check((await service.getOwnedLearningSession(userB, learning.value!.id)) === null, "user B cannot read user A learning session through owned lookup");
  await rejects(
    () => service.createLearningSession(userB, battle.id, {
      soalId: "forged-soal",
      attemptId: `forged-${runId}`,
      expiresAt: new Date(Date.now() + 30_000),
    }),
    PendekarOwnershipError,
    "user B cannot bind learning to user A battle",
  );
  check(!(await service.expireOwnedBattle(userA, battle.id)), "unexpired battle cannot be expired");
  await prisma.pendekarBattleSession.update({ where: { id: battle.id }, data: { expiresAt: new Date(Date.now() - 1_000) } });
  check(await service.expireOwnedBattle(userA, battle.id), "expired owned battle transitions once");
  check(!(await service.expireOwnedBattle(userA, battle.id)), "expired battle cannot transition twice");
}

async function testActiveBattleConstraint(userA: string): Promise<void> {
  console.log("\n▶ Active battle uniqueness");
  const results = await Promise.allSettled([
    service.createBattleSession(userA, battleSeed(`active-a-${runId}`, "e2")),
    service.createBattleSession(userA, battleSeed(`active-b-${runId}`, "e3")),
  ]);
  check(results.filter((result) => result.status === "fulfilled").length === 1, "database partial unique index allows only one active battle");
  const rejected = results.find((result) => result.status === "rejected");
  check(rejected?.status === "rejected" && rejected.reason instanceof PendekarConflictError, "second active battle is a deterministic conflict");
}

async function testReceiptsAndWallet(userA: string, userB: string): Promise<void> {
  console.log("\n▶ Reward, wallet, replay, and cross-user isolation");
  const plan = {
    sourceType: "BATTLE" as const,
    sourceId: `battle-reward-${runId}`,
    idempotencyKey: `reward-${runId}`,
    rpgXp: 20,
    globalXp: 0 as const,
    goldDelta: 12,
  };
  const receipts = await Promise.all([
    service.createRewardReceipt(userA, plan),
    service.createRewardReceipt(userA, plan),
  ]);
  check(receipts[0].value.id === receipts[1].value.id, "same reward replay returns one receipt");
  check(receipts.filter((result) => result.created).length === 1, "concurrent reward creation has one creator");
  const receipt = receipts[0].value!;
  check((await service.getOwnedRewardReceipt(userB, receipt.id)) === null, "user B cannot read user A receipt through owned lookup");
  await rejects(() => service.settleRewardToWallet(userB, receipt.id), PendekarOwnershipError, "user B cannot settle user A receipt");

  const settlements = await Promise.all([
    service.settleRewardToWallet(userA, receipt.id),
    service.settleRewardToWallet(userA, receipt.id),
  ]);
  check(settlements.filter((result) => result.settled).length === 1, "concurrent wallet settlement has one writer");
  const player = await service.getOwnedPendekarPlayer(userA);
  check(player?.goldBalance === 42, "wallet settlement increments isolated Pendekar balance once");
  check(await prisma.pendekarWalletEntry.count({ where: { receiptId: receipt.id } }) === 1, "one wallet ledger entry is attributable to one receipt");
  check(await prisma.coinTransaction.count({ where: { userId: userA } }) === 0, "Pendekar wallet does not write global coin ledger");
  await rejects(
    () => service.createRewardReceipt(userA, { ...plan, goldDelta: 13 }),
    PendekarConflictError,
    "conflicting replay cannot change reward amount",
  );
}

async function main(): Promise<void> {
  const userA = await createUser("A");
  const userB = await createUser("B");
  try {
    await testPlayerAndQuest(userA);
    await testBattleLearningAndOwnership(userA, userB);
    await testActiveBattleConstraint(userA);
    await testReceiptsAndWallet(userA, userB);
  } finally {
    // Only fixtures created by this run are removed; child rows cascade through
    // the new explicit foreign keys. No shared staging data is touched.
    for (const id of fixtureIds) {
      await prisma.$executeRaw`DELETE FROM "User" WHERE "id" = ${id}`;
    }
    await prisma.$disconnect();
  }

  console.log(`\nP2.6F server-state tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  }
}

void main();
