/**
 * P2.6G.1 real-PostgreSQL contract tests. This script refuses non-localhost
 * databases and removes only users it created, through foreign-key cascades.
 */

import { PrismaClient } from "@prisma/client";

const localUser = process.env.USER || process.env.USERNAME || "postgres";
const localUrl = `postgresql://${localUser}@localhost:5432/bahasacerdas_staging`;
const parsedUrl = new URL(localUrl);
if (!/^localhost$|^127\.0\.0\.1$/.test(parsedUrl.hostname)) {
  throw new Error("FATAL: P2.6G.1 tests refuse a non-localhost database");
}

process.env.DATABASE_URL = localUrl;
process.env.DIRECT_URL = localUrl;

import { parseStartBattleInput } from "../lib/game/rpg/server-contracts";
import {
  PendekarBattleStartError,
  PendekarStateService,
} from "../lib/game/rpg/server-state";

const prisma = new PrismaClient({ datasources: { db: { url: localUrl } } });
const service = new PendekarStateService(prisma);

let passed = 0;
let failed = 0;
const failures: string[] = [];
let sequence = 0;
const runId = `p26g1_${Date.now().toString(36)}`;
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
    const matchesType = error instanceof expected;
    const matchesCode = code === undefined || (matchesType && "code" in error && error.code === code);
    check(matchesType && matchesCode, `${label} (${error instanceof Error ? error.name : "unknown error"})`);
  }
}

async function createUser(label: string): Promise<string> {
  const id = nextId(`user_${label}`);
  fixtureIds.push(id);
  // The disposable DB intentionally lags unrelated User fields. Keep fixtures
  // minimal rather than migrating an unrelated model for this test.
  await prisma.$executeRaw`
    INSERT INTO "User" ("id", "supabaseId", "email", "fullName", "updatedAt")
    VALUES (${id}, ${`${id}_supabase`}, ${`${id}@example.test`}, ${`P2.6G.1 ${label}`}, NOW())
  `;
  return id;
}

async function expireBattle(id: string): Promise<void> {
  await prisma.pendekarBattleSession.update({
    where: { id },
    data: { status: "EXPIRED", endedAt: new Date() },
  });
}

async function testProjectionAndIsolation(userA: string, userB: string): Promise<void> {
  console.log("\n▶ State projection and ownership");
  const playerA = await service.getOrCreatePendekarPlayer(userA);
  const playerB = await service.getOrCreatePendekarPlayer(userB);
  await prisma.pendekarPlayer.update({
    where: { id: playerA.id },
    data: { rpgLevel: 3, rpgXp: 44, goldBalance: 91 },
  });
  await prisma.pendekarInventoryItem.create({ data: { playerId: playerA.id, itemKey: "ramuan", quantity: 2 } });
  await prisma.pendekarQuestProgress.create({
    data: { playerId: playerA.id, questKey: "jejak-korog", status: "ACTIVE", progress: 1, target: 3, definitionVersion: "p2.6c" },
  });

  const before = await prisma.pendekarPlayer.findUniqueOrThrow({ where: { id: playerA.id } });
  const projectionA = await service.getStateProjection(userA);
  const projectionB = await service.getStateProjection(userB);
  const after = await prisma.pendekarPlayer.findUniqueOrThrow({ where: { id: playerA.id } });
  check(projectionA.player.progression.xp === 44 && projectionA.player.wallet.goldBalance === 91, "user A receives only their canonical progression and wallet");
  check(projectionB.player.wallet.goldBalance === playerB.goldBalance && projectionB.inventory.length === 0, "user B cannot receive user A inventory or wallet");
  check(projectionA.inventory[0]?.itemKey === "ramuan" && projectionA.quests[0]?.questKey === "jejak-korog", "projection has deterministic owned inventory and quest references");
  check(before.rpgXp === after.rpgXp && before.goldBalance === after.goldBalance && before.version === after.version, "state projection does not mutate XP, economy, or player version");
  const serialized = JSON.stringify(projectionA);
  check(!serialized.includes(playerA.id) && !serialized.includes(userA) && !serialized.includes("rngState"), "projection excludes internal player/user identity and RNG state");

  const forged = parseStartBattleInput({ encounterId: "e1", playerId: playerA.id });
  check(!forged.ok && forged.error.code === "INVALID_INPUT", "malformed player reference is rejected at the transport contract");
  const missing = parseStartBattleInput({ encounterId: "e1", playerId: "does-not-exist" });
  check(!missing.ok && missing.error.code === "INVALID_INPUT", "nonexistent player reference is rejected at the transport contract");
}

