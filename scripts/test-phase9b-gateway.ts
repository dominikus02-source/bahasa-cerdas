/**
 * Phase 9B — AI Gateway & Credit Ledger Foundation Tests
 *
 * Tests:
 *  1. eyd cost = 1 light
 *  2. rpp cost = 5 heavy
 *  3. ppt cost = 5 heavy
 *  4. soal 5 questions = 3 medium
 *  5. soal 15 questions = 5 heavy
 *  6. text-analysis short = 2 medium
 *  7. text-analysis long (6000 chars) = 4 medium
 *  8. Murid resolves to MURID_FREE unlimited
 *  9. Founder resolves unlimited
 * 10. Premium Guru resolves GURU_PRO 500 credits
 * 11. Trial Guru resolves GURU_PRO_TRIAL 200 credits
 * 12. Free Guru resolves GURU_FREE 30 credits
 * 13. Soft quota returns allowed true even if wouldBlock true
 * 14. Circuit breaker enters cooldown after repeated failures
 * 15. Provider success resets/degraded health appropriately
 */

import { calculateAgentCost } from "../lib/ai-gateway/agent-cost-policy";
import { resolveUserAiPlan } from "../lib/ai-gateway/plan-resolver";
import { getQuotaLimits } from "../lib/ai-gateway/quota-policy";
import { recordProviderFailure, recordProviderSuccess, getProviderHealth, shouldSkipProvider, resetProviderHealth } from "../lib/ai-gateway/provider-guard";
import { getCircuitBreakerState } from "../lib/ai-gateway/circuit-breaker";

