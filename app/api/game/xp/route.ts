import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { invalidateLeagueCache } from "@/lib/ai-queue"
import { calcLevel, calcLeagueFromXP } from "@/lib/xp"

export async function POST(req: NextRequest) {
  try {
    const { score, correct, wrong, maxStreak, xpEarned, gameType, roomCode, supabaseId } = await req.json()
    if (!supabaseId) return NextResponse.json({ error: "supabaseId required" }, { status: 400 })

    const dbUser = await db.user.findUnique({ where: { supabaseId } })
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const earnedXp = xpEarned ?? Math.floor((score || 0) / 10)

    const oldLevel = dbUser.level
    const newXp = dbUser.xp + earnedXp
    const newLevel = calcLevel(newXp)
    const newLeague = calcLeagueFromXP(newXp)

    let roomId = roomCode
    if (roomCode) {
      const existing = await db.gameRoom.findFirst({ where: { code: roomCode } })
      if (existing) roomId = existing.id
    }

    await db.$transaction(async (tx) => {
      await tx.gameResult.create({
        data: {
          roomId: roomId || "solo",
          userId: dbUser.id,
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
        where: { id: dbUser.id },
        data: {
          xp: newXp,
          level: newLevel,
          lastActiveAt: new Date(),
          league: newLeague as any,
        },
      })
    })

    await invalidateLeagueCache(dbUser.id)

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
