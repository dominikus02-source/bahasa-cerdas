import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { buildLatihan, buildKuis, toStudentQuestions, resolvePraktik, resolveBelajar } from "@/lib/penugasan-content";

// GET one assignment's student content: Belajar + Latihan (no answer keys) +
// Praktik. Kuis and Panduan Guru are intentionally excluded.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const penugasan = await db.penugasan.findUnique({
      where: { id },
      include: {
        unit: { select: { id: true, title: true, content: true, xpReward: true } },
        group: { include: { members: { where: { userId: user.id }, select: { id: true } } } },
        submissions: {
          where: { userId: user.id },
          select: {
            status: true, score: true, completedAt: true,
            praktikUrl: true, praktikCatatan: true, praktikNilai: true, praktikDinilai: true,
          },
        },
      },
    });

    if (!penugasan || penugasan.group.members.length === 0) {
      return NextResponse.json({ error: "Tugas tidak ditemukan", code: "TUGAS_NOT_FOUND" }, { status: 404 });
    }

    let content: any = {};
    try { content = penugasan.unit.content ? JSON.parse(penugasan.unit.content) : {}; } catch { content = {}; }

    const base = {
      id: penugasan.id,
      jenis: penugasan.jenis,
      judul: penugasan.judul,
      deskripsi: penugasan.deskripsi,
      tenggat: penugasan.tenggat,
      unitTitle: penugasan.unit.title,
      xpReward: penugasan.unit.xpReward,
      submission: penugasan.submissions[0] ?? null,
    };

    // KUIS (ulangan harian): only questions, no keys, auto-graded on submit.
    if (penugasan.jenis === "KUIS") {
      return NextResponse.json({ data: { ...base, kuis: toStudentQuestions(buildKuis(content)) } });
    }

    // MATERI: Belajar + Latihan (no keys) + Praktik. Kuis & Panduan Guru excluded.
    const rp = content?.readingPractice;
    return NextResponse.json({
      data: {
        ...base,
        belajar: resolveBelajar(content),
        latihan: toStudentQuestions(buildLatihan(content)),
        reading: rp && (rp.stimulusText || rp.stimulusTitle)
          ? { title: rp.stimulusTitle || rp.title || "Bacaan", text: rp.stimulusText || "" }
          : null,
        praktik: resolvePraktik(content),
      },
    });
  } catch (error) {
    console.error("GET /api/murid/penugasan/[id] error:", error);
    return NextResponse.json({ error: "Gagal memuat tugas." }, { status: 500 });
  }
}
