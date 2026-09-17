#!/usr/bin/env npx tsx
/**
 * P2.6I.2 — Server-Authoritative Quest State.
 *
 * Tests quest mutation validation, API contract, DB persistence, replay detection,
 * and client wrapper types.
 *
 * RUN: npx tsx scripts/test-rpg-p2-6i2-quest-mutation.ts
 */

import { PrismaClient, Prisma } from "@prisma/client";

const localUser = process.env.USER || process.env.USERNAME || "postgres";
const localUrl = `postgresql://${localUser}@localhost:5432/bahasacerdas_staging`;
const parsedUrl = new URL(localUrl);
if (!/^localhost$|^127\.0\.0\.1$/.test(parsedUrl.hostname)) {
  throw new Error("FATAL: P2.6I.2 tests refuse a non-localhost database");
}

process.env.DATABASE_URL = localUrl;
process.env.DIRECT_URL = localUrl;

const db = new PrismaClient({ datasources: { db: { url: localUrl } } });

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  const ok = actual === expected;
  if (!ok) {
    failed++;
    console.error(`  ✗ FAIL: ${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  } else {
    passed++;
    console.log(`  ✓ ${message}`);
  }
}

async function main() {
  // ─── Section 1: parseQuestMutationInput contract ──────────────────────────

  console.log("\nSection 1: parseQuestMutationInput contract...");

  const { parseQuestMutationInput } = await import("../lib/game/rpg/server-contracts");

  const validQuestAdvance = parseQuestMutationInput({ kind: "QUEST_ADVANCE", to: 3, requestKey: "req-001" });
  assert(validQuestAdvance.ok === true, "QUEST_ADVANCE valid → ok");

  const validKill = parseQuestMutationInput({ kind: "KILL", requestKey: "req-002" });
  assert(validKill.ok === true, "KILL valid → ok");

  const validFlower = parseQuestMutationInput({ kind: "FLOWER_PICK", requestKey: "req-003" });
  assert(validFlower.ok === true, "FLOWER_PICK valid → ok");

  const validFlag = parseQuestMutationInput({ kind: "FLAG", flagName: "sari", requestKey: "req-004" });
  assert(validFlag.ok === true, "FLAG valid → ok");

  const invalidKind = parseQuestMutationInput({ kind: "INVALID", requestKey: "req-005" });
  assert(invalidKind.ok === false, "Invalid kind → rejected");

  const invalidTo = parseQuestMutationInput({ kind: "QUEST_ADVANCE", to: 3.5, requestKey: "req-006" });
  assert(invalidTo.ok === false, "Non-integer to → rejected");

  const invalidToRange = parseQuestMutationInput({ kind: "QUEST_ADVANCE", to: 8, requestKey: "req-007" });
  assert(invalidToRange.ok === false, "to=8 out of range → rejected");

  const missingKey = parseQuestMutationInput({ kind: "KILL" });
  assert(missingKey.ok === false, "Missing requestKey → rejected");

  const extraField = parseQuestMutationInput({ kind: "KILL", requestKey: "req-008", extra: true });
  assert(extraField.ok === false, "Extra field → rejected");

  const flagMissingName = parseQuestMutationInput({ kind: "FLAG", requestKey: "req-009" });
  assert(flagMissingName.ok === false, "FLAG without flagName → rejected");

  const flagLongName = parseQuestMutationInput({ kind: "FLAG", flagName: "a".repeat(65), requestKey: "req-010" });
  assert(flagLongName.ok === false, "FLAG flagName>64 chars → rejected");

  const questAdvanceNoTo = parseQuestMutationInput({ kind: "QUEST_ADVANCE", requestKey: "req-011" });
  assert(questAdvanceNoTo.ok === false, "QUEST_ADVANCE without to → rejected");

  // ─── Section 2: Quest transition validation ───────────────────────────────

  console.log("\nSection 2: Quest transition validation...");

  const { isValidQuestTransition } = await import("../src/game/rpg/quests/quest-engine");

  assert(isValidQuestTransition(0, 1, { quest: 0, kills: 0, flags: {} }), "Transition 0→1 valid");
  assert(!isValidQuestTransition(0, 3, { quest: 0, kills: 0, flags: {} }), "Transition 0→3 invalid (must go 0→1→2→3)");
  assert(!isValidQuestTransition(4, 5, { quest: 4, kills: 0, flags: {} }), "Transition to 5 (dead) invalid");
  assert(isValidQuestTransition(1, 2, { quest: 1, kills: 3, flags: {} }), "Transition 1→2 with kills≥3 valid");
  assert(!isValidQuestTransition(1, 2, { quest: 1, kills: 1, flags: {} }), "Transition 1→2 with kills=1 invalid");
  assert(isValidQuestTransition(2, 3, { quest: 2, kills: 0, flags: {} }), "Transition 2→3 valid (no kill check)");
  assert(!isValidQuestTransition(3, 4, { quest: 3, kills: 0, flags: {} }), "Transition 3→4 without bossDead invalid");
  assert(isValidQuestTransition(3, 4, { quest: 3, kills: 0, flags: { bossDead: true } }), "Transition 3→4 with bossDead valid");

  // ─── Section 3: Flag validation ───────────────────────────────────────────

  console.log("\nSection 3: Flag validation...");

  const { QUEST_FLAG_NAMES } = await import("../src/game/rpg/quests/flags");

  const knownFlags = ["sari", "bossDead", "towerIntro", "towerDone", "charm", "tani", "ratmiMet", "empuMet", "kiAfter", "kiAfter2", "kiAfter3", "end1", "end2", "end3", "nagaDead", "sariQ"];
  for (const flag of knownFlags) {
    assert(QUEST_FLAG_NAMES.includes(flag), `Flag "${flag}" is in QUEST_FLAG_NAMES`);
  }
  assertEqual(QUEST_FLAG_NAMES.length, 16, "QUEST_FLAG_NAMES has exactly 16 entries");

  // ─── Section 4: PendekarStateService.mutateQuestState (live DB) ───────────

  console.log("\nSection 4: mutateQuestState (live DB)...");

  const { PendekarStateService, PendekarQuestMutationError } = await import("../lib/game/rpg/server-state");

  const testUser = await db.user.findFirst({
    where: { email: "murid@demo.com" },
    select: { id: true },
  });
  if (!testUser) {
    console.error("  ✗ Cannot find test user murid@demo.com — skipping DB tests");
    await db.$disconnect();
    process.exit(1);
  }

  // Ensure player exists
  let playerRow = await db.pendekarPlayer.findFirst({ where: { userId: testUser.id } });
  if (!playerRow) {
    playerRow = await db.pendekarPlayer.create({
      data: {
        userId: testUser.id,
        questState: JSON.parse(JSON.stringify({ main: 0, kills: 0, flowers: 0 })),
        flags: JSON.parse(JSON.stringify({})),
      },
    });
  }

  const originalQuest = playerRow.questState as Record<string, number>;
  const originalFlags = playerRow.flags as Record<string, boolean>;
  const originalVersion = playerRow.version;

  const service = new PendekarStateService(db);

  try {
    // Reset to initial state
    await db.pendekarPlayer.update({
      where: { userId: testUser.id },
      data: {
        questState: JSON.parse(JSON.stringify({ main: 0, kills: 0, flowers: 0 })),
        flags: JSON.parse(JSON.stringify({})),
      },
    });

    // Test 4.1: KILL mutation
    const killResult = await service.mutateQuestState(testUser.id, {
      kind: "KILL",
      requestKey: `test-kill-1`,
    });
    assertEqual(killResult.category, "APPLIED", "KILL → category APPLIED");
    assertEqual(killResult.quest.kills, 1, "KILL → kills incremented to 1");
    assertEqual(killResult.applied.length, 1, "KILL → 1 applied signal");
    assert(killResult.applied.includes("KILL"), "KILL signal applied");

    // Test 4.2: Second KILL
    const kill2 = await service.mutateQuestState(testUser.id, {
      kind: "KILL",
      requestKey: `test-kill-2`,
    });
    assertEqual(kill2.quest.kills, 2, "Second KILL → kills=2");

    // Test 4.3: Third KILL
    const kill3 = await service.mutateQuestState(testUser.id, {
      kind: "KILL",
      requestKey: `test-kill-3`,
    });
    assertEqual(kill3.quest.kills, 3, "Third KILL → kills=3");

    // Test 4.4: QUEST_ADVANCE 0→1
    const advResult = await service.mutateQuestState(testUser.id, {
      kind: "QUEST_ADVANCE",
      to: 1,
      requestKey: `test-adv-1`,
    });
    assertEqual(advResult.category, "APPLIED", "QUEST_ADVANCE 0→1 → APPLIED");
    assertEqual(advResult.quest.main, 1, "QUEST_ADVANCE 0→1 → main=1");

    // Test 4.5: QUEST_ADVANCE 1→2
    const adv2 = await service.mutateQuestState(testUser.id, {
      kind: "QUEST_ADVANCE",
      to: 2,
      requestKey: `test-adv-2`,
    });
    assertEqual(adv2.quest.main, 2, "QUEST_ADVANCE 1→2 → main=2");

    // Test 4.6: Invalid quest advance 2→4 (should fail)
    let threwCorrectly = false;
    try {
      await service.mutateQuestState(testUser.id, {
        kind: "QUEST_ADVANCE",
        to: 4,
        requestKey: `test-bad-adv`,
      });
    } catch (e) {
      threwCorrectly = e instanceof PendekarQuestMutationError && e.code === "QUEST_MUTATION_INVALID_TRANSITION";
    }
    assert(threwCorrectly, "Invalid quest advance 2→4 → QUEST_MUTATION_INVALID_TRANSITION");

    // Test 4.7: FLOWER_PICK
    const flowerResult = await service.mutateQuestState(testUser.id, {
      kind: "FLOWER_PICK",
      requestKey: `test-flower-1`,
    });
    assertEqual(flowerResult.quest.flowers, 1, "FLOWER_PICK → flowers=1");
    assert(flowerResult.applied.includes("FLOWER"), "FLOWER signal applied");

    // Test 4.8: FLAG
    const flagResult = await service.mutateQuestState(testUser.id, {
      kind: "FLAG",
      flagName: "sari",
      requestKey: `test-flag-1`,
    });
    assertEqual(flagResult.category, "APPLIED", "FLAG sari → APPLIED");
    assert(flagResult.flags["sari"] === true, "FLAG sari → true in flags");

    // Test 4.9: Invalid flag name
    let flagThrew = false;
    try {
      await service.mutateQuestState(testUser.id, {
        kind: "FLAG",
        flagName: "nonexistent_flag_xyz",
        requestKey: `test-bad-flag`,
      });
    } catch (e) {
      flagThrew = e instanceof PendekarQuestMutationError && e.code === "QUEST_MUTATION_INVALID_FLAG";
    }
    assert(flagThrew, "Invalid flag name → QUEST_MUTATION_INVALID_FLAG");

    // Test 4.10: Replay detection (same requestKey)
    const fixedKey = "replay-test-fixed-key";
    const first = await service.mutateQuestState(testUser.id, {
      kind: "KILL",
      requestKey: fixedKey,
    });
    assertEqual(first.category, "APPLIED", "First call with fixed key → APPLIED");

    const second = await service.mutateQuestState(testUser.id, {
      kind: "KILL",
      requestKey: fixedKey,
    });
    assertEqual(second.category, "REPLAYED", "Second call with same key → REPLAYED");
    assertEqual(second.quest.kills, first.quest.kills, "Replay → kills unchanged");

    // Test 4.11: Multiple FLAG mutations
    const flag2 = await service.mutateQuestState(testUser.id, {
      kind: "FLAG",
      flagName: "bossDead",
      requestKey: "test-flag-2",
    });
    assert(flag2.flags["sari"] === true, "Previous FLAG sari persists");
    assert(flag2.flags["bossDead"] === true, "New FLAG bossDead is set");

    // Test 4.12: Version counter increments
    assert(typeof advResult.version === "number" && advResult.version > 0, "Version is a positive number");

    // Test 4.13: Invalid player ID
    let ownershipThrew = false;
    try {
      await service.mutateQuestState("nonexistent-user-id", {
        kind: "KILL",
        requestKey: "test-no-user",
      });
    } catch {
      ownershipThrew = true;
    }
    assert(ownershipThrew, "Nonexistent user → throws error");

  } finally {
    // Restore original quest state
    await db.pendekarPlayer.update({
      where: { userId: testUser.id },
      data: {
        questState: JSON.parse(JSON.stringify(originalQuest)),
        flags: JSON.parse(JSON.stringify(originalFlags)),
        version: originalVersion,
      },
    });
    console.log("\n  ↩ Restored original quest state");
  }

  // ─── Section 5: API route contract validation ─────────────────────────────

  console.log("\nSection 5: API route contract...");

  for (const kind of ["QUEST_ADVANCE", "KILL", "FLOWER_PICK", "FLAG"] as const) {
    const result = parseQuestMutationInput({
      kind,
      requestKey: "test-contract",
      ...(kind === "QUEST_ADVANCE" ? { to: 1 } : {}),
      ...(kind === "FLAG" ? { flagName: "sari" } : {}),
    });
    assert(result.ok === true, `parseQuestMutationInput accepts kind="${kind}"`);
  }

  // ─── Section 6: Client API wrapper ────────────────────────────────────────

  console.log("\nSection 6: Client API wrapper...");

  const { mutateQuestState: clientMutate } = await import("../lib/game/rpg/server-api-client");
  assert(typeof clientMutate === "function", "clientMutateQuestState is exported as function");

  // ─── Section 7: API route file exists ─────────────────────────────────────

  console.log("\nSection 7: API route file...");

  const fs = await import("fs");
  const routeExists = fs.existsSync("app/api/rpg/quest/mutate/route.ts");
  assert(routeExists, "POST /api/rpg/quest/mutate route file exists");

  const routeContent = fs.readFileSync("app/api/rpg/quest/mutate/route.ts", "utf-8");
  assert(routeContent.includes("export async function POST"), "Route exports POST handler");
  assert(routeContent.includes("parseQuestMutationInput"), "Route uses parseQuestMutationInput");
  assert(routeContent.includes("mutateQuestState"), "Route calls mutateQuestState");
  assert(routeContent.includes("requireRpgFounderPreviewApiAccess"), "Route uses auth guard");
  assert(routeContent.includes("PendekarQuestMutationError"), "Route handles QuestMutationError");

  // ─── Section 8: Engine wiring ─────────────────────────────────────────────

  console.log("\nSection 8: Engine wiring...");

  const engineContent = fs.readFileSync("src/game/rpg/core/game-engine.ts", "utf-8");
  assert(engineContent.includes('mutateQuestState,'), "Engine imports mutateQuestState");
  assert(engineContent.includes('mutateQuestState("KILL"'), "Engine fires KILL mutation on battle victory");
  assert(engineContent.includes('mutateQuestState("QUEST_ADVANCE"'), "Engine fires QUEST_ADVANCE mutation");
  assert(engineContent.includes('mutateQuestState("FLOWER_PICK"'), "Engine fires FLOWER_PICK on golden flower");
  assert(engineContent.includes('mutateQuestState("QUEST_ADVANCE", `qk-dlg-'), "Engine fires QUEST_ADVANCE on dialogue");
  assert(engineContent.includes('mutateQuestState("FLAG", `qk-flag-'), "Engine fires FLAG mutation on dialogue");
  assert(engineContent.includes('idempotent: true'), "Engine mutations use idempotent retry");

  // ─── Summary ──────────────────────────────────────────────────────────────

  console.log("\n" + "═".repeat(60));
  console.log(`P2.6I.2 Quest Mutation Results: ${passed} passed, ${failed} failed`);
  console.log("═".repeat(60));

  await db.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  db.$disconnect();
  process.exit(1);
});
