import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { invalidateLeagueCache } from "@/lib/ai-queue"
import { getUser } from "@/lib/supabase/server"
import { rateLimitRoute } from "@/lib/rate-limit"
import { awardXp } from "@/lib/award-xp"
import { awardGuruXp } from "@/lib/gamification/teacher-xp"
import { awardCoins, COIN_MAIN_GAME } from "@/lib/coins"
import { trackAchievement } from "@/lib/gamification/achievement-engine"

// Skor wajar maksimum per jenis game — di atas ini klien berbohong.
// KataPlay: 10 ronde × (50 + streak×10) = maks 1050. Jaring pengaman kedua
// setelah batas 120 XP/submit (awardXp), supaya angka XP yang dicairkan
// konsisten dengan hasil permainan jujur.
const MAX_SCORE_PER_GAME: Record<string, number> = {
  KATAPLAY: 1100,
  // Kuis Tempur solo: 143 soal di bank, satu ronde realistis puluhan jawaban.
  // 10 poin per jawaban benar + 40 bonus menang; 600 memberi ruang lega untuk
  // permainan panjang yang jujur, tetapi menutup kiriman skor mengada-ada.
  RIMBA_KATA: 600,
  // Teka-Teki Silang: sel benar × 10 + bonus tuntas (200) + bonus beruntun.
  // Level terbesar ~90 sel → 900–1200; 1500 menutup skor mengada-ada.
  TEKA_TEKI_SILANG: 1500,
}

export async function POST(req: NextRequest) {
  try {
    const dbUser = await getUser()
    if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Lapisan 1: jeda antar-submit. Permainan jujur butuh puluhan detik per
    // ronde, jadi 20/menit sangat longgar untuk pemain sungguhan.
    // Catatan: ini gagal-terbuka kalau Redis mati, jadi TIDAK boleh jadi
    // satu-satunya pertahanan — awardXp() memasang lapisan sisanya.
    const limited = await rateLimitRoute(req, {
      maxRequests: 20,
      windowSeconds: 60,
      identifier: "game-xp",
    })
    if (limited) return limited

    const { score, correct, wrong, maxStreak, gameType, roomCode } = await req.json()

    // XP dihitung server dari skor, bukan diambil dari badan permintaan.
    //
    // Dulu di sini ada `xpEarned ?? ...` yang memakai angka kiriman klien apa
    // adanya — siapa pun bisa POST xpEarned sebesar apa pun. Tiga murid memakai
    // itu untuk mencapai Level 751 (~375.000 XP).
    let skor = Number.isFinite(score) && score > 0 ? Math.floor(score) : 0
    // Pangkas skor ke nilai wajar untuk jenis game ini (KATAPLAY maks 1100).
    // XP maksimum legal KataPlay = 1050 → 105 XP, di bawah batas 120/submit.
    const batasSkor = MAX_SCORE_PER_GAME[gameType as string]
    if (batasSkor && skor > batasSkor) skor = batasSkor
    // Reference UNIK per permainan (bukan gameType yang konstan) — idempotensi
    // (userId, source, reference) di XPTransaction tidak boleh menelan XP semua
    // permainan berikutnya. Dulu reference = gameType: XP cair sekali seumur
    // hidup per jenis game. UUID per submit menjaga retry tak menggandakan XP
    // (dilindungi juga rate limit 20/menit + batas 120/submit + kuota harian).
    const reference = `${gameType || "game"}-${crypto.randomUUID()}`

    // Teacher Gamification Separation (ADDENDUM 2):
    // Reward engine dipisahkan per role. Gameplay tidak berubah — hanya sistem
    // reward. Guru TIDAK pernah menerima Coin/Rank/Level/Quest Murid; guru
    // menerima Teacher XP → teacher leaderboard + badge guru (GURU_GAME).
    // Murid tetap memakai Player XP Engine (tidak disentuh).
    const isGuru = dbUser.role === "GURU" || dbUser.isFounder

    const hasil = isGuru
      ? await awardGuruXp({
          guruId: dbUser.id,
          sumber: "GURU_GAME",
          reference,
          metadata: { gameType, skor },
        }).then((t) => ({
          xpDiberikan: t.xpDiberikan,
          boosted: false,
          kuotaHabis: t.xpDiberikan === 0,
          totalXp: 0,
          levelLama: 0,
          levelBaru: 0,
          naikLevel: false,
        }))
      : await awardXp(dbUser.id, "GAME", Math.floor(skor / 10), reference)

    // Koin per permainan selesai — murid hanya. Dulu game TIDAK memberi koin
    // sama sekali (koin hanya muncul saat naik level), jadi anak yang belum
    // menyentuh ambang level main terus-menerus tanpa melihat saldonya
    // bertambah. Satu permainan selesai = satu submit = 5 koin. Pemicu XP
    // dibatasi oleh rate limit 20/menit yang sama, jadi jangan bikin koin
    // lewat jalur lain (game sudah 1 submit per ronde).
    let koinDidapat = 0
    if (!isGuru) {
      try {
        const koin = await awardCoins(dbUser.id, "MAIN_GAME", `game-${reference}`)
        koinDidapat = koin.coins
      } catch (e) {
        // Koin gagal tidak boleh menggagalkan pemberian XP / penyimpanan hasil.
        console.error("Game coin error:", e)
      }
    }

    let roomId = roomCode
    if (roomCode) {
      const existing = await db.gameRoom.findFirst({ where: { code: roomCode } })
      if (existing) roomId = existing.id
    }

    await db.gameResult.create({
      data: {
        roomId: roomId || "solo",
        userId: dbUser.id,
        sessionId: `solo-${Date.now()}`,
        finalScore: skor,
        correct: (correct as number) || 0,
        wrong: (wrong as number) || 0,
        maxStreak: (maxStreak as number) || 0,
        xpEarned: hasil.xpDiberikan,
        rank: 1,
      },
    } as any)

    await invalidateLeagueCache(dbUser.id)

    // Achievement: track game milestones (fire-and-forget, best-effort).
    trackAchievement(dbUser.id, "ach-game-5").catch(() => {})

    return NextResponse.json({
      xpEarned: hasil.xpDiberikan,
      boosted: hasil.boosted,
      // Diberi tahu supaya UI bisa menjelaskan kenapa XP-nya berhenti bertambah,
      // alih-alih terasa seperti bug.
      kuotaHarianHabis: hasil.kuotaHabis,
      totalXp: hasil.totalXp,
      oldLevel: hasil.levelLama,
      newLevel: hasil.levelBaru,
      levelUp: hasil.naikLevel,
      koin: koinDidapat,
    })
  } catch (error) {
    console.error("Game XP error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
