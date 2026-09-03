#!/usr/bin/env npx tsx
// ════════════════════════════════════════════════════════════════════
// TEST: Investor Growth Signal Engine
//
// Tests deriveInvestorGrowth() with mock executive data.
// Verifies all fields are derived correctly from canonical sources.
// No DB required — pure function tests.
// ════════════════════════════════════════════════════════════════════

import { deriveInvestorGrowth } from "../lib/admin/investor-growth";
import type { ExecutiveDashboardData } from "../lib/admin/executive";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(`${label}: ${detail || "assertion failed"}`);
    console.error(`  ❌ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function assertEqual(label: string, actual: unknown, expected: unknown) {
  assert(label, actual === expected, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

function assertNotNull(label: string, value: unknown) {
  assert(label, value !== null && value !== undefined, `expected non-null, got ${value}`);
}

function assertNull(label: string, value: unknown) {
  assert(label, value === null || value === undefined, `expected null, got ${JSON.stringify(value)}`);
}

// ── Mock data factory ─────────────────────────────────────────────

function mockData(overrides: Partial<ExecutiveDashboardData> = {}): ExecutiveDashboardData {
  const defaults: ExecutiveDashboardData = {
    timestamp: "2026-09-03T10:00:00.000Z",
    users: { total: 100, murid: 80, guru: 20 },
    active: {
      dau: { value: 15, trend: 10 },
      wau: { value: 40, trend: 5 },
      mau: { value: 70, trend: -3 },
    },
    dauConsecutive: { today: 15, yesterday: 12, twoDaysAgo: 18 },
    growth: {
      new7d: { value: 5, trend: 20 },
      new30d: { value: 15, trend: -10 },
    },
    premium: {
      active: { value: 3, trend: 50 },
      murid: 1,
      guru: 2,
      conversionRate: 10,
      trialActive: 5,
    },
    revenue: {
      mrr: { value: 81250, trend: null, comparisonAvailable: false },
      mrrBreakdown: {
        muridMonthly: 19000,
        muridYearly: 15000,
        guruMonthly: 14000,
        guruYearly: 33250,
      },
      cashCollectedMonth: { value: 120000, trend: 25 },
      cashCollected30d: { value: 150000, trend: 15 },
      cashCollectedAllTime: 500000,
      transactionsSuccess30d: 8,
      transactionsPending: 1,
    },
    learning: {
      jalurCompleted7d: { value: 25, trend: -5 },
      ukbiSessions7d: 12,
    },
    content: { karya7d: { value: 8, trend: 30 } },
    ai: { generations7d: 45 },
    retention: {
      cohorts: [
        {
          label: "2026-08-20",
          registered: 12,
          active7d: 4,
          active30d: null,
          d7Rate: 33,
          d30Rate: null,
          hasEnoughData: true,
        },
        {
          label: "2026-08-10",
          registered: 8,
          active7d: 2,
          active30d: 1,
          d7Rate: 25,
          d30Rate: 13,
          hasEnoughData: true,
        },
      ],
    },
    paymentHealth: {
      summary: { totalAffected: 0, totalRevenueAtRisk: 0, affectedByRole: { murid: 0, guru: 0 } },
      affectedUsers: [],
    },
  };
  return { ...defaults, ...overrides } as ExecutiveDashboardData;
}

// ════════════════════════════════════════════════════════════════════
// TEST GROUPS
// ════════════════════════════════════════════════════════════════════

console.log("═══ Investor Growth Signal Engine Tests ═══\n");

// ── Group 1: User Growth ──────────────────────────────────────────
console.log("Group 1: User Growth");
{
  const data = mockData();
  const g = deriveInvestorGrowth(data);

  assertEqual("totalUsers matches", g.userGrowth.totalUsers, 100);
  assertNotNull("newUsers7d.current", g.userGrowth.newUsers7d.current);
  assertNotNull("newUsers30d.current", g.userGrowth.newUsers30d.current);

  // Trend direction matches input
  assertEqual("newUsers7d direction UP", g.userGrowth.newUsers7d.direction, "UP");
  assertEqual("newUsers30d direction DOWN", g.userGrowth.newUsers30d.direction, "DOWN");
  assert("newUsers7d delta positive", (g.userGrowth.newUsers7d.delta ?? 0) > 0);
  assert("newUsers30d delta negative", (g.userGrowth.newUsers30d.delta ?? 0) < 0);
}

// ── Group 2: Engagement ───────────────────────────────────────────
console.log("Group 2: Engagement");
{
  const data = mockData();
  const g = deriveInvestorGrowth(data);

  assertEqual("DAU matches", g.engagement.dau.current, 15);
  assertEqual("WAU matches", g.engagement.wau.current, 40);
  assertEqual("MAU matches", g.engagement.mau.current, 70);

  // DAU/MAU ratio
  const expectedRatio = Math.round((15 / 70) * 100);
  assertEqual("DAU/MAU ratio", g.engagement.dauMauRatio, expectedRatio);

  // Trend directions
  assertEqual("DAU direction UP", g.engagement.dau.direction, "UP");
  assertEqual("WAU direction UP", g.engagement.wau.direction, "UP");
  assertEqual("MAU direction DOWN", g.engagement.mau.direction, "DOWN");
}

console.log("Group 2b: DAU/MAU with zero MAU");
{
  const data = mockData({ active: { dau: { value: 0, trend: 0 }, wau: { value: 0, trend: 0 }, mau: { value: 0, trend: 0 } } });
  const g = deriveInvestorGrowth(data);
  assertNull("DAU/MAU null when MAU=0", g.engagement.dauMauRatio);
}

// ── Group 3: Retention ────────────────────────────────────────────
console.log("Group 3: Retention");
{
  const data = mockData();
  const g = deriveInvestorGrowth(data);

  assertNotNull("d7Rate", g.retention.d7Rate);
  assertNotNull("d30Rate", g.retention.d30Rate);
  assertNotNull("d7CohortSize", g.retention.d7CohortSize);
  assertNotNull("d30CohortSize", g.retention.d30CohortSize);
}

console.log("Group 3b: Retention with no cohorts");
{
  const data = mockData({ retention: { cohorts: [] } });
  const g = deriveInvestorGrowth(data);

  assertNull("d7Rate null", g.retention.d7Rate);
  assertNull("d30Rate null", g.retention.d30Rate);
  assertNull("d7CohortSize null", g.retention.d7CohortSize);
}

console.log("Group 3c: Retention with only D7 data");
{
  const data = mockData({
    retention: {
      cohorts: [
        { label: "2026-08-25", registered: 10, active7d: 3, active30d: null, d7Rate: 30, d30Rate: null, hasEnoughData: true },
      ],
    },
  });
  const g = deriveInvestorGrowth(data);

  assertEqual("d7Rate", g.retention.d7Rate, 30);
  assertNull("d30Rate null", g.retention.d30Rate);
}

// ── Group 4: Monetization ─────────────────────────────────────────
console.log("Group 4: Monetization");
{
  const data = mockData();
  const g = deriveInvestorGrowth(data);

  assertEqual("activePremium", g.monetization.activePremium, 3);
  assertEqual("muridPremium", g.monetization.muridPremium, 1);
  assertEqual("guruPremium", g.monetization.guruPremium, 2);
  assertEqual("mrr", g.monetization.mrr, 81250);
  assertEqual("cashCollected30d current", g.monetization.cashCollected30d.current, 150000);
  assertEqual("cashCollectedAllTime", g.monetization.cashCollectedAllTime, 500000);
  assertEqual("premiumConversion", g.monetization.premiumConversion, 10);

  // Breakdown
  assertEqual("breakdown.muridMonthly", g.monetization.mrrBreakdown.muridMonthly, 19000);
  assertEqual("breakdown.muridYearly", g.monetization.mrrBreakdown.muridYearly, 15000);
  assertEqual("breakdown.guruMonthly", g.monetization.mrrBreakdown.guruMonthly, 14000);
  assertEqual("breakdown.guruYearly", g.monetization.mrrBreakdown.guruYearly, 33250);

  // Breakdown total = MRR total
  const breakdownTotal = g.monetization.mrrBreakdown.muridMonthly + g.monetization.mrrBreakdown.muridYearly + g.monetization.mrrBreakdown.guruMonthly + g.monetization.mrrBreakdown.guruYearly;
  assertEqual("breakdown total = MRR", breakdownTotal, g.monetization.mrr);
}

console.log("Group 4b: Zero premium conversion");
{
  const data = mockData({ premium: { active: { value: 0, trend: 0 }, murid: 0, guru: 0, conversionRate: 0, trialActive: 0 } });
  const g = deriveInvestorGrowth(data);
  assertNull("premiumConversion null when 0", g.monetization.premiumConversion);
}

// ── Group 5: Revenue Growth ───────────────────────────────────────
console.log("Group 5: Revenue Growth");
{
  const data = mockData();
  const g = deriveInvestorGrowth(data);

  assertEqual("currentMrr", g.revenueGrowth.currentMrr, 81250);
  assertNull("previousMrr null", g.revenueGrowth.previousMrr);
  assertNull("growthRate null", g.revenueGrowth.growthRate);
  assertEqual("available false", g.revenueGrowth.available, false);
}

console.log("Group 5b: MRR trend available");
{
  const data = mockData({
    revenue: {
      mrr: { value: 81250, trend: 10, comparisonAvailable: true },
      mrrBreakdown: { muridMonthly: 19000, muridYearly: 15000, guruMonthly: 0, guruYearly: 33250 },
      cashCollectedMonth: { value: 120000, trend: 25 },
      cashCollected30d: { value: 150000, trend: 15 },
      cashCollectedAllTime: 500000,
      transactionsSuccess30d: 8,
      transactionsPending: 1,
    },
  });
  const g = deriveInvestorGrowth(data);
  assertEqual("available true", g.revenueGrowth.available, true);
}

// ── Group 6: Learning Activity ────────────────────────────────────
console.log("Group 6: Learning Activity");
{
  const data = mockData();
  const g = deriveInvestorGrowth(data);

  assertNotNull("completions7d.current", g.learning.completions7d.current);
  assertEqual("ukbiSessions7d", g.learning.ukbiSessions7d, 12);
  assertNotNull("karya7d.current", g.learning.karya7d.current);
}

// ── Group 7: Trend Value Invariants ───────────────────────────────
console.log("Group 7: Trend Value Invariants");
{
  // Flat trend
  const data = mockData({
    active: { dau: { value: 50, trend: 0 }, wau: { value: 100, trend: 0 }, mau: { value: 200, trend: 0 } },
  });
  const g = deriveInvestorGrowth(data);

  assertEqual("flat DAU direction", g.engagement.dau.direction, "FLAT");
  assertEqual("flat DAU delta", g.engagement.dau.delta, 0);
  assertEqual("flat DAU current=previous", g.engagement.dau.current, g.engagement.dau.previous);
}

// ── Group 8: Edge Cases ───────────────────────────────────────────
console.log("Group 8: Edge Cases");
{
  // All zeros
  const data = mockData({
    users: { total: 0, murid: 0, guru: 0 },
    active: { dau: { value: 0, trend: 0 }, wau: { value: 0, trend: 0 }, mau: { value: 0, trend: 0 } },
    growth: { new7d: { value: 0, trend: 0 }, new30d: { value: 0, trend: 0 } },
    premium: { active: { value: 0, trend: 0 }, murid: 0, guru: 0, conversionRate: 0, trialActive: 0 },
    revenue: {
      mrr: { value: 0, trend: null, comparisonAvailable: false },
      mrrBreakdown: { muridMonthly: 0, muridYearly: 0, guruMonthly: 0, guruYearly: 0 },
      cashCollectedMonth: { value: 0, trend: 0 },
      cashCollected30d: { value: 0, trend: 0 },
      cashCollectedAllTime: 0,
      transactionsSuccess30d: 0,
      transactionsPending: 0,
    },
    learning: { jalurCompleted7d: { value: 0, trend: 0 }, ukbiSessions7d: 0 },
    content: { karya7d: { value: 0, trend: 0 } },
    retention: { cohorts: [] },
  });
  const g = deriveInvestorGrowth(data);

  assertEqual("zero totalUsers", g.userGrowth.totalUsers, 0);
  assertEqual("zero DAU", g.engagement.dau.current, 0);
  assertEqual("zero activePremium", g.monetization.activePremium, 0);
  assertEqual("zero MRR", g.monetization.mrr, 0);
  assertNull("null DAU/MAU ratio", g.engagement.dauMauRatio);
  assertNull("null d7Rate", g.retention.d7Rate);
  assertNull("null premiumConversion", g.monetization.premiumConversion);
}

console.log("Group 8b: Large values");
{
  const data = mockData({
    users: { total: 100000, murid: 90000, guru: 10000 },
    active: { dau: { value: 5000, trend: 5 }, wau: { value: 20000, trend: 3 }, mau: { value: 60000, trend: 2 } },
    revenue: {
      mrr: { value: 2500000, trend: null, comparisonAvailable: false },
      mrrBreakdown: { muridMonthly: 950000, muridYearly: 750000, guruMonthly: 490000, guruYearly: 310000 },
      cashCollectedMonth: { value: 5000000, trend: 20 },
      cashCollected30d: { value: 4800000, trend: 18 },
      cashCollectedAllTime: 50000000,
      transactionsSuccess30d: 150,
      transactionsPending: 3,
    },
  });
  const g = deriveInvestorGrowth(data);

  assertEqual("large totalUsers", g.userGrowth.totalUsers, 100000);
  assertEqual("large MRR", g.monetization.mrr, 2500000);
  assertEqual("large cash all-time", g.monetization.cashCollectedAllTime, 50000000);
  assertNotNull("DAU/MAU ratio", g.engagement.dauMauRatio);
}

// ════════════════════════════════════════════════════════════════════
// RESULTS
// ════════════════════════════════════════════════════════════════════

console.log("\n═══════════════════════════════════════════");
if (failed > 0) {
  console.log(`RESULTS: ❌ ${failed} FAILED / ${passed + failed} total`);
  console.log("Failures:");
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
} else {
  console.log(`RESULTS: ✅ ${passed}/${passed} passed`);
}
process.exit(0);
