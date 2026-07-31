import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/supabase/server";

const isTeacher = (user: { role: string; isFounder?: boolean }) =>
  user.role === "GURU" || user.role === "ADMIN" || !!user.isFounder;

type Params = { params: Promise<{ id: string }> };

// GET /api/guru/pengumuman/[id] — detail + daftar pengumpulan murid.
export async function GET(_req: Request, { params }: Params) {
  try {
    const user = await getUser();
    if (!user || !isTeacher(user)) {
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

// DELETE /api/guru/pengumuman/[id] — hapus pengumuman (cascade ke submissions).
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const user = await getUser();
    if (!user || !isTeacher(user)) {
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
