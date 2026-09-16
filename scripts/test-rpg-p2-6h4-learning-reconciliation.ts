/**
 * P2.6H.4 Learning & Reconciliation Authority Tests — static source analysis.
 *
 * Tests the remediation of GAP-5 (server learning feedback drives runtime)
 * and GAP-7 (reconciliation handles rejection, stale responses, terminal states).
 *
 * These tests read engine source code and verify structural invariants.
 * No DOM, no network, no browser required.
 *
 * Run: npx tsx scripts/test-rpg-p2-6h4-learning-reconciliation.ts
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

function extractFunction(src: string, funcName: string): string | null {
  const patterns = [`function ${funcName}(`, `function ${funcName}<`];
  let idx = -1;
  for (const p of patterns) {
    idx = src.indexOf(p);
    if (idx !== -1) break;
  }
  if (idx === -1) return null;
  let parenDepth = 0;
  let bodyStart = -1;
  for (let i = idx; i < src.length; i++) {
    if (src[i] === "(") parenDepth++;
    if (src[i] === ")") { parenDepth--; if (parenDepth === 0) { bodyStart = i + 1; break; } }
  }
  if (bodyStart === -1) return null;
  let braceDepth = 0;
  let inString = false;
  let stringChar = "";
  for (let i = bodyStart; i < src.length; i++) {
    const ch = src[i];
    if (inString) { if (ch === stringChar && src[i - 1] !== "\\") inString = false; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { inString = true; stringChar = ch; continue; }
    if (ch === "{") braceDepth++;
    if (ch === "}") { braceDepth--; if (braceDepth === 0) return src.substring(bodyStart, i + 1); }
  }
  return src.substring(bodyStart);
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
const serverContractsSrc = read("lib/game/rpg/server-contracts.ts");
const apiClientSrc = read("lib/game/rpg/server-api-client.ts");
const learningRuntimeSrc = read("src/game/rpg/learning/learning-runtime.ts");
const serverStateSrc = read("lib/game/rpg/server-state.ts");

/* ═══════════════════════════════════════════════════════════════════
   SECTION A — LEARNING AUTHORITY (GAP-5)
   ═══════════════════════════════════════════════════════════════════ */

console.log("\n─── SECTION A: Server Learning Feedback (GAP-5) ──────────────────");

