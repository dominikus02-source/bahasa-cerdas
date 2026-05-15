import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

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

    const sections = paket.sectionsData as any[] || [];
    const questions: any[] = [];

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const sectionQuestions: any[] = [];

      if (section.questionIds && section.questionIds.length > 0) {
        if (paket.type === "UKBI" || paket.type === "UKBI_SIMULASI" || paket.type === "UKBI_LATIHAN") {
          const fetched = await db.uKBIQuestion.findMany({
            where: {
              id: { in: section.questionIds },
              isActive: true,
            },
            select: {
              id: true,
              seksi: true,
              text: true,
              audioUrl: true,
              imageUrl: true,
              passage: true,
              type: true,
              options: true,
              difficulty: true,
              cognitive: true,
              domain: true,
              passageType: true,
              wordCount: true,
            },
          });
          sectionQuestions.push(...fetched);
        } else {
          const fetched = await db.tKAQuestion.findMany({
            where: {
              id: { in: section.questionIds },
              isActive: true,
            },
            select: {
              id: true,
              kompetensi: true,
              subKompetensi: true,
              text: true,
              passage: true,
              type: true,
              options: true,
              difficulty: true,
              weight: true,
            },
          });
          sectionQuestions.push(...fetched);
        }
      } else if (section.count && section.count > 0) {
        if (paket.type === "UKBI" || paket.type === "UKBI_SIMULASI" || paket.type === "UKBI_LATIHAN") {
          const fetched = await db.uKBIQuestion.findMany({
            where: {
              seksi: section.seksi as any,
              isActive: true,
            },
            take: section.count,
            orderBy: { difficulty: "asc" },
            select: {
              id: true,
              seksi: true,
              text: true,
              audioUrl: true,
              imageUrl: true,
              passage: true,
              type: true,
              options: true,
              difficulty: true,
              cognitive: true,
              domain: true,
              passageType: true,
              wordCount: true,
            },
          });
          sectionQuestions.push(...fetched);
        } else {
          const where: any = { isActive: true };
          if (section.kompetensi) where.kompetensi = section.kompetensi as any;
          if (section.subKompetensi) where.subKompetensi = section.subKompetensi;
          const fetched = await db.tKAQuestion.findMany({
            where,
            take: section.count,
            orderBy: { difficulty: "asc" },
            select: {
              id: true,
              kompetensi: true,
              subKompetensi: true,
              text: true,
              passage: true,
              type: true,
              options: true,
              difficulty: true,
              weight: true,
            },
          });
          sectionQuestions.push(...fetched);
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
  } catch (error) {
    console.error("GET /api/kompetensi/[paketId] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}