import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { isTeacherOrStudent, getTeacherGroups } from "@/lib/teacher/students";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser || !isTeacherOrStudent(dbUser)) return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const groups = (await getTeacherGroups(dbUser.id, null)).map((g) => ({
      id: g.id,
      name: g.name,
      grade: g.grade,
      description: g.description,
      memberCount: g.memberCount,
    }));

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
    if (!dbUser || !isTeacherOrStudent(dbUser)) return NextResponse.json({ error: "Guru only" }, { status: 403 });

    const { paketId, groupId, dueDate, title } = await req.json();
    if (!paketId || !groupId) {
      return NextResponse.json({ error: "paketId dan groupId wajib" }, { status: 400 });
    }

    // Ambil paket
    const paket = await db.paketKompetensi.findUnique({ where: { id: paketId } });
    if (!paket) return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 404 });

    const paketType = paket.type?.toUpperCase() ?? "";
    if (!paketType) return NextResponse.json({ error: "Paket tidak memiliki tipe valid" }, { status: 400 });
    const isUKBI = paketType.includes("UKBI");

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
        if (isUKBI) {
          const where: any = { isActive: true };
          if (section.seksi) where.seksi = section.seksi;
          if (paketType.includes("SMP") || paketType.includes("LATIHAN_SMP")) where.tingkat = "SMP";
          else if (paketType.includes("SMA") || paketType.includes("LATIHAN_SMA")) where.tingkat = "SMA";
          else if (paketType.includes("SD") || paketType.includes("LATIHAN_SD")) where.tingkat = "SD";
          const qs = await db.uKBIQuestion.findMany({ where, take: section.count, select: { id: true } });
          questionIds.push(...qs.map(q => q.id));
        } else {
          const where: any = { isActive: true };
          if (section.kompetensi) where.kompetensi = section.kompetensi;
          if (paketType.includes("SMP") || paketType.includes("LATIHAN_SMP")) where.tingkat = "SMP";
          else if (paketType.includes("SMA") || paketType.includes("LATIHAN_SMA")) where.tingkat = "SMA";
          else if (paketType.includes("SD") || paketType.includes("LATIHAN_SD")) where.tingkat = "SD";
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
            sourceType: isUKBI ? "UKBIQuestion" : "TKAQuestion",
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
