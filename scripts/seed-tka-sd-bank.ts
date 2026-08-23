/**
 * Phase — TKA SD Practice Question Bank Seed
 *
 * Seeds TKA SD questions from JSON source files into Prisma TKAQuestion table.
 * Dry-run by default. Use --execute to apply.
 *
 * Run: npx tsx scripts/seed-tka-sd-bank.ts
 *      npx tsx scripts/seed-tka-sd-bank.ts --execute
 */

import "./load-env";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const db = new PrismaClient();
const isExecute = process.argv.includes("--execute");

const BANKS_DIR = path.join(__dirname, "..", "data", "question-bank", "tka", "sd");

const KOMPETENSI_MAP: Record<string, string> = {
  "membaca": "LITERASI_MEMBACA",
};

const TKA_SD_PAKET = {
  title: "Latihan TKA SD",
  type: "TKA_SD" as const,
  duration: 60,
  totalQuestions: 30,
  sections: [
    { name: "Seksi I: Membaca", count: 30, seksi: "MEMBACA", timeLimit: 60 },
  ],
};

interface QuestionItem {
  id: string;
  product: string;
  track: string;
  section: string;
  band: string;
  type: string;
  difficulty: number;
  stem?: string;
  passage?: string;
  options?: { id: string; text: string }[];
  correctAnswer?: string;
  explanation?: string;
  tags?: string[];
  source: string;
  status: string;
  cognitive?: string;
  domain?: string;
}

interface BankFile {
  meta: {
    section: string;
    totalItems: number;
  };
  questions: QuestionItem[];
}

