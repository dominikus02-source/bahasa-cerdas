/**
 * FOUNDER BANK GB3 — additive importer for /guru/bank-soal (22 themes, 840 rows).
 *
 * Approved manifest: data/founder-bank-gb3/manifest.json
 * (BC-GB3-<CODE>-<NNN>, source MASTER_BANK, kelas SEMUA — content approved
 * through the Phase 7 + finalization gates; provenance per row).
 *
 * Pipeline:
 *   1. Validate manifest deterministically (counts, codes, fields).
 *   2. Dry run (default): print reconciliation, touch nothing.
 *      --execute: mutate the DB inside the gates below.
 *
 * Mutation plan (single transaction, ADDITIVE ONLY):
 *   - insert missing GB3 Soal rows (idempotent: kodeSoal globally unique,
 *     pre-select existing codes, insert only missing; rerun = 0 inserts).
 *   - NEVER retire, update, or delete any existing row.
 *   - NEVER touch MASTER_BANK_RETIRED, TKA, UKBI, or assessment tables.
 *
 * Invariants (any failure ROLLS BACK everything):
 *   - active MASTER_BANK == before + inserted
 *   - GB3 rows == 840
 *   - zero rows with empty text/key among GB3
 *   - retired count unchanged
 *   - TKAQuestion / PaketKompetensi / TestAnswer / ProgresKompetensi unchanged
 *
 * Safety: dry-run default; --execute requires env FOUNDER_GB3_CONFIRM=YES.
 */
import fs from "fs";
import path from "path";
import { config } from "dotenv";
config({ path: path.join(process.cwd(), ".env.local") });
import { PrismaClient } from "@prisma/client";

const MANIFEST = path.join(process.cwd(), "data/founder-bank-gb3/manifest.json");
const EXECUTE = process.argv.includes("--execute");
const CONFIRMED = process.env.FOUNDER_GB3_CONFIRM === "YES";
const KODE_PREFIX = "BC-GB3-";
const EXPECTED_ROWS = 840;

interface ManifestRow {
  kodeSoal: string; theme: string; theme_code: string; text: string;
  type: string; difficulty: string; options: string[]; correctAnswer: string;
  explanation: string | null; topik: string; kelas: string; source: string;
  provenance: string;
}

function loadManifest(): ManifestRow[] {
  const rows = JSON.parse(fs.readFileSync(MANIFEST, "utf8")) as ManifestRow[];
  if (!Array.isArray(rows) || rows.length !== EXPECTED_ROWS) {
    throw new Error(`manifest must hold exactly ${EXPECTED_ROWS} rows (got ${Array.isArray(rows) ? rows.length : "non-array"})`);
  }
  const codes = new Set<string>();
  for (const r of rows) {
    if (!r.kodeSoal.startsWith(KODE_PREFIX)) throw new Error(`bad prefix: ${r.kodeSoal}`);
    if (codes.has(r.kodeSoal)) throw new Error(`duplicate code in manifest: ${r.kodeSoal}`);
    codes.add(r.kodeSoal);
    if (r.source !== "MASTER_BANK" || r.kelas !== "SEMUA") throw new Error(`bad source/kelas: ${r.kodeSoal}`);
    if (r.type !== "PILIHAN_GANDA" && r.type !== "BENAR_SALAH") throw new Error(`bad type: ${r.kodeSoal}`);
    if (!r.text || (r.options.length !== 4 && r.options.length !== 2)) throw new Error(`bad shape: ${r.kodeSoal}`);
    if (r.correctAnswer === "" || r.correctAnswer == null) throw new Error(`empty key: ${r.kodeSoal}`);
    const idx = Number(r.correctAnswer);
    if (!Number.isInteger(idx) || idx < 0 || idx >= r.options.length) throw new Error(`key out of range: ${r.kodeSoal}`);
  }
  return rows;
}

