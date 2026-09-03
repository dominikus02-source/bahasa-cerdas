#!/usr/bin/env tsx
// ════════════════════════════════════════════════════════════════════
// FOUNDER HEALTH ENGINE — Test Suite
//
// Tests:
//   1. Health states (HEALTHY / ATTENTION / CRITICAL)
//   2. Decision rules (every P1, P2, P3)
//   3. False-positive removal (Rule 3 removed)
//   4. Sample-size protection
//   5. DAU decline hardening
//   6. Priority ordering and max-3 enforcement
//   7. MRR breakdown correctness
//   8. Executive data integrity
//   9. Edge cases
// ════════════════════════════════════════════════════════════════════

import * as fs from "fs";
import * as path from "path";

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

// ── Import after env loading ──

let evaluateFounderHealth: typeof import("../lib/admin/founder-health").evaluateFounderHealth;
let MRR_CONTRIBUTION: typeof import("../lib/admin/executive").MRR_CONTRIBUTION;
let calculateMRRBreakdown: typeof import("../lib/admin/executive").calculateMRRBreakdown;
let calculateMRR: typeof import("../lib/admin/executive").calculateMRR;
let PLAN_PRICES: typeof import("../lib/admin/executive").PLAN_PRICES;

type HealthInput = import("../lib/admin/founder-health").HealthInput;

async function loadModules() {
  const fh = await import("../lib/admin/founder-health");
  const ex = await import("../lib/admin/executive");
  evaluateFounderHealth = fh.evaluateFounderHealth;
  MRR_CONTRIBUTION = ex.MRR_CONTRIBUTION;
  calculateMRRBreakdown = ex.calculateMRRBreakdown;
  calculateMRR = ex.calculateMRR;
  PLAN_PRICES = ex.PLAN_PRICES;
}

