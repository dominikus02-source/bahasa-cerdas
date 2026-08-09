import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { upsertNilaiOtomatis } from "@/lib/penilaian/upsert-nilai";
import { isTeacherOrStudent } from "@/lib/teacher/students";

// Teacher grades a student's Praktik submission manually, then it enters the rekap.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user || !isTeacherOrStudent(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const { userId, nilai, catatan } = await req.json().catch(() => ({}));

    const skor = Math.max(0, Math.min(100, Math.round(Number(nilai))));
    if (!userId || Number.isNaN(skor)) {
      return NextResponse.json({ error: "Nilai tidak valid." }, { status: 400 });
    }

    const penugasan = await db.penugasan.findUnique({
      where: { id },
      include: { group: { select: { teacherId: true } } },
    });
    if (!penugasan) return NextResponse.json({ error: "Tugas tidak ditemukan" }, { status: 404 });
    if (penugasan.group.teacherId !== user.id && user.role !== "ADMIN" && !user.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.penugasanSubmission.upsert({
      where: { penugasanId_userId: { penugasanId: id, userId } },
      update: { praktikNilai: skor, praktikCatatan: catatan || null, praktikDinilai: true },
      create: { penugasanId: id, userId, status: "IN_PROGRESS", praktikNilai: skor, praktikCatatan: catatan || null, praktikDinilai: true },
    });

    // Push the praktik grade into the rekap (kategori "Praktik").
    try {
      await upsertNilaiOtomatis({
        userId,
        groupId: penugasan.groupId,
        kategoriNama: "Praktik",
        skor,
        sumberType: "PENUGASAN",
        sumberId: `${penugasan.id}:praktik`,
        keterangan: `Praktik — ${penugasan.judul}`,
      });
    } catch (e) {
      console.error("nilai-praktik rekap error:", e);
    }

    return NextResponse.json({ success: true, data: { userId, nilai: skor } });
  } catch (error) {
    console.error("POST nilai-praktik error:", error);
    return NextResponse.json({ error: "Nilai belum berhasil disimpan. Silakan coba lagi." }, { status: 500 });
  }
}
