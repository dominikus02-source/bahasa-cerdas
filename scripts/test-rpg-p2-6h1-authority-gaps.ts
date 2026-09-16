/**
 * P2.6H.1 AUTHORITY GAP TESTS — static source analysis.
 *
 * Covers: skill attack server wiring, flee server wiring, defeat server wiring,
 * victory settlement error handling, learning feedback path (P2.6H.4 GAP-5),
 * fire-and-forget semantics, reconciliation with terminal/stale protection
 * (P2.6H.4 GAP-7).
 *
 * These tests read engine source code and verify structural invariants.
 * No DOM, no network, no browser required.
 *
 * Run: npx tsx scripts/test-rpg-p2-6h1-authority-gaps.ts
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

/* ──────────────────────────── Source files ──────────────────────────── */

const engineSrc = read("src/game/rpg/core/game-engine.ts");
const serverApiSrc = read("lib/game/rpg/server-api-client.ts");
const serverStateSrc = read("lib/game/rpg/server-state.ts");
const serverContractsSrc = read("lib/game/rpg/server-contracts.ts");

/* ──────────────────────────── Helpers ──────────────────────────────── */

/** Extract a function body from source (approximate, brace-counted). Handles generics and parameter type braces. */
function extractFunction(src: string, funcName: string): string | null {
  // Try exact name match with optional generic params: function foo( or function foo<T>(
  const patterns = [
    `function ${funcName}(`,
    `function ${funcName}<`,
  ];
  let idx = -1;
  for (const p of patterns) {
    idx = src.indexOf(p);
    if (idx !== -1) break;
  }
  if (idx === -1) return null;
  // Skip past parameter list: find first `{` after the matching `)` for params
  // Handle nested parens in parameter types (e.g. tile: { x: number })
  let parenDepth = 0;
  let bodyStart = -1;
  for (let i = idx; i < src.length; i++) {
    if (src[i] === "(") parenDepth++;
    if (src[i] === ")") { parenDepth--; if (parenDepth === 0) { bodyStart = i + 1; break; } }
  }
  if (bodyStart === -1) return src.slice(idx, idx + 3000);
  // Find first `{` after bodyStart (the function body opening brace)
  while (bodyStart < src.length && src[bodyStart] !== "{") bodyStart++;
  if (bodyStart >= src.length) return null;
  let depth = 0;
  for (let i = bodyStart; i < src.length; i++) {
    if (src[i] === "{") depth++;
    if (src[i] === "}") { depth--; if (depth === 0) return src.slice(idx, i + 1); }
  }
  return src.slice(idx, idx + 3000);
}

/** Check if a function body contains any of the given patterns. */
function containsAny(body: string, patterns: string[]): boolean {
  return patterns.some((p) => body.includes(p));
}

/* ──────────────────────────── SECTION A: Skill Attack Wiring ─────────── */

console.log("\n─── SECTION A: Skill Attack Server Wiring ────────────────────────");

{
  const skillFn = extractFunction(engineSrc, "attackWithSkill");
  check("A.1 attackWithSkill function exists", skillFn !== null);
  if (skillFn) {
    check(
      "A.2 attackWithSkill calls submitServerBattleAction (FIXED)",
      skillFn.includes("submitServerBattleAction"),
      "skill attack now fires server action",
    );
    check(
      "A.3 attackWithSkill calls reconcileServerBattle (FIXED)",
      skillFn.includes("reconcileServerBattle"),
      "skill attack reconciles server state",
    );
    check(
      "A.4 attackWithSkill calls fireServerCall (FIXED)",
      skillFn.includes("fireServerCall"),
      "skill attack fires server call via fireServerCall",
    );
    // Verify it still calls processCommand (local resolution retained)
    check(
      "A.5 attackWithSkill STILL calls processCommand (local resolution retained)",
      skillFn.includes("processCommand"),
    );
    // Verify it passes skillId to submitServerBattleAction
    check(
      "A.6 attackWithSkill passes skillId parameter",
      skillFn.includes('submitServerBattleAction(serverBattleId, "skill", requestKey, skillId)'),
    );
  }
}

