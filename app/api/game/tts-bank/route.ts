import { NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { evaluateTtsCandidate } from "@/lib/game/tts/eligibility"

export const dynamic = "force-dynamic"

const MAX_ITEMS = 1200
const MIN_ANSWER = 3
const MAX_ANSWER = 14

function answerFromQuestion(question: {
  type: string
  correctAnswer: string
  options: string[]
}): string {
  const raw = question.correctAnswer?.trim() ?? ""
  if (/^[A-D]$/i.test(raw)) {
    const index = raw.toUpperCase().charCodeAt(0) - 65
    return question.options?.[index] ?? ""
  }
  if (/^\d+$/.test(raw)) {
    const index = Number(raw)
    if (index >= 0 && index < (question.options?.length ?? 0)) return question.options[index]
  }
  return raw
}

function cleanClue(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^\s*(soal|pertanyaan)\s*:\s*/i, "")
    .trim()
}

export async function GET() {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const soals = await db.soal.findMany({
      where: {
        source: "MASTER_BANK",
        type: { in: ["PILIHAN_GANDA", "ISIAN_SINGKAT"] },
      },
      select: {
        id: true,
        text: true,
        type: true,
        difficulty: true,
        correctAnswer: true,
        options: true,
        topik: true,
        kelas: true,
      },
      orderBy: { updatedAt: "desc" },
      take: MAX_ITEMS,
    })

    const seen = new Set<string>()
    const words: Array<{
      id: string
      answer: string
      clue: string
      tier: 1 | 2 | 3
      clueType: string
      qualityScore: number
      source: "MASTER_BANK"
      topik: string | null
      kelas: string | null
    }> = []

    for (const soal of soals) {
      const answer = answerFromQuestion(soal)
      const clue = cleanClue(soal.text)

      if (answer.length < MIN_ANSWER || answer.length > MAX_ANSWER || clue.length < 8) continue

      const eligibility = evaluateTtsCandidate({
        answer,
        clue,
        type: soal.type,
        difficulty: soal.difficulty,
        themeKey: soal.topik ?? "",
      })
      if (eligibility.status !== "APPROVED") continue
      if (seen.has(eligibility.answer)) continue

      seen.add(eligibility.answer)
      words.push({
        id: soal.id,
        answer: eligibility.answer,
        clue: eligibility.clue,
        tier: eligibility.tier,
        clueType: eligibility.clueType,
        qualityScore: eligibility.score,
        source: "MASTER_BANK",
        topik: soal.topik,
        kelas: soal.kelas,
      })
    }

    return NextResponse.json({
      success: true,
      source: "MASTER_BANK",
      total: words.length,
      words,
    })
  } catch (error) {
    console.error("GET /api/game/tts-bank error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
