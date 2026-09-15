/** P2.6G.4A real-PostgreSQL authoritative reward-receipt tests. */

import { PrismaClient } from "@prisma/client";

const localUser = process.env.USER || process.env.USERNAME || "postgres";
const localUrl = `postgresql://${localUser}@localhost:5432/bahasacerdas_staging`;
if (!/^localhost$|^127\.0\.0\.1$/.test(new URL(localUrl).hostname)) {
  throw new Error("FATAL: P2.6G.4A tests refuse a non-localhost database");
}
process.env.DATABASE_URL = localUrl;
process.env.DIRECT_URL = localUrl;

import { parseCreateBattleRewardReceiptInput } from "../lib/game/rpg/server-contracts";
import {
  PendekarBattleRewardError,
  PendekarOwnershipError,
  PendekarStateService,
} from "../lib/game/rpg/server-state";

const prisma = new PrismaClient({ datasources: { db: { url: localUrl } } });
const service = new PendekarStateService(prisma);
const runId = `p26g4a_${Date.now().toString(36)}`;
const users: string[] = [];
let sequence = 0;
let passed = 0;
let failed = 0;
const failures: string[] = [];

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
  users.push(id);
  await prisma.$executeRaw`
    INSERT INTO "User" ("id", "supabaseId", "email", "fullName", "updatedAt")
    VALUES (${id}, ${`${id}_supabase`}, ${`${id}@example.test`}, ${`P2.6G.4A ${label}`}, NOW())
  `;
  return id;
}

async function createQuestion(ownerId: string): Promise<void> {
  const id = nextId("soal");
  await prisma.$executeRaw`
    INSERT INTO "Soal" ("id", "text", "type", "options", "correctAnswer", "kelas", "source", "uploaderId", "updatedAt")
    VALUES (${id}, 'Pilih jawaban benar untuk receipt Pendekar.', 'PILIHAN_GANDA', ARRAY['BENAR-RECEIPT', 'SALAH'], 'BENAR-RECEIPT', 'SMP', 'MANUAL', ${ownerId}, NOW())
  `;
}

async function makeReadyBattle(userId: string, label: string): Promise<string> {
  const started = await service.startAuthoritativeBattle(userId, { encounterId: "e1", requestId: `battle-${label}-${runId}` });
  await service.startAuthoritativeLearningSession(userId, started.battle.id);
  const learning = await prisma.pendekarLearningSession.findUniqueOrThrow({ where: { battleSessionId: started.battle.id } });
  const question = await prisma.soal.findUniqueOrThrow({ where: { id: learning.soalId }, select: { correctAnswer: true } });
  await service.submitAuthoritativeLearningAnswer(userId, started.battle.id, {
    answer: question.correctAnswer,
    requestKey: `answer-${label}-${runId}`,
  });
  return started.battle.id;
}

async function makeVictory(userId: string, label: string): Promise<string> {
  const battleId = await makeReadyBattle(userId, label);
  const battle = await prisma.pendekarBattleSession.findUniqueOrThrow({ where: { id: battleId } });
  const state = JSON.parse(JSON.stringify(battle.battleState)) as { enemies: Array<{ hp: number }> };
  state.enemies[0]!.hp = 1;
  await prisma.pendekarBattleSession.update({ where: { id: battleId }, data: { battleState: state } });
  await service.submitAuthoritativeBattleAction(userId, battleId, { action: "basic_attack", requestKey: `action-${label}-${runId}` });
  return battleId;
}

async function economicAndBattleSnapshot(userId: string, battleId: string) {
  const player = await service.getOwnedPendekarPlayer(userId);
  if (!player) throw new Error("missing player fixture");
  return {
    player: await prisma.pendekarPlayer.findUniqueOrThrow({ where: { id: player.id } }),
    battle: await prisma.pendekarBattleSession.findUniqueOrThrow({ where: { id: battleId } }),
    coins: await prisma.coinTransaction.count({ where: { userId } }),
    wallet: await prisma.pendekarWalletEntry.count({ where: { playerId: player.id } }),
    quests: await prisma.pendekarQuestProgress.count({ where: { playerId: player.id } }),
    inventory: await prisma.pendekarInventoryItem.count({ where: { playerId: player.id } }),
    evidence: await prisma.learningEvidence.count({ where: { userId, activityId: battleId } }),
  };
}

