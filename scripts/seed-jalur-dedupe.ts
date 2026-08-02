/**
 * Seed Jalur Cerdas — DEDUPE Bank Soal
 *
 * Memperbaiki duplikasi soal antar-unit dalam satu level.
 *
 * Masalah lama: setiap unit memiliki 5 soal unik (uXXa-e) + 6 soal dari
 * "shared pool" (fon*, ej*, hk*, ...) yang DIPUTAR ULANG di semua 6 unit
 * dalam satu level — sehingga murid menjawab soal sama berulang kali di
 * unit berbeda, dan beberapa unit berisi soal yang tidak sesuai judulnya.
 *
 * Solusi:
 * 1. Buang semua soal yang bukan milik unit (shared pool).
 * 2. Pertahankan 5 soal unik uXXa–e yang sudah spesifik per unit.
 * 3. Tambahkan 5 soal BARU (uXXf–j) dari scripts/seed-jalur-dedupe-data/.
 * 4. Hasil: 10 soal per unit, semuanya unik di seluruh jalur (720 soal).
 *
 * Keamanan:
 * - Dry-run secara default (--execute untuk menulis).
 * - Hanya menyentuh unit JALUR yang aktif.
 * - PANDUAN tidak disentuh.
 * - Tanpa deleteMany — hanya menimpa content.questions.
 *
 * Usage:
 *   npx tsx scripts/seed-jalur-dedupe.ts            # dry-run
 *   npx tsx scripts/seed-jalur-dedupe.ts --execute  # apply
 */
import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";

const EXECUTE = process.argv.includes("--execute");

// DATABASE_URL diambil dari .env.local bila env kosong (seperti seed lama).
function makeDb(): PrismaClient {
  if (process.env.DATABASE_URL) return new PrismaClient();
  const line = readFileSync(".env.local", "utf8")
    .split("\n")
    .find((l) => l.startsWith("DATABASE_URL="));
  if (!line) throw new Error("DATABASE_URL tidak ditemukan di env maupun .env.local");
  const url = line.slice("DATABASE_URL=".length).replace(/^"|"$/g, "") + "?pgbouncer=true&connection_limit=3";
  return new PrismaClient({ datasources: { db: { url } } });
}

// Load bank soal baru dari scripts/seed-jalur-dedupe-data/level-NN.ts
interface Soal {
  id: string;
  tipe: "pilihan_ganda" | "benar_salah" | "isi_blank";
  soal: string;
  opsi?: string[];
  jawaban: string | number;
  penjelasan: string;
}
interface UnitSoal {
  level: number;
  title: string;
  soal: Soal[];
}

function loadBank(): UnitSoal[] {
  const bank: UnitSoal[] = [];
  for (let lvl = 1; lvl <= 12; lvl++) {
    const file = join(process.cwd(), "scripts/seed-jalur-dedupe-data", `level-${String(lvl).padStart(2, "0")}.ts`);
    const mod = require(file);
    const data = (mod.default ?? []) as UnitSoal[];
    bank.push(...data);
  }
  return bank;
}

async function main() {
  const bank = loadBank();
  if (bank.length !== 72) {
    console.error(`❌ Bank soal hanya ${bank.length} unit (harus 72)`);
    process.exit(1);
  }

  const db = makeDb();
  let matched = 0, missing = 0, totalBefore = 0, totalAfter = 0;

  try {
    for (const u of bank) {
      const unit = await db.learningUnit.findFirst({
        where: { title: u.title, isActive: true, level: { type: "JALUR", level: u.level } },
        select: { id: true, title: true, content: true },
      });
      if (!unit) {
        missing++;
        console.warn(`⚠️  tidak ketemu: L${u.level} "${u.title}"`);
        continue;
      }
      matched++;

      let content: any = {};
      try { content = JSON.parse(unit.content || "{}"); } catch { content = {}; }
      const existing: Soal[] = Array.isArray(content.questions) ? content.questions : [];

      // 1) Hanya pertahankan soal uXXa-e milik unit ini (prefix nomor unit cocok)
      const bankPrefix = u.soal[0]?.id.replace(/^u(\d{2})[fghij]$/, "$1");
      const uniqueOld = existing.filter((q) => {
        if (!q.id) return false;
        const m = q.id.match(/^u(\d{2})([a-e])$/);
        if (!m) return false;
        return m[1] === bankPrefix;
      });

      // 2) Tambahkan 5 soal baru uXXf-j
      const newIds = new Set(uniqueOld.map((q) => q.id));
      const fresh = u.soal.filter((q) => !newIds.has(q.id));
      const finalQuestions = [...uniqueOld, ...fresh];

      totalBefore += existing.length;
      totalAfter += finalQuestions.length;

      if (EXECUTE) {
        content.questions = finalQuestions;
        await db.learningUnit.update({
          where: { id: unit.id },
          data: { content: JSON.stringify(content) },
        });
      }

      console.log(
        `${EXECUTE ? "✍️ " : "🔎 "}L${u.level} "${u.title}": ${existing.length} → ${finalQuestions.length} soal ` +
        `(buang ${existing.length - uniqueOld.length} shared, +${fresh.length} baru)`
      );
    }
  } finally {
    await db.$disconnect();
  }

  console.log(`\n${EXECUTE ? "SELESAI — DITULIS" : "DRY-RUN — jalankan dengan --execute"}`);
  console.log(`unit cocok=${matched}  unit tak ketemu=${missing}`);
  console.log(`total soal: ${totalBefore} → ${totalAfter} (harus 720 = 72 unit × 10)`);
  if (missing > 0) process.exit(1);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
