import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

const UKBI_TYPES = ["UKBI", "UKBI_SIMULASI", "UKBI_LATIHAN", "UKBI_SD", "UKBI_LATIHAN_SD", "UKBI_SMP", "UKBI_LATIHAN_SMP", "UKBI_SMA", "UKBI_LATIHAN_SMA", "UKBI_GURU_SIMULASI", "UKBI_GURU_LATIHAN"];

function isUKBI(type: string) {
  return UKBI_TYPES.includes(type);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paketId: string }> }
) {
  try {
    const { paketId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const paket = await db.paketKompetensi.findUnique({ where: { id: paketId } });
    if (!paket) {
      return NextResponse.json({ error: "Paket tidak ditemukan" }, { status: 404 });
    }

    let session = await db.testSession.findUnique({
      where: { userId_paketId: { userId: dbUser.id, paketId } },
    });

    if (!session) {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + paket.duration);

      session = await db.testSession.create({
        data: {
          userId: dbUser.id,
          paketId,
          status: "IN_PROGRESS",
          expiresAt,
          startedAt: new Date(),
          answers: {},
          flagged: [],
        },
      });
    } else if (session.status === "COMPLETED") {
      return NextResponse.json({
        error: "Tes sudah selesai",
        session,
        message: "Anda sudah menyelesaikan tes ini",
      }, { status: 400 });
    }

    const sections = (paket.sectionsData as any[]) || (paket.sections as any[]) || [];
    const questions: any[] = [];

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      let sectionQuestions: any[] = [];

      if (section.questionIds && section.questionIds.length > 0) {
        if (isUKBI(paket.type)) {
          const fetched = await db.uKBIQuestion.findMany({
            where: { id: { in: section.questionIds }, isActive: true },
            select: { id: true, seksi: true, text: true, audioUrl: true, imageUrl: true, passage: true, type: true, options: true, difficulty: true, cognitive: true, domain: true, passageType: true, wordCount: true },
          });
          sectionQuestions.push(...fetched);
        } else {
          const fetched = await db.tKAQuestion.findMany({
            where: { id: { in: section.questionIds }, isActive: true },
            select: { id: true, kompetensi: true, subKompetensi: true, text: true, passage: true, type: true, options: true, difficulty: true, weight: true },
          });
          sectionQuestions.push(...fetched);
        }
      }

      if (sectionQuestions.length === 0 && section.count && section.count > 0) {
        if (isUKBI(paket.type)) {
          const where: any = { isActive: true };
          if (section.seksi) where.seksi = section.seksi;
          if (paket.type.includes("SD")) where.tingkat = "SD";
          else if (paket.type.includes("SMP")) where.tingkat = "SMP";
          else if (paket.type.includes("SMA")) where.tingkat = "SMA";
          else if (paket.type.includes("GURU")) {
            const guruFetched = await db.uKBIQuestion.findMany({
              where: { ...where, tingkat: "GURU" },
              take: section.count,
              orderBy: { difficulty: "asc" },
              select: { id: true, seksi: true, text: true, audioUrl: true, imageUrl: true, passage: true, type: true, options: true, difficulty: true, cognitive: true, domain: true, passageType: true, wordCount: true },
            });
            if (guruFetched.length > 0) {
              sectionQuestions.push(...guruFetched);
            } else {
              const fallback = await db.uKBIQuestion.findMany({
                where,
                take: section.count,
                orderBy: { difficulty: "asc" },
                select: { id: true, seksi: true, text: true, audioUrl: true, imageUrl: true, passage: true, type: true, options: true, difficulty: true, cognitive: true, domain: true, passageType: true, wordCount: true },
              });
              sectionQuestions.push(...fallback);
            }
          } else {
            const fetched = await db.uKBIQuestion.findMany({
              where,
              take: section.count,
              orderBy: { difficulty: "asc" },
              select: { id: true, seksi: true, text: true, audioUrl: true, imageUrl: true, passage: true, type: true, options: true, difficulty: true, cognitive: true, domain: true, passageType: true, wordCount: true },
            });
            sectionQuestions.push(...fetched);
          }
        } else {
          const where: any = { isActive: true };
          if (section.kompetensi) where.kompetensi = section.kompetensi;
          if (section.subKompetensi) where.subKompetensi = section.subKompetensi;
          if (paket.type.includes("SD")) where.tingkat = "SD";
          else if (paket.type.includes("SMP")) where.tingkat = "SMP";
          else if (paket.type.includes("SMA")) where.tingkat = "SMA";
          else if (paket.type.includes("GURU")) {
            const guruFetched = await db.tKAQuestion.findMany({
              where: { ...where, tingkat: "GURU" },
              take: section.count,
              orderBy: { difficulty: "asc" },
              select: { id: true, kompetensi: true, subKompetensi: true, text: true, passage: true, type: true, options: true, difficulty: true, weight: true },
            });
            if (guruFetched.length > 0) {
              sectionQuestions.push(...guruFetched);
            } else {
              const fallback = await db.tKAQuestion.findMany({
                where,
                take: section.count,
                orderBy: { difficulty: "asc" },
                select: { id: true, kompetensi: true, subKompetensi: true, text: true, passage: true, type: true, options: true, difficulty: true, weight: true },
              });
              sectionQuestions.push(...fallback);
            }
          } else {
            const fetched = await db.tKAQuestion.findMany({
              where,
              take: section.count,
              orderBy: { difficulty: "asc" },
              select: { id: true, kompetensi: true, subKompetensi: true, text: true, passage: true, type: true, options: true, difficulty: true, weight: true },
            });
            sectionQuestions.push(...fetched);
          }
        }
      }

      if (sectionQuestions.length === 0 && section.count && section.count > 0 && !paket.type.includes("GURU")) {
        if (isUKBI(paket.type)) {
          const fallback = await db.uKBIQuestion.findMany({
            where: { isActive: true },
            take: section.count,
            orderBy: { difficulty: "asc" },
            select: { id: true, seksi: true, text: true, audioUrl: true, imageUrl: true, passage: true, type: true, options: true, difficulty: true, cognitive: true, domain: true, passageType: true, wordCount: true },
          });
          sectionQuestions.push(...fallback);
        } else {
          const fallback = await db.tKAQuestion.findMany({
            where: { isActive: true },
            take: section.count,
            orderBy: { difficulty: "asc" },
            select: { id: true, kompetensi: true, subKompetensi: true, text: true, passage: true, type: true, options: true, difficulty: true, weight: true },
          });
          sectionQuestions.push(...fallback);
        }
      }

      questions.push({
        sectionIndex: i,
        sectionName: section.name,
        seksi: section.seksi,
        timeLimit: section.timeLimit,
        questions: sectionQuestions,
      });
    }

    const totalQuestions = questions.reduce((sum, s) => sum + s.questions.length, 0);
    if (totalQuestions === 0) {
      return NextResponse.json({
        error: "Tidak ada soal tersedia",
        message: `Paket "${paket.title}" belum memiliki soal. Total sections: ${sections.length}`,
        debug: { sections: sections.map(s => ({ name: s.name, count: s.count, seksi: s.seksi })) },
      }, { status: 404 });
    }

    const answers = session.answers as Record<string, string>;

    return NextResponse.json({
      session: {
        id: session.id,
        status: session.status,
        startedAt: session.startedAt,
        expiresAt: session.expiresAt,
        currentSection: session.currentSection,
        currentQuestion: session.currentQuestion,
        answers,
        flagged: session.flagged,
      },
      paket: {
        id: paket.id,
        title: paket.title,
        description: paket.description,
        type: paket.type,
        mode: paket.mode,
        duration: paket.duration,
        passingScore: paket.passingScore,
        passingGrade: paket.passingGrade,
      },
      questions,
    });
  } catch (error: any) {
    console.error("GET /api/kompetensi/[paketId] error:", error);
    return NextResponse.json({ error: "Internal error", message: error?.message }, { status: 500 });
  }
}