async function testVictoryReceipt(userA: string, userB: string): Promise<void> {
  console.log("\n▶ Authoritative victory entitlement and zero settlement");
  const battle = await makeVictory(userA, "receipt-a");
  const before = await economicAndBattleSnapshot(userA, battle);
  const key = `reward-a-${runId}`;
  const created = await service.createAuthoritativeBattleRewardReceipt(userA, battle, { requestKey: key });
  const stored = await prisma.pendekarRewardReceipt.findUniqueOrThrow({ where: { id: created.receipt.id } });
  const after = await economicAndBattleSnapshot(userA, battle);
  check(created.category === "CREATED" && created.receipt.status === "PENDING", "authoritative PLAYER_VICTORY creates one pending receipt");
  check(stored.playerId === before.player.id && stored.sourceType === "BATTLE" && stored.sourceId === battle, "receipt belongs to the owner and references the victorious battle");
  check(stored.definitionVersion === "p1.4b-canonical-battle-core-intent-v1" && stored.rpgXp === 20 && stored.goldDelta === 12 && stored.globalXp === 0, "receipt reuses canonical battle-core reward intent and immutable definition version");
  check(JSON.stringify(after.player) === JSON.stringify(before.player), "receipt creation does not mutate player XP, gold, or version");
  check(JSON.stringify(after.battle) === JSON.stringify(before.battle), "receipt creation does not mutate battle outcome, HP, RNG, or action revision");
  check(after.coins === before.coins && after.wallet === before.wallet && after.quests === before.quests && after.inventory === before.inventory && after.evidence === before.evidence, "receipt creation writes no coins, wallet, quest, inventory, or learning evidence");

  const replay = await service.createAuthoritativeBattleRewardReceipt(userA, battle, { requestKey: key });
  const existing = await service.createAuthoritativeBattleRewardReceipt(userA, battle, { requestKey: `another-key-${runId}` });
  check(replay.category === "REPLAYED" && replay.receipt.id === created.receipt.id, "same request key returns the same deterministic receipt");
  check(existing.category === "EXISTING" && existing.receipt.id === created.receipt.id, "same victory cannot create a second receipt with a new request key");
  check((await service.getOwnedRewardReceipt(userB, created.receipt.id)) === null, "cross-user receipt read is isolated");
  await rejects(
    () => service.createAuthoritativeBattleRewardReceipt(userB, battle, { requestKey: `foreign-${runId}` }),
    PendekarOwnershipError,
    "user B cannot create a receipt for user A battle",
  );
}

async function testTerminalGuards(userA: string): Promise<void> {
  console.log("\n▶ Terminal state and malformed-source protection");
  const active = await service.startAuthoritativeBattle(userA, { encounterId: "e1", requestId: `active-${runId}` });
  await rejects(() => service.createAuthoritativeBattleRewardReceipt(userA, active.battle.id, { requestKey: `active-reward-${runId}` }), PendekarBattleRewardError, "ACTIVE battle is rejected", "BATTLE_REWARD_NOT_ELIGIBLE");
  await prisma.pendekarBattleSession.update({ where: { id: active.battle.id }, data: { status: "EXPIRED", endedAt: new Date() } });

  const defeat = await makeReadyBattle(userA, "defeat");
  const defeatRecord = await prisma.pendekarBattleSession.findUniqueOrThrow({ where: { id: defeat } });
  const defeatState = JSON.parse(JSON.stringify(defeatRecord.battleState)) as { player: { hp: number } };
  defeatState.player.hp = 1;
  await prisma.pendekarBattleSession.update({ where: { id: defeat }, data: { battleState: defeatState } });
  await service.submitAuthoritativeBattleAction(userA, defeat, { action: "basic_attack", requestKey: `loss-action-${runId}` });
  await rejects(() => service.createAuthoritativeBattleRewardReceipt(userA, defeat, { requestKey: `loss-reward-${runId}` }), PendekarBattleRewardError, "DEFEAT battle is rejected", "BATTLE_REWARD_NOT_ELIGIBLE");

  const expired = await makeReadyBattle(userA, "expired");
  await prisma.pendekarBattleSession.update({ where: { id: expired }, data: { status: "EXPIRED", endedAt: new Date() } });
  await rejects(() => service.createAuthoritativeBattleRewardReceipt(userA, expired, { requestKey: `expired-reward-${runId}` }), PendekarBattleRewardError, "expired battle is rejected", "BATTLE_REWARD_NOT_ELIGIBLE");
  await rejects(() => service.createAuthoritativeBattleRewardReceipt(userA, `missing-${runId}`, { requestKey: `missing-reward-${runId}` }), PendekarOwnershipError, "nonexistent battle is rejected");
}

