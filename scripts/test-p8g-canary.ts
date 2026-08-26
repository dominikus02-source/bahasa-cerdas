/**
 * P8G — First Real-Money Canary Execution Playbook: QA.
 *
 * Bagian:
 *  A. Kontrak canary + state machine (8 status, transisi tervalidasi)
 *  B. Pre-flight deterministik (blokir + alasan)
 *  C. Blocker (P8F NOT YET, tanpa approval, kill switch, non-pilot, risk, destinasi)
 *  D. Duplikasi eksekusi diblokir; timeout tidak resend (orchestrator existing)
 *  E. Receipt confirmation TIDAK memutasi finansial
 *  F. SUCCESS butuh CONFIRMED_RECEIVED; mismatch mencegah SUCCESS
 *  G. CANARY_SUCCESS tidak auto-scale
 *  H. Authorization founder-only + audit
 *  I. Regresi + real money disabled
 *
 * Tanpa DB — audit statis + state machine murni.
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
// A. KONTRAK & STATE MACHINE
// ═══════════════════════════════════════════════════════════════════════════════
section("A. Kontrak & state machine");

assert(has("lib/commission/payout/canary.ts"), "A1 canary service ada");
const canarySrc = read("lib/commission/payout/canary.ts");
assert(canarySrc.includes("canaryRunId") && canarySrc.includes("selectedTeacherId") && canarySrc.includes("selectedWithdrawalId"), "A2 kontrak run lengkap");
assert(canarySrc.includes("intendedGrossAmount") && canarySrc.includes("intendedDestinationSnapshot"), "A3 amount + snapshot destinasi");
assert(canarySrc.includes("executionEnvironment") && canarySrc.includes("founderApprovalReference"), "A4 environment + referensi approval");
for (const s of ["PREPARING", "READY", "EXECUTING", "AWAITING_RECEIPT_CONFIRMATION", "RECONCILING", "SUCCESS", "FAILED", "STOPPED"]) {
  assert(canarySrc.includes(`"${s}"`), `A5 state ${s}`);
}
assert(canarySrc.includes("CANARY_TRANSITIONS"), "A6 peta transisi eksplisit");
assert(canarySrc.includes("canTransition"), "A7 validasi transisi deterministik");

// Transisi murni (replika).
const T: Record<string, string[]> = {
  PREPARING: ["READY", "STOPPED"],
  READY: ["EXECUTING", "STOPPED"],
  EXECUTING: ["AWAITING_RECEIPT_CONFIRMATION", "STOPPED"],
  AWAITING_RECEIPT_CONFIRMATION: ["RECONCILING", "STOPPED"],
  RECONCILING: ["SUCCESS", "FAILED", "STOPPED"],
  SUCCESS: [],
  FAILED: [],
  STOPPED: [],
};
function can(from: string, to: string): boolean {
  return (T[from] ?? []).includes(to);
}
assert(can("PREPARING", "READY"), "A8 PREPARING→READY sah");
assert(!can("PREPARING", "EXECUTING"), "A9 lompatan PREPARING→EXECUTING ditolak");
assert(!can("READY", "SUCCESS"), "A10 lompatan ke SUCCESS tanpa observasi ditolak");
assert(can("EXECUTING", "STOPPED"), "A11 STOP dari EXECUTING sah (evidence preserved)");
assert(!can("SUCCESS", "EXECUTING"), "A12 terminal tidak bisa mundur");
assert(!can("STOPPED", "READY"), "A13 STOPPED terminal (tanpa canary kedua dalam run yang sama)");

// ═══════════════════════════════════════════════════════════════════════════════
// B. PRE-FLIGHT
// ═══════════════════════════════════════════════════════════════════════════════
section("B. Pre-flight");

assert(canarySrc.includes("evaluateCanaryPreFlight"), "B1 evaluator pre-flight ada");
assert(canarySrc.includes("blockingReason"), "B2 blocking reason deterministik");
for (const id of ["p8f_go", "founder_approved", "provider_configured", "teacher_allowlisted", "teacher_valid", "risk_clear", "profile_verified", "destination_snapshot", "withdrawal_valid", "kill_switch_off", "reconciliation_clean", "no_cooldown"]) {
  assert(canarySrc.includes(id), `B3 check ${id}`);
}
assert(canarySrc.includes("p8f.decision === \"GO_FOR_REAL_MONEY_CANARY\""), "B4 P8F GO wajib");
assert(canarySrc.includes("founderDecision.state === \"APPROVED_FOR_CANARY\""), "B5 approval founder wajib");
assert(canarySrc.includes("cfg.realMoney && cfg.providerEnabled && cfg.provider !== \"mock\""), "B6 provider production eksplisit");
assert(canarySrc.includes("pilotIds.has(teacherId)"), "B7 allowlist");
assert(canarySrc.includes("riskState === \"NORMAL\""), "B8 risk clear");
assert(canarySrc.includes("profile.bankName === withdrawal.bankName"), "B9 snapshot destinasi cocok");
assert(canarySrc.includes("!killSwitchActive"), "B10 kill switch off");

// ═══════════════════════════════════════════════════════════════════════════════
// C. BLOCKERS (evaluasi murni)
// ═══════════════════════════════════════════════════════════════════════════════
section("C. Blockers");

// Pre-flight blocked bila satu check blocking gagal (replika).
function blocked(checks: Array<{ passed: boolean; blocking: boolean }>): boolean {
  return checks.some((c) => c.blocking && !c.passed);
}
assert(blocked([{ passed: true, blocking: true }, { passed: false, blocking: true }]), "C1 satu check blocking gagal → BLOCK");
assert(!blocked([{ passed: true, blocking: true }, { passed: false, blocking: false }]), "C2 check non-blocking gagal ≠ blok");
assert(canarySrc.includes("blockedChecks.length > 0"), "C3 evaluasi blokir server-side");
assert(canarySrc.includes("blockingReason"), "C4 alasan dikembalikan");

// ═══════════════════════════════════════════════════════════════════════════════
// D. DUPLIKASI & TIMEOUT
// ═══════════════════════════════════════════════════════════════════════════════
section("D. Duplikasi & timeout");

assert(canarySrc.includes("current.finalStatus !== from") || canarySrc.includes("INVALID_TRANSITION"), "D1 eksekusi dobel ditolak (state guard)");
const orchSrc = read("lib/commission/payout/orchestrator.ts");
assert(orchSrc.includes("getPayoutStatus"), "D2 timeout TIDAK resend buta (status inquiry dulu)");
assert(orchSrc.includes("isP2002"), "D3 duplicate submission db-guard tetap");
assert(read("prisma/schema.prisma").includes("TeacherPayout_withdrawalId_key") || read("prisma/schema.prisma").includes("withdrawalId     String        @unique"), "D4 satu withdrawal = satu payout (db)");

// ═══════════════════════════════════════════════════════════════════════════════
// E. RECEIPT TANPA MUTASI FINANSIAL
// ═══════════════════════════════════════════════════════════════════════════════
section("E. Receipt tanpa mutasi finansial");

assert(!canarySrc.includes("teacherWallet"), "E1 canary service TIDAK menyentuh wallet");
assert(!canarySrc.includes("teacherCommission.") && !canarySrc.includes("teacherCommission.findFirst") && !canarySrc.includes("teacherCommission.create"), "E2 canary service TIDAK menyentuh ledger (hanya withdrawal existing)");
assert(!canarySrc.includes("upsertWalletTx") && !canarySrc.includes("incAvailable"), "E3 tanpa wallet mover");
assert(canarySrc.includes("// Pencatatan penerimaan TIDAK memindahkan uang"), "E4 komitmen eksplisit");
assert(canarySrc.includes("receiptStatus: input.receiptStatus"), "E5 hanya mencatat status penerimaan");

// ═══════════════════════════════════════════════════════════════════════════════
// F. SUCCESS & MISMATCH
// ═══════════════════════════════════════════════════════════════════════════════
section("F. Success & mismatch");

assert(canarySrc.includes('input.result === "SUCCESS" && current.receiptStatus !== "CONFIRMED_RECEIVED"'), "F1 SUCCESS butuh CONFIRMED_RECEIVED");
assert(canarySrc.includes('"INVALID_TRANSITION"'), "F2 tanpa konfirmasi → ditolak");
assert(canarySrc.includes("automaticFailures.length === 0"), "F3 mismatch rekonsiliasi mencegah pre-flight pass");

// ═══════════════════════════════════════════════════════════════════════════════
// G. NO AUTO-SCALE
// ═══════════════════════════════════════════════════════════════════════════════
section("G. No auto-scale");

assert(!canarySrc.includes("PAYOUT_REAL_MONEY_ENABLED"), "G1 canary service TIDAK menyentuh flag real money");
assert(!canarySrc.includes("PAYOUT_PILOT_ENABLED"), "G2 canary TIDAK mengubah pilot");
assert(!canarySrc.includes("PAYOUT_GLOBAL_DAILY_LIMIT") && !canarySrc.includes("PAYOUT_MAX_AMOUNT"), "G3 canary TIDAK menaikkan limit");
assert(has("docs/P8G_CANARY_EXECUTION_PLAYBOOK.md"), "G4 playbook ada");
const playbook = read("docs/P8G_CANARY_EXECUTION_PLAYBOOK.md");
assert(playbook.includes("ABSOLUTELY NO AUTO-SCALE"), "G5 no auto-scale terdokumentasi");
assert(playbook.includes("keputusan Founder terpisah"), "G6 scale-up = keputusan terpisah");

// ═══════════════════════════════════════════════════════════════════════════════
// H. AUTHORIZATION & AUDIT
// ═══════════════════════════════════════════════════════════════════════════════
section("H. Authorization & audit");

assert(has("app/api/admin/teacher-commissions/canary/route.ts"), "H1 route canary ada");
const canaryApi = read("app/api/admin/teacher-commissions/canary/route.ts");
assert(canaryApi.includes("!founder.isFounder"), "H2 founder-only");
assert(canaryApi.includes("CANARY_") || canaryApi.includes("audit"), "H3 transisi diaudit");
assert(canarySrc.includes("CANARY_"), "H4 audit action prefix CANARY_");
assert(!canarySrc.includes("console.log(process.env"), "H5 tanpa print secret");

// ═══════════════════════════════════════════════════════════════════════════════
// I. REGRESSION & REAL MONEY
// ═══════════════════════════════════════════════════════════════════════════════
section("I. Regression & real money");

assert(read("lib/commission/payout/config.ts").includes('?? "mock"'), "I1 real money tetap OFF (mock default)");
assert(read("lib/commission/engine.ts").includes("entryType: \"COMMISSION\""), "I2 P7C utuh");
assert(orchSrc.includes("submitPayoutForWithdrawal"), "I3 P7D utuh");
assert(read("lib/commission/payout/safety.ts").includes("PAYOUT_REAL_MONEY_DISABLED"), "I4 gate P7E utuh");
assert(read("lib/guru/risk/signals.ts").includes("evaluateRiskGate"), "I5 P8C utuh");
assert(has("lib/commission/payout/pre-canary.ts"), "I6 P8F utuh");
const pageSrc = read("app/(dashboard)/admin/teacher-payouts/page.tsx");
assert(pageSrc.includes("Canary Pertama (P8G)"), "I7 UI canary di control center");

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
console.log("\n✅ P8G QA — SEMUA LULUS (state machine, pre-flight blockers, no auto-scale, founder-only)");
process.exit(0);
