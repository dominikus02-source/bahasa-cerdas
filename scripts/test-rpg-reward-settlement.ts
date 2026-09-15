/** P2.6G.4C real-PostgreSQL authoritative reward-settlement tests. */

import { PrismaClient } from "@prisma/client";

const localUser = process.env.USER || process.env.USERNAME || "postgres";
const localUrl = `postgresql://${localUser}@localhost:5432/bahasacerdas_staging`;
if (!/^localhost$|^127\.0\.0\.1$/.test(new URL(localUrl).hostname)) {
  throw new Error("FATAL: P2.6G.4C tests refuse a non-localhost database");
}
process.env.DATABASE_URL = localUrl;
process.env.DIRECT_URL = localUrl;

import { parseSettleBattleRewardInput } from "../lib/game/rpg/server-contracts";
import {
  PendekarBattleRewardError,
  PendekarBattleSettlementError,
  PendekarOwnershipError,
  PendekarStateService,
} from "../lib/game/rpg/server-state";

const prisma = new PrismaClient({ datasources: { db: { url: localUrl } } });
const service = new PendekarStateService(prisma);
const runId = `p26g4c_${Date.now().toString(36)}`;
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
    VALUES (${id}, ${`${id}_supabase`}, ${`${id}@example.test`}, ${`P2.6G.4C ${label}`}, NOW())
  `;
  return id;
}

async function createQuestion(ownerId: string): Promise<void> {
  const id = nextId("soal");
  await prisma.$executeRaw`
    INSERT INTO "Soal" ("id", "text", "type", "options", "correctAnswer", "kelas", "source", "uploaderId", "updatedAt")
    VALUES (${id}, 'Pilih jawaban benar untuk settlement Pendekar.', 'PILIHAN_GANDA', ARRAY['BENAR-SETTLEMENT', 'SALAH'], 'BENAR-SETTLEMENT', 'SMP', 'MANUAL', ${ownerId}, NOW())
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

async function makeDefeat(userId: string, label: string): Promise<string> {
  const battleId = await makeReadyBattle(userId, label);
  const battle = await prisma.pendekarBattleSession.findUniqueOrThrow({ where: { id: battleId } });
  const state = JSON.parse(JSON.stringify(battle.battleState)) as { player: { hp: number } };
  state.player.hp = 1;
  await prisma.pendekarBattleSession.update({ where: { id: battleId }, data: { battleState: state } });
  await service.submitAuthoritativeBattleAction(userId, battleId, { action: "basic_attack", requestKey: `loss-action-${label}-${runId}` });
  return battleId;
}

async function createReceipt(userId: string, battleId: string, label: string): Promise<string> {
  const result = await service.createAuthoritativeBattleRewardReceipt(userId, battleId, { requestKey: `receipt-${label}-${runId}` });
  return result.receipt.id;
}

async function snapshot(userId: string, battleId: string) {
  const player = await prisma.pendekarPlayer.findUniqueOrThrow({ where: { userId } });
  const [user, wallet, xpEntries, inventory, quests, evidence, battle] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { xp: true, coins: true },
    }),
    prisma.pendekarWalletEntry.count({ where: { playerId: player.id } }),
    prisma.pendekarRpgXpEntry.count({ where: { playerId: player.id } }),
    prisma.pendekarInventoryItem.count({ where: { playerId: player.id } }),
    prisma.pendekarQuestProgress.count({ where: { playerId: player.id } }),
    prisma.learningEvidence.count({ where: { userId, activityId: battleId } }),
    prisma.pendekarBattleSession.findUniqueOrThrow({ where: { id: battleId } }),
  ]);
  const coins = await prisma.coinTransaction.count({ where: { userId } });
  const profileCoin = await localPlayerProfileCoin(userId);
  return {
    player,
    userXp: user.xp,
    userCoins: user.coins,
    profileCoin,
    coins,
    wallet,
    xpEntries,
    inventory,
    quests,
    evidence,
    battle: JSON.stringify(battle),
  };
}

async function localPlayerProfileCoin(userId: string): Promise<number | null> {
  const table = await prisma.$queryRaw<Array<{ tableName: string | null }>>`
    SELECT to_regclass('public."PlayerProfile"')::text AS "tableName"
  `;
  if (!table[0]?.tableName) return null;
  const profile = await prisma.$queryRaw<Array<{ coin: number }>>`
    SELECT "coin" FROM "PlayerProfile" WHERE "userId" = ${userId}
  `;
  return profile[0]?.coin ?? null;
}

