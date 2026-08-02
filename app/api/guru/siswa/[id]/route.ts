import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

// Guru memperbarui data siswa (no. absensi / NISN) — hanya untuk siswa yang
// terdaftar di kelas milik guru tersebut.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const target = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true, groupMemberships: { select: { groupId: true } } },
    });
    if (!target || target.role !== "MURID") {
      return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    }

    const ownedGroups = await db.group.findMany({
      where: { teacherId: dbUser.id },
      select: { id: true },
    });
    const ownedIds = new Set(ownedGroups.map(g => g.id));
    const inOwnClass = target.groupMemberships.some(m => ownedIds.has(m.groupId));
    if (!inOwnClass) {
      return NextResponse.json({ error: "Siswa ini tidak ada di kelasmu" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const data: Record<string, any> = {};
    if (typeof body.noAbsen === "string") data.noAbsen = body.noAbsen.trim() || null;
    if (typeof body.nisn === "string") data.nisn = body.nisn.trim() || null;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada data yang diubah" }, { status: 400 });
    }

    const existing = await db.profile.findUnique({ where: { userId: id } });
    if (existing) {
      await db.profile.update({ where: { userId: id }, data });
    } else {
      await db.profile.create({ data: { userId: id, ...data } });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
