"use client";

import { ExecutiveDashboardView } from "@/components/admin/ExecutiveDashboardView";
import type { ExecutiveDashboardData } from "@/lib/admin/executive";

const metric = (value: number, trend = 0) => ({ value, trend });

export const QA_EXECUTIVE_DATA: ExecutiveDashboardData = {
  timestamp: "2026-11-10T13:00:00.000Z",
  users: { total: 1280, murid: 1100, guru: 180 },
  active: { dau: metric(142, 4), wau: metric(510, 2), mau: metric(820, 1) },
  dauConsecutive: { today: 142, yesterday: 138, twoDaysAgo: 140 },
  growth: { new7d: metric(48, 6), new30d: metric(190, 8) },
  premium: { active: metric(36, 3), murid: 20, guru: 16, conversionRate: 4.2, trialActive: 7 },
  revenue: {
    mrr: { value: 4_200_000, trend: 5, comparisonAvailable: true },
    mrrBreakdown: { total: 4_200_000, muridMonthly: 1_200_000, muridYearly: 900_000, guruMonthly: 1_400_000, guruYearly: 700_000 },
    cashCollectedMonth: metric(1_500_000, 2),
    cashCollected30d: metric(1_800_000, 3),
    cashCollectedAllTime: 12_000_000,
    transactionsSuccess30d: 41,
    transactionsPending: 2,
  },
  learning: { jalurCompleted7d: metric(88, 5), ukbiSessions7d: 64 },
  content: { karya7d: metric(23, 1) },
  ai: { generations7d: 110 },
  retention: {
    cohorts: [
      { label: "2026-10", registered: 120, active7d: 70, active30d: 48, d7Rate: 58, d30Rate: 40, hasEnoughData: true },
      { label: "2026-11", registered: 80, active7d: 44, active30d: null, d7Rate: 55, d30Rate: null, hasEnoughData: false },
    ],
  },
  paymentHealth: { summary: { totalAffected: 0, totalRevenueAtRisk: 0, affectedByRole: { murid: 0, guru: 0 } }, affectedUsers: [] },
};

export default function QaExecutivePage() {
  return <ExecutiveDashboardView data={QA_EXECUTIVE_DATA} />;
}
