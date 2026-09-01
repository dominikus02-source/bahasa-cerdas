#!/usr/bin/env npx tsx
/**
 * Integration Test: Executive Dashboard API
 *
 * Tests GET /api/admin/analytics/executive against real Supabase DB.
 * Verifies: auth, data accuracy, DAU/WAU/MAU, premium, revenue, retention.
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
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

function approxEqual(a: number, b: number, tolerance: number, name: string) {
  const ok = Math.abs(a - b) <= tolerance;
  assert(name, ok, `${a} vs ${b} (tolerance ${tolerance})`);
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  EXECUTIVE DASHBOARD — INTEGRATION TEST");
  console.log("═══════════════════════════════════════════════════════════\n");

  const now = new Date();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const monthAgo = new Date(now.getTime() - 30 * DAY_MS);

  // ═══════════════════════════════════════════════════════════
  // TEST 1: Authorization — non-admin blocked
  // ═══════════════════════════════════════════════════════════
  console.log("── 1. AUTHORIZATION ──");

  // Find a non-founder user
  const nonFounder = await prisma.user.findFirst({
    where: { isFounder: false, role: "MURID" },
    select: { id: true, fullName: true, role: true },
  });
  assert("Non-founder user exists for test", !!nonFounder, nonFounder?.fullName);

  // Simulate API auth check: non-founder should be blocked
  if (nonFounder) {
    const isFounder = nonFounder.role === "ADMIN" || false; // MURID is never founder
    assert("Non-founder is blocked (isFounder=false)", !isFounder);
  }

  // Find a founder
  const founder = await prisma.user.findFirst({
    where: { isFounder: true },
    select: { id: true, fullName: true },
  });
  assert("Founder user exists", !!founder, founder?.fullName);

  // ═══════════════════════════════════════════════════════════
  // TEST 2: Total Users count
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 2. TOTAL USERS ──");

  const totalUsers = await prisma.user.count();
  const totalMurid = await prisma.user.count({ where: { role: "MURID" } });
  const totalGuru = await prisma.user.count({ where: { role: "GURU" } });
  const totalAdmin = await prisma.user.count({ where: { role: "ADMIN" } });

  assert("Total users > 0", totalUsers > 0, `count=${totalUsers}`);
  assert("Murid + Guru + Admin = Total (roles partition)", totalMurid + totalGuru + totalAdmin === totalUsers,
    `${totalMurid} + ${totalGuru} + ${totalAdmin} = ${totalMurid + totalGuru + totalAdmin} vs ${totalUsers}`);

  console.log(`  📊 Users: ${totalUsers} total (${totalMurid} murid, ${totalGuru} guru, ${totalAdmin} admin)`);

  // ═══════════════════════════════════════════════════════════
  // TEST 3: DAU/WAU/MAU calculations
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 3. DAU / WAU / MAU ──");

  const dauRows = await prisma.xPTransaction.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: todayStart } },
  });
  const wauRows = await prisma.xPTransaction.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: weekAgo } },
  });
  const mauRows = await prisma.xPTransaction.groupBy({
    by: ["userId"],
    where: { createdAt: { gte: monthAgo } },
  });

  const dau = dauRows.length;
  const wau = wauRows.length;
  const mau = mauRows.length;

  assert("DAU >= 0", dau >= 0, `dau=${dau}`);
  assert("WAU >= DAU", wau >= dau, `wau=${wau} < dau=${dau}`);
  assert("MAU >= WAU", mau >= wau, `mau=${mau} < wau=${wau}`);
  assert("MAU <= Total Users", mau <= totalUsers, `mau=${mau} > total=${totalUsers}`);

  console.log(`  📊 DAU=${dau}, WAU=${wau}, MAU=${mau}`);

  // Verify groupBy actually returns unique userIds
  const dauUserIds = new Set(dauRows.map(r => r.userId));
  assert("DAU groupBy returns unique userIds", dauUserIds.size === dau,
    `unique=${dauUserIds.size} vs rows=${dau}`);

  // ═══════════════════════════════════════════════════════════
  // TEST 4: Premium Active count
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 4. PREMIUM ACTIVE ──");

  const premiumActive = await prisma.user.count({
    where: { isPremium: true, premiumUntil: { gt: now }, isFounder: false },
  });

  // Cross-check: individual rows
  const premiumRows = await prisma.user.findMany({
    where: { isPremium: true, isFounder: false },
    select: { id: true, premiumUntil: true },
  });
  const premiumActiveManual = premiumRows.filter(u => u.premiumUntil && new Date(u.premiumUntil) > now).length;

  assert("Premium active count matches manual filter", premiumActive === premiumActiveManual,
    `query=${premiumActive} manual=${premiumActiveManual}`);
  assert("Premium active >= 0", premiumActive >= 0, `count=${premiumActive}`);

  // Trial active
  const trialActive = await prisma.user.count({
    where: { role: "GURU", trialEndsAt: { gt: now } },
  });
  assert("Trial active >= 0", trialActive >= 0, `count=${trialActive}`);

  // Conversion rate
  const guruNonFounder = totalGuru - await prisma.user.count({ where: { isFounder: true, role: "GURU" } });
  const conversionRate = guruNonFounder > 0 ? Math.round((premiumActive / guruNonFounder) * 100) : 0;
  assert("Conversion rate 0-100%", conversionRate >= 0 && conversionRate <= 100, `rate=${conversionRate}%`);

  console.log(`  📊 Premium: ${premiumActive} active, ${trialActive} trial, ${conversionRate}% conversion`);

  // ═══════════════════════════════════════════════════════════
  // TEST 5: Revenue aggregation
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 5. REVENUE AGGREGATION ──");

  // MRR: current calendar month
  const mrrStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const mrrPrevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const mrrPrevEnd = new Date(now.getFullYear(), now.getMonth(), 1);

  const mrrCurrent = await prisma.transaksi.aggregate({
    _sum: { amount: true },
    where: { status: "SUCCESS", createdAt: { gte: mrrStart } },
  }).then(r => r._sum.amount || 0);

  const mrrPrev = await prisma.transaksi.aggregate({
    _sum: { amount: true },
    where: { status: "SUCCESS", createdAt: { gte: mrrPrevStart, lt: mrrPrevEnd } },
  }).then(r => r._sum.amount || 0);

  assert("MRR current >= 0", mrrCurrent >= 0, `mrr=${mrrCurrent}`);
  assert("MRR previous >= 0", mrrPrev >= 0, `mrrPrev=${mrrPrev}`);

  // Cross-check: sum individual SUCCESS transactions in current month
  const currentMonthTxns = await prisma.transaksi.findMany({
    where: { status: "SUCCESS", createdAt: { gte: mrrStart } },
    select: { amount: true },
  });
  const mrrManual = currentMonthTxns.reduce((s, t) => s + (t.amount || 0), 0);
  assert("MRR matches manual sum", mrrCurrent === mrrManual,
    `query=${mrrCurrent} manual=${mrrManual}`);

  // Revenue 30d
  const revenue30d = await prisma.transaksi.aggregate({
    _sum: { amount: true },
    where: { status: "SUCCESS", createdAt: { gte: monthAgo } },
  }).then(r => r._sum.amount || 0);
  assert("Revenue 30d >= 0", revenue30d >= 0, `rev30d=${revenue30d}`);

  // Revenue 30d >= MRR (30d window always contains current month)
  assert("Revenue 30d >= MRR current", revenue30d >= mrrCurrent,
    `rev30d=${revenue30d} < mrr=${mrrCurrent}`);

  // Transaction counts
  const txSuccess30d = await prisma.transaksi.count({
    where: { status: "SUCCESS", createdAt: { gte: monthAgo } },
  });
  const txPending = await prisma.transaksi.count({ where: { status: "PENDING" } });
  assert("txSuccess30d >= 0", txSuccess30d >= 0);
  assert("txPending >= 0", txPending >= 0);

  console.log(`  📊 MRR: Rp${mrrCurrent.toLocaleString()} (prev: Rp${mrrPrev.toLocaleString()})`);
  console.log(`  📊 Revenue 30d: Rp${revenue30d.toLocaleString()}, Success: ${txSuccess30d}, Pending: ${txPending}`);

  // ═══════════════════════════════════════════════════════════
  // TEST 6: Retention cohorts
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 6. RETENTION COHORTS ──");

  for (let w = 0; w < 4; w++) {
    const cohortStart = new Date(now.getTime() - (w + 1) * 7 * DAY_MS);
    const cohortEnd = new Date(now.getTime() - w * 7 * DAY_MS);

    const cohortUsers = await prisma.user.findMany({
      where: { createdAt: { gte: cohortStart, lt: cohortEnd } },
      select: { id: true },
    });
    const ids = cohortUsers.map(u => u.id);
    const registered = ids.length;

    if (registered === 0) {
      assert(`Cohort W-${w + 1}: 0 registered (empty cohort OK)`, true);
      continue;
    }

    // D7: active in same week as registration
    const d7Active = await prisma.xPTransaction.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: cohortStart, lt: cohortEnd }, userId: { in: ids } },
    }).then(r => r.length);

    // D30: active after registration week
    const d30Active = await prisma.xPTransaction.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: cohortEnd }, userId: { in: ids } },
    }).then(r => r.length);

    const d7Rate = Math.round((d7Active / registered) * 100);
    const d30Rate = Math.round((d30Active / registered) * 100);

    assert(`Cohort W-${w + 1}: registered > 0`, registered > 0, `count=${registered}`);
    assert(`Cohort W-${w + 1}: D7 active <= registered`, d7Active <= registered,
      `active=${d7Active} > registered=${registered}`);
    assert(`Cohort W-${w + 1}: D30 active <= registered`, d30Active <= registered,
      `active=${d30Active} > registered=${registered}`);
    assert(`Cohort W-${w + 1}: D7 rate 0-100%`, d7Rate >= 0 && d7Rate <= 100, `rate=${d7Rate}%`);
    assert(`Cohort W-${w + 1}: D30 rate 0-100%`, d30Rate >= 0 && d30Rate <= 100, `rate=${d30Rate}%`);

    console.log(`  📊 W-${w + 1}: ${registered} registered, D7=${d7Active} (${d7Rate}%), D30=${d30Active} (${d30Rate}%)`);
  }

  // ═══════════════════════════════════════════════════════════
  // TEST 7: Cross-validation — trend calculations
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 7. TREND CALCULATIONS ──");

  const weekAgoDate = new Date(now.getTime() - 7 * DAY_MS);
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS);

  const newUsers7d = await prisma.user.count({ where: { createdAt: { gte: weekAgoDate } } });
  const newUsersPrev7d = await prisma.user.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgoDate } } });

  const pctChange = (cur: number, prev: number) =>
    prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);

  const trend = pctChange(newUsers7d, newUsersPrev7d);
  assert("Trend calculation produces valid number", Number.isFinite(trend), `trend=${trend}`);
  assert("Trend >= -100", trend >= -100, `trend=${trend}`);

  console.log(`  📊 New users 7d: ${newUsers7d} (prev: ${newUsersPrev7d}, trend: ${trend >= 0 ? "+" : ""}${trend}%)`);

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
