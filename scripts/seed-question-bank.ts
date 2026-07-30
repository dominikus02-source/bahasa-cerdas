/**
 * Master Bank Soal Seeder.
 *
 * Reads all JSON files from data/question-bank/master/ and upserts
 * into the Soal table. Idempotent — safe to run multiple times.
 *
 * Usage:
 *   npx tsx scripts/seed-question-bank.ts              # seed all themes
 *   npx tsx scripts/seed-question-bank.ts --dry-run     # preview only
 *   npx tsx scripts/seed-question-bank.ts --tema spok   # single theme
 *   npx tsx scripts/seed-question-bank.ts --force       # update existing
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();
const DATA_DIR = path.resolve(__dirname, "..", "data", "question-bank", "master");

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const FORCE = args.includes("--force");
const SINGLE_THEME = args.find(a => !a.startsWith("--"));

interface MasterSoal {
  kodeSoal: string;
  judul: string;
  tema: string;
  kelas: string;
  semester: number;
  kompetensi: string;
  indikator: string;
  difficulty: "MUDAH" | "SEDANG" | "SULIT";
  levelBerpikir: number;
  type: string;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  kataKunci: string[];
  estimasiWaktu: number;
  isHOTS: boolean;
}

const DIFFICULTY_MAP: Record<string, string> = {
  MUDAH: "EASY",
  SEDANG: "MEDIUM",
  SULIT: "HARD",
};

const TYPE_MAP: Record<string, string> = {
  PILIHAN_GANDA: "PILIHAN_GANDA",
  BENAR_SALAH: "BENAR_SALAH",
  ISIAN_SINGKAT: "ISIAN",
  MENJODOHKAN: "MENJODOHKAN",
  URUTAN: "URUTAN",
  MEMBACA_MENJAWAB: "ESSAY",
};

async function getOrCreateSystemUser(): Promise<string> {
  const guru = await prisma.user.findFirst({
    where: { role: "GURU" },
    orderBy: { createdAt: "asc" },
  });
  if (guru) return guru.id;

  const founder = await prisma.user.findFirst({
    where: { isFounder: true },
  });
  if (founder) return founder.id;

  const anyUser = await prisma.user.findFirst();
  if (anyUser) return anyUser.id;

  throw new Error("No user found in database. Run seeder after at least one user exists.");
}

async function main() {
  console.log("=== Master Bank Soal Seeder ===");
  console.log(`Dry run: ${DRY_RUN}`);
  console.log(`Force: ${FORCE}`);
  console.log(`Single theme: ${SINGLE_THEME || "all"}`);

  if (!fs.existsSync(DATA_DIR)) {
    console.error(`❌ Data directory not found: ${DATA_DIR}`);
    console.error("   Run: npx tsx scripts/build-question-bank-data.ts");
    process.exit(1);
  }

  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".json") && f !== "types.json" && f !== "index.json");

  let uploaderId: string | null = null;
  if (!DRY_RUN) {
    try {
      uploaderId = await getOrCreateSystemUser();
      console.log(`Uploader: ${uploaderId}`);
    } catch (e) {
      console.error(`❌ ${(e as Error).message}`);
      console.log("   Switching to dry-run mode.");
      DRY_RUN = true;
    }
  }

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalUpdated = 0;
  let totalErrors = 0;

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const themeId = file.replace(".json", "");

    if (SINGLE_THEME && themeId !== SINGLE_THEME) continue;

    const raw = fs.readFileSync(filePath, "utf-8");
    const soals: MasterSoal[] = JSON.parse(raw);

    console.log(`\n📁 ${themeId} — ${soals.length} soal`);

    for (const soal of soals) {
      if (!soal.kodeSoal) {
        console.warn(`   ⚠️  Missing kodeSoal, skipping`);
        totalErrors++;
        continue;
      }

      if (DRY_RUN) {
        console.log(`   [dry] ${soal.kodeSoal}: "${soal.judul}" (${soal.difficulty})`);
        totalSkipped++;
        continue;
      }

      try {
        const existing = await prisma.soal.findUnique({ where: { kodeSoal: soal.kodeSoal } });

        if (existing && !FORCE) {
          totalSkipped++;
          continue;
        }

        const data = {
          kodeSoal: soal.kodeSoal,
          judul: soal.judul || null,
          text: soal.text,
          type: TYPE_MAP[soal.type] || "PILIHAN_GANDA",
          difficulty: DIFFICULTY_MAP[soal.difficulty] || "MEDIUM",
          options: soal.options || [],
          correctAnswer: soal.correctAnswer || "0",
          explanation: soal.explanation || null,
          isHOTS: soal.isHOTS || false,
          kelas: soal.kelas || "7",
          semester: soal.semester || null,
          topik: soal.tema || null,
          kompetensi: soal.kompetensi || null,
          indikator: soal.indikator || null,
          levelBerpikir: soal.levelBerpikir || null,
          kataKunci: soal.kataKunci ? JSON.stringify(soal.kataKunci) : null,
          estimasiWaktu: soal.estimasiWaktu || null,
          subject: "Bahasa Indonesia",
          source: "MASTER_BANK",
          uploaderId: uploaderId!,
        };

        if (existing) {
          await prisma.soal.update({ where: { id: existing.id }, data });
          totalUpdated++;
        } else {
          await prisma.soal.create({ data });
          totalCreated++;
        }
      } catch (e) {
        console.error(`   ❌ ${soal.kodeSoal}: ${(e as Error).message}`);
        totalErrors++;
      }
    }
  }

  console.log("\n=== Summary ===");
  console.log(`   Created: ${totalCreated}`);
  console.log(`   Updated: ${totalUpdated}`);
  console.log(`   Skipped: ${totalSkipped}`);
  console.log(`   Errors:  ${totalErrors}`);
  console.log(`   Total:   ${totalCreated + totalUpdated + totalSkipped}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
