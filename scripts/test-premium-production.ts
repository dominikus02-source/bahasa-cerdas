/**
 * PREMIUM PRODUCTION CERTIFICATION — test suite (Step 1).
 *
 * Uji MURNI entitlement/period/matrix + statik webhook idempotency & keamanan.
 * Run: npx tsx scripts/test-premium-production.ts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolvePlanForUser,
} from "../lib/premium-economy/plans";
import {
  DEFAULT_ENTITLEMENT_MATRIX,
  entitlementValueToLimit,
} from "../lib/premium-economy/matrix";
import {
  getPeriodKey,
  startOfDayWIB,
} from "../lib/premium-economy/period";

const ROOT = join(__dirname, "..");
const read = (p: string) => {
  try { return readFileSync(join(ROOT, p), "utf8"); } catch { return ""; }
};

let passed = 0;
let failed = 0;
function test(name: string, fn: () => boolean) {
  try {
    if (fn()) { passed++; console.log(`  ✅ ${name}`); }
    else { failed++; console.log(`  ❌ ${name}`); }
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name}: ${e instanceof Error ? e.message : e}`);
  }
}

console.log("\n════════════════════════════════════════════");
console.log("  PREMIUM PRODUCTION CERTIFICATION — Step 1");
console.log("════════════════════════════════════════════\n");

/* ── A. Entitlement ── */
console.log("── A. Entitlement ──");
const user = (over: Record<string, unknown> = {}) => ({
  role: "GURU", isFounder: false, isPremium: false, premiumUntil: null, trialEndsAt: null, ...over,
});
test("A1. free user → FREE", () => resolvePlanForUser(user()).plan === "FREE");
test("A2. premium aktif → PRO", () =>
  resolvePlanForUser(user({ isPremium: true, premiumUntil: new Date(Date.now() + 86400_000) })).plan === "PRO");
test("A3. premium KADALUARSA → FREE (bukan PRO)", () =>
  resolvePlanForUser(user({ isPremium: true, premiumUntil: new Date(Date.now() - 1000) })).plan === "FREE");
test("A4. trial berjalan → PRO (TRIALING)", () =>
  resolvePlanForUser(user({ trialEndsAt: new Date(Date.now() + 86400_000) })).plan === "PRO" &&
  resolvePlanForUser(user({ trialEndsAt: new Date(Date.now() + 86400_000) })).subscriptionStatus === "TRIALING");
test("A5. founder → FOUNDER (selalu, walau premium kadaluarsa)", () =>
  resolvePlanForUser(user({ isFounder: true, isPremium: false })).plan === "FOUNDER");
test("A6. matrix FREE vs PRO berbeda (SIMULATION 3 vs 10)", () =>
  entitlementValueToLimit(DEFAULT_ENTITLEMENT_MATRIX.FREE.SIMULATION_MONTHLY_LIMIT) === 3 &&
  entitlementValueToLimit(DEFAULT_ENTITLEMENT_MATRIX.PRO.SIMULATION_MONTHLY_LIMIT) === 10);
test("A7. FOUNDER unlimited", () =>
  entitlementValueToLimit(DEFAULT_ENTITLEMENT_MATRIX.FOUNDER.SIMULATION_MONTHLY_LIMIT) === Infinity);

/* ── B. Period (WIB) ── */
console.log("\n── B. Period & timezone (WIB) ──");
test("B1. periodKey MONTH memakai WIB (UTC+7)", () => {
  const d = new Date(Date.UTC(2026, 0, 31, 17, 30)); // 1 Feb 2026 00:30 WIB
  return getPeriodKey("MONTH", d) === "2026-02";
});
test("B2. startOfDayWIB = 00:00 WIB (UTC 17:00 hari sebelumnya)", () => {
  const s = startOfDayWIB(new Date(Date.UTC(2026, 7, 11, 5, 0))); // 11 Agu 12:00 WIB
  return s.toISOString() === "2026-08-10T17:00:00.000Z";
});
test("B3. periodKey DAY konsisten lintas zona server", () => {
  const utc = new Date(Date.UTC(2026, 7, 10, 16, 59)); // 10 Agu 23:59 WIB
  const wibNext = new Date(Date.UTC(2026, 7, 10, 17, 1)); // 11 Agu 00:01 WIB
  return getPeriodKey("DAY", utc) === "2026-08-10" && getPeriodKey("DAY", wibNext) === "2026-08-11";
});

/* ── C. Webhook security & idempotency (statik) ── */
console.log("\n── C. Webhook ──");
const wh = read("app/api/payment/webhook/route.ts");
test("C1. signature SHA512 resmi (serverKey posisi terakhir)", () =>
  wh.includes('update(orderId + statusCode + grossAmount + serverKey)') &&
  wh.includes('createHash("sha512")'));
test("C2. signature tidak valid → 401 fail-closed", () =>
  wh.includes('{ error: "Invalid signature" }, { status: 401 }'));
test("C3. claim-first idempotensi (updateMany status not SUCCESS)", () =>
  wh.includes("status: { not: \"SUCCESS\" }") && wh.includes("tx.transaksi.updateMany"));
test("C4. klaim kalah → keluar idempotent (claim.count === 0)", () =>
  wh.includes("claim.count === 0"));
test("C5. efek finansial DI DALAM transaksi klaim (rollback aman)", () =>
  wh.includes("db.$transaction(async (tx) => {") &&
  wh.includes("tx.user.update") && wh.includes("premiumUntil"));
test("C6. KARYA_PURCHASE klaim Pembelian not PAID (sekali saja)", () =>
  wh.includes('status: { not: "PAID" }') && wh.includes("fresh.count === 0"));
test("C7. tidak ada aktivasi dari sinyal klien (tanpa success=true dari body)", () =>
  !/body\.success/.test(wh) && !wh.includes('success === true'));
test("C8. unknown order → 200 ok (kontrak Midtrans) + log", () =>
  wh.includes('{ ok: true, warning: "unknown_order" }'));
test("C9. downgrade guard: SUCCESS tidak bisa turun status", () =>
  wh.includes('"already_success_ignored"'));
test("C10. log observability premium.activated tanpa nilai secrets (hanya boolean set)", () =>
  wh.includes("[premium.activated]") &&
  !/console\.(log|error)\([^)]*serverKey\s*:\s*cfg\.serverKey\s*[,)}\)]/.test(wh) &&
  wh.includes("serverKeySet: Boolean(cfg.serverKey)"));

/* ── D. Authorization (statik) ── */
console.log("\n── D. Authorization ──");
const status = read("app/api/player/premium/status/route.ts");
test("D1. status premium auth-gated (401 tanpa sesi)", () =>
  status.includes("getUser()") && status.includes("401"));
test("D2. tanpa input plan/quota dari klien", () =>
  !status.includes("req.json") && !status.includes("body"));
const invoice = read("app/api/payment/create-invoice/route.ts");
test("D3. checkout auth-gated + whitelist plan", () =>
  invoice.includes("getUser()") && invoice.includes('["monthly", "yearly"].includes(plan)'));
test("D4. server-authoritative: klien tidak kirim premiumUntil/durasi", () =>
  !invoice.includes("premiumUntil") && !invoice.includes("durationDays"));

/* ── Summary ── */
console.log("\n════════════════════════════════════════════");
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log("════════════════════════════════════════════\n");
if (failed > 0) process.exit(1);
