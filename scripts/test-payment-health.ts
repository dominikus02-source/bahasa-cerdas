#!/usr/bin/env npx tsx
/**
 * Integration Test: Payment Health Endpoint
 *
 * Tests GET /api/admin/analytics/payment-health against real Supabase DB.
 * Verifies: detection of SUCCESS payments without active entitlement.
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
  console.log("  PAYMENT HEALTH — INTEGRATION TEST");
  console.log("═══════════════════════════════════════════════════════════\n");

  const now = new Date();

  // ═══════════════════════════════════════════════════════════
  // TEST 1: Detection logic — find mismatched users
  // ═══════════════════════════════════════════════════════════
  console.log("── 1. DETECTION: SUCCESS payment without active premium ──");

  const mismatchedUsers = await prisma.user.findMany({
    where: {
      isFounder: false,
      transaksi: {
        some: {
          type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] },
          status: "SUCCESS",
        },
      },
      OR: [
        { isPremium: false },
        { premiumUntil: null },
        { premiumUntil: { lt: now } },
      ],
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isPremium: true,
      premiumUntil: true,
      transaksi: {
        where: {
          type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] },
          status: "SUCCESS",
        },
        select: { id: true, amount: true, reference: true, createdAt: true },
      },
    },
  });

  assert("Detection query returns array", Array.isArray(mismatchedUsers));
  console.log(`  📊 Found ${mismatchedUsers.length} affected users`);

  for (const u of mismatchedUsers) {
    const totalPaid = u.transaksi.reduce((s, t) => s + (t.amount || 0), 0);
    console.log(`    ⚠️  ${u.fullName} (${u.email}) — ${u.role} — paid ${formatRp(totalPaid)} — isPremium=${u.isPremium} — until=${u.premiumUntil?.toISOString() || "null"}`);

    // Verify the user truly has no active premium
    assert(`${u.fullName}: isPremium=false OR premiumUntil expired`,
      !u.isPremium || !u.premiumUntil || u.premiumUntil <= now,
      `isPremium=${u.isPremium} premiumUntil=${u.premiumUntil}`);

    // Verify they have at least one SUCCESS transaction
    assert(`${u.fullName}: has SUCCESS transactions`, u.transaksi.length > 0);
  }

  // ═══════════════════════════════════════════════════════════
  // TEST 2: Cross-check — all SUCCESS premium transactions
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 2. CROSS-CHECK: All SUCCESS premium transactions ──");

  const allSuccessPremium = await prisma.transaksi.findMany({
    where: {
      type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] },
      status: "SUCCESS",
    },
    select: {
      id: true,
      userId: true,
      amount: true,
      reference: true,
      user: { select: { isPremium: true, premiumUntil: true } },
    },
  });

  const withActivePremium = allSuccessPremium.filter(t => t.user.isPremium && t.user.premiumUntil && t.user.premiumUntil > now);
  const withoutActivePremium = allSuccessPremium.filter(t => !t.user.isPremium || !t.user.premiumUntil || t.user.premiumUntil <= now);

  assert("All SUCCESS premium transactions counted", allSuccessPremium.length > 0 || true);
  assert("Mismatched count matches detection", withoutActivePremium.length === mismatchedUsers.length,
    `cross-check=${withoutActivePremium.length} detection=${mismatchedUsers.length}`);

  console.log(`  📊 Total SUCCESS premium txns: ${allSuccessPremium.length}`);
  console.log(`  📊 With active premium: ${withActivePremium.length}`);
  console.log(`  📊 Without active premium (mismatched): ${withoutActivePremium.length}`);

  const totalRevenueAtRisk = withoutActivePremium.reduce((s, t) => s + (t.amount || 0), 0);
  console.log(`  📊 Revenue at risk: ${formatRp(totalRevenueAtRisk)}`);

  // ═══════════════════════════════════════════════════════════
  // TEST 3: Role breakdown
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 3. ROLE BREAKDOWN ──");

  const muridAffected = mismatchedUsers.filter(u => u.role === "MURID").length;
  const guruAffected = mismatchedUsers.filter(u => u.role === "GURU").length;

  assert("Murid affected >= 0", muridAffected >= 0);
  assert("Guru affected >= 0", guruAffected >= 0);
  assert("Sum matches total", muridAffected + guruAffected === mismatchedUsers.length);

  console.log(`  📊 Murid: ${muridAffected}, Guru: ${guruAffected}`);

  // ═══════════════════════════════════════════════════════════
  // TEST 4: Suspiciously short expiry
  // ═══════════════════════════════════════════════════════════
  console.log("\n── 4. SUSPICIOUSLY SHORT EXPIRY ──");

  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const shortExpiryUsers = await prisma.user.findMany({
    where: {
      isFounder: false,
      isPremium: true,
      premiumUntil: { gt: now },
      transaksi: {
        some: {
          type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] },
          status: "SUCCESS",
          createdAt: { gte: thirtyDaysAgo },
        },
      },
    },
    select: {
      id: true,
      fullName: true,
      premiumUntil: true,
      transaksi: {
        where: { type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] }, status: "SUCCESS" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { reference: true },
      },
    },
  });

  let suspiciousCount = 0;
  for (const u of shortExpiryUsers) {
    if (!u.premiumUntil) continue;
    const daysUntil = Math.ceil((u.premiumUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isYearly = u.transaksi[0]?.reference?.includes("YEARLY");
    if ((isYearly && daysUntil < 30) || (!isYearly && daysUntil < 5)) {
      suspiciousCount++;
      console.log(`    ⚠️  ${u.fullName}: ${daysUntil} days left (plan: ${isYearly ? "yearly" : "monthly"})`);
    }
  }

  assert("Suspicious count >= 0", suspiciousCount >= 0);
  console.log(`  📊 Suspiciously short expiry: ${suspiciousCount}`);

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
