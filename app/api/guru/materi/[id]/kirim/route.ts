import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { isTeacherOrStudent } from "@/lib/teacher/students";

// Daftar kelas yang sudah pernah menerima materi ini dari guru ini — dipakai
// modal "Kirim ke Kelas" untuk menandai kelas yang sudah terkirim.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user || !isTeacherOrStudent(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id: materiId } = await params;
    const kirims = await db.materiKirim.findMany({
      where: { materiId, teacherId: user.id },
      select: { groupId: true, createdAt: true },
    });
    return NextResponse.json({ data: kirims });
  } catch (error) {
    console.error("GET /api/guru/materi/[id]/kirim error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Guru mengirim satu Materi (file) ke kelas terpilih. Mencatat riwayat kirim
// (MateriKirim) dan memberi tahu setiap murid di kelas tersebut.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getUser();
    if (!user || !isTeacherOrStudent(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: materiId } = await params;
    const { groupIds } = await req.json().catch(() => ({}));
    if (!Array.isArray(groupIds) || groupIds.length === 0) {
      return NextResponse.json({ error: "Pilih minimal satu kelas" }, { status: 400 });
    }

    const materi = await db.materi.findUnique({ where: { id: materiId } });
    if (!materi || (!materi.isPublished && materi.uploaderId !== user.id)) {
      return NextResponse.json({ error: "Materi tidak ditemukan" }, { status: 404 });
    }

    const groups = await db.group.findMany({
      where: { id: { in: groupIds }, teacherId: user.id },
      include: { members: { select: { userId: true } } },
    });
    if (groups.length !== groupIds.length) {
      return NextResponse.json({ error: "Beberapa kelas tidak ditemukan" }, { status: 404 });
    }

    await db.materiKirim.createMany({
      data: groups.map((g) => ({ materiId, groupId: g.id, teacherId: user.id })),
      skipDuplicates: true,
    });

    const memberIds = Array.from(new Set(groups.flatMap((g) => g.members.map((m) => m.userId))));
    if (memberIds.length > 0) {
      await db.notifikasi.createMany({
        data: memberIds.map((userId) => ({
          userId,
          title: "Materi Baru dari Guru",
          body: `Gurumu mengirim materi: "${materi.title}"`,
          type: "INFO",
          data: { link: "/arena/materi", materiId },
        })),
      });
    }

    return NextResponse.json({ success: true, terkirim: groups.length, murid: memberIds.length });
  } catch (error) {
    console.error("POST /api/guru/materi/[id]/kirim error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
