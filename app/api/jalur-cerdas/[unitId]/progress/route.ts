import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { getUser } from "@/lib/supabase/server"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ unitId: string }> }) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { unitId } = await params
    const { score } = await req.json()

    const existing = await db.userUnitProgress.findUnique({
      where: { userId_unitId: { userId: user.id, unitId } },
    })

    if (existing && existing.completed) {
      return NextResponse.json({ progress: existing, isComplete: true, earnedXp: 0 })
    }

    const isComplete = score !== undefined && score >= 70
    const xpReward = isComplete ? 50 : 10

    const progress = await db.userUnitProgress.upsert({
      where: { userId_unitId: { userId: user.id, unitId } },
      create: {
        userId: user.id,
        unitId,
        completed: isComplete,
        score: score ?? 0,
        xpEarned: xpReward,
        coinEarned: isComplete ? 10 : 0,
        completedAt: isComplete ? new Date() : null,
      },
      update: {
        ...(score !== undefined ? { score } : {}),
        ...(isComplete ? { completed: true, completedAt: existing?.completedAt ?? new Date() } : {}),
        xpEarned: existing ? existing.xpEarned + xpReward : xpReward,
        coinEarned: isComplete
          ? (existing ? existing.coinEarned + 10 : 10)
          : (existing?.coinEarned ?? 0),
      },
    })

    if (xpReward > 0) {
      await db.user.update({
        where: { id: user.id },
        data: {
          xp: { increment: xpReward },
          ...(isComplete ? { coins: { increment: 10 } } : {}),
          lastActiveAt: new Date(),
        },
      })
    }

    return NextResponse.json({ progress, isComplete, earnedXp: xpReward })
  } catch (error) {
    console.error("Progress error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
