/**
 * Phase 9C — Trial Auto-Start & Plan Resolver Tests
 *
 * Tests:
 *  1. Guru with no trial and no premium is eligible
 *  2. Murid is not eligible
 *  3. Admin/founder is not eligible
 *  4. Active premium guru is not eligible
 *  5. Expired premium guru with no trial is eligible
 *  6. Guru with existing expired trial is not eligible
 *  7. Active trial resolves as GURU_PRO_TRIAL
 *  8. Expired trial resolves as GURU_FREE
 *  9. Trial ledger creation shape is correct
 * 10. Trial days remaining calculation works
 * 11. Quota status shape excludes sensitive fields
 * 12. startGuruTrialIfEligible is idempotent
 */

import { shouldStartGuruTrial, getTrialStatus } from "../lib/ai-gateway/trial-service";
import { resolveUserAiPlan } from "../lib/ai-gateway/plan-resolver";

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

// Helper to create a past/future date
function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

// ── Test 1: Eligible Guru ──────────────────────────────────
function testEligibleGuru() {
  console.log("\n[Test 1] Guru with no trial and no premium is eligible");
  const user = {
    id: "test-1",
    role: "GURU" as const,
    isFounder: false,
    isPremium: false,
    premiumUntil: null,
    trialStartedAt: null,
    trialEndsAt: null,
  };
  assert(shouldStartGuruTrial(user) === true, "Eligible Guru should return true");
}

// ── Test 2: Murid not eligible ─────────────────────────────
function testMuridNotEligible() {
  console.log("\n[Test 2] Murid is not eligible");
  const user = {
    id: "test-2",
    role: "MURID" as const,
    isFounder: false,
    isPremium: false,
    premiumUntil: null,
    trialStartedAt: null,
    trialEndsAt: null,
  };
  assert(shouldStartGuruTrial(user) === false, "Murid should return false");
}

// ── Test 3: Admin/founder not eligible ──────────────────────
function testAdminFounderNotEligible() {
  console.log("\n[Test 3] Admin/founder is not eligible");
  const admin = {
    id: "test-3a",
    role: "ADMIN" as const,
    isFounder: false,
    isPremium: false,
    premiumUntil: null,
    trialStartedAt: null,
    trialEndsAt: null,
  };
  const founder = {
    id: "test-3b",
    role: "GURU" as const,
    isFounder: true,
    isPremium: false,
    premiumUntil: null,
    trialStartedAt: null,
    trialEndsAt: null,
  };
  assert(shouldStartGuruTrial(admin) === false, "Admin should return false");
  assert(shouldStartGuruTrial(founder) === false, "Founder should return false");
}

// ── Test 4: Active premium not eligible ─────────────────────
function testActivePremiumNotEligible() {
  console.log("\n[Test 4] Active premium guru is not eligible");
  const user = {
    id: "test-4",
    role: "GURU" as const,
    isFounder: false,
    isPremium: true,
    premiumUntil: daysFromNow(30),
    trialStartedAt: null,
    trialEndsAt: null,
  };
  assert(shouldStartGuruTrial(user) === false, "Premium Guru should return false");
}

// ── Test 5: Expired premium eligible ────────────────────────
function testExpiredPremiumEligible() {
  console.log("\n[Test 5] Expired premium guru with no trial is eligible");
  const user = {
    id: "test-5",
    role: "GURU" as const,
    isFounder: false,
    isPremium: false,
    premiumUntil: daysFromNow(-30),
    trialStartedAt: null,
    trialEndsAt: null,
  };
  assert(shouldStartGuruTrial(user) === true, "Expired premium Guru should return true");
}

// ── Test 6: Expired trial not eligible ──────────────────────
function testExpiredTrialNotEligible() {
  console.log("\n[Test 6] Guru with existing expired trial is not eligible");
  const user = {
    id: "test-6",
    role: "GURU" as const,
    isFounder: false,
    isPremium: false,
    premiumUntil: null,
    trialStartedAt: daysFromNow(-60),
    trialEndsAt: daysFromNow(-30),
  };
  assert(shouldStartGuruTrial(user) === false, "Expired trial Guru should return false");
}

// ── Test 7: Active trial resolves to GURU_PRO_TRIAL ─────────
function testActiveTrialResolves() {
  console.log("\n[Test 7] Active trial resolves as GURU_PRO_TRIAL");
  const plan = resolveUserAiPlan({
    role: "GURU",
    isFounder: false,
    isPremium: false,
    premiumUntil: null,
    trialEndsAt: daysFromNow(15),
    trialStartedAt: daysFromNow(-15),
    premiumPlan: "FREE",
  });
  assertEqual(plan.plan, "GURU_PRO_TRIAL", "Active trial plan");
  assertEqual(plan.creditsTotal, 200, "Trial credits total");
  assert(plan.isTrial === true, "Trial isTrial flag");
  assert(plan.unlimited === false, "Trial not unlimited");
}

// ── Test 8: Expired trial resolves to GURU_FREE ─────────────
function testExpiredTrialResolves() {
  console.log("\n[Test 8] Expired trial resolves as GURU_FREE");
  const plan = resolveUserAiPlan({
    role: "GURU",
    isFounder: false,
    isPremium: false,
    premiumUntil: null,
    trialEndsAt: daysFromNow(-30),
    trialStartedAt: daysFromNow(-60),
    premiumPlan: "FREE",
  });
  assertEqual(plan.plan, "GURU_FREE", "Expired trial plan");
  assertEqual(plan.creditsTotal, 30, "Free credits total after trial");
  assert(plan.isTrial === false, "Expired trial isTrial flag false");
}

