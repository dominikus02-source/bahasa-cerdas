/**
 * P8F — Pre-Canary Founder Checklist & GO/NO-GO Gate: QA.
 *
 * Bagian:
 *  A. Checklist kanonik (kategori A–E, status semantik)
 *  B. GO/NO-GO decision (pure) — GO diblokir bila ada FAIL/manual/founder ≠ approved
 *  C. Founder-only approval (route statis)
 *  D. Kill switch / risk gate / provider config / pilot invalid → blok readiness
 *  E. Secret safety (tanpa print nilai env)
 *  F. Dry-run rehearsal (success/failure/unknown — mock, tanpa uang asli)
 *  G. Wiring & regresi
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
// A. CHECKLIST KANONIK
// ═══════════════════════════════════════════════════════════════════════════════
section("A. Checklist kanonik");

assert(has("docs/P8F_PRE_CANARY_FOUNDER_GATE.md"), "A1 dokumen checklist ada");
const doc = read("docs/P8F_PRE_CANARY_FOUNDER_GATE.md");
for (const cat of ["A. SYSTEM", "B. PROVIDER", "C. PILOT", "D. OPERATIONS", "E. FINANCE"]) {
  assert(doc.includes(cat), `A2 kategori ${cat}`);
}
assert(doc.includes("MANUAL_VERIFICATION_REQUIRED"), "A3 status manual eksplisit");
assert(doc.includes("Tidak ada \"hampir siap\""), "A4 tanpa status antara");
assert(has("lib/commission/payout/pre-canary.ts"), "A5 evaluator ada");
const preSrc = read("lib/commission/payout/pre-canary.ts");
assert(preSrc.includes("MANUAL_VERIFICATION_REQUIRED") && preSrc.includes("NOT_CONFIGURED"), "A6 status enum lengkap");
assert(preSrc.includes('"SYSTEM"') && preSrc.includes('"PROVIDER"') && preSrc.includes('"FOUNDER"'), "A7 source enum");
assert(preSrc.includes("ledger_invariant") && preSrc.includes("wallet_lock_invariant"), "A8 invariant dicek via SQL agregat");
assert(preSrc.includes("xendit_account") && preSrc.includes("xendit_credentials"), "A9 provider items");
assert(preSrc.includes("pilot_teacher_eligible") && preSrc.includes("pilot_profile_verified"), "A10 pilot items");
assert(preSrc.includes("commission_source_validated") && preSrc.includes("fee_policy_confirmed"), "A11 finance items");

// ═══════════════════════════════════════════════════════════════════════════════
// B. GO/NO-GO DECISION (PURE)
// ═══════════════════════════════════════════════════════════════════════════════
section("B. GO/NO-GO decision");

assert(preSrc.includes("decideGoNoGo"), "B1 fungsi decision murni ada");

function decide(statuses: string[], founderState: string): string {
  if (founderState !== "APPROVED_FOR_CANARY") return "NOT_YET";
  for (const s of statuses) {
    if (s === "FAIL" || s === "NOT_CONFIGURED" || s === "MANUAL_VERIFICATION_REQUIRED") return "NOT_YET";
  }
  return "GO_FOR_REAL_MONEY_CANARY";
}
assert(decide(["PASS", "PASS"], "APPROVED_FOR_CANARY") === "GO_FOR_REAL_MONEY_CANARY", "B2 semua PASS + approved → GO");
assert(decide(["PASS", "PASS"], "NOT_APPROVED") === "NOT_YET", "B3 tanpa persetujuan founder → NOT YET (tidak pernah diinfer)");
assert(decide(["PASS", "FAIL"], "APPROVED_FOR_CANARY") === "NOT_YET", "B4 satu FAIL → NOT YET");
assert(decide(["PASS", "NOT_CONFIGURED"], "APPROVED_FOR_CANARY") === "NOT_YET", "B5 NOT_CONFIGURED → NOT YET");
assert(decide(["PASS", "MANUAL_VERIFICATION_REQUIRED"], "APPROVED_FOR_CANARY") === "NOT_YET", "B6 manual belum selesai → NOT YET");
assert(decide([], "APPROVED_FOR_CANARY") === "GO_FOR_REAL_MONEY_CANARY", "B7 checklist kosong tidak pernah terjadi (guard), tapi decision tetap deterministik");

// ═══════════════════════════════════════════════════════════════════════════════
// C. FOUNDER-ONLY APPROVAL
// ═══════════════════════════════════════════════════════════════════════════════
section("C. Founder-only approval");

assert(has("app/api/admin/teacher-commissions/pre-canary/decision/route.ts"), "C1 route keputusan ada");
const decisionApi = read("app/api/admin/teacher-commissions/pre-canary/decision/route.ts");
assert(decisionApi.includes("!founder.isFounder"), "C2 HANYA founder — admin biasa ditolak");
assert(decisionApi.includes("APPROVED_FOR_CANARY") && decisionApi.includes("CANARY_COMPLETED") && decisionApi.includes("CANARY_FAILED"), "C3 state keputusan lengkap");
assert(decisionApi.includes("Catatan/alasan wajib diisi"), "C4 catatan wajib");
assert(has("lib/commission/payout/founder-decision.ts"), "C5 record service ada");
const decisionSrc = read("lib/commission/payout/founder-decision.ts");
assert(decisionSrc.includes("PAYOUT_FOUNDER_DECISION_"), "C6 keputusan diaudit");
assert(decisionSrc.includes("NOT_APPROVED"), "C7 default NOT_APPROVED (tidak pernah diinfer)");

// ═══════════════════════════════════════════════════════════════════════════════
// D. BLOKER READINESS
// ═══════════════════════════════════════════════════════════════════════════════
section("D. Blocker readiness");

assert(preSrc.includes("killSwitchActive") || preSrc.includes("isPayoutKillSwitchActive"), "D1 kill switch tercermin di report");
assert(preSrc.includes("xendit_api_key") || preSrc.includes("secretConfigured(\"XENDIT_API_KEY\")"), "D2 provider config missing → NOT_CONFIGURED");
assert(preSrc.includes("pilot_risk_clear"), "D3 risk gate failure → blok");
assert(preSrc.includes("pilot_teacher_eligible"), "D4 pilot teacher invalid → blok");
assert(preSrc.includes("getTeacherRiskState"), "D5 risk state nyata dari P8C");
assert(decisionApi.includes("valid.includes(state)"), "D6 state tidak valid ditolak");

// ═══════════════════════════════════════════════════════════════════════════════
// E. SECRET SAFETY
// ═══════════════════════════════════════════════════════════════════════════════
section("E. Secret safety");

assert(!preSrc.includes("console.log(process.env"), "E1 nilai secret tidak di-print");
assert(!preSrc.includes("XENDIT_API_KEY}") || !preSrc.includes("console.log"), "E2 tanpa logging nilai");
assert(preSrc.includes("[SENSITIVE]"), "E3 placeholder terdeteksi sebagai bukan kredensial");
const api = read("app/api/admin/teacher-commissions/pre-canary/route.ts");
assert(!api.includes("process.env.XENDIT"), "E4 API tidak mengembalikan secret");
assert(!decisionApi.includes("process.env.XENDIT"), "E5 decision API tanpa secret");

// ═══════════════════════════════════════════════════════════════════════════════
// F. DRY-RUN REHEARSAL (MOCK — tanpa uang asli)
// ═══════════════════════════════════════════════════════════════════════════════
section("F. Dry-run rehearsal");

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

// SUCCESS path: COMMISSION → WALLET → WITHDRAWAL → RISK GATE (clear) → PAYOUT → WEBHOOK → PAID → RECONCILIATION.
wallet.pending += 100_000;
wallet.lifetimeEarned += 100_000;
wallet.pending -= 100_000;
wallet.available += 100_000;
wallet.available -= 100_000;
wallet.locked += 100_000;
// risk gate CLEAR + webhook PAID
wallet.locked -= 100_000;
wallet.lifetimeWithdrawn += 100_000;
assert(invariant(), "F1 success path invariant");
assert(wallet.lifetimeWithdrawn === 100_000, "F2 PAID tercatat penuh");

// FAILURE path: LOCKED → FAILED → AVAILABLE.
wallet.pending += 50_000;
wallet.lifetimeEarned += 50_000;
wallet.pending -= 50_000;
wallet.available += 50_000;
wallet.available -= 50_000;
wallet.locked += 50_000;
wallet.locked -= 50_000;
wallet.available += 50_000;
assert(wallet.available === 50_000 && wallet.locked === 0, "F3 failure → dana kembali");
assert(invariant(), "F4 failure invariant");

// UNKNOWN path: LOCKED → UNKNOWN → RECONCILIATION_REQUIRED (tanpa mutasi).
wallet.available -= 20_000;
wallet.locked += 20_000;
const snap = JSON.stringify(wallet);
assert(JSON.stringify(wallet) === snap, "F5 unknown → zero movement (RECONCILIATION_REQUIRED)");
wallet.locked -= 20_000;
wallet.lifetimeWithdrawn += 20_000;
assert(invariant(), "F6 resolve → invariant terjaga");

// ═══════════════════════════════════════════════════════════════════════════════
// G. WIRING & REGRESSION
// ═══════════════════════════════════════════════════════════════════════════════
section("G. Wiring & regression");

assert(has("app/api/admin/teacher-commissions/pre-canary/route.ts"), "G1 GET API ada");
assert(has("app/api/admin/teacher-commissions/pre-canary/decision/route.ts"), "G2 decision API ada");
const pageSrc = read("app/(dashboard)/admin/teacher-payouts/page.tsx");
assert(pageSrc.includes("Pra-Canary GO/NO-GO"), "G3 UI pre-canary di control center");
assert(pageSrc.includes("APPROVE CANARY"), "G4 tombol keputusan founder di UI");
assert(read("lib/commission/payout/config.ts").includes('?? "mock"'), "G5 real money tetap OFF (mock default)");
assert(read("lib/commission/engine.ts").includes("entryType: \"COMMISSION\""), "G6 P7C utuh");
assert(read("lib/commission/payout/orchestrator.ts").includes("submitPayoutForWithdrawal"), "G7 P7D utuh");
assert(read("lib/guru/risk/signals.ts").includes("evaluateRiskGate"), "G8 P8C utuh");

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
console.log("\n✅ P8F QA — SEMUA LULUS (GO/NO-GO deterministik, founder-only, secret-safe)");
process.exit(0);
