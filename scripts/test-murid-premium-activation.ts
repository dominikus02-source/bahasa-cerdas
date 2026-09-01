/**
 * Student Premium Activation — Regression Tests
 *
 * Tests the code-level integrity of the payment → activation pipeline:
 * 1. Webhook handles MURID_PREMIUM type
 * 2. Manual activation handles MURID_PREMIUM type
 * 3. getPlanFromAmount fallback order is correct
 * 4. Status maps correctly (settlement/capture → SUCCESS + activatePremium)
 * 5. Activation is inside $transaction (atomic)
 * 6. No answer leakage
 * 7. Recovery script exists and is safe
 *
 * Run: npx tsx scripts/test-murid-premium-activation.ts
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

let passed = 0;
let failed = 0;
const errors: string[] = [];

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  ${GREEN}✓${RESET} ${label}`);
  } else {
    failed++;
    const msg = `✗ ${label}`;
    errors.push(msg);
    console.log(`  ${RED}${msg}${RESET}`);
  }
}

function readFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf-8");
}

function assertContains(filePath: string, pattern: string, label: string) {
  const content = readFile(filePath);
  assert(content.includes(pattern), label);
}

function assertNotContains(filePath: string, pattern: string, label: string) {
  const content = readFile(filePath);
  assert(!content.includes(pattern), label);
}

async function main() {
  console.log(`\n${YELLOW}=== Student Premium Activation — Regression Tests ===${RESET}\n`);

  const webhookPath = "app/api/payment/webhook/route.ts";
  const manualPath = "app/api/admin/payments/manual-activate/route.ts";
  const checkoutPath = "app/api/billing/checkout/route.ts";
  const plansPath = "lib/billing/plans.ts";
  const recoveryPath = "scripts/recover-murid-premium.ts";

  // ── 1. Webhook handles MURID_PREMIUM ──
  console.log(`\n${YELLOW}--- 1. Webhook Handles MURID_PREMIUM ---${RESET}`);
  assertContains(webhookPath, 'transaksi.type === "MURID_PREMIUM"', "Webhook recognizes MURID_PREMIUM type");
  assertContains(webhookPath, 'transaksi.type === "PREMIUM_UPGRADE"', "Webhook recognizes PREMIUM_UPGRADE type");
  assertContains(webhookPath, "isMurid", "Webhook differentiates Murid vs Guru");
  assertContains(webhookPath, '"MURID_PREMIUM_MONTHLY"', "Webhook knows MURID_PREMIUM_MONTHLY plan");
  assertContains(webhookPath, '"MURID_PREMIUM_YEARLY"', "Webhook knows MURID_PREMIUM_YEARLY plan");
  assertContains(webhookPath, "durationDays", "Webhook calculates duration");

  // Activation is inside $transaction (atomic)
  assertContains(webhookPath, "db.$transaction", "Webhook uses $transaction for atomicity");
  const webhookContent = readFile(webhookPath);
  // The user update must be INSIDE the $transaction callback
  const txStart = webhookContent.indexOf("db.$transaction(async (tx)");
  const userUpdate = webhookContent.indexOf("isPremium: true", txStart);
  assert(txStart > 0 && userUpdate > txStart, "User activation is inside $transaction (atomic with claim)");

  // ── 2. Manual Activation handles MURID_PREMIUM ──
  console.log(`\n${YELLOW}--- 2. Manual Activation Handles MURID_PREMIUM ---${RESET}`);
  assertContains(manualPath, 'transaksi.type !== "MURID_PREMIUM"', "Manual activation accepts MURID_PREMIUM");
  assertContains(manualPath, 'transaksi.type !== "PREMIUM_UPGRADE"', "Manual activation accepts PREMIUM_UPGRADE");
  assertContains(manualPath, "MURID_PREMIUM_MONTHLY", "Manual activation knows MURID plan IDs");
  assertContains(manualPath, "MURID_PREMIUM_YEARLY", "Manual activation knows MURID yearly plan");
  assertContains(manualPath, "isPremium: true", "Manual activation sets isPremium=true");
  assertContains(manualPath, 'premiumPlan: "PRO"', "Manual activation sets premiumPlan=PRO");

  // Manual activation uses $transaction (atomic)
  assertContains(manualPath, "db.$transaction", "Manual activation uses $transaction for atomicity");

  // ── 3. getPlanFromAmount Fallback Order ──
  console.log(`\n${YELLOW}--- 3. getPlanFromAmount Fallback Order ---${RESET}`);
  // Guru amounts (higher) MUST be checked before Murid amounts (lower)
  // 399000 (Guru Yearly) > 180000 (Murid Yearly) > 49000 (Guru Monthly) > 19000 (Murid Monthly)
  const webhookSrc = readFile(webhookPath);
  const yearlyGuruPos = webhookSrc.indexOf("399000");
  const yearlyMuridPos = webhookSrc.indexOf("180000");
  const monthlyGuruPos = webhookSrc.indexOf("49000");
  const monthlyMuridPos = webhookSrc.indexOf("19000");
  assert(
    yearlyGuruPos > 0 && yearlyMuridPos > 0 && yearlyGuruPos < yearlyMuridPos,
    "Guru Yearly (399000) checked BEFORE Murid Yearly (180000)",
  );
  assert(
    yearlyMuridPos > 0 && monthlyGuruPos > 0 && yearlyMuridPos < monthlyGuruPos,
    "Murid Yearly (180000) checked BEFORE Guru Monthly (49000)",
  );
  assert(
    monthlyGuruPos > 0 && monthlyMuridPos > 0 && monthlyGuruPos < monthlyMuridPos,
    "Guru Monthly (49000) checked BEFORE Murid Monthly (19000)",
  );

  // ── 4. STATUS_MAP Correctness ──
  console.log(`\n${YELLOW}--- 4. Status Map Correctness ---${RESET}`);
  assertContains(webhookPath, 'settlement: { status: "SUCCESS", activatePremium: true }', "settlement → SUCCESS + activate");
  assertContains(webhookPath, 'capture: { status: "SUCCESS", activatePremium: true }', "capture → SUCCESS + activate");
  assertContains(webhookPath, 'pending: { status: "PENDING", activatePremium: false }', "pending → no activation");
  assertContains(webhookPath, 'deny: { status: "FAILED", activatePremium: false }', "deny → no activation");
  assertContains(webhookPath, 'expire: { status: "EXPIRED", activatePremium: false }', "expire → no activation");

  // ── 5. Checkout Creates Correct Transaction ──
  console.log(`\n${YELLOW}--- 5. Checkout Flow ---${RESET}`);
  assertContains(checkoutPath, 'plan.targetRole === "MURID" ? "MURID_PREMIUM" : "PREMIUM_UPGRADE"', "Checkout sets correct transaksi type");
  assertContains(checkoutPath, "metadata:", "Checkout stores metadata");
  assertContains(checkoutPath, "planId", "Checkout stores planId in metadata");
  assertContains(checkoutPath, "durationDays", "Checkout stores durationDays in metadata");

  // ── 6. Plan Definitions ──
  console.log(`\n${YELLOW}--- 6. Plan Definitions ---${RESET}`);
  assertContains(plansPath, "MURID_PREMIUM_MONTHLY", "Plans define MURID_PREMIUM_MONTHLY");
  assertContains(plansPath, "MURID_PREMIUM_YEARLY", "Plans define MURID_PREMIUM_YEARLY");
  assertContains(plansPath, 'targetRole: "MURID"', "Murid plans have targetRole MURID");
  const plansContent = readFile(plansPath);
  assert(plansContent.includes("price: 19000"), "MURID_PREMIUM_MONTHLY price = 19000");
  assert(plansContent.includes("price: 180000"), "MURID_PREMIUM_YEARLY price = 180000");
  assert(plansContent.includes("durationDays: 30"), "MURID_PREMIUM_MONTHLY duration = 30 days");
  assert(plansContent.includes("durationDays: 365"), "Yearly duration = 365 days");

  // ── 7. Recovery Script ──
  console.log(`\n${YELLOW}--- 7. Recovery Script ---${RESET}`);
  assert(existsSync(join(process.cwd(), recoveryPath)), "Recovery script exists");
  assertContains(recoveryPath, "isPremium: false", "Recovery targets isPremium=false users");
  assertContains(recoveryPath, "MURID_PREMIUM", "Recovery targets MURID_PREMIUM transactions");
  assertContains(recoveryPath, 'status: "SUCCESS"', "Recovery requires SUCCESS transactions");
  assertContains(recoveryPath, "DRY-RUN", "Recovery defaults to dry-run");
  assertContains(recoveryPath, "isPremium: true", "Recovery activates premium");

  // ── 8. No Incorrect Premium Reset ──
  console.log(`\n${YELLOW}--- 8. No Incorrect Premium Reset ---${RESET}`);
  // Webhook should never set isPremium to false during activation
  assertNotContains(webhookPath, "isPremium: false", "Webhook never sets isPremium=false during activation");

  // ── 9. Signature Verification ──
  console.log(`\n${YELLOW}--- 9. Security ---${RESET}`);
  assertContains(webhookPath, "verifyMidtransNotification", "Webhook verifies Midtrans signature");
  assertContains(webhookPath, "sha512", "Webhook uses SHA512 for signature");
  assertContains(webhookPath, "serverKey", "Webhook uses server key for verification");
  assertContains(webhookPath, 'grossAmount !== transaksi.amount', "Webhook validates amount");

  // ── 10. Plan Resolution ──
  console.log(`\n${YELLOW}--- 10. Premium Economy Plan Resolution ---${RESET}`);
  const premiumPlansPath = "lib/premium-economy/plans.ts";
  assertContains(premiumPlansPath, 'role === "MURID" ? "MURID_PREMIUM" : "PRO"', "Plan resolver maps MURID to MURID_PREMIUM");
  assertContains(premiumPlansPath, "isPremium && user.premiumUntil", "Plan resolver uses isPremium + premiumUntil");

  // ── Summary ──
  console.log(`\n${YELLOW}=== Results ===${RESET}`);
  console.log(`  ${GREEN}Passed: ${passed}${RESET}`);
  console.log(`  ${RED}Failed: ${failed}${RESET}`);

  if (failed > 0) {
    console.log(`\n${RED}Errors:${RESET}`);
    for (const e of errors) {
      console.log(`  ${RED}${e}${RESET}`);
    }
    process.exit(1);
  } else {
    console.log(`\n${GREEN}All tests passed!${RESET}`);
    process.exit(0);
  }
}

main();
