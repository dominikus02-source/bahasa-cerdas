import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent, getTeacherGroups } from "@/lib/teacher/students";

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
    if (!dbUser || !isTeacherOrStudent(dbUser)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const target = await db.user.findUnique({
      where: { id },
      select: { id: true, role: true, groupMemberships: { select: { groupId: true } } },
    });
    if (!target || target.role !== "MURID") {
      return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 });
    }

    const ownedGroups = await getTeacherGroups(dbUser.id, null);
    const ownedIds = new Set(ownedGroups.map(g => g.id));
    const inOwnClass = target.groupMemberships.some(m => ownedIds.has(m.groupId));
    if (!inOwnClass) {
      return NextResponse.json({ error: "Siswa ini tidak ada di kelasmu" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    // Case 1: Per-class attendance number via GroupMember
    if (typeof body.groupId === "string" && typeof body.attendanceNumber === "string") {
      // Validate groupId belongs to this teacher
      const group = await db.group.findFirst({
        where: { id: body.groupId, teacherId: dbUser.id, isActive: true },
      });
      if (!group) {
        return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
      }
      // Verify student is member of this group
      const membership = await db.groupMember.findUnique({
        where: { groupId_userId: { groupId: body.groupId, userId: id } },
      });
      if (!membership) {
        return NextResponse.json({ error: "Siswa bukan anggota kelas ini" }, { status: 403 });
      }
      const value = body.attendanceNumber.trim() || null;
      await db.groupMember.update({
        where: { id: membership.id },
        data: { attendanceNumber: value },
      });
      return NextResponse.json({ success: true });
    }

    // Case 2: Legacy profile fields (noAbsen, nisn)
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