async function testBattleStart(userA: string, userB: string): Promise<void> {
  console.log("\n▶ Authoritative battle start, replay, and concurrency");
  const playerA = await service.getOwnedPendekarPlayer(userA);
  if (!playerA) throw new Error("missing user A player fixture");
  const before = {
    player: await prisma.pendekarPlayer.findUniqueOrThrow({ where: { id: playerA.id } }),
    rewards: await prisma.pendekarRewardReceipt.count({ where: { playerId: playerA.id } }),
    wallet: await prisma.pendekarWalletEntry.count({ where: { playerId: playerA.id } }),
    quest: await prisma.pendekarQuestProgress.findUniqueOrThrow({
      where: { playerId_questKey: { playerId: playerA.id, questKey: "jejak-korog" } },
    }),
    coins: await prisma.coinTransaction.count({ where: { userId: userA } }),
  };

  const start = await service.startAuthoritativeBattle(userA, { encounterId: "e1", requestId: `start-${runId}` });
  check(start.category === "STARTED" && start.battle.encounterId === "e1", "legal controlled-slice encounter starts from server definitions");
  check(start.battle.player.hp === before.player.hp && start.battle.enemies.length === 1, "battle snapshot derives player HP and static enemy server-side");
  const owned = await service.getOwnedBattleSession(userA, start.battle.id);
  const foreign = await service.getOwnedBattleSession(userB, start.battle.id);
  check(owned?.originMapKey === "map.desa" && owned?.rngState.length !== 0, "persisted battle has server-derived origin and RNG state");
  check(foreign === null, "user B cannot access user A battle through owned lookup");
  const replay = await service.startAuthoritativeBattle(userA, { encounterId: "e1", requestId: `start-${runId}` });
  check(replay.category === "REPLAYED" && replay.battle.id === start.battle.id, "same request replays the original battle without duplicate creation");

  const injected = parseStartBattleInput({
    encounterId: "e1", requestId: `inject-${runId}`, userId: userB, playerId: "forged", battleId: "forged", hp: 9999, damage: 9999, reward: 9999, xp: 9999, coin: 9999,
  });
  check(!injected.ok && injected.error.code === "INVALID_INPUT", "identity, battle id, HP, damage, reward, XP, and coin injection fields are rejected");
  await rejects(
    () => service.startAuthoritativeBattle(userA, { encounterId: "eboss", requestId: `bad-${runId}` }),
    PendekarBattleStartError,
    "invalid encounter is rejected",
    "INVALID_ENCOUNTER",
  );

  await expireBattle(start.battle.id);
  const sameRequest = `parallel-same-${runId}`;
  const parallelReplay = await Promise.all([
    service.startAuthoritativeBattle(userA, { encounterId: "e2", requestId: sameRequest }),
    service.startAuthoritativeBattle(userA, { encounterId: "e2", requestId: sameRequest }),
  ]);
  check(parallelReplay.map((result) => result.battle.id).every((id) => id === parallelReplay[0].battle.id), "concurrent same request resolves to one battle id");
  check(parallelReplay.filter((result) => result.category === "STARTED").length === 1, "concurrent same request has one creator and one replay");

  await expireBattle(parallelReplay[0].battle.id);
  const competing = await Promise.allSettled([
    service.startAuthoritativeBattle(userA, { encounterId: "e1", requestId: `parallel-a-${runId}` }),
    service.startAuthoritativeBattle(userA, { encounterId: "e3", requestId: `parallel-b-${runId}` }),
  ]);
  check(competing.filter((result) => result.status === "fulfilled").length === 1, "concurrent distinct starts create only one active battle");
  const rejected = competing.find((result) => result.status === "rejected");
  check(rejected?.status === "rejected" && rejected.reason instanceof PendekarBattleStartError && rejected.reason.code === "ACTIVE_BATTLE_EXISTS", "competing start returns deterministic active-battle conflict");

  const after = {
    player: await prisma.pendekarPlayer.findUniqueOrThrow({ where: { id: playerA.id } }),
    rewards: await prisma.pendekarRewardReceipt.count({ where: { playerId: playerA.id } }),
    wallet: await prisma.pendekarWalletEntry.count({ where: { playerId: playerA.id } }),
    quest: await prisma.pendekarQuestProgress.findUniqueOrThrow({
      where: { playerId_questKey: { playerId: playerA.id, questKey: "jejak-korog" } },
    }),
    coins: await prisma.coinTransaction.count({ where: { userId: userA } }),
  };
  check(after.player.rpgXp === before.player.rpgXp && after.player.goldBalance === before.player.goldBalance, "battle start does not award RPG XP or Pendekar gold");
  check(after.rewards === before.rewards && after.wallet === before.wallet && after.coins === before.coins, "battle start does not create reward receipts, wallet entries, or platform coin writes");
  check(after.quest.progress === before.quest.progress && after.quest.status === before.quest.status, "battle start does not mutate quest progress or turn-in state");
}

async function testInvalidPlayerState(userB: string): Promise<void> {
  console.log("\n▶ Canonical player state validation");
  const playerB = await service.getOwnedPendekarPlayer(userB);
  if (!playerB) throw new Error("missing user B player fixture");
  await prisma.pendekarPlayer.update({ where: { id: playerB.id }, data: { mapKey: "map.gunung" } });
  await rejects(
    () => service.startAuthoritativeBattle(userB, { encounterId: "e1", requestId: `wrong-map-${runId}` }),
    PendekarBattleStartError,
    "server rejects a requested slice encounter from a non-slice canonical map",
    "INVALID_PLAYER_STATE",
  );
}

async function main(): Promise<void> {
  const userA = await createUser("A");
  const userB = await createUser("B");
  try {
    await testProjectionAndIsolation(userA, userB);
    await testBattleStart(userA, userB);
    await testInvalidPlayerState(userB);
  } finally {
    for (const id of fixtureIds) {
      await prisma.$executeRaw`DELETE FROM "User" WHERE "id" = ${id}`;
    }
    await prisma.$disconnect();
  }
  console.log(`\nP2.6G.1 state-projection/battle-start tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    console.error(failures.join("\n"));
    process.exitCode = 1;
  }
}

void main();
