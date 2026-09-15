/** P2.6G.3 real-PostgreSQL authoritative battle-action tests. */

import { PrismaClient } from "@prisma/client";

const localUser = process.env.USER || process.env.USERNAME || "postgres";
const localUrl = `postgresql://${localUser}@localhost:5432/bahasacerdas_staging`;
if (!/^localhost$|^127\.0\.0\.1$/.test(new URL(localUrl).hostname)) {
  throw new Error("FATAL: P2.6G.3 tests refuse a non-localhost database");
}
process.env.DATABASE_URL = localUrl;
process.env.DIRECT_URL = localUrl;

import { BASIC_ATTACK_SKILL_ID, enemyAct, playerAct } from "../src/game/rpg/combat/battle-core";
import type { BattleRng } from "../src/game/rpg/combat/battle-rng";
import type { RPGBattleState } from "../src/game/rpg/combat/battle-state";
import { parseSubmitBattleActionInput } from "../lib/game/rpg/server-contracts";
import {
  PendekarBattleActionError,
  PendekarOwnershipError,
  PendekarStateService,
} from "../lib/game/rpg/server-state";

const prisma = new PrismaClient({ datasources: { db: { url: localUrl } } });
const service = new PendekarStateService(prisma);
const source = "PENDEKAR_SURYA_KERTA_BATTLE";
const runId = `p26g3_${Date.now().toString(36)}`;
const fixtureUsers: string[] = [];
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
  fixtureUsers.push(id);
  await prisma.$executeRaw`
    INSERT INTO "User" ("id", "supabaseId", "email", "fullName", "updatedAt")
    VALUES (${id}, ${`${id}_supabase`}, ${`${id}@example.test`}, ${`P2.6G.3 ${label}`}, NOW())
  `;
  return id;
}

async function createQuestion(ownerId: string): Promise<string> {
  const id = nextId("soal");
  await prisma.$executeRaw`
    INSERT INTO "Soal" ("id", "text", "type", "options", "correctAnswer", "kelas", "source", "uploaderId", "updatedAt")
    VALUES (${id}, 'Pilih jawaban benar untuk aksi Pendekar.', 'PILIHAN_GANDA', ARRAY['JAWABAN-BENAR', 'SALAH'], 'JAWABAN-BENAR', 'SMP', 'MANUAL', ${ownerId}, NOW())
  `;
  return id;
}

async function readyBattle(
  userId: string,
  label: string,
  answer = "JAWABAN-BENAR",
  encounterId: "e1" | "e2" | "e3" = "e1",
): Promise<string> {
  const started = await service.startAuthoritativeBattle(userId, { encounterId, requestId: `battle-${label}-${runId}` });
  await service.startAuthoritativeLearningSession(userId, started.battle.id);
  await service.submitAuthoritativeLearningAnswer(userId, started.battle.id, {
    answer,
    requestKey: `answer-${label}-${runId}`,
  });
  return started.battle.id;
}

async function rawBattle(id: string) {
  return prisma.pendekarBattleSession.findUniqueOrThrow({ where: { id } });
}

function stateFrom(value: unknown): RPGBattleState {
  return JSON.parse(JSON.stringify(value)) as RPGBattleState;
}

function rngFrom(value: string): BattleRng {
  return JSON.parse(value) as BattleRng;
}

function expectedRound(state: RPGBattleState, rng: BattleRng, action: "basic_attack" | "mahapukul", correct: boolean) {
  const target = state.enemies.find((enemy) => enemy.hp > 0);
  if (!target) throw new Error("fixture has no target");
  const player = playerAct(state, {
    battleId: state.battleId,
    turn: state.turn,
    actorId: state.player.id,
    targetId: target.id,
    skillId: action === "basic_attack" ? BASIC_ATTACK_SKILL_ID : "skill.mahapukul",
    learningCorrect: correct,
    charm: false,
  }, rng);
  if (!player.ok) throw new Error(`fixture player action rejected: ${player.reason}`);
  if (player.state.result !== undefined) return player;
  const enemy = player.state.enemies.find((candidate) => candidate.hp > 0);
  if (!enemy) throw new Error("fixture has no enemy response");
  const response = enemyAct(player.state, {
    battleId: player.state.battleId,
    turn: player.state.turn,
    actorId: enemy.id,
    enemyId: enemy.id,
    charm: false,
  }, player.rng);
  if (!response.ok) throw new Error(`fixture enemy action rejected: ${response.reason}`);
  return response;
}

