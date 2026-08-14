import { NextRequest, NextResponse, after } from "next/server"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"
import { trackQuestProgress } from "@/lib/coins"
import { isJalurAnswerCorrect } from "@/lib/jalur-cerdas/scoring"
import { upsertLearningEvidence, LEARNING_EVIDENCE_VERSION } from "@/lib/learning-loop/evidence"

export async function POST(req: NextRequest, { params }: { params: Promise<{ unitId: string }> }) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { unitId } = await params
    const { questionId, answer } = await req.json()

    if (!questionId || answer === undefined || answer === null) {
      return NextResponse.json({ error: "Missing questionId or answer" }, { status: 400 })
    }

    const unit = await db.learningUnit.findUnique({
      where: { id: unitId },
      select: { content: true },
    })

    if (!unit?.content) {
      return NextResponse.json({ error: "Unit not found or no content" }, { status: 404 })
    }

    let konten: any
    try { konten = JSON.parse(unit.content) } catch {
      return NextResponse.json({ error: "Invalid content" }, { status: 500 })
    }

    if (!konten.questions || !Array.isArray(konten.questions)) {
      return NextResponse.json({ error: "No questions in unit" }, { status: 404 })
    }

    const question = konten.questions.find((q: any) => q.id === questionId)
    if (!question) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 })
    }

    const correct = isJalurAnswerCorrect(question.jawaban, answer)
    const correctIndex = typeof question.jawaban === "number" ? question.jawaban : null

    // Evidence harus tersimpan sebelum jawaban dianggap berhasil. Kunci soal
    // dibaca server; skill/difficulty sengaja nullable karena metadata item
    // Jalur belum memiliki klasifikasi kanonik.
    await upsertLearningEvidence({
      userId: user.id,
      source: "JALUR_CERDAS",
      activityId: unitId,
      questionId,
      selectedAnswer: String(answer),
      isCorrect: correct,
      score: correct ? 1 : 0,
      metadata: { version: LEARNING_EVIDENCE_VERSION, questionType: question.tipe ?? null },
    })

    // Daily quest: every answered question advances the quiz mission. After the
    // response and best-effort — this is the hottest path in the lesson engine.
    after(async () => {
      try { await trackQuestProgress(user.id, "MENJAWAB_KUIS"); } catch { /* best-effort */ }
    });

    return NextResponse.json({
      correct,
      correctAnswer: question.jawaban,
      correctIndex,
      explanation: question.penjelasan || null,
    })
  } catch (error) {
    console.error("Submit error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
