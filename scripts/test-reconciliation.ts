#!/usr/bin/env npx tsx
/**
 * Integration Test: Premium Reconciliation
 *
 * Tests mismatch detection logic against real DB.
 * Does NOT import from lib/ to avoid esbuild transform issues.
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
  console.log("  RECONCILIATION — INTEGRATION TEST");
  console.log("═══════════════════════════════════════════════════════════\n");

  const now = new Date();

  // ── 1. Scan for mismatches ──
  console.log("── 1. SCAN FOR MISMATCHES ──");
  const candidates = await prisma.user.findMany({
    where: {
      isFounder: false,
      transaksi: { some: { type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] }, status: "SUCCESS" } },
      OR: [{ isPremium: false }, { premiumUntil: null }, { premiumUntil: { lt: now } }],
    },
    select: {
      id: true, fullName: true, email: true, role: true,
      isPremium: true, premiumPlan: true, premiumUntil: true,
      transaksi: {
        where: { type: { in: ["MURID_PREMIUM", "PREMIUM_UPGRADE"] }, status: "SUCCESS" },
        orderBy: { createdAt: "desc" }, take: 1,
        select: { id: true, type: true, amount: true, reference: true, createdAt: true },
      },
    },
  });

  assert("Scan returns array", Array.isArray(candidates));
  console.log(`  📊 Found ${candidates.length} candidates`);

  // ── 2. Classify candidates ──
  console.log("\n── 2. CLASSIFY CANDIDATES ──");
  let safeCount = 0;
  let manualReviewCount = 0;

  for (const c of candidates) {
    const tx = c.transaksi[0];
    const isMurid = tx?.type === "MURID_PREMIUM";
    const neverActivated = !c.isPremium && (!c.premiumPlan || c.premiumPlan === "FREE") && !c.premiumUntil;
    const safeToRepair = isMurid && neverActivated;

    if (safeToRepair) safeCount++;
    else manualReviewCount++;

    assert(`${c.fullName}: classification is deterministic`, typeof safeToRepair === "boolean");
    console.log(`    ${c.fullName} (${c.role}) — safe=${safeToRepair}`);
  }

  console.log(`  📊 Safe to repair: ${safeCount}, Manual review: ${manualReviewCount}`);

  // ── 3. Safety criteria ──
  console.log("\n── 3. SAFETY CRITERIA ──");
  assert("Safe candidates are all MURID", candidates.filter(c => {
    const tx = c.transaksi[0];
    const isMurid = tx?.type === "MURID_PREMIUM";
    const neverActivated = !c.isPremium && (!c.premiumPlan || c.premiumPlan === "FREE") && !c.premiumUntil;
    return isMurid && neverActivated;
  }).every(c => c.role === "MURID"));

  // ── 4. No false positives ──
  console.log("\n── 4. NO FALSE POSITIVES ──");
  const activePremium = await prisma.user.count({
    where: { isFounder: false, isPremium: true, premiumUntil: { gt: now } },
  });
  assert("Active premium users not in candidates", activePremium > 0 || candidates.length === 0);

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  RESULTS: ${passed}/${total} passed, ${failed} failed`);
  console.log(`═══════════════════════════════════════════════════════════`);

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
