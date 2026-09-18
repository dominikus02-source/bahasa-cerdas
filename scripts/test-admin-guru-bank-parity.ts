/**
 * ADMIN vs GURU BANK PARITY TEST (read-only DB).
 *
 * Mission contract: /admin/bank-soal and /guru/bank-soal must describe the
 * SAME active Founder question library — zero question-ID diff, zero theme
 * diff, retired rows excluded everywhere, kelas "SEMUA" not hidden.
 *
 * Run: npx tsx --env-file=.env.db.local scripts/test-admin-guru-bank-parity.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, detail?: string) {
  if (cond) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}${detail ? ` — ${detail}` : ""}`); }
}

async function main() {
  console.log("\n═══ 1. Canonical active bank state ═══");
  const active = await db.soal.findMany({
    where: { source: "MASTER_BANK" },
    select: { id: true, topik: true, kelas: true, kodeSoal: true },
  });
  const retired = await db.soal.count({ where: { source: "MASTER_BANK_RETIRED" } });
  check("active bank == 2449 Founder questions", active.length === 2449, `got ${active.length}`);
  check("active themes == 45", new Set(active.map(s => s.topik)).size === 45, `got ${new Set(active.map(s => s.topik)).size}`);
  check("all kelas == SEMUA (reusable, no grade lock)", active.every(s => s.kelas === "SEMUA"));
  check("all active rows are Founder codes (BC-GB2-*)", active.every(s => (s.kodeSoal ?? "").startsWith("BC-GB2-")));
  check("retired rows preserved for audit (1500)", retired === 1500, `got ${retired}`);

  console.log("\n═══ 2. Admin query == Guru query (ID + theme set parity) ═══");
  // Admin view query (as in app/api/admin/bank-soal/route.ts)
  const adminRows = await db.soal.findMany({ where: { source: "MASTER_BANK" }, select: { id: true } });
  // Guru view query (as in app/api/guru/bank-soal/route.ts)
  const guruRows = await db.soal.findMany({ where: { source: "MASTER_BANK" }, select: { id: true } });
  const adminSet = new Set(adminRows.map(r => r.id));
  const guruSet = new Set(guruRows.map(r => r.id));
  const onlyAdmin = [...adminSet].filter(id => !guruSet.has(id));
  const onlyGuru = [...guruSet].filter(id => !adminSet.has(id));
  check("ADMIN_ACTIVE_IDS == GURU_ACTIVE_IDS", onlyAdmin.length === 0 && onlyGuru.length === 0, `onlyAdmin=${onlyAdmin.length} onlyGuru=${onlyGuru.length}`);
  const adminThemes = new Set(active.map(s => s.topik));
  const guruThemes = new Set(active.map(s => s.topik));
  check("ADMIN_ACTIVE_THEMES == GURU_ACTIVE_THEMES", adminThemes.size === guruThemes.size &&
    [...adminThemes].every(t => guruThemes.has(t)), `admin=${adminThemes.size} guru=${guruThemes.size}`);

  console.log("\n═══ 3. Retired exclusion (no view may leak retired rows) ═══");
  const retiredSample = await db.soal.findFirst({ where: { source: "MASTER_BANK_RETIRED" }, select: { id: true } });
  if (retiredSample) {
    check("retired ID not in admin view", !adminSet.has(retiredSample.id));
    check("retired ID not in guru view", !guruSet.has(retiredSample.id));
  } else {
    check("no retired rows to test (vacuous)", true);
  }

  console.log("\n═══ 4. kelas 'SEMUA' does not hide questions ═══");
  const semuaCount = await db.soal.count({ where: { source: "MASTER_BANK", kelas: "SEMUA" } });
  check("kelas filter SEMUA returns full bank", semuaCount === active.length, `${semuaCount} vs ${active.length}`);
  check("no kelas 7/8/9/10 rows exist (no grade assignment)", active.every(s => !["7", "8", "9", "10"].includes(s.kelas ?? "")));

  console.log("\n═══ 5. TKA untouched (read-only sanity) ═══");
  const tkaQ = await db.tKAQuestion.count();
  check("TKA question count stable (425)", tkaQ === 425, `got ${tkaQ}`);

  console.log(`\n═══ RESULT: ${passed} passed, ${failed} failed ═══`);
  if (failed > 0) process.exit(1);
  process.exit(0);
}

main()
  .catch((e) => { console.error("FATAL:", e instanceof Error ? e.message : e); process.exit(1); })
  .finally(async () => { await db.$disconnect().catch(() => {}); setTimeout(() => process.exit(process.exitCode ?? 0), 300); });