async function economics(userId: string) {
  const player = await service.getOwnedPendekarPlayer(userId);
  if (!player) throw new Error("missing Pendekar fixture");
  return {
    xp: player.rpgXp,
    gold: player.goldBalance,
    coins: await prisma.coinTransaction.count({ where: { userId } }),
    wallet: await prisma.pendekarWalletEntry.count({ where: { playerId: player.id } }),
    rewards: await prisma.pendekarRewardReceipt.count({ where: { playerId: player.id } }),
    quests: await prisma.pendekarQuestProgress.count({ where: { playerId: player.id } }),
  };
}

async function testAuthorityAndReplay(userA: string, userB: string): Promise<void> {
  console.log("\n▶ Authoritative damage, learning binding, and replay");
  const battle = await readyBattle(userA, "authority", "JAWABAN-BENAR", "e3");
  const initial = await rawBattle(battle);
  const prepared = stateFrom(initial.battleState);
  prepared.enemies[0]!.hp = 100;
  prepared.enemies[0]!.maxHp = 100;
  await prisma.pendekarBattleSession.update({ where: { id: battle }, data: { battleState: JSON.parse(JSON.stringify(prepared)) } });
  const before = await rawBattle(battle);
  const expected = expectedRound(stateFrom(before.battleState), rngFrom(before.rngState), "mahapukul", true);
  const baselineWithoutLearningBonus = expectedRound(stateFrom(before.battleState), rngFrom(before.rngState), "mahapukul", false);
  const economicBefore = await economics(userA);
  const key = `action-authority-${runId}`;
  const result = await service.submitAuthoritativeBattleAction(userA, battle, { action: "mahapukul", requestKey: key });
  const after = await rawBattle(battle);
  const actions = await prisma.pendekarBattleAction.findMany({ where: { battleSessionId: battle } });
  check(result.category === "RESOLVED" && result.battle.actionRevision === before.actionRevision + 1, "valid completed learning result resolves exactly one authoritative action");
  check(result.battle.player.attack === prepared.player.attack && result.battle.player.defense === prepared.player.defense, "attacker combat stats are derived from the server battle snapshot");
  check(result.battle.enemies[0]?.defense === prepared.enemies[0]?.defense, "defender combat stats are derived from the server battle snapshot");
  check(expected.state.enemies[0]!.hp < baselineWithoutLearningBonus.state.enemies[0]!.hp, "authoritative correct learning result applies the canonical non-basic learning modifier");
  check(
    after.turn === expected.state.turn
      && result.battle.player.hp === expected.state.player.hp
      && result.battle.player.mp === expected.state.player.mp
      && result.battle.enemies.every((enemy, index) => enemy.hp === expected.state.enemies[index]?.hp)
      && result.battle.phase === expected.state.phase,
    "canonical player and enemy damage/HP transition is persisted server-side",
  );
  check(after.rngState === JSON.stringify(expected.rng) && !JSON.stringify(result).includes("rngState"), "server RNG advances internally and is never exposed in the client result");
  check(actions.length === 1 && actions[0]?.learningSessionId.length > 0 && actions[0]?.actionKind === "mahapukul", "one immutable action receipt consumes one bound learning result");
  const learning = await prisma.pendekarLearningSession.findUniqueOrThrow({ where: { battleSessionId: battle } });
  const evidenceCount = await prisma.learningEvidence.count({ where: { userId: userA, source, activityId: battle, questionId: learning.soalId, isCorrect: true } });
  check(evidenceCount === 1 && actions[0]?.learningSessionId === learning.id, "action is bound to the one server-evaluated LearningEvidence result");

  const replay = await service.submitAuthoritativeBattleAction(userA, battle, { action: "mahapukul", requestKey: key });
  check(replay.category === "REPLAYED" && JSON.stringify(replay.battle) === JSON.stringify(result.battle), "same request key and intent replays the original authoritative projection");
  await rejects(
    () => service.submitAuthoritativeBattleAction(userA, battle, { action: "basic_attack", requestKey: key }),
    PendekarBattleActionError,
    "conflicting replay payload is rejected",
    "BATTLE_ACTION_REPLAY_CONFLICT",
  );
  await rejects(
    () => service.submitAuthoritativeBattleAction(userA, battle, { action: "basic_attack", requestKey: `again-${runId}` }),
    PendekarBattleActionError,
    "a consumed learning result cannot cause duplicate damage",
    "LEARNING_ALREADY_CONSUMED",
  );

  const injections = parseSubmitBattleActionInput({
    action: "basic_attack", requestKey: `inject-${runId}`, userId: userA, playerId: "forged", battleId: battle,
    learningSessionId: "forged", targetId: "forged", damage: 9999, playerHP: 9999, enemyHP: 0, critical: true,
    hit: true, miss: false, rng: 1, correct: true, correctness: true, learningScore: 1, xp: 9999, coins: 9999, reward: 9999,
  });
  check(!injections.ok && injections.error.code === "INVALID_INPUT", "identity, target, damage, HP, crit, hit/miss, RNG, learning, XP, coin, and reward injection are rejected");
  check(!parseSubmitBattleActionInput({ action: "delete_everything", requestKey: `invalid-${runId}` }).ok, "illegal battle action is rejected by the transport contract");

  await rejects(
    () => service.submitAuthoritativeBattleAction(userB, battle, { action: "basic_attack", requestKey: `foreign-${runId}` }),
    PendekarOwnershipError,
    "user B cannot resolve user A battle",
  );
  const otherBattle = await readyBattle(userB, "foreign-key");
  await rejects(
    () => service.submitAuthoritativeBattleAction(userB, otherBattle, { action: "basic_attack", requestKey: key }),
    PendekarBattleActionError,
    "user B cannot reuse user A action key against another battle",
    "BATTLE_ACTION_REPLAY_CONFLICT",
  );

  const economicAfter = await economics(userA);
  check(JSON.stringify(economicAfter) === JSON.stringify(economicBefore), "battle action does not mutate XP, coins, wallet, rewards, gold, or quests");
}