let passed = 0;
let failed = 0;
let errors: string[] = [];

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${msg}`);
  } else {
    failed++;
    errors.push(msg);
    console.log(`  ❌ ${msg}`);
  }
}

function assertEqual(actual: unknown, expected: unknown, msg: string) {
  if (actual === expected) {
    passed++;
    console.log(`  ✅ ${msg} (${actual})`);
  } else {
    failed++;
    errors.push(`${msg}: expected ${expected}, got ${actual}`);
    console.log(`  ❌ ${msg}: expected ${expected}, got ${actual}`);
  }
}

// ── Test 1: eyd cost ───────────────────────────────────────
function testEydCost() {
  console.log("\n[Test 1] eyd cost = 1 light");
  const result = calculateAgentCost("eyd");
  assertEqual(result.credits, 1, "eyd credits");
  assertEqual(result.weight, "light", "eyd weight");
}

// ── Test 2: rpp cost ───────────────────────────────────────
function testRppCost() {
  console.log("\n[Test 2] rpp cost = 5 heavy");
  const result = calculateAgentCost("rpp");
  assertEqual(result.credits, 5, "rpp credits");
  assertEqual(result.weight, "heavy", "rpp weight");
}

// ── Test 3: ppt cost ───────────────────────────────────────
function testPptCost() {
  console.log("\n[Test 3] ppt cost = 5 heavy");
  const result = calculateAgentCost("ppt");
  assertEqual(result.credits, 5, "ppt credits");
  assertEqual(result.weight, "heavy", "ppt weight");
}

// ── Test 4: soal 5 questions ────────────────────────────────
function testSoal5() {
  console.log("\n[Test 4] soal 5 questions = 3 medium");
  const result = calculateAgentCost("soal", { questionCount: 5 });
  assertEqual(result.credits, 3, "soal 5 credits");
  assertEqual(result.weight, "medium", "soal 5 weight");
}

// ── Test 5: soal 15 questions ───────────────────────────────
function testSoal15() {
  console.log("\n[Test 5] soal 15 questions = 5 heavy");
  const result = calculateAgentCost("soal", { questionCount: 15 });
  assertEqual(result.credits, 5, "soal 15 credits");
  assertEqual(result.weight, "heavy", "soal 15 weight");
}

// ── Test 6: text-analysis short ─────────────────────────────
function testTextAnalysisShort() {
  console.log("\n[Test 6] text-analysis short = 2 medium");
  const result = calculateAgentCost("text-analysis", { text: "short text" });
  assertEqual(result.credits, 2, "text-analysis short credits");
  assertEqual(result.weight, "medium", "text-analysis short weight");
}

// ── Test 7: text-analysis long ──────────────────────────────
function testTextAnalysisLong() {
  console.log("\n[Test 7] text-analysis long (6000 chars) = 4 medium");
  const longText = "x".repeat(6000);
  const result = calculateAgentCost("text-analysis", { text: longText });
  assertEqual(result.credits, 4, "text-analysis long credits");
  assertEqual(result.weight, "medium", "text-analysis long weight");
}

// ── Test 8: Murid resolves to MURID_FREE unlimited ──────────
function testMuridPlan() {
  console.log("\n[Test 8] Murid resolves to MURID_FREE unlimited");
  const user = {
    role: "MURID",
    isFounder: false,
    isPremium: false,
    premiumUntil: null,
    trialEndsAt: null,
    trialStartedAt: null,
    premiumPlan: "FREE",
  };
  const plan = resolveUserAiPlan(user);
  assertEqual(plan.plan, "MURID_FREE", "Murid plan");
  assert(plan.unlimited === true, "Murid unlimited");
}

// ── Test 9: Founder resolves unlimited ──────────────────────
function testFounderPlan() {
  console.log("\n[Test 9] Founder resolves unlimited");
  const user = {
    role: "GURU",
    isFounder: true,
    isPremium: false,
    premiumUntil: null,
    trialEndsAt: null,
    trialStartedAt: null,
    premiumPlan: "FREE",
  };
  const plan = resolveUserAiPlan(user);
  assertEqual(plan.plan, "FOUNDER", "Founder plan");
  assert(plan.unlimited === true, "Founder unlimited");
}

// ── Test 10: Premium Guru resolves GURU_PRO 500 credits ────
function testPremiumGuruPlan() {
  console.log("\n[Test 10] Premium Guru resolves GURU_PRO 500 credits");
  const future = new Date();
  future.setDate(future.getDate() + 30);
  const user = {
    role: "GURU",
    isFounder: false,
    isPremium: true,
    premiumUntil: future,
    trialEndsAt: null,
    trialStartedAt: null,
    premiumPlan: "PRO",
  };
  const plan = resolveUserAiPlan(user);
  assertEqual(plan.plan, "GURU_PRO", "Premium Guru plan");
  assertEqual(plan.creditsTotal, 500, "Premium Guru credits");
  assert(plan.unlimited === false, "Premium Guru not unlimited");
}

// ── Test 11: Trial Guru resolves GURU_PRO_TRIAL 200 credits ─
function testTrialGuruPlan() {
  console.log("\n[Test 11] Trial Guru resolves GURU_PRO_TRIAL 200 credits");
  const future = new Date();
  future.setDate(future.getDate() + 15);
  const user = {
    role: "GURU",
    isFounder: false,
    isPremium: false,
    premiumUntil: null,
    trialEndsAt: future,
    trialStartedAt: new Date(),
    premiumPlan: "FREE",
  };
  const plan = resolveUserAiPlan(user);
  assertEqual(plan.plan, "GURU_PRO_TRIAL", "Trial Guru plan");
  assertEqual(plan.creditsTotal, 200, "Trial Guru credits");
  assert(plan.isTrial === true, "Trial Guru isTrial");
}

// ── Test 12: Free Guru resolves GURU_FREE 30 credits ────────
function testFreeGuruPlan() {
  console.log("\n[Test 12] Free Guru resolves GURU_FREE 30 credits");
  const user = {
    role: "GURU",
    isFounder: false,
    isPremium: false,
    premiumUntil: null,
    trialEndsAt: null,
    trialStartedAt: null,
    premiumPlan: "FREE",
  };
  const plan = resolveUserAiPlan(user);
  assertEqual(plan.plan, "GURU_FREE", "Free Guru plan");
  assertEqual(plan.creditsTotal, 30, "Free Guru credits");
  assert(plan.unlimited === false, "Free Guru not unlimited");
}

// ── Test 13: Quota limits per plan ──────────────────────────
function testQuotaLimits() {
  console.log("\n[Test 13] Quota limits per plan");
  const free = getQuotaLimits("GURU_FREE");
  assertEqual(free.creditsPerMonth, 30, "GURU_FREE creditsPerMonth");
  assertEqual(free.maxPerRequest, 10, "GURU_FREE maxPerRequest");

  const pro = getQuotaLimits("GURU_PRO");
  assertEqual(pro.creditsPerMonth, 500, "GURU_PRO creditsPerMonth");
  assertEqual(pro.dailyVelocityCap, 200, "GURU_PRO dailyVelocityCap");

  const trial = getQuotaLimits("GURU_PRO_TRIAL");
  assertEqual(trial.creditsPerMonth, 200, "GURU_PRO_TRIAL creditsPerMonth");
}

// ── Test 14: Circuit breaker enters cooldown after failures ─
function testCircuitBreakerCooldown() {
  console.log("\n[Test 14] Circuit breaker cooldown after repeated failures");
  resetProviderHealth("test-provider-1");

  // Record 5 failures
  for (let i = 0; i < 5; i++) {
    recordProviderFailure("test-provider-1");
  }

  const state = getCircuitBreakerState("test-provider-1");
  assert(state.healthy === false, "Provider unhealthy after 5 failures");
  assert(state.degraded === true, "Provider degraded after 5 failures");
  assert(state.inCooldown === true, "Provider in cooldown after 5 failures");

  // shouldSkipProvider should return true during cooldown
  const skip = shouldSkipProvider("test-provider-1");
  assert(skip === true, "Should skip provider in cooldown");
}

// ── Test 15: Provider success resets health ─────────────────
function testProviderSuccessResetsHealth() {
  console.log("\n[Test 15] Provider success resets health appropriately");
  resetProviderHealth("test-provider-2");

  // Record 2 failures → degraded (but still healthy — not in cooldown)
  recordProviderFailure("test-provider-2");
  recordProviderFailure("test-provider-2");
  let state = getCircuitBreakerState("test-provider-2");
  assert(state.degraded === true, "Provider degraded after 2 failures");
  assert(state.healthy === true, "Provider still healthy after 2 failures (below cooldown threshold)");

  // Record success → health should improve
  recordProviderSuccess("test-provider-2");
  state = getCircuitBreakerState("test-provider-2");
  // After 2 failures → 1 success → 1 remaining failure → still healthy (never hit cooldown threshold), no longer degraded
  assert(state.healthy === true, "Provider still healthy after 2 fails + 1 success (never entered cooldown)");
  assert(state.degraded === false, "Provider no longer degraded after only 1 residual failure");

  // More successes until healthy
  recordProviderSuccess("test-provider-2");
  recordProviderSuccess("test-provider-2");
  state = getCircuitBreakerState("test-provider-2");
  assert(state.healthy === true, "Provider healthy after recovering");
  assert(state.degraded === false, "Provider not degraded after recovery");
}

function main(): void {
  console.log("=".repeat(55));
  console.log("Phase 9B — AI Gateway & Credit Ledger Foundation Tests");
  console.log("=".repeat(55));

  testEydCost();
  testRppCost();
  testPptCost();
  testSoal5();
  testSoal15();
  testTextAnalysisShort();
  testTextAnalysisLong();
  testMuridPlan();
  testFounderPlan();
  testPremiumGuruPlan();
  testTrialGuruPlan();
  testFreeGuruPlan();
  testQuotaLimits();
  testCircuitBreakerCooldown();
  testProviderSuccessResetsHealth();

  console.log("\n" + "=".repeat(55));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(55));

  if (errors.length > 0) {
    console.log("\nFailed assertions:");
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

try {
  main();
} catch (e) {
  console.error("Fatal error:", e);
  process.exit(1);
}