/** Build a clean HealthInput with safe defaults — no rules triggered. */
function baseInput(overrides: Partial<HealthInput> = {}): HealthInput {
  return {
    paymentMismatchCount: 0,
    paymentMismatchRevenue: 0,
    dataQualityCriticalCount: 0,
    activePremium: 5,
    mrrValue: 100_000,
    cashCollectedAllTime: 500_000,
    premiumConversionRate: 10,
    eligibleUserCount: 50,
    dauToday: 60,
    dauYesterday: 55,
    dauTwoDaysAgo: 50,
    latestD7Rate: 30,
    latestD7CohortSize: 20,
    jalurCompleted7d: 10,
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════
// 1. Health States
// ════════════════════════════════════════════════════════════════════

async function testHealthStates() {
  console.log("\n── Health States ──");

  // HEALTHY — no issues
  const healthy = evaluateFounderHealth(baseInput());
  assert("No issues → HEALTHY", healthy.status === "HEALTHY");
  assert("HEALTHY has no priorities", healthy.priorities.length === 0);
  assert("HEALTHY has summary", healthy.summary.length > 0);

  // ATTENTION — P2 issue
  const attention = evaluateFounderHealth(baseInput({ latestD7Rate: 10, latestD7CohortSize: 20 }));
  assert("Low D7 → ATTENTION", attention.status === "ATTENTION");
  assert("ATTENTION has priorities", attention.priorities.length > 0);
  assert("ATTENTION first priority is P2", attention.priorities[0].severity === "P2");

  // CRITICAL — P1 issue
  const critical = evaluateFounderHealth(baseInput({ paymentMismatchCount: 2 }));
  assert("Payment mismatch → CRITICAL", critical.status === "CRITICAL");
  assert("CRITICAL has P1 priority", critical.priorities.some((p) => p.severity === "P1"));
}

// ════════════════════════════════════════════════════════════════════
// 2. P1 Rules
// ════════════════════════════════════════════════════════════════════

async function testP1Rules() {
  console.log("\n── P1 Rules ──");

  // Rule 1: Payment mismatch
  const r1 = evaluateFounderHealth(baseInput({ paymentMismatchCount: 3, paymentMismatchRevenue: 57_000 }));
  assert("P1: payment mismatch > 0", r1.priorities.some((p) => p.severity === "P1" && p.title.includes("Payment")));
  assert("P1: payment mismatch evidence mentions count", r1.priorities.find((p) => p.severity === "P1")?.evidence.includes("3") ?? false);

  // Rule 2: Critical data quality
  const r2 = evaluateFounderHealth(baseInput({ dataQualityCriticalCount: 1 }));
  assert("P1: data quality critical > 0", r2.priorities.some((p) => p.severity === "P1" && p.title.includes("data kritis")));
}

// ════════════════════════════════════════════════════════════════════
// 3. False-Positive Removal (Rule 3 removed)
// ════════════════════════════════════════════════════════════════════

async function testFalsePositiveRemoval() {
  console.log("\n── False-Positive Removal (Rule 3) ──");

  // Regression: expired historical premium does NOT trigger P1
  const expired1 = evaluateFounderHealth(baseInput({ activePremium: 0, cashCollectedAllTime: 1_000_000 }));
  assert("Expired premium + cash → NOT P1 (Rule 3 removed)",
    !expired1.priorities.some((p) => p.severity === "P1" && p.title.includes("Tidak ada premium")),
    `priorities: ${expired1.priorities.map(p => p.title).join(", ")}`);
  assert("Expired premium + cash → status is HEALTHY (no false alarm)",
    expired1.status === "HEALTHY");

  // Zero premium + zero cash → still not P1
  const expired2 = evaluateFounderHealth(baseInput({ activePremium: 0, cashCollectedAllTime: 0 }));
  assert("Zero premium + zero cash → not P1",
    !expired2.priorities.some((p) => p.severity === "P1" && p.title.includes("Tidak ada premium")));

  // Zero premium + historical cash → no priority at all
  const expired3 = evaluateFounderHealth(baseInput({ activePremium: 0, cashCollectedAllTime: 500_000 }));
  assert("Zero premium + historical cash → zero priorities",
    expired3.priorities.length === 0);

  // Current payment mismatch DOES trigger P1
  const mismatch = evaluateFounderHealth(baseInput({ activePremium: 0, paymentMismatchCount: 1, paymentMismatchRevenue: 19_000 }));
  assert("Payment mismatch triggers P1 (current integrity issue)",
    mismatch.priorities.some((p) => p.severity === "P1" && p.title.includes("Payment")));
}

// ════════════════════════════════════════════════════════════════════
// 4. Sample-Size Protection
// ════════════════════════════════════════════════════════════════════

async function testSampleSizeProtection() {
  console.log("\n── Sample-Size Protection ──");

  // D7 retention: insufficient cohort size → NOT triggered
  const smallCohort = evaluateFounderHealth(baseInput({ latestD7Rate: 5, latestD7CohortSize: 3 }));
  assert("D7 low + small cohort (3) → NOT triggered",
    !smallCohort.priorities.some((p) => p.title.includes("D7")),
    `cohort=3, rate=5%, priorities: ${smallCohort.priorities.map(p => p.title).join(", ")}`);

  // D7 retention: minimum cohort size → triggered
  const minCohort = evaluateFounderHealth(baseInput({ latestD7Rate: 5, latestD7CohortSize: 10 }));
  assert("D7 low + min cohort (10) → triggered",
    minCohort.priorities.some((p) => p.title.includes("D7")));

  // D7 retention: large cohort → triggered
  const largeCohort = evaluateFounderHealth(baseInput({ latestD7Rate: 15, latestD7CohortSize: 50 }));
  assert("D7 low + large cohort (50) → triggered",
    largeCohort.priorities.some((p) => p.title.includes("D7")));

  // D7 retention: null rate → NOT triggered
  const nullRate = evaluateFounderHealth(baseInput({ latestD7Rate: null, latestD7CohortSize: 50 }));
  assert("D7 null rate → not triggered",
    !nullRate.priorities.some((p) => p.title.includes("D7")));

  // Premium conversion: insufficient eligible → NOT triggered
  const smallEligible = evaluateFounderHealth(baseInput({ premiumConversionRate: 2, activePremium: 1, eligibleUserCount: 3 }));
  assert("Conversion low + small eligible (3) → NOT triggered",
    !smallEligible.priorities.some((p) => p.title.includes("Konversi")),
    `eligible=3, priorities: ${smallEligible.priorities.map(p => p.title).join(", ")}`);

  // Premium conversion: minimum eligible → triggered
  const minEligible = evaluateFounderHealth(baseInput({ premiumConversionRate: 2, activePremium: 1, eligibleUserCount: 5 }));
  assert("Conversion low + min eligible (5) → triggered",
    minEligible.priorities.some((p) => p.title.includes("Konversi")));

  // Premium conversion: zero eligible → NOT triggered (division by zero protection)
  const zeroEligible = evaluateFounderHealth(baseInput({ premiumConversionRate: 0, activePremium: 0, eligibleUserCount: 0 }));
  assert("Conversion zero eligible → not triggered",
    !zeroEligible.priorities.some((p) => p.title.includes("Konversi")));
}

// ════════════════════════════════════════════════════════════════════
// 5. DAU Decline Hardening
// ════════════════════════════════════════════════════════════════════

async function testDAUDeclineHardening() {
  console.log("\n── DAU Decline Hardening ──");

  // Tiny decline: 50 → 49 → 48 (2% total) → NOT triggered
  const tiny = evaluateFounderHealth(baseInput({ dauToday: 48, dauYesterday: 49, dauTwoDaysAgo: 50 }));
  assert("Tiny DAU decline (2%) → NOT triggered",
    !tiny.priorities.some((p) => p.title.includes("DAU")),
    `50→49→48, priorities: ${tiny.priorities.map(p => p.title).join(", ")}`);

  // Moderate decline: 100 → 80 → 60 (40%) → triggered
  const moderate = evaluateFounderHealth(baseInput({ dauToday: 60, dauYesterday: 80, dauTwoDaysAgo: 100 }));
  assert("Meaningful DAU decline (40%) → triggered",
    moderate.priorities.some((p) => p.title.includes("DAU")));

  // Below minimum absolute: 8 → 6 → 4 → NOT triggered (below DAU_MIN_ABSOLUTE=10)
  const belowMin = evaluateFounderHealth(baseInput({ dauToday: 4, dauYesterday: 6, dauTwoDaysAgo: 8 }));
  assert("DAU below minimum absolute (8) → NOT triggered",
    !belowMin.priorities.some((p) => p.title.includes("DAU")));

  // Just at minimum absolute with significant decline: 10 → 7 → 5 (50%) → triggered
  const atMinSignificant = evaluateFounderHealth(baseInput({ dauToday: 5, dauYesterday: 7, dauTwoDaysAgo: 10 }));
  assert("DAU at min absolute + 50% decline → triggered",
    atMinSignificant.priorities.some((p) => p.title.includes("DAU")));

  // DAU increasing → NOT triggered
  const increasing = evaluateFounderHealth(baseInput({ dauToday: 60, dauYesterday: 55, dauTwoDaysAgo: 50 }));
  assert("DAU increasing → NOT triggered",
    !increasing.priorities.some((p) => p.title.includes("DAU")));

  // DAU flat → NOT triggered
  const flat = evaluateFounderHealth(baseInput({ dauToday: 50, dauYesterday: 50, dauTwoDaysAgo: 50 }));
  assert("DAU flat → NOT triggered",
    !flat.priorities.some((p) => p.title.includes("DAU")));

  // Mixed direction: 50 → 60 → 55 → NOT triggered (not strictly declining)
  const mixed = evaluateFounderHealth(baseInput({ dauToday: 55, dauYesterday: 60, dauTwoDaysAgo: 50 }));
  assert("DAU mixed direction → NOT triggered",
    !mixed.priorities.some((p) => p.title.includes("DAU")));

  // Zero DAU today → NOT triggered (protects against edge case)
  const zeroToday = evaluateFounderHealth(baseInput({ dauToday: 0, dauYesterday: 50, dauTwoDaysAgo: 60 }));
  assert("DAU zero today → NOT triggered",
    !zeroToday.priorities.some((p) => p.title.includes("DAU")));
}

// ════════════════════════════════════════════════════════════════════
// 6. P2 Rules
// ════════════════════════════════════════════════════════════════════

async function testP2Rules() {
  console.log("\n── P2 Rules ──");

  // Rule 5: D7 retention below threshold
  const r5 = evaluateFounderHealth(baseInput({ latestD7Rate: 15, latestD7CohortSize: 20 }));
  assert("P2: D7 < 20%", r5.priorities.some((p) => p.severity === "P2" && p.title.includes("D7")));
  assert("P2: D7 description mentions rate", r5.priorities.find((p) => p.title.includes("D7"))?.description.includes("15") ?? false);

  // Rule 5 negative: D7 above threshold
  const r5n = evaluateFounderHealth(baseInput({ latestD7Rate: 25 }));
  assert("P2: D7 >= 20% → not P2 D7", !r5n.priorities.some((p) => p.title.includes("D7")));

  // Rule 5 edge: D7 is null (insufficient data)
  const r5null = evaluateFounderHealth(baseInput({ latestD7Rate: null }));
  assert("P2: D7 null → not triggered", !r5null.priorities.some((p) => p.title.includes("D7")));
}

// ════════════════════════════════════════════════════════════════════
// 7. P3 Rules
// ════════════════════════════════════════════════════════════════════

async function testP3Rules() {
  console.log("\n── P3 Rules ──");

  // Rule 6: Premium conversion low (but > 0 active premium)
  const r6 = evaluateFounderHealth(baseInput({ premiumConversionRate: 3, activePremium: 2, eligibleUserCount: 10 }));
  assert("P3: conversion < 5%", r6.priorities.some((p) => p.severity === "P3" && p.title.includes("Konversi")));

  // Rule 6 negative: conversion above threshold
  const r6n = evaluateFounderHealth(baseInput({ premiumConversionRate: 10 }));
  assert("P3: conversion >= 5% → not P3", !r6n.priorities.some((p) => p.title.includes("Konversi")));

  // Rule 6 edge: zero active premium (should not trigger P3 conversion)
  const r6edge = evaluateFounderHealth(baseInput({ premiumConversionRate: 0, activePremium: 0 }));
  assert("P3: zero premium → no conversion P3", !r6edge.priorities.some((p) => p.title.includes("Konversi")));

  // Rule 7: No learning completions but DAU > 0
  const r7 = evaluateFounderHealth(baseInput({ jalurCompleted7d: 0, dauToday: 30 }));
  assert("P3: zero completions with DAU", r7.priorities.some((p) => p.severity === "P3" && p.title.includes("completion")));

  // Rule 7 negative: completions exist
  const r7n = evaluateFounderHealth(baseInput({ jalurCompleted7d: 5 }));
  assert("P3: completions > 0 → not P3", !r7n.priorities.some((p) => p.title.includes("completion")));
}

// ════════════════════════════════════════════════════════════════════
// 8. Priority Ordering & Max 3
// ════════════════════════════════════════════════════════════════════

async function testPriorityOrdering() {
  console.log("\n── Priority Ordering & Max 3 ──");

  // All severities present → P1 first
  const all = evaluateFounderHealth(baseInput({
    paymentMismatchCount: 1,
    latestD7Rate: 10,
    latestD7CohortSize: 20,
    premiumConversionRate: 2,
    activePremium: 1,
    eligibleUserCount: 10,
    jalurCompleted7d: 0,
    dauToday: 60,
  }));
  assert("P1 before P2", all.priorities.findIndex((p) => p.severity === "P1") < all.priorities.findIndex((p) => p.severity === "P2"));
  assert("P2 before P3", all.priorities.findIndex((p) => p.severity === "P2") < all.priorities.findIndex((p) => p.severity === "P3"));
  assert("Max 3 priorities", all.priorities.length <= 3);

  // Multiple P1s → at most 3 total
  const multiP1 = evaluateFounderHealth(baseInput({
    paymentMismatchCount: 1,
    dataQualityCriticalCount: 1,
  }));
  assert("Multiple P1s → at most 3", multiP1.priorities.length <= 3);
  assert("Multiple P1s all P1 severity", multiP1.priorities.every((p) => p.severity === "P1"));
}

// ════════════════════════════════════════════════════════════════════
// 9. Healthy Growth
// ════════════════════════════════════════════════════════════════════

async function testHealthyGrowth() {
  console.log("\n── Healthy Growth Recommendation ──");

  const h1 = evaluateFounderHealth(baseInput());
  assert("Healthy with good metrics", h1.status === "HEALTHY");
  assert("Healthy has summary", h1.summary.length > 0);
  assert("Healthy has no priorities", h1.priorities.length === 0);
}

// ════════════════════════════════════════════════════════════════════
// 10. MRR Breakdown Constants
// ════════════════════════════════════════════════════════════════════

async function testMRROBreakdown() {
  console.log("\n── MRR Breakdown Constants ──");

  assert("MURID_MONTHLY = 19000", MRR_CONTRIBUTION.MURID_PREMIUM_MONTHLY === 19_000);
  assert("MURID_YEARLY = 15000 (180K÷12)", MRR_CONTRIBUTION.MURID_PREMIUM_YEARLY === Math.round(180_000 / 12));
  assert("GURU_MONTHLY = 49000", MRR_CONTRIBUTION.GURU_PRO_MONTHLY === 49_000);
  assert("GURU_YEARLY = 33250 (399K÷12)", MRR_CONTRIBUTION.GURU_PRO_YEARLY === Math.round(399_000 / 12));

  assert("PLAN_PRICES has 4 plans", Object.keys(PLAN_PRICES).length === 4);
  assert("MRR_CONTRIBUTION has 4 plans", Object.keys(MRR_CONTRIBUTION).length === 4);

  assert("MURID_YEARLY = PLAN/12", MRR_CONTRIBUTION.MURID_PREMIUM_YEARLY === Math.round(PLAN_PRICES.MURID_PREMIUM_YEARLY / 12));
  assert("GURU_YEARLY = PLAN/12", MRR_CONTRIBUTION.GURU_PRO_YEARLY === Math.round(PLAN_PRICES.GURU_PRO_YEARLY / 12));
}

// ════════════════════════════════════════════════════════════════════
// 11. MRR Breakdown Integrity (DB)
// ════════════════════════════════════════════════════════════════════

async function testMRROBreakdownIntegrity() {
  console.log("\n── MRR Breakdown Integrity (DB) ──");

  const [total, breakdown] = await Promise.all([calculateMRR(), calculateMRRBreakdown()]);

  assert("Breakdown total matches calculateMRR()", breakdown.total === total, `breakdown=${breakdown.total} mrr=${total}`);
  assert("Breakdown sum = muridM + muridY + guruM + guruY",
    breakdown.muridMonthly + breakdown.muridYearly + breakdown.guruMonthly + breakdown.guruYearly === breakdown.total,
    `sum=${breakdown.muridMonthly + breakdown.muridYearly + breakdown.guruMonthly + breakdown.guruYearly} total=${breakdown.total}`);
  assert("All breakdown components >= 0",
    breakdown.muridMonthly >= 0 && breakdown.muridYearly >= 0 && breakdown.guruMonthly >= 0 && breakdown.guruYearly >= 0);

  console.log(`  ℹ️  MRR total: Rp${total.toLocaleString("id-ID")}`);
  console.log(`  ℹ️  Murid M: Rp${breakdown.muridMonthly.toLocaleString("id-ID")} | Murid Y: Rp${breakdown.muridYearly.toLocaleString("id-ID")}`);
  console.log(`  ℹ️  Guru M: Rp${breakdown.guruMonthly.toLocaleString("id-ID")} | Guru Y: Rp${breakdown.guruYearly.toLocaleString("id-ID")}`);
}

// ════════════════════════════════════════════════════════════════════
// 12. Executive Page Source Integrity
// ════════════════════════════════════════════════════════════════════

async function testExecutiveIntegrity() {
  console.log("\n── Executive Page Source Integrity ──");

  const pagePath = path.resolve(__dirname, "../app/(dashboard)/admin/executive/page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");

  assert("Page imports evaluateFounderHealth", pageContent.includes("evaluateFounderHealth"));
  assert("Page imports getExecutiveDashboardData", pageContent.includes("getExecutiveDashboardData"));
  assert("Page does NOT import calculateMRR directly (uses service)", !pageContent.includes("import.*calculateMRR"));

  assert("Page has no MRR_CONTRIBUTION definition", !pageContent.includes("MRR_CONTRIBUTION ="));
  assert("Page has no PLAN_PRICES definition", !pageContent.includes("PLAN_PRICES ="));

  assert("No 'MRR (Bulan Ini)' label", !pageContent.includes("MRR (Bulan Ini)"));
  assert("No 'Financial Overview' panel", !pageContent.includes("Financial Overview"));
  assert("No old 'Engagement Overview' panel", !pageContent.includes("Engagement Overview"));
  assert("No 'Premium Funnel' panel", !pageContent.includes("Premium Funnel"));

  // Verify new sample-size fields are passed
  assert("Page passes eligibleUserCount", pageContent.includes("eligibleUserCount:"));
  assert("Page passes latestD7CohortSize", pageContent.includes("latestD7CohortSize:"));
}

// ════════════════════════════════════════════════════════════════════
// 13. Metric Enforcement
// ════════════════════════════════════════════════════════════════════

async function testMetricEnforcement() {
  console.log("\n── Metric Enforcement ──");

  const servicePath = path.resolve(__dirname, "../lib/admin/executive.ts");
  const serviceContent = fs.readFileSync(servicePath, "utf-8");

  assert("Service exports calculateMRR", serviceContent.includes("export async function calculateMRR"));
  assert("Service exports calculateMRRBreakdown", serviceContent.includes("export async function calculateMRRBreakdown"));
  assert("Service exports MRR_CONTRIBUTION", serviceContent.includes("export const MRR_CONTRIBUTION"));
  assert("Service exports PLAN_PRICES", serviceContent.includes("export const PLAN_PRICES"));

  const apiPath = path.resolve(__dirname, "../app/api/admin/analytics/executive/route.ts");
  if (fs.existsSync(apiPath)) {
    const apiContent = fs.readFileSync(apiPath, "utf-8");
    assert("Deprecated API imports calculateMRR from canonical", apiContent.includes('from "@/lib/admin/executive"'));
    assert("Deprecated API does NOT have independent MRR formula", !apiContent.includes("SUM.*amount.*SUCCESS.*MRR") && !apiContent.includes("mrrCurrent ="));
  }

  const adminPagePath = path.resolve(__dirname, "../app/(dashboard)/admin/page.tsx");
  const adminPageContent = fs.readFileSync(adminPagePath, "utf-8");
  assert("/admin page redirects to /admin/executive", adminPageContent.includes('redirect("/admin/executive")'));
  assert("/admin page has no dead getStats function", !adminPageContent.includes("async function getStats"));
}

// ════════════════════════════════════════════════════════════════════
// 14. Founder Health Source
// ════════════════════════════════════════════════════════════════════

async function testFounderHealthSource() {
  console.log("\n── Founder Health Source ──");

  const fhPath = path.resolve(__dirname, "../lib/admin/founder-health.ts");
  const fhContent = fs.readFileSync(fhPath, "utf-8");

  assert("Health engine has no DB calls", !fhContent.includes("db.") && !fhContent.includes("prisma"));
  assert("Health engine has no console.log", !fhContent.includes("console.log"));
  assert("Health engine exports evaluateFounderHealth", fhContent.includes("export function evaluateFounderHealth"));
  assert("Health engine has P1 rules", fhContent.includes('"P1"'));
  assert("Health engine has P2 rules", fhContent.includes('"P2"'));
  assert("Health engine has P3 rules", fhContent.includes('"P3"'));
  assert("Health engine has max 3 slice", fhContent.includes(".slice(0, 3)"));

  // Verify sample-size constants exist
  assert("Has RETENTION_MIN_COHORT constant", fhContent.includes("RETENTION_MIN_COHORT"));
  assert("Has CONVERSION_MIN_ELIGIBLE constant", fhContent.includes("CONVERSION_MIN_ELIGIBLE"));
  assert("Has DAU_MIN_ABSOLUTE constant", fhContent.includes("DAU_MIN_ABSOLUTE"));
  assert("Has DAU_MIN_RELATIVE_DECLINE_PCT constant", fhContent.includes("DAU_MIN_RELATIVE_DECLINE_PCT"));

  // Verify Rule 3 is removed (no more activePremium=0 + cashAllTime)
  assert("Rule 3 (activePremium=0 + cash) removed — no P1 for expired premium",
    !fhContent.includes("activePremium === 0 && input.cashCollectedAllTime > 0"));
}

// ════════════════════════════════════════════════════════════════════
// 15. Documentation
// ════════════════════════════════════════════════════════════════════

async function testDecisionDocExists() {
  console.log("\n── Documentation ──");

  const docPath = path.resolve(__dirname, "../docs/FOUNDER_DECISION_LAYER.md");
  assert("FOUNDER_DECISION_LAYER.md exists", fs.existsSync(docPath));

  if (fs.existsSync(docPath)) {
    const content = fs.readFileSync(docPath, "utf-8");
    assert("Doc has health model", content.includes("Health Model"));
    assert("Doc has decision rules", content.includes("Decision Rules"));
    assert("Doc has MRR breakdown", content.includes("MRR Breakdown"));
    assert("Doc has thresholds", content.includes("Threshold"));
    assert("Doc has sample-size requirements", content.includes("Sample Size") || content.includes("sample size") || content.includes("Minimum Cohort"));
  }

  const dictPath = path.resolve(__dirname, "../docs/ADMIN_METRIC_DICTIONARY.md");
  assert("ADMIN_METRIC_DICTIONARY.md exists", fs.existsSync(dictPath));
}

// ════════════════════════════════════════════════════════════════════
// Main
// ════════════════════════════════════════════════════════════════════

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log(" FOUNDER HEALTH ENGINE — Test Suite");
  console.log("═══════════════════════════════════════════════════════");

  await loadModules();

  await testHealthStates();
  await testP1Rules();
  await testFalsePositiveRemoval();
  await testSampleSizeProtection();
  await testDAUDeclineHardening();
  await testP2Rules();
  await testP3Rules();
  await testPriorityOrdering();
  await testHealthyGrowth();
  await testMRROBreakdown();
  await testMRROBreakdownIntegrity();
  await testExecutiveIntegrity();
  await testMetricEnforcement();
  await testFounderHealthSource();
  await testDecisionDocExists();

  console.log("\n═══════════════════════════════════════════════════════");
  console.log(` RESULTS: ${passed}/${passed + failed} passed, ${failed} failed`);
  console.log("═══════════════════════════════════════════════════════");

  if (failed > 0) process.exit(1);
  process.exit(0);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
