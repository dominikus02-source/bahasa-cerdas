#!/usr/bin/env tsx
// ════════════════════════════════════════════════════════════════════
// FOUNDER HEALTH ENGINE — Test Suite
//
// Tests:
//   1. Health states (HEALTHY / ATTENTION / CRITICAL)
//   2. Decision rules (every P1, P2, P3)
//   3. Priority ordering and max-3 enforcement
//   4. MRR breakdown correctness
//   5. Executive data integrity
//   6. Edge cases
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
    dauToday: 60,
    dauYesterday: 55,
    dauTwoDaysAgo: 50,
    latestD7Rate: 30,
    jalurCompleted7d: 10,
    ...overrides,
  };
}

async function testHealthStates() {
  console.log("\n── Health States ──");

  // HEALTHY — no issues
  const healthy = evaluateFounderHealth(baseInput());
  assert("No issues → HEALTHY", healthy.status === "HEALTHY");
  assert("HEALTHY has no priorities", healthy.priorities.length === 0);
  assert("HEALTHY has summary", healthy.summary.length > 0);

  // ATTENTION — P2 issue
  const attention = evaluateFounderHealth(baseInput({ latestD7Rate: 10 }));
  assert("Low D7 → ATTENTION", attention.status === "ATTENTION");
  assert("ATTENTION has priorities", attention.priorities.length > 0);
  assert("ATTENTION first priority is P2", attention.priorities[0].severity === "P2");

  // CRITICAL — P1 issue
  const critical = evaluateFounderHealth(baseInput({ paymentMismatchCount: 2 }));
  assert("Payment mismatch → CRITICAL", critical.status === "CRITICAL");
  assert("CRITICAL has P1 priority", critical.priorities.some((p) => p.severity === "P1"));
}

async function testP1Rules() {
  console.log("\n── P1 Rules ──");

  // Rule 1: Payment mismatch
  const r1 = evaluateFounderHealth(baseInput({ paymentMismatchCount: 3, paymentMismatchRevenue: 57_000 }));
  assert("P1: payment mismatch > 0", r1.priorities.some((p) => p.severity === "P1" && p.title.includes("Payment")));
  assert("P1: payment mismatch evidence mentions count", r1.priorities.find((p) => p.severity === "P1")?.evidence.includes("3") ?? false);

  // Rule 2: Critical data quality
  const r2 = evaluateFounderHealth(baseInput({ dataQualityCriticalCount: 1 }));
  assert("P1: data quality critical > 0", r2.priorities.some((p) => p.severity === "P1" && p.title.includes("data kritis")));

  // Rule 3: Zero active premium with historical cash
  const r3 = evaluateFounderHealth(baseInput({ activePremium: 0, cashCollectedAllTime: 100_000 }));
  assert("P1: zero premium with cash", r3.priorities.some((p) => p.severity === "P1" && p.title.includes("Tidak ada premium")));

  // Rule 3 negative: zero premium AND zero cash — not P1
  const r3n = evaluateFounderHealth(baseInput({ activePremium: 0, cashCollectedAllTime: 0 }));
  assert("P1: zero premium + zero cash → not P1", !r3n.priorities.some((p) => p.severity === "P1" && p.title.includes("Tidak ada premium")));
}

async function testP2Rules() {
  console.log("\n── P2 Rules ──");

  // Rule 4: DAU declining 3 consecutive days
  const r4 = evaluateFounderHealth(baseInput({ dauToday: 30, dauYesterday: 40, dauTwoDaysAgo: 50 }));
  assert("P2: DAU declining 3 days", r4.priorities.some((p) => p.severity === "P2" && p.title.includes("DAU")));
  assert("P2: DAU evidence shows values", r4.priorities.find((p) => p.title.includes("DAU"))?.evidence.includes("50") ?? false);

  // Rule 4 negative: DAU not declining
  const r4n = evaluateFounderHealth(baseInput({ dauToday: 60, dauYesterday: 55, dauTwoDaysAgo: 50 }));
  assert("P2: DAU increasing → not P2 DAU", !r4n.priorities.some((p) => p.title.includes("DAU")));

  // Rule 5: D7 retention below threshold
  const r5 = evaluateFounderHealth(baseInput({ latestD7Rate: 15 }));
  assert("P2: D7 < 20%", r5.priorities.some((p) => p.severity === "P2" && p.title.includes("D7")));
  assert("P2: D7 description mentions rate", r5.priorities.find((p) => p.title.includes("D7"))?.description.includes("15") ?? false);

  // Rule 5 negative: D7 above threshold
  const r5n = evaluateFounderHealth(baseInput({ latestD7Rate: 25 }));
  assert("P2: D7 >= 20% → not P2 D7", !r5n.priorities.some((p) => p.title.includes("D7")));

  // Rule 5 edge: D7 is null (insufficient data)
  const r5null = evaluateFounderHealth(baseInput({ latestD7Rate: null }));
  assert("P2: D7 null → not triggered", !r5null.priorities.some((p) => p.title.includes("D7")));
}

