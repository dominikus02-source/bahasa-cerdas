import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { invalidateLeagueCache } from "@/lib/ai-queue"
import { calcLevel, calcLeagueFromXP } from "@/lib/xp"
import { getUser } from "@/lib/supabase/server"
import { applyXpBoost } from "@/lib/xp-boost"
import { rateLimitRoute } from "@/lib/rate-limit"
import { batasiXpSubmit, terapkanKuotaHarian, awalHariWIB } from "@/lib/xp-guard"

export async function POST(req: NextRequest) {
  try {
    const dbUser = await getUser()
    if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Lapisan 1: jeda antar-submit. Permainan jujur butuh puluhan detik per
    // ronde, jadi 20/menit sangat longgar untuk pemain sungguhan.
    // Catatan: ini gagal-terbuka kalau Redis mati, jadi TIDAK boleh jadi
    // satu-satunya pertahanan — lihat lapisan 2 & 3 di bawah.
    const limited = await rateLimitRoute(req, {
      maxRequests: 20,
      windowSeconds: 60,
      identifier: "game-xp",
    })
    if (limited) return limited

    const { score, correct, wrong, maxStreak, gameType, roomCode } = await req.json()

    // Lapisan 2: XP dihitung server, bukan diambil dari badan permintaan.
    //
    // Dulu di sini ada `xpEarned ?? ...` yang memakai angka kiriman klien apa
    // adanya — siapa pun bisa POST xpEarned sebesar apa pun. Tiga murid memakai
    // itu untuk mencapai Level 751 (~375.000 XP). Sekarang klien hanya melapor
    // skornya; besaran XP-nya diputuskan di sini lalu dipangkas ke batas sumber.
    const skor = Number.isFinite(score) && score > 0 ? Math.floor(score) : 0
    const xpDiminta = batasiXpSubmit("GAME", Math.floor(skor / 10))

    // Lapisan 3: kuota harian. GameResult mencatat setiap submit lewat rute ini,
    // jadi jejaknya bisa dijumlahkan — dan tidak bergantung pada Redis.
    const sejakAwalHari = awalHariWIB()
    const agregat = await db.gameResult.aggregate({
      where: { userId: dbUser.id, createdAt: { gte: sejakAwalHari } },
      _sum: { xpEarned: true },
    })
    const kuota = terapkanKuotaHarian(agregat._sum.xpEarned || 0, xpDiminta)

    // Boost hanya mengalikan XP yang memang sudah lolos semua batas di atas.
    const { xp: earnedXp, boosted } = await applyXpBoost(dbUser.id, kuota.xp)

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
          finalScore: skor,
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
      boosted,
      // Diberi tahu supaya UI bisa menjelaskan kenapa XP-nya berhenti bertambah,
      // alih-alih terasa seperti bug.
      kuotaHarianHabis: kuota.terpotong,
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
