import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"
import { calcLevel, calcLeagueFromXP } from "@/lib/xp"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ unitId: string }> }) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { unitId } = await params
    let score: number | undefined
    try {
      const body = await req.json()
      score = body.score
    } catch {}

    const existing = await db.userUnitProgress.findUnique({
      where: { userId_unitId: { userId: user.id, unitId } },
    })

    if (existing?.completed) {
      return NextResponse.json({ progress: existing, isComplete: true, earnedXp: 0, message: "Already completed" })
    }

    const isComplete = score !== undefined && score >= 70

    if (!isComplete) {
      const progress = await db.userUnitProgress.upsert({
        where: { userId_unitId: { userId: user.id, unitId } },
        create: { userId: user.id, unitId, completed: false, score: score ?? 0, xpEarned: 0, coinEarned: 0 },
        update: { score: score ?? 0 },
      })
      return NextResponse.json({ progress, isComplete: false, earnedXp: 0 })
    }

    const XP_REWARD = 50
    const COIN_REWARD = 10

    const progress = await db.userUnitProgress.upsert({
      where: { userId_unitId: { userId: user.id, unitId } },
      create: {
        userId: user.id, unitId,
        completed: true, score: score ?? 0,
        xpEarned: XP_REWARD, coinEarned: COIN_REWARD,
        completedAt: new Date(),
      },
      update: {
        completed: true, score: score ?? 0,
        completedAt: existing?.completedAt ?? new Date(),
        xpEarned: XP_REWARD, coinEarned: COIN_REWARD,
      },
    })

    const jcXp = user.xp + XP_REWARD
    const jcLevel = calcLevel(jcXp)
    const jcLeague = calcLeagueFromXP(jcXp)
    await db.user.update({
      where: { id: user.id },
      data: { xp: jcXp, level: jcLevel, league: jcLeague, coins: { increment: COIN_REWARD }, lastActiveAt: new Date() },
    })

    return NextResponse.json({ progress, isComplete: true, earnedXp: XP_REWARD })
  } catch (error) {
    console.error("Progress error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
