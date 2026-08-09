import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { isTeacherOrStudent, getTeacherGroupDetail } from "@/lib/teacher/students";

// ════════════════════════════════════════════════════════════════════
// GET /api/guru/kelasku/[id] — Detail kelas (tab Overview/Tugas/Nilai/
// Pengumuman/Materi). Additive, read-only, guru-only.
// ════════════════════════════════════════════════════════════════════

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user || !isTeacherOrStudent(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const group = await getTeacherGroupDetail(user.id, id);
    if (!group) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });

    const memberIds = group.members.map((m) => m.userId);

    const [tugasAktifQuiz, tugasAktifPenugasan, pengumuman, materis, nilais, progres] = await Promise.all([
      db.quizAssignment.findMany({
        where: { groupId: id },
        select: {
          id: true, dueDate: true, isPublished: true, assignedAt: true,
          quiz: { select: { id: true, title: true } },
          _count: { select: { submissions: true } },
        },
        orderBy: { assignedAt: "desc" },
        take: 50,
      }),
      db.penugasan.findMany({
        where: { groupId: id },
        select: {
          id: true, judul: true, jenis: true, tenggat: true, createdAt: true,
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.pengumuman.findMany({
        where: { groupId: id },
        select: { id: true, judul: true, deskripsi: true, pinned: true, createdAt: true, tenggat: true, _count: { select: { submissions: true } } },
        orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
        take: 50,
      }),
      db.materiKirim.findMany({
        where: { groupId: id },
        select: {
          id: true, createdAt: true,
          materi: { select: { id: true, title: true, description: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.nilai.findMany({
        where: { groupId: id },
        select: { skor: true },
        take: 10000,
      }),
      db.userUnitProgress.count({ where: { userId: { in: memberIds } } }),
    ]);

    const nilaiRata = nilais.length
      ? Math.round(nilais.reduce((a, n) => a + n.skor, 0) / nilais.length)
      : null;
    const progressMurid = memberIds.length ? Math.round((progres / memberIds.length) * 100) : 0;
    const tugasAktif = tugasAktifQuiz.filter((t) => t.isPublished || !t.dueDate || t.dueDate > new Date()).length + tugasAktifPenugasan.filter((p) => !p.tenggat || p.tenggat > new Date()).length;

    return NextResponse.json({
      stats: {
        totalMurid: group.members.length,
        tugasAktif,
        pengumuman: pengumuman.length,
        nilaiRata,
        progressMurid,
      },
      tugasQuiz: tugasAktifQuiz,
      tugasPenugasan: tugasAktifPenugasan,
      pengumuman,
      materis,
    });
  } catch (error) {
    console.error("GET /api/guru/kelasku/[id] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
