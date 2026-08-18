/**
 * POST /api/admin/bank-soal/import
 *
 * Bulk JSON import for the BahasaCerdas question bank.
 *
 * Accepts:
 *   { "version": "1.0", "questions": [ ... ] }
 *
 * Pipeline:
 *   1. Auth check (founder/admin only)
 *   2. Envelope validation
 *   3. Per-question validation
 *   4. Duplicate detection (kodeSoal + text)
 *   5. DB transaction (Soal + QuestionMetadata)
 *   6. Import summary
 *
 * Returns:
 *   { imported, skipped, invalid, duplicates, warnings, summary }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import {
  validateImportEnvelope,
  validateImportBatch,
  type ValidatedQuestion,
} from "@/lib/question-bank/import-validation";

interface ImportSummary {
  imported: number;
  skipped: number;
  invalid: number;
  duplicates: number;
  warnings: number;
  byDifficulty: Record<string, number>;
  byType: Record<string, number>;
  withMetadata: number;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser?.isFounder && dbUser?.role?.toUpperCase() !== "ADMIN") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    // Parse body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Body tidak valid" }, { status: 400 });
    }

    // Envelope validation
    const envelope = validateImportEnvelope(body);
    if (!envelope.valid) {
      return NextResponse.json({ error: envelope.error }, { status: 400 });
    }

    // Get existing kodeSoals and texts for duplicate detection
    const existingSoals = await db.soal.findMany({
      where: { source: "IMPORT" },
      select: { kodeSoal: true, text: true },
      orderBy: { kodeSoal: "asc" },
    });
    const existingKodeSoals = new Set(
      existingSoals
        .map((s) => s.kodeSoal?.toUpperCase())
        .filter((k): k is string => Boolean(k))
    );
    const existingTexts = existingSoals.map((s) => s.text);

    // Validate batch
    const result = validateImportBatch(envelope.questions ?? [], existingKodeSoals, existingTexts);

    if (result.valid.length === 0) {
      return NextResponse.json({
        imported: 0,
        skipped: 0,
        invalid: result.errors.length,
        duplicateCount: result.duplicates.length,
        warningCount: result.warnings.length,
        errors: result.errors.slice(0, 50),
        duplicateDetails: result.duplicates.slice(0, 50),
        warningDetails: result.warnings.slice(0, 50),
        summary: result.stats,
      });
    }

    // Dry run mode — if ?dryRun=true, return validation only
    const url = new URL(req.url);
    if (url.searchParams.get("dryRun") === "true") {
      return NextResponse.json({
        dryRun: true,
        imported: 0,
        skipped: 0,
        invalid: result.errors.length,
        duplicateCount: result.duplicates.length,
        warningCount: result.warnings.length,
        errors: result.errors.slice(0, 50),
        duplicateDetails: result.duplicates.slice(0, 50),
        warningDetails: result.warnings.slice(0, 50),
        summary: result.stats,
        sampleValid: result.valid.slice(0, 5),
      });
    }

    // DB transaction: insert Soal + QuestionMetadata
    let imported = 0;
    const importErrors: string[] = [];

    // Process in chunks of 50 for safety
    const CHUNK_SIZE = 50;
    for (let i = 0; i < result.valid.length; i += CHUNK_SIZE) {
      const chunk = result.valid.slice(i, i + CHUNK_SIZE);

      try {
        await db.$transaction(async (tx) => {
          for (const q of chunk) {
            // Find or create uploader (use the admin user)
            const soal = await tx.soal.create({
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
                uploaderId: dbUser.id,
              },
            });

            // Create QuestionMetadata if skill is provided
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
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        importErrors.push(`Chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ${msg}`);
      }
    }

    const summary: ImportSummary = {
      imported,
      skipped: result.stats.total - result.valid.length,
      invalid: result.errors.length,
      duplicates: result.duplicates.length,
      warnings: result.warnings.length,
      byDifficulty: result.stats.byDifficulty,
      byType: result.stats.byType,
      withMetadata: result.stats.withMetadata,
    };

    return NextResponse.json({
      imported,
      skipped: summary.skipped,
      invalid: summary.invalid,
      duplicates: summary.duplicates,
      warnings: summary.warnings,
      errors: result.errors.slice(0, 50),
      duplicateDetails: result.duplicates.slice(0, 50),
      warningDetails: result.warnings.slice(0, 50),
      importErrors,
      summary,
    });
  } catch (error) {
    console.error("POST /api/admin/bank-soal/import error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
