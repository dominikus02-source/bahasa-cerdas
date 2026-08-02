import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

const DIFFICULTY_MAP: Record<string, string> = {
  MUDAH: "MUDAH",
  SEDANG: "SEDANG",
  SULIT: "SULIT",
};

// Preview soal bank SEBELUM dikirim ke kelas (read-only, tanpa efek samping).
// Guru hanya melihat: soal, opsi, kunci jawaban, pembahasan. Tidak ada
// usedCount/assignment yang dibuat.
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || (dbUser.role?.toUpperCase() !== "GURU" && dbUser.role?.toUpperCase() !== "ADMIN" && !dbUser.isFounder)) {
      return NextResponse.json({ error: "Guru only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tema = searchParams.get("tema") || "";
    const kelas = searchParams.get("kelas") || "";
    const difficulty = searchParams.get("difficulty") || "";
    const jumlah = Math.min(Math.max(Number(searchParams.get("jumlah")) || 10, 1), 30);

    if (!tema || !kelas) {
      return NextResponse.json({ error: "Tema dan kelas wajib diisi" }, { status: 400 });
    }

    const where: any = { source: "MASTER_BANK", topik: tema, kelas };
    if (difficulty) where.difficulty = DIFFICULTY_MAP[difficulty] || difficulty;

    const totalAvailable = await db.soal.count({ where });
    let soals = await db.soal.findMany({ where, take: jumlah, orderBy: { usedCount: "asc" } });
    if (soals.length < jumlah) {
      const fillSoals = await db.soal.findMany({
        where: { source: "MASTER_BANK", topik: tema, id: { notIn: soals.map(s => s.id) } },
        take: jumlah - soals.length,
        orderBy: { usedCount: "asc" },
      });
      soals.push(...fillSoals);
    }

    const shuffled = soals.sort(() => Math.random() - 0.5).slice(0, jumlah);

    return NextResponse.json({
      success: true,
      tema,
      kelas,
      totalAvailable,
      soal: shuffled.map((s, i) => ({
        id: s.id,
        nomor: i + 1,
        text: s.text,
        options: (s as any).options || [],
        correctAnswer: (s as any).correctAnswer ?? null,
        explanation: (s as any).explanation || null,
        difficulty: s.difficulty || null,
      })),
    });
  } catch (error) {
    console.error("GET /api/guru/bank-soal/preview error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
