/**
 * TKA SMP & SMA Practice Question Bank Seed
 *
 * Seeds 60 original questions (30 SMP + 30 SMA) from JSON source files
 * into Prisma TKAQuestion table. Dry-run by default. Use --execute to apply.
 *
 * Run: npx tsx scripts/seed-tka-smp-sma-bank.ts
 *      npx tsx scripts/seed-tka-smp-sma-bank.ts --execute
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const db = new PrismaClient();
const isExecute = process.argv.includes("--execute");

const BANKS_DIR = path.join(__dirname, "..", "data", "question-bank", "tka");

const TRACK_CONFIG: Record<string, {
  type: string;
  tingkat: string;
  title: string;
  description: string;
  duration: number;
  totalQuestions: number;
  sections: { name: string; count: number; timeLimit: number }[];
}> = {
  TKA_SMP: {
    type: "TKA_SMP",
    tingkat: "SMP",
    title: "Latihan TKA SMP",
    description: "Latihan soal TKA untuk peserta SMP. Terdiri dari 30 soal literasi membaca. Soal original BahasaCerdas.",
    duration: 90,
    totalQuestions: 30,
    sections: [
      { name: "Membaca", count: 30, timeLimit: 90 },
    ],
  },
  TKA_SMA: {
    type: "TKA_SMA",
    tingkat: "SMA",
    title: "Latihan TKA SMA",
    description: "Latihan soal TKA untuk peserta SMA. Terdiri dari 30 soal literasi membaca. Soal original BahasaCerdas.",
    duration: 120,
    totalQuestions: 30,
    sections: [
      { name: "Membaca", count: 30, timeLimit: 120 },
    ],
  },
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
    track: string;
    section: string;
    totalItems: number;
  };
  questions: QuestionItem[];
}

const DIR_TO_TRACK: Record<string, string> = {
  smp: "TKA_SMP",
  sma: "TKA_SMA",
};

function loadBankFiles(): { file: string; track: string; data: BankFile }[] {
  const results: { file: string; track: string; data: BankFile }[] = [];
  const entries = fs.readdirSync(BANKS_DIR);
  for (const entry of entries) {
    const entryDir = path.join(BANKS_DIR, entry);
    if (!fs.statSync(entryDir).isDirectory()) continue;
    const track = DIR_TO_TRACK[entry];
    if (!track) {
      console.warn(`  ⚠️  Unknown directory "${entry}", skipping`);
      continue;
    }
    const files = fs.readdirSync(entryDir).filter(f => f.endsWith(".json"));
    for (const file of files) {
      const filePath = path.join(entryDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as BankFile;
      results.push({ file: path.relative(BANKS_DIR, filePath), track, data });
    }
  }
  return results;
}

function mapDifficulty(num: number): string {
  if (num <= 1) return "EASY";
  if (num === 2) return "MEDIUM";
  if (num === 3) return "HARD";
  return "VERY_HARD";
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log(`  TKA SMP & SMA Bank — Seed Script`);
  console.log(`  Mode: ${isExecute ? "🔴 EXECUTE" : "🟡 DRY-RUN"}`);
  console.log("═══════════════════════════════════════════\n");

  if (!fs.existsSync(BANKS_DIR)) {
    console.error(`❌ Bank directory not found: ${BANKS_DIR}`);
    process.exit(1);
  }

  const bankFiles = loadBankFiles();
  let totalItems = 0;
  const trackCounts: Record<string, number> = {};

  for (const { file, track, data } of bankFiles) {
    const items = data.questions.length;
    totalItems += items;
    trackCounts[track] = (trackCounts[track] || 0) + items;
    console.log(`  📁 ${file} → ${items} questions (${track})`);
  }

  console.log(`\n  Total: ${totalItems} questions across ${bankFiles.length} files`);
  console.log(`  Tracks: ${JSON.stringify(trackCounts)}\n`);

  // Validate track counts
  for (const [track, count] of Object.entries(trackCounts)) {
    if (count !== 30) {
      console.warn(`  ⚠️  Track "${track}" expected 30 questions, got ${count}`);
    }
  }
  if (totalItems !== 60) {
    console.warn(`  ⚠️  Expected 60 total questions, got ${totalItems}`);
  }

  console.log("");

  // Collect all questions
  const allQuestions: { file: string; track: string; item: QuestionItem }[] = [];
  for (const { file, track, data } of bankFiles) {
    for (const item of data.questions) {
      allQuestions.push({ file, track, item });
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
    const existingSmp = await db.tKAQuestion.count({ where: { tingkat: "SMP" } });
    const existingSma = await db.tKAQuestion.count({ where: { tingkat: "SMA" } });
    console.log(`  Existing TKA questions: SMP=${existingSmp}, SMA=${existingSma}`);
    if (existingSmp > 0 || existingSma > 0) {
      console.log(`  ⚠️  Will upsert on top of existing questions`);
    }
    console.log("");
  }

  // Process each question
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  const needsReview: string[] = [];

  for (const { file, track, item } of allQuestions) {
    const config = TRACK_CONFIG[track];
    if (!config) {
      console.warn(`  ⚠️  Unknown track "${track}" for ${item.id}, skipping`);
      skipped++;
      needsReview.push(`${item.id}: unknown track "${track}"`);
      continue;
    }

    const text = item.stem || "";
    if (!text) {
      console.warn(`  ⚠️  Empty text for ${item.id}, skipping`);
      skipped++;
      needsReview.push(`${item.id}: empty text`);
      continue;
    }

    const difficulty = mapDifficulty(item.difficulty);
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
          existing.difficulty !== difficulty ||
          JSON.stringify(existing.options) !== JSON.stringify(item.options) ||
          existing.correctAnswer !== item.correctAnswer ||
          existing.explanation !== explanation ||
          existing.passage !== (item.passage || null) ||
          existing.tingkat !== config.tingkat;

        if (changed) {
          console.log(`  🔄 Updating ${item.id} (${track})`);
          await db.tKAQuestion.update({
            where: { id: item.id },
            data: {
              kompetensi: "LITERASI_MEMBACA" as any,
              text,
              passage: item.passage || null,
              type: "PILIHAN_GANDA",
              options: item.options || [],
              correctAnswer: item.correctAnswer || "",
              explanation,
              difficulty: difficulty as any,
              source: item.source,
              isActive: true,
              isVerified: true,
              tingkat: config.tingkat as any,
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
            kompetensi: "LITERASI_MEMBACA" as any,
            text,
            passage: item.passage || null,
            type: "PILIHAN_GANDA",
            options: item.options || [],
            correctAnswer: item.correctAnswer || "",
            explanation,
            difficulty: difficulty as any,
            source: item.source,
            isActive: true,
            isVerified: true,
            tingkat: config.tingkat as any,
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

  // Create/ensure PaketKompetensi for both tracks
  console.log("\n── PaketKompetensi ──");
  for (const [track, config] of Object.entries(TRACK_CONFIG)) {
    if (!isExecute) {
      console.log(`  (Dry-run) Would create/update PaketKompetensi "${config.title}"`);
    } else {
      try {
        const existingPk = await db.paketKompetensi.findFirst({
          where: { type: config.type as any, title: config.title },
        });
        if (existingPk) {
          await db.paketKompetensi.update({
            where: { id: existingPk.id },
            data: {
              duration: config.duration,
              totalQuestions: config.totalQuestions,
              sections: config.sections,
              isActive: true,
            },
          });
          console.log(`  ✅ Updated PaketKompetensi: ${config.title} (${existingPk.id})`);
        } else {
          await db.paketKompetensi.create({
            data: {
              title: config.title,
              description: config.description,
              type: config.type as any,
              mode: "SIMULASI",
              duration: config.duration,
              passingScore: 0,
              passingGrade: "D",
              sections: config.sections as any,
              totalQuestions: config.totalQuestions,
              isActive: true,
              isPremium: false,
              attemptLimit: -1,
            },
          });
          console.log(`  ✅ Created PaketKompetensi: ${config.title}`);
        }
      } catch (err: any) {
        console.error(`  ❌ Error creating PaketKompetensi for ${track}: ${err.message}`);
        needsReview.push(`PaketKompetensi ${track}: ${err.message}`);
      }
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
