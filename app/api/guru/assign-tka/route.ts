import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user || user.role !== "GURU") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { paketId, groupId } = await req.json();
    if (!paketId || !groupId) return NextResponse.json({ error: "Paket dan kelas diperlukan" }, { status: 400 });

    // Verify the group belongs to this teacher
    const group = await db.group.findUnique({ where: { id: groupId, teacherId: user.id } });
    if (!group) return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });

    // Get paket info
    const paket = await db.paketKompetensi.findUnique({ where: { id: paketId }, select: { title: true } });
    if (!paket) return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 404 });

    // Create GroupQuiz assignment
    const quiz = await db.groupQuiz.create({
      data: { groupId, quizId: paketId, title: paket.title },
    });

    // Create GroupQuizResult for each student
    const members = await db.groupMember.findMany({ where: { groupId }, select: { userId: true } });
    for (const m of members) {
      await db.groupQuizResult.create({
        data: { groupQuizId: quiz.id, userId: m.userId, status: "ASSIGNED" },
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, assignedTo: members.length, quizId: quiz.id });
  } catch { return NextResponse.json({ error: "Gagal assign" }, { status: 500 }); }
}