async function testGuards(userId: string): Promise<void> {
  console.log("\n▶ Active-state, terminal-state, and learning guards");
  const missing = await service.startAuthoritativeBattle(userId, { encounterId: "e1", requestId: `missing-${runId}` });
  await rejects(
    () => service.submitAuthoritativeBattleAction(userId, missing.battle.id, { action: "basic_attack", requestKey: `missing-action-${runId}` }),
    PendekarBattleActionError,
    "battle action without a learning result is rejected",
    "LEARNING_RESULT_REQUIRED",
  );
  await prisma.pendekarBattleSession.update({ where: { id: missing.battle.id }, data: { status: "EXPIRED", endedAt: new Date() } });

  const expired = await readyBattle(userId, "expired");
  await prisma.pendekarBattleSession.update({ where: { id: expired }, data: { expiresAt: new Date(Date.now() - 1_000) } });
  await rejects(
    () => service.submitAuthoritativeBattleAction(userId, expired, { action: "basic_attack", requestKey: `expired-action-${runId}` }),
    PendekarBattleActionError,
    "expired battle rejects actions",
    "BATTLE_EXPIRED",
  );
  await prisma.pendekarBattleSession.update({ where: { id: expired }, data: { status: "EXPIRED", endedAt: new Date() } });

  const victory = await readyBattle(userId, "victory");
  const victoryBefore = await rawBattle(victory);
  const victoryState = stateFrom(victoryBefore.battleState);
  victoryState.enemies[0]!.hp = 1;
  await prisma.pendekarBattleSession.update({ where: { id: victory }, data: { battleState: JSON.parse(JSON.stringify(victoryState)) } });
  const win = await service.submitAuthoritativeBattleAction(userId, victory, { action: "basic_attack", requestKey: `win-${runId}` });
  check(win.battle.status === "WON" && win.battle.phase === "VICTORY" && win.battle.enemies.every((enemy) => enemy.hp === 0), "victory transition is derived and terminal without reward settlement");
  await rejects(
    () => service.submitAuthoritativeBattleAction(userId, victory, { action: "basic_attack", requestKey: `after-win-${runId}` }),
    PendekarBattleActionError,
    "terminal victory rejects later actions",
    "BATTLE_TERMINAL",
  );

  const defeat = await readyBattle(userId, "defeat");
  const defeatBefore = await rawBattle(defeat);
  const defeatState = stateFrom(defeatBefore.battleState);
  defeatState.player.hp = 1;
  await prisma.pendekarBattleSession.update({ where: { id: defeat }, data: { battleState: JSON.parse(JSON.stringify(defeatState)) } });
  const loss = await service.submitAuthoritativeBattleAction(userId, defeat, { action: "basic_attack", requestKey: `loss-${runId}` });
  check(loss.battle.status === "LOST" && loss.battle.phase === "DEFEAT" && loss.battle.player.hp === 0, "defeat transition is derived from canonical enemy response");
  await rejects(
    () => service.submitAuthoritativeBattleAction(userId, defeat, { action: "basic_attack", requestKey: `after-loss-${runId}` }),
    PendekarBattleActionError,
    "terminal defeat rejects later actions",
    "BATTLE_TERMINAL",
  );
}

