import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/server"
import { db } from "@/lib/db"
import { invalidateLeagueCache } from "@/lib/ai-queue"

function calcLevel(xp: number) {
  return Math.floor(Math.sqrt(xp / 100)) + 1
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { score, correct, wrong, maxStreak, xpEarned, gameType, roomCode } = await req.json()
    const earnedXp = xpEarned ?? Math.floor((score || 0) / 10)

    const oldLevel = user.level
    const newXp = user.xp + earnedXp
    const newLevel = calcLevel(newXp)

    const leagues = ["BRONZE", "SILVER", "GOLD", "DIAMOND"] as const
    let newLeague = user.league as string
    if (newLevel >= 80) newLeague = "DIAMOND"
    else if (newLevel >= 50) newLeague = "GOLD"
    else if (newLevel >= 25) newLeague = "SILVER"

    let roomId = roomCode
    if (roomCode) {
      const existing = await db.gameRoom.findFirst({ where: { code: roomCode } })
      if (existing) roomId = existing.id
    }

    await db.$transaction(async (tx) => {
      await tx.gameResult.create({
        data: {
          roomId: roomId || "solo",
          userId: user.id,
          sessionId: `solo-${Date.now()}`,
          finalScore: (score as number) || 0,
          correct: (correct as number) || 0,
          wrong: (wrong as number) || 0,
          maxStreak: (maxStreak as number) || 0,
          xpEarned: earnedXp,
          rank: 1,
        },
      } as any)

      await tx.user.update({
        where: { id: user.id },
        data: {
          xp: newXp,
          level: newLevel,
          lastActiveAt: new Date(),
          league: newLeague as any,
        },
      })
    })

    await invalidateLeagueCache(user.id)

    return NextResponse.json({
      xpEarned: earnedXp,
      totalXp: newXp,
      oldLevel,
      newLevel,
      levelUp: newLevel > oldLevel,
    })
  } catch (error) {
    console.error("Game XP error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
