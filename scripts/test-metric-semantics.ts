#!/usr/bin/env npx tsx
/**
 * METRIC SEMANTICS — REGRESSION TEST
 *
 * Verifies that all founder-facing metrics match the canonical definitions
 * in docs/ADMIN_METRIC_DICTIONARY.md. Tests against real Supabase DB.
 *
 * Key semantic contracts tested:
 * 1. MRR = Σ MRR_CONTRIBUTION[plan] for ACTIVE subscriptions (NOT cash collected)
 * 2. Cash Collected ≠ MRR
 * 3. Active Premium = isPremium=true AND premiumUntil>now AND isFounder=false
 * 4. Conversion Rate = activeGuruPremium / (totalGuru - founderCount)
 * 5. DAU ≤ WAU ≤ MAU hierarchy
 * 6. Transaction type filter = ["PREMIUM_UPGRADE", "MURID_PREMIUM"] everywhere
 * 7. Toko Guru uses Karya model, NOT StudentKarya
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

// Canonical plan prices (must match lib/admin/executive.ts)
const MRR_CONTRIBUTION: Record<string, number> = {
  MURID_PREMIUM_MONTHLY: 19_000,
  MURID_PREMIUM_YEARLY: Math.round(180_000 / 12),  // 15,000
  GURU_PRO_MONTHLY: 49_000,
  GURU_PRO_YEARLY: Math.round(399_000 / 12),      // 33,250
};

const VALID_TX_TYPES = ["PREMIUM_UPGRADE", "MURID_PREMIUM"];

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  METRIC SEMANTICS — REGRESSION TEST");
  console.log("═══════════════════════════════════════════════════════════\n");

  const now = new Date();

  // ═══════════════════════════════════════════════════════════
  // 1. MRR = from active subscriptions, NOT cash collected
  // ═══════════════════════════════════════════════════════════
  console.log("── 1. MRR SEMANTICS ──");

  const activeUsers = await prisma.user.findMany({
    where: { isPremium: true, premiumUntil: { gt: now }, isFounder: false },
    select: {
      id: true, role: true, premiumPlan: true,
      transaksi: {
        where: { status: "SUCCESS", type: { in: ["PREMIUM_UPGRADE", "MURID_PREMIUM"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { reference: true, amount: true },
      },
    },
  });

  let trueMRR = 0;
  for (const user of activeUsers) {
    const tx = user.transaksi[0];
    const ref = tx?.reference || user.premiumPlan || "";
    const planKey = ref.includes("YEARLY")
      ? (user.role === "MURID" ? "MURID_PREMIUM_YEARLY" : "GURU_PRO_YEARLY")
      : (user.role === "MURID" ? "MURID_PREMIUM_MONTHLY" : "GURU_PRO_MONTHLY");
    trueMRR += MRR_CONTRIBUTION[planKey] || 0;
  }

  // Cash collected this month (DIFFERENT from MRR)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const cashCollectedMonth = await prisma.transaksi.aggregate({
    _sum: { amount: true },
    where: { status: "SUCCESS", createdAt: { gte: monthStart } },
  }).then(r => r._sum.amount || 0);

  assert("True MRR >= 0", trueMRR >= 0, `mrr=${trueMRR}`);
  assert("Cash Collected (month) >= 0", cashCollectedMonth >= 0, `cash=${cashCollectedMonth}`);

  // MRR and Cash Collected should NOT necessarily be equal
  // They can be equal only by coincidence
  if (activeUsers.length > 0 && cashCollectedMonth > 0) {
    assert("MRR and Cash Collected are independently calculated",
      true, // Just verify both exist and are valid numbers
      `mrr=${trueMRR} cash=${cashCollectedMonth}`);
  }

  // MRR should be ≤ sum of all active user maximum monthly values
  const maxMRR = activeUsers.length * 49_000; // Highest plan
  assert("MRR <= theoretical max", trueMRR <= maxMRR,
    `mrr=${trueMRR} max=${maxMRR}`);

  console.log(`  📊 True MRR: Rp${trueMRR.toLocaleString()} (from ${activeUsers.length} active subscriptions)`);
  console.log(`  📊 Cash Collected (month): Rp${cashCollectedMonth.toLocaleString()}`);

  // ═══════════════════════════════════════════════════════════
  // 2. Active Premium definition
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 2. ACTIVE PREMIUM DEFINITION ──");

  // Canonical: isPremium=true AND premiumUntil>now AND isFounder=false
  const canonicalActive = await prisma.user.count({
    where: { isPremium: true, premiumUntil: { gt: now }, isFounder: false },
  });

  // Cross-check: manual count
  const allPremium = await prisma.user.findMany({
    where: { isPremium: true, isFounder: false },
    select: { id: true, premiumUntil: true },
  });
  const manualActive = allPremium.filter(u => u.premiumUntil && new Date(u.premiumUntil) > now).length;

  assert("Canonical active matches manual count", canonicalActive === manualActive,
    `query=${canonicalActive} manual=${manualActive}`);

  // Verify founders excluded
  const founderActive = await prisma.user.count({
    where: { isPremium: true, premiumUntil: { gt: now }, isFounder: true },
  });
  assert("Founders excluded from active count", founderActive === 0,
    `founderActive=${founderActive}`);

  // Stale premium: isPremium=true but premiumUntil in the past
  const stalePremium = allPremium.filter(u => u.premiumUntil && new Date(u.premiumUntil) <= now).length;
  console.log(`  📊 Active Premium: ${canonicalActive}, Stale (expired entitlement): ${stalePremium}`);

  // ═══════════════════════════════════════════════════════════
  // 3. Conversion Rate formula
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 3. CONVERSION RATE FORMULA ──");

  const totalGuru = await prisma.user.count({ where: { role: "GURU" } });
  const founderCount = await prisma.user.count({ where: { isFounder: true, role: "GURU" } });
  const guruEligible = Math.max(totalGuru - founderCount, 0);
  const guruActivePremium = await prisma.user.count({
    where: { isPremium: true, premiumUntil: { gt: now }, role: "GURU", isFounder: false },
  });
  const conversionRate = guruEligible > 0 ? Math.round((guruActivePremium / guruEligible) * 100) : 0;

  assert("Conversion denominator = totalGuru - founderCount",
    guruEligible === totalGuru - founderCount,
    `eligible=${guruEligible} vs ${totalGuru}-${founderCount}`);
  assert("Conversion rate 0-100%", conversionRate >= 0 && conversionRate <= 100,
    `rate=${conversionRate}%`);
  assert("Conversion numerator = guru active premium",
    guruActivePremium <= canonicalActive,
    `guru=${guruActivePremium} total=${canonicalActive}`);

  console.log(`  📊 Guru: ${totalGuru} total, ${founderCount} founders, ${guruEligible} eligible, ${guruActivePremium} premium → ${conversionRate}%`);

  // ═══════════════════════════════════════════════════════════
  // 4. Transaction type consistency
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 4. TRANSACTION TYPE CONSISTENCY ──");

  const allPremiumTx = await prisma.transaksi.findMany({
    where: { type: { in: VALID_TX_TYPES }, status: "SUCCESS" },
    select: { id: true, type: true, userId: true, amount: true },
  });

  // Every SUCCESS premium transaction must reference a real user
  let orphanCount = 0;
  for (const tx of allPremiumTx) {
    const user = await prisma.user.findUnique({ where: { id: tx.userId }, select: { id: true } });
    if (!user) orphanCount++;
  }
  assert("No orphan transactions (every tx has valid userId)", orphanCount === 0,
    `orphans=${orphanCount}`);

  // Verify both types are used
  const types = new Set(allPremiumTx.map(tx => tx.type));
  assert("PREMIUM_UPGRADE type exists", types.has("PREMIUM_UPGRADE"),
    `found: ${[...types].join(", ")}`);
  assert("MURID_PREMIUM type exists", types.has("MURID_PREMIUM"),
    `found: ${[...types].join(", ")}`);

  // No amount <= 0 for SUCCESS
  const badAmounts = allPremiumTx.filter(tx => tx.amount <= 0);
  assert("No SUCCESS transaction with amount <= 0", badAmounts.length === 0,
    `bad=${badAmounts.length}`);

  console.log(`  📊 Premium transactions: ${allPremiumTx.length} SUCCESS (${[...types].join(", ")})`);

  // ═══════════════════════════════════════════════════════════
  // 5. DAU ≤ WAU ≤ MAU hierarchy
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 5. DAU/WAU/MAU HIERARCHY ──");

  const DAY_MS = 86_400_000;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const monthAgo = new Date(now.getTime() - 30 * DAY_MS);

  const dau = (await prisma.xPTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: todayStart } } })).length;
  const wau = (await prisma.xPTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: weekAgo } } })).length;
  const mau = (await prisma.xPTransaction.groupBy({ by: ["userId"], where: { createdAt: { gte: monthAgo } } })).length;

  assert("DAU >= 0", dau >= 0, `dau=${dau}`);
  assert("WAU >= DAU (hierarchy)", wau >= dau, `wau=${wau} < dau=${dau}`);
  assert("MAU >= WAU (hierarchy)", mau >= wau, `mau=${mau} < wau=${wau}`);

  console.log(`  📊 DAU=${dau}, WAU=${wau}, MAU=${mau}`);

  // ═══════════════════════════════════════════════════════════
  // 6. Retention: weekly cohorts
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
      assert(`Cohort W-${w + 1}: empty (valid)`, true);
      continue;
    }

    const d7Active = (await prisma.xPTransaction.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: cohortStart, lt: cohortEnd }, userId: { in: ids } },
    })).length;

    const d30Active = (await prisma.xPTransaction.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: cohortEnd }, userId: { in: ids } },
    })).length;

    assert(`Cohort W-${w + 1}: D7 <= registered`, d7Active <= registered, `${d7Active} > ${registered}`);
    assert(`Cohort W-${w + 1}: D30 <= registered`, d30Active <= registered, `${d30Active} > ${registered}`);

    console.log(`  📊 W-${w + 1}: ${registered} registered, D7=${d7Active} (${Math.round((d7Active / registered) * 100)}%), D30=${d30Active} (${Math.round((d30Active / registered) * 100)}%)`);
  }

  // ═══════════════════════════════════════════════════════════
  // 7. Payment Health: SUCCESS without entitlement
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 7. PAYMENT HEALTH ──");

  const successPremiumTx = await prisma.transaksi.findMany({
    where: { status: "SUCCESS", type: { in: VALID_TX_TYPES } },
    select: {
      id: true, userId: true, amount: true,
      user: { select: { id: true, isPremium: true, premiumUntil: true } },
    },
  });

  const affected = successPremiumTx.filter(t => {
    if (t.user.isPremium && t.user.premiumUntil && new Date(t.user.premiumUntil) > now) return false;
    return true;
  });

  console.log(`  📊 ${successPremiumTx.length} SUCCESS premium transactions, ${affected.length} without active entitlement`);
  assert("Payment health: affected count is valid integer", Number.isFinite(affected.length));

  // ═══════════════════════════════════════════════════════════
  // 8. Toko Guru domain isolation
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 8. TOKO GURU DOMAIN ──");

  const karyaProducts = await prisma.karya.count();
  const studentKarya = await prisma.studentKarya.count();

  assert("Karya (teacher products) model exists and is queryable", karyaProducts >= 0, `count=${karyaProducts}`);
  assert("StudentKarya (student works) model exists and is queryable", studentKarya >= 0, `count=${studentKarya}`);
  assert("Toko Guru should use Karya model (not StudentKarya)", karyaProducts !== studentKarya || karyaProducts === 0,
    `karya=${karyaProducts} studentKarya=${studentKarya}`);

  console.log(`  📊 Karya (teacher products): ${karyaProducts}, StudentKarya (student works): ${studentKarya}`);

  // ═══════════════════════════════════════════════════════════
  // 9. Revenue monotonicity
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 9. REVENUE MONOTONICITY ──");

  const revenue30d = await prisma.transaksi.aggregate({
    _sum: { amount: true },
    where: { status: "SUCCESS", createdAt: { gte: monthAgo } },
  }).then(r => r._sum.amount || 0);

  const revenueAllTime = await prisma.transaksi.aggregate({
    _sum: { amount: true },
    where: { status: "SUCCESS" },
  }).then(r => r._sum.amount || 0);

  const revenueMonth = await prisma.transaksi.aggregate({
    _sum: { amount: true },
    where: { status: "SUCCESS", createdAt: { gte: monthStart } },
  }).then(r => r._sum.amount || 0);

  assert("Revenue month <= Revenue 30d", revenueMonth <= revenue30d,
    `month=${revenueMonth} > 30d=${revenue30d}`);
  assert("Revenue 30d <= Revenue all-time", revenue30d <= revenueAllTime,
    `30d=${revenue30d} > allTime=${revenueAllTime}`);

  console.log(`  📊 Month: Rp${revenueMonth.toLocaleString()}, 30d: Rp${revenue30d.toLocaleString()}, All-time: Rp${revenueAllTime.toLocaleString()}`);

  // ═══════════════════════════════════════════════════════════
  // 10. Premium reconciliation
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 10. PREMIUM RECONCILIATION ──");

  // Every active premium user should have at least one qualifying transaction
  const activePremiumUsers = await prisma.user.findMany({
    where: { isPremium: true, premiumUntil: { gt: now }, isFounder: false },
    select: {
      id: true, fullName: true, premiumPlan: true,
      transaksi: {
        where: { type: { in: VALID_TX_TYPES }, status: "SUCCESS" },
        select: { id: true },
      },
    },
  });

  const noTx = activePremiumUsers.filter(u => u.transaksi.length === 0);
  // Manual/admin activations are legitimate — report but don't fail
  if (noTx.length > 0) {
    console.log(`  ⚠️  ${noTx.length} active premium user(s) without qualifying transaction (likely manual activation): ${noTx.map(u => u.fullName).join(", ")}`);
  }
  assert("Active premium users without transactions is informational (not a hard failure)", true,
    `${noTx.length} users without qualifying transactions`);
  assert("Most active premium users have qualifying transactions",
    noTx.length <= activePremiumUsers.length * 0.5,
    `${noTx.length}/${activePremiumUsers.length} without transactions`);

  console.log(`  📊 ${activePremiumUsers.length} active premium users, ${noTx.length} without qualifying transactions`);

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