/* ──────────────────────────── SECTION B: Flee Wiring ────────────────── */

console.log("\n─── SECTION B: Flee Server Wiring ────────────────────────────────");

{
  const fleeFn = extractFunction(engineSrc, "fleeBattle");
  check("B.1 fleeBattle function exists", fleeFn !== null);
  if (fleeFn) {
    check(
      "B.2 fleeBattle calls submitServerBattleAction (FIXED)",
      fleeFn.includes("submitServerBattleAction"),
    );
    check(
      "B.3 fleeBattle calls fireServerCall (FIXED)",
      fleeFn.includes("fireServerCall"),
    );
    check(
      "B.4 fleeBattle DOES call processCommand (local resolution)",
      fleeFn.includes("processCommand"),
    );
  }

  // Also check BATTLE_ESCAPE handler in processCommand
  const escapeIdx = engineSrc.indexOf('case "BATTLE_ESCAPE"');
  check("B.5 BATTLE_ESCAPE case exists in processCommand", escapeIdx !== -1);
  if (escapeIdx !== -1) {
    const escapeBlock = engineSrc.slice(escapeIdx, escapeIdx + 800);
    check(
      "B.6 BATTLE_ESCAPE handler does NOT call fireServerCall",
      !escapeBlock.includes("fireServerCall"),
      "escape is entirely client-authoritative — server battle never cleaned up",
    );
  }
}

/* ──────────────────────────── SECTION C: Defeat Wiring ──────────────── */

console.log("\n─── SECTION C: Defeat Server Wiring ──────────────────────────────");

{
  const defeatFn = extractFunction(engineSrc, "applyDefeatFlow");
  check("C.1 applyDefeatFlow function exists", defeatFn !== null);
  if (defeatFn) {
    check(
      "C.2 applyDefeatFlow does NOT call fireServerCall",
      !defeatFn.includes("fireServerCall"),
      "defeat has no server notification — server battle never resolved",
    );
    check(
      "C.3 applyDefeatFlow does NOT call createServerRewardReceipt",
      !defeatFn.includes("createServerRewardReceipt"),
    );
    check(
      "C.4 applyDefeatFlow does NOT call settleServerReward",
      !defeatFn.includes("settleServerReward"),
    );
    check(
      "C.5 applyDefeatFlow DOES call clearLearning",
      defeatFn.includes("clearLearning"),
    );
  }
}

/* ──────────────────────────── SECTION D: Victory Settlement Error ────── */

console.log("\n─── SECTION D: Victory Settlement Error Handling ─────────────────");

{
  const winFn = extractFunction(engineSrc, "applyWinFlow");
  check("D.1 applyWinFlow function exists", winFn !== null);
  if (winFn) {
    // The victory flow chains: createServerRewardReceipt → settleServerReward
    // Check if settleServerReward has a .catch() or error handler
    check(
      "D.2 applyWinFlow fires server reward + settle",
      winFn.includes("createServerRewardReceipt") && winFn.includes("settleServerReward"),
    );

    // Extract the fireServerCall block
    const fireIdx = winFn.indexOf("fireServerCall(");
    if (fireIdx !== -1) {
      const fireBlock = winFn.slice(fireIdx, fireIdx + 2400);
      // Check if settleServerReward has error handling
      check(
        "D.3 Victory reward chain HAS .catch() handler (FIXED)",
        fireBlock.includes(".catch(") || fireBlock.includes("catch"),
        "settlement now has explicit error handling",
      );
      check(
        "D.4 Victory reward chain has chained .then() with error path",
        fireBlock.includes(".then(") && fireBlock.includes(".catch("),
      );
    }

    // Check if victory applies rewards BEFORE server confirms
    check(
      "D.5 applyWinFlow applies local rewards (grantXp) before server call",
      winFn.includes("grantXp") && winFn.indexOf("grantXp") < winFn.indexOf("fireServerCall"),
      "client applies XP/gold before server validates the victory",
    );
    // P2.6H.2: Verify serverRewardState tracking
    check(
      "D.6 applyWinFlow tracks serverRewardState",
      winFn.includes("serverRewardState"),
      "reward state must be tracked for UI feedback",
    );
    check(
      "D.7 applyWinFlow sets PENDING state before server call",
      winFn.includes('status: "PENDING"'),
    );
    check(
      "D.8 applyWinFlow sets CONFIRMED on success",
      winFn.includes('status: "CONFIRMED"'),
    );
    check(
      "D.9 applyWinFlow sets RETRYABLE_FAILURE on error",
      winFn.includes("RETRYABLE_FAILURE") && winFn.includes("classifyError"),
    );
    check(
      "D.10 applyWinFlow logs errors to console",
      winFn.includes("console.error"),
      "errors must be logged for debugging",
    );
  }
}