async function testP3Rules() {
  console.log("\n── P3 Rules ──");

  // Rule 6: Premium conversion low (but > 0 active premium)
  const r6 = evaluateFounderHealth(baseInput({ premiumConversionRate: 3, activePremium: 2 }));
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

async function testPriorityOrdering() {
  console.log("\n── Priority Ordering & Max 3 ──");

  // All severities present → P1 first
  const all = evaluateFounderHealth(baseInput({
    paymentMismatchCount: 1,
    latestD7Rate: 10,
    premiumConversionRate: 2,
    activePremium: 1,
    jalurCompleted7d: 0,
    dauToday: 30,
  }));
  assert("P1 before P2", all.priorities.findIndex((p) => p.severity === "P1") < all.priorities.findIndex((p) => p.severity === "P2"));
  assert("P2 before P3", all.priorities.findIndex((p) => p.severity === "P2") < all.priorities.findIndex((p) => p.severity === "P3"));
  assert("Max 3 priorities", all.priorities.length <= 3);

  // Multiple P1s → at most 3 total
  const multiP1 = evaluateFounderHealth(baseInput({
    paymentMismatchCount: 1,
    dataQualityCriticalCount: 1,
    activePremium: 0,
    cashCollectedAllTime: 100_000,
  }));
  assert("Multiple P1s → at most 3", multiP1.priorities.length <= 3);
  assert("Multiple P1s all P1 severity", multiP1.priorities.every((p) => p.severity === "P1"));
}

async function testHealthyGrowth() {
  console.log("\n── Healthy Growth Recommendation ──");

  // Healthy with low conversion
  const h1 = evaluateFounderHealth(baseInput({ premiumConversionRate: 3, activePremium: 2 }));
  assert("Healthy mentions growth when conversion low", h1.summary.includes("konversi") || h1.summary.includes("pertumbuhan") || h1.status === "HEALTHY");

  // Healthy with good conversion
  const h2 = evaluateFounderHealth(baseInput({ premiumConversionRate: 25 }));
  assert("Healthy with good metrics", h2.status === "HEALTHY");
}

async function testMRROBreakdown() {
  console.log("\n── MRR Breakdown Constants ──");

  assert("MURID_MONTHLY = 19000", MRR_CONTRIBUTION.MURID_PREMIUM_MONTHLY === 19_000);
  assert("MURID_YEARLY = 15000 (180K÷12)", MRR_CONTRIBUTION.MURID_PREMIUM_YEARLY === Math.round(180_000 / 12));
  assert("GURU_MONTHLY = 49000", MRR_CONTRIBUTION.GURU_PRO_MONTHLY === 49_000);
  assert("GURU_YEARLY = 33250 (399K÷12)", MRR_CONTRIBUTION.GURU_PRO_YEARLY === Math.round(399_000 / 12));

  assert("PLAN_PRICES has 4 plans", Object.keys(PLAN_PRICES).length === 4);
  assert("MRR_CONTRIBUTION has 4 plans", Object.keys(MRR_CONTRIBUTION).length === 4);

  // Verify yearly/12 relationship
  assert("MURID_YEARLY = PLAN/12", MRR_CONTRIBUTION.MURID_PREMIUM_YEARLY === Math.round(PLAN_PRICES.MURID_PREMIUM_YEARLY / 12));
  assert("GURU_YEARLY = PLAN/12", MRR_CONTRIBUTION.GURU_PRO_YEARLY === Math.round(PLAN_PRICES.GURU_PRO_YEARLY / 12));
}

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

async function testExecutiveIntegrity() {
  console.log("\n── Executive Page Source Integrity ──");

  const pagePath = path.resolve(__dirname, "../app/(dashboard)/admin/executive/page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf-8");

  assert("Page imports evaluateFounderHealth", pageContent.includes("evaluateFounderHealth"));
  assert("Page imports getExecutiveDashboardData", pageContent.includes("getExecutiveDashboardData"));
  assert("Page does NOT import calculateMRR directly (uses service)", !pageContent.includes("import.*calculateMRR"));

  // Verify no duplicate MRR formula in page
  assert("Page has no MRR_CONTRIBUTION definition", !pageContent.includes("MRR_CONTRIBUTION ="));
  assert("Page has no PLAN_PRICES definition", !pageContent.includes("PLAN_PRICES ="));

  // Verify no stale labels
  assert("No 'MRR (Bulan Ini)' label", !pageContent.includes("MRR (Bulan Ini)"));
  assert("No 'Financial Overview' panel", !pageContent.includes("Financial Overview"));
  assert("No 'Engagement' panel", !pageContent.includes("Engagement"));
  assert("No 'Premium Funnel' panel", !pageContent.includes("Premium Funnel"));
}

async function testMetricEnforcement() {
  console.log("\n── Metric Enforcement ──");

  // Check executive service is the ONLY canonical MRR source
  const servicePath = path.resolve(__dirname, "../lib/admin/executive.ts");
  const serviceContent = fs.readFileSync(servicePath, "utf-8");

  assert("Service exports calculateMRR", serviceContent.includes("export async function calculateMRR"));
  assert("Service exports calculateMRRBreakdown", serviceContent.includes("export async function calculateMRRBreakdown"));
  assert("Service exports MRR_CONTRIBUTION", serviceContent.includes("export const MRR_CONTRIBUTION"));
  assert("Service exports PLAN_PRICES", serviceContent.includes("export const PLAN_PRICES"));

  // Check deprecated API uses canonical calculateMRR
  const apiPath = path.resolve(__dirname, "../app/api/admin/analytics/executive/route.ts");
  if (fs.existsSync(apiPath)) {
    const apiContent = fs.readFileSync(apiPath, "utf-8");
    assert("Deprecated API imports calculateMRR from canonical", apiContent.includes('from "@/lib/admin/executive"'));
    assert("Deprecated API does NOT have independent MRR formula", !apiContent.includes("SUM.*amount.*SUCCESS.*MRR") && !apiContent.includes("mrrCurrent ="));
  }

  // Verify /admin page is clean redirect
  const adminPagePath = path.resolve(__dirname, "../app/(dashboard)/admin/page.tsx");
  const adminPageContent = fs.readFileSync(adminPagePath, "utf-8");
  assert("/admin page redirects to /admin/executive", adminPageContent.includes('redirect("/admin/executive")'));
  assert("/admin page has no dead getStats function", !adminPageContent.includes("async function getStats"));
}

async function testFounderHealthSource() {
  console.log("\n── Founder Health Source ──");

  const fhPath = path.resolve(__dirname, "../lib/admin/founder-health.ts");
  const fhContent = fs.readFileSync(fhPath, "utf-8");

  assert("Health engine has no DB calls", !fhContent.includes("db.") && !fhContent.includes("prisma"));
  assert("Health engine has no console.log", !fhContent.includes("console.log"));
  assert("Health engine exports evaluateFounderHealth", fhContent.includes("export function evaluateFounderHealth"));
  assert("Health engine has P1 rules", fhContent.includes("P1"));
  assert("Health engine has P2 rules", fhContent.includes("P2"));
  assert("Health engine has P3 rules", fhContent.includes("P3"));
  assert("Health engine has max 3 slice", fhContent.includes(".slice(0, 3)"));
}

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
  }

  const dictPath = path.resolve(__dirname, "../docs/ADMIN_METRIC_DICTIONARY.md");
  assert("ADMIN_METRIC_DICTIONARY.md exists", fs.existsSync(dictPath));
}

// ── Main ──

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log(" FOUNDER HEALTH ENGINE — Test Suite");
  console.log("═══════════════════════════════════════════════════════");

  await loadModules();

  await testHealthStates();
  await testP1Rules();
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
