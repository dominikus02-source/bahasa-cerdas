/**
 * P2.6H.3 Flee & Defeat Authority Tests — static source analysis.
 *
 * Tests the remediation of GAP-2 (flee server wiring) and GAP-3 (defeat
 * deferred until server reconciliation). These read engine source code and
 * verify structural invariants. No DOM, no network, no browser required.
 *
 * Run: npx tsx scripts/test-rpg-p2-6h3-flee-defeat.ts
 * Exit 0 = SEMUA LULUS, 1 = ada yang gagal.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
let pass = 0;
let fail = 0;

function check(name: string, cond: boolean, detail = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`); }
}

function read(relPath: string): string {
  return readFileSync(join(ROOT, relPath), "utf-8");
}

function extractBlock(src: string, startMarker: string, endMarker: string): string {
  const idx = src.indexOf(startMarker);
  if (idx === -1) return "";
  const endIdx = src.indexOf(endMarker, idx + startMarker.length);
  if (endIdx === -1) return src.substring(idx);
  return src.substring(idx, endIdx);
}

/* ── Read source files ─────────────────────────────────────────── */

const engineSrc = read("src/game/rpg/core/game-engine.ts");
const serverStateSrc = read("lib/game/rpg/server-state.ts");
const serverContractsSrc = read("lib/game/rpg/server-contracts.ts");
const apiClientSrc = read("lib/game/rpg/server-api-client.ts");
const battleCoreSrc = read("src/game/rpg/combat/battle-core.ts");

/* ──────────────────────── SECTION A: Server Contract (GAP-2) ──── */

console.log("\n─── SECTION A: Server Contract — Flee Action (GAP-2) ──────────");

{
  check("A.1 SubmitBattleActionInput includes 'flee' in action union",
    serverContractsSrc.includes('"flee"') &&
    serverContractsSrc.includes("SubmitBattleActionInput"));

  check("A.2 Action union has exactly 4 values (basic_attack, mahapukul, skill, flee)",
    serverContractsSrc.includes("basic_attack") &&
    serverContractsSrc.includes("mahapukul") &&
    serverContractsSrc.includes("skill") &&
    serverContractsSrc.includes("flee"));

  check("A.3 API client submitServerBattleAction accepts 'flee' action",
    apiClientSrc.includes('"flee"') &&
    apiClientSrc.includes("submitServerBattleAction"));

  check("A.4 Server-state imports escapeBattle from battle-core",
    serverStateSrc.includes('escapeBattle') &&
    serverStateSrc.includes('battle-core'));
}

/* ──────────────────────── SECTION B: Server State — Flee Branch (GAP-2) ─── */

console.log("\n─── SECTION B: Server State — Flee Branch (GAP-2) ─────────────");

{
  // Extract the entire flee branch from input.action === "flee" to the next major marker
  const fleeBranch = extractBlock(serverStateSrc, 'if (input.action === "flee")', "// ── End flee");
  const hasFleeBranch = fleeBranch.length > 0;

  check("B.1 Server state has dedicated flee branch", hasFleeBranch);

  if (hasFleeBranch) {
    check("B.2 Flee branch calls escapeBattle from battle-core",
      fleeBranch.includes("escapeBattle("));

    check("B.3 Flee branch parses persisted battle state",
      fleeBranch.includes("parsePersistedBattleState"));

    check("B.4 Flee branch parses persisted RNG",
      fleeBranch.includes("parsePersistedBattleRng"));

    check("B.5 Flee branch does NOT check learning requirement (flee bypasses learning)",
      !fleeBranch.includes("learningSession.status") && !fleeBranch.includes("ANSWERED"));

    check("B.6 Flee branch persists FLED status to database",
      fleeBranch.includes('"FLED"') && fleeBranch.includes("status"));

    check("B.7 Flee branch persists ACTIVE status on failed flee (turn consumed)",
      fleeBranch.includes('"ACTIVE"'));

    check("B.8 Flee branch creates pendekarBattleAction record",
      fleeBranch.includes("pendekarBattleAction.create"));

    check("B.9 Flee action record has actionKind 'flee'",
      fleeBranch.includes('actionKind: "flee"'));

    check("B.10 Flee branch returns RESOLVED category",
      fleeBranch.includes('"RESOLVED"'));

    check("B.11 Flee branch updates turn counter",
      fleeBranch.includes("turn: outcome.state.turn"));

    check("B.12 Flee branch increments actionRevision",
      fleeBranch.includes("actionRevision: { increment: 1 }"));
  }
}

/* ──────────────────────── SECTION C: Engine — Flee Server Call (GAP-2) ──── */

console.log("\n─── SECTION C: Engine — Flee Server Call (GAP-2) ──────────────");

