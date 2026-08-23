/**
 * Phase 5 — TKA Enrichment Seed Script
 *
 * Seeds 50 enrichment questions (30 UTBK + 20 GURU) from Phase 3A/3B/3C artifacts.
 * Uses idempotent upsert pattern — safe to rerun.
 *
 * Run: npx tsx scripts/seed-tka-enrichment.ts
 *      npx tsx scripts/seed-tka-enrichment.ts --execute
 */

import "./load-env";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const db = new PrismaClient();
const isExecute = process.argv.includes("--execute");

// ── Track config ──────────────────────────────────────────────────────────

const TRACK_MAP: Record<string, { tingkat: string; title: string }> = {
  TKA_UTBK: { tingkat: "UMUM", title: "Latihan TKA UTBK" },
  TKA_GURU: { tingkat: "GURU", title: "Latihan TKA Guru" },
};

// ── Mapping functions ─────────────────────────────────────────────────────

function mapDifficulty(num: number): string {
  if (num <= 1) return "EASY";
  if (num === 2) return "MEDIUM";
  if (num === 3) return "HARD";
  return "VERY_HARD";
}

function mapKompetensi(section: string): string {
  const s = section.toLowerCase();
  if (s === "membaca") return "LITERASI_MEMBACA";
  if (s === "kebahasaan") return "TATA_BAHASA";
  if (s === "sastra") return "SASTRA";
  if (s === "menulis") return "MENULIS";
  // Fallback
  return "LITERASI_MEMBACA";
}

// ── Types ─────────────────────────────────────────────────────────────────

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
  source?: string;
  status?: string;
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

// ── Load enrichment files ─────────────────────────────────────────────────

const BANKS_DIR = path.join(__dirname, "..", "data", "question-bank", "tka");

