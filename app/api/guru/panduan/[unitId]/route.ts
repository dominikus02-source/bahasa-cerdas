import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"
import { getChapterById, allGrades } from "@/data/buku-panduan"

function buildKontenFromGuide(chapter: NonNullable<ReturnType<typeof getChapterById>>, grade: string): string {
  const content = {
    belajar: {
      tujuan: chapter.learningGoals,
      materi: [
        {
          judul: chapter.shortTitle || chapter.title,
          isi: [
            chapter.teachingContent?.textNature?.definition || "",
            ...(chapter.teachingContent?.textNature?.characteristics?.map((c: string) => `• ${c}`) || []),
            "",
            chapter.teachingContent?.contentComposition?.partRelationships || "",
            ...(chapter.teachingContent?.contentComposition?.infoPoints?.map((p: string) => `• ${p}`) || []),
          ],
          contoh: chapter.exampleText?.content ? [chapter.exampleText.content] : [],
          catatan: `Kelas ${grade} ${chapter.phase === "A" ? "Fase A (Literasi Awal)" : chapter.phase === "B" ? "Fase B" : "Fase C"} — ${chapter.suggestedDuration || ""}`,
        },
      ],
      rangkuman: chapter.learningGoals?.slice(0, 3) || [],
    },
    latihan: (chapter.readingPractice?.questions || []).map((q, i) => ({
      id: i + 1,
      tipe: q.type === "pilihan_ganda" ? "PG" as const : q.type === "jawaban_singkat" ? "ISIAN" as const : "ISIAN" as const,
      soal: q.questionText,
      opsi: q.options || [],
      jawaban: q.type === "pilihan_ganda" && q.options
        ? q.options.indexOf(q.correctAnswer as string)
        : (q.correctAnswer as string),
      penjelasan: q.explanation,
    })),
    readingPractice: chapter.readingPractice || undefined,
    quickQuiz: chapter.quickQuiz || undefined,
    kuis: (chapter.quickQuiz?.questions || []).map((q, i) => ({
      id: i + 1,
      tipe: q.type === "pilihan_ganda" ? "PG" as const : q.type === "jawaban_singkat" ? "ISIAN" as const : "ISIAN" as const,
      soal: q.questionText,
      opsi: q.options || [],
      jawaban: q.type === "pilihan_ganda" && q.options
        ? q.options.indexOf(q.correctAnswer as string)
        : (q.correctAnswer as string),
      penjelasan: q.explanation,
    })),
    guide: {
      overview: chapter.overview,
      learningGoals: chapter.learningGoals,
      keywords: chapter.keywords,
      suggestedDuration: chapter.suggestedDuration,
      teachingContent: chapter.teachingContent,
      exampleText: chapter.exampleText,
      learningActivities: chapter.learningActivities,
      worksheet: chapter.worksheet,
      readingPractice: chapter.readingPractice ? {
        stimulusTitle: chapter.readingPractice.stimulusTitle,
        stimulusText: chapter.readingPractice.stimulusText,
        multipleChoice: chapter.readingPractice.questions
          .filter(q => q.type === "pilihan_ganda")
          .map(q => ({
            question: q.questionText,
            options: q.options || [],
            correctIndex: q.options ? q.options.indexOf(q.correctAnswer as string) : 0,
            explanation: q.explanation,
            skillTarget: q.skillTarget,
          })),
        shortAnswer: chapter.readingPractice.questions
          .filter(q => q.type === "jawaban_singkat" || q.type === "uraian")
          .map(q => ({
            question: q.questionText,
            sampleAnswer: q.correctAnswer as string,
            explanation: q.explanation,
          })),
        essay: [],
      } : undefined,
      assessment: chapter.assessment as any,
      rubric: chapter.rubric,
      differentiation: chapter.differentiation,
      remedial: chapter.remedial,
      enrichment: chapter.enrichment,
      teacherNotes: chapter.teacherNotes,
      reflection: chapter.reflection,
      reviewStatus: chapter.reviewStatus,
      tags: chapter.tags,
    },
  }
  return JSON.stringify(content)
}

export async function GET(req: Request, { params }: { params: Promise<{ unitId: string }> }) {
  try {
    const user = await getUser()
    if (!user || (user.role !== "GURU" && !user.isFounder)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { unitId } = await params

    // Try DB first
    const dbUnit = await db.learningUnit.findUnique({
      where: { id: unitId },
      include: { level: true },
    })

    if (dbUnit && dbUnit.level?.type === "PANDUAN") {
      return NextResponse.json({ data: dbUnit })
    }

    // Fallback: lookup in guide data files
    const chapter = getChapterById(unitId)
    if (!chapter) {
      return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 404 })
    }

    const grade = allGrades.find(g => g.semesters.some(s => s.chapters.some(c => c.id === unitId)))
    const contentJson = buildKontenFromGuide(chapter, chapter.grade)

    return NextResponse.json({
      data: {
        id: chapter.id,
        title: chapter.title,
        grade: chapter.grade,
        semester: chapter.semester,
        kd: chapter.kd,
        content: contentJson,
        level: {
          title: `Kelas ${chapter.grade} — ${chapter.phase === "A" ? "Fase A" : chapter.phase === "B" ? "Fase B" : "Fase C"}`,
        },
      },
    })
  } catch (error) {
    console.error("GET /api/guru/panduan/[unitId] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
