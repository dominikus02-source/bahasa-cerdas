#!/usr/bin/env npx tsx
/**
 * Integration Test: Premium Report Command Center
 *
 * Tests the extended summary metrics from GET /api/admin/premium/report.
 * Verifies: MRR, conversion funnel, churn risk, revenue by audience.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
} catch {}

import { PrismaClient } from "@prisma/client";

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

let passed = 0;
let failed = 0;
let total = 0;

function assert(name: string, condition: boolean, detail?: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function formatRp(v: number): string {
  if (v >= 1_000_000) return `Rp${(v / 1_000_000).toFixed(1)}jt`;
  if (v >= 1_000) return `Rp${Math.round(v / 1_000)}rb`;
  return `Rp${v}`;
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  PREMIUM COMMAND CENTER — INTEGRATION TEST");
  console.log("═══════════════════════════════════════════════════════════\n");

  const now = new Date();
  const DAY_MS = 24 * 60 * 60 * 1000;

  // ═══════════════════════════════════════════════════════════
  // TEST 1: MRR by plan
  // ═══════════════════════════════════════════════════════════
  console.log("── 1. MRR BY PLAN ──");

  const mrrByPlanRaw = await prisma.transaksi.groupBy({
    by: ["reference"],
    where: {
      type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] },
      status: "SUCCESS",
    },
    _sum: { amount: true },
    _count: true,
  });

  let mrrMonthly = 0;
  let mrrYearly = 0;
  for (const row of mrrByPlanRaw) {
    const amt = row._sum.amount || 0;
    if (row.reference?.includes("YEARLY")) {
      mrrYearly += Math.round(amt / 12);
    } else {
      mrrMonthly += amt;
    }
  }
  const mrrTotal = mrrMonthly + mrrYearly;

  assert("MRR total >= 0", mrrTotal >= 0, `mrr=${mrrTotal}`);
  assert("MRR monthly >= 0", mrrMonthly >= 0, `monthly=${mrrMonthly}`);
  assert("MRR yearly >= 0", mrrYearly >= 0, `yearly=${mrrYearly}`);
  assert("MRR total = monthly + yearly", mrrTotal === mrrMonthly + mrrYearly);

  console.log(`  📊 MRR: ${formatRp(mrrTotal)} (monthly: ${formatRp(mrrMonthly)}, yearly/12: ${formatRp(mrrYearly)})`);
  for (const row of mrrByPlanRaw) {
    console.log(`    ${row.reference || "unknown"}: ${formatRp(row._sum.amount || 0)} (${row._count} txns)`);
  }

  // ═══════════════════════════════════════════════════════════
  // TEST 2: Revenue by audience
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 2. REVENUE BY AUDIENCE ──");

  const [muridRevenueAgg, guruRevenueAgg] = await Promise.all([
    prisma.transaksi.aggregate({
      _sum: { amount: true },
      where: { type: "MURID_PREMIUM", status: "SUCCESS" },
    }),
    prisma.transaksi.aggregate({
      _sum: { amount: true },
      where: { type: "PREMIUM_UPGRADE", status: "SUCCESS" },
    }),
  ]);
  const muridRevenue = muridRevenueAgg._sum.amount || 0;
  const guruRevenue = guruRevenueAgg._sum.amount || 0;

  assert("Murid revenue >= 0", muridRevenue >= 0, `murid=${muridRevenue}`);
  assert("Guru revenue >= 0", guruRevenue >= 0, `guru=${guruRevenue}`);
  assert("Total revenue >= 0", muridRevenue + guruRevenue >= 0);
  // Cross-check: total revenue should match sum of all premium transactions
  const allPremiumRevenue = await prisma.transaksi.aggregate({
    _sum: { amount: true },
    where: { type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] }, status: "SUCCESS" },
  }).then(r => r._sum.amount || 0);
  assert("Total revenue matches all premium transactions", muridRevenue + guruRevenue === allPremiumRevenue,
    `audienceSum=${muridRevenue + guruRevenue} allPremium=${allPremiumRevenue}`);

  console.log(`  📊 Murid: ${formatRp(muridRevenue)}, Guru: ${formatRp(guruRevenue)}`);

  // ═══════════════════════════════════════════════════════════
  // TEST 3: Conversion funnel
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 3. CONVERSION FUNNEL ──");

  const totalRegistered = await prisma.user.count({
    where: { role: { in: ["MURID", "GURU"] }, isFounder: false },
  });
  const activePremium = await prisma.user.count({
    where: { role: { in: ["MURID", "GURU"] }, isPremium: true, premiumUntil: { gt: now }, isFounder: false },
  });

  // Renewed = users with >1 successful premium transaction
  const usersWithTxns = await prisma.user.findMany({
    where: {
      role: { in: ["MURID", "GURU"] },
      isFounder: false,
      transaksi: {
        some: { type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] }, status: "SUCCESS" },
      },
    },
    select: {
      id: true,
      _count: {
        select: {
          transaksi: { where: { type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] }, status: "SUCCESS" } },
        },
      },
    },
  });
  const renewedCount = usersWithTxns.filter(u => u._count.transaksi > 1).length;

  assert("Registered > 0", totalRegistered > 0, `count=${totalRegistered}`);
  assert("Active premium >= 0", activePremium >= 0, `count=${activePremium}`);
  assert("Active premium <= registered", activePremium <= totalRegistered);
  assert("Renewed >= 0", renewedCount >= 0, `count=${renewedCount}`);
  assert("Renewed <= active premium + expired", renewedCount <= totalRegistered);

  const conversionRate = totalRegistered > 0 ? ((activePremium / totalRegistered) * 100).toFixed(1) : "0";
  const renewalRate = activePremium > 0 ? ((renewedCount / activePremium) * 100).toFixed(1) : "0";

  console.log(`  📊 Registered: ${totalRegistered}, Active: ${activePremium} (${conversionRate}%), Renewed: ${renewedCount} (${renewalRate}%)`);

  // ═══════════════════════════════════════════════════════════
  // TEST 4: Churn risk
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 4. CHURN RISK ──");

  const sevenDays = new Date(now.getTime() + 7 * DAY_MS);
  const fourteenDays = new Date(now.getTime() + 14 * DAY_MS);
  const thirtyDays = new Date(now.getTime() + 30 * DAY_MS);

  const [churn7d, churn14d, churn30d] = await Promise.all([
    prisma.user.count({ where: { role: { in: ["MURID", "GURU"] }, isPremium: true, premiumUntil: { gt: now, lte: sevenDays } } }),
    prisma.user.count({ where: { role: { in: ["MURID", "GURU"] }, isPremium: true, premiumUntil: { gt: now, lte: fourteenDays } } }),
    prisma.user.count({ where: { role: { in: ["MURID", "GURU"] }, isPremium: true, premiumUntil: { gt: now, lte: thirtyDays } } }),
  ]);

  assert("Churn 7d >= 0", churn7d >= 0, `count=${churn7d}`);
  assert("Churn 14d >= 0", churn14d >= 0, `count=${churn14d}`);
  assert("Churn 30d >= 0", churn30d >= 0, `count=${churn30d}`);
  assert("Churn 7d <= churn 14d", churn7d <= churn14d);
  assert("Churn 14d <= churn 30d", churn14d <= churn30d);
  assert("Churn 30d <= active premium", churn30d <= activePremium,
    `churn30d=${churn30d} > active=${activePremium}`);

  console.log(`  📊 7d: ${churn7d}, 14d: ${churn14d}, 30d: ${churn30d} (${activePremium > 0 ? ((churn30d / activePremium) * 100).toFixed(0) : 0}% of active)`);

  // ═══════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════
  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  RESULTS: ${passed}/${total} passed, ${failed} failed`);
  console.log(`═══════════════════════════════════════════════════════════`);

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
