import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import fs from "fs";
import path from "path";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || (dbUser.role?.toUpperCase() !== "ADMIN" && !dbUser.isFounder)) {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    // Auto-migrate: add missing columns (idempotent)
    const addColumnsSQL = `
      ALTER TABLE "Soal" ADD COLUMN IF NOT EXISTS "kodeSoal" TEXT;
      ALTER TABLE "Soal" ADD COLUMN IF NOT EXISTS "judul" TEXT;
      ALTER TABLE "Soal" ADD COLUMN IF NOT EXISTS "semester" INTEGER;
      ALTER TABLE "Soal" ADD COLUMN IF NOT EXISTS "kompetensi" TEXT;
      ALTER TABLE "Soal" ADD COLUMN IF NOT EXISTS "indikator" TEXT;
      ALTER TABLE "Soal" ADD COLUMN IF NOT EXISTS "levelBerpikir" INTEGER;
      ALTER TABLE "Soal" ADD COLUMN IF NOT EXISTS "kataKunci" TEXT;
      ALTER TABLE "Soal" ADD COLUMN IF NOT EXISTS "estimasiWaktu" INTEGER;
      ALTER TABLE "Soal" ADD COLUMN IF NOT EXISTS "usedCount" INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE "Soal" ADD COLUMN IF NOT EXISTS "correctCount" INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE "Soal" ADD COLUMN IF NOT EXISTS "wrongCount" INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE "Soal" ADD COLUMN IF NOT EXISTS "totalTimeSpent" INTEGER NOT NULL DEFAULT 0;
      CREATE UNIQUE INDEX IF NOT EXISTS "Soal_kodeSoal_key" ON "Soal"("kodeSoal");
    `;

    try {
      await db.$executeRawUnsafe(addColumnsSQL);
    } catch (migrateErr: any) {
      console.error("Migration error:", migrateErr?.message);
    }

    const dir = path.join(process.cwd(), "data/question-bank/master");
    let files: string[] = [];
    try {
      files = fs.readdirSync(dir).filter((f: string) => f.endsWith(".json") && f !== "types.ts");
    } catch (e: any) {
      return NextResponse.json({ error: `Gagal baca folder data: ${e?.message}` }, { status: 500 });
    }

    const allSoals: any[] = [];
    const fileErrors: string[] = [];

    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8") as string);
        const soals = Array.isArray(content) ? content : [];
        for (const s of soals) {
          if (!s.kodeSoal || !s.text) continue;
          allSoals.push({
            kodeSoal: s.kodeSoal,
            judul: s.judul || null,
            text: s.text,
            type: s.type || "PILIHAN_GANDA",
            difficulty: s.difficulty || "MEDIUM",
            options: s.options || [],
            correctAnswer: String(s.correctAnswer ?? "0"),
            explanation: s.explanation || null,
            isHOTS: s.isHOTS || false,
            kelas: s.kelas || "7",
            topik: s.tema || s.topik || "",
            subject: "Bahasa Indonesia",
            source: "MASTER_BANK",
            uploaderId: dbUser.id,
            semester: s.semester || null,
            kompetensi: s.kompetensi || null,
            indikator: s.indikator || null,
            kataKunci: s.kataKunci ? JSON.stringify(s.kataKunci) : null,
            estimasiWaktu: s.estimasiWaktu || null,
            levelBerpikir: s.levelBerpikir || null,
          });
        }
      } catch (e: any) {
        fileErrors.push(`${file}: ${e?.message || "unknown"}`);
      }
    }

    if (allSoals.length === 0) {
      return NextResponse.json({
        success: true,
        total: 0,
        created: 0,
        message: `Tidak ada soal valid. File: ${files.length}, errors: ${fileErrors.length}`,
        fileErrors: fileErrors.slice(0, 5),
        files: files.length,
      });
    }

    const CHUNK_SIZE = 100;
    let totalCreated = 0;
    const dbErrors: string[] = [];

    for (let i = 0; i < allSoals.length; i += CHUNK_SIZE) {
      const chunk = allSoals.slice(i, i + CHUNK_SIZE);
      try {
        const result = await db.soal.createMany({
          data: chunk,
          skipDuplicates: true,
        });
        totalCreated += result.count;
      } catch (e: any) {
        dbErrors.push(`Chunk ${Math.floor(i / CHUNK_SIZE) + 1}: ${e?.message || "unknown"}`);
        for (const soal of chunk) {
          try {
            await db.soal.create({ data: soal });
            totalCreated++;
          } catch (innerErr: any) {
            dbErrors.push(`${soal.kodeSoal}: ${innerErr?.message || "unknown"}`);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      total: allSoals.length,
      created: totalCreated,
      skipped: allSoals.length - totalCreated,
      fileErrors: fileErrors.length > 0 ? fileErrors.slice(0, 5) : [],
      dbErrors: dbErrors.length > 0 ? dbErrors.slice(0, 10) : [],
      files: files.length,
    });
  } catch (error: any) {
    console.error("POST /api/admin/bank-soal/seed error:", error?.message, error?.stack);
    return NextResponse.json({
      success: false,
      error: error?.message || "Internal error",
      detail: error?.message || "unknown",
    }, { status: 500 });
  }
}
