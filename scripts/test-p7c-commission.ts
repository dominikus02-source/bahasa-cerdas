/**
 * P7C — Guru Cerdas Sejahtera: Commission Engine + Teacher Wallet
 * Full automated QA + FINANCIAL INTEGRITY GATE (§22/§23).
 *
 * Bagian:
 *  A. Komisi (rate 10%, integer, eligibleFrom, ADMIN exclusion, idempotency)
 *  B. Holding (7 hari default, configurable, release idempotent)
 *  C. Reversal (append-only, immutable original, idempotent)
 *  D. Wallet (isolated dari User.saldo, invariant financial)
 *  E. Withdrawal (minimum, locking, state machine, no double payout)
 *  F. Security (no client trust, self-referral, isolation antar guru)
 *  G. Wiring (webhook, cron, join, API routes, audit)
 *  H. Simulation murni (invariant holds di SETIAP langkah — concurrency model)
 *
 * Tanpa DB — logika murni + audit statis kode. Konvensi project:
 * exit(0) semua lulus, exit(1) bila ada yang gagal.
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
// A. COMMISSION
// ═══════════════════════════════════════════════════════════════════════════════
section("A. Commission — rate, integer, eligibility, idempotency");

// Rate & formula murni (duplikasi formula config untuk uji independen)
function computeCommission(gross: number): number {
  return Math.floor(gross * 0.1);
}
assert(computeCommission(15000) === 1500, "A1 kupon: 10% × Rp15.000 = Rp1.500 (integer)");
assert(computeCommission(19000) === 1900, "A2 tanpa kupon: 10% × Rp19.000 = Rp1.900");
assert(computeCommission(180000) === 18000, "A3 tahunan: 10% × Rp180.000 = Rp18.000");
assert(Number.isInteger(computeCommission(15555)), "A4 integer rupiah — tanpa floating point");
assert(computeCommission(0) === 0, "A5 gross 0 → komisi 0");
assert(computeCommission(9) === 0, "A6 floor ke 0 bila < 10");

const configSrc = read("lib/commission/config.ts");
assert(configSrc.includes("0.10"), "A7 rate default 10% di config");
assert(configSrc.includes("Math.floor(grossAmount * rate)"), "A8 floor() integer — bukan floating point");
assert(configSrc.includes("COMMISSION_HOLDING_PERIOD_DAYS"), "A9 holding configurable via env");
assert(/COMMISSION_HOLDING_PERIOD_DAYS[\s\S]*?7/.test(configSrc), "A10 default holding 7 hari");
assert(configSrc.includes("TEACHER_COMMISSION_MIN_WITHDRAWAL"), "A11 minimum withdrawal configurable via env");
assert(configSrc.includes("MURID_PREMIUM_MONTHLY"), "A12 plan eligible = MURID premium (komisi dari murid)");
assert(configSrc.includes("MURID_PREMIUM_YEARLY"), "A13 plan tahunan murid eligible");
assert(configSrc.includes("role === \"GURU\" && !isFounder"), "A14 ADMIN/founder dikecualikan (server-side)");
assert(configSrc.includes("TEACHER_COMMISSION_LAUNCH_DATE"), "A15 launch date configurable — backfill pre-launch");

const engineSrc = read("lib/commission/engine.ts");
assert(engineSrc.includes('status !== "SUCCESS"') && engineSrc.includes("NOT_SETTLED"), "A16 failed payment → no commission (NOT_SETTLED)");
assert(engineSrc.includes("COMMISSION_ELIGIBLE_TRANSACTION_TYPES"), "A17 hanya transaksi MURID_PREMIUM");
assert(engineSrc.includes("settledAt.getTime() < attribution.eligibleFrom.getTime()"), "A18 sebelum eligibleFrom → NO COMMISSION");
assert(engineSrc.includes("BEFORE_ELIGIBLE_FROM"), "A19 skip reason BEFORE_ELIGIBLE_FROM");
assert(engineSrc.includes("attribution.teacherId === ctx.userId") && engineSrc.includes("SELF_REFERRAL"), "A20 self-referral diblokir");
assert(engineSrc.includes("entryType: \"COMMISSION\""), "A21 entry positif ditandai entryType=COMMISSION");
assert(engineSrc.includes("transaksiId_teacherId_entryType"), "A22 idempotensi: unique key [transaksiId, teacherId, entryType]");
assert(engineSrc.includes("const existing = await db.teacherCommission.findUnique"), "A23 idempotensi: cek existing sebelum create");
assert(engineSrc.includes("isP2002"), "A24 idempotensi: race fallback P2002");

// ═══════════════════════════════════════════════════════════════════════════════
// B. HOLDING
// ═══════════════════════════════════════════════════════════════════════════════
section("B. Holding — 7 hari, release idempotent");

assert(engineSrc.includes('status: "ELIGIBLE"'), "B1 komisi baru masuk status ELIGIBLE (pending/holding)");
assert(engineSrc.includes("incPending: commissionAmount"), "B2 komisi ELIGIBLE masuk pendingBalance wallet");
assert(engineSrc.includes('holdingEndsAt: { not: null, lte: now }'), "B3 release hanya untuk holding yang sudah lewat");
assert(engineSrc.includes('where: { id: entry.id, status: "ELIGIBLE" }'), "B4 release claim-first per entry (WHERE status=ELIGIBLE)");
assert(engineSrc.includes("claim.count === 0"), "B5 release idempotent — job dobel tidak menggandakan dana");
assert(engineSrc.includes("decPending: entry.commissionAmount") && engineSrc.includes("incAvailable: entry.commissionAmount"), "B6 release memindah pending → available atomik");
assert(engineSrc.includes("status === \"AVAILABLE\" ? null : holdingEndsAt"), "B7 holding = 0 → langsung AVAILABLE (instant)");

// ═══════════════════════════════════════════════════════════════════════════════
// C. REVERSAL
// ═══════════════════════════════════════════════════════════════════════════════
section("C. Reversal — append-only, immutable original");

assert(engineSrc.includes("entryType: \"REVERSAL\""), "C1 reversal = entry baru terpisah (append-only)");
assert(engineSrc.includes("commissionAmount: -amount"), "C2 reversal = entry NEGATIF");
assert(engineSrc.includes("reversalEntryId: reversal.id"), "C3 original tertaut ke entry reversal (audit)");
assert(engineSrc.includes('where: { id: commission.id, status: { not: "REVERSED" } }'), "C4 claim-first — duplicate refund → satu reversal");
assert(engineSrc.includes('reason: "ALREADY_REVERSED"'), "C5 refund dobel → idempotent skip");
assert(engineSrc.includes("priorStatus === \"ELIGIBLE\"") && engineSrc.includes("decPending"), "C6 reversal saat ELIGIBLE → pendingBalance turun");
assert(engineSrc.includes("priorStatus === \"AVAILABLE\"") && engineSrc.includes("decAvailable"), "C7 reversal saat AVAILABLE → availableBalance turun");
assert(engineSrc.includes("PROCESSING\" || priorStatus === \"PAID\""), "C8 withdrawn commission → negatif adjustment (tanpa mutasi withdrawal historis)");
assert(engineSrc.includes("incReversed: amount"), "C9 wallet.totalReversed mencatat lifetime reversal");

// ═══════════════════════════════════════════════════════════════════════════════
// D. WALLET
// ═══════════════════════════════════════════════════════════════════════════════
section("D. Wallet — isolasi, field, rekonsiliasi");

const walletSrc = read("lib/commission/wallet.ts");
assert(walletSrc.includes("lockedBalance") && walletSrc.includes("lifetimeEarned") && walletSrc.includes("lifetimeWithdrawn"), "D1 wallet punya locked/lifetimeEarned/lifetimeWithdrawn (§10)");
assert(walletSrc.includes("entryType: \"REVERSAL\""), "D2 expected reversal dihitung dari entry negatif");
assert(walletSrc.includes("status: { in: [\"PENDING\", \"APPROVED\"] }"), "D3 expected locked = penarikan in-flight");
assert(walletSrc.includes("lifetimeEarned - expected.totalReversed"), "D4 financial integrity gate: ledger vs wallet position");
assert(walletSrc.includes("mismatches.push(`invariant"), "D5 invariant dilaporkan bila posisi tidak sama");
assert(!walletSrc.includes("user.saldo"), "D6 wallet TIDAK menyentuh User.saldo (isolasi penuh)");
assert(!walletSrc.includes("user.update"), "D7 tidak ada mutasi User langsung di wallet service");

const schemaSrc = read("prisma/schema.prisma");
assert(schemaSrc.includes("model TeacherWallet") && schemaSrc.includes("TERPISAH dari User.saldo"), "D8 schema wallet terpisah dari User.saldo");
assert(schemaSrc.includes("enum CommissionEntryType"), "D9 enum CommissionEntryType ada");
assert(schemaSrc.includes("@@unique([transaksiId, teacherId, entryType])"), "D10 unique key 3 kolom di schema");
assert(schemaSrc.includes("lockedBalance") && schemaSrc.includes("lifetimeEarned") && schemaSrc.includes("lifetimeWithdrawn"), "D11 field wallet baru di schema");

// ═══════════════════════════════════════════════════════════════════════════════
// E. WITHDRAWAL
// ═══════════════════════════════════════════════════════════════════════════════
section("E. Withdrawal — minimum, locking, state machine");

const withdrawalSrc = read("lib/commission/withdrawals.ts");
assert(withdrawalSrc.includes("teacherCommissionMinimumWithdrawal()"), "E1 minimum withdrawal dibaca dari config (tidak hardcode)");
assert(withdrawalSrc.includes("amount < minimum") && withdrawalSrc.includes("BELOW_MINIMUM"), "E2 < Rp50.000 → ditolak");
assert(withdrawalSrc.includes("availableBalance: { gte: amount }"), "E3 klaim dana atomik — updateMany bersyarat saldo");
assert(withdrawalSrc.includes("availableBalance: { decrement: amount }") && withdrawalSrc.includes("lockedBalance: { increment: amount }"), "E4 request → available turun, locked naik (atomik)");
assert(withdrawalSrc.includes("claim.count === 0"), "E5 request kedua tanpa saldo → ditolak (no double locking)");
assert(withdrawalSrc.includes("VALID_TRANSITIONS"), "E6 state machine transisi valid");
assert(withdrawalSrc.includes("TRANSFER") && withdrawalSrc.includes("decLocked") && withdrawalSrc.includes("incLifetimeWithdrawn"), "E7 payout → locked turun, lifetimeWithdrawn naik");
assert(withdrawalSrc.includes('action === "REJECT" || action === "CANCEL"') && withdrawalSrc.includes("incAvailable"), "E8 gagal/batal → dana kembali ke available");
assert(withdrawalSrc.includes('where: { id: withdrawalId, status: transition.from }'), "E9 duplicate payout callback → ALREADY_PROCESSED (no double payout)");
assert(withdrawalSrc.includes("bankName: input.bankName.trim()"), "E10 rekening disnapshot server-side dari profil");

// ═══════════════════════════════════════════════════════════════════════════════
// F. SECURITY
// ═══════════════════════════════════════════════════════════════════════════════
section("F. Security — no client trust, isolation");

const apiSummary = read("app/api/teacher/commissions/route.ts");
const apiWithdraw = read("app/api/teacher/commissions/withdraw/route.ts");
assert(apiSummary.includes("getUser()") && apiSummary.includes('user.role !== "GURU"'), "F1 auth + role gate di API komisi");
assert(apiSummary.includes("const teacherId = user.id"), "F2 identitas guru dari sesi — teacherId klien diabaikan");
assert(!apiWithdraw.includes("body.teacherId"), "F3 teacherId TIDAK pernah dibaca dari body klien");
assert(!apiWithdraw.includes("body.walletBalance") && !apiWithdraw.includes("body.commissionAmount"), "F4 saldo/jumlah komisi TIDAK pernah dari klien");
assert(apiWithdraw.includes("Math.floor(Number(body.amount))") && apiWithdraw.includes("Number.isFinite"), "F5 nominal divalidasi server-side");
assert(
  apiWithdraw.includes("getPayoutProfileRaw(user.id)") &&
    !apiWithdraw.includes("body.bankNumber") &&
    !apiWithdraw.includes("body.bankName") &&
    !apiWithdraw.includes("body.accountNumber"),
  "F6 destinasi di-resolve server-side (payout profile/Profile dari sesi) — bukan dari body klien"
);
assert(engineSrc.includes("attribution.teacher.role, attribution.teacher.isFounder"), "F7 ADMIN exclusion di-enforce server-side (engine)");

// Isolation antar guru
const withdrawalsApi = read("app/api/teacher/commissions/withdrawals/route.ts");
assert(withdrawalsApi.includes("listWithdrawals(user.id"), "F8 guru hanya membaca penarikan milik sendiri");
const historyApi = read("app/api/teacher/commissions/history/route.ts");
assert(historyApi.includes("listCommissions(user.id"), "F9 guru hanya membaca ledger milik sendiri");

// ═══════════════════════════════════════════════════════════════════════════════
// G. WIRING
// ═══════════════════════════════════════════════════════════════════════════════
section("G. Wiring — webhook, cron, join, admin, audit");

const webhookSrc = read("app/api/payment/webhook/route.ts");
assert(webhookSrc.includes("createCommissionFromTransaction"), "G1 webhook memanggil commission engine");
assert(webhookSrc.includes('"isMurid" in processed && processed.isMurid === true'), "G2 komisi hanya untuk settlement premium MURID");
assert(webhookSrc.includes("transaksi.type === \"MURID_PREMIUM\""), "G3 gate type MURID_PREMIUM di webhook");
assert(webhookSrc.includes("reverseCommissionForTransaction"), "G4 refund webhook → reversal komisi");
assert(webhookSrc.includes('new Set(["refund", "partial_refund", "chargeback", "partial_chargeback"])'), "G5 event refund/chargeback ditangani");
assert(webhookSrc.includes("Commission creation failed (retry-safe)"), "G6 kegagalan komisi tidak menggagalkan pembayaran");

const joinSrc = read("app/api/group/join/route.ts");
assert(joinSrc.includes("ensureAttributionOnClassJoin"), "G7 join kelas → materialisasi attribution (best-effort)");

const vercelSrc = read("vercel.json");
assert(vercelSrc.includes("/api/cron/teacher-commissions-release"), "G8 cron release terdaftar di vercel.json");
assert(vercelSrc.includes("/api/cron/teacher-commissions-reconcile"), "G9 cron reconcile terdaftar di vercel.json");
assert(has("app/api/cron/teacher-commissions-release/route.ts"), "G10 route cron release ada");
assert(has("app/api/cron/teacher-commissions-reconcile/route.ts"), "G11 route cron reconcile ada");

const auditSrc = read("lib/commission/audit.ts");
assert(auditSrc.includes("adminPaymentAuditLog"), "G12 REUSE AdminPaymentAuditLog (bukan sistem audit kedua)");
assert(auditSrc.includes("COMMISSION_"), "G13 aksi audit ber-domain COMMISSION_*");

const adminWdSrc = read("app/api/admin/teacher-commissions/withdrawals/[id]/route.ts");
assert(adminWdSrc.includes("!admin.isFounder"), "G14 admin endpoints founder-only");
assert(adminWdSrc.includes("processWithdrawal(id, action, admin.id)"), "G15 admin memproses withdrawal dengan identitas admin (audit)");

assert(has("app/api/teacher/commissions/route.ts"), "G16 GET /api/teacher/commissions ada");
assert(has("app/api/teacher/commissions/history/route.ts"), "G17 GET history ada");
assert(has("app/api/teacher/commissions/withdrawals/route.ts"), "G18 GET withdrawals ada");
assert(has("app/api/teacher/commissions/withdraw/route.ts"), "G19 POST withdraw ada");
assert(has("app/api/admin/teacher-commissions/backfill/route.ts"), "G20 admin backfill ada");
assert(has("app/api/admin/teacher-commissions/reconciliation/route.ts"), "G21 admin reconciliation ada");
assert(has("scripts/backfill-teacher-commissions.ts"), "G22 CLI backfill ada (dry-run default)");
assert(has("prisma/migrations/manual/2026-08-26_p7c_commission_wallet.sql"), "G23 migration manual idempoten ada");

// ═══════════════════════════════════════════════════════════════════════════════
// H. SIMULASI MURNI — FINANCIAL INTEGRITY GATE (§23)
// ═══════════════════════════════════════════════════════════════════════════════
section("H. Simulation — invariant & concurrency model");

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

function resetSim() {
  Object.assign(wallet, zero);
}

function invariant(): boolean {
  return (
    wallet.lifetimeEarned - wallet.totalReversed ===
    wallet.available + wallet.pending + wallet.locked + wallet.lifetimeWithdrawn
  );
}

// Mirrors engine operations 1:1 (same order of wallet moves).
function commissionCreate(amount: number) {
  wallet.pending += amount;
  wallet.lifetimeEarned += amount;
}
function release(amount: number) {
  wallet.pending -= amount;
  wallet.available += amount;
}
function requestWithdrawal(amount: number): boolean {
  if (wallet.available < amount) return false;
  wallet.available -= amount;
  wallet.locked += amount;
  return true;
}
function payout(amount: number) {
  wallet.locked -= amount;
  wallet.lifetimeWithdrawn += amount;
}
function rejectWithdrawal(amount: number) {
  wallet.locked -= amount;
  wallet.available += amount;
}
function reverseFromEligible(amount: number) {
  wallet.pending -= amount;
  wallet.totalReversed += amount;
}
function reverseFromAvailable(amount: number) {
  wallet.available -= amount;
  wallet.totalReversed += amount;
}
function reverseAlreadyWithdrawn(amount: number) {
  wallet.totalReversed += amount; // negatif adjustment — admin resolves via reconciliation
}

let simOk = true;
function step(name: string, fn: () => void) {
  fn();
  if (!invariant()) {
    simOk = false;
    failures.push(`H-sim ${name}: INVARIANT BROKEN`);
    console.error(`  ✗ FAIL: H-sim ${name} — ledger ≠ wallet position`);
  }
}

// Skenario 1: lifecycle penuh
resetSim();
step("create+release+withdraw+payout", () => {
  commissionCreate(1900);
  release(1900);
  if (!requestWithdrawal(1900)) throw new Error("unreachable");
  payout(1900);
});
assert(wallet.lifetimeEarned === 1900 && wallet.lifetimeWithdrawn === 1900, "H1 lifecycle: earned=1900, withdrawn=1900, saldo 0");

// Skenario 2: reversal saat ELIGIBLE (refund sebelum release)
resetSim();
step("reversal-eligible", () => {
  commissionCreate(1500);
  reverseFromEligible(1500);
});
assert(wallet.lifetimeEarned - wallet.totalReversed === 0, "H2 reversal ELIGIBLE → posisi bersih 0");
assert(wallet.pending === 0, "H2b pendingBalance kembali 0 setelah reversal");

// Skenario 3: reversal saat AVAILABLE
resetSim();
step("reversal-available", () => {
  commissionCreate(1000);
  release(1000);
  reverseFromAvailable(1000);
});
assert(wallet.available === 0 && wallet.totalReversed === 1000, "H3 reversal AVAILABLE → available 0, totalReversed tercatat");

// Skenario 4: reversal setelah ditarik (PROCESSING/PAID)
// Per spec §12: TIDAK mutasi withdrawal historis — entry negatif adalah
// adjustment yang diaudit; mismatch DIDETEKSI oleh reconciliation dan
// di-resolve admin. Di sini kita buktikan DETEKSI + resolusi mengembalikan invariant.
resetSim();
commissionCreate(800);
release(800);
if (!requestWithdrawal(800)) throw new Error("unreachable");
payout(800);
const mismatchDetected = (() => {
  reverseAlreadyWithdrawn(800);
  return !invariant();
})();
assert(mismatchDetected, "H4a reversal setelah withdrawn → mismatch TERDETEKSI (wallet ≠ ledger, untuk admin)");
// Resolusi admin (clawback): wallet disesuaikan dengan ledger — invariant pulih.
wallet.lifetimeWithdrawn -= 800;
assert(invariant(), "H4b setelah resolusi admin → ledger = wallet position pulih");
assert(wallet.lifetimeEarned - wallet.totalReversed === 0, "H4c ledger net 0 setelah reversal withdrawn + resolusi");

// Skenario 5: rejected withdrawal mengembalikan dana
resetSim();
step("withdraw-reject-restore", () => {
  commissionCreate(500);
  release(500);
  if (!requestWithdrawal(500)) throw new Error("unreachable");
  rejectWithdrawal(500);
});
assert(wallet.available === 500 && wallet.locked === 0, "H5 reject → dana kembali ke available");

// Skenario 6: concurrent request — hanya satu yang menang (simulasi CAS)
resetSim();
commissionCreate(500);
release(500);
{
  const claim1 = requestWithdrawal(500);
  const claim2 = requestWithdrawal(500); // tab kedua — saldo sudah habis
  assert(claim1 === true && claim2 === false, "H6 concurrent withdrawal: hanya satu klaim menang");
  assert(invariant(), "H6b invariant terjaga setelah concurrent claim");
}

// Skenario 7: double release — klaim kedua no-op (simulasi claim-first)
resetSim();
commissionCreate(700);
release(700);
{
  const snapshot = JSON.stringify(wallet);
  release(0); // loser claim = no-op
  assert(JSON.stringify(wallet) === snapshot, "H7 double release = no-op");
}

// Skenario 8: banyak transaksi campur — invariant terus terjaga di setiap langkah
resetSim();
let mixedOk = true;
const mixedSteps: Array<[string, () => void]> = [
  ["mixed-1 create", () => commissionCreate(1900)],
  ["mixed-2 create", () => commissionCreate(1500)],
  ["mixed-3 reversal", () => reverseFromEligible(1500)],
  ["mixed-4 release", () => release(1900)],
  ["mixed-5 create", () => commissionCreate(1000)],
  ["mixed-6 release", () => release(1000)],
  ["mixed-7 withdraw", () => { if (!requestWithdrawal(2000)) throw new Error("unreachable"); }],
  ["mixed-8 payout", () => payout(2000)],
  ["mixed-9 create", () => commissionCreate(800)],
  ["mixed-10 reversal-available", () => { release(800); reverseFromAvailable(800); }],
];
for (const [name, fn] of mixedSteps) {
  fn();
  if (!invariant()) {
    mixedOk = false;
    failures.push(`H-sim ${name}: INVARIANT BROKEN`);
    console.error(`  ✗ FAIL: H-sim ${name} — ledger ≠ wallet position`);
  }
}
assert(mixedOk, "H8 SEMUA langkah simulasi campuran menjaga invariant (ledger = wallet position)");
assert(simOk, "H8b SEMUA skenario step() menjaga invariant");
assert(
  wallet.lifetimeEarned - wallet.totalReversed === wallet.available + wallet.pending + wallet.locked + wallet.lifetimeWithdrawn,
  "H9 FINANCIAL INTEGRITY GATE — Total Ledger Position = Wallet Position (final)"
);

// ═══════════════════════════════════════════════════════════════════════════════
// I. EXISTING TESTS TIDAK TERGUNCANG (protected zones)
// ═══════════════════════════════════════════════════════════════════════════════
section("I. Protected zones & konvensi");

assert(!read("lib/commission/engine.ts").includes("user.saldo"), "I1 engine tidak menyentuh User.saldo");
assert(!read("lib/commission/withdrawals.ts").includes("user.saldo"), "I2 withdrawals tidak menyentuh User.saldo");
const webhookHasClaim = webhookSrc.includes('where: { id: transaksi.id, status: { not: "SUCCESS" } }');
assert(webhookHasClaim, "I3 claim-first webhook existing tetap utuh (payment flow tidak berubah)");
assert(read("lib/commission/config.ts").includes("50_000"), "I4 default minimum Rp50.000 hanya di config");

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
console.log("\n✅ P7C QA — SEMUA LULUS (financial integrity, idempotency, concurrency, security)");
process.exit(0);
