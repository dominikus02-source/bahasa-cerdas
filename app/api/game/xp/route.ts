import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { invalidateLeagueCache } from "@/lib/ai-queue"
import { getUser } from "@/lib/supabase/server"
import { rateLimitRoute } from "@/lib/rate-limit"
import { awardXp } from "@/lib/award-xp"
import { awardGuruXp } from "@/lib/gamification/teacher-xp"

import { trackAchievement } from "@/lib/gamification/achievement-engine"
import { calculateGameReward } from "@/lib/game/tts/economy"

// Skor wajar maksimum per jenis game — di atas ini klien berbohong.
// KataPlay: 10 ronde × (50 + streak×10) = maks 1050. Jaring pengaman kedua
// setelah batas 120 XP/submit (awardXp), supaya angka XP yang dicairkan
// konsisten dengan hasil permainan jujur.
const MAX_SCORE_PER_GAME: Record<string, number> = {
  KATAPLAY: 1100,
  // Kuis Tempur/Rimba: skor sesi normal berada jauh di bawah 600.
  RIMBA_KATA: 600,
  // TTS: sel benar + bonus tuntas + rentetan. Cap menutup kiriman skor liar.
  TEKA_TEKI_SILANG: 1500,
  // Game kata dengan 9 level. Cap mengikuti level tertinggi + bonus streak.
  TEBAK_KATA: 3200,
  SUSUN_KATA: 4200,
  BENAR_SALAH: 3000,
  IRAMA_KATA: 6500,
}

const ALLOWED_GAME_TYPES = new Set(Object.keys(MAX_SCORE_PER_GAME))
const MAX_ANSWERED_PER_GAME = 50

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

    const normalizedGameType = String(gameType || "").trim().toUpperCase()
    if (!ALLOWED_GAME_TYPES.has(normalizedGameType)) {
      return NextResponse.json({ error: "Unsupported game type" }, { status: 400 })
    }
    const rawCorrect = Number(correct)
    const rawWrong = Number(wrong)
    const rawMaxStreak = Number(maxStreak)
    const safeCorrect = Number.isFinite(rawCorrect) ? Math.max(0, Math.floor(rawCorrect)) : 0
    const safeWrong = Number.isFinite(rawWrong) ? Math.max(0, Math.floor(rawWrong)) : 0
    const safeMaxStreak = Number.isFinite(rawMaxStreak) ? Math.max(0, Math.floor(rawMaxStreak)) : 0
    const answered = safeCorrect + safeWrong
    if (answered > MAX_ANSWERED_PER_GAME || safeMaxStreak > MAX_ANSWERED_PER_GAME) {
      return NextResponse.json({ error: "Invalid game result" }, { status: 400 })
    }

    // XP dihitung server dari skor, bukan diambil dari badan permintaan.
    //
    // Dulu di sini ada `xpEarned ?? ...` yang memakai angka kiriman klien apa
    // adanya — siapa pun bisa POST xpEarned sebesar apa pun. Tiga murid memakai
    // itu untuk mencapai Level 751 (~375.000 XP).
    let skor = Number.isFinite(score) && score > 0 ? Math.floor(score) : 0
    // Pangkas skor ke nilai wajar untuk jenis game ini (KATAPLAY maks 1100).
    // XP maksimum legal KataPlay = 1050 → 105 XP, di bawah batas 120/submit.
    const batasSkor = MAX_SCORE_PER_GAME[normalizedGameType]
    if (batasSkor && skor > batasSkor) skor = batasSkor
    // Reference UNIK per permainan (bukan gameType yang konstan) — idempotensi
    // (userId, source, reference) di XPTransaction tidak boleh menelan XP semua
    // permainan berikutnya. Dulu reference = gameType: XP cair sekali seumur
    // hidup per jenis game. UUID per submit menjaga retry tak menggandakan XP
    // (dilindungi juga rate limit 20/menit + batas 120/submit + kuota harian).
    const reference = `${normalizedGameType}-${crypto.randomUUID()}`

    // Teacher Gamification Separation (ADDENDUM 2):
    // Reward engine dipisahkan per role. Gameplay tidak berubah — hanya sistem
    // reward. Guru TIDAK pernah menerima Coin/Rank/Level/Quest Murid; guru
    // menerima Teacher XP → teacher leaderboard + badge guru (GURU_GAME).
    // Murid tetap memakai Player XP Engine (tidak disentuh).
    const isGuru = dbUser.role === "GURU" || dbUser.isFounder

    // Game Reward Economy v1: seluruh gim yang memakai endpoint ini sekarang
    // memakai bahasa reward yang sama. Akurasi mengatur payout, sedangkan
    // difficulty multiplier menjaga game yang memang lebih berat tetap bernilai.
    const gameDifficulty: Record<string, number> = {
      KATAPLAY: 1.0,
      BENAR_SALAH: 1.0,
      TEBAK_KATA: 1.0,
      SUSUN_KATA: 1.0,
      IRAMA_KATA: 1.1,
      RIMBA_KATA: 1.1,
      TEKA_TEKI_SILANG: 1.2,
    }
    const totalAnswered = Math.max(
      0,
      safeCorrect + safeWrong
    )
    // Beberapa game lama belum mengirim correct/wrong. Jangan anggap payload
    // kosong sebagai 100% benar — itu menciptakan reward penuh untuk sesi palsu.
    // Untuk game tersebut, gunakan proporsi skor terhadap cap sebagai fallback.
    const accuracyPct = totalAnswered > 0
      ? (Math.min(safeCorrect, totalAnswered) / totalAnswered) * 100
      : (batasSkor ? (skor / batasSkor) * 100 : 0)
    const reward = calculateGameReward({
      baseXp: Math.floor(skor / 10),
      baseCoins: 5,
      accuracyPct,
      difficultyMultiplier: gameDifficulty[normalizedGameType] ?? 1,
    })

    const hasil = isGuru
      ? await awardGuruXp({
          guruId: dbUser.id,
          sumber: "GURU_GAME",
          reference,
          metadata: { gameType: normalizedGameType, skor },
        }).then((t) => ({
          xpDiberikan: t.xpDiberikan,
          boosted: false,
          kuotaHabis: t.xpDiberikan === 0,
          totalXp: 0,
          levelLama: 0,
          levelBaru: 0,
          naikLevel: false,
        }))
      : await awardXp(dbUser.id, "GAME", reward.xp, reference)

    // Koin per permainan selesai — murid hanya. Payout sekarang mengikuti
    // standar ekonomi yang sama: sekitar 3–5 koin berdasarkan akurasi,
    // sehingga permainan memberi progres tanpa menjadi mesin farming koin.
    let koinDidapat = 0
    if (!isGuru && reward.coins > 0 && hasil.xpDiberikan > 0) {
      try {
        const [coinTx] = await db.$transaction([
          db.coinTransaction.create({
            data: { userId: dbUser.id, amount: reward.coins, reason: "MAIN_GAME", reference: `game-${reference}` },
          }),
          db.user.update({
            where: { id: dbUser.id },
            data: { coins: { increment: reward.coins } },
          }),
        ])
        koinDidapat = coinTx.amount
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
        correct: safeCorrect,
        wrong: safeWrong,
        maxStreak: safeMaxStreak,
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
