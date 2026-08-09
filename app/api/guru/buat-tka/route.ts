import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !isTeacherOrStudent(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { title, soalIds, duration, passingScore } = await req.json();
    if (!title || !soalIds?.length) return NextResponse.json({ error: "Judul dan soal diperlukan" }, { status: 400 });

    // Ambil dari TKAQuestion (soal individu dengan options + correctAnswer)
    const questions = await db.tKAQuestion.findMany({ where: { id: { in: soalIds }, isActive: true } });
    if (questions.length === 0) return NextResponse.json({ error: "Soal tidak ditemukan. Pilih soal dari bank TKA yang tersedia." }, { status: 404 });

    // Hitung seksi berdasarkan subKompetensi
    const grouped: Record<string, { count: number; ids: string[] }> = {};
    for (const q of questions) {
      const seksi = q.subKompetensi || "Umum";
      if (!grouped[seksi]) grouped[seksi] = { count: 0, ids: [] };
      grouped[seksi].count++;
      grouped[seksi].ids.push(q.id);
    }

    const sectionsData = Object.entries(grouped).map(([name, val]) => ({
      name, count: val.count, kompetensi: "PEDAGOGIK",
      timeLimit: Math.max(10, Math.round((duration || 60) * (val.count / questions.length))),
      questionIds: val.ids,
    }));

    // Simpan questionPool agar test screen bisa mengacak & mengambil soal
    const paket = await db.paketKompetensi.create({
      data: {
        title,
        description: `Paket TKA • ${questions.length} soal`,
        type: "TKA_UTBK",
        mode: "LATIHAN",
        duration: duration || 60,
        passingScore: passingScore || 55,
        passingGrade: "C",
        totalQuestions: questions.length,
        isActive: true,
        creatorId: user.id,
        sections: Object.keys(grouped),
        sectionsData,
        questionPool: { questionIds: soalIds, source: "TKAQuestion" },
      },
    });

    return NextResponse.json({ paketId: paket.id, title: paket.title });
  } catch { return NextResponse.json({ error: "Gagal membuat TKA" }, { status: 500 }); }
}
