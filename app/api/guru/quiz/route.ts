import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const kelas = searchParams.get("kelas");

    const where: any = { creatorId: dbUser.id };
    if (status) where.status = status;
    if (type) where.type = type;
    if (kelas) where.kelas = kelas;

    const quizzes = await db.quiz.findMany({
      where,
      include: {
        questions: { orderBy: { orderIndex: "asc" } },
        assignments: {
          include: {
            group: { select: { id: true, name: true, accessCode: true } },
            _count: { select: { submissions: true } },
          },
        },
        _count: { select: { questions: true, assignments: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });

    return NextResponse.json({ quizzes });
  } catch (error) {
    console.error("GET /api/guru/quiz error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || dbUser.role !== "GURU") return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const body = await req.json();
    const { title, description, type, kelas, subject, topik, KD, difficulty, timeLimit, shuffleQuestions, shuffleOptions, showResults, showCorrectAnswer, passingScore, maxAttempts, randomizeFromPool, poolSize } = body;

    if (!title || !kelas) {
      return NextResponse.json({ error: "Judul dan kelas diperlukan" }, { status: 400 });
    }

    const quiz = await db.quiz.create({
      data: {
        title,
        description: description || null,
        type: type || "LATIHAN",
        kelas,
        subject: subject || "Bahasa Indonesia",
        topik: topik || null,
        KD: KD || null,
        difficulty: difficulty || "MEDIUM",
        timeLimit: timeLimit || null,
        shuffleQuestions: shuffleQuestions || false,
        shuffleOptions: shuffleOptions || false,
        showResults: showResults !== false,
        showCorrectAnswer: showCorrectAnswer !== false,
        passingScore: passingScore || null,
        maxAttempts: maxAttempts || 1,
        randomizeFromPool: randomizeFromPool || false,
        poolSize: poolSize || null,
        creatorId: dbUser.id,
      },
    });

    return NextResponse.json({ quiz }, { status: 201 });
  } catch (error) {
    console.error("POST /api/guru/quiz error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
