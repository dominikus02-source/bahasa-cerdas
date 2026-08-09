import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || !isTeacherOrStudent(user)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { paketId, groupId } = await req.json();
    if (!paketId || !groupId) return NextResponse.json({ error: "Paket dan kelas diperlukan" }, { status: 400 });

    // Verify the group belongs to this teacher
    const group = await db.group.findUnique({ where: { id: groupId, teacherId: user.id } });
    if (!group) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });

    // Get paket info
    const paket = await db.paketKompetensi.findUnique({ where: { id: paketId }, select: { title: true } });
    if (!paket) return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 404 });

    // Prevent duplicate assignment to the same group
    const existing = await db.groupQuiz.findFirst({ where: { groupId, quizId: paketId }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "Paket ini sudah ditugaskan ke kelas tersebut" }, { status: 409 });

    // Create GroupQuiz assignment + results for each student (atomic)
    const members = await db.groupMember.findMany({ where: { groupId }, select: { userId: true } });
    const { quiz } = await db.$transaction(async (tx) => {
      const created = await tx.groupQuiz.create({
        data: { groupId, quizId: paketId, title: paket.title },
      });
      if (members.length > 0) {
        await tx.groupQuizResult.createMany({
          data: members.map(m => ({ groupQuizId: created.id, userId: m.userId, status: "ASSIGNED" })),
        });
      }
      return { quiz: created };
    });

    return NextResponse.json({ success: true, assignedTo: members.length, quizId: quiz.id });
  } catch { return NextResponse.json({ error: "Gagal assign" }, { status: 500 }); }
}