async function testConcurrency(userId: string): Promise<void> {
  console.log("\n▶ PostgreSQL replay and conflicting-action concurrency");
  const same = await readyBattle(userId, "parallel-same");
  const key = `parallel-action-${runId}`;
  const results = await Promise.all([
    service.submitAuthoritativeBattleAction(userId, same, { action: "basic_attack", requestKey: key }),
    service.submitAuthoritativeBattleAction(userId, same, { action: "basic_attack", requestKey: key }),
  ]);
  const sameActions = await prisma.pendekarBattleAction.count({ where: { battleSessionId: same } });
  const sameSession = await rawBattle(same);
  check(results.filter((result) => result.category === "RESOLVED").length === 1 && results.filter((result) => result.category === "REPLAYED").length === 1, "concurrent same action has one resolver and one replay");
  check(sameActions === 1 && sameSession.actionRevision === 1 && sameSession.turn === 2, "concurrent same action produces one receipt, one HP mutation, and one state transition");
  await prisma.pendekarBattleSession.update({ where: { id: same }, data: { status: "EXPIRED", endedAt: new Date() } });

  const conflict = await readyBattle(userId, "parallel-conflict");
  const competing = await Promise.allSettled([
    service.submitAuthoritativeBattleAction(userId, conflict, { action: "basic_attack", requestKey: `conflict-basic-${runId}` }),
    service.submitAuthoritativeBattleAction(userId, conflict, { action: "mahapukul", requestKey: `conflict-maha-${runId}` }),
  ]);
  const conflictActions = await prisma.pendekarBattleAction.count({ where: { battleSessionId: conflict } });
  check(competing.filter((entry) => entry.status === "fulfilled").length === 1 && conflictActions === 1, "concurrent conflicting actions permit exactly one learning consumption and action mutation");
  const rejected = competing.find((entry) => entry.status === "rejected");
  check(
    rejected?.status === "rejected"
      && rejected.reason instanceof PendekarBattleActionError
      && ["LEARNING_ALREADY_CONSUMED", "BATTLE_TERMINAL"].includes(rejected.reason.code),
    "concurrent conflicting action receives a deterministic consumed-or-terminal conflict",
  );
}

async function main(): Promise<void> {
  const owner = await createUser("owner");
  await createQuestion(owner);
  const userA = owner;
  const userB = await createUser("other");
  const userGuards = await createUser("guards");
  const userConcurrent = await createUser("concurrent");
  try {
    await testAuthorityAndReplay(userA, userB);
    await testGuards(userGuards);
    await testConcurrency(userConcurrent);
  } finally {
    for (const id of fixtureUsers) {
      await prisma.$executeRaw`DELETE FROM "User" WHERE "id" = ${id}`;
    }
    await prisma.$disconnect();
  }
  console.log(`\nP2.6G.3 battle-action/damage tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  }
}

void main();
