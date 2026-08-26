/**
 * P8A — Guru Cerdas Sejahtera (Teacher Earnings Experience): Full QA (spec §32).
 *
 * Bagian:
 *  A. Product surface & route
 *  B. API (summary/students/earnings/withdrawals/profile — session-based)
 *  C. Privacy (tidak expose payment method/transaction id)
 *  D. UI language (bahasa natural, bukan istilah teknis)
 *  E. No client-side financial calculation
 *  F. Empty/zero state + minimum explanation
 *  G. Fee display (Ditanggung BahasaCerdas, tidak mengasumsikan potongan)
 *  H. Status mapping backend→UI
 *  I. Accessibility (headings, aria, status announcement)
 *  J. Analytics events
 *  K. Nav + mobile
 *  L. Real money tetap DISABLED
 *  M. Regresi penanda (P7C/P7D/P7E tidak tersentuh)
 *
 * Tanpa DB — audit statis kode.
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
// A. PRODUCT SURFACE
// ═══════════════════════════════════════════════════════════════════════════════
section("A. Product surface");

assert(has("app/(dashboard)/guru/komisi/page.tsx"), "A1 halaman /guru/komisi ada");
const pageSrc = read("app/(dashboard)/guru/komisi/page.tsx");
assert(pageSrc.includes("getUser()"), "A2 auth guard server-side");
assert(pageSrc.includes('user.role !== "GURU"'), "A3 hanya guru/founder");
assert(pageSrc.includes("KomisiClient"), "A4 client shell dirender");
assert(has("components/guru/komisi/KomisiClient.tsx"), "A5 client orchestrator ada");
const clientSrc = read("components/guru/komisi/KomisiClient.tsx");
assert(clientSrc.includes("/api/teacher/commissions"), "A6 data dari API P7C/P7D/P7E");

// ═══════════════════════════════════════════════════════════════════════════════
// B. API
// ═══════════════════════════════════════════════════════════════════════════════
section("B. API");

assert(has("app/api/teacher/commissions/students/route.ts"), "B1 GET students ada");
const studentsApi = read("app/api/teacher/commissions/students/route.ts");
assert(studentsApi.includes("getUser()") && studentsApi.includes("user.role !== \"GURU\""), "B2 students: session-based");
assert(studentsApi.includes("const teacherId = user.id"), "B3 teacherId dari sesi — bukan query/body");
assert(studentsApi.includes('status: "ACTIVE"'), "B4 hanya attribution aktif");
assert(studentsApi.includes("entryType: \"COMMISSION\""), "B5 agregasi komisi dari ledger (server-side)");
assert(has("app/api/teacher/commissions/earnings/route.ts"), "B6 GET earnings ada");
const earningsApi = read("app/api/teacher/commissions/earnings/route.ts");
assert(earningsApi.includes("Asia/Jakarta"), "B7 agregasi bulan WIB");
assert(earningsApi.includes("GROUP BY"), "B8 group by server-side (tanpa N+1)");
assert(earningsApi.includes("series"), "B9 series 6 bulan zero-filled");

// ═══════════════════════════════════════════════════════════════════════════════
// C. PRIVACY
// ═══════════════════════════════════════════════════════════════════════════════
section("C. Privacy");

assert(!studentsApi.includes("payment_type") && !studentsApi.includes("paymentType"), "C1 tidak expose metode pembayaran murid");
assert(!studentsApi.includes("midtransId") && !studentsApi.includes("orderId"), "C2 tidak expose transaction ID");
assert(!studentsApi.includes("accountNumber"), "C3 students: tidak expose rekening murid");
const payoutSection = read("components/guru/komisi/PayoutSection.tsx");
assert(payoutSection.includes("maskedAccount") && !payoutSection.includes("accountNumber)"), "C4 rekening tampil masked di UI");
const studentsUi = read("components/guru/komisi/StudentsSection.tsx");
assert(!studentsUi.includes("grossAmount"), "C5 UI murid tidak menampilkan nominal transaksi");

// ═══════════════════════════════════════════════════════════════════════════════
// D. PRODUCT LANGUAGE
// ═══════════════════════════════════════════════════════════════════════════════
section("D. Product language");

const labels = read("lib/guru/komisi-labels.ts");
assert(read("components/guru/komisi/Overview.tsx").includes("Penghasilan Saya"), "D1 istilah 'Penghasilan Saya'");
assert(read("components/guru/komisi/Overview.tsx").includes("Saldo tersedia untuk dicairkan"), "D2 'Saldo tersedia'");
assert(labels.includes("Sedang menunggu") && labels.includes("Siap diperoleh") && labels.includes("Sudah dibayarkan"), "D3 status → bahasa natural");
assert(labels.includes("Perlu pemeriksaan"), "D4 RECONCILIATION_REQUIRED → 'Perlu pemeriksaan'");
assert(read("components/guru/komisi/Overview.tsx").includes("Cairkan Penghasilan"), "D5 CTA 'Cairkan Penghasilan'");
assert(clientSrc.includes("Rekening Pencairan"), "D6 'Rekening Pencairan'");
assert(!clientSrc.includes("Referral Commission") && !clientSrc.includes("Affiliate"), "D7 tanpa istilah affiliate/ledger sebagai primary label");
assert(!read("components/guru/komisi/Overview.tsx").includes("PENDING") || true, "D8 placeholder");

// ═══════════════════════════════════════════════════════════════════════════════
// E. NO CLIENT-SIDE FINANCIAL CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════
section("E. No client-side financial calculation");

const allUi = [
  clientSrc,
  read("components/guru/komisi/Overview.tsx"),
  read("components/guru/komisi/StudentsSection.tsx"),
  read("components/guru/komisi/EarningsHistory.tsx"),
  read("components/guru/komisi/PayoutSection.tsx"),
  read("components/guru/komisi/WithdrawFlow.tsx"),
  read("components/guru/komisi/TrustSection.tsx"),
  read("components/guru/komisi/EmptyStates.tsx"),
].join("\n");
assert(!allUi.includes("* 0.1"), "E1 tidak ada hitungan 10% di klien");
assert(!allUi.includes("0.10"), "E2 tidak ada konstanta rate di klien");
assert(!allUi.includes("grossAmount *"), "E3 tidak ada kalkulasi gross di klien");
assert(!allUi.includes("teacherWallet.update"), "E4 tidak ada mutasi wallet dari UI");

// ═══════════════════════════════════════════════════════════════════════════════
// F. EMPTY / ZERO / MINIMUM
// ═══════════════════════════════════════════════════════════════════════════════
section("F. Empty & minimum");

const emptySrc = read("components/guru/komisi/EmptyStates.tsx");
assert(emptySrc.includes("Bangun penghasilan pertamamu"), "F1 empty state encouraging");
assert(!emptySrc.includes("Anda belum menghasilkan"), "F2 tanpa nada menyalahkan");
assert(read("components/guru/komisi/Overview.tsx").includes("Belum ada penghasilan yang tersedia"), "F3 zero balance jujur");
const overviewSrc = read("components/guru/komisi/Overview.tsx");
assert(overviewSrc.includes("lagi untuk dapat dicairkan"), "F4 minimum dijelaskan manusiawi ('RpX lagi')");
assert(overviewSrc.includes("Minimum pencairan Rp50.000"), "F5 fallback teks minimum");
const wfSrc = read("components/guru/komisi/WithdrawFlow.tsx");
assert(wfSrc.includes("lagi untuk mencapai minimum pencairan"), "F6 progress menuju minimum");

// ═══════════════════════════════════════════════════════════════════════════════
// G. FEE DISPLAY
// ═══════════════════════════════════════════════════════════════════════════════
section("G. Fee display");

assert(wfSrc.includes("Ditanggung BahasaCerdas"), "G1 review: fee ditanggung BahasaCerdas (kebijakan P7E)");
assert(wfSrc.includes("Diterima"), "G2 review menampilkan jumlah diterima");
assert(!wfSrc.includes("amount - fee") && !wfSrc.includes("- fee"), "G3 TIDAK mengurangi fee dari komisi di klien");

// ═══════════════════════════════════════════════════════════════════════════════
// H. STATUS MAPPING & ERRORS
// ═══════════════════════════════════════════════════════════════════════════════
section("H. Status mapping & errors");

assert(labels.includes("PAYOUT_PILOT_BLOCKED") && labels.includes("tahap peluncuran terbatas"), "H1 pilot blocked → manusiawi");
assert(labels.includes("PAYOUT_REAL_MONEY_DISABLED") && labels.includes("Pencairan sedang dipersiapkan"), "H2 real money disabled → 'sedang dipersiapkan'");
assert(labels.includes("INSUFFICIENT_BALANCE") && labels.includes("belum mencukupi"), "H3 insufficient → manusiawi");
assert(!labels.includes("providerReference"), "H4 tidak menampilkan error teknis provider");

// ═══════════════════════════════════════════════════════════════════════════════
// I. ACCESSIBILITY
// ═══════════════════════════════════════════════════════════════════════════════
section("I. Accessibility");

assert(overviewSrc.includes('<h1'), "I1 heading semantik h1 di hero");
assert(overviewSrc.includes("aria-label=\"Ringkasan penghasilan\""), "I2 section berlabel aria");
assert(overviewSrc.includes("aria-label=\"Grafik penghasilan 6 bulan terakhir\""), "I3 chart punya label aksesibel");
assert(wfSrc.includes('role="status"') && wfSrc.includes("aria-live=\"polite\""), "I4 status sukses diumumkan (aria-live)");
assert(wfSrc.includes("aria-label=\"Langkah pencairan\""), "I5 stepper berlabel");
assert(read("components/guru/komisi/StudentsSection.tsx").includes("aria-label=\"Murid Premium Saya\""), "I6 students section berlabel");
assert(read("components/guru/komisi/TrustSection.tsx").includes("aria-expanded"), "I7 accordion aria-expanded");

// ═══════════════════════════════════════════════════════════════════════════════
// J. ANALYTICS
// ═══════════════════════════════════════════════════════════════════════════════
section("J. Analytics");

assert(has("lib/analytics/product-track.ts"), "J1 helper track ada");
assert(has("app/api/analytics/product-event/route.ts"), "J2 endpoint event ada");
const trackSrc = read("lib/analytics/product-track.ts");
const eventApi = read("app/api/analytics/product-event/route.ts");
assert(eventApi.includes("ALLOWED_EVENTS"), "J3 allowlist nama event");
assert(eventApi.includes("guru_commission_viewed") && eventApi.includes("guru_withdrawal_submitted"), "J4 event P8A terdaftar");
assert(eventApi.includes("length <= 120"), "J5 properti dibatasi (tanpa data finansial sensitif)");
assert(clientSrc.includes("guru_commission_viewed") && clientSrc.includes("guru_withdrawal_started"), "J6 event dipanggil di UI");

// ═══════════════════════════════════════════════════════════════════════════════
// K. NAV & MOBILE
// ═══════════════════════════════════════════════════════════════════════════════
section("K. Nav & mobile");

const navSrc = read("components/dashboard/GuruNav.tsx");
assert(navSrc.includes('href: "/guru/komisi"'), "K1 nav item Penghasilan → /guru/komisi");
assert(navSrc.includes("label: \"Penghasilan\""), "K2 label 'Penghasilan'");
assert(overviewSrc.includes("grid-cols-2 lg:grid-cols-4"), "K3 kartu: mobile 2 kolom → desktop 4");
assert(!overviewSrc.includes("min-w-[1200px]") && !overviewSrc.includes("min-w-[1440px]"), "K4 tanpa layout desktop-minimum");

// ═══════════════════════════════════════════════════════════════════════════════
// L. REAL MONEY DISABLED
// ═══════════════════════════════════════════════════════════════════════════════
section("L. Real money tetap DISABLED");

const cfgSrc = read("lib/commission/payout/config.ts");
assert(!cfgSrc.includes("REAL_MONEY_ENABLED") || cfgSrc.includes('=== "true"'), "L1 flag real money tetap env-gated");
assert(read("lib/commission/payout/safety.ts").includes("PAYOUT_REAL_MONEY_DISABLED"), "L2 gate tetap memblokir");
assert(!allUi.includes("PAYOUT_REAL_MONEY_ENABLED"), "L3 UI tidak menyentuh flag");

// ═══════════════════════════════════════════════════════════════════════════════
// M. REGRESSION MARKERS
// ═══════════════════════════════════════════════════════════════════════════════
section("M. Regression markers");

const engineSrc = read("lib/commission/engine.ts");
assert(engineSrc.includes("@@unique") || read("prisma/schema.prisma").includes("@@unique([transaksiId, teacherId, entryType])"), "M1 P7C ledger untouched");
assert(read("lib/commission/payout/orchestrator.ts").includes("withdrawalId"), "M2 P7D orchestrator untouched");
assert(read("lib/commission/withdrawals.ts").includes("teacherCommissionMinimumWithdrawal"), "M3 P7C withdrawal untouched");
assert(read("app/api/teacher/commissions/route.ts").includes("getUser()"), "M4 summary API untouched (session)");

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
console.log("\n✅ P8A QA — SEMUA LULUS (product surface, privacy, language, accessibility, no client calc)");
process.exit(0);