async function installFailureTrigger(table: "PendekarRpgXpEntry" | "PendekarWalletEntry", receiptId: string): Promise<() => Promise<void>> {
  const triggerName = `p26g4c_fail_${table === "PendekarRpgXpEntry" ? "xp" : "wallet"}_${sequence}`;
  const functionName = `${triggerName}_fn`;
  const safeReceipt = receiptId.replace(/'/g, "''");
  await prisma.$executeRawUnsafe(`
    CREATE FUNCTION "${functionName}"() RETURNS trigger AS $$
    BEGIN
      IF NEW."receiptId" = '${safeReceipt}' THEN
        RAISE EXCEPTION 'P2.6G.4C forced settlement failure';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER "${triggerName}" BEFORE INSERT ON "${table}"
    FOR EACH ROW EXECUTE FUNCTION "${functionName}"();
  `);
  return async () => {
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerName}" ON "${table}";`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${functionName}"();`);
  };
}

async function testSettlement(userA: string): Promise<void> {
  console.log("\n▶ Authoritative RPG XP + Pendekar gold settlement");
  const battle = await makeVictory(userA, "valid");
  const receiptId = await createReceipt(userA, battle, "valid");
  const before = await snapshot(userA, battle);
  const settled = await service.settleAuthoritativeBattleReward(userA, battle, { requestKey: `settle-valid-${runId}` });
  const after = await snapshot(userA, battle);
  const receipt = await prisma.pendekarRewardReceipt.findUniqueOrThrow({ where: { id: receiptId } });
  const xp = await prisma.pendekarRpgXpEntry.findUniqueOrThrow({ where: { receiptId } });
  const wallet = await prisma.pendekarWalletEntry.findUniqueOrThrow({ where: { receiptId } });

  check(settled.category === "SETTLED" && settled.settlement.status === "SETTLED", "valid receipt settles once");
  check(after.player.rpgXp === before.player.rpgXp + 20 && after.player.rpgLevel === before.player.rpgLevel, "receipt-defined RPG XP is granted once through canonical progression");
  check(after.player.goldBalance === before.player.goldBalance + 12, "receipt-defined Pendekar gold is granted once");
  check(receipt.status === "SETTLED" && receipt.settledAt !== null, "receipt records terminal SETTLED state");
  check(xp.delta === 20 && xp.reference === settled.settlement.settlementReference && wallet.delta === 12, "immutable XP and gold entries carry deterministic receipt references");
  check(after.xpEntries === before.xpEntries + 1 && after.wallet === before.wallet + 1, "one receipt creates one XP entry and one wallet entry");
  check(after.userXp === before.userXp && after.userCoins === before.userCoins && after.profileCoin === before.profileCoin && after.coins === before.coins, "global XP and both platform coin systems remain unchanged");
  check(after.inventory === before.inventory && after.quests === before.quests && after.evidence === before.evidence && after.battle === before.battle, "inventory, quests, evidence, and battle aggregate remain unchanged");

  const same = await service.settleAuthoritativeBattleReward(userA, battle, { requestKey: `settle-valid-${runId}` });
  const different = await service.settleAuthoritativeBattleReward(userA, battle, { requestKey: `settle-other-${runId}` });
  const replayAfter = await snapshot(userA, battle);
  check(same.category === "REPLAYED" && different.category === "REPLAYED" && same.settlement.receiptId === receiptId, "same and different settlement request keys replay the durable result");
  check(replayAfter.player.rpgXp === after.player.rpgXp && replayAfter.player.goldBalance === after.player.goldBalance && replayAfter.xpEntries === after.xpEntries && replayAfter.wallet === after.wallet, "network-style retry cannot duplicate XP or gold");
  await rejects(
    () => prisma.pendekarRpgXpEntry.create({ data: { playerId: before.player.id, receiptId, delta: 20, levelBefore: 1, levelAfter: 1, xpBefore: 0, xpAfter: 20, reference: `${xp.reference}-duplicate` } }),
    Error,
    "database unique receipt constraint rejects duplicate RPG XP settlement",
  );
  await rejects(
    () => prisma.pendekarWalletEntry.create({ data: { playerId: before.player.id, receiptId, delta: 12, balanceAfter: wallet.balanceAfter, reason: `${wallet.reason}:duplicate` } }),
    Error,
    "database unique receipt constraint rejects duplicate Pendekar gold settlement",
  );
}

async function testConcurrency(userA: string): Promise<void> {
  console.log("\n▶ Real PostgreSQL concurrency and independent receipts");
  const battle = await makeVictory(userA, "concurrent");
  const receiptId = await createReceipt(userA, battle, "concurrent");
  const results = await Promise.all([
    service.settleAuthoritativeBattleReward(userA, battle, { requestKey: `concurrent-a-${runId}` }),
    service.settleAuthoritativeBattleReward(userA, battle, { requestKey: `concurrent-b-${runId}` }),
  ]);
  const [xpCount, walletCount] = await Promise.all([
    prisma.pendekarRpgXpEntry.count({ where: { receiptId } }),
    prisma.pendekarWalletEntry.count({ where: { receiptId } }),
  ]);
  check(results.filter((result) => result.category === "SETTLED").length === 1 && results.filter((result) => result.category === "REPLAYED").length === 1, "two concurrent settlement requests have one effective winner");
  check(xpCount === 1 && walletCount === 1, "PostgreSQL unique constraints leave one XP and one gold effect");

  const firstBattle = await makeVictory(userA, "independent-a");
  const secondBattle = await makeVictory(userA, "independent-b");
  const before = await prisma.pendekarPlayer.findUniqueOrThrow({ where: { userId: userA } });
  await createReceipt(userA, firstBattle, "independent-a");
  await createReceipt(userA, secondBattle, "independent-b");
  const independent = await Promise.all([
    service.settleAuthoritativeBattleReward(userA, firstBattle, { requestKey: `independent-a-${runId}` }),
    service.settleAuthoritativeBattleReward(userA, secondBattle, { requestKey: `independent-b-${runId}` }),
  ]);
  const after = await prisma.pendekarPlayer.findUniqueOrThrow({ where: { userId: userA } });
  check(independent.every((result) => result.category === "SETTLED") && after.rpgXp === before.rpgXp + 40 && after.goldBalance === before.goldBalance + 24, "two distinct victories settle independently for one player");
}

async function testGuards(userA: string, userB: string): Promise<void> {
  console.log("\n▶ Ownership, terminal-state, and tampering guards");
  const active = await service.startAuthoritativeBattle(userA, { encounterId: "e1", requestId: `active-${runId}` });
  await rejects(() => service.settleAuthoritativeBattleReward(userA, active.battle.id, { requestKey: `active-settle-${runId}` }), PendekarBattleRewardError, "ACTIVE battle cannot settle", "BATTLE_REWARD_NOT_ELIGIBLE");
  await prisma.pendekarBattleSession.update({ where: { id: active.battle.id }, data: { status: "EXPIRED", endedAt: new Date() } });
  await rejects(() => service.settleAuthoritativeBattleReward(userA, active.battle.id, { requestKey: `expired-settle-${runId}` }), PendekarBattleRewardError, "expired battle cannot settle", "BATTLE_REWARD_NOT_ELIGIBLE");
  await rejects(() => service.settleAuthoritativeBattleReward(userA, `missing-${runId}`, { requestKey: `missing-settle-${runId}` }), PendekarOwnershipError, "nonexistent battle cannot settle");

  const defeat = await makeDefeat(userA, "defeat");
  await rejects(() => service.settleAuthoritativeBattleReward(userA, defeat, { requestKey: `defeat-settle-${runId}` }), PendekarBattleRewardError, "DEFEAT battle cannot settle", "BATTLE_REWARD_NOT_ELIGIBLE");

  const missingReceiptBattle = await makeVictory(userA, "missing-receipt");
  await rejects(() => service.settleAuthoritativeBattleReward(userA, missingReceiptBattle, { requestKey: `missing-receipt-${runId}` }), PendekarBattleSettlementError, "victory without a server receipt cannot settle", "BATTLE_SETTLEMENT_NOT_READY");

  const ownedBattle = await makeVictory(userA, "ownership");
  const receiptId = await createReceipt(userA, ownedBattle, "ownership");
  await rejects(() => service.settleAuthoritativeBattleReward(userB, ownedBattle, { requestKey: `foreign-${runId}` }), PendekarOwnershipError, "cross-user battle/receipt settlement is rejected");
  await prisma.pendekarRewardReceipt.update({ where: { id: receiptId }, data: { rpgXp: 999 } });
  await rejects(() => service.settleAuthoritativeBattleReward(userA, ownedBattle, { requestKey: `tampered-${runId}` }), PendekarBattleRewardError, "tampered receipt amount is rejected against canonical battle definition", "BATTLE_REWARD_INVALID_STATE");

  const voidBattle = await makeVictory(userA, "void");
  const voidReceipt = await createReceipt(userA, voidBattle, "void");
  await prisma.pendekarRewardReceipt.update({ where: { id: voidReceipt }, data: { status: "VOID", voidedAt: new Date() } });
  await rejects(() => service.settleAuthoritativeBattleReward(userA, voidBattle, { requestKey: `void-${runId}` }), PendekarBattleSettlementError, "VOID receipt cannot settle", "BATTLE_SETTLEMENT_INVALID_STATE");

  const injected = parseSettleBattleRewardInput({ requestKey: `inject-${runId}`, userId: userA, playerId: "forged", receiptId: "forged", xp: 9999, gold: 9999, rewardType: "mythic", multiplier: 99, rarity: "legendary", item: "bijih", rng: 1, settlementTarget: "coins" });
  check(!injected.ok && injected.error.code === "INVALID_INPUT", "client user/player/receipt/XP/gold/reward/item/RNG/target injection is rejected");
  check(!parseSettleBattleRewardInput({ requestKey: "" }).ok, "malformed settlement request key is rejected");
}

async function testRollback(userA: string): Promise<void> {
  console.log("\n▶ Real PostgreSQL transaction rollback");
  const xpFailureBattle = await makeVictory(userA, "xp-failure");
  const xpFailureReceipt = await createReceipt(userA, xpFailureBattle, "xp-failure");
  const xpBefore = await snapshot(userA, xpFailureBattle);
  const removeXpTrigger = await installFailureTrigger("PendekarRpgXpEntry", xpFailureReceipt);
  try {
    await rejects(() => service.settleAuthoritativeBattleReward(userA, xpFailureBattle, { requestKey: `xp-failure-${runId}` }), Error, "forced XP ledger failure aborts settlement");
  } finally {
    await removeXpTrigger();
  }
  const xpAfter = await snapshot(userA, xpFailureBattle);
  const xpReceipt = await prisma.pendekarRewardReceipt.findUniqueOrThrow({ where: { id: xpFailureReceipt } });
  check(xpAfter.player.rpgXp === xpBefore.player.rpgXp && xpAfter.player.goldBalance === xpBefore.player.goldBalance && xpAfter.xpEntries === xpBefore.xpEntries && xpAfter.wallet === xpBefore.wallet && xpReceipt.status === "PENDING", "XP failure produces no gold and rolls receipt back to PENDING");
  const xpRetry = await service.settleAuthoritativeBattleReward(userA, xpFailureBattle, { requestKey: `xp-retry-${runId}` });
  check(xpRetry.category === "SETTLED", "rollback leaves a receipt safely retryable after the failure is removed");

  const goldFailureBattle = await makeVictory(userA, "gold-failure");
  const goldFailureReceipt = await createReceipt(userA, goldFailureBattle, "gold-failure");
  const goldBefore = await snapshot(userA, goldFailureBattle);
  const removeGoldTrigger = await installFailureTrigger("PendekarWalletEntry", goldFailureReceipt);
  try {
    await rejects(() => service.settleAuthoritativeBattleReward(userA, goldFailureBattle, { requestKey: `gold-failure-${runId}` }), Error, "forced gold ledger failure aborts settlement");
  } finally {
    await removeGoldTrigger();
  }
  const goldAfter = await snapshot(userA, goldFailureBattle);
  const goldReceipt = await prisma.pendekarRewardReceipt.findUniqueOrThrow({ where: { id: goldFailureReceipt } });
  check(goldAfter.player.rpgXp === goldBefore.player.rpgXp && goldAfter.player.goldBalance === goldBefore.player.goldBalance && goldAfter.xpEntries === goldBefore.xpEntries && goldAfter.wallet === goldBefore.wallet && goldReceipt.status === "PENDING", "gold failure produces no XP and rolls receipt back to PENDING");
  const goldRetry = await service.settleAuthoritativeBattleReward(userA, goldFailureBattle, { requestKey: `gold-retry-${runId}` });
  check(goldRetry.category === "SETTLED", "gold rollback leaves a receipt safely retryable after the failure is removed");
}

async function main(): Promise<void> {
  const userA = await createUser("owner");
  await createQuestion(userA);
  const userB = await createUser("other");
  try {
    await testSettlement(userA);
    await testConcurrency(userA);
    await testGuards(userA, userB);
    await testRollback(userA);
  } finally {
    for (const id of users) {
      await prisma.$executeRaw`DELETE FROM "User" WHERE "id" = ${id}`;
    }
    await prisma.$disconnect();
  }
  console.log(`\nP2.6G.4C reward-settlement tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  }
}

void main();