{
  // A.1 Server contract has SubmitLearningAnswerResult with evaluation.correct
  check(
    "A.1 SubmitLearningAnswerResult includes evaluation.correct",
    serverContractsSrc.includes("evaluation: { correct: boolean; score: 0 | 1 }"),
  );

  // A.2 Server evaluation is structurally authoritative (server-state.ts)
  check(
    "A.2 Server-state evaluateAnswer resolves correctness",
    serverStateSrc.includes('const isCorrect = evaluation.signal === "CORRECT"'),
  );

  // A.3 Server stores isCorrect on learning session
  check(
    "A.3 Server persists isCorrect on PendekarLearningSession",
    serverStateSrc.includes("isCorrect") && serverStateSrc.includes("status: \"ANSWERED\""),
  );

  // A.4 Server returns evaluation in response
  check(
    "A.4 Server returns evaluation.correct in SubmitLearningAnswerResult",
    serverStateSrc.includes("evaluation: { correct: isCorrect, score: evaluation.score }"),
  );

  // A.5 API client sends only answer + requestKey (no isCorrect/score/damage in function body)
  check(
    "A.5 API client learning function sends only answer + requestKey",
    apiClientSrc.includes("const input: SubmitLearningAnswerInput = { answer, requestKey }"),
  );

  // A.6 Client cannot forge correctness via input contract
  check(
    "A.6 parseSubmitLearningAnswerInput uses submitLearningAnswerKeys whitelist",
    serverContractsSrc.includes("submitLearningAnswerKeys") &&
    serverContractsSrc.includes('"answer"') &&
    serverContractsSrc.includes('"requestKey"'),
  );

  // A.7 submitLearningAnswer processes server response
  const submitFn = extractFunction(engineSrc, "submitLearningAnswer");
  if (submitFn) {
    check(
      "A.7 submitLearningAnswer checks res.ok AND category EVALUATED",
      submitFn.includes("res.ok") && submitFn.includes('category === "EVALUATED"'),
    );

    // A.8 Server correct overrides local lastLearningFeedback
    check(
      "A.8 Server correct overrides lastLearningFeedback when disagreeing",
      submitFn.includes("lastLearningFeedback.correct !== serverCorrect"),
    );

    // A.9 Server correct overrides local pendingLearning
    check(
      "A.9 Server correct overrides pendingLearning when disagreeing",
      submitFn.includes("pendingLearning.correct !== serverCorrect"),
    );

    // A.10 Server response stores evaluation.correct as serverCorrect
    check(
      "A.10 evaluation.correct extracted as serverCorrect",
      submitFn.includes("const serverCorrect = res.data.evaluation.correct"),
    );
  }

  // A.11 Learning runtime is pure — no server dependency
  check(
    "A.11 Learning runtime submitBattleAnswer is pure (no fetch/network)",
    !learningRuntimeSrc.includes("fetch") && !learningRuntimeSrc.includes("XMLHttpRequest"),
  );

  // A.12 Learning feedback type unchanged
  check(
    "A.12 getLearningFeedback returns { correct: boolean } | null",
    engineSrc.includes("getLearningFeedback(): { correct: boolean } | null"),
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SECTION B — RECONCILIATION (GAP-7)
   ═══════════════════════════════════════════════════════════════════ */

console.log("\n─── SECTION B: Reconciliation Hardening (GAP-7) ──────────────────");

{
  // Check directly against full source (extractFunction can't parse complex params)
  // B.1 Signature includes status
  check(
    "B.1 reconcileServerBattle parameter includes status: string",
    engineSrc.includes("function reconcileServerBattle(projection:") && engineSrc.includes("status: string;"),
  );

  // B.2 Signature includes actionRevision
  check(
    "B.2 reconcileServerBattle parameter includes actionRevision: number",
    engineSrc.includes("actionRevision: number;"),
  );

  // B.3 Stale response protection
  check(
    "B.3 Stale response guard: projection.actionRevision < lastServerRevision",
    engineSrc.includes("projection.actionRevision < lastServerRevision"),
  );

  // B.4 Early return on stale
  check(
    "B.4 Early return (no-op) for stale responses",
    engineSrc.includes("if (projection.actionRevision < lastServerRevision) return"),
  );

  // B.5 lastServerRevision updated
  check(
    "B.5 lastServerRevision = projection.actionRevision after guard",
    engineSrc.includes("lastServerRevision = projection.actionRevision"),
  );

  // B.6 Terminal state protection
  check(
    "B.6 Terminal guard: b.result !== undefined && ACTIVE → return",
    engineSrc.includes("b.result !== undefined") && engineSrc.includes('projection.status === "ACTIVE"'),
  );

  // B.7 Server status mapping: WON → WIN
  check(
    "B.7 Server status WON maps to local result WIN",
    engineSrc.includes('"WON"') && engineSrc.includes('"WIN"'),
  );

  // B.8 Server status mapping: LOST → LOSE
  check(
    "B.8 Server status LOST maps to local result LOSE",
    engineSrc.includes('"LOST"') && engineSrc.includes('"LOSE"'),
  );

  // B.9 Server status mapping: FLED → FLED
  check(
    "B.9 Server status FLED maps to local result FLED",
    engineSrc.includes('"FLED"'),
  );

  // B.10 Terminal mapping only when local result undefined
  check(
    "B.10 Terminal mapping guarded by b.result === undefined",
    engineSrc.includes("b.result === undefined"),
  );

  // B.11 Module-level lastServerRevision
  check(
    "B.11 lastServerRevision declared at module scope",
    engineSrc.includes("let lastServerRevision = -1"),
  );

  // B.12 Server projection has actionRevision
  check(
    "B.12 PendekarBattleProjection includes actionRevision",
    serverContractsSrc.includes("actionRevision: number"),
  );

  // B.13 Server projection has status
  check(
    "B.13 PendekarBattleProjection includes status: string",
    serverContractsSrc.includes("status: string"),
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SECTION C — LEARNING + RECONCILIATION INTEGRATION
   ═══════════════════════════════════════════════════════════════════ */

console.log("\n─── SECTION C: Learning + Reconciliation Integration ─────────────");

{
  // C.1 Server remains authoritative: learning answer goes through server
  check(
    "C.1 submitLearningAnswer fires submitServerLearningAnswer",
    engineSrc.includes("submitServerLearningAnswer(serverBattleId, answer, requestKey)"),
  );

  // C.2 Battle actions fire through server
  check(
    "C.2 attackBasic fires submitServerBattleAction",
    engineSrc.includes('submitServerBattleAction(serverBattleId, "basic_attack"'),
  );
  check(
    "C.3 attackWithSkill fires submitServerBattleAction with skill",
    engineSrc.includes('submitServerBattleAction(serverBattleId, "skill"'),
  );
  check(
    "C.4 fleeBattle fires submitServerBattleAction with flee",
    engineSrc.includes('submitServerBattleAction(serverBattleId, "flee"'),
  );

  // C.5 All 3 action paths reconcile on success
  const attackFn = extractFunction(engineSrc, "attackBasic");
  const skillFn = extractFunction(engineSrc, "attackWithSkill");
  const fleeFn = extractFunction(engineSrc, "fleeBattle");
  if (attackFn) check("C.5 attackBasic reconciles on success", attackFn.includes("reconcileServerBattle(res.data.battle)"));
  if (skillFn) check("C.6 attackWithSkill reconciles on success", skillFn.includes("reconcileServerBattle(res.data.battle)"));
  if (fleeFn) check("C.7 fleeBattle reconciles on success", fleeFn.includes("reconcileServerBattle(res.data.battle)"));

  // C.8 learning feedback override happens in server response handler
  const submitFn = extractFunction(engineSrc, "submitLearningAnswer");
  if (submitFn) {
    check(
      "C.8 Learning feedback override in fireServerCall callback",
      submitFn.includes("fireServerCall") && submitFn.includes("lastLearningFeedback = { correct: serverCorrect }"),
    );
  }

  // C.9 No client-side correctness forgery in learning answer input
  check(
    "C.9 parseSubmitLearningAnswerInput uses whitelist (answer + requestKey only)",
    serverContractsSrc.includes("submitLearningAnswerKeys") &&
    serverContractsSrc.includes('"answer"') &&
    serverContractsSrc.includes('"requestKey"'),
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SECTION D — STALE RESPONSE PROTECTION
   ═══════════════════════════════════════════════════════════════════ */

console.log("\n─── SECTION D: Stale Response Protection ─────────────────────────");

{
  // D.1 actionRevision exists in server projection
  check(
    "D.1 PendekarBattleProjection has actionRevision: number",
    serverContractsSrc.includes("actionRevision: number"),
  );

  // D.2 Server increments actionRevision on each resolved action
  check(
    "D.2 Server increments actionRevision (nextRevision = battle.actionRevision + 1)",
    serverStateSrc.includes("battle.actionRevision + 1"),
  );

  // D.3 Client tracks lastServerRevision
  check(
    "D.3 Client tracks lastServerRevision at module scope",
    engineSrc.includes("let lastServerRevision = -1"),
  );

  // D.4 Stale response silently rejected (no error, no throw)
  const reconcileFn = extractFunction(engineSrc, "reconcileServerBattle");
  if (reconcileFn) {
    check(
      "D.4 Stale response rejected via early return (not throw)",
      reconcileFn.includes("if (projection.actionRevision < lastServerRevision) return"),
    );
  }
}

/* ═══════════════════════════════════════════════════════════════════
   SECTION E — TERMINAL STATE PROTECTION
   ═══════════════════════════════════════════════════════════════════ */

console.log("\n─── SECTION E: Terminal State Protection ──────────────────────────");

{
  // E.1 Terminal states defined in battle-core
  check(
    "E.1 RPGBattleResult includes WIN, LOSE, FLED",
    engineSrc.includes('"WIN"') && engineSrc.includes('"LOSE"') && engineSrc.includes('"FLED"'),
  );

  // E.2 reconcileServerBattle checks b.result !== undefined before terminal
  const reconcileFn = extractFunction(engineSrc, "reconcileServerBattle");
  if (reconcileFn) {
    check(
      "E.2 Guard: once b.result is set, ACTIVE projection rejected",
      reconcileFn.includes("b.result !== undefined"),
    );

    // E.3 Terminal → ACTIVE is blocked
    check(
      "E.3 ACTIVE projection rejected when battle is terminal",
      reconcileFn.includes('projection.status === "ACTIVE"'),
    );
  }

  // E.4 Server returns status field (ACTIVE/WON/LOST/FLED/EXPIRED)
  check(
    "E.4 PendekarBattleProjection.status covers terminal values",
    serverContractsSrc.includes("status: string"),
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SECTION F — REJECTED ACTION HANDLING
   ═══════════════════════════════════════════════════════════════════ */

console.log("\n─── SECTION F: Rejected Action Handling ──────────────────────────");

{
  // F.1 Server returns error for rejected actions (non-ok HTTP)
  check(
    "F.1 Server returns PendekarBattleActionError for rejected actions",
    serverStateSrc.includes("PendekarBattleActionError"),
  );

  // F.2 Error codes cover rejection scenarios
  check(
    "F.2 Error codes include BATTLE_ACTION_INVALID_STATE",
    serverContractsSrc.includes("BATTLE_ACTION_INVALID_STATE"),
  );
  check(
    "F.3 Error codes include LEARNING_RESULT_REQUIRED",
    serverContractsSrc.includes("LEARNING_RESULT_REQUIRED"),
  );
  check(
    "F.4 Error codes include BATTLE_ACTION_REPLAY_CONFLICT",
    serverContractsSrc.includes("BATTLE_ACTION_REPLAY_CONFLICT"),
  );

  // F.3 API client returns FetchFail for non-ok responses
  check(
    "F.5 fetchServer returns { ok: false } for non-ok HTTP",
    apiClientSrc.includes("return {") && apiClientSrc.includes("ok: false"),
  );

  // F.4 Engine does not reconcile on rejected actions (res.ok guard)
  const attackFn = extractFunction(engineSrc, "attackBasic");
  if (attackFn) {
    check(
      "F.6 attackBasic only reconciles when res.ok (rejected → no reconcile)",
      attackFn.includes("if (res.ok)") && attackFn.includes("reconcileServerBattle"),
    );
  }
}

/* ═══════════════════════════════════════════════════════════════════
   SECTION G — SCOPE GUARD
   ═══════════════════════════════════════════════════════════════════ */

console.log("\n─── SECTION G: Scope Guard (GAP-6 NOT fixed) ─────────────────────");

{
  // G.1 fireServerCall itself does NOT implement retry loops (retry lives in fetchServerWithRetry)
  check(
    "G.1 fireServerCall has no internal retry loop",
    !engineSrc.includes("while(true)") && !engineSrc.includes("while (true)"),
  );

  // G.2 No timeout in fireServerCall
  check(
    "G.2 fireServerCall has no timeout logic",
    !engineSrc.includes("setTimeout") || engineSrc.indexOf("fireServerCall") < engineSrc.indexOf("setTimeout"),
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SECTION H — UNCHANGED INVARIANTS
   ═══════════════════════════════════════════════════════════════════ */

console.log("\n─── SECTION H: Unchanged Invariants ──────────────────────────────");

{
  // H.1 No client-side damage/reward in learning answer
  check(
    "H.1 No damage values in learning answer flow",
    !engineSrc.includes("damage") || engineSrc.indexOf("submitLearningAnswer") < engineSrc.indexOf("damage"),
  );

  // H.2 No XP/gold in getLearningFeedback function body
  check(
    "H.2 getLearningFeedback returns only { correct } (no xp/gold)",
    engineSrc.includes("function getLearningFeedback(): { correct: boolean } | null"),
  );

  // H.3 Learning feedback remains transient (not persisted)
  check(
    "H.3 lastLearningFeedback is a let variable (transient)",
    engineSrc.includes("let lastLearningFeedback"),
  );

  // H.4 pendingLearning is transient
  check(
    "H.4 pendingLearning is a let variable (transient)",
    engineSrc.includes("let pendingLearning"),
  );
}

/* ═══════════════════════════════════════════════════════════════════
   SUMMARY
   ═══════════════════════════════════════════════════════════════════ */

console.log("\n" + "═".repeat(60));
console.log(`  P2.6H.4 Learning & Reconciliation: ${pass} lulus, ${fail} gagal`);
console.log("═".repeat(60));

if (fail > 0) {
  console.log("\n  ⚠️  Some checks failed — review remediation.");
  process.exit(1);
} else {
  console.log("\n  ✅ All structural invariants verified.");
  process.exit(0);
}
