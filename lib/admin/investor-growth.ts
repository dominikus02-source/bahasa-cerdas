// ════════════════════════════════════════════════════════════════════
// INVESTOR GROWTH SIGNAL ENGINE
//
// Pure deterministic functions that derive investor-facing growth signals
// from canonical executive data. No AI. No randomness.
//
// Every output is traceable to a canonical metric source.
// ════════════════════════════════════════════════════════════════════

import type { ExecutiveDashboardData } from "./executive";

// ── Types ─────────────────────────────────────────────────────────

export type TrendDirection = "UP" | "DOWN" | "FLAT" | "UNAVAILABLE";

export interface TrendValue {
  current: number | null;
  previous: number | null;
  delta: number | null;
  direction: TrendDirection;
}

export interface GrowthSnapshot {
  userGrowth: {
    totalUsers: number;
    newUsers7d: TrendValue;
    newUsers30d: TrendValue;
  };
  engagement: {
    dau: TrendValue;
    wau: TrendValue;
    mau: TrendValue;
    dauMauRatio: number | null;
  };
  retention: {
    d7Rate: number | null;
    d30Rate: number | null;
    d7CohortSize: number | null;
    d30CohortSize: number | null;
  };
  monetization: {
    activePremium: number;
    muridPremium: number;
    guruPremium: number;
    mrr: number;
    mrrBreakdown: { muridMonthly: number; muridYearly: number; guruMonthly: number; guruYearly: number };
    cashCollected30d: TrendValue;
    cashCollectedAllTime: number;
    premiumConversion: number | null;
  };
  revenueGrowth: {
    currentMrr: number;
    previousMrr: number | null;
    growthRate: number | null;
    available: boolean;
  };
  learning: {
    completions7d: TrendValue;
    ukbiSessions7d: number;
    karya7d: TrendValue;
  };
}

// ── Helpers ───────────────────────────────────────────────────────

function pctDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function buildTrendValue(current: number, previous: number): TrendValue {
  const delta = pctDelta(current, previous);
  const direction: TrendDirection =
    delta > 0 ? "UP" : delta < 0 ? "DOWN" : "FLAT";
  return { current, previous, delta, direction };
}

function latestNonNull<T>(arr: (T | null)[]): T | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== null) return arr[i];
  }
  return null;
}

// ── Main function ─────────────────────────────────────────────────

/**
 * Derive investor growth snapshot from canonical executive dashboard data.
 * Pure function — no DB calls, no side effects.
 */
