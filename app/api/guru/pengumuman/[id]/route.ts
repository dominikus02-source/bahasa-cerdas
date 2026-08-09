import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";
import { isTeacherOrStudent } from "@/lib/teacher/students";

type Params = { params: Promise<{ id: string }> };

// GET /api/guru/pengumuman/[id] — detail + daftar pengumpulan murid.
export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await getUser();
    if (!user || !isTeacherOrStudent(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const pengumuman = await db.pengumuman.findFirst({
      where: { id, teacherId: user.id },
      include: {
        group: { select: { id: true, name: true, grade: true } },
        submissions: {
          include: { user: { select: { id: true, fullName: true, avatar: true } } },
          orderBy: { submittedAt: "desc" },
        },
      },
    });
    if (!pengumuman) {
      return NextResponse.json({ error: "Pengumuman tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ pengumuman });
  } catch (error) {
    console.error("GET /api/guru/pengumuman/[id] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// PATCH /api/guru/pengumuman/[id] — ubah judul/deskripsi/tenggat atau sematkan
// (pin) pengumuman di papan kelas.
export async function PATCH(req: Request, { params }: Params) {
  try {
    const user = await getUser();
    if (!user || !isTeacherOrStudent(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const existing = await db.pengumuman.findFirst({
      where: { id, teacherId: user.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Pengumuman tidak ditemukan" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));
    const data: any = {};
    if (typeof body.judul === "string" && body.judul.trim()) data.judul = body.judul.trim();
    if (typeof body.deskripsi === "string") data.deskripsi = body.deskripsi.trim() || null;
    if (typeof body.pinned === "boolean") data.pinned = body.pinned;
    if (body.tenggat === null || body.tenggat === "") {
      data.tenggat = null;
    } else if (typeof body.tenggat === "string" && body.tenggat) {
      const t = new Date(body.tenggat);
      if (!Number.isNaN(t.getTime())) data.tenggat = t;
    }

    const pengumuman = await db.pengumuman.update({ where: { id }, data });
    return NextResponse.json({ success: true, pengumuman });
  } catch (error) {
    console.error("PATCH /api/guru/pengumuman/[id] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// DELETE /api/guru/pengumuman/[id] — hapus pengumuman (cascade ke submissions).
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getUser();
    if (!user || !isTeacherOrStudent(user)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const existing = await db.pengumuman.findFirst({
      where: { id, teacherId: user.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Pengumuman tidak ditemukan" }, { status: 404 });
    }

    await db.pengumuman.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/guru/pengumuman/[id] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
