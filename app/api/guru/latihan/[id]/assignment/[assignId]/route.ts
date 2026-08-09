import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";

// Hapus satu kiriman latihan (QuizAssignment) ke kelas — guru pemilik latihan
// saja. Jawaban murid yang sudah dikerjakan ikut terhapus (cascade).
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; assignId: string }> }
) {
  try {
    const { id, assignId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || !isTeacherOrStudent(dbUser)) {
      return NextResponse.json({ error: "Guru only" }, { status: 403 });
    }

    const quiz = await db.quiz.findUnique({ where: { id, creatorId: dbUser.id, type: "LATIHAN" } });
    if (!quiz) return NextResponse.json({ error: "Latihan not found" }, { status: 404 });

    const assignment = await db.quizAssignment.findUnique({ where: { id: assignId } });
    if (!assignment || assignment.quizId !== id) {
      return NextResponse.json({ error: "Kiriman tidak ditemukan" }, { status: 404 });
    }

    const submissions = await db.quizSubmission.findMany({
      where: { assignmentId: assignId },
      select: { id: true },
    });
    const submissionIds = submissions.map(s => s.id);
    if (submissionIds.length > 0) {
      await db.quizAnswer.deleteMany({ where: { submissionId: { in: submissionIds } } });
      await db.quizSubmission.deleteMany({ where: { id: { in: submissionIds } } });
    }
    await db.quizAssignment.delete({ where: { id: assignId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/guru/latihan/[id]/assignment/[assignId] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
