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

    const body = await req.json();
    const { soalIds, points } = body;

    if (!soalIds || !Array.isArray(soalIds) || soalIds.length === 0) {
      return NextResponse.json({ error: "soalIds array required" }, { status: 400 });
    }

    const maxOrder = await db.quizQuestion.aggregate({
      where: { quizId: id },
      _max: { orderIndex: true },
    });

    const baseIndex = (maxOrder._max.orderIndex || 0) + 1;

    const created = await db.quizQuestion.createMany({
      data: soalIds.map((sid: string, i: number) => ({
        quizId: id,
        sourceType: "SOAL",
        sourceId: sid,
        points: points || 1,
        orderIndex: baseIndex + i,
      })),
    });

    return NextResponse.json({ added: created.count });
  } catch (error) {
    console.error("POST /api/guru/quiz/[id]/questions/bulk error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