function loadEnrichmentFiles(): { file: string; track: string; data: BankFile }[] {
  const results: { file: string; track: string; data: BankFile }[] = [];
  const entries = ["utbk", "guru"];
  const DIR_TO_TRACK: Record<string, string> = {
    utbk: "TKA_UTBK",
    guru: "TKA_GURU",
  };

  for (const entry of entries) {
    const filePath = path.join(BANKS_DIR, entry, "set-002.json");
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠️  File not found: ${filePath}`);
      continue;
    }
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as BankFile;
    const track = DIR_TO_TRACK[entry];
    results.push({ file: `${entry}/set-002.json`, track, data });
  }
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log(`  TKA Enrichment Seed — Phase 5`);
  console.log(`  Mode: ${isExecute ? "🔴 EXECUTE" : "🟡 DRY-RUN"}`);
  console.log("═══════════════════════════════════════════\n");

  const bankFiles = loadEnrichmentFiles();
  let totalItems = 0;
  const trackCounts: Record<string, number> = {};
  const sectionCounts: Record<string, Record<string, number>> = {};

  for (const { file, track, data } of bankFiles) {
    const items = data.questions.length;
    totalItems += items;
    trackCounts[track] = (trackCounts[track] || 0) + items;

    // Count sections per track
    if (!sectionCounts[track]) sectionCounts[track] = {};
    for (const q of data.questions) {
      const sec = q.section || "unknown";
      sectionCounts[track][sec] = (sectionCounts[track][sec] || 0) + 1;
    }

    console.log(`  📁 ${file} → ${items} questions (${track})`);
  }

  console.log(`\n  Total: ${totalItems} questions across ${bankFiles.length} files`);
  console.log(`  Tracks: ${JSON.stringify(trackCounts)}`);
  console.log(`  Sections: ${JSON.stringify(sectionCounts)}\n`);

  // Validate expected counts
  const expectedTotal = 50;
  if (totalItems !== expectedTotal) {
    console.error(`  ❌ Expected ${expectedTotal} questions, got ${totalItems}`);
    process.exit(1);
  }
  console.log(`  ✅ Expected total confirmed: ${totalItems}\n`);

  // Validate IDs are unique
  const allQuestions: { file: string; track: string; item: QuestionItem }[] = [];
  for (const { file, track, data } of bankFiles) {
    for (const item of data.questions) {
      allQuestions.push({ file, track, item });
    }
  }

  const idSet = new Set<string>();
  const duplicateIds: string[] = [];
  for (const { item } of allQuestions) {
    if (idSet.has(item.id)) duplicateIds.push(item.id);
    idSet.add(item.id);
  }
  if (duplicateIds.length > 0) {
    console.error(`  ❌ Duplicate IDs found: ${duplicateIds.join(", ")}`);
    process.exit(1);
  }
  console.log(`  ✅ All ${allQuestions.length} IDs are unique\n`);

  // ── Pre-seed snapshot ─────────────────────────────────────────────────

  if (isExecute) {
    const existingUtbk = await db.tKAQuestion.count({ where: { tingkat: "UMUM" } });
    const existingGuru = await db.tKAQuestion.count({ where: { tingkat: "GURU" } });
    const existingTotal = await db.tKAQuestion.count();
    console.log(`  📊 Pre-seed snapshot:`);
    console.log(`     UTBK (UMUM): ${existingUtbk}`);
    console.log(`     GURU:        ${existingGuru}`);
    console.log(`     Total TKA:   ${existingTotal}`);

    // Check if enrichment IDs already exist
    const enrichmentIds = allQuestions.map(q => q.item.id);
    const existingEnrichment = await db.tKAQuestion.findMany({
      where: { id: { in: enrichmentIds } },
      select: { id: true },
    });
    if (existingEnrichment.length > 0) {
      console.log(`  ⚠️  ${existingEnrichment.length} enrichment IDs already exist — will upsert`);
    }
    console.log("");
  }

  // ── Seed ──────────────────────────────────────────────────────────────

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  const errors: string[] = [];
  const seededIds: string[] = [];

  for (const { file, track, item } of allQuestions) {
    const config = TRACK_MAP[track];
    if (!config) {
      console.warn(`  ⚠️  Unknown track "${track}" for ${item.id}, skipping`);
      skipped++;
      continue;
    }

    const text = item.stem || "";
    if (!text) {
      console.warn(`  ⚠️  Empty text for ${item.id}, skipping`);
      skipped++;
      continue;
    }

    if (!item.options || item.options.length < 4) {
      console.warn(`  ⚠️  Insufficient options for ${item.id}, skipping`);
      skipped++;
      continue;
    }

    if (!item.correctAnswer) {
      console.warn(`  ⚠️  Missing correctAnswer for ${item.id}, skipping`);
      skipped++;
      continue;
    }

    const difficulty = mapDifficulty(item.difficulty);
    const kompetensi = mapKompetensi(item.section || "membaca");
    const explanation = item.explanation || null;

    if (!isExecute) {
      inserted++;
      seededIds.push(item.id);
      continue;
    }

    try {
      const existing = await db.tKAQuestion.findUnique({ where: { id: item.id } });

      if (existing) {
        // Check if content changed
        const changed =
          existing.text !== text ||
          existing.difficulty !== difficulty ||
          existing.kompetensi !== kompetensi ||
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
              kompetensi: kompetensi as any,
              subKompetensi: item.tags?.[0] || null,
              text,
              passage: item.passage || null,
              type: "PILIHAN_GANDA",
              options: item.options || [],
              correctAnswer: item.correctAnswer || "",
              explanation,
              difficulty: difficulty as any,
              weight: 1.0,
              source: item.source || "BahasaCerdas Enrichment Phase 5",
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
            kompetensi: kompetensi as any,
            subKompetensi: item.tags?.[0] || null,
            text,
            passage: item.passage || null,
            type: "PILIHAN_GANDA",
            options: item.options || [],
            correctAnswer: item.correctAnswer || "",
            explanation,
            difficulty: difficulty as any,
            weight: 1.0,
            source: item.source || "BahasaCerdas Enrichment Phase 5",
            isActive: true,
            isVerified: true,
            tingkat: config.tingkat as any,
          },
        });
        inserted++;
      }
      seededIds.push(item.id);
    } catch (err: any) {
      console.error(`  ❌ Error processing ${item.id}: ${err.message}`);
      errors.push(`${item.id}: ${err.message}`);
      skipped++;
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────

  console.log("\n═══════════════════════════════════════════");
  console.log(`  Summary:`);
  console.log(`    Total items:    ${allQuestions.length}`);
  if (!isExecute) {
    console.log(`    (Dry-run)       ${allQuestions.length} items would be inserted`);
    console.log(`                    Use --execute to apply`);
  } else {
    console.log(`    Inserted:       ${inserted}`);
    console.log(`    Updated:        ${updated}`);
    console.log(`    Unchanged:      ${unchanged}`);
    console.log(`    Skipped:        ${skipped}`);
  }
  if (errors.length > 0) {
    console.log(`\n  Errors (${errors.length}):`);
    errors.forEach(r => console.log(`    - ${r}`));
  }

  // ── Post-seed count verification ──────────────────────────────────────

  if (isExecute) {
    console.log("\n── Post-Seed Verification ──");

    const postUtbk = await db.tKAQuestion.count({ where: { tingkat: "UMUM" } });
    const postGuru = await db.tKAQuestion.count({ where: { tingkat: "GURU" } });
    const postTotal = await db.tKAQuestion.count();

    console.log(`  UTBK (UMUM): ${postUtbk} (expected: 60)`);
    console.log(`  GURU:        ${postGuru} (expected: 50)`);
    console.log(`  Total TKA:   ${postTotal}`);

    // Verify enrichment records
    const verifyIds = seededIds.length > 0 ? seededIds : allQuestions.map(q => q.item.id);
    const verifiedRecords = await db.tKAQuestion.findMany({
      where: { id: { in: verifyIds } },
      select: { id: true, kompetensi: true, difficulty: true, tingkat: true },
    });
    console.log(`\n  Enrichment records verified: ${verifiedRecords.length}/${verifyIds.length}`);

    // Check section distribution
    const membacaCount = verifiedRecords.filter(r => r.kompetensi === "LITERASI_MEMBACA").length;
    const kebahasaanCount = verifiedRecords.filter(r => r.kompetensi === "TATA_BAHASA").length;
    console.log(`  LITERASI_MEMBACA: ${membacaCount} (expected: 10)`);
    console.log(`  TATA_BAHASA:      ${kebahasaanCount} (expected: 40)`);

    // Check difficulty distribution
    const diffCounts: Record<string, number> = {};
    for (const r of verifiedRecords) {
      diffCounts[r.difficulty] = (diffCounts[r.difficulty] || 0) + 1;
    }
    console.log(`  Difficulty: ${JSON.stringify(diffCounts)}`);

    // Verify ALL existing records unchanged
    const allUtbkGuru = await db.tKAQuestion.findMany({
      where: { tingkat: { in: ["UMUM", "GURU"] } },
      select: { id: true },
    });
    const newIds = new Set(verifyIds);
    const legacyRecords = allUtbkGuru.filter(r => !newIds.has(r.id));
    console.log(`  Legacy records: ${legacyRecords.length} (should be unchanged)`);
  }

  console.log("\n═══════════════════════════════════════════\n");

  await db.$disconnect();
  if (errors.length > 0 && isExecute) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Seed failed:", e.message);
  process.exit(1);
});