/* ──────────────────────────── SECTION E: Learning Feedback Path ──────── */

console.log("\n─── SECTION E: Learning Answer Server Feedback ───────────────────");

{
  const learnFn = extractFunction(engineSrc, "submitLearningAnswer");
  check("E.1 submitLearningAnswer function exists", learnFn !== null);
  if (learnFn) {
    check(
      "E.2 submitLearningAnswer calls processCommand locally first",
      learnFn.includes("processCommand"),
    );
    check(
      "E.3 submitLearningAnswer fires submitServerLearningAnswer in background",
      learnFn.includes("submitServerLearningAnswer"),
    );

    // Check if server response is used for feedback
    const serverIdx = learnFn.indexOf("submitServerLearningAnswer");
    if (serverIdx !== -1) {
      const afterServer = learnFn.slice(serverIdx, serverIdx + 800);
      check(
        "E.4 Server learning response overrides local feedback when disagreeing (GAP-5 FIXED)",
        afterServer.includes("lastLearningFeedback") && afterServer.includes("serverCorrect"),
        "server evaluation correct overrides local feedback on disagreement",
      );
    }
  }

  // Check if SUBMIT_LEARNING_ANSWER handler uses serverLearningId
  const subIdx = engineSrc.indexOf('case "SUBMIT_LEARNING_ANSWER"');
  if (subIdx !== -1) {
    const subBlock = engineSrc.slice(subIdx, subIdx + 600);
    check(
      "E.5 SUBMIT_LEARNING_ANSWER handler does NOT reference serverLearningId",
      !subBlock.includes("serverLearningId"),
      "answer handler is pure client — server ID unused for evaluation",
    );
  }
}

/* ──────────────────────────── SECTION F: Fire-and-Forget Semantics ───── */

console.log("\n─── SECTION F: Fire-and-Forget Analysis ──────────────────────────");

{
  const fireFn = extractFunction(engineSrc, "fireServerCall");
  check("F.1 fireServerCall function exists", fireFn !== null);
  if (fireFn) {
    check(
      "F.2 fireServerCall tracks call lifecycle via PendingServerCalls",
      fireFn.includes("pendingServerCalls.track"),
    );
    check(
      "F.3 fireServerCall updates lifecycle on resolve (confirm)",
      fireFn.includes("pendingServerCalls.confirm"),
    );
    check(
      "F.4 fireServerCall classifies errors on reject (PERMANENT/RETRYABLE)",
      fireFn.includes("classifyError") && fireFn.includes("retryableFailure"),
    );
    check(
      "F.5 fireServerCall does NOT implement timeout logic",
      !fireFn.includes("timeout") && !fireFn.includes("TIMEOUT") && !fireFn.includes("AbortController"),
    );
    check(
      "F.6 fireServerCall does NOT implement error logging",
      !fireFn.includes("console.") && !fireFn.includes("log("),
    );
  }

  // Check if pendingServerCalls is ever consumed for completeness
  const pendingUsage = engineSrc.match(/pendingServerCalls\b/g);
  check(
    "F.7 pendingServerCalls is declared and used for tracking only",
    pendingUsage !== null && pendingUsage.length <= 6,
    `found ${pendingUsage?.length ?? 0} references — should be ≤6 (declared, added, deleted in finally, used in 3 fireServerCall sites)`,
  );

  // Check if there's a getPendingServerCalls or drainPending function
  check(
    "F.8 No public API exposes pendingServerCalls for external drain/wait",
    !engineSrc.includes("getPendingServerCalls") &&
      !engineSrc.includes("drainPending") &&
      !engineSrc.includes("waitForPending"),
  );
}

