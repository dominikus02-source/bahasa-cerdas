/**
 * P7C §19 — Backfill komisi Guru Cerdas Sejahtera.
 *
 * DRY RUN default: laporan lengkap tanpa menulis apa pun.
 * `--execute` : menjalankan backfill (idempotent — aman diulang).
 *
 * Respect: official launch date, eligibleFrom, attribution aktif,
 * status pembayaran SUCCESS, ADMIN exclusion, first-valid-wins.
 *
 * Pemakaian:
 *   npx tsx scripts/backfill-teacher-commissions.ts            # dry run
 *   npx tsx scripts/backfill-teacher-commissions.ts --execute  # eksekusi
 */

import { backfillTeacherCommissions } from "../lib/commission/backfill";

const execute = process.argv.includes("--execute");

async function main() {
  console.log(execute ? "▶ BACKFILL — MODE EXECUTE" : "▶ BACKFILL — MODE DRY RUN (tidak menulis apa pun)");
  console.log("");

  const report = await backfillTeacherCommissions({ dryRun: !execute });

  console.log("┌─────────────────────────────────────────────┐");
  console.log("│        LAPORAN BACKFILL KOMISI GURU         │");
  console.log("└─────────────────────────────────────────────┘");
  console.log(`  Total kandidat ditinjau : ${report.totalScanned}`);
  console.log(`  ELIGIBLE (dibuat)       : ${report.eligible}`);
  console.log(`  ALREADY_EXISTS          : ${report.alreadyExists}`);
  console.log(`  SKIPPED (no attribution): ${report.skipped}`);
  console.log(`  INVALID_ATTRIBUTION     : ${report.invalidAttribution}`);
  console.log(`  PRE_LAUNCH (eligibleFrom): ${report.preLaunch}`);
  console.log(`  EXCLUDED_TEACHER        : ${report.excludedTeacher}`);
  console.log(`  INVALID_PAYMENT         : ${report.invalidPayment}`);
  console.log("");

  if (report.rows.length > 0) {
    console.log("── Rincian baris ──");
    for (const row of report.rows.slice(0, 200)) {
      const teacher = row.teacherId ? ` guru=${row.teacherId.slice(0, 8)}` : "";
      console.log(
        `  [${row.status}] tx=${row.transaksiId.slice(0, 10)} murid=${row.studentId.slice(0, 8)}${teacher} jumlah=${row.amount} komisi=${row.commissionAmount}`
      );
    }
    if (report.rows.length > 200) {
      console.log(`  … dan ${report.rows.length - 200} baris lainnya (lihat laporan penuh via API admin).`);
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Backfill gagal:", err);
  process.exit(1);
});