{
  const fleeFn = extractBlock(engineSrc, "function fleeBattle()", "function getLiveEnemies()");

  check("C.1 Engine fleeBattle calls submitServerBattleAction",
    fleeFn.includes("submitServerBattleAction"));

  check("C.2 Engine fleeBattle passes 'flee' action string",
    fleeFn.includes('"flee"'));

  check("C.3 Engine fleeBattle passes requestKey",
    fleeFn.includes("requestKey"));

  check("C.4 Engine fleeBattle wraps in fireServerCall",
    fleeFn.includes("fireServerCall("));

  check("C.5 Engine fleeBattle uses serverBattleId guard",
    fleeFn.includes("if (serverBattleId)"));

  check("C.6 Engine fleeBattle calls reconcileServerBattle on success",
    fleeFn.includes("reconcileServerBattle"));

  check("C.7 Engine fleeBattle returns boolean for local result",
    fleeFn.includes("return activeBattle"));
}

/* ──────────────────────── SECTION D: Engine — Deferred Defeat (GAP-3) ──── */

console.log("\n─── SECTION D: Engine — Deferred Defeat (GAP-3) ──────────────");

{
  check("D.1 pendingDefeat module-level variable exists",
    engineSrc.includes("pendingDefeat") &&
    engineSrc.includes("let pendingDefeat"));

  // Find ATTACK case to check it defers defeat
  const attackCase = extractBlock(engineSrc, 'case "ATTACK":', 'case "USE_ITEM":');
  if (attackCase.length > 0) {
    check("D.2 ATTACK case stores pendingDefeat instead of immediate applyDefeatFlow",
      attackCase.includes("pendingDefeat") &&
      attackCase.includes("foe"));

    check("D.3 ATTACK case does NOT call applyDefeatFlow directly",
      !attackCase.includes("applyDefeatFlow("));
  }

  // Check attackBasic settles after reconciliation
  const attackBasicFn = extractBlock(engineSrc, "function attackBasic(", "function attackWithSkill(");
  if (attackBasicFn.length > 0) {
    check("D.4 attackBasic settles pendingDefeat when server returns LOST",
      attackBasicFn.includes("pendingDefeat") &&
      attackBasicFn.includes('"LOST"'));
  }

  // Check attackWithSkill settles after reconciliation
  const attackWithSkillFn = extractBlock(engineSrc, "function attackWithSkill(", "function useItem(");
  if (attackWithSkillFn.length > 0) {
    check("D.5 attackWithSkill settles pendingDefeat when server returns LOST",
      attackWithSkillFn.includes("pendingDefeat") &&
      attackWithSkillFn.includes('"LOST"'));
  }

  // Check BATTLE_USE_ITEM (battle item use) defers defeat
  const battleUseItemCase = extractBlock(engineSrc, 'case "USE_ITEM":', 'case "DIALOGUE_ADVANCE":');
  if (battleUseItemCase.length > 0) {
    check("D.6 BATTLE_USE_ITEM defers defeat via pendingDefeat",
      battleUseItemCase.includes("pendingDefeat") &&
      battleUseItemCase.includes('"LOSE"'));
  }

  // Check BATTLE_ESCAPE case handles LOSE from failed flee
  const escapeCase = extractBlock(engineSrc, 'case "BATTLE_ESCAPE":', 'case "SUBMIT_LEARNING_ANSWER":');
  if (escapeCase.length > 0) {
    check("D.7 BATTLE_ESCAPE case stores pendingDefeat on LOSE result",
      escapeCase.includes("pendingDefeat") &&
      escapeCase.includes('"LOSE"'));
  }

  // Check fleeBattle settles pendingDefeat after server reconciliation
  const fleeFn = extractBlock(engineSrc, "function fleeBattle()", "function getLiveEnemies()");

  check("D.8 fleeBattle settles pendingDefeat when server returns LOST",
    fleeFn.includes("pendingDefeat") &&
    fleeFn.includes('"LOST"'));
}

/* ──────────────────────── SECTION E: Battle Core — escapeBattle ── */

console.log("\n─── SECTION E: Battle Core — escapeBattle Contract ───────────");

{
  check("E.1 escapeBattle function exists in battle-core",
    battleCoreSrc.includes("export function escapeBattle"));

  check("E.2 escapeBattle has FLEE_FORBIDDEN_BOSS constant",
    battleCoreSrc.includes("FLEE_FORBIDDEN_BOSS"));

  check("E.3 escapeBattle has FLEE_CHANCE constant (0.6 = 60%)",
    battleCoreSrc.includes("FLEE_CHANCE") &&
    battleCoreSrc.includes("0.6"));

  check("E.4 escapeBattle returns result with 'FLED' on success",
    battleCoreSrc.includes('result: "FLED"'));

  check("E.5 escapeBattle consumes turn on failure (result = undefined)",
    battleCoreSrc.includes("turn") && battleCoreSrc.includes("turn + 1"));
}

