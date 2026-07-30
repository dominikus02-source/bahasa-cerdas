import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

const DIFFICULTY_MAP: Record<string, string> = {
  MUDAH: "EASY",
  SEDANG: "MEDIUM",
  SULIT: "HARD",
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role?.toUpperCase() !== "GURU") return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const { tema, kelas, jumlah = 10, difficulty } = await req.json();

    if (!tema) {
      return NextResponse.json({ error: "Tema wajib diisi" }, { status: 400 });
    }

    const count = Math.min(Math.max(jumlah, 5), 30);

    // Build filter
    const where: any = {
      source: "MASTER_BANK",
      topik: tema,
    };

    if (kelas) where.kelas = kelas;

    // Count total available
    const totalAvailable = await db.soal.count({ where });

    if (totalAvailable === 0) {
      return NextResponse.json({
        error: "Tidak ada soal di Master Bank untuk tema ini. Pilih tema lain atau gunakan AI Generate.",
        totalAvailable: 0,
      }, { status: 404 });
    }

    // If difficulty specified, try to get with that filter
    let soals: any[] = [];
    if (difficulty) {
      const dbDiff = DIFFICULTY_MAP[difficulty as string] || difficulty;
      const diffSoals = await db.soal.findMany({
        where: { ...where, difficulty: dbDiff },
        take: count,
        orderBy: { usedCount: "asc" },
      });
      soals.push(...diffSoals);
    }

    // Fill remaining with any difficulty
    if (soals.length < count) {
      const remaining = count - soals.length;
      const excludeIds = soals.map(s => s.id);
      const fillSoals = await db.soal.findMany({
        where: {
          ...where,
          id: { notIn: excludeIds },
        },
        take: remaining,
        orderBy: { usedCount: "asc" },
      });
      soals.push(...fillSoals);
    }

    // Shuffle
    const shuffled = [...soals].sort(() => Math.random() - 0.5);

    // Guru needs correctAnswer for quiz grading, but we explicitly list fields
    const safeSoals = shuffled.map(s => ({
      id: s.id,
      kodeSoal: s.kodeSoal,
      judul: s.judul,
      text: s.text,
      type: s.type,
      options: s.options,
      correctAnswer: s.correctAnswer,
      difficulty: s.difficulty,
      topik: s.topik,
      kelas: s.kelas,
      levelBerpikir: s.levelBerpikir,
      estimasiWaktu: s.estimasiWaktu,
      explanation: s.explanation,
      kataKunci: s.kataKunci,
    }));

    return NextResponse.json({
      success: true,
      soals: safeSoals,
      total: safeSoals.length,
      totalAvailable,
    });
  } catch (error) {
    console.error("POST /api/guru/latihan/pick error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
