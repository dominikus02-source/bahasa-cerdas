import { NextRequest, NextResponse, after } from "next/server"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"
import { trackQuestProgress } from "@/lib/coins"

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

    const correct = String(answer).toLowerCase() === String(question.jawaban).toLowerCase()
    const correctIndex = typeof question.jawaban === "number" ? question.jawaban : null

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