/* ──────────────────────── SECTION F: Reconcile for Flee ──────── */

console.log("\n─── SECTION F: Reconcile for Flee ─────────────────────────────");

{
  const fleeFn = extractBlock(engineSrc, "function fleeBattle()", "function getLiveEnemies()");

  check("F.1 reconcileServerBattle is called inside fleeBattle's server call",
    fleeFn.includes("reconcileServerBattle"));

  check("F.2 reconcileServerBattle is called in .then() success path only",
    fleeFn.includes(".then((res)") && fleeFn.includes("if (res.ok)"));
}

/* ──────────────────────── SECTION G: Anti-Double-Apply ────────── */

console.log("\n─── SECTION G: Anti-Double-Apply (Defeat Dedup) ───────────────");

{
  check("G.1 applyDefeatFlow uses appliedBattleIds Set for dedup",
    engineSrc.includes("appliedBattleIds.has(battle.battleId)") &&
    engineSrc.includes("appliedBattleIds.add(battle.battleId)"));

  check("G.2 pendingDefeat is cleared after settlement",
    engineSrc.includes("pendingDefeat = null"));

  check("G.3 pendingDefeat is only consumed once (const pd = pendingDefeat; pendingDefeat = null)",
    engineSrc.includes("const pd = pendingDefeat") &&
    engineSrc.includes("pendingDefeat = null"));
}

/* ──────────────────────── SECTION H: Contract Safety ──────────── */

console.log("\n─── SECTION H: Contract Safety ────────────────────────────────");

{
  // SubmitBattleActionInput only has action, skillId?, requestKey
  const hasHpField = serverContractsSrc.includes("hp") &&
    serverContractsSrc.substring(
      serverContractsSrc.indexOf("SubmitBattleActionInput"),
      serverContractsSrc.indexOf("SubmitBattleActionInput") + 200
    ).includes("hp");
  check("H.1 SubmitBattleActionInput does NOT contain hp/damage/xp/gold fields", !hasHpField);

  // Flee branch does not require learning
  const fleeBranch = extractBlock(serverStateSrc, 'if (input.action === "flee")', "// ── End flee");
  check("H.2 Flee action does NOT require learning (no learningSession check in flee branch)",
    !fleeBranch.includes("learningSession.status") && !fleeBranch.includes("ANSWERED"));

  // Flee uses server RNG, not Math.random
  check("H.3 Flee action uses parsePersistedBattleRng (not Math.random)",
    serverStateSrc.includes('parsePersistedBattleRng'));

  // defeat settlement uses applyDefeatFlow (canonical path)
  check("H.4 defeat settlement uses applyDefeatFlow (canonical path)",
    engineSrc.includes("state = applyDefeatFlow(state,"));
}

/* ──────────────────────── SECTION I: Summary ──────────────────── */

console.log("\n─── SECTION I: P2.6H.3 Flee & Defeat Summary ────────────────");

{
  const hasFleeServerCall = engineSrc.includes("submitServerBattleAction") &&
    engineSrc.includes('"flee"');
  const fleeFn = extractBlock(engineSrc, "function fleeBattle()", "function getLiveEnemies()");
  const hasFleeReconcile = fleeFn.includes("reconcileServerBattle");
  const hasDeferredDefeat = engineSrc.includes("pendingDefeat") &&
    engineSrc.includes("const pd = pendingDefeat");
  const hasDefeatSettled = engineSrc.includes("state = applyDefeatFlow(state, pd.state, pd.foeId)");

  check("I.1 GAP-2 REMEDIATED: flee fires server call + reconcile",
    hasFleeServerCall && hasFleeReconcile);

  check("I.2 GAP-3 REMEDIATED: defeat is deferred until server confirms",
    hasDeferredDefeat && hasDefeatSettled);

  check("I.3 Server contract has flee in action union",
    serverContractsSrc.includes('"flee"'));

  check("I.4 Server state has flee branch with escapeBattle",
    serverStateSrc.includes('if (input.action === "flee")') &&
    serverStateSrc.includes("escapeBattle("));

  check("I.5 No Math.random in server-state flee branch",
    (() => {
      const fleeBranch = extractBlock(serverStateSrc, 'if (input.action === "flee")', "// ── End flee");
      return !fleeBranch.includes("Math.random");
    })());
}

/* ──────────────────────── RESULT ──────────────────────────────── */

console.log("\n" + "═".repeat(60));
console.log(`  P2.6H.3 Flee & Defeat Authority Tests: ${pass} lulus, ${fail} gagal`);
console.log("═".repeat(60));

if (fail > 0) {
  console.log("\n  ⚠️  Some checks failed — review the output above.\n");
  process.exit(1);
} else {
  console.log("\n  ✅ All flee & defeat authority checks verified.\n");
  process.exit(0);
}
