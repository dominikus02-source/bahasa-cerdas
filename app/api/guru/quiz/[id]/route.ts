import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const quiz = await db.quiz.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, fullName: true, avatar: true } },
        questions: { orderBy: { orderIndex: "asc" } },
        assignments: {
          include: {
            group: { select: { id: true, name: true, accessCode: true, grade: true } },
            _count: { select: { submissions: true } },
          },
        },
        _count: { select: { questions: true, assignments: true } },
      },
    });

    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    if (quiz.creatorId !== dbUser.id && !dbUser.isFounder) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const soalIds = quiz.questions.filter(q => q.sourceType === "SOAL").map(q => q.sourceId);
    const soals = soalIds.length > 0 ? await db.soal.findMany({ where: { id: { in: soalIds } } }) : [];
    const soalMap = new Map(soals.map(s => [s.id, s]));

    const questionsWithSoal = quiz.questions.map(q => ({
      ...q,
      soal: q.sourceType === "SOAL" ? soalMap.get(q.sourceId) || null : null,
    }));

    return NextResponse.json({ quiz: { ...quiz, questions: questionsWithSoal } });
  } catch (error) {
    console.error("GET /api/guru/quiz/[id] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(
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

    const existing = await db.quiz.findUnique({ where: { id } });
    if (!existing || existing.creatorId !== dbUser.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, type, kelas, subject, topik, KD, difficulty, timeLimit, shuffleQuestions, shuffleOptions, showResults, showCorrectAnswer, passingScore, maxAttempts, randomizeFromPool, poolSize, status } = body;

    const quiz = await db.quiz.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(kelas !== undefined && { kelas }),
        ...(subject !== undefined && { subject }),
        ...(topik !== undefined && { topik }),
        ...(KD !== undefined && { KD }),
        ...(difficulty !== undefined && { difficulty }),
        ...(timeLimit !== undefined && { timeLimit }),
        ...(shuffleQuestions !== undefined && { shuffleQuestions }),
        ...(shuffleOptions !== undefined && { shuffleOptions }),
        ...(showResults !== undefined && { showResults }),
        ...(showCorrectAnswer !== undefined && { showCorrectAnswer }),
        ...(passingScore !== undefined && { passingScore }),
        ...(maxAttempts !== undefined && { maxAttempts }),
        ...(randomizeFromPool !== undefined && { randomizeFromPool }),
        ...(poolSize !== undefined && { poolSize }),
        ...(status !== undefined && { status }),
      },
    });

    return NextResponse.json({ quiz });
  } catch (error) {
    console.error("PUT /api/guru/quiz/[id] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(
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

    const existing = await db.quiz.findUnique({ where: { id } });
    if (!existing || existing.creatorId !== dbUser.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.quiz.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/guru/quiz/[id] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
