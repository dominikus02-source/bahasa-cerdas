/**
 * Phase — TKA All Tracks Bank Seed
 *
 * Seeds TKA questions from JSON source files into Prisma TKAQuestion table
 * for all tracks (SD, SMP, SMA, UTBK, Guru).
 * Dry-run by default. Use --execute to apply.
 *
 * Run: npx tsx scripts/seed-tka-all-tracks.ts
 *      npx tsx scripts/seed-tka-all-tracks.ts --execute
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const db = new PrismaClient();
const isExecute = process.argv.includes("--execute");

const TRACK_CONFIGS: Record<string, { tingkat: string; paketType: string }> = {
  sd: { tingkat: "SD", paketType: "TKA_SD" },
  smp: { tingkat: "SMP", paketType: "TKA_SMP" },
  sma: { tingkat: "SMA", paketType: "TKA_SMA" },
  utbk: { tingkat: "UTBK", paketType: "TKA_UTBK" },
  guru: { tingkat: "GURU", paketType: "TKA_GURU" },
};

const PAKET_CONFIGS: Record<string, { title: string; passingScore: number; passingGrade: string }> = {
  sd: { title: "Latihan TKA SD", passingScore: 0, passingGrade: "D" },
  smp: { title: "Latihan TKA SMP", passingScore: 0, passingGrade: "D" },
  sma: { title: "Latihan TKA SMA", passingScore: 0, passingGrade: "D" },
  utbk: { title: "Latihan TKA UTBK", passingScore: 0, passingGrade: "D" },
  guru: { title: "Latihan TKA Guru", passingScore: 0, passingGrade: "D" },
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

function loadTrackFiles(trackKey: string): { file: string; questions: QuestionItem[] }[] {
  const results: { file: string; questions: QuestionItem[] }[] = [];
  const trackDir = path.join(__dirname, "..", "data", "question-bank", "tka", trackKey);

  if (!fs.existsSync(trackDir)) {
    console.warn(`  ⚠️  Track directory not found: ${trackDir}`);
    return results;
  }

  const entries = fs.readdirSync(trackDir, { withFileTypes: true });

  // Check if this track has subdirectories (like sd/membaca/)
  const hasSubdirs = entries.some((e) => e.isDirectory());
  const jsonFiles: string[] = [];

  if (hasSubdirs) {
    // Subdirectory structure: track/section/*.json
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const sectionDir = path.join(trackDir, entry.name);
      const files = fs.readdirSync(sectionDir).filter((f) => f.endsWith(".json"));
      for (const f of files) {
        jsonFiles.push(path.join(entry.name, f));
      }
    }
  } else {
    // Flat structure: track/*.json
    jsonFiles.push(...entries.filter((e) => e.name.endsWith(".json")).map((e) => e.name));
  }

  for (const relPath of jsonFiles) {
    const filePath = path.join(trackDir, relPath);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const questions = data.questions || [];
      results.push({ file: relPath, questions });
    } catch (err: any) {
      console.warn(`  ⚠️  Error reading ${relPath}: ${err.message}`);
    }
  }

  return results;
}

function mapDifficulty(diff: number): string {
  if (diff <= 1) return "EASY";
  if (diff === 2) return "MEDIUM";
  return "HARD";
}

function mapKompetensi(section: string): string {
  const map: Record<string, string> = {
    membaca: "LITERASI_MEMBACA",
    menulis: "MENULIS",
    kebahasaan: "KEBAHASAAN",
  };
  return map[section?.toLowerCase()] || "LITERASI_MEMBACA";
}

async function ensurePaket(trackKey: string, questionsCount: number) {
  const cfg = PAKET_CONFIGS[trackKey];
  const trackCfg = TRACK_CONFIGS[trackKey];
  if (!cfg || !trackCfg) return;

  const existingPk = await db.paketKompetensi.findFirst({
    where: { type: trackCfg.paketType as any, title: cfg.title },
  });

  const sectionData = [
    { name: "Membaca", count: questionsCount, seksi: "MEMBACA", timeLimit: 60 },
  ];

  if (existingPk) {
    await db.paketKompetensi.update({
      where: { id: existingPk.id },
      data: {
        totalQuestions: questionsCount,
        sections: sectionData,
        isActive: true,
      },
    });
    console.log(`  ✅ Updated PaketKompetensi: ${cfg.title} (${existingPk.id})`);
  } else {
    await db.paketKompetensi.create({
      data: {
        title: cfg.title,
        description: `Latihan TKA untuk ${trackKey.toUpperCase()}. Soal membaca pemahaman original BahasaCerdas.`,
        type: trackCfg.paketType as any,
        mode: "SIMULASI",
        duration: 60,
        passingScore: cfg.passingScore,
        passingGrade: cfg.passingGrade,
        sections: sectionData as any,
        totalQuestions: questionsCount,
        isActive: true,
        isPremium: false,
        attemptLimit: -1,
      },
    });
    console.log(`  ✅ Created PaketKompetensi: ${cfg.title}`);
  }
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log("  TKA All Tracks Bank — Unified Seed");
  console.log(`  Mode: ${isExecute ? "🔴 EXECUTE" : "🟡 DRY-RUN"}`);
  console.log("═══════════════════════════════════════════\n");

  const allIds = new Set<string>();
  const duplicates: string[] = [];
  let grandTotal = 0;
  const trackTotals: Record<string, number> = {};
  const needsReview: string[] = [];

  for (const [trackKey, trackCfg] of Object.entries(TRACK_CONFIGS)) {
    console.log(`── ${trackKey.toUpperCase()} ──`);
    const files = loadTrackFiles(trackKey);
    let trackTotal = 0;

    for (const { file, questions } of files) {
      console.log(`  📁 ${file} → ${questions.length} questions`);
      trackTotal += questions.length;
      grandTotal += questions.length;

      for (const q of questions) {
        if (allIds.has(q.id)) duplicates.push(q.id);
        allIds.add(q.id);
      }
    }

    trackTotals[trackKey] = trackTotal;
    console.log(`  Track total: ${trackTotal} questions\n`);
  }

  console.log("═══════════════════════════════════════════");
  console.log(`  Grand total: ${grandTotal} questions`);
  console.log(`  Tracks: ${Object.entries(trackTotals).map(([k, v]) => `${k}=${v}`).join(", ")}`);

  if (duplicates.length > 0) {
    console.error(`\n❌ Duplicate IDs: ${duplicates.join(", ")}`);
    process.exit(1);
  }
  console.log(`  ✅ All IDs unique\n`);

  if (!isExecute) {
    console.log("  (Dry-run) Use --execute to seed to database\n");
    await db.$disconnect();
    process.exit(0);
  }

  // Execute: seed questions
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;

  for (const [trackKey, trackCfg] of Object.entries(TRACK_CONFIGS)) {
    const files = loadTrackFiles(trackKey);

    for (const { file, questions } of files) {
      for (const item of questions) {
        const kompetensi = mapKompetensi(item.section);
        const text = item.stem || "";
        if (!text) {
          skipped++;
          needsReview.push(`${item.id}: empty text`);
          continue;
        }
        const difficulty = mapDifficulty(item.difficulty);
        const explanation = item.explanation || null;
        const passage = item.passage || null;

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
              existing.passage !== passage ||
              existing.tingkat !== trackCfg.tingkat;

            if (changed) {
              await db.tKAQuestion.update({
                where: { id: item.id },
                data: {
                  kompetensi: kompetensi as any,
                  text,
                  passage,
                  type: "PILIHAN_GANDA",
                  options: item.options || [],
                  correctAnswer: item.correctAnswer || "",
                  explanation,
                  difficulty: difficulty as any,
                  weight: 1.0,
                  source: item.source || "BC_TKA_ORIGINAL",
                  isActive: true,
                  isVerified: true,
                  tingkat: trackCfg.tingkat,
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
                passage,
                type: "PILIHAN_GANDA",
                options: item.options || [],
                correctAnswer: item.correctAnswer || "",
                explanation,
                difficulty: difficulty as any,
                weight: 1.0,
                source: item.source || "BC_TKA_ORIGINAL",
                isActive: true,
                isVerified: true,
                tingkat: trackCfg.tingkat,
              },
            });
            inserted++;
          }
        } catch (err: any) {
          needsReview.push(`${item.id}: ${err.message}`);
          skipped++;
        }
      }
    }

    // Ensure PaketKompetensi for each track
    await ensurePaket(trackKey, trackTotals[trackKey] || 30);
  }

  console.log("\n═══════════════════════════════════════════");
  console.log("  Summary:");
  console.log(`    Inserted:   ${inserted}`);
  console.log(`    Updated:    ${updated}`);
  console.log(`    Unchanged:  ${unchanged}`);
  console.log(`    Skipped:    ${skipped}`);

  if (needsReview.length > 0) {
    console.log(`\n  Needs review (${needsReview.length}):`);
    needsReview.forEach((r) => console.log(`    - ${r}`));
  }

  await db.$disconnect();
  if (needsReview.length > 0) process.exit(1);
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Seed failed:", e.message);
  process.exit(1);
});
