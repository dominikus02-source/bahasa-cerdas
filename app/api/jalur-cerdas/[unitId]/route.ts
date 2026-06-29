import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"

export async function GET(req: Request, { params }: { params: Promise<{ unitId: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { unitId } = await params

  const unit = await db.learningUnit.findUnique({
    where: { id: unitId },
    include: { level: true },
  })

  if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 })

  let konten: any = null
  try { konten = unit.content ? JSON.parse(unit.content) : null } catch {}

  let progress = null
  try {
    progress = await db.userUnitProgress.findUnique({
      where: { userId_unitId: { userId: user.id, unitId } },
      select: { completed: true, score: true, xpEarned: true },
    })
  } catch {}

  let sanitizedQuestions: any[] = []
  if (konten?.questions && Array.isArray(konten.questions)) {
    sanitizedQuestions = konten.questions.map((q: any) => {
      const { jawaban, ...rest } = q
      return rest
    })
  }

  const lesson = konten?.lesson || null

  return NextResponse.json({
    unit: {
      id: unit.id,
      title: unit.title,
      subtitle: unit.subtitle,
      description: unit.description,
      emoji: unit.emoji,
      xpReward: unit.xpReward,
      coinReward: unit.coinReward,
      level: unit.level ? { id: unit.level.id, title: unit.level.title, level: unit.level.level } : null,
    },
    lesson,
    questions: sanitizedQuestions,
    progress,
  })
}