function loadBankFiles(): { file: string; data: BankFile }[] {
  const results: { file: string; data: BankFile }[] = [];
  const sections = fs.readdirSync(BANKS_DIR);
  for (const section of sections) {
    const sectionDir = path.join(BANKS_DIR, section);
    if (!fs.statSync(sectionDir).isDirectory()) continue;
    const files = fs.readdirSync(sectionDir).filter(f => f.endsWith(".json"));
    for (const file of files) {
      const filePath = path.join(sectionDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as BankFile;
      results.push({ file: path.relative(BANKS_DIR, filePath), data });
    }
  }
  return results;
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log(`  TKA SD Practice Bank — Seed Script`);
  console.log(`  Mode: ${isExecute ? "🔴 EXECUTE" : "🟡 DRY-RUN"}`);
  console.log("═══════════════════════════════════════════\n");

  if (!fs.existsSync(BANKS_DIR)) {
    console.error(`❌ Bank directory not found: ${BANKS_DIR}`);
    process.exit(1);
  }

  const bankFiles = loadBankFiles();
  let totalItems = 0;
  const sectionCounts: Record<string, number> = {};

  for (const { file, data } of bankFiles) {
    const section = data.meta.section;
    const items = data.questions.length;
    totalItems += items;
    sectionCounts[section] = (sectionCounts[section] || 0) + items;
    console.log(`  📁 ${file} → ${items} questions`);
  }

  console.log(`\n  Total: ${totalItems} questions across ${bankFiles.length} files`);
  console.log(`  Sections: ${JSON.stringify(sectionCounts)}\n`);

  if (totalItems !== 30) {
    console.warn(`  ⚠️  Expected 30 total questions, got ${totalItems}`);
  }

  // Collect all questions
  const allQuestions: { file: string; item: QuestionItem }[] = [];
  for (const { file, data } of bankFiles) {
    for (const item of data.questions) {
      allQuestions.push({ file, item });
    }
  }

  // Check for duplicate IDs
  const idSet = new Set<string>();
  const duplicateIds: string[] = [];
  for (const { item } of allQuestions) {
    if (idSet.has(item.id)) duplicateIds.push(item.id);
    idSet.add(item.id);
  }
  if (duplicateIds.length > 0) {
    console.error(`❌ Duplicate IDs found: ${duplicateIds.join(", ")}`);
    process.exit(1);
  }
  console.log(`  ✅ All ${allQuestions.length} IDs are unique\n`);

  // Backup check
  if (isExecute) {
    const existingCount = await db.tKAQuestion.count({ where: { tingkat: "SD" } });
    console.log(`  Existing TKA SD questions: ${existingCount}`);
    if (existingCount > 0) {
      console.log(`  ⚠️  Will upsert ${allQuestions.length} items on top of ${existingCount} existing`);
    }
    console.log("");
  }

  // Process each question
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  const needsReview: string[] = [];

  for (const { file, item } of allQuestions) {
    const kompetensi = KOMPETENSI_MAP[item.section];
    if (!kompetensi) {
      console.warn(`  ⚠️  Unknown section "${item.section}" for ${item.id}, skipping`);
      skipped++;
      needsReview.push(`${item.id}: unknown section "${item.section}"`);
      continue;
    }

    const text = item.stem || "";
    if (!text) {
      console.warn(`  ⚠️  Empty text for ${item.id}, skipping`);
      skipped++;
      needsReview.push(`${item.id}: empty text`);
      continue;
    }

    const difficulty = item.difficulty <= 1 ? "EASY" : item.difficulty === 2 ? "MEDIUM" : "HARD";
    const explanation = item.explanation || null;

    if (!isExecute) {
      inserted++;
      continue;
    }

    try {
      const existing = await db.tKAQuestion.findUnique({ where: { id: item.id } });

      if (existing) {
        const changed =
          existing.text !== text ||
          existing.kompetensi !== kompetensi ||
          existing.difficulty !== difficulty ||
          JSON.stringify(existing.options) !== JSON.stringify(item.options) ||
          existing.correctAnswer !== item.correctAnswer ||
          existing.explanation !== explanation ||
          existing.passage !== (item.passage || null) ||
          existing.tingkat !== "SD";

        if (changed) {
          console.log(`  🔄 Updating ${item.id} (${item.section})`);
          await db.tKAQuestion.update({
            where: { id: item.id },
            data: {
              kompetensi: kompetensi as any,
              text,
              passage: item.passage || null,
              type: "PILIHAN_GANDA",
              options: item.options || [],
              correctAnswer: item.correctAnswer || "",
              explanation,
              difficulty: difficulty as any,
              weight: 1.0,
              source: item.source || "BC_TKA_SD_ORIGINAL",
              isActive: true,
              isVerified: true,
              tingkat: "SD",
            },
          });
          updated++;
        } else {
          unchanged++;
        }
      } else {
        await db.tKAQuestion.create({
          data: {
            id: item.id,
            kompetensi: kompetensi as any,
            text,
            passage: item.passage || null,
            type: "PILIHAN_GANDA",
            options: item.options || [],
            correctAnswer: item.correctAnswer || "",
            explanation,
            difficulty: difficulty as any,
            weight: 1.0,
            source: item.source || "BC_TKA_SD_ORIGINAL",
            isActive: true,
            isVerified: true,
            tingkat: "SD",
          },
        });
        inserted++;
      }
    } catch (err: any) {
      console.error(`  ❌ Error processing ${item.id}: ${err.message}`);
      needsReview.push(`${item.id}: ${err.message}`);
      skipped++;
    }
  }

  console.log("\n═══════════════════════════════════════════");
  console.log(`  Summary:`);
  console.log(`    Total files:     ${bankFiles.length}`);
  console.log(`    Total items:     ${allQuestions.length}`);
  if (!isExecute) {
    console.log(`    (Dry-run)        ${allQuestions.length} items would be inserted`);
    console.log(`                     Use --execute to apply`);
  } else {
    console.log(`    Inserted:        ${inserted}`);
    console.log(`    Updated:         ${updated}`);
    console.log(`    Unchanged:       ${unchanged}`);
    console.log(`    Skipped:         ${skipped}`);
  }
  if (needsReview.length > 0) {
    console.log(`\n  Needs review (${needsReview.length}):`);
    needsReview.forEach(r => console.log(`    - ${r}`));
  }

  // Create/ensure PaketKompetensi for TKA SD Practice
  console.log("\n── PaketKompetensi ──");
  if (!isExecute) {
    console.log(`  (Dry-run) Would create/update PaketKompetensi "${TKA_SD_PAKET.title}"`);
  } else {
    try {
      const existingPk = await db.paketKompetensi.findFirst({
        where: { type: "TKA_SD", title: TKA_SD_PAKET.title },
      });
      if (existingPk) {
        await db.paketKompetensi.update({
          where: { id: existingPk.id },
          data: {
            duration: TKA_SD_PAKET.duration,
            totalQuestions: TKA_SD_PAKET.totalQuestions,
            sections: TKA_SD_PAKET.sections,
            isActive: true,
          },
        });
        console.log(`  ✅ Updated PaketKompetensi: ${TKA_SD_PAKET.title} (${existingPk.id})`);
      } else {
        await db.paketKompetensi.create({
          data: {
            title: TKA_SD_PAKET.title,
            description: "Latihan TKA untuk siswa SD kelas 6. Terdiri dari soal membaca pemahaman dengan teks-teks original BahasaCerdas.",
            type: "TKA_SD",
            mode: "SIMULASI",
            duration: TKA_SD_PAKET.duration,
            passingScore: 0,
            passingGrade: "D",
            sections: TKA_SD_PAKET.sections as any,
            totalQuestions: TKA_SD_PAKET.totalQuestions,
            isActive: true,
            isPremium: false,
            attemptLimit: -1,
          },
        });
        console.log(`  ✅ Created PaketKompetensi: ${TKA_SD_PAKET.title}`);
      }
    } catch (err: any) {
      console.error(`  ❌ Error creating PaketKompetensi: ${err.message}`);
      needsReview.push(`PaketKompetensi: ${err.message}`);
    }
  }

  console.log("\n═══════════════════════════════════════════\n");

  await db.$disconnect();
  if (needsReview.length > 0 && isExecute) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Seed failed:", e.message);
  process.exit(1);
});