async function testReplayAndConcurrency(userA: string, userB: string): Promise<void> {
  console.log("\n▶ Replay conflicts and real PostgreSQL concurrency");
  const battleB = await makeVictory(userA, "receipt-b");
  const keyB = `reward-b-${runId}`;
  await rejects(() => service.createAuthoritativeBattleRewardReceipt(userA, battleB, { requestKey: `reward-a-${runId}` }), PendekarBattleRewardError, "request key cannot be replayed against another victory", "BATTLE_REWARD_REPLAY_CONFLICT");
  const second = await service.createAuthoritativeBattleRewardReceipt(userA, battleB, { requestKey: keyB });
  check(second.category === "CREATED" && second.receipt.sourceBattleId === battleB, "two different victories create two independent receipts");

  const battleC = await makeVictory(userA, "receipt-concurrent");
  const concurrentKey = `reward-concurrent-${runId}`;
  const concurrent = await Promise.all([
    service.createAuthoritativeBattleRewardReceipt(userA, battleC, { requestKey: concurrentKey }),
    service.createAuthoritativeBattleRewardReceipt(userA, battleC, { requestKey: concurrentKey }),
  ]);
  const receiptCount = await prisma.pendekarRewardReceipt.count({ where: { sourceType: "BATTLE", sourceId: battleC } });
  check(concurrent.filter((result) => result.category === "CREATED").length === 1 && concurrent.filter((result) => result.category === "REPLAYED").length === 1, "concurrent same reward request has one creator and one replay");
  check(receiptCount === 1 && concurrent[0].receipt.id === concurrent[1].receipt.id, "PostgreSQL uniqueness leaves exactly one battle receipt");

  const userBBattle = await makeVictory(userB, "user-b");
  await rejects(() => service.createAuthoritativeBattleRewardReceipt(userB, userBBattle, { requestKey: `reward-a-${runId}` }), PendekarBattleRewardError, "user B cannot reuse user A reward request key", "BATTLE_REWARD_REPLAY_CONFLICT");
}

function testTransportTampering(userA: string): void {
  console.log("\n▶ Strict client authority boundary");
  const injected = parseCreateBattleRewardReceiptInput({
    requestKey: `inject-${runId}`, userId: userA, playerId: "forged", battleId: "forged", receiptId: "forged", victory: true,
    rewardType: "legendary", amount: 9999, xp: 9999, coins: 9999, rarity: "mythic", multiplier: 99, rng: 123,
  });
  check(!injected.ok && injected.error.code === "INVALID_INPUT", "user/player/battle/receipt/victory/reward/XP/coin/rarity/multiplier/RNG injection is rejected");
  check(!parseCreateBattleRewardReceiptInput({ requestKey: `amount-${runId}`, amount: 9999 }).ok, "client reward amount injection is rejected");
  check(!parseCreateBattleRewardReceiptInput({ requestKey: `xp-${runId}`, xp: 9999 }).ok, "client XP injection is rejected");
  check(!parseCreateBattleRewardReceiptInput({ requestKey: `coin-${runId}`, coins: 9999 }).ok, "client coin injection is rejected");
  check(!parseCreateBattleRewardReceiptInput({ requestKey: `rarity-${runId}`, rarity: "mythic" }).ok, "client rarity injection is rejected");
  check(!parseCreateBattleRewardReceiptInput({ requestKey: `victory-${runId}`, victory: true }).ok, "client victory injection is rejected");
  check(!parseCreateBattleRewardReceiptInput({ requestKey: `owner-${runId}`, playerId: "forged" }).ok, "client player-ownership injection is rejected");
  check(!parseCreateBattleRewardReceiptInput({ requestKey: "" }).ok, "malformed reward replay key is rejected");
}

async function main(): Promise<void> {
  const userA = await createUser("owner");
  await createQuestion(userA);
  const userB = await createUser("other");
  try {
    await testVictoryReceipt(userA, userB);
    await testTerminalGuards(userA);
    await testReplayAndConcurrency(userA, userB);
    testTransportTampering(userA);
  } finally {
    for (const id of users) {
      await prisma.$executeRaw`DELETE FROM "User" WHERE "id" = ${id}`;
    }
    await prisma.$disconnect();
  }
  console.log(`\nP2.6G.4A reward-receipt tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  }
}

void main();
