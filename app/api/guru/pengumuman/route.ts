import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";

const isTeacher = (user: { role: string; isFounder?: boolean }) =>
  user.role === "GURU" || user.role === "ADMIN" || !!user.isFounder;

// GET /api/guru/pengumuman?groupId=xxx
// Daftar pengumuman guru untuk satu kelas + jumlah murid & yang sudah kumpul.
export async function GET(req: Request) {
  try {
    const user = await getUser();
    if (!user || !isTeacher(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get("groupId");
    if (!groupId) {
      return NextResponse.json({ error: "Pilih kelas terlebih dahulu" }, { status: 400 });
    }

    const group = await db.group.findFirst({
      where: { id: groupId, teacherId: user.id },
      include: {
        _count: { select: { members: true } },
        pengumumans: {
          orderBy: { createdAt: "desc" },
          include: { _count: { select: { submissions: true } } },
        },
      },
    });
    if (!group) {
      return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ group });
  } catch (error) {
    console.error("GET /api/guru/pengumuman error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// POST /api/guru/pengumuman — buat pengumuman baru lalu beri tahu murid kelas.
export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user || !isTeacher(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const groupId = typeof body.groupId === "string" ? body.groupId.trim() : "";
    const judul = typeof body.judul === "string" ? body.judul.trim() : "";
    const deskripsi = typeof body.deskripsi === "string" ? body.deskripsi.trim() : "";
    const lampiran = typeof body.lampiran === "string" ? body.lampiran.trim() : "";
    const lampiranNama = typeof body.lampiranNama === "string" ? body.lampiranNama.trim() : "";
    const tenggat = typeof body.tenggat === "string" && body.tenggat ? new Date(body.tenggat) : null;

    if (!groupId) return NextResponse.json({ error: "Pilih kelas" }, { status: 400 });
    if (!judul) return NextResponse.json({ error: "Judul wajib diisi" }, { status: 400 });
    if (tenggat && Number.isNaN(tenggat.getTime())) {
      return NextResponse.json({ error: "Tanggal tenggat tidak valid" }, { status: 400 });
    }

    const group = await db.group.findFirst({
      where: { id: groupId, teacherId: user.id },
      include: { members: { select: { userId: true } } },
    });
    if (!group) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });

    const pengumuman = await db.pengumuman.create({
      data: {
        groupId,
        teacherId: user.id,
        judul,
        deskripsi: deskripsi || null,
        tenggat,
        lampiran: lampiran || null,
        lampiranNama: lampiranNama || null,
      },
    });

    const memberIds = group.members.map((m) => m.userId);
    if (memberIds.length > 0) {
      await db.notifikasi.createMany({
        data: memberIds.map((userId) => ({
          userId,
          title: "Pengumuman Baru",
          body: `Guru mengirim pengumuman: "${judul}"`,
          type: "INFO",
          data: { link: "/murid/pengumuman", pengumumanId: pengumuman.id },
        })),
      });
    }

    return NextResponse.json({ success: true, pengumuman, murid: memberIds.length });
  } catch (error) {
    console.error("POST /api/guru/pengumuman error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
