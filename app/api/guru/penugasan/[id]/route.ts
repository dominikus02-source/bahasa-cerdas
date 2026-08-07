import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { isTeacherOrStudent } from "@/lib/teacher/students";
// One assignment + every enrolled student's submission (for the teacher's review).
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user || !isTeacherOrStudent(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const penugasan = await db.penugasan.findUnique({
      where: { id },
      include: {
        unit: { select: { title: true } },
        group: {
          select: {
            name: true,
            teacherId: true,
            members: {
              // Semua anggota kelas (konsisten dengan hitungan `_count.members`
              // di daftar penugasan dan daftar murid di Data Siswa / KelasKu).
              select: { user: { select: { id: true, fullName: true, avatar: true } } },
            },
          },
        },
        submissions: true,
      },
    });

    if (!penugasan) return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
    if (penugasan.group.teacherId !== user.id && user.role !== "ADMIN" && !user.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const subByUser = new Map(penugasan.submissions.map((s) => [s.userId, s]));
    const murid = penugasan.group.members.map((m) => {
      const s = subByUser.get(m.user.id);
      return {
        userId: m.user.id,
        fullName: m.user.fullName,
        avatar: m.user.avatar,
        status: s?.status ?? "ASSIGNED",
        score: s?.score ?? null,
        praktikUrl: s?.praktikUrl ?? null,
        praktikNilai: s?.praktikNilai ?? null,
        praktikCatatan: s?.praktikCatatan ?? null,
        praktikDinilai: s?.praktikDinilai ?? false,
      };
    });

    return NextResponse.json({
      data: {
        id: penugasan.id,
        judul: penugasan.judul,
        jenis: penugasan.jenis,
        unitTitle: penugasan.unit.title,
        groupName: penugasan.group.name,
        murid,
      },
    });
  } catch (error) {
    console.error("GET /api/guru/penugasan/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Hapus tugas materi/latihan/kuis/praktik yang sudah dikirim ke kelas.
// Hanya guru pemilik tugas (atau founder) yang boleh — murid yang sudah
// mengerjakan ikut terhapus (submission cascade lewat relasi DB).
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user || !isTeacherOrStudent(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const penugasan = await db.penugasan.findUnique({
      where: { id },
      select: { id: true, group: { select: { teacherId: true } } },
    });
    if (!penugasan) return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
    if (penugasan.group.teacherId !== user.id && user.role !== "ADMIN" && !user.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.penugasan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/guru/penugasan/[id] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
