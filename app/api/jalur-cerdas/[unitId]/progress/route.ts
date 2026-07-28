import { NextRequest, NextResponse, after } from "next/server"
import { db } from "@/lib/db"
import { trackQuestProgress } from "@/lib/coins"
import { getUser } from "@/lib/supabase/server"
import { calcLevel, calcLeagueFromXP } from "@/lib/xp"
import { awardXp } from "@/lib/award-xp"

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

    const BASE_XP_REWARD = 50
    const COIN_REWARD = 10
    // XP Boost dari toko koin. Angka akhir juga yang dicatat di UserUnitProgress,
    // supaya rekap XP belajar tetap sama dengan XP yang masuk ke User.xp.
    // Lewat pintu tunggal: batas per submit, kuota harian, boost, jejak ledger,
    // dan pembaruan xp/level/liga sekaligus. Unit ini dijaga "Already completed"
    // di atas, jadi XP-nya memang hanya bisa cair sekali per unit.
    const hasilXp = await awardXp(user.id, "JALUR_CERDAS", BASE_XP_REWARD, unitId)
    const XP_REWARD = hasilXp.xpDiberikan
    const boosted = hasilXp.boosted

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

    // xp/level/liga sudah disimpan awardXp(); di sini tinggal koinnya.
    await db.user.update({
      where: { id: user.id },
      data: { coins: { increment: COIN_REWARD }, lastActiveAt: new Date() },
    })

    // Daily quest: finishing a unit advances the learning mission. Runs after
    // the response — quest bookkeeping must never slow down or fail the lesson.
    after(async () => {
      try { await trackQuestProgress(user.id, "BACA_MATERI"); } catch { /* best-effort */ }
    });

    // Record the payout in the coin ledger.
    //
    // Finishing a unit incremented User.coins directly and wrote nothing to
    // CoinTransaction, so learning was invisible to anything reading that
    // ledger — including the daily leaderboard, which meant a board meant to
    // celebrate effort could not see the one activity that is actual learning.
    // Guarded by the existing "already completed" check above, so this cannot
    // pay out twice. Best-effort: a ledger write must never fail the lesson.
    try {
      await db.coinTransaction.create({
        data: { userId: user.id, amount: COIN_REWARD, reason: "SELESAI_BELAJAR", reference: unitId },
      })
    } catch { /* progress and coins already saved */ }
    const updatedUser = await db.user.findUnique({ where: { id: user.id }, select: { xp: true } })
    const finalXp = updatedUser?.xp ?? user.xp + XP_REWARD
    const jcLevel = calcLevel(finalXp)
    const jcLeague = calcLeagueFromXP(finalXp)
    await db.user.update({
      where: { id: user.id },
      data: { level: jcLevel, league: jcLeague },
    })

    return NextResponse.json({
      progress,
      isComplete: true,
      earnedXp: XP_REWARD,
      baseXp: BASE_XP_REWARD,
      boosted,
    })
  } catch (error) {
    console.error("Progress error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