export function deriveInvestorGrowth(data: ExecutiveDashboardData): GrowthSnapshot {
  // ── User Growth ──
  const userGrowth = {
    totalUsers: data.users.total,
    newUsers7d: buildTrendValue(data.growth.new7d.value, data.growth.new7d.value - Math.round(data.growth.new7d.value * (data.growth.new7d.trend / 100 + 1 - 1) / 1) || 0),
    newUsers30d: buildTrendValue(data.growth.new30d.value, data.growth.new30d.value - Math.round(data.growth.new30d.value * (data.growth.new30d.trend / 100 + 1 - 1) / 1) || 0),
  };

  // Recalculate previous from trend to avoid circular reference
  // trend = (current - prev) / prev * 100 → prev = current / (trend/100 + 1)
  const newUsersPrev7d = data.growth.new7d.trend !== 0
    ? Math.round(data.growth.new7d.value / (data.growth.new7d.trend / 100 + 1))
    : data.growth.new7d.value;
  const newUsersPrev30d = data.growth.new30d.trend !== 0
    ? Math.round(data.growth.new30d.value / (data.growth.new30d.trend / 100 + 1))
    : data.growth.new30d.value;

  userGrowth.newUsers7d = buildTrendValue(data.growth.new7d.value, newUsersPrev7d);
  userGrowth.newUsers30d = buildTrendValue(data.growth.new30d.value, newUsersPrev30d);

  // ── Engagement ──
  const dauMauRatio = data.active.mau.value > 0
    ? Math.round((data.active.dau.value / data.active.mau.value) * 100)
    : null;

  const engagement = {
    dau: buildTrendValue(data.active.dau.value, data.active.dau.value - Math.round(data.active.dau.value * data.active.dau.trend / 100) || 0),
    wau: buildTrendValue(data.active.wau.value, data.active.wau.value - Math.round(data.active.wau.value * data.active.wau.trend / 100) || 0),
    mau: buildTrendValue(data.active.mau.value, data.active.mau.value - Math.round(data.active.mau.value * data.active.mau.trend / 100) || 0),
    dauMauRatio,
  };

  // Recalculate previous from trend for engagement
  const dauPrev = data.active.dau.trend !== 0
    ? Math.round(data.active.dau.value / (data.active.dau.trend / 100 + 1))
    : data.active.dau.value;
  const wauPrev = data.active.wau.trend !== 0
    ? Math.round(data.active.wau.value / (data.active.wau.trend / 100 + 1))
    : data.active.wau.value;
  const mauPrev = data.active.mau.trend !== 0
    ? Math.round(data.active.mau.value / (data.active.mau.trend / 100 + 1))
    : data.active.mau.value;

  engagement.dau = buildTrendValue(data.active.dau.value, dauPrev);
  engagement.wau = buildTrendValue(data.active.wau.value, wauPrev);
  engagement.mau = buildTrendValue(data.active.mau.value, mauPrev);

  // ── Retention ──
  const d7Cohort = data.retention.cohorts.find((c) => c.d7Rate !== null);
  const d30Cohort = data.retention.cohorts.find((c) => c.d30Rate !== null);

  const retention = {
    d7Rate: d7Cohort?.d7Rate ?? null,
    d30Rate: d30Cohort?.d30Rate ?? null,
    d7CohortSize: d7Cohort?.registered ?? null,
    d30CohortSize: d30Cohort?.registered ?? null,
  };

  // ── Monetization ──
  const cashPrev30d = data.revenue.cashCollected30d.trend !== 0
    ? Math.round(data.revenue.cashCollected30d.value / (data.revenue.cashCollected30d.trend / 100 + 1))
    : data.revenue.cashCollected30d.value;

  const monetization = {
    activePremium: data.premium.active.value,
    muridPremium: data.premium.murid,
    guruPremium: data.premium.guru,
    mrr: data.revenue.mrr.value,
    mrrBreakdown: {
      muridMonthly: data.revenue.mrrBreakdown.muridMonthly,
      muridYearly: data.revenue.mrrBreakdown.muridYearly,
      guruMonthly: data.revenue.mrrBreakdown.guruMonthly,
      guruYearly: data.revenue.mrrBreakdown.guruYearly,
    },
    cashCollected30d: buildTrendValue(data.revenue.cashCollected30d.value, cashPrev30d),
    cashCollectedAllTime: data.revenue.cashCollectedAllTime,
    premiumConversion: data.premium.conversionRate > 0 ? data.premium.conversionRate : null,
  };

  // ── Revenue Growth ──
  // MRR trend is NOT available (no snapshot infrastructure)
  const revenueGrowth = {
    currentMrr: data.revenue.mrr.value,
    previousMrr: null,
    growthRate: null,
    available: data.revenue.mrr.comparisonAvailable,
  };

  // ── Learning ──
  const learning = {
    completions7d: buildTrendValue(data.learning.jalurCompleted7d.value, data.learning.jalurCompleted7d.value - Math.round(data.learning.jalurCompleted7d.value * data.learning.jalurCompleted7d.trend / 100) || 0),
    ukbiSessions7d: data.learning.ukbiSessions7d,
    karya7d: buildTrendValue(data.content.karya7d.value, data.content.karya7d.value - Math.round(data.content.karya7d.value * data.content.karya7d.trend / 100) || 0),
  };

  // Recalculate previous for learning
  const completionsPrev = data.learning.jalurCompleted7d.trend !== 0
    ? Math.round(data.learning.jalurCompleted7d.value / (data.learning.jalurCompleted7d.trend / 100 + 1))
    : data.learning.jalurCompleted7d.value;
  const karyaPrev = data.content.karya7d.trend !== 0
    ? Math.round(data.content.karya7d.value / (data.content.karya7d.trend / 100 + 1))
    : data.content.karya7d.value;

  learning.completions7d = buildTrendValue(data.learning.jalurCompleted7d.value, completionsPrev);
  learning.karya7d = buildTrendValue(data.content.karya7d.value, karyaPrev);

  return {
    userGrowth,
    engagement,
    retention,
    monetization,
    revenueGrowth,
    learning,
  };
}