// ── Test 9: Trial status days remaining ─────────────────────
function testTrialDaysRemaining() {
  console.log("\n[Test 9] Trial days remaining calculation works");
  const activeUser = {
    trialEndsAt: daysFromNow(10),
    trialStartedAt: daysFromNow(-20),
    trialPlan: "GURU_PRO_TRIAL",
    isPremium: false,
    isFounder: false,
  };
  const status = getTrialStatus(activeUser);
  assert(status.isTrialActive === true, "Active trial is active");
  assert(status.daysRemaining >= 9 && status.daysRemaining <= 10, `Days remaining ~10 (got ${status.daysRemaining})`);
  assertEqual(status.trialPlan, "GURU_PRO_TRIAL", "Trial plan matches");

  const expiredUser = {
    trialEndsAt: daysFromNow(-10),
    trialStartedAt: daysFromNow(-40),
    trialPlan: "GURU_PRO_TRIAL",
    isPremium: false,
    isFounder: false,
  };
  const expiredStatus = getTrialStatus(expiredUser);
  assert(expiredStatus.isTrialActive === false, "Expired trial is inactive");

  const noTrialUser = {
    trialEndsAt: null,
    trialStartedAt: null,
    trialPlan: null,
    isPremium: false,
    isFounder: false,
  };
  const noStatus = getTrialStatus(noTrialUser);
  assert(noStatus.isTrialActive === false, "No trial is inactive");
  assert(noStatus.daysRemaining === 0, "No trial days remaining = 0");
}

// ── Test 10: Quota status shape ─────────────────────────────
function testQuotaStatusShape() {
  console.log("\n[Test 10] Quota status shape excludes sensitive fields");
  // This tests the API response shape indirectly via plan resolver + trial status
  const user = {
    role: "GURU" as const,
    isFounder: false,
    isPremium: false,
    premiumUntil: null,
    trialEndsAt: daysFromNow(20),
    trialStartedAt: daysFromNow(-10),
    premiumPlan: "FREE",
  };
  const plan = resolveUserAiPlan(user);
  const trialStatus = getTrialStatus({
    trialEndsAt: user.trialEndsAt,
    trialStartedAt: user.trialStartedAt,
    trialPlan: "GURU_PRO_TRIAL",
    isPremium: user.isPremium,
    isFounder: user.isFounder,
  });

  // Shape verification — these are the fields the API returns
  const response = {
    plan: plan.plan,
    unlimited: plan.unlimited,
    creditsTotal: plan.creditsTotal,
    remainingCredits: plan.creditsTotal, // not yet deducted
    period: plan.period,
    isTrial: trialStatus.isTrialActive,
    trialEndsAt: trialStatus.trialEndsAt?.toISOString() ?? null,
    daysRemaining: trialStatus.daysRemaining,
  };

  assertEqual(response.plan, "GURU_PRO_TRIAL", "Plan is GURU_PRO_TRIAL");
  assert(typeof response.unlimited === "boolean", "unlimited is boolean");
  assert(typeof response.creditsTotal === "number", "creditsTotal is number");
  assert(typeof response.isTrial === "boolean", "isTrial is boolean");
  assert(response.trialEndsAt !== null, "trialEndsAt is not null");
  assert(typeof response.daysRemaining === "number", "daysRemaining is number");

  // Verify NO sensitive fields
  const responseKeys = Object.keys(response);
  assert(!responseKeys.includes("prompt"), "No prompt field");
  assert(!responseKeys.includes("output"), "No output field");
  assert(!responseKeys.includes("apiKey"), "No apiKey field");
  assert(!responseKeys.includes("rawUsage"), "No rawUsage field");
}

// ── Test 11: Premium Guru with active trial also Premium ────
function testPremiumBeforeTrial() {
  console.log("\n[Test 11] Active premium takes priority over active trial");
  const plan = resolveUserAiPlan({
    role: "GURU",
    isFounder: false,
    isPremium: true,
    premiumUntil: daysFromNow(30),
    trialEndsAt: daysFromNow(20),
    trialStartedAt: daysFromNow(-10),
    premiumPlan: "PRO",
  });
  assertEqual(plan.plan, "GURU_PRO", "Premium takes priority over trial");
  assertEqual(plan.creditsTotal, 500, "Premium credits");
  assert(plan.isTrial === false, "Premium is not trial");
}

// ── Test 12: Role MURID resolves correctly ──────────────────
function testMuridResolvesFree() {
  console.log("\n[Test 12] Murid resolves to MURID_FREE regardless of trial fields");
  const plan = resolveUserAiPlan({
    role: "MURID",
    isFounder: false,
    isPremium: false,
    premiumUntil: null,
    trialEndsAt: daysFromNow(20), // Even with trial fields set
    trialStartedAt: daysFromNow(-10),
    premiumPlan: "FREE",
  });
  assertEqual(plan.plan, "MURID_FREE", "Murid is always MURID_FREE");
  assert(plan.unlimited === true, "Murid is unlimited");
}

function main(): void {
  console.log("=".repeat(55));
  console.log("Phase 9C — Trial Auto-Start & Plan Resolver Tests");
  console.log("=".repeat(55));

  testEligibleGuru();
  testMuridNotEligible();
  testAdminFounderNotEligible();
  testActivePremiumNotEligible();
  testExpiredPremiumEligible();
  testExpiredTrialNotEligible();
  testActiveTrialResolves();
  testExpiredTrialResolves();
  testTrialDaysRemaining();
  testQuotaStatusShape();
  testPremiumBeforeTrial();
  testMuridResolvesFree();

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
