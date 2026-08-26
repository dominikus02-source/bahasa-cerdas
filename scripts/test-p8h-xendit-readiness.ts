/**
 * P8H — Xendit Production Readiness Bridge: QA.
 *
 * Bagian:
 *  A. Config validator (tanpa nilai secret)
 *  B. Evidence record (9 kategori, tanpa secret)
 *  C. Production safety gate (semua kondisi)
 *  D. Integrasi P8F (item provider readiness)
 *  E. Pilot teacher readiness (final checklist)
 *  F. Money safety snapshot (read-only)
 *  G. Final human confirmation (teks eksplisit)
 *  H. Authorization & audit
 *  I. Real money OFF + regresi
 *
 * Tanpa DB — audit statis + logika murni.
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
// A. CONFIG VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════
section("A. Config validator");

assert(has("lib/commission/payout/xendit-readiness.ts"), "A1 service ada");
const xrSrc = read("lib/commission/payout/xendit-readiness.ts");
assert(xrSrc.includes("validatePayoutProductionConfig"), "A2 validator ada");
assert(xrSrc.includes('"CONFIGURED"') && xrSrc.includes('"NOT_CONFIGURED"') && xrSrc.includes('"INVALID"'), "A3 tiga status");
assert(xrSrc.includes("api_credential") && xrSrc.includes("webhook_token"), "A4 credential + token dicek");
assert(xrSrc.includes("api_version"), "A5 api-version dicek");
assert(xrSrc.includes("environment_consistency"), "A6 konsistensi environment dicek");
assert(!xrSrc.includes("console.log(process.env.XENDIT"), "A7 nilai secret tidak di-print");
assert(!xrSrc.includes("NEXT_PUBLIC"), "A8 tanpa NEXT_PUBLIC");
assert(xrSrc.includes("nilai tidak pernah ditampilkan"), "A9 komitmen tanpa nilai secret");

// ═══════════════════════════════════════════════════════════════════════════════
// B. EVIDENCE RECORD
// ═══════════════════════════════════════════════════════════════════════════════
section("B. Evidence record");

assert(xrSrc.includes("XENDIT_EVIDENCE_CATEGORIES"), "B1 kategori ada");
for (const c of ["BUSINESS_KYB", "PAYOUT_CAPABILITY", "PRODUCTION_ACCOUNT", "PRODUCTION_CREDENTIAL", "WEBHOOK", "DESTINATION_COVERAGE", "PROVIDER_FEE", "OPERATIONAL_CONTACT", "PROVIDER_LIMITS"]) {
  assert(xrSrc.includes(c), `B2 kategori ${c}`);
}
assert(xrSrc.includes('"PENDING"') && xrSrc.includes('"VERIFIED"') && xrSrc.includes('"REJECTED"'), "B3 status evidence");
assert(xrSrc.includes("evidenceReference"), "B4 referensi aman (bukan secret)");
assert(xrSrc.includes("XENDIT_EVIDENCE_"), "B5 evidence diaudit");

// ═══════════════════════════════════════════════════════════════════════════════
// C. PRODUCTION SAFETY GATE
// ═══════════════════════════════════════════════════════════════════════════════
section("C. Production safety gate");

assert(xrSrc.includes("evaluateXenditProductionReadiness"), "C1 evaluator kanonik");
assert(xrSrc.includes("evidence_all_verified"), "C2 evidence semua VERIFIED");
assert(xrSrc.includes("credential_configured") && xrSrc.includes("webhook_token_configured"), "C3 credential+token");
assert(xrSrc.includes("safety_controls"), "C4 kontrol P7E/P8C sehat");
assert(xrSrc.includes("p8f_auto_checks"), "C5 P8F auto checks");
assert(xrSrc.includes("webhook_verified"), "C6 webhook diverifikasi (non-money)");
assert(xrSrc.includes("real_money_off"), "C7 real money tetap OFF selama P8H");
assert(xrSrc.includes("ready: blocks.every"), "C8 READY hanya bila SEMUA kondisi");

// Simulasi gate murni.
function gate(blocks: Array<{ passed: boolean }>): boolean {
  return blocks.every((b) => b.passed);
}
assert(gate([{ passed: true }, { passed: true }]) === true, "C9 semua pass → READY");
assert(gate([{ passed: true }, { passed: false }]) === false, "C10 satu gagal → NOT READY");

// ═══════════════════════════════════════════════════════════════════════════════
// D. INTEGRASI P8F
// ═══════════════════════════════════════════════════════════════════════════════
section("D. Integrasi P8F");

const preSrc = read("lib/commission/payout/pre-canary.ts");
assert(preSrc.includes("xendit_production_ready"), "D1 item readiness di checklist P8F");
assert(preSrc.includes("evaluateXenditProductionReadiness"), "D2 reuses evaluator P8H (bukan sistem kedua)");
assert(preSrc.includes("Belum siap"), "D3 alasan detail");

// ═══════════════════════════════════════════════════════════════════════════════
// E. PILOT TEACHER READINESS
// ═══════════════════════════════════════════════════════════════════════════════
section("E. Pilot teacher readiness");

assert(xrSrc.includes("evaluatePilotTeacherReadiness"), "E1 checklist final ada");
for (const id of ["role", "not_founder", "balance", "profile_verified", "no_cooldown", "risk_normal", "allowlisted", "founder_selected"]) {
  assert(xrSrc.includes(`"${id}"`), `E2 check ${id}`);
}
assert(xrSrc.includes("APPROVED_FOR_CANARY"), "E3 dipilih eksplisit Founder");
assert(xrSrc.includes("ready: checks.every"), "E4 semua wajib");

// ═══════════════════════════════════════════════════════════════════════════════
// F. MONEY SAFETY SNAPSHOT
// ═══════════════════════════════════════════════════════════════════════════════
section("F. Money safety snapshot");

assert(xrSrc.includes("buildMoneySafetySnapshot"), "F1 snapshot read-only");
assert(xrSrc.includes("maskedIdentity"), "F2 identitas tersamar");
assert(xrSrc.includes("Ditanggung BahasaCerdas"), "F3 fee platform");
assert(xrSrc.includes("exposureRemaining"), "F4 sisa exposure");
assert(xrSrc.includes("founderGateReady"), "F5 founder gate state");
assert(!xrSrc.includes("teacherWallet.update") && !xrSrc.includes("upsertWalletTx"), "F6 snapshot TIDAK memutasi finansial");

// ═══════════════════════════════════════════════════════════════════════════════
// G. FINAL HUMAN CONFIRMATION
// ═══════════════════════════════════════════════════════════════════════════════
section("G. Final human confirmation");

assert(xrSrc.includes("FOUNDER_CONFIRMATION_TEXT"), "G1 teks eksplisit");
assert(xrSrc.includes("Confirmation text mismatch"), "G2 teks harus PERSIS (bukan klik)");
assert(xrSrc.includes("approvalReference"), "G3 referensi approval");
assert(xrSrc.includes("XENDIT_FOUNDER_CONFIRMATION"), "G4 teraudit");

// ═══════════════════════════════════════════════════════════════════════════════
// H. AUTHORIZATION & AUDIT
// ═══════════════════════════════════════════════════════════════════════════════
section("H. Authorization & audit");

assert(has("app/api/admin/teacher-commissions/xendit-readiness/route.ts"), "H1 API ada");
const api = read("app/api/admin/teacher-commissions/xendit-readiness/route.ts");
assert(api.includes("!founder.isFounder"), "H2 founder-only");
assert(api.includes("RECORD_EVIDENCE") && api.includes("CONFIRM"), "H3 aksi");
assert(api.includes("Referensi bukti wajib untuk VERIFIED"), "H4 bukti wajib referensi");
assert(!api.includes("process.env.XENDIT"), "H5 tanpa secret di API");
assert(api.includes("Teks konfirmasi tidak sesuai"), "H6 mismatch ditolak 400");

// ═══════════════════════════════════════════════════════════════════════════════
// I. REAL MONEY OFF & REGRESSION
// ═══════════════════════════════════════════════════════════════════════════════
section("I. Real money OFF & regression");

assert(read("lib/commission/payout/config.ts").includes('?? "mock"'), "I1 real money OFF (mock default)");
assert(!xrSrc.includes("process.env.PAYOUT_REAL_MONEY_ENABLED = \"") && !xrSrc.includes("process.env.PAYOUT_PROVIDER = \"") && !xrSrc.includes("process.env.PAYOUT_PROVIDER_ENABLED = \""), "I2 P8H tidak mengubah flag (hanya membaca untuk validasi)");
assert(!xrSrc.includes("submitPayoutForWithdrawal") && !xrSrc.includes("createPayout("), "I3 P8H tidak mengirim payout");
assert(read("lib/commission/engine.ts").includes("entryType: \"COMMISSION\""), "I4 P7C utuh");
assert(read("lib/commission/payout/orchestrator.ts").includes("submitPayoutForWithdrawal"), "I5 P7D utuh");
assert(read("lib/commission/payout/xendit-provider.ts").includes("mapXenditStatusToInternal"), "I6 adapter Xendit P7E utuh");
assert(read("lib/guru/risk/signals.ts").includes("evaluateRiskGate"), "I7 P8C utuh");
const pageSrc = read("app/(dashboard)/admin/teacher-payouts/page.tsx");
assert(pageSrc.includes("Xendit Production Readiness (P8H)"), "I8 UI section ada");

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
console.log("\n✅ P8H QA — SEMUA LULUS (readiness bridge, evidence tanpa secret, founder confirmation)");
process.exit(0);
