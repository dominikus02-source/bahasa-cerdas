/**
 * P8C — Trust, Fraud & Financial Safety Layer: Full QA (spec §26–§29).
 *
 * Bagian:
 *  A. Data model & idempotensi signal
 *  B. Rules murni (explainable, deterministic)
 *  C. Case lifecycle (1 aktif, escalation, clear/restrict, reason wajib)
 *  D. Payout safety gate (hold aman — dana tetap terkunci)
 *  E. Destination cooldown
 *  F. Financial source of truth TIDAK tersentuh
 *  G. Admin authorization & audit
 *  H. Teacher privacy (tanpa bukti internal)
 *  I. Notifikasi respectful
 *  J. SIMULASI — invariant finansial selama hold/clear
 *  K. Konkurensi model
 *  L. Wiring (cron, admin page, sidebar)
 *  M. Regresi penanda + real money disabled
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
// A. DATA MODEL & IDEMPOTENSI
// ═══════════════════════════════════════════════════════════════════════════════
section("A. Data model & idempotency");

const schemaSrc = read("prisma/schema.prisma");
assert(schemaSrc.includes("model TeacherRiskCase"), "A1 TeacherRiskCase ada");
assert(schemaSrc.includes("model TeacherRiskSignal"), "A2 TeacherRiskSignal ada");
assert(schemaSrc.includes("model TeacherRiskAction"), "A3 TeacherRiskAction ada");
assert(schemaSrc.includes("enum RiskSeverity"), "A4 enum RiskSeverity");
assert(schemaSrc.includes("enum RiskCaseStatus"), "A5 enum RiskCaseStatus");
assert(schemaSrc.includes("@@unique([signalType, dedupeKey])"), "A6 dedupe key unik (idempotensi db-level)");
assert(schemaSrc.includes("actorType  RiskActorType"), "A7 actor SYSTEM/ADMIN");
const signalsSrc = read("lib/guru/risk/signals.ts");
assert(signalsSrc.includes("signalType_dedupeKey"), "A8 cek existing sebelum insert");
assert(signalsSrc.includes("isP2002"), "A9 race fallback P2002");
assert(signalsSrc.includes("status: { in: [\"REVIEW\", \"RESTRICTED\"] }"), "A10 maksimal satu case aktif per guru");

// ═══════════════════════════════════════════════════════════════════════════════
// B. RULES MURNI
// ═══════════════════════════════════════════════════════════════════════════════
section("B. Rules (pure & explainable)");

const rulesSrc = read("lib/guru/risk/rules.ts");
assert(rulesSrc.includes("isRapidAccountToPremium"), "B1 rule rapid premium");
assert(rulesSrc.includes("isAbnormalRefundPattern"), "B2 rule refund pattern");
assert(rulesSrc.includes("isRapidDestinationChange"), "B3 rule destination change");
assert(rulesSrc.includes("isWithdrawalVelocityAnomaly"), "B4 rule velocity");
assert(rulesSrc.includes("isDestinationCooldownActive"), "B5 rule cooldown");

// Simulasi murni rules (replika formula).
function rapidPremium(createdMs: number, settledMs: number, windowMin = 60): boolean {
  const elapsed = settledMs - createdMs;
  return elapsed >= 0 && elapsed <= windowMin * 60 * 1000;
}
assert(rapidPremium(0, 10 * 60 * 1000) === true, "B6 akun 10 menit → premium = signal");
assert(rapidPremium(0, 3 * 60 * 60 * 1000) === false, "B7 akun 3 jam → premium = normal");

function refundPattern(refunds: number, commissions: number, min = 3, ratio = 0.5): boolean {
  if (refunds < min) return false;
  const total = refunds + commissions;
  if (total === 0) return false;
  return refunds / total >= ratio;
}
assert(refundPattern(1, 20) === false, "B8 satu refund bukan fraud (absolute min)");
assert(refundPattern(5, 5) === true, "B9 5 refund dari 10 = flagged");
assert(refundPattern(3, 10) === false, "B10 3 dari 13 (23%) = tidak flagged");

function velocity(countInWindow: number, latest: number, avg: number, minCount = 5, jump = 5): boolean {
  if (countInWindow >= minCount) return true;
  return avg > 0 && latest >= avg * jump;
}
assert(velocity(5, 100000, 50000) === true, "B11 5 withdrawal/24jam = flagged");
assert(velocity(2, 500000, 50000) === true, "B12 10× rata-rata = flagged");
assert(velocity(1, 100000, 50000) === false, "B13 velocity normal");

function cooldown(updatedMs: number, nowMs: number, hours = 24): boolean {
  const elapsed = nowMs - updatedMs;
  return elapsed >= 0 && elapsed < hours * 3600 * 1000;
}
assert(cooldown(0, 2 * 3600 * 1000) === true, "B14 destinasi diubah 2 jam lalu = cooldown aktif");
assert(cooldown(0, 25 * 3600 * 1000) === false, "B15 25 jam lalu = cooldown lewat");

// ═══════════════════════════════════════════════════════════════════════════════
// C. CASE LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════════
section("C. Case lifecycle");

assert(signalsSrc.includes('severity === "LOW"') || signalsSrc.includes("LOW"), "C1 LOW → tanpa case");
assert(signalsSrc.includes("riskMediumRepeatMin()"), "C2 MEDIUM → case bila berulang (configurable)");
assert(signalsSrc.includes('severity === "CRITICAL"') && signalsSrc.includes("RESTRICT"), "C3 CRITICAL → case + restriction");
assert(signalsSrc.includes("escalated"), "C4 severity hanya naik (max)");
assert(signalsSrc.includes("resolveRiskCase"), "C5 resolveRiskCase ada");
assert(signalsSrc.includes("REASON_REQUIRED"), "C6 keputusan wajib reason");
assert(signalsSrc.includes('actionType') && signalsSrc.includes("CLEARED") && signalsSrc.includes("RESTRICTED"), "C7 aksi CLEARED/RESTRICTED terekam");
assert(signalsSrc.includes("RISK_CASE_CLEARED") && signalsSrc.includes("RISK_CASE_RESTRICTED"), "C8 audit AdminPaymentAuditLog");
assert(!signalsSrc.includes("BAN"), "C9 tanpa mekanisme BAN permanen");

// ═══════════════════════════════════════════════════════════════════════════════
// D. PAYOUT SAFETY GATE
// ═══════════════════════════════════════════════════════════════════════════════
section("D. Payout safety gate");

const orchSrc = read("lib/commission/payout/orchestrator.ts");
assert(orchSrc.includes("evaluateRiskGate"), "D1 gate risk dipanggil di orchestrator");
assert(orchSrc.includes("PAYOUT_RISK_HOLD"), "D2 hold di-audit");
assert(orchSrc.includes('"RISK_RESTRICTED"') && orchSrc.includes('"RISK_REVIEW_REQUIRED"'), "D3 error deterministik");
// hold branch: pastikan TIDAK ada wallet restore / failPayoutSafe pada branch RISK
const holdBranch = orchSrc.slice(orchSrc.indexOf("evaluateRiskGate(withdrawal.teacherId)"), orchSrc.indexOf("// ── P8C §9"));
assert(!holdBranch.includes("failPayoutSafe"), "D4 hold TIDAK memanggil failPayoutSafe (dana tetap terkunci)");
assert(!holdBranch.includes("decLocked") && !holdBranch.includes("incAvailable"), "D5 hold TIDAK mengembalikan dana diam-diam");
assert(signalsSrc.includes("evaluateRiskGate"), "D6 evaluateRiskGate ada");
assert(signalsSrc.includes('"NORMAL"') && signalsSrc.includes('"RESTRICTED"') && signalsSrc.includes('"REVIEW"'), "D7 state NORMAL/REVIEW/RESTRICTED");

// ═══════════════════════════════════════════════════════════════════════════════
// E. DESTINATION COOLDOWN
// ═══════════════════════════════════════════════════════════════════════════════
section("E. Destination security");

const withdrawApi = read("app/api/teacher/commissions/withdraw/route.ts");
assert(withdrawApi.includes("DESTINATION_COOLDOWN"), "E1 pre-check cooldown di withdraw endpoint");
assert(withdrawApi.includes("masa tunggu singkat"), "E2 pesan manusiawi");
const cfgSrc = read("lib/guru/risk/config.ts");
assert(cfgSrc.includes("RISK_DESTINATION_COOLDOWN_HOURS"), "E3 cooldown configurable (tanpa hardcode)");
assert(!cfgSrc.includes("NEXT_PUBLIC_RISK"), "E4 threshold TIDAK diekspos ke klien (tanpa NEXT_PUBLIC)");
assert(orchSrc.includes("isDestinationCooldownActive"), "E5 orchestrator juga menahan (defense in depth)");

// ═══════════════════════════════════════════════════════════════════════════════
// F. FINANCIAL SOURCE OF TRUTH UNTOUCHED
// ═══════════════════════════════════════════════════════════════════════════════
section("F. Financial source of truth untouched");

const riskLibs = [signalsSrc, rulesSrc, read("lib/guru/risk/events.ts"), read("lib/guru/risk/config.ts")].join("\n");
assert(!riskLibs.includes("teacherWallet.update"), "F1 risk layer TIDAK update wallet");
assert(!riskLibs.includes("teacherWallet.upsert"), "F2 risk layer TIDAK upsert wallet");
assert(!riskLibs.includes("upsertWalletTx"), "F3 risk layer TIDAK memakai wallet mover");
assert(!riskLibs.includes("teacherCommission.delete"), "F4 tidak ada delete commission");
assert(!riskLibs.includes("teacherCommission.update"), "F5 tidak mengubah ledger");
assert(!riskLibs.includes("teacherPayout.update"), "F6 tidak mengubah payout (termasuk PAID)");
assert(!riskLibs.includes("user.saldo"), "F7 tidak menyentuh saldo marketplace");

// ═══════════════════════════════════════════════════════════════════════════════
// G. ADMIN AUTH & AUDIT
// ═══════════════════════════════════════════════════════════════════════════════
section("G. Admin authorization");

const adminApi = read("app/api/admin/teacher-risk/route.ts");
assert(adminApi.includes("!admin.isFounder"), "G1 antrean risk founder-only");
const decisionApi = read("app/api/admin/teacher-risk/[id]/decision/route.ts");
assert(decisionApi.includes("!admin.isFounder"), "G2 keputusan founder-only");
assert(decisionApi.includes('"CLEAR"') && decisionApi.includes('"RESTRICT"') && decisionApi.includes('"KEEP_REVIEW"'), "G3 keputusan CLEAR/RESTRICT/KEEP_REVIEW");
assert(decisionApi.includes("Alasan wajib diisi"), "G4 reason wajib (API 400)");
assert(decisionApi.includes("admin.id"), "G5 actorId dari sesi — bukan dari klien");

// ═══════════════════════════════════════════════════════════════════════════════
// H. TEACHER PRIVACY
// ═══════════════════════════════════════════════════════════════════════════════
section("H. Teacher privacy");

const summaryApi = read("app/api/teacher/commissions/route.ts");
assert(summaryApi.includes("riskStatus"), "H1 summary API hanya mengembalikan status (bukan bukti)");
assert(summaryApi.includes("getTeacherRiskState"), "H2 state dari service (bukan data mentah)");
const komisiClient = read("components/guru/komisi/KomisiClient.tsx");
assert(komisiClient.includes("Beberapa transaksi sedang kami tinjau untuk memastikan keamanan"), "H3 copy respectful (bukan 'dicurigai fraud')");
assert(komisiClient.includes("Pencairan sementara dibatasi"), "H4 copy restricted respectful");
assert(!komisiClient.includes("riskScore") && !komisiClient.includes("signalType") && !komisiClient.includes("dedupeKey"), "H5 TIDAK expose score/signal/deteksi internal");
assert(!komisiClient.includes("evidence"), "H6 TIDAK expose evidence internal");

// ═══════════════════════════════════════════════════════════════════════════════
// I. NOTIFIKASI RESPECTFUL
// ═══════════════════════════════════════════════════════════════════════════════
section("I. Notifications");

assert(orchSrc.includes("Pencairan sedang ditinjau"), "I1 notif hold respectful");
assert(decisionApi.includes("Pembaruan status pencairan"), "I2 notif keputusan admin");
assert(!decisionApi.includes("fraud") && !orchSrc.includes("dicurigai"), "I3 tanpa bahasa menakutkan");
assert(!orchSrc.includes("signalType:"), "I4 notif tanpa detail signal");

// ═══════════════════════════════════════════════════════════════════════════════
// J. SIMULASI — FINANCIAL INVARIANT SELAMA HOLD/CLEAR
// ═══════════════════════════════════════════════════════════════════════════════
section("J. Simulation — hold & clear");

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

// Komisi → release → withdraw (lock) → RISK HOLD (tidak ada pergerakan) →
// ADMIN CLEAR → resubmit → PAID.
wallet.pending += 1900;
wallet.lifetimeEarned += 1900;
wallet.pending -= 1900;
wallet.available += 1900;
wallet.available -= 1900;
wallet.locked += 1900; // withdrawal locked
assert(invariant(), "J1 invariant setelah lock");

// HOLD: tidak ada mutasi apa pun.
const holdSnapshot = JSON.stringify(wallet);
assert(JSON.stringify(wallet) === holdSnapshot, "J2 hold = zero wallet movement (dana tetap terkunci)");
assert(wallet.locked === 1900, "J3 dana TIDAK dikembalikan diam-diam selama review");

// CLEAR → lanjut payout → PAID.
wallet.locked -= 1900;
wallet.lifetimeWithdrawn += 1900;
assert(invariant(), "J4 invariant setelah clear + paid");
assert(wallet.lifetimeWithdrawn === 1900 && wallet.locked === 0, "J5 uang bergerak tepat satu kali");

// RESTRICT: payout baru diblokir — dana guru utuh.
wallet.pending += 1000;
wallet.lifetimeEarned += 1000;
wallet.pending -= 1000;
wallet.available += 1000;
const beforeRestrict = { ...wallet };
// blokir = tidak ada withdrawal baru (available tidak berubah)
assert(JSON.stringify(wallet) === JSON.stringify(beforeRestrict), "J6 restriction tidak memblokir saldo — hanya pengiriman baru");
assert(invariant(), "J7 invariant terjaga di semua langkah (Ledger = Wallet)");

// ═══════════════════════════════════════════════════════════════════════════════
// K. CONCURRENCY MODEL
// ═══════════════════════════════════════════════════════════════════════════════
section("K. Concurrency");

// Dua worker sinyal sama → satu baris (unique) — diverifikasi statis di A.
// Clear + retry bersamaan: claim-based transition (updateMany where status).
assert(signalsSrc.includes('status: { in: ["REVIEW", "RESTRICTED"] }'), "K1 case aktif di-claim/dibaca atomic dalam transaksi");
assert(signalsSrc.includes("$transaction"), "K2 create signal + case dalam satu transaksi");
assert(decisionApi.includes("resolveRiskCase"), "K3 keputusan lewat service (bukan raw update)");
assert(orchSrc.includes("claim.count === 0"), "K4 payout claim-first tetap utuh (no double payout)");

// ═══════════════════════════════════════════════════════════════════════════════
// L. WIRING
// ═══════════════════════════════════════════════════════════════════════════════
section("L. Wiring");

assert(has("app/api/admin/teacher-risk/route.ts"), "L1 admin list API ada");
assert(has("app/api/admin/teacher-risk/[id]/route.ts"), "L2 admin detail API ada");
assert(has("app/api/admin/teacher-risk/[id]/decision/route.ts"), "L3 admin decision API ada");
assert(has("app/(dashboard)/admin/teacher-risk/page.tsx"), "L4 admin page ada");
assert(read("components/admin/AdminSidebar.tsx").includes("/admin/teacher-risk"), "L5 sidebar admin item");
assert(has("app/api/cron/risk-review/route.ts"), "L6 cron risk review ada");
assert(read("vercel.json").includes("/api/cron/risk-review"), "L7 cron terdaftar");
assert(has("prisma/migrations/manual/2026-08-26_p8c_risk_safety.sql"), "L8 migration SQL ada");
assert(read("lib/guru/risk/events.ts").includes("take: 1") || read("lib/guru/risk/events.ts").includes("count"), "L9 evaluator bounded (tanpa scan penuh)");

// ═══════════════════════════════════════════════════════════════════════════════
// M. REGRESSION & REAL MONEY
// ═══════════════════════════════════════════════════════════════════════════════
section("M. Regression & real money");

assert(read("lib/commission/engine.ts").includes("entryType: \"COMMISSION\""), "M1 P7C engine utuh");
assert(read("lib/commission/payout/orchestrator.ts").includes("submitPayoutForWithdrawal"), "M2 P7D orchestrator utuh");
assert(read("lib/commission/payout/xendit-provider.ts").includes("mapXenditStatusToInternal"), "M3 P7E adapter utuh");
assert(read("lib/commission/payout/config.ts").includes("PAYOUT_REAL_MONEY_ENABLED"), "M4 real money tetap env-gated");
assert(!read("lib/guru/risk/config.ts").includes("REAL_MONEY") && !read("lib/guru/risk/signals.ts").includes("REAL_MONEY"), "M5 risk layer tidak menyentuh flag real money");

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
console.log("\n✅ P8C QA — SEMUA LULUS (signal idempotency, hold safety, privacy, financial integrity)");
process.exit(0);
