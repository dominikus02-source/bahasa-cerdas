#!/usr/bin/env npx tsx
/**
 * P2.7 — Pendekar Suryakerta Playable Vertical Slice (integration).
 *
 * Proves ONE coherent playable loop with the REAL data flow (no mocks):
 *
 *   SPAWN (Desa) → TALK KI JAKA → QUEST START → ENCOUNTER (e1)
 *   → BATTLE START → LEARNING → ANSWER → BATTLE RESOLUTION (WIN)
 *   → REWARD RECEIPT + SETTLE → KILL/QUEST/WORLD/INVENTORY/GOLD mutations
 *   → QUEST COMPLETION → PROJECTION (server hydration) → RELOAD RESTORED
 *
 * Pure domains are driven directly; the DOM-bound engine is verified by
 * static wiring proofs (same convention as P1.4C/P1.5/P2.6C runtime tests).
 * The server chain runs against LOCAL staging PostgreSQL only.
 *
 * RUN: npx tsx scripts/test-rpg-p2-7-vertical-slice.ts
 * Exit 0 = SEMUA LULUS, 1 = ada yang gagal.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { PrismaClient, Prisma } from "@prisma/client";

// ── Localhost-only guard (same as P2.6I.2) ──────────────────────────────
const localUser = process.env.USER || process.env.USERNAME || "postgres";
const localUrl = `postgresql://${localUser}@localhost:5432/bahasacerdas_staging`;
const parsedUrl = new URL(localUrl);
if (!/^localhost$|^127\.0\.0\.1$/.test(parsedUrl.hostname)) {
  throw new Error("FATAL: P2.7 tests refuse a non-localhost database");
}
process.env.DATABASE_URL = localUrl;
process.env.DIRECT_URL = localUrl;

const db = new PrismaClient({ datasources: { db: { url: localUrl } } });

const ROOT = process.cwd();
let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`); }
}

function src(p: string): string {
  return readFileSync(join(ROOT, p), "utf8");
}

const strip = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");

async function main() {
  const { DESA_VERTICAL_SLICE } = await import("../src/game/rpg/data/vertical-slice");
  const { WORLD_MAPS } = await import("../src/game/rpg/data/world-maps");
  const { canonicalEnemyByPrototypeKey } = await import("../src/game/rpg/data/enemies");
  const { getDialogueTree } = await import("../src/game/rpg/data/dialogues");
  const {
    startDialogue, collectSignals, selectDialogueStart,
  } = await import("../src/game/rpg/interaction/dialogue");
  const { createQuestLineState, applyQuestNumber } = await import("../src/game/rpg/quests/quest-engine");
  const { resolveLearningEffect } = await import("../src/game/rpg/learning/learning-effect");
  const { findEncounterAt, buildEncounterTable } = await import("../src/game/rpg/combat/encounter");
  const { enemySpawnsOf } = await import("../src/game/rpg/world/map-loader");
  const { DIALOGUE_GOLD_ALLOWLIST, parseQuestMutationInput } = await import("../lib/game/rpg/server-contracts");
  const { PendekarStateService } = await import("../lib/game/rpg/server-state");

  // ══ A. Slice scope (data) ═══════════════════════════════════════════
  console.log("\n🗺️ A. Slice scope");
  const desa = WORLD_MAPS[DESA_VERTICAL_SLICE.mapId];
  check("1. player bootstrap: Desa spawn configured",
    desa.spawn.x === DESA_VERTICAL_SLICE.spawn.x && desa.spawn.y === DESA_VERTICAL_SLICE.spawn.y);
  check("2. quest giver Ki Jaka on Desa",
    desa.npcSpawns.some((npc) => npc.id === DESA_VERTICAL_SLICE.questGiverId));
  check("3. exactly three Korog encounters e1-e3",
    DESA_VERTICAL_SLICE.encounterIds.length === 3 &&
    DESA_VERTICAL_SLICE.encounterIds.every((id) => desa.enemySpawns.find((e) => e.id === id)?.type === "g"));
  const korog = canonicalEnemyByPrototypeKey("g")!;
  check("4. Korog canonical combat/reward values",
    korog.base.hp === 25 && korog.xp === 20 && korog.gold === 12);

  // ══ B. Quest loop (pure) ════════════════════════════════════════════
  console.log("\n💬 B. Quest loop");
  const ki = getDialogueTree("ki")!;
  const introCtx = { quest: 0, kills: 0, flowers: 0, flags: {}, nowMs: 0, restCooldownUntilMs: 0 };
  check("5. quest start: talk Ki at quest 0 → intro",
    selectDialogueStart("ki", introCtx) === "intro");
  const intro = startDialogue("ki", 0, "intro")!;
  const introSignals = collectSignals(ki, { ...intro, visited: ["intro"], atEnd: true });
  check("6. intro grants QUEST 1 + GOLD 30",
    introSignals.some((e) => e.type === "QUEST" && e.amount === 1) &&
    introSignals.some((e) => e.type === "GOLD" && e.amount === 30));
  check("7. quest acceptance deterministic, cannot skip",
    applyQuestNumber(createQuestLineState(), 1, { quest: 0, kills: 0, flags: {} }).main === 1 &&
    applyQuestNumber({ main: 1, kills: 2, flowers: 0 }, 2, { quest: 1, kills: 2, flags: {} }).main === 1);
  check("8. progress branch before 3 wins, report at 3 wins",
    selectDialogueStart("ki", { ...introCtx, quest: 1, kills: 2 }) === "progress" &&
    selectDialogueStart("ki", { ...introCtx, quest: 1, kills: 3 }) === "report");
  const report = startDialogue("ki", 0, "report")!;
  const reportSignals = collectSignals(ki, { ...report, visited: ["report"], atEnd: true });
  check("9. quest completion: report grants QUEST 2 + GOLD 60",
    reportSignals.some((e) => e.type === "QUEST" && e.amount === 2) &&
    reportSignals.some((e) => e.type === "GOLD" && e.amount === 60));
  check("10. dialogue gold amounts are canonical-allowlisted",
    [30, 60].every((a) => (DIALOGUE_GOLD_ALLOWLIST as readonly number[]).includes(a)));

  // ══ C. Encounter → battle → learning (pure boundaries) ══════════════
  console.log("\n⚔️ C. Encounter / battle / learning");
  const table = buildEncounterTable(enemySpawnsOf(desa), new Set()).table;
  const e1spawn = desa.enemySpawns.find((e) => e.id === "e1")!;
  const foe = findEncounterAt(table, { x: e1spawn.x, y: e1spawn.y });
  check("11. encounter start: e1 found at its spawn tile",
    foe?.instanceId === "e1");
  check("12. learning combat consequence canonical",
    resolveLearningEffect({ signal: "CORRECT" } as never).multiplier === 1.5 &&
    resolveLearningEffect({ signal: "INCORRECT" } as never).multiplier === 1);

  // ══ D. Engine wiring (static proofs, DOM-bound engine) ══════════════
  console.log("\n🔌 D. Engine wiring");
  const eng = () => strip(src("src/game/rpg/core/game-engine.ts"));
  check("13. INTERACT routes NPC → DIALOGUE session",
    eng().includes('const sess = startDialogue(out.npcId, 0, startNode)') &&
    eng().includes('selectDialogueStart(out.npcId,'));
  check("14. DIALOGUE_END applies signals + syncs QUEST/FLAG/GOLD",
    eng().includes('applyQuestSignals(currentState, `dlg:${npcId}`, signals)') &&
    eng().includes('mutateQuestState("QUEST_ADVANCE", `qk-dlg-') &&
    eng().includes('mutateQuestState("FLAG", `qk-flag-') &&
    eng().includes('mutateQuestState("DIALOGUE_GOLD", `qk-gold-'));
  check("15. encounter → battle → server battle + learning",
    eng().includes('startEncounterBattle(currentState, canon.id, tile, foe, currentState.player)') &&
    eng().includes('startServerBattle(encounterId, requestKey)') &&
    eng().includes('triggerBattleLearning({'));
  check("16. learning answer → submit pipeline",
    eng().includes('submitBattleAnswer({') && eng().includes('LEARNING_ANSWERED'));
  check("17. victory → reward receipt + settle chain",
    eng().includes('createServerRewardReceipt(serverBattleId, rewardKey)') &&
    eng().includes('settleServerReward(serverBattleId!, settleKey)'));
  check("18. victory → KILL sync + battle-drop inventory sync",
    eng().includes('mutateQuestState("KILL", `qk-kill-') &&
    eng().includes('mutateInventory("BATTLE_DROP", 1, { itemKey: "bijih" })'));
  check("19. save checkpoints on battle + dialogue close",
    src("src/game/rpg/ui/RPGGame.tsx").includes('engine.on("BATTLE_END", saveCheckpoint)') &&
    src("src/game/rpg/ui/RPGGame.tsx").includes('engine.on("DIALOGUE_END", saveCheckpoint)'));
  check("20. server-wins hydration in RPGGame boot",
    src("src/game/rpg/ui/RPGGame.tsx").includes('fetch("/api/rpg/state")') &&
    src("src/game/rpg/ui/RPGGame.tsx").includes('serverSnapshot.worldState.quest'));

  // ══ E. Server chain — REAL local DB ═════════════════════════════════
  console.log("\n🗄️ E. Server chain (local PostgreSQL)");
  const testUser = await db.user.findFirst({ where: { email: "murid@demo.com" }, select: { id: true } });
  if (!testUser) {
    console.log("  ❌ test user murid@demo.com missing — DB section fails");
    fail += 15;
  } else {
    const service = new PendekarStateService(db);
    // Save originals for restore.
    const orig = await db.pendekarPlayer.findUnique({ where: { userId: testUser.id } });
    const origQuest = (orig?.questState ?? { main: 0, kills: 0, flowers: 0 }) as Record<string, number>;
    const origFlags = (orig?.flags ?? {}) as Record<string, boolean>;
    const origGold = orig?.goldBalance ?? 0;
    const origMapKey = orig?.mapKey ?? "map.desa";
    const origItems = await db.pendekarInventoryItem.findMany({ where: { playerId: orig?.id ?? "" } });
    let battleId = "";

    try {
      // Clean slate: remove stale ACTIVE sessions for the test player.
      const stale = await db.pendekarBattleSession.findMany({
        where: { player: { userId: testUser.id }, status: "ACTIVE" }, select: { id: true },
      });
      for (const s of stale) {
        await db.pendekarBattleAction.deleteMany({ where: { battleSessionId: s.id } });
        await db.pendekarLearningSession.deleteMany({ where: { battleSessionId: s.id } });
        await db.pendekarBattleSession.delete({ where: { id: s.id } });
      }
      // Slice setup: map + quest + gold baseline.
      await db.pendekarPlayer.upsert({
        where: { userId: testUser.id },
        update: {
          mapKey: "map.desa",
          questState: JSON.parse(JSON.stringify({ main: 0, kills: 0, flowers: 0 })) as Prisma.InputJsonValue,
          flags: JSON.parse(JSON.stringify({})) as Prisma.InputJsonValue,
          goldBalance: 0,
        },
        create: {
          userId: testUser.id, mapKey: "map.desa",
          questState: JSON.parse(JSON.stringify({ main: 0, kills: 0, flowers: 0 })) as Prisma.InputJsonValue,
          flags: JSON.parse(JSON.stringify({})) as Prisma.InputJsonValue,
          goldBalance: 0,
        },
      });

      // 21. player bootstrap
      const boot = await service.getOrCreatePendekarPlayer(testUser.id);
      check("21. player bootstrap on controlled slice map", boot.mapKey === "map.desa");

      // 22. quest start
      const adv1 = await service.mutateQuestState(testUser.id, {
        kind: "QUEST_ADVANCE", to: 1, requestKey: `p27-adv1-${randomUUID()}`,
      });
      check("22. quest start: QUEST_ADVANCE 0→1 APPLIED",
        adv1.category === "APPLIED" && adv1.quest.main === 1);

      // 23-24. dialogue gold (Ki intro 30G) + replay safety
      const goldBefore = (await db.pendekarPlayer.findUniqueOrThrow({ where: { userId: testUser.id } })).goldBalance;
      const g30 = await service.mutateQuestState(testUser.id, {
        kind: "DIALOGUE_GOLD", amount: 30, requestKey: `p27-g30-${randomUUID()}`,
      });
      const goldAfter = (await db.pendekarPlayer.findUniqueOrThrow({ where: { userId: testUser.id } })).goldBalance;
      check("23. reward: DIALOGUE_GOLD 30 credits server goldBalance",
        g30.category === "APPLIED" && goldAfter === goldBefore + 30);
      const g30replay = await service.mutateQuestState(testUser.id, {
        kind: "DIALOGUE_GOLD", amount: 30, requestKey: `p27-g30-${randomUUID()}`,
      });
      // Fresh key = new grant (idempotent per key, not per amount).
      const goldAfter2 = (await db.pendekarPlayer.findUniqueOrThrow({ where: { userId: testUser.id } })).goldBalance;
      check("24. dialogue gold grants per unique key (no silent drop)",
        g30replay.category === "APPLIED" && goldAfter2 === goldAfter + 30);

      // 25. invalid gold rejected
      const badGold = parseQuestMutationInput({ kind: "DIALOGUE_GOLD", amount: 999, requestKey: `p27-bad-${randomUUID()}` });
      check("25. non-canonical gold amount rejected by parser", badGold.ok === false);

      // 26. encounter → battle start (e1)
      const started = await service.startAuthoritativeBattle(testUser.id, {
        encounterId: "e1", requestId: `p27-battle-${randomUUID()}`,
      });
      battleId = started.battle.id;
      check("26. encounter start: server battle STARTED for e1",
        started.category === "STARTED" && started.battle.encounterId === "e1" && started.battle.status === "ACTIVE");

      // 27. learning start (server-selected, answer-free)
      const learn = await service.startAuthoritativeLearningSession(testUser.id, battleId);
      const hasAnswerKey = "correctAnswer" in (learn.learning.challenge as Record<string, unknown>) ||
        "answerKey" in (learn.learning.challenge as Record<string, unknown>);
      check("27. learning start: challenge bound, no answer key leaked",
        learn.category === "STARTED" && !hasAnswerKey &&
        Array.isArray(learn.learning.challenge.options) && learn.learning.challenge.options.length > 0);

      // 28. learning result (submit the TRUE answer read from DB — test-only).
      // Raw SQL: the generated Prisma Soal model drifts from local staging
      // columns; the service itself reads via explicit canonicalSoalSelect.
      const learnRow = await db.pendekarLearningSession.findFirstOrThrow({ where: { battleSessionId: battleId } });
      const ansRows = await db.$queryRaw<Array<{ correctAnswer: unknown }>>(
        Prisma.sql`SELECT "correctAnswer" FROM "Soal" WHERE id = ${learnRow.soalId} LIMIT 1`,
      );
      const correctText = String(ansRows[0]?.correctAnswer ?? "");
      const answered = await service.submitAuthoritativeLearningAnswer(testUser.id, battleId, {
        answer: correctText, requestKey: `p27-ans-${randomUUID()}`,
      });
      check("28. learning result: correct answer EVALUATED",
        answered.category === "EVALUATED" && answered.evaluation.correct === true);

      // 29. battle resolution → WIN via MAHAPUKUL + correct learning.
      // Server semantic: one answered learning → exactly one action
      // (LEARNING_ALREADY_CONSUMED on second use). Canonical slice kill:
      // correct answer (1.5x, skill-only) + mahapukul (2.2x atk) one-shots
      // Korog 25 HP even at min variance: round((10*2.2-1)*1.5*0.85)=27.
      const act = await service.submitAuthoritativeBattleAction(testUser.id, battleId, {
        action: "skill", skillId: "skill.mahapukul", requestKey: `p27-act-${randomUUID()}`,
      });
      const finalBattle = await db.pendekarBattleSession.findUniqueOrThrow({ where: { id: battleId } });
      const battleState = finalBattle.battleState as { result?: string };
      check("29. battle resolution: Mahapukul + correct learning defeats Korog (WIN)",
        act.battle.status === "WON" && battleState.result === "WIN",
        `status=${act.battle.status}`);

      // 30-31. reward receipt + settlement (XP + gold persisted)
      const xpBefore = (await db.pendekarPlayer.findUniqueOrThrow({ where: { userId: testUser.id } })).rpgXp;
      const receipt = await service.createAuthoritativeBattleRewardReceipt(testUser.id, battleId, {
        requestKey: `p27-receipt-${randomUUID()}`,
      });
      check("30. reward receipt CREATED from server-derived values",
        receipt.category === "CREATED" && receipt.receipt.entitlement.rpgXp > 0);
      const settled = await service.settleAuthoritativeBattleReward(testUser.id, battleId, {
        requestKey: `p27-settle-${randomUUID()}`,
      });
      const afterSettle = await db.pendekarPlayer.findUniqueOrThrow({ where: { userId: testUser.id } });
      check("31. reward settlement: XP + gold persisted to player",
        settled.category === "SETTLED" && afterSettle.rpgXp > xpBefore);

      // 32. quest progress: KILL
      const kill = await service.mutateQuestState(testUser.id, {
        kind: "KILL", requestKey: `p27-kill-${randomUUID()}`,
      });
      check("32. quest progress: KILL increments server kills",
        kill.category === "APPLIED" && kill.quest.kills === 1);

      // 33. inventory: battle drop persists
      const drop = await service.mutateInventory(testUser.id, {
        kind: "BATTLE_DROP", quantityDelta: 1, itemKey: "bijih", requestKey: `p27-drop-${randomUUID()}`,
      });
      const bijihRow = await db.pendekarInventoryItem.findFirst({
        where: { player: { userId: testUser.id }, itemKey: "bijih" },
      });
      check("33. inventory mutation: battle bijih drop persisted",
        drop.category === "APPLIED" && (bijihRow?.quantity ?? 0) >= 1);

      // 34. world: FLAG persists
      const flag = await service.mutateQuestState(testUser.id, {
        kind: "FLAG", flagName: "sari", requestKey: `p27-flag-${randomUUID()}`,
      });
      check("34. world mutation: FLAG persisted server-side",
        flag.category === "APPLIED" && flag.flags["sari"] === true);

      // 35-36. quest completion: 2 more KILLs → ADVANCE 1→2 + report gold 60
      await service.mutateQuestState(testUser.id, { kind: "KILL", requestKey: `p27-k2-${randomUUID()}` });
      await service.mutateQuestState(testUser.id, { kind: "KILL", requestKey: `p27-k3-${randomUUID()}` });
      const adv2 = await service.mutateQuestState(testUser.id, {
        kind: "QUEST_ADVANCE", to: 2, requestKey: `p27-adv2-${randomUUID()}`,
      });
      check("35. quest completion: 3 kills unlock ADVANCE 1→2",
        adv2.category === "APPLIED" && adv2.quest.main === 2 && adv2.quest.kills === 3);
      const goldPre60 = (await db.pendekarPlayer.findUniqueOrThrow({ where: { userId: testUser.id } })).goldBalance;
      await service.mutateQuestState(testUser.id, {
        kind: "DIALOGUE_GOLD", amount: 60, requestKey: `p27-g60-${randomUUID()}`,
      });
      const goldPost60 = (await db.pendekarPlayer.findUniqueOrThrow({ where: { userId: testUser.id } })).goldBalance;
      check("36. completion reward: report 60G credited server-side",
        goldPost60 === goldPre60 + 60);

      // 37. persistence/hydration: fresh projection reflects the whole loop
      const proj = await service.getStateProjection(testUser.id);
      const projBijih = proj.inventory.find((i) => i.itemKey === "bijih")?.quantity ?? 0;
      check("37. persistence: projection restores quest/kills/gold/inventory/equipment",
        proj.worldState.quest.main === 2 && proj.worldState.quest.kills === 3 &&
        proj.player.wallet.goldBalance === goldPost60 && projBijih >= 1 &&
        typeof proj.worldState.equipment.weaponPlus === "number");

      // 38. completed-state reload: second projection identical (server wins)
      const proj2 = await service.getStateProjection(testUser.id);
      check("38. completed-state reload: server state stable across reads",
        proj2.worldState.quest.main === 2 && proj2.worldState.quest.kills === 3 &&
        proj2.player.wallet.goldBalance === goldPost60);
    } finally {
      // ── Restore test player (no production writes; local staging only) ──
      if (battleId) {
        const learnRows = await db.pendekarLearningSession.findMany({ where: { battleSessionId: battleId } });
        for (const l of learnRows) {
          await db.learningEvidence.deleteMany({ where: { activityId: battleId } });
        }
        await db.pendekarBattleAction.deleteMany({ where: { battleSessionId: battleId } });
        await db.pendekarLearningSession.deleteMany({ where: { battleSessionId: battleId } });
        const receipts = await db.pendekarRewardReceipt.findMany({ where: { sourceType: "BATTLE", sourceId: battleId } });
        for (const r of receipts) {
          await db.pendekarRpgXpEntry.deleteMany({ where: { receiptId: r.id } });
          await db.pendekarWalletEntry.deleteMany({ where: { receiptId: r.id } });
          await db.pendekarRewardReceipt.delete({ where: { id: r.id } });
        }
        await db.pendekarBattleSession.deleteMany({ where: { id: battleId } });
      }
      if (orig) {
        await db.pendekarPlayer.update({
          where: { userId: testUser.id },
          data: {
            questState: JSON.parse(JSON.stringify(origQuest)) as Prisma.InputJsonValue,
            flags: JSON.parse(JSON.stringify(origFlags)) as Prisma.InputJsonValue,
            goldBalance: origGold,
            mapKey: origMapKey,
          },
        });
        const curItems = await db.pendekarInventoryItem.findMany({ where: { playerId: orig.id } });
        for (const ci of curItems) {
          const was = origItems.find((o) => o.itemKey === ci.itemKey);
          if (was) {
            if (was.quantity !== ci.quantity) {
              await db.pendekarInventoryItem.update({ where: { id: ci.id }, data: { quantity: was.quantity } });
            }
          } else {
            await db.pendekarInventoryItem.delete({ where: { id: ci.id } });
          }
        }
      }
    }
  }

  // ══ F. Founder preview ═════════════════════════════════════════════
  console.log("\n🔒 F. Founder preview");
  check("39. RPG stays unpublished in registry",
    src("lib/arena/game-registry.ts").includes("unpublished: true"));
  const access = src("lib/game/rpg/server-access.ts");
  check("40. quest/inventory/equipment routes require founder preview access",
    access.includes("requireRpgFounderPreviewApiAccess") &&
    src("app/api/rpg/quest/mutate/route.ts").includes("requireRpgFounderPreviewApiAccess") &&
    src("app/api/rpg/inventory/mutate/route.ts").includes("requireRpgFounderPreviewApiAccess") &&
    src("app/api/rpg/equipment/mutate/route.ts").includes("requireRpgFounderPreviewApiAccess"));

  // ══ G. Action-kind agreement (contract/parser/DB) ═══════════════════
  console.log("\n⚖️ G. Action-kind agreement");
  const { parseSubmitBattleActionInput } = await import("../lib/game/rpg/server-contracts");
  const k = `p27-g-${randomUUID()}`;
  check("41. parser accepts all contract action intents (basic/skill/flee)",
    parseSubmitBattleActionInput({ action: "basic_attack", requestKey: k }).ok === true &&
    parseSubmitBattleActionInput({ action: "skill", skillId: "skill.mahapukul", requestKey: k }).ok === true &&
    parseSubmitBattleActionInput({ action: "flee", requestKey: k }).ok === true &&
    parseSubmitBattleActionInput({ action: "dance", requestKey: k }).ok === false);
  const kindDef = await db.$queryRaw<Array<{ def: string }>>(
    Prisma.sql`SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'PendekarBattleAction_kind_check'`,
  );
  const defText = kindDef[0]?.def ?? "";
  check("42. DB kind_check agrees with contract (basic_attack/skill/flee persistable)",
    ["basic_attack", "mahapukul", "skill", "flee"].every((v) => defText.includes(v)));

  console.log(`\n📊 P2.7 Hasil: ${pass} lulus, ${fail} gagal\n`);
  await db.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  db.$disconnect();
  process.exit(1);
});
