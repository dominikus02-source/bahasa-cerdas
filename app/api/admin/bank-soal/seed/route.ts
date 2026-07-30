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
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".json") && f !== "types.ts");

    let totalCreated = 0;
    let totalUpdated = 0;
    const errors: string[] = [];

    for (const file of files) {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
        const soals = Array.isArray(content) ? content : [];

        for (const s of soals) {
          if (!s.kodeSoal || !s.text) continue;
              try {
                await db.soal.upsert({
                  where: { kodeSoal: s.kodeSoal },
                  create: {
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
                  },
                  update: {
                    text: s.text,
                    type: s.type || "PILIHAN_GANDA",
                    difficulty: s.difficulty || "MEDIUM",
                    options: s.options || [],
                    correctAnswer: String(s.correctAnswer ?? "0"),
                    explanation: s.explanation || null,
                    isHOTS: s.isHOTS || false,
                    kelas: s.kelas || "7",
                    topik: s.tema || s.topik || "",
                    uploaderId: dbUser.id,
                  },
                });
            totalCreated++;
          } catch (e: any) {
            errors.push(`${s.kodeSoal}: ${e?.message || "unknown"}`);
          }
        }
      } catch (e: any) {
        errors.push(`${file}: ${e?.message || "unknown"}`);
      }
    }

    return NextResponse.json({
      success: true,
      total: totalCreated + totalUpdated,
      created: totalCreated,
      updated: totalUpdated,
      errors: errors.length > 0 ? errors.slice(0, 10) : [],
      files: files.length,
    });
  } catch (error) {
    console.error("POST /api/admin/bank-soal/seed error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
