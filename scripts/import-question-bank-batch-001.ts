/**
 * Batch 001 Import Script.
 *
 * Reads aksi-hari-ini-batch-001.json, validates each question,
 * and imports into the database via Prisma (Soal + QuestionMetadata).
 *
 * Usage:
 *   npx tsx scripts/import-question-bank-batch-001.ts          # import
 *   npx tsx scripts/import-question-bank-batch-001.ts --dry-run # validate only
 *
 * Requires: DATABASE_URL in .env.local
 *
 * IMPORTANT: uploaderId di tabel Soal adalah FK wajib ke User, jadi script
 * ini menyelesaikan uploader dari user ADMIN/founder (fallback GURU) yang
 * pertama terdaftar — TIDAK memakai string placeholder.
 */

import * as fs from "fs";
import * as path from "path";
import { db } from "../lib/db";
import {
  validateImportEnvelope,
  validateImportBatch,
} from "../lib/question-bank/import-validation";

const BATCH_FILE = path.resolve(
  __dirname,
  "..",
  "data",
  "question-bank",
  "aksi-hari-ini-batch-001.json"
);

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  console.log("=== QUESTION BANK BATCH 001 " + (dryRun ? "(DRY RUN)" : "(IMPORT)") + " ===\n");

  if (!fs.existsSync(BATCH_FILE)) {
    console.error("File not found: " + BATCH_FILE);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(BATCH_FILE, "utf-8"));
  const envelope = validateImportEnvelope(raw);
  if (!envelope.valid) {
    console.error("Envelope invalid: " + envelope.error);
    process.exit(1);
  }

  console.log("Envelope: valid (" + envelope.questions!.length + " questions)\n");

  const existing = await db.soal.findMany({
    where: { source: "IMPORT" },
    select: { kodeSoal: true, text: true },
  });
  const existingKodeSoals = new Set(
    existing.map((s) => s.kodeSoal?.toUpperCase()).filter(Boolean) as string[]
  );
  const existingTexts = existing.map((s) => s.text);

  console.log("Existing IMPORT questions: " + existing.length + "\n");

  const result = validateImportBatch(
    envelope.questions!,
    existingKodeSoals,
    existingTexts
  );

  console.log("=== VALIDATION RESULT ===");
  console.log("Total:     " + result.stats.total);
  console.log("Valid:     " + result.stats.valid);
  console.log("Invalid:   " + result.stats.errors);
  console.log("Duplicate: " + result.stats.duplicates);
  console.log("Warning:   " + result.stats.warnings);
  console.log("\nDifficulty: " + JSON.stringify(result.stats.byDifficulty));
  console.log("Type:       " + JSON.stringify(result.stats.byType));
  console.log("With meta:  " + result.stats.withMetadata);

  if (result.errors.length > 0) {
    console.log("\n--- ERRORS ---");
    for (const e of result.errors.slice(0, 20)) {
      console.log("  [" + e.index + "] " + (e.kodeSoal || "?") + " / " + e.field + ": " + e.message);
    }
  }

  if (result.duplicates.length > 0) {
    console.log("\n--- DUPLICATES ---");
    for (const d of result.duplicates.slice(0, 20)) {
      console.log("  [" + d.index + "] " + d.kodeSoal + ": " + d.reason);
    }
  }

  if (dryRun || result.valid.length === 0) {
    console.log("\n=== DRY RUN COMPLETE ===");
    if (result.valid.length > 0) {
      console.log("\nSample valid questions:");
      for (const q of result.valid.slice(0, 5)) {
        console.log("  " + q.kodeSoal + " | " + q.difficulty + " | " + q.type + " | " + (q.skill || "no-skill"));
      }
    }
    await db.$disconnect();
    return;
  }

  console.log("=== IMPORTING ===");

  const uploader =
    (await db.user.findFirst({
      where: { OR: [{ role: "ADMIN" }, { isFounder: true }] },
      orderBy: { createdAt: "asc" },
    })) ??
    (await db.user.findFirst({
      where: { role: "GURU" },
      orderBy: { createdAt: "asc" },
    }));

  if (!uploader) {
    console.error("FATAL: tidak ada user ADMIN/founder/GURU di database untuk dijadikan uploader Soal (uploaderId wajib valid FK ke User).");
    await db.$disconnect();
    process.exit(1);
  }

  console.log("Uploader: " + uploader.email + " (" + uploader.id + ")\n");

  let imported = 0;
  const CHUNK = 50;

  for (let i = 0; i < result.valid.length; i += CHUNK) {
    const chunk = result.valid.slice(i, i + CHUNK);
    try {
      await db.$transaction(async (tx) => {
        for (const q of chunk) {
          await tx.soal.create({
            data: {
              kodeSoal: q.kodeSoal,
              judul: q.judul,
              text: q.text,
              type: q.type,
              difficulty: q.difficulty,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation,
              isHOTS: q.isHOTS,
              kelas: q.kelas,
              semester: q.semester,
              topik: q.topik,
              kompetensi: q.kompetensi,
              indikator: q.indikator,
              levelBerpikir: q.levelBerpikir,
              kataKunci: q.kataKunci.length > 0 ? q.kataKunci.join(",") : null,
              estimasiWaktu: q.estimasiWaktu,
              subject: "Bahasa Indonesia",
              source: "IMPORT",
              uploaderId: uploader.id,
            },
          });

          if (q.skill) {
            await tx.questionMetadata.create({
              data: {
                source: "BANK_SOAL",
                questionId: q.kodeSoal,
                skill: q.skill,
                subskill: q.subskill,
                difficulty: q.difficulty,
                topic: q.topic || q.topik,
                questionType: q.type,
                provenance: q.provenance,
                confidence: "HIGH",
                status: "APPROVED",
              },
            });
          }
          imported++;
        }
      });
      console.log("  Chunk " + (Math.floor(i / CHUNK) + 1) + ": imported " + chunk.length + " (total: " + imported + ")");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("  Chunk " + (Math.floor(i / CHUNK) + 1) + ": FAILED - " + msg);
    }
  }

  console.log("\n=== IMPORT COMPLETE ===");
  console.log("Imported: " + imported + "/" + result.valid.length);

  await db.$disconnect();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
