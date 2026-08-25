/**
 * P4.1 — Payment Integrity Fix verification tests.
 *
 * Verifies all 3 fixes from P4_MURID_PREMIUM_PAYMENT_VERIFICATION.md:
 *   1. Transaction ordering: local Transaksi BEFORE Midtrans Snap
 *   2. No swallowed DB errors for payment-critical writes
 *   3. Webhook amount validation against local transaction
 *
 * Run: npx tsx scripts/test-p4.1-payment-integrity.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

const checkout = read("app/api/billing/checkout/route.ts");
const webhook = read("app/api/payment/webhook/route.ts");

let passed = 0;
let failed = 0;
function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      passed++;
      console.log(`  ✅ ${name}`);
    } else {
      failed++;
      console.log(`  ❌ ${name}`);
    }
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name}: ${e instanceof Error ? e.message : e}`);
  }
}

console.log("\n════════════════════════════════════════════");
console.log("  P4.1 PAYMENT INTEGRITY FIX — Tests");
console.log("════════════════════════════════════════════\n");

// ──────────────────────────────────────────────────
// FIX 1 — Transaction ordering
// ──────────────────────────────────────────────────
console.log("── FIX 1: Transaction ordering ──");

// The checkout route must create the local Transaksi record BEFORE calling
// Midtrans Snap. We verify this by checking the source code order:
// "transaksi.create" must appear BEFORE "createMidtransSnapTransaction".

test("F1.1. Transaksi.create appears BEFORE createMidtransSnapTransaction in checkout", () => {
  const createIdx = checkout.indexOf("db.transaksi.create");
  const snapIdx = checkout.indexOf("createMidtransSnapTransaction(");
  return createIdx !== -1 && snapIdx !== -1 && createIdx < snapIdx;
});

// The transaksiId variable must be set BEFORE the Snap call (not after).
test("F1.2. transaksiId is assigned before Snap call", () => {
  // Find the assignment to transaksiId (the create call) and the Snap call
  const lines = checkout.split("\n");
  let transaksiIdLine = -1;
  let snapCallLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("transaksiId = created.id")) transaksiIdLine = i;
    if (lines[i].includes("createMidtransSnapTransaction")) snapCallLine = i;
  }
  return transaksiIdLine !== -1 && snapCallLine !== -1 && transaksiIdLine < snapCallLine;
});

// If DB create fails, checkout MUST return an error (not continue).
test("F1.3. DB write failure returns CHECKOUT_DB_FAILED error", () => {
  return checkout.includes('err("CHECKOUT_DB_FAILED"');
});

// If DB create fails, Midtrans Snap MUST NOT be called.
// We verify by checking that the catch block for db.transaksi.create
// returns an error (via err()) before reaching the Snap call.
test("F1.4. DB failure catch block returns error before Snap call", () => {
  // Find the db.transaksi.create try-catch block
  const createTryStart = checkout.indexOf("db.transaksi.create");
  if (createTryStart === -1) return false;
  // Find the catch block after the create
  const afterCreate = checkout.substring(createTryStart);
  const catchBlock = afterCreate.indexOf("} catch (dbError");
  if (catchBlock === -1) return false;
  // The catch block should contain "return err" before the Snap call
  const catchContent = afterCreate.substring(0, afterCreate.indexOf("Step 7"));
  return catchContent.includes('return err("CHECKOUT_DB_FAILED"');
});

// If Midtrans fails AFTER local Transaksi exists, the record must be
// marked as FAILED (not left in ambiguous PENDING).
test("F1.5. Snap failure marks Transaksi as FAILED", () => {
  return (
    checkout.includes('data: { status: "FAILED" }') &&
    checkout.includes("Failed to mark Transaksi as FAILED after Midtrans error")
  );
});

// The Snap failure handler should update by transaksiId (not orderId).
test("F1.6. Snap failure cleanup uses transaksiId (not orderId)", () => {
  const snapErrorBlock = checkout.substring(
    checkout.indexOf("Midtrans failed AFTER local Transaksi")
  );
  return snapErrorBlock.includes("where: { id: transaksiId }") &&
    snapErrorBlock.includes('data: { status: "FAILED" }');
});

// ──────────────────────────────────────────────────
// FIX 2 — No swallowed DB errors for payment-critical writes
// ──────────────────────────────────────────────────
console.log("\n── FIX 2: No swallowed payment-critical DB errors ──");

// The db.transaksi.create catch block must NOT be empty.
test("F2.1. Transaksi create catch block is not empty", () => {
  // Find the catch for db.transaksi.create
  const createIdx = checkout.indexOf("db.transaksi.create");
  if (createIdx === -1) return false;
  const afterCreate = checkout.substring(createIdx);
  const catchIdx = afterCreate.indexOf("} catch (dbError");
  if (catchIdx === -1) return false;
  // Extract the catch block content
  const catchStart = afterCreate.indexOf("{", catchIdx);
  const catchEnd = afterCreate.indexOf("}", catchStart + 1);
  const catchContent = afterCreate.substring(catchStart + 1, catchEnd);
  return catchContent.trim().length > 5; // not just whitespace or comment
});

// The Transaksi create catch must log the error with request context.
test("F2.2. Transaksi create error is logged with request context", () => {
  return checkout.includes("[Checkout:${requestId}] DB write failed — payment-critical");
});

// The Transaksi create catch must return an HTTP error response.
test("F2.3. Transaksi create error returns HTTP error response", () => {
  return checkout.includes('return err("CHECKOUT_DB_FAILED"');
});

// Coupon usage write failure should still be best-effort (non-critical).
// This is correct behavior — coupon tracking is non-payment-critical.
test("F2.4. Coupon usage write is still best-effort (non-payment-critical)", () => {
  return (
    checkout.includes("Kupon usage write failed, continuing") &&
    checkout.includes("best-effort")
  );
});

// Founder/Admin user update failure is also acceptable to swallow
// (not payment-critical — bypass path, no Midtrans involved).
test("F2.5. Founder/Admin bypass user update is non-critical (acceptable)", () => {
  // The founder bypass has a try-catch around user.update that swallows errors
  const founderBlock = checkout.substring(
    checkout.indexOf("Founder/Admin bypass"),
    checkout.indexOf("Determine transaction type")
  );
  return founderBlock.includes("} catch {}");
});

// ──────────────────────────────────────────────────
// FIX 3 — Webhook amount validation
// ──────────────────────────────────────────────────
console.log("\n── FIX 3: Webhook amount validation ──");

// The webhook must compare grossAmount against transaksi.amount.
test("F3.1. Webhook validates grossAmount against transaksi.amount", () => {
  return (
    webhook.includes("grossAmount !== transaksi.amount") &&
    webhook.includes("Amount mismatch")
  );
});

// Amount mismatch must NOT activate Premium.
test("F3.2. Amount mismatch does NOT activate Premium (returns early)", () => {
  // The mismatch check should return before the claim-first idempotency block
  const amountCheckIdx = webhook.indexOf("grossAmount !== transaksi.amount");
  const claimFirstIdx = webhook.indexOf("CLAIM-FIRST IDEMPOTENCY");
  return amountCheckIdx !== -1 && claimFirstIdx !== -1 && amountCheckIdx < claimFirstIdx;
});

// Amount mismatch must return a non-200 status (not silently succeed).
test("F3.3. Amount mismatch returns non-200 status", () => {
  const amountBlock = webhook.substring(
    webhook.indexOf("grossAmount !== transaksi.amount"),
    webhook.indexOf("already_success_ignored") || webhook.length
  );
  return amountBlock.includes("status: 400") || amountBlock.includes("status:400");
});

// Amount validation uses local transaction amount as canonical.
test("F3.4. Amount validation uses local Transaksi (not plan price)", () => {
  return webhook.includes("localAmount: transaksi.amount");
});

// Amount validation logs enough context for investigation.
test("F3.5. Amount mismatch logs diagnostic context", () => {
  return (
    webhook.includes("midtransAmount: grossAmount") &&
    webhook.includes("localAmount: transaksi.amount")
  );
});

// ──────────────────────────────────────────────────
// REGRESSION — Existing security preserved
// ──────────────────────────────────────────────────
console.log("\n── Regression: Existing security preserved ──");

test("R1. SHA512 signature verification still intact", () => {
  return (
    webhook.includes('createHash("sha512")') &&
    webhook.includes("update(orderId + statusCode + grossAmount + serverKey)")
  );
});

test("R2. Signature mismatch still returns 401", () => {
  return webhook.includes('{ error: "Invalid signature" }, { status: 401 }');
});

test("R3. Claim-first idempotency still intact", () => {
  return (
    webhook.includes("status: { not: \"SUCCESS\" }") &&
    webhook.includes("tx.transaksi.updateMany") &&
    webhook.includes("claim.count === 0")
  );
});

test("R4. Downgrade guard still intact", () => {
  return webhook.includes('"already_success_ignored"');
});

test("R5. Unknown order returns 200 (Midtrans contract)", () => {
  return webhook.includes('{ ok: true, warning: "unknown_order" }');
});

test("R6. Premium stacking logic still intact", () => {
  return (
    webhook.includes("user.premiumUntil > now") &&
    webhook.includes("durationDays * 24 * 60 * 60 * 1000")
  );
});

test("R7. Checkout role gating still intact", () => {
  return (
    checkout.includes('plan.targetRole === "GURU" && user.role !== "GURU"') &&
    checkout.includes('plan.targetRole === "MURID" && user.role !== "MURID"')
  );
});

test("R8. Founder/Admin bypass still works", () => {
  return checkout.includes("user.isFounder || user.role === \"ADMIN\"");
});

test("R9. Stale pending cleanup still works", () => {
  return checkout.includes("EXPIRED") && checkout.includes("2 * 60 * 1000");
});

// ──────────────────────────────────────────────────
// SUMMARY
// ──────────────────────────────────────────────────
console.log("\n════════════════════════════════════════════");
console.log(`  P4.1 Results: ${passed} passed, ${failed} failed`);
console.log("════════════════════════════════════════════\n");

if (failed > 0) {
  console.log("P4.1 FAIL ❌");
  process.exit(1);
}

console.log("P4.1 PASS ✅");
process.exit(0);
