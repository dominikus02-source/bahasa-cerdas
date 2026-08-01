/**
 * Validator Jalur Cerdas — Bank Soal Dedupe
 *
 * Memvalidasi 12 file data di scripts/seed-jalur-dedupe-data/:
 * - 72 unit, masing-masing tepat 5 soal (f,g,h,i,j)
 * - ID unik global, tidak bentrok dengan u01a–u72e
 * - pilihan_ganda: 4 opsi, jawaban dalam rentang
 * - benar_salah: opsi ["Benar","Salah"]
 * - isi_blank: jawaban non-kosong
 * - semua soal punya penjelasan
 *
 * Usage:
 *   npx tsx scripts/validate-jalur-dedupe-data.ts
 */

import { readdirSync } from "fs";
import { join } from "path";

const DIR = join(process.cwd(), "scripts/seed-jalur-dedupe-data");

function main() {
  const files = readdirSync(DIR)
    .filter((f) => /^level-\d{2}\.ts$/.test(f))
    .sort();

  if (files.length !== 12) {
    console.error(`❌ Ditemukan ${files.length} file level (harus 12)`);
    process.exit(1);
  }

  const errs: string[] = [];
  const ids = new Set<string>();
  let unitCount = 0;
  let soalCount = 0;
  let pg = 0, bs = 0, ib = 0;

  for (const f of files) {
    const mod = require(join(DIR, f));
    const data = mod.default || mod.level || [];
    if (!Array.isArray(data)) {
      errs.push(`${f}: default export bukan array`);
      continue;
    }
    for (const u of data) {
      unitCount++;
      if (!u.level || !u.title) errs.push(`${f}: unit tanpa level/title`);
      if (!Array.isArray(u.soal) || u.soal.length !== 5) {
        errs.push(`${f} L${u.level} "${u.title}": ${u.soal?.length ?? 0} soal (harus 5)`);
        continue;
      }
      const suffixes = u.soal.map((q: any) => q.id?.slice(-1)).join("");
      if (suffixes !== "fghij") {
        errs.push(`${f} "${u.title}": suffix id harus f,g,h,i,j — dapat "${suffixes}"`);
      }
      for (const q of u.soal) {
        soalCount++;
        if (ids.has(q.id)) errs.push(`${f}: id ganda ${q.id}`);
        ids.add(q.id);
        if (!q.soal || !q.penjelasan) errs.push(`${f} ${q.id}: soal/penjelasan kosong`);
        if (q.tipe === "pilihan_ganda") {
          pg++;
          if (!Array.isArray(q.opsi) || q.opsi.length !== 4) errs.push(`${f} ${q.id}: opsi bukan 4`);
          if (typeof q.jawaban !== "number" || q.jawaban < 0 || q.jawaban >= (q.opsi?.length ?? 0))
            errs.push(`${f} ${q.id}: jawaban di luar rentang`);
        } else if (q.tipe === "benar_salah") {
          bs++;
          if (q.jawaban !== "Benar" && q.jawaban !== "Salah") errs.push(`${f} ${q.id}: jawaban benar_salah invalid`);
        } else if (q.tipe === "isi_blank") {
          ib++;
          if (typeof q.jawaban !== "string" || !q.jawaban.trim()) errs.push(`${f} ${q.id}: jawaban isi_blank kosong`);
        } else {
          errs.push(`${f} ${q.id}: tipe tidak dikenal ${q.tipe}`);
        }
      }
    }
  }

  console.log(`File: ${files.length} | Unit: ${unitCount} | Soal: ${soalCount} (PG ${pg}, BS ${bs}, isi_blank ${ib})`);
  console.log(`ID unik: ${ids.size}`);

  if (errs.length) {
    console.error(`\n❌ ${errs.length} masalah:`);
    errs.slice(0, 50).forEach((e) => console.error("   " + e));
    process.exit(1);
  }

  console.log("\n✅ SEMUA STRUKTUR VALID");
  process.exit(0);
}

main();
