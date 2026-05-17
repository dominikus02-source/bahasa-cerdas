import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const quiz = await db.quiz.findUnique({ where: { id } });
    if (!quiz || quiz.creatorId !== dbUser.id) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const questionCount = await db.quizQuestion.count({ where: { quizId: id } });
    if (questionCount === 0) {
      return NextResponse.json({ error: "Quiz harus memiliki minimal 1 soal" }, { status: 400 });
    }

    const updated = await db.quiz.update({
      where: { id },
      data: { status: "PUBLISHED" },
    });

    return NextResponse.json({ quiz: updated });
  } catch (error) {
    console.error("POST /api/guru/quiz/[id]/publish error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
