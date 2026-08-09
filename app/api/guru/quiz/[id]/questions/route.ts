import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent } from "@/lib/teacher/students";

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
    if (!dbUser || !isTeacherOrStudent(dbUser)) return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const quiz = await db.quiz.findUnique({ where: { id } });
    if (!quiz || quiz.creatorId !== dbUser.id) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const body = await req.json();
    const { sourceType, sourceId, customText, customType, customOptions, customAnswer, customExplanation, points, orderIndex } = body;

    if (!sourceType && !customText) {
      return NextResponse.json({ error: "sourceType or customText required" }, { status: 400 });
    }

    const maxOrder = await db.quizQuestion.aggregate({
      where: { quizId: id },
      _max: { orderIndex: true },
    });

    const question = await db.quizQuestion.create({
      data: {
        quizId: id,
        sourceType: sourceType || "CUSTOM",
        sourceId: sourceId || "",
        customText: customText || null,
        customType: customType || null,
        customOptions: customOptions || null,
        customAnswer: customAnswer || null,
        customExplanation: customExplanation || null,
        points: points || 1,
        orderIndex: orderIndex !== undefined ? orderIndex : (maxOrder._max.orderIndex || 0) + 1,
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error("POST /api/guru/quiz/[id]/questions error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
