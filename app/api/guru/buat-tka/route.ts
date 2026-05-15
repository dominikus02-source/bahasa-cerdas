import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== "GURU") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { title, soalIds, duration, passingScore } = await req.json();
    if (!title || !soalIds?.length) return NextResponse.json({ error: "Judul dan soal diperlukan" }, { status: 400 });

    // Get selected questions
    const questions = await db.bankSoal.findMany({ where: { id: { in: soalIds } } });
    if (questions.length === 0) return NextResponse.json({ error: "Soal tidak ditemukan" }, { status: 404 });

    // Create TKA package
    const paket = await db.paketKompetensi.create({
      data: {
        title,
        description: `Paket TKA dari Bank Soal • ${questions.length} soal`,
        type: "TKA_UTBK",
        mode: "LATIHAN",
        duration: duration || 60,
        passingScore: passingScore || 55,
        passingGrade: "C",
        totalQuestions: questions.length,
        isActive: true,
        creatorId: user.id,
        sections: [],
        sectionsData: [{ name: "Bank Soal", count: questions.length, kompetensi: "PEDAGOGIK", timeLimit: duration || 60, questionIds: soalIds }],
      },
    });

    return NextResponse.json({ paketId: paket.id, title: paket.title });
  } catch { return NextResponse.json({ error: "Gagal membuat TKA" }, { status: 500 }); }
}
