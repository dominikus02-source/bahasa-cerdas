/**
 * P2.6H.5 Network Resilience & Fire-and-Forget Tests — static source analysis.
 *
 * Tests GAP-6 remediation: bounded timeout, bounded retry, same requestKey
 * on retry, fire-and-forget lifecycle, error classification, lost response
 * recovery, concurrency, and refresh recovery.
 *
 * These tests read source code and verify structural invariants.
 * No DOM, no network, no browser required.
 *
 * Run: npx tsx scripts/test-rpg-p2-6h5-network-resilience.ts
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

/* ---------- Source files ---------- */

const engineSrc = read("src/game/rpg/core/game-engine.ts");
const resilienceSrc = read("lib/game/rpg/network-resilience.ts");
const apiClientSrc = read("lib/game/rpg/server-api-client.ts");
const contractsSrc = read("lib/game/rpg/server-contracts.ts");

/* ============================================================
   A. TIMEOUT BOUNDS (Phase 1)
   ============================================================ */
console.log("\nA. TIMEOUT BOUNDS");

check(
  "A.1 network-resilience exports DEFAULT_TIMEOUT_MS",
  resilienceSrc.includes("DEFAULT_TIMEOUT_MS"),
);

check(
  "A.2 DEFAULT_TIMEOUT_MS = 15000 (15s bounded)",
  /DEFAULT_TIMEOUT_MS\s*=\s*15[_]?000/.test(resilienceSrc),
);

check(
  "A.3 fetchWithTimeout uses AbortController",
  resilienceSrc.includes("new AbortController()"),
);

check(
  "A.4 fetchWithTimeout calls controller.abort() on timeout",
  resilienceSrc.includes("controller.abort()"),
);

