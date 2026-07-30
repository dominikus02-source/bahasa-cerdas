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

    const dir = path.join(process.cwd(), "data/question-bank/master");
    const files = fs.readdirSync(dir).filter((f: string) => f.endsWith(".json") && f !== "types.ts");

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
        message: "Tidak ada soal valid ditemukan",
        fileErrors: fileErrors.slice(0, 5),
        files: files.length,
      });
    }

    // Insert in chunks of 100 to avoid timeout/memory issues
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
        dbErrors.push(`Chunk ${i / CHUNK_SIZE + 1}: ${e?.message || "unknown"}`);
        // Try one-by-one for this chunk if batch fails
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
      error: "Internal error",
      detail: error?.message || "unknown",
    }, { status: 500 });
  }
}
