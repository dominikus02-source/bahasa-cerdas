import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";
import { isMasterBankDeliverable, toDeliverySoal } from "@/lib/question-bank/delivery-gate";

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
    if (!dbUser || !isTeacherOrStudent(dbUser)) return NextResponse.json({ error: "Guru only" }, { status: 403 });

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

    // P0.6 containment: MASTER_BANK dikarantina penuh — hanya butir yang lolos
    // REVIEW KONTEN MANUSIA (allowlist kosong saat ini) yang boleh dipilih
    // untuk pengiriman ke murid.
    const candidates = await db.soal.findMany({ where });
    const deliverable = candidates.filter((s: any) => isMasterBankDeliverable(toDeliverySoal(s as any)));

    const totalAvailable = deliverable.length;

    if (totalAvailable === 0) {
      return NextResponse.json({
        error: "Belum ada soal yang lolos verifikasi kualitas untuk tema ini (bank 50-tema sedang diaudit). Gunakan AI Generate untuk membuat soal baru, atau pilih tema lain.",
        totalAvailable: 0,
      }, { status: 422 });
    }

    // Difficulty filter over the deliverable set (best-effort, lalu isi sisa
    // dari set yang sama). Tidak pernah memilih dari bank mentah.
    let soals: any[] = [];
    if (difficulty) {
      const dbDiff = DIFFICULTY_MAP[difficulty as string] || difficulty;
      soals.push(...deliverable.filter((s: any) => s.difficulty === dbDiff));
    }
    if (soals.length < count) {
      const excludeIds = soals.map(s => s.id);
      soals.push(...deliverable.filter((s: any) => !excludeIds.includes(s.id)));
    }
    soals = soals.slice(0, count);

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