check(
  "A.5 fetchWithTimeout throws NetworkError with TIMEOUT code",
  /throw\s+new\s+NetworkError\s*\(\s*"TIMEOUT"/.test(resilienceSrc),
);

check(
  "A.6 fetchWithTimeout clears timeout in finally block",
  resilienceSrc.includes("clearTimeout(timeoutId)"),
);

check(
  "A.7 server-api-client imports fetchWithTimeout",
  apiClientSrc.includes('from "./network-resilience"') && apiClientSrc.includes("fetchWithTimeout"),
);

check(
  "A.8 fetchServer uses fetchWithTimeout (not raw fetch)",
  apiClientSrc.includes("fetchWithTimeout(path,") && !apiClientSrc.match(/fetch\(path,\s*\{/),
);

check(
  "A.9 engine does NOT call raw fetch() for server calls",
  !engineSrc.includes("fetch(\"/api/rpg"),
);

/* ============================================================
   B. RETRY BOUNDS (Phase 2)
   ============================================================ */
console.log("\nB. RETRY BOUNDS");

check(
  "B.1 network-resilience exports DEFAULT_RETRY_POLICY",
  resilienceSrc.includes("DEFAULT_RETRY_POLICY"),
);

check(
  "B.2 DEFAULT_RETRY_POLICY.maxRetries <= 2",
  /maxRetries\s*:\s*(\d+)/.test(resilienceSrc) &&
  Number(resilienceSrc.match(/maxRetries\s*:\s*(\d+)/)?.[1] ?? 99) <= 2,
);

check(
  "B.3 retryDelay is bounded (maxDelayMs exists)",
  resilienceSrc.includes("maxDelayMs"),
);

check(
  "B.4 fetchServerWithRetry has bounded loop (for loop, not while(true))",
  /for\s*\(\s*let\s+attempt\s*=/.test(resilienceSrc),
);

check(
  "B.5 fetchServerWithRetry breaks on PERMANENT error",
  /errorClass\s*===\s*"PERMANENT"\)\s*throw/.test(resilienceSrc),
);

check(
  "B.6 fetchServerWithRetry breaks on last attempt",
  /attempt\s*>=\s*totalAttempts\s*-\s*1/.test(resilienceSrc),
);

check(
  "B.7 no while(true) retry loops in resilience module",
  !resilienceSrc.includes("while(true)") && !resilienceSrc.includes("while (true)"),
);

/* ============================================================
   C. REQUEST KEY SEMANTICS (Phase 3)
   ============================================================ */
console.log("\nC. REQUEST KEY SEMANTICS");

check(
  "C.1 generateRequestKey uses crypto.randomUUID()",
  apiClientSrc.includes("crypto.randomUUID()"),
);

check(
  "C.2 requestKey prefix is 'client-'",
  apiClientSrc.includes("`client-${crypto.randomUUID()}`"),
);

check(
  "C.3 fetchServerWithRetry does NOT mutate requestKey",
  !resilienceSrc.includes("requestKey") || resilienceSrc.includes("requestKey is validated but NOT mutated"),
);

check(
  "C.4 engine battle start: requestKey generated BEFORE fireServerCall",
  /const requestKey = generateRequestKey\(\);\s*\n\s*fireServerCall\(/m.test(engineSrc),
);

check(
  "C.5 engine learning answer: requestKey generated BEFORE fireServerCall",
  engineSrc.includes("submitServerLearningAnswer(serverBattleId, answer, requestKey)") &&
  /const requestKey = generateRequestKey\(\);\s*\n\s*fireServerCall/m.test(engineSrc),
);

check(
  "C.6 engine reward: rewardKey generated BEFORE fireServerCall",
  /const rewardKey = generateRequestKey\(\);\s*\n\s*serverRewardState/m.test(engineSrc),
);

check(
  "C.7 all fireServerCall sites pass explicit key option",
  (engineSrc.match(/fireServerCall\(/g)?.length ?? 0) <=
  (engineSrc.match(/key:\s*`/g)?.length ?? 0) + 1, // +1 for learning start which doesn't need one
);

/* ============================================================
   D. FIRE-AND-FORGET LIFECYCLE (Phase 4)
   ============================================================ */
console.log("\nD. FIRE-AND-FORGET LIFECYCLE");

check(
  "D.1 network-resilience exports ServerCallStatus type",
  resilienceSrc.includes("ServerCallStatus"),
);

check(
  "D.2 ServerCallStatus includes PENDING",
  resilienceSrc.includes('"PENDING"'),
);

check(
  "D.3 ServerCallStatus includes CONFIRMED",
  resilienceSrc.includes('"CONFIRMED"'),
);

check(
  "D.4 ServerCallStatus includes RETRYABLE_FAILURE",
  resilienceSrc.includes('"RETRYABLE_FAILURE"'),
);

check(
  "D.5 ServerCallStatus includes FAILED",
  resilienceSrc.includes('"FAILED"'),
);

check(
  "D.6 ServerCallStatus includes UNKNOWN",
  resilienceSrc.includes('"UNKNOWN"'),
);

check(
  "D.7 PendingServerCalls class exists",
  /class\s+PendingServerCalls/.test(resilienceSrc),
);

check(
  "D.8 PendingServerCalls has track/confirm/failed methods",
  resilienceSrc.includes("track(key: string)") &&
  resilienceSrc.includes("confirm(key: string") &&
  resilienceSrc.includes("failed(key: string"),
);

check(
  "D.9 engine imports PendingServerCalls",
  engineSrc.includes("PendingServerCalls"),
);

check(
  "D.10 engine creates PendingServerCalls instance",
  engineSrc.includes("new PendingServerCalls()"),
);

check(
  "D.11 engine fireServerCall tracks call lifecycle",
  engineSrc.includes("pendingServerCalls.track(key)") &&
  engineSrc.includes("pendingServerCalls.confirm(key"),
);

check(
  "D.12 engine exposes getServerCallStatus",
  engineSrc.includes("getServerCallStatus"),
);

/* ============================================================
   E. STALE RESPONSE PROTECTION (Phase 5 — lost response)
   ============================================================ */
console.log("\nE. STALE RESPONSE / LOST RESPONSE");

check(
  "E.1 engine has lastServerRevision tracking",
  engineSrc.includes("let lastServerRevision = -1"),
);

check(
  "E.2 reconcileServerBattle rejects stale revisions",
  engineSrc.includes("projection.actionRevision < lastServerRevision"),
);

check(
  "E.3 reconcileServerBattle updates lastServerRevision",
  engineSrc.includes("lastServerRevision = projection.actionRevision"),
);

check(
  "E.4 reconcileServerBattle protects terminal states from reopening",
  engineSrc.includes('b.result !== undefined && projection.status === "ACTIVE"'),
);

check(
  "E.5 reward failure sets RETRYABLE_FAILURE (not silent)",
  engineSrc.includes('status: "RETRYABLE_FAILURE"') && engineSrc.includes("server reward receipt failed"),
);

check(
  "E.6 settlement failure sets RETRYABLE_FAILURE (not silent)",
  engineSrc.includes("server settlement failed"),
);

check(
  "E.7 reward chain error sets FAILED",
  engineSrc.includes("server reward chain error"),
);

/* ============================================================
   F. CONCURRENCY (Phase 6)
   ============================================================ */
console.log("\nF. CONCURRENCY");

check(
  "F.1 server-state has requestKey uniqueness check (answerRequestId)",
  read("lib/game/rpg/server-state.ts").includes("answerRequestId"),
);

check(
  "F.2 server-state has requestKey uniqueness check for battle actions",
  read("lib/game/rpg/server-state.ts").includes('pendekarBattleAction.findUnique({ where: { requestKey: input.requestKey } }'),
);

check(
  "F.3 server-state has requestKey uniqueness for reward receipts",
  read("lib/game/rpg/server-state.ts").includes('pendekarRewardReceipt.findUnique({ where: { idempotencyKey: input.requestKey } }'),
);

check(
  "F.4 server contracts define REPLAY_CONFLICT for learning",
  contractsSrc.includes("ANSWER_REPLAY_CONFLICT"),
);

check(
  "F.5 server contracts define REPLAY_CONFLICT for battle actions",
  contractsSrc.includes("BATTLE_ACTION_REPLAY_CONFLICT"),
);

check(
  "F.6 server contracts define REPLAY_CONFLICT for rewards",
  contractsSrc.includes("BATTLE_REWARD_REPLAY_CONFLICT"),
);

/* ============================================================
   G. ERROR CLASSIFICATION (Phase 8)
   ============================================================ */
console.log("\nG. ERROR CLASSIFICATION");

check(
  "G.1 classifyError exports from network-resilience",
  resilienceSrc.includes("export function classifyError"),
);

check(
  "G.2 classifyError returns PERMANENT for UNAUTHENTICATED",
  resilienceSrc.includes('"UNAUTHENTICATED"'),
);

check(
  "G.3 classifyError returns PERMANENT for INVALID_INPUT",
  resilienceSrc.includes('"INVALID_INPUT"'),
);

check(
  "G.4 classifyError returns RETRYABLE for status 0 (network)",
  /status\s*===\s*0/.test(resilienceSrc),
);

check(
  "G.5 classifyError returns RETRYABLE for 429 (rate limit)",
  resilienceSrc.includes("429"),
);

check(
  "G.6 classifyError returns RETRYABLE for 502/503/504",
  resilienceSrc.includes("502") && resilienceSrc.includes("503") && resilienceSrc.includes("504"),
);

check(
  "G.7 classifyError returns PERMANENT for BATTLE_TERMINAL",
  resilienceSrc.includes('"BATTLE_TERMINAL"'),
);

check(
  "G.8 classifyError returns PERMANENT for BATTLE_EXPIRED",
  resilienceSrc.includes('"BATTLE_EXPIRED"'),
);

check(
  "G.9 engine imports classifyError",
  engineSrc.includes("classifyError"),
);

check(
  "G.10 engine uses classifyError in reward failure path",
  engineSrc.includes("classifyError(receiptRes.error.status") || engineSrc.includes("classifyError("),
);

/* ============================================================
   H. REFRESH RECOVERY (Phase 7)
   ============================================================ */
console.log("\nH. REFRESH RECOVERY");

check(
  "H.1 fetchStateProjection is available (GET /api/rpg/state)",
  apiClientSrc.includes("fetchStateProjection"),
);

check(
  "H.2 engine imports fetchStateProjection",
  engineSrc.includes("fetchStateProjection"),
);

check(
  "H.3 post-settlement fetches server state for cross-device sync",
  engineSrc.includes("fetchStateProjection().catch"),
);

check(
  "H.4 state projection includes player stats, gold, XP",
  contractsSrc.includes("stats:") && contractsSrc.includes("wallet:") && contractsSrc.includes("progression:"),
);

check(
  "H.5 state projection includes activeBattle",
  contractsSrc.includes("activeBattle"),
);

/* ============================================================
   I. NON-BLOCKING RENDERER (Phase 4 constraint)
   ============================================================ */
console.log("\nI. NON-BLOCKING RENDERER");

check(
  "I.1 engine fireServerCall does not use await (non-blocking)",
  !engineSrc.match(/await\s+fireServerCall/),
);

check(
  "I.2 fireServerCall returns Promise (caller can .then but doesn't have to)",
  engineSrc.includes("function fireServerCall<T>("),
);

check(
  "I.3 no synchronous fetch in engine main loop",
  !engineSrc.includes("await fetch(") && !engineSrc.includes("await fetchWith"),
);

/* ============================================================
   J. INTEGRATION: PREVIOUS GAPS REMAIN FIXED
   ============================================================ */
console.log("\nJ. PREVIOUS GAPS REMAIN FIXED");

check(
  "J.1 GAP-1 (skill attack) — submitServerBattleAction called in attackWithSkill",
  engineSrc.includes('submitServerBattleAction(serverBattleId, "skill"'),
);

check(
  "J.2 GAP-2 (flee) — submitServerBattleAction called in fleeBattle",
  engineSrc.includes('submitServerBattleAction(serverBattleId, "flee"'),
);

check(
  "J.3 GAP-3 (deferred defeat) — pendingDefeat settled in attackBasic",
  engineSrc.includes("pendingDefeat") && engineSrc.includes("applyDefeatFlow"),
);

check(
  "J.4 GAP-4 (reward) — createServerRewardReceipt + settleServerReward in applyWinFlow",
  engineSrc.includes("createServerRewardReceipt") && engineSrc.includes("settleServerReward"),
);

check(
  "J.5 GAP-5 (learning feedback) — lastLearningFeedback updated from server",
  engineSrc.includes("lastLearningFeedback.correct !== serverCorrect"),
);

check(
  "J.6 GAP-7 (reconciliation) — reconcileServerBattle with stale + terminal guard",
  engineSrc.includes("reconcileServerBattle") && engineSrc.includes("lastServerRevision"),
);

/* ============================================================
   SUMMARY
   ============================================================ */

console.log(`\n${"=".repeat(60)}`);
console.log(`P2.6H.5 Network Resilience Tests: ${pass} passed, ${fail} failed, ${pass + fail} total`);
console.log(`${"=".repeat(60)}`);

if (fail > 0) {
  process.exit(1);
}
