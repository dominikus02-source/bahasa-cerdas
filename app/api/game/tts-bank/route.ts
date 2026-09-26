import { NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/server"
import { db } from "@/lib/db"

export const dynamic = "force-dynamic"

const MAX_ITEMS = 1200
const MIN_ANSWER = 3
const MAX_ANSWER = 14

function normalizeAnswer(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()
}

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

function tierForDifficulty(value: string): 1 | 2 | 3 {
  const d = value.toUpperCase()
  if (d === "EASY" || d === "MUDAH") return 1
  if (d === "HARD" || d === "SULIT") return 3
  return 2
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
    const words = []

    for (const soal of soals) {
      const answer = normalizeAnswer(answerFromQuestion(soal))
      const clue = cleanClue(soal.text)

      if (
        answer.length < MIN_ANSWER ||
        answer.length > MAX_ANSWER ||
        clue.length < 8 ||
        answer === normalizeAnswer(clue)
      ) continue

      // Jangan kirim soal yang membocorkan jawabannya di batang petunjuk.
      const clueUpper = normalizeAnswer(clue)
      if (clueUpper.includes(answer)) continue
      if (seen.has(answer)) continue

      seen.add(answer)
      words.push({
        id: soal.id,
        answer,
        clue,
        tier: tierForDifficulty(soal.difficulty),
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
