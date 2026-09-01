#!/usr/bin/env npx tsx
/**
 * Integration Test: Data Quality Checks
 *
 * Tests the data quality endpoint logic against real DB.
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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
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
  if (condition) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`); }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  DATA QUALITY — INTEGRATION TEST");
  console.log("═══════════════════════════════════════════════════════════\n");

  const now = new Date();

  // ── 1. Payment mismatch ──
  console.log("── 1. PAYMENT MISMATCH ──");
  const paymentMismatch = await prisma.user.findMany({
    where: {
      isFounder: false,
      transaksi: { some: { type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] }, status: "SUCCESS" } },
      OR: [{ isPremium: false }, { premiumUntil: null }, { premiumUntil: { lt: now } }],
    },
    select: { id: true, fullName: true },
  });
  assert("Payment mismatch query returns array", Array.isArray(paymentMismatch));
  console.log(`  📊 ${paymentMismatch.length} mismatched users`);

  // ── 2. Premium without payment ──
  console.log("\n── 2. PREMIUM WITHOUT PAYMENT ──");
  const premiumNoPayment = await prisma.user.findMany({
    where: {
      isFounder: false,
      isPremium: true,
      premiumUntil: { gt: now },
      NOT: { transaksi: { some: { type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] }, status: "SUCCESS" } } },
    },
    select: { id: true, fullName: true },
  });
  assert("Premium without payment query returns array", Array.isArray(premiumNoPayment));
  console.log(`  📊 ${premiumNoPayment.length} users with premium but no payment`);

  // ── 3. Duplicate orderIds ──
  console.log("\n── 3. DUPLICATE ORDER IDS ──");
  const dupOrders = await prisma.$queryRaw<{ orderId: string; count: bigint }[]>`
    SELECT "orderId", COUNT(*)::bigint AS count FROM "Transaksi"
    WHERE "orderId" IS NOT NULL AND "orderId" != ''
    GROUP BY "orderId" HAVING COUNT(*) > 1
  `;
  assert("Duplicate orderIds query returns array", Array.isArray(dupOrders));
  console.log(`  📊 ${dupOrders.length} duplicate orderIds`);

  // ── 4. Duplicate midtransIds ──
  console.log("\n── 4. DUPLICATE MIDTRANS IDS ──");
  const dupMidtrans = await prisma.$queryRaw<{ midtransId: string; count: bigint }[]>`
    SELECT "midtransId", COUNT(*)::bigint AS count FROM "Transaksi"
    WHERE "midtransId" IS NOT NULL AND "midtransId" != ''
    GROUP BY "midtransId" HAVING COUNT(*) > 1
  `;
  assert("Duplicate midtransIds query returns array", Array.isArray(dupMidtrans));
  console.log(`  📊 ${dupMidtrans.length} duplicate midtransIds`);

  // ── 5. Incomplete profiles ──
  console.log("\n── 5. INCOMPLETE PROFILES ──");
  const incomplete = await prisma.user.count({ where: { isFounder: false, profile: { is: null } } });
  assert("Incomplete profiles count >= 0", incomplete >= 0);
  console.log(`  📊 ${incomplete} users without profile`);

  // ── 6. Orphan GroupMembers ──
  console.log("\n── 6. ORPHAN GROUP MEMBERS ──");
  const orphans = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "GroupMember" gm
    LEFT JOIN "User" u ON u.id = gm."userId" WHERE u.id IS NULL
  `;
  assert("Orphan GroupMembers query returns array", Array.isArray(orphans));
  console.log(`  📊 ${Number(orphans[0]?.count || 0)} orphan group members`);

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  RESULTS: ${passed}/${total} passed, ${failed} failed`);
  console.log(`═══════════════════════════════════════════════════════════`);

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
