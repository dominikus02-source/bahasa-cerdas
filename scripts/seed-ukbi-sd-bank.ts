/**
 * Phase UKBI DATA 1A — UKBI SD Practice Question Bank Seed
 *
 * Seeds 250 original questions from JSON source files into Prisma UKBIQuestion table.
 * Dry-run by default. Use --execute to apply.
 *
 * Run: npx tsx scripts/seed-ukbi-sd-bank.ts
 *      npx tsx scripts/seed-ukbi-sd-bank.ts --execute
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const db = new PrismaClient();
const isExecute = process.argv.includes("--execute");

const BANKS_DIR = path.join(__dirname, "..", "data", "question-bank", "ukbi", "sd");

const SEKSI_MAP: Record<string, string> = {
  "merespons-kaidah": "MERESPONS_KAIDAH",
  "membaca": "MEMBACA",
  "mendengarkan": "MENDENGARKAN",
  "menulis": "MENULIS",
  "berbicara": "BERBICARA",
};

const DIFFICULTY_MAP: Record<number, string> = {
  1: "EASY",
  2: "MEDIUM",
  3: "HARD",
  4: "VERY_HARD",
};

const UKBI_SD_PAKET: {
  title: string;
  type: string;
  duration: number;
  totalQuestions: number;
  sections: { name: string; count: number; seksi: string; timeLimit: number }[];
} = {
  title: "Simulasi UKBI SD Practice",
  type: "UKBI_SD",
  duration: 60,
  totalQuestions: 30,
  sections: [
    { name: "Seksi I: Merespons Kaidah", count: 10, seksi: "MERESPONS_KAIDAH", timeLimit: 15 },
    { name: "Seksi II: Membaca", count: 15, seksi: "MEMBACA", timeLimit: 25 },
    { name: "Seksi III: Mendengarkan", count: 5, seksi: "MENDENGARKAN", timeLimit: 15 },
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
  audioScript?: string;
  audioRef?: string | null;
  prompt?: string;
  speakingTask?: string;
  scoringMode?: string;
  wordLimit?: { min: number; max: number };
  rubric?: any[];
  sampleExpectedResponse?: string;
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

function mapBandToDifficulty(level: string): string {
  const map: Record<string, string> = {
    TERBATAS: "EASY",
    MARGINAL: "MEDIUM",
    SEMENJANA: "HARD",
    MADYA: "VERY_HARD",
  };
  return map[level] || "MEDIUM";
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log(`  UKBI SD Practice Bank — Seed Script`);
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

  // Validate section counts
  const expected = { "merespons-kaidah": 70, "membaca": 100, "mendengarkan": 40, "menulis": 20, "berbicara": 20 };
  for (const [sec, count] of Object.entries(expected)) {
    const actual = sectionCounts[sec] || 0;
    if (actual !== count) {
      console.warn(`  ⚠️  Section "${sec}" expected ${count} questions, got ${actual}`);
    }
  }
  if (totalItems !== 250) {
    console.warn(`  ⚠️  Expected 250 total questions, got ${totalItems}`);
  }

  console.log("");

  // Collect all questions from all files
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
    const existingCount = await db.uKBIQuestion.count({ where: { tingkat: "SD" } });
    console.log(`  Existing UKBI SD questions: ${existingCount}`);
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
  let needsReview: string[] = [];

  for (const { file, item } of allQuestions) {
    const seksi = SEKSI_MAP[item.section];
    if (!seksi) {
      console.warn(`  ⚠️  Unknown section "${item.section}" for ${item.id}, skipping`);
      skipped++;
      needsReview.push(`${item.id}: unknown section "${item.section}"`);
      continue;
    }

    // Map type
    let questionType = item.type === "constructed" ? "CONSTRUCTED" : "PILIHAN_GANDA";

    // Map difficulty
    const difficulty = item.difficulty <= 2 ? "EASY" : item.difficulty === 3 ? "MEDIUM" : "HARD";
    const bandDifficulty = mapBandToDifficulty(item.band);

    // Build text (stem or prompt)
    const text = item.stem || item.prompt || "";
    if (!text) {
      console.warn(`  ⚠️  Empty text for ${item.id}, skipping`);
      skipped++;
      needsReview.push(`${item.id}: empty text`);
      continue;
    }

    // Build explanation
    const explanation = item.explanation || null;

    // Cognitive & Domain
    const cognitive = (item.cognitive || "PEMAHAMAN") as any;
    const domain = (item.domain || "SINTAS") as any;

    if (!isExecute) {
      // Dry-run: just count
      inserted++;
      continue;
    }

    // Execute mode: upsert
    try {
      const existing = await db.uKBIQuestion.findUnique({ where: { id: item.id } });

      if (existing) {
        // Check if anything changed
        const changed =
          existing.text !== text ||
          existing.seksi !== seksi ||
          existing.difficulty !== difficulty ||
          JSON.stringify(existing.options) !== JSON.stringify(item.options) ||
          existing.correctAnswer !== item.correctAnswer ||
          existing.explanation !== explanation ||
          existing.passage !== (item.passage || null) ||
          existing.tingkat !== "SD" ||
          existing.type !== questionType;

        if (changed) {
          console.log(`  🔄 Updating ${item.id} (${item.section})`);
          await db.uKBIQuestion.update({
            where: { id: item.id },
            data: {
              seksi: seksi as any,
              text,
              passage: item.passage || null,
              type: questionType,
              options: item.options || [],
              correctAnswer: item.correctAnswer || "",
              explanation,
              difficulty: difficulty as any,
              cognitive,
              domain,
              keywords: item.tags || [],
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
        await db.uKBIQuestion.create({
          data: {
            id: item.id,
            seksi: seksi as any,
            text,
            passage: item.passage || null,
            type: questionType,
            options: item.options || [],
            correctAnswer: item.correctAnswer || "",
            explanation,
            difficulty: difficulty as any,
            cognitive,
            domain,
            keywords: item.tags || [],
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

  // Create/ensure PaketKompetensi for UKBI SD Practice
  console.log("\n── PaketKompetensi ──");
  if (!isExecute) {
    console.log(`  (Dry-run) Would create/update PaketKompetensi "${UKBI_SD_PAKET.title}"`);
  } else {
    try {
      const existingPk = await db.paketKompetensi.findFirst({
        where: { type: "UKBI_SD", title: UKBI_SD_PAKET.title },
      });
      if (existingPk) {
        await db.paketKompetensi.update({
          where: { id: existingPk.id },
          data: {
            duration: UKBI_SD_PAKET.duration,
            totalQuestions: UKBI_SD_PAKET.totalQuestions,
            sections: UKBI_SD_PAKET.sections,
            isActive: true,
          },
        });
        console.log(`  ✅ Updated PaketKompetensi: ${UKBI_SD_PAKET.title} (${existingPk.id})`);
      } else {
        await db.paketKompetensi.create({
          data: {
            title: UKBI_SD_PAKET.title,
            description: "Simulasi UKBI untuk peserta SD. Terdiri dari merespons kaidah, membaca, dan mendengarkan. Soal original BahasaCerdas.",
            type: "UKBI_SD",
            mode: "SIMULASI",
            duration: UKBI_SD_PAKET.duration,
            passingScore: 0,
            passingGrade: "D",
            sections: UKBI_SD_PAKET.sections as any,
            totalQuestions: UKBI_SD_PAKET.totalQuestions,
            isActive: true,
            isPremium: false,
            attemptLimit: -1,
          },
        });
        console.log(`  ✅ Created PaketKompetensi: ${UKBI_SD_PAKET.title}`);
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