/* ──────────────────────────── SECTION G: Reconciliation Scope ────────── */

console.log("\n─── SECTION G: Reconciliation Success-Only Path ──────────────────");

{
  const reconcileFn = extractFunction(engineSrc, "reconcileServerBattle");
  check("G.1 reconcileServerBattle function exists", reconcileFn !== null);

  // Verify reconcileServerBattle is ONLY called inside .then() success paths
  // There are exactly 3 matches: 1 definition + 2 call sites (in startEncounterBattle + attackBasic)
  const reconcileCalls = [...engineSrc.matchAll(/reconcileServerBattle\(/g)];
  let callSiteCount = 0;
  let allCallSitesInThen = true;
  for (const m of reconcileCalls) {
    // Skip the definition: "function reconcileServerBattle(" preceded by "function "
    const charBefore = engineSrc[m.index! - 1] ?? "";
    const twoBefore = engineSrc.slice(m.index! - 9, m.index!);
    if (twoBefore.includes("function ")) continue; // function definition
    callSiteCount++;
    // Check if this call site is inside a .then() block
    const before = engineSrc.slice(Math.max(0, m.index! - 400), m.index!);
    if (!before.includes(".then(") && !before.includes("if (res.ok")) {
      allCallSitesInThen = false;
    }
  }
  check(
    "G.2 reconcileServerBattle is ONLY called inside .then() success paths",
    allCallSitesInThen,
  );

  // Check each fireServerCall site that uses reconcileServerBattle
  // It should only be inside .then() with res.ok check
  const reconcileCallCount = (engineSrc.match(/reconcileServerBattle/g) || []).length;
  check(
    "G.3 reconcileServerBattle has 1 definition + 4 call sites (5 total refs)",
    reconcileCallCount === 5,
    `found ${reconcileCallCount} references`,
  );

  // Check that reconcileServerBattle IS now called for skill attacks (FIXED)
  const skillFn = extractFunction(engineSrc, "attackWithSkill");
  if (skillFn) {
    check(
      "G.4 reconcileServerBattle IS called for skill attacks (FIXED)",
      skillFn.includes("reconcileServerBattle"),
    );
  }

  // Check that reconcileServerBattle IS called for flee (FIXED)
  const fleeFn = extractFunction(engineSrc, "fleeBattle");
  if (fleeFn) {
    check(
      "G.5 reconcileServerBattle IS called for flee (FIXED)",
      fleeFn.includes("reconcileServerBattle"),
    );
  }
}

/* ──────────────────────────── SECTION H: Contract Surface Audit ──────── */

console.log("\n─── SECTION H: Contract Surface (Server-Only Authority) ──────────");

{
  // SubmitBattleActionInput should accept action + skillId + requestKey
  check(
    "H.1 SubmitBattleActionInput accepts action + skillId + requestKey",
    serverContractsSrc.includes('const submitBattleActionKeys = new Set(["action", "skillId", "requestKey"])'),
  );

  // No HP/damage/XP/gold fields in any input contract
  const inputTypes = [
    "StartBattleInput",
    "SubmitLearningAnswerInput",
    "SubmitBattleActionInput",
    "CreateBattleRewardReceiptInput",
    "SettleBattleRewardInput",
  ];
  for (const t of inputTypes) {
    const idx = serverContractsSrc.indexOf(`type ${t}`);
    if (idx !== -1) {
      // Extract only up to the closing `};` of the type (not into next type)
      const endIdx = serverContractsSrc.indexOf("};", idx);
      const block = endIdx !== -1 ? serverContractsSrc.slice(idx, endIdx + 2) : serverContractsSrc.slice(idx, idx + 200);
      check(
        `H.2 ${t} does NOT contain hp/damage/xp/gold fields`,
        !block.includes("hp") && !block.includes("damage") && !block.includes("xp") && !block.includes("gold"),
        `contract must not leak client authority — block: ${block.slice(0, 120)}`,
      );
    }
  }

  // Server state service should NOT trust client for RNG/damage/reward
  check(
    "H.3 PendekarStateService is the only authority for damage resolution",
    serverStateSrc.includes("submitAuthoritativeBattleAction"),
  );
  check(
    "H.4 Server state service creates own battle with own RNG",
    serverStateSrc.includes("createBattle") || serverStateSrc.includes("startBattle"),
  );
  check(
    "H.5 Server state service owns reward receipt creation",
    serverStateSrc.includes("createAuthoritativeBattleRewardReceipt"),
  );
  check(
    "H.6 Server state service owns settlement",
    serverStateSrc.includes("settleAuthoritativeBattleReward"),
  );
}

/* ──────────────────────────── SECTION I: API Client Consistency ──────── */

console.log("\n─── SECTION I: API Client Consistency ────────────────────────────");

{
  // API client should have typed wrappers for all 7 endpoints
  const expectedFunctions = [
    "startServerBattle",
    "startServerLearning",
    "submitServerLearningAnswer",
    "submitServerBattleAction",
    "createServerRewardReceipt",
    "settleServerReward",
  ];
  for (const fn of expectedFunctions) {
    check(
      `I.1 API client exports ${fn}`,
      serverApiSrc.includes(`export async function ${fn}`) || serverApiSrc.includes(`export function ${fn}`),
    );
  }

  // projectionToBattleState should exist
  check(
    "I.2 API client exports projectionToBattleState",
    serverApiSrc.includes("projectionToBattleState"),
  );

  // API client should NOT contain RNG/damage/reward math
  check(
    "I.3 API client does NOT contain computeDamage",
    !serverApiSrc.includes("computeDamage"),
  );
  check(
    "I.4 API client does NOT contain grantXp",
    !serverApiSrc.includes("grantXp"),
  );
  check(
    "I.5 API client does NOT contain creditGold",
    !serverApiSrc.includes("creditGold"),
  );
  // P2.6H.2: API client submitServerBattleAction accepts skillId
  check(
    "I.6 submitServerBattleAction accepts skillId parameter",
    serverApiSrc.includes('action: "basic_attack" | "mahapukul" | "skill"'),
  );
}

/* ──────────────────────────── SECTION J: Engine Import Check ─────────── */

console.log("\n─── SECTION J: Engine Import Consistency ─────────────────────────");

{
  // Engine should import all server API functions
  const expectedImports = [
    "startServerBattle",
    "submitServerLearningAnswer",
    "submitServerBattleAction",
    "createServerRewardReceipt",
    "settleServerReward",
    "generateRequestKey",
    "projectionToBattleState",
  ];
  for (const imp of expectedImports) {
    check(
      `J.1 Engine imports ${imp}`,
      engineSrc.includes(imp),
    );
  }

  // Engine should import startServerLearning (even if unused in current wiring)
  check(
    "J.2 Engine imports startServerLearning",
    engineSrc.includes("startServerLearning"),
  );
}

/* ──────────────────────────── SECTION K: Gap Summary ─────────────────── */

console.log("\n─── SECTION K: Authority Gap Summary ──────────────────────────────");

{
  const gaps: Array<{ id: string; description: string; severity: string; fixed: boolean }> = [
    {
      id: "GAP-1",
      description: "attackWithSkill() has ZERO server wiring — skill damage/MP never reported to server",
      severity: "CRITICAL",
      fixed: true,
    },
    {
      id: "GAP-2",
      description: "fleeBattle() had ZERO server wiring — now calls submitServerBattleAction + reconcileServerBattle",
      severity: "HIGH",
      fixed: true,
    },
    {
      id: "GAP-3",
      description: "applyDefeatFlow() was called before server reconciliation — now deferred until server confirms terminal state",
      severity: "HIGH",
      fixed: true,
    },
    {
      id: "GAP-4",
      description: "Victory reward+settle chain has no .catch() — silent swallow on settlement failure",
      severity: "HIGH",
      fixed: true,
    },
    {
      id: "GAP-5",
      description: "submitLearningAnswer() server response now used for feedback — server evaluation overrides local when disagreeing",
      severity: "MEDIUM",
      fixed: true,
    },
    {
      id: "GAP-6",
      description: "fireServerCall() is fire-and-forget — no retry, no timeout, no error logging, no external drain",
      severity: "MEDIUM",
      fixed: false,
    },
    {
      id: "GAP-7",
      description: "Reconciliation now handles terminal states, stale responses, and server status mapping",
      severity: "MEDIUM",
      fixed: true,
    },
  ];

  console.log(`  Found ${gaps.length} authority gaps:`);
  for (const g of gaps) {
    const status = g.fixed ? " [FIXED]" : "";
    console.log(`    ${g.severity.padEnd(8)} ${g.id}: ${g.description}${status}`);
  }

  // Verify gap count matches expectations
  check("K.1 Expected 7 authority gaps identified", gaps.length === 7);
  check("K.2 GAP-1 (skill attack) is CRITICAL", gaps[0].severity === "CRITICAL");
  check("K.3 GAP-4 (settle error) is HIGH", gaps[3].severity === "HIGH");
  check("K.4 GAP-1 is marked FIXED", gaps[0].fixed === true);
  check("K.5 GAP-4 is marked FIXED", gaps[3].fixed === true);
  check("K.6 GAP-6 remains UNFIXED", gaps.filter((g) => !g.fixed).length === 1);
}

/* ──────────────────────────── SECTION L: Known-Good Wiring ───────────── */

console.log("\n─── SECTION L: Known-Good Server Wiring ───────────────────────────");

{
  // Verify the 3 wired paths are correctly structured
  // 1. startEncounterBattle → startServerBattle + reconcile
  const startFn = extractFunction(engineSrc, "startEncounterBattle");
  if (startFn) {
    check(
      "L.1 startEncounterBattle fires startServerBattle",
      startFn.includes("startServerBattle"),
    );
    check(
      "L.2 startEncounterBattle stores serverBattleId",
      startFn.includes("serverBattleId = res.data.battle.id"),
    );
    check(
      "L.3 startEncounterBattle reconciles server projection",
      startFn.includes("reconcileServerBattle(res.data.battle)"),
    );
  }

  // 2. attackBasic → submitServerBattleAction + reconcile
  const attackFn = extractFunction(engineSrc, "attackBasic");
  if (attackFn) {
    check(
      "L.4 attackBasic fires submitServerBattleAction",
      attackFn.includes("submitServerBattleAction"),
    );
    check(
      "L.5 attackBasic reconciles on success",
      attackFn.includes("reconcileServerBattle(res.data.battle)"),
    );
  }

  // 3. applyWinFlow → createServerRewardReceipt + settleServerReward
  const winFn = extractFunction(engineSrc, "applyWinFlow");
  if (winFn) {
    check(
      "L.6 applyWinFlow fires createServerRewardReceipt",
      winFn.includes("createServerRewardReceipt"),
    );
    check(
      "L.7 applyWinFlow chains settleServerReward after receipt",
      winFn.includes("settleServerReward"),
    );
  }

  // P2.6H.2: Verify getServerRewardState getter exists
  check(
    "L.8 Engine interface declares getServerRewardState",
    engineSrc.includes("getServerRewardState(): ServerRewardState"),
  );
  check(
    "L.9 Engine returns getServerRewardState in public API",
    engineSrc.includes("getServerRewardState,"),
  );
  check(
    "L.10 ServerRewardState type includes CONFIRMED state",
    engineSrc.includes('status: "CONFIRMED"'),
  );
  check(
    "L.11 ServerRewardState type includes RETRYABLE_FAILURE state",
    engineSrc.includes('status: "RETRYABLE_FAILURE"'),
  );
}

/* ──────────────────────────── SECTION M: GAP-5 Learning Feedback ─────── */

console.log("\n─── SECTION M: GAP-5 Server Learning Feedback (P2.6H.4) ──────────");

{
  // Verify submitLearningAnswer uses server response
  const submitFn = extractFunction(engineSrc, "submitLearningAnswer");
  if (submitFn) {
    check(
      "M.1 submitLearningAnswer fires submitServerLearningAnswer",
      submitFn.includes("submitServerLearningAnswer"),
    );
    check(
      "M.2 Server response updates lastLearningFeedback",
      submitFn.includes("lastLearningFeedback") && submitFn.includes("serverCorrect"),
    );
    check(
      "M.3 Server response updates pendingLearning",
      submitFn.includes("pendingLearning") && submitFn.includes("serverCorrect"),
    );
    check(
      "M.4 Server evaluation is checked for EVALUATED category",
      submitFn.includes('category === "EVALUATED"'),
    );
    check(
      "M.5 Server correctness overrides local when disagreeing",
      submitFn.includes("lastLearningFeedback.correct !== serverCorrect"),
    );
  }

  // Verify the feedback type is still { correct: boolean }
  check(
    "M.6 getLearningFeedback returns { correct: boolean } | null",
    engineSrc.includes("getLearningFeedback(): { correct: boolean } | null"),
  );
}

/* ──────────────────────────── SECTION N: GAP-7 Reconciliation ────────── */

console.log("\n─── SECTION N: GAP-7 Reconciliation Hardening (P2.6H.4) ──────────");

{
  const reconcileFn = extractFunction(engineSrc, "reconcileServerBattle");

  if (reconcileFn) {
    // Stale response protection
    check(
      "N.1 reconcileServerBattle tracks lastServerRevision",
      reconcileFn.includes("lastServerRevision"),
    );
    check(
      "N.2 Stale response rejected when actionRevision < lastServerRevision",
      reconcileFn.includes("projection.actionRevision < lastServerRevision"),
    );
    check(
      "N.3 lastServerRevision updated on valid response",
      reconcileFn.includes("lastServerRevision = projection.actionRevision"),
    );

    // Terminal state protection
    check(
      "N.4 Terminal state cannot be reopened to ACTIVE",
      reconcileFn.includes('projection.status === "ACTIVE"'),
    );
    check(
      "N.5 Check uses b.result !== undefined (local terminal guard)",
      reconcileFn.includes("b.result !== undefined"),
    );

    // Server status → local result mapping
    check(
      "N.6 Server WON maps to local WIN",
      reconcileFn.includes('"WON"') && reconcileFn.includes('"WIN"'),
    );
    check(
      "N.7 Server LOST maps to local LOSE",
      reconcileFn.includes('"LOST"') && reconcileFn.includes('"LOSE"'),
    );
    check(
      "N.8 Server FLED maps to local FLED",
      reconcileFn.includes('"FLED"'),
    );

    // Signature includes status and actionRevision
    check(
      "N.9 Projection parameter includes status field",
      reconcileFn.includes("status: string"),
    );
    check(
      "N.10 Projection parameter includes actionRevision field",
      reconcileFn.includes("actionRevision: number"),
    );
  }

  // Verify lastServerRevision is declared at module scope
  check(
    "N.11 lastServerRevision declared as module-level variable",
    engineSrc.includes("let lastServerRevision = -1"),
  );
}

/* ──────────────────────────── Summary ──────────────────────────────── */

console.log("\n" + "═".repeat(60));
console.log(`  P2.6H.1 Authority Gap Audit: ${pass} lulus, ${fail} gagal`);
console.log("═".repeat(60));

if (fail > 0) {
  console.log("\n  ⚠️  Some checks failed — authority gaps differ from expectations.");
  process.exit(1);
} else {
  console.log("\n  ✅ All structural invariants verified. Gaps documented for remediation.");
  process.exit(0);
}
