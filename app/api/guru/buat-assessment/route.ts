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

    const groups = await db.group.findMany({
      where: { teacherId: dbUser.id, isActive: true },
      select: {
        id: true,
        name: true,
        grade: true,
        description: true,
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("GET /api/guru/buat-assessment error:", error);
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

    const { paketId, groupId, dueDate, title } = await req.json();
    if (!paketId || !groupId) {
      return NextResponse.json({ error: "paketId dan groupId wajib" }, { status: 400 });
    }

    // Ambil paket
    const paket = await db.paketKompetensi.findUnique({ where: { id: paketId } });
    if (!paket) return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 404 });

    // Ambil group
    const group = await db.group.findUnique({ where: { id: groupId } });
    if (!group || group.teacherId !== dbUser.id) {
      return NextResponse.json({ error: "Kelas tidak ditemukan" }, { status: 404 });
    }

    // Ambil soal dari paket berdasarkan sections
    const sections = (paket.sectionsData || paket.sections || []) as any[];
    let questionIds: string[] = [];

    for (const section of sections) {
      if (section.questionIds && section.questionIds.length > 0) {
        questionIds.push(...section.questionIds);
      } else if (section.count && section.count > 0) {
        const isUKBI = paket.type.includes("UKBI");
        const where: any = { isActive: true };
        if (section.seksi) where.seksi = section.seksi;
        if (section.kompetensi) where.kompetensi = section.kompetensi;
        if (paket.type.includes("SMP") || paket.type.includes("LATIHAN_SMP")) where.tingkat = "SMP";
        else if (paket.type.includes("SMA") || paket.type.includes("LATIHAN_SMA")) where.tingkat = "SMA";
        else if (paket.type.includes("SD") || paket.type.includes("LATIHAN_SD")) where.tingkat = "SD";

        if (isUKBI) {
          const qs = await db.uKBIQuestion.findMany({ where, take: section.count, select: { id: true } });
          questionIds.push(...qs.map(q => q.id));
        } else {
          const qs = await db.tKAQuestion.findMany({ where, take: section.count, select: { id: true } });
          questionIds.push(...qs.map(q => q.id));
        }
      }
    }

    if (questionIds.length === 0) {
      return NextResponse.json({ error: "Tidak ada soal dalam paket ini" }, { status: 400 });
    }

    // Buat Quiz
    const quiz = await db.quiz.create({
      data: {
        title: title || `Tugas: ${paket.title}`,
        description: paket.description,
        type: "LATIHAN",
        status: "PUBLISHED",
        timeLimit: paket.duration,
        shuffleQuestions: true,
        shuffleOptions: true,
        showResults: true,
        showCorrectAnswer: true,
        passingScore: paket.passingScore || 0,
        kelas: group.grade,
        subject: "Bahasa Indonesia",
        topik: paket.title,
        difficulty: "MEDIUM",
        creatorId: dbUser.id,
        questions: {
          create: questionIds.map((qId, idx) => ({
            sourceType: paket.type.includes("UKBI") ? "UKBIQuestion" : "TKAQuestion",
            sourceId: qId,
            orderIndex: idx,
            points: 1,
          })),
        },
      },
    });

    // Buat assignment ke group
    const assignment = await db.quizAssignment.create({
      data: {
        quizId: quiz.id,
        groupId: group.id,
        dueDate: dueDate ? new Date(dueDate) : null,
        isPublished: true,
      },
    });

    return NextResponse.json({
      success: true,
      quiz: { id: quiz.id, title: quiz.title },
      assignment: { id: assignment.id },
      totalQuestions: questionIds.length,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/guru/buat-assessment error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
