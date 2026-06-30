/**
 * Phase UKBI DATA — UKBI SMA & Guru Practice Question Bank Seed
 *
 * Seeds 30 questions per track (SMA + Guru) from JSON source files into Prisma UKBIQuestion table.
 * Dry-run by default. Use --execute to apply.
 *
 * Run: npx tsx scripts/seed-ukbi-sma-guru-bank.ts
 *      npx tsx scripts/seed-ukbi-sma-guru-bank.ts --execute
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const db = new PrismaClient();
const isExecute = process.argv.includes("--execute");

const BANKS_DIR = path.join(__dirname, "..", "data", "question-bank", "ukbi");

const SEKSI_MAP: Record<string, string> = {
  "merespons-kaidah": "MERESPONS_KAIDAH",
  "membaca": "MEMBACA",
  "mendengarkan": "MENDENGARKAN",
  "menulis": "MENULIS",
  "berbicara": "BERBICARA",
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
    track: string;
  };
  questions: QuestionItem[];
}

const TRACK_CONFIG: Record<string, { title: string; type: string; duration: number; totalQuestions: number; simulationQuestions: number; description: string }> = {
  sma: {
    title: "Simulasi UKBI SMA Practice",
    type: "UKBI_SMA",
    duration: 75,
    totalQuestions: 30,
    simulationQuestions: 30,
    description: "Simulasi UKBI untuk peserta SMA. Terdiri dari merespons kaidah, membaca, dan mendengarkan. Soal original BahasaCerdas.",
  },
  guru: {
    title: "Simulasi UKBI Guru Practice",
    type: "UKBI_GURU_SIMULASI",
    duration: 90,
    totalQuestions: 30,
    simulationQuestions: 30,
    description: "Simulasi UKBI untuk guru/umum. Terdiri dari merespons kaidah, membaca, dan mendengarkan. Soal original BahasaCerdas.",
  },
};

function loadBankFiles(track: string): { file: string; data: BankFile }[] {
  const results: { file: string; data: BankFile }[] = [];
  const trackDir = path.join(BANKS_DIR, track);
  if (!fs.existsSync(trackDir)) return results;
  const sections = fs.readdirSync(trackDir);
  for (const section of sections) {
    const sectionDir = path.join(trackDir, section);
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
    UNGGUL: "VERY_HARD",
  };
  return map[level] || "MEDIUM";
}

async function processTrack(track: string) {
  const config = TRACK_CONFIG[track];
  console.log(`\n── Track: ${track.toUpperCase()} ──`);

  const bankFiles = loadBankFiles(track);
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
  if (totalItems < config.simulationQuestions) {
    console.warn(`  ⚠️  Below minimum simulation pool (${totalItems} vs ${config.simulationQuestions})`);
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
    return false;
  }
  console.log(`  ✅ All ${allQuestions.length} IDs are unique`);

  // Check for duplicate option texts
  let dupOptionsFound = false;
  for (const { item } of allQuestions) {
    if (item.options && item.type === "pilihan_ganda") {
      const texts = item.options.map(o => o.text.toLowerCase().trim());
      const uniqueTexts = new Set(texts);
      if (texts.length !== uniqueTexts.size) {
        console.error(`❌ Duplicate option texts in ${item.id}`);
        dupOptionsFound = true;
      }
    }
  }
  if (dupOptionsFound) {
    console.error(`❌ Fix duplicate option texts before executing`);
    return false;
  }

  // Backup check
  if (isExecute) {
    const existingCount = await db.uKBIQuestion.count({
      where: { tingkat: track === "sma" ? "SMA" : "GURU" },
    });
    console.log(`\n  Existing questions for ${track.toUpperCase()}: ${existingCount}`);
    if (existingCount > 0) {
      console.log(`  ⚠️  Will upsert ${allQuestions.length} items on top of ${existingCount} existing`);
    }
  }

  // Process each question
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  const needsReview: string[] = [];

  for (const { file, item } of allQuestions) {
    const seksi = SEKSI_MAP[item.section];
    if (!seksi) {
      console.warn(`  ⚠️  Unknown section "${item.section}" for ${item.id}, skipping`);
      skipped++;
      needsReview.push(`${item.id}: unknown section "${item.section}"`);
      continue;
    }

    const questionType = item.type === "constructed" ? "CONSTRUCTED" : "PILIHAN_GANDA";
    const difficulty = item.difficulty <= 2 ? "EASY" : item.difficulty === 3 ? "MEDIUM" : "HARD";
    const text = item.stem || item.prompt || "";
    if (!text) {
      console.warn(`  ⚠️  Empty text for ${item.id}, skipping`);
      skipped++;
      needsReview.push(`${item.id}: empty text`);
      continue;
    }

    const explanation = item.explanation || null;
    const cognitive = (item.cognitive || "PEMAHAMAN") as any;
    const domain = (item.domain || "SINTAS") as any;
    const tingkat = track === "sma" ? "SMA" : "GURU";

    if (!isExecute) {
      inserted++;
      continue;
    }

    try {
      const existing = await db.uKBIQuestion.findUnique({ where: { id: item.id } });

      if (existing) {
        const changed =
          existing.text !== text ||
          existing.seksi !== seksi ||
          existing.difficulty !== difficulty ||
          JSON.stringify(existing.options) !== JSON.stringify(item.options) ||
          existing.correctAnswer !== item.correctAnswer ||
          existing.explanation !== explanation ||
          existing.passage !== (item.passage || null) ||
          existing.tingkat !== tingkat ||
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
              tingkat,
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
            tingkat,
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

  console.log(`\n  Track ${track.toUpperCase()} Summary:`);
  if (!isExecute) {
    console.log(`    (Dry-run) ${allQuestions.length} items would be inserted`);
    console.log(`    Use --execute to apply`);
  } else {
    console.log(`    Inserted: ${inserted}`);
    console.log(`    Updated:  ${updated}`);
    console.log(`    Unchanged: ${unchanged}`);
    console.log(`    Skipped:  ${skipped}`);
  }

  // Create/ensure PaketKompetensi
  console.log(`\n  ── PaketKompetensi ──`);
  if (!isExecute) {
    console.log(`    (Dry-run) Would create/update Paket "${config.title}"`);
  } else {
    try {
      const existingPk = await db.paketKompetensi.findFirst({
        where: { type: config.type, title: config.title },
      });
      if (existingPk) {
        await db.paketKompetensi.update({
          where: { id: existingPk.id },
          data: {
            duration: config.duration,
            totalQuestions: config.totalQuestions,
            sections: [
              { name: "Seksi I: Merespons Kaidah", count: 10, seksi: "MERESPONS_KAIDAH", timeLimit: 20 },
              { name: "Seksi II: Membaca", count: 15, seksi: "MEMBACA", timeLimit: 35 },
              { name: "Seksi III: Mendengarkan", count: 5, seksi: "MENDENGARKAN", timeLimit: 15 },
            ],
            isActive: true,
          },
        });
        console.log(`    ✅ Updated PaketKompetensi: ${config.title} (${existingPk.id})`);
      } else {
        await db.paketKompetensi.create({
          data: {
            title: config.title,
            description: config.description,
            type: config.type,
            mode: "SIMULASI",
            duration: config.duration,
            passingScore: 0,
            passingGrade: "D",
            sections: [
              { name: "Seksi I: Merespons Kaidah", count: 10, seksi: "MERESPONS_KAIDAH", timeLimit: 20 },
              { name: "Seksi II: Membaca", count: 15, seksi: "MEMBACA", timeLimit: 35 },
              { name: "Seksi III: Mendengarkan", count: 5, seksi: "MENDENGARKAN", timeLimit: 15 },
            ] as any,
            totalQuestions: config.totalQuestions,
            isActive: true,
            isPremium: false,
            attemptLimit: -1,
          },
        });
        console.log(`    ✅ Created PaketKompetensi: ${config.title}`);
      }
    } catch (err: any) {
      console.error(`    ❌ Error creating PaketKompetensi: ${err.message}`);
      needsReview.push(`PaketKompetensi[${track}]: ${err.message}`);
    }
  }

  if (needsReview.length > 0) {
    console.log(`\n  Needs review (${needsReview.length}):`);
    needsReview.forEach(r => console.log(`    - ${r}`));
    return false;
  }
  return true;
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log(`  UKBI SMA & Guru Practice Bank — Seed Script`);
  console.log(`  Mode: ${isExecute ? "🔴 EXECUTE" : "🟡 DRY-RUN"}`);
  console.log("═══════════════════════════════════════════\n");

  let allOk = true;
  for (const track of ["sma", "guru"]) {
    const ok = await processTrack(track);
    if (!ok) allOk = false;
  }

  console.log("\n═══════════════════════════════════════════");
  if (!isExecute) {
    console.log("  (Dry-run complete) Use --execute to apply");
  } else {
    console.log(`  All tracks processed: ${allOk ? "✅ SUCCESS" : "❌ HAS ERRORS"}`);
  }
  console.log("═══════════════════════════════════════════\n");

  await db.$disconnect();
  if (!allOk) process.exit(1);
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Seed failed:", e.message);
  process.exit(1);
});
