import { NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getUser();
  if (!teacher) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (teacher.role !== "GURU" && !teacher.isFounder) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: studentId } = await params;

  const isMyStudent = await db.groupMember.findFirst({
    where: { userId: studentId, group: { teacherId: teacher.id } },
    select: { id: true },
  });
  if (!isMyStudent && !teacher.isFounder) {
    return NextResponse.json({ error: "Murid ini bukan bagian dari kelasmu" }, { status: 403 });
  }

  const [student, history] = await Promise.all([
    db.user.findUnique({ where: { id: studentId }, select: { fullName: true, nickname: true } }),
    db.nicknameHistory.findMany({ where: { userId: studentId }, orderBy: { changedAt: "desc" }, take: 50 }),
  ]);

  if (!student) return NextResponse.json({ error: "Murid tidak ditemukan" }, { status: 404 });

  return NextResponse.json({ fullName: student.fullName, nickname: student.nickname, history });
}
