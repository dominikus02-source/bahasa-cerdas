import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const [levels, progress] = await Promise.all([
    db.learningLevel.findMany({
      where: { type: "JALUR" },
      orderBy: { level: "asc" },
      include: {
        units: {
          where: { isActive: true },
          orderBy: { order: "asc" },
          select: { id: true, title: true, subtitle: true, emoji: true, order: true, xpReward: true, coinReward: true },
        },
      },
    }),
    db.userUnitProgress.findMany({
      where: { userId: user.id },
      select: { unitId: true, completed: true, score: true },
    }),
  ])

  const progressMap = new Map(progress.map(p => [p.unitId, p]))
  const payload = levels.map(level => ({
    id: level.id, level: level.level, title: level.title, subtitle: level.subtitle,
    description: level.description, emoji: level.emoji,
    units: level.units.map(unit => {
      const p = progressMap.get(unit.id)
      return { ...unit, completed: !!p?.completed, score: p?.score ?? 0 }
    }),
  }))

  return NextResponse.json({ levels: payload })
}