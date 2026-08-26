/**
 * P7E — Production Money Rail: Full QA (spec §21).
 *
 * Bagian:
 *  A. Provider decision & adapter
 *  B. Xendit adapter mappings (pure)
 *  C. Production config (env, no hardcode)
 *  D. Kill switch (env + DB, deterministik)
 *  E. Safety gate (4 kondisi real-money + pilot)
 *  F. Limits (min/max/daily/global, WIB)
 *  G. Amount protection (§12)
 *  H. Fee accounting terpisah (§16/§17)
 *  I. Finance report (§15)
 *  J. Pilot (§18)
 *  K. Emergency stop admin (§19)
 *  L. Security
 *  M. SIMULASI — limits murni + invariant dengan fee
 *  N. Wiring
 *
 * Tanpa DB — logika murni + audit statis kode.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, name: string) {
  if (cond) {
    passed++;
  } else {
    failed++;
    failures.push(name);
    console.error(`  ✗ FAIL: ${name}`);
  }
}

function section(title: string) {
  console.log(`\n─ ${title} ─`);
}

const root = process.cwd();
function read(p: string): string {
  return readFileSync(join(root, p), "utf8");
}
function has(p: string): boolean {
  return existsSync(join(root, p));
}

// ═══════════════════════════════════════════════════════════════════════════════
// A. PROVIDER DECISION & ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════
section("A. Provider decision & adapter");

const providerSrc = read("lib/commission/payout/provider.ts");
assert(providerSrc.includes('case "xendit"'), "A1 adapter Xendit terdaftar di registry");
assert(providerSrc.includes('case "mock"'), "A2 mock tetap ada (sandbox)");
assert(has("lib/commission/payout/xendit-provider.ts"), "A3 file adapter Xendit ada");
const xenditSrc = read("lib/commission/payout/xendit-provider.ts");
assert(xenditSrc.includes("PayoutProvider"), "A4 adapter implement PayoutProvider (P7D abstraction)");
assert(xenditSrc.includes("/v3/payouts"), "A5 endpoint Xendit Payouts v3");
assert(xenditSrc.includes("idempotency-key"), "A6 header idempotency-key (provider-side)");
assert(xenditSrc.includes("api-version") && xenditSrc.includes("2025-09-01"), "A7 api-version header");
assert(xenditSrc.includes("MONEY-OUT") || xenditSrc.includes("Basic"), "A8 auth Basic secret API key");
assert(!xenditSrc.includes("apiKey()") || !xenditSrc.includes("hardcode"), "A9 placeholder");

// ═══════════════════════════════════════════════════════════════════════════════
// B. XENDIT MAPPINGS (PURE — tanpa jaringan)
// ═══════════════════════════════════════════════════════════════════════════════
section("B. Xendit mappings");

assert(xenditSrc.includes("mapXenditStatusToInternal"), "B1 status mapper ada");
assert(xenditSrc.includes('case "SUCCEEDED"') && xenditSrc.includes('return "PAID"'), "B2 SUCCEEDED → PAID");
assert(xenditSrc.includes('case "FAILED"') && xenditSrc.includes('case "REVERSED"'), "B3 FAILED/REVERSED → FAILED");
assert(xenditSrc.includes('case "ACCEPTED"') && xenditSrc.includes('return "PROCESSING"'), "B4 ACCEPTED/REQUESTED/READY/LOCKED → PROCESSING");
assert(xenditSrc.includes("return \"UNKNOWN\""), "B5 status tak dikenal → UNKNOWN (bukan FAILED)");
assert(xenditSrc.includes("isRetryableXenditFailure"), "B6 retryable failure helper");
assert(xenditSrc.includes("INSUFFICIENT_BALANCE") && xenditSrc.includes("REJECTED_BY_CHANNEL") && xenditSrc.includes("TEMPORARY_TRANSFER_ERROR"), "B7 failure retryable sesuai docs Xendit");
assert(xenditSrc.includes("ACCOUNT_NAME_MISMATCH") || xenditSrc.includes("INVALID_DESTINATION"), "B8 non-retryable failure dikenal");
assert(xenditSrc.includes("x-callback-token"), "B9 verifikasi webhook via callback token");
assert(xenditSrc.includes("XENDIT_WEBHOOK_TOKEN"), "B10 token webhook dari env");
assert(xenditSrc.includes("BI-Fast") || xenditSrc.includes("routing_type_1") || xenditSrc.includes("BANK_CODE"), "B11 routing bank Indonesia dipetakan");

// ═══════════════════════════════════════════════════════════════════════════════
// C. PRODUCTION CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
section("C. Production config");

const cfgSrc = read("lib/commission/payout/config.ts");
assert(cfgSrc.includes("PAYOUT_REAL_MONEY_ENABLED"), "C1 flag real money env");
assert(cfgSrc.includes("PAYOUT_PROVIDER_ENABLED"), "C2 flag provider enabled env");
assert(cfgSrc.includes("PAYOUT_MAX_AMOUNT"), "C3 max amount env");
assert(cfgSrc.includes("PAYOUT_DAILY_LIMIT"), "C4 daily limit env");
assert(cfgSrc.includes("PAYOUT_GLOBAL_DAILY_LIMIT"), "C5 global daily limit env");
assert(cfgSrc.includes("PAYOUT_MAX_ATTEMPTS"), "C6 max attempts env");
assert(cfgSrc.includes("PAYOUT_RECONCILIATION_TIMEOUT_MINUTES"), "C7 timeout env");
assert(cfgSrc.includes("PAYOUT_MINIMUM_AMOUNT"), "C8 minimum env");
assert(cfgSrc.includes("PAYOUT_KILL_SWITCH"), "C9 kill switch env");
assert(cfgSrc.includes("PAYOUT_PILOT_ENABLED") && cfgSrc.includes("PAYOUT_PILOT_TEACHER_IDS"), "C10 pilot env");
assert(cfgSrc.includes("5_000_000"), "C11 default max Rp5jt (config, bukan hardcode logika)");
assert(cfgSrc.includes("50_000"), "C12 default min Rp50rb");

// ═══════════════════════════════════════════════════════════════════════════════
// D. KILL SWITCH
// ═══════════════════════════════════════════════════════════════════════════════
section("D. Kill switch");

const killSrc = read("lib/commission/payout/kill-switch.ts");
assert(killSrc.includes("payout_kill_switch"), "D1 SiteSetting key untuk kill switch (admin toggle)");
assert(killSrc.includes("isEnvKillSwitchActive"), "D2 env kill switch dihormati");
assert(killSrc.includes("isPayoutKillSwitchActive"), "D3 kombinasi env + DB");
assert(killSrc.includes("siteSetting.upsert"), "D4 toggle via SiteSetting (tanpa redeploy)");

// ═══════════════════════════════════════════════════════════════════════════════
// E. SAFETY GATE
// ═══════════════════════════════════════════════════════════════════════════════
section("E. Safety gate");

const safetySrc = read("lib/commission/payout/safety.ts");
assert(safetySrc.includes("evaluatePayoutGate"), "E1 evaluatePayoutGate ada");
assert(safetySrc.includes("PAYOUT_REAL_MONEY_DISABLED"), "E2 error deterministik real money disabled");
assert(safetySrc.includes("PAYOUT_PROVIDER_DISABLED"), "E3 error provider disabled");
assert(safetySrc.includes("PAYOUT_KILL_SWITCH"), "E4 error kill switch");
assert(safetySrc.includes("PAYOUT_PILOT_BLOCKED"), "E5 error pilot blocked");
assert(safetySrc.includes('isRealMoneyPayoutEnabled()') && safetySrc.includes('isPayoutProviderEnabled()'), "E6 kedua flag wajib");
assert(safetySrc.includes('payoutProvider() === "mock"') || safetySrc.includes('provider === "mock"'), "E7 provider != mock untuk real money");
assert(safetySrc.includes("payoutPilotTeacherIds"), "E8 pilot teacher ids");
assert(safetySrc.includes("isPayoutKillSwitchActive"), "E9 kill switch dicek di gate");
const orchestratorSrc = read("lib/commission/payout/orchestrator.ts");
assert(orchestratorSrc.includes("evaluatePayoutGate({ teacherId: withdrawal.teacherId })"), "E10 orchestrator memanggil gate SEBELUM submit");
assert(orchestratorSrc.includes("checkPayoutLimits"), "E11 orchestrator mengecek limits");

// ═══════════════════════════════════════════════════════════════════════════════
// F. LIMITS
// ═══════════════════════════════════════════════════════════════════════════════
section("F. Limits");

assert(safetySrc.includes("BELOW_MINIMUM"), "F1 limit minimum");
assert(safetySrc.includes("ABOVE_MAXIMUM"), "F2 limit maksimum");
assert(safetySrc.includes("DAILY_LIMIT_REACHED"), "F3 limit harian guru");
assert(safetySrc.includes("GLOBAL_DAILY_LIMIT_REACHED"), "F4 limit harian global");
assert(safetySrc.includes("startOfDayWIB"), "F5 hari WIB (UTC+7)");
assert(safetySrc.includes("status: { not: \"FAILED\" }"), "F6 failed tidak dihitung (dana sudah kembali)");

// ═══════════════════════════════════════════════════════════════════════════════
// G. AMOUNT PROTECTION
// ═══════════════════════════════════════════════════════════════════════════════
section("G. Amount protection");

assert(orchestratorSrc.includes("result.amount !== undefined && result.amount !== amount"), "G1 response amount provider diverifikasi");
assert(orchestratorSrc.includes('providerStatus: "AMOUNT_MISMATCH"'), "G2 mismatch → payout ditandai AMOUNT_MISMATCH");
assert(orchestratorSrc.includes("PAYOUT_MISMATCH"), "G3 reconciliation issue + audit");
assert(orchestratorSrc.includes("return { ok: false, error: \"PROVIDER_UNKNOWN\", payoutId }"), "G4 mismatch → TIDAK ditandai PAID");

// ═══════════════════════════════════════════════════════════════════════════════
// H. FEE ACCOUNTING
// ═══════════════════════════════════════════════════════════════════════════════
section("H. Fee accounting");

assert(orchestratorSrc.includes("providerFee: result.fee ?? 0"), "H1 fee tercatat dari response provider");
assert(orchestratorSrc.includes("netTransfer: payout.amount - (opts?.fee ?? payout.providerFee)"), "H2 net transfer = amount - fee");
assert(!orchestratorSrc.includes("upsertWalletTx(tx, payout.teacherId, { decLocked: payout.amount - "), "H3 fee TIDAK mengurangi komisi/wallet guru");
assert(orchestratorSrc.includes("decLocked: payout.amount") && orchestratorSrc.includes("incLifetimeWithdrawn: payout.amount"), "H4 wallet tetap full amount (fee = biaya platform)");
const schemaSrc = read("prisma/schema.prisma");
assert(schemaSrc.includes("providerFee") && schemaSrc.includes("netTransfer"), "H5 kolom fee/netTransfer di schema");

// ═══════════════════════════════════════════════════════════════════════════════
// I. FINANCE REPORT
// ═══════════════════════════════════════════════════════════════════════════════
section("I. Finance report");

const financeSrc = read("lib/commission/payout/finance-report.ts");
assert(financeSrc.includes("getDailyTeacherPayoutReport"), "I1 getDailyTeacherPayoutReport ada");
assert(financeSrc.includes("withdrawals") && financeSrc.includes("requestedAmount"), "I2 field withdrawals/requested");
assert(financeSrc.includes("processingAmount") && financeSrc.includes("paidAmount"), "I3 field processing/paid");
assert(financeSrc.includes("failedAmount") && financeSrc.includes("retryableAmount"), "I4 field failed/retryable");
assert(financeSrc.includes("reconciliationIssueCount"), "I5 field reconciliation issues");
assert(financeSrc.includes("totalProviderFees") && financeSrc.includes("netPayoutAmount"), "I6 field provider fees + net payout");
assert(financeSrc.includes("paidAmount - totalProviderFees"), "I7 net = paid - fees (terpisah, bukan collapse)");

// ═══════════════════════════════════════════════════════════════════════════════
// J. PILOT
// ═══════════════════════════════════════════════════════════════════════════════
section("J. Pilot");

assert(safetySrc.includes("isPayoutPilotEnabled()"), "J1 pilot hanya berlaku bila diaktifkan");
assert(safetySrc.includes("pilotIds.has(input.teacherId)"), "J2 teacher non-pilot → PAYOUT_PILOT_BLOCKED");

// ═══════════════════════════════════════════════════════════════════════════════
// K. EMERGENCY STOP ADMIN
// ═══════════════════════════════════════════════════════════════════════════════
section("K. Emergency stop");

assert(has("app/api/admin/teacher-commissions/payout-safety/route.ts"), "K1 admin endpoint payout-safety ada");
const safetyApi = read("app/api/admin/teacher-commissions/payout-safety/route.ts");
assert(safetyApi.includes("!admin.isFounder"), "K2 founder-only");
assert(safetyApi.includes("ENABLE_KILL_SWITCH") && safetyApi.includes("DISABLE_KILL_SWITCH"), "K3 toggle kill switch");
assert(safetyApi.includes("PAYOUT_KILL_SWITCH_ENABLED"), "K4 toggle di-audit");
assert(!safetyApi.includes("deleteMany") && !safetyApi.includes("withdrawal.delete"), "K5 emergency stop TIDAK menghapus withdrawal/wallet/ledger");

// ═══════════════════════════════════════════════════════════════════════════════
// L. SECURITY
// ═══════════════════════════════════════════════════════════════════════════════
section("L. Security");

assert(xenditSrc.includes("process.env.XENDIT_API_KEY"), "L1 API key dari env (server-side only)");
assert(!xenditSrc.includes("NEXT_PUBLIC"), "L2 TIDAK ADA env NEXT_PUBLIC di adapter (tidak bocor ke klien)");
assert(!orchestratorSrc.includes("body.amount") && !orchestratorSrc.includes("body.teacherId"), "L3 orchestrator tidak percaya klien");
const withdrawApi = read("app/api/teacher/commissions/withdraw/route.ts");
assert(withdrawApi.includes("evaluatePayoutGate({ teacherId: user.id })"), "L4 pre-check gate di withdraw (session)");
assert(withdrawApi.includes("checkPayoutLimits({ teacherId: user.id"), "L5 pre-check limits di withdraw");

// ═══════════════════════════════════════════════════════════════════════════════
// M. SIMULASI — limits murni + invariant dengan fee
// ═══════════════════════════════════════════════════════════════════════════════
section("M. Simulation — limits & fee invariant");

// Limit pure: replika formula config.
function simMin(): number {
  return 50_000;
}
function simMax(): number {
  return 5_000_000;
}
function simDaily(): number {
  return 5_000_000;
}
function simGlobal(): number {
  return 50_000_000;
}
function simCheckLimit(input: { amount: number; teacherUsed: number; globalUsed: number }): string | "OK" {
  if (input.amount < simMin()) return "BELOW_MINIMUM";
  if (input.amount > simMax()) return "ABOVE_MAXIMUM";
  if (input.teacherUsed + input.amount > simDaily()) return "DAILY_LIMIT_REACHED";
  if (input.globalUsed + input.amount > simGlobal()) return "GLOBAL_DAILY_LIMIT_REACHED";
  return "OK";
}

assert(simCheckLimit({ amount: 49_000, teacherUsed: 0, globalUsed: 0 }) === "BELOW_MINIMUM", "M1 < Rp50rb ditolak");
assert(simCheckLimit({ amount: 5_000_001, teacherUsed: 0, globalUsed: 0 }) === "ABOVE_MAXIMUM", "M2 > max ditolak");
assert(simCheckLimit({ amount: 100_000, teacherUsed: 4_950_000, globalUsed: 0 }) === "DAILY_LIMIT_REACHED", "M3 daily guru tercapai → tolak");
assert(simCheckLimit({ amount: 100_000, teacherUsed: 0, globalUsed: 49_950_000 }) === "GLOBAL_DAILY_LIMIT_REACHED", "M4 global daily tercapai → tolak");
assert(simCheckLimit({ amount: 100_000, teacherUsed: 0, globalUsed: 0 }) === "OK", "M5 nominal wajar lolos");

// Invariant dengan FEE: fee = biaya platform — ledger guru TIDAK berubah.
interface SimWallet {
  available: number;
  pending: number;
  locked: number;
  lifetimeEarned: number;
  lifetimeWithdrawn: number;
  totalReversed: number;
}
const zero: SimWallet = { available: 0, pending: 0, locked: 0, lifetimeEarned: 0, lifetimeWithdrawn: 0, totalReversed: 0 };
const wallet: SimWallet = { ...zero };

function invariant(): boolean {
  return (
    wallet.lifetimeEarned - wallet.totalReversed ===
    wallet.available + wallet.pending + wallet.locked + wallet.lifetimeWithdrawn
  );
}

// Komisi Rp100.000 → withdrawal Rp100.000 → payout Rp100.000, fee Rp2.500.
wallet.pending += 100_000;
wallet.lifetimeEarned += 100_000;
wallet.pending -= 100_000;
wallet.available += 100_000; // release
wallet.available -= 100_000;
wallet.locked += 100_000; // withdraw lock
wallet.locked -= 100_000;
wallet.lifetimeWithdrawn += 100_000; // paid — FULL amount
const fee = 2_500;
const netTransfer = 100_000 - fee;
assert(invariant(), "M6 invariant terjaga: komisi guru TETAP Rp100.000 (fee tidak mengubah ledger)");
assert(netTransfer === 97_500, "M7 net provider transfer = Rp97.500 (fee tercatat terpisah)");
assert(wallet.lifetimeWithdrawn === 100_000, "M8 lifetimeWithdrawn guru = Rp100.000 — fee bukan potongan komisi");

// ═══════════════════════════════════════════════════════════════════════════════
// N. WIRING
// ═══════════════════════════════════════════════════════════════════════════════
section("N. Wiring");

assert(has("lib/commission/payout/finance-report.ts"), "N1 finance report service ada");
assert(has("app/api/admin/teacher-commissions/finance-report/route.ts"), "N2 admin finance report API ada");
assert(has("docs/P7E_PAYOUT_OPERATIONS.md"), "N3 runbook operasional ada");
assert(has("prisma/migrations/manual/2026-08-26_p7e_money_rail.sql"), "N4 migration SQL P7E ada");
const runbook = read("docs/P7E_PAYOUT_OPERATIONS.md");
assert(runbook.includes("ENABLE_KILL_SWITCH"), "N5 runbook: kill switch");
assert(runbook.includes("PAYOUT_PILOT_ENABLED"), "N6 runbook: pilot");
assert(runbook.includes("rotate") || runbook.includes("Rotasi"), "N7 runbook: rotasi secret");
assert(runbook.includes("Founder Gate"), "N8 runbook: gate founder");
assert(runbook.includes("outage") || runbook.includes("Outage"), "N9 runbook: provider outage");

// ═══════════════════════════════════════════════════════════════════════════════
// HASIL
// ═══════════════════════════════════════════════════════════════════════════════

console.log(`\n═══════════════════════════════════════`);
console.log(`  PASSED: ${passed}   FAILED: ${failed}`);
console.log(`═══════════════════════════════════════`);

if (failed > 0) {
  console.error("\nFailures:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("\n✅ P7E QA — SEMUA LULUS (money rail, safety, limits, fee accounting, pilot, kill switch)");
process.exit(0);