async function main(): Promise<void> {
  const rows = loadManifest();
  const pg = rows.filter((r) => r.type === "PILIHAN_GANDA").length;
  const tf = rows.length - pg;
  console.log(`manifest OK: ${rows.length} rows (${pg} PG, ${tf} TF), 840 unique ${KODE_PREFIX} codes`);

  const db = new PrismaClient();
  const beforeActive = await db.soal.count({ where: { source: "MASTER_BANK" } });
  const beforeRetired = await db.soal.count({ where: { source: "MASTER_BANK_RETIRED" } });
  const beforeGb3 = await db.soal.count({ where: { kodeSoal: { startsWith: KODE_PREFIX } } });
  const beforeTka = await db.tKAQuestion.count();
  const beforePaket = await db.paketKompetensi.count();
  const beforeAnswer = await db.testAnswer.count();
  const beforeProgres = await db.progresKompetensi.count();
  const guru = await db.user.findUnique({ where: { email: "guru@demo.com" }, select: { id: true } });
  if (!guru) throw new Error("FATAL: uploader guru@demo.com not found");
  console.log(`DB before: active=${beforeActive} retired=${beforeRetired} gb3=${beforeGb3} tka=${beforeTka} paket=${beforePaket} answers=${beforeAnswer} progres=${beforeProgres}`);

  const existing = await db.soal.findMany({
    where: { kodeSoal: { startsWith: KODE_PREFIX } },
    select: { kodeSoal: true },
  });
  const existingSet = new Set(existing.map((e) => e.kodeSoal));
  const fresh = rows.filter((r) => !existingSet.has(r.kodeSoal));
  console.log(`fresh to insert: ${fresh.length} (already present: ${rows.length - fresh.length})`);

  if (!EXECUTE) {
    console.log("\nDRY RUN ONLY — no DB writes. Re-run with --execute (and FOUNDER_GB3_CONFIRM=YES) to apply.");
    await db.$disconnect();
    return;
  }
  if (!CONFIRMED) throw new Error("EXECUTE requires FOUNDER_GB3_CONFIRM=YES");

  const result = await db.$transaction(async (tx) => {
    let inserted = 0;
    const BATCH = 250;
    for (let i = 0; i < fresh.length; i += BATCH) {
      const slice = fresh.slice(i, i + BATCH);
      const res = await tx.soal.createMany({
        data: slice.map((row) => ({
          kodeSoal: row.kodeSoal, judul: row.theme, text: row.text, type: row.type,
          difficulty: row.difficulty, options: row.options, correctAnswer: row.correctAnswer,
          explanation: row.explanation, topik: row.topik, kelas: "SEMUA",
          source: "MASTER_BANK", uploaderId: guru.id,
        })),
        skipDuplicates: true,
      });
      inserted += res.count;
    }
    const afterActive = await tx.soal.count({ where: { source: "MASTER_BANK" } });
    if (afterActive !== beforeActive + inserted) {
      throw new Error(`INVARIANT_FAIL: active ${afterActive} != ${beforeActive} + ${inserted}`);
    }
    const gb3Count = await tx.soal.count({ where: { kodeSoal: { startsWith: KODE_PREFIX } } });
    if (gb3Count !== EXPECTED_ROWS) throw new Error(`INVARIANT_FAIL: gb3 ${gb3Count} != ${EXPECTED_ROWS}`);
    const bad = await tx.soal.count({
      where: { kodeSoal: { startsWith: KODE_PREFIX }, OR: [{ text: "" }, { correctAnswer: "" }] },
    });
    if (bad > 0) throw new Error(`INVARIANT_FAIL: ${bad} rows with empty text/key`);
    const retiredNow = await tx.soal.count({ where: { source: "MASTER_BANK_RETIRED" } });
    if (retiredNow !== beforeRetired) throw new Error(`INVARIANT_FAIL: retired changed ${beforeRetired} -> ${retiredNow}`);
    if ((await tx.tKAQuestion.count()) !== beforeTka) throw new Error("INVARIANT_FAIL: TKAQuestion changed");
    if ((await tx.paketKompetensi.count()) !== beforePaket) throw new Error("INVARIANT_FAIL: PaketKompetensi changed");
    if ((await tx.testAnswer.count()) !== beforeAnswer) throw new Error("INVARIANT_FAIL: TestAnswer changed");
    if ((await tx.progresKompetensi.count()) !== beforeProgres) throw new Error("INVARIANT_FAIL: ProgresKompetensi changed");
    return { inserted, afterActive };
  }, { timeout: 720000 });

  console.log(`\nEXECUTED: inserted ${result.inserted} GB3 rows; active MASTER_BANK ${beforeActive} -> ${result.afterActive}.`);
  console.log("NEXT: add BC-GB3- prefix to delivery gate + verify Guru Bank UI.");
  await db.$disconnect();
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e?.message ?? e); process.exit(1); });
