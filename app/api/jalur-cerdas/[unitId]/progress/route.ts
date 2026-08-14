import { NextRequest, NextResponse, after } from "next/server"
import { db } from "@/lib/db"
import { trackQuestProgress } from "@/lib/coins"
import { getUser } from "@/lib/supabase/server"
import { awardXp } from "@/lib/award-xp"
import { recordActivity } from "@/lib/learning-loop/activity"
import { detectUnitSkill } from "@/lib/learning-loop/skills"
import { generateRecommendations } from "@/lib/learning-loop/recommend"
import { refreshNextAction } from "@/lib/learning-loop/next-action"
import { isJalurAnswerCorrect, scoreJalurAnswers } from "@/lib/jalur-cerdas/scoring"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ unitId: string }> }) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { unitId } = await params
    let body: unknown = null
    try {
      body = await req.json()
    } catch {}

    const unit = await db.learningUnit.findUnique({
      where: { id: unitId },
      select: {
        title: true,
        order: true,
        levelId: true,
        content: true,
        coinReward: true,
        xpReward: true,
        level: { select: { level: true, type: true } },
      },
    })

    if (!unit) {
      return NextResponse.json({ error: "Unit tidak ditemukan" }, { status: 404 })
    }
    if (unit.level.type !== "JALUR") {
      return NextResponse.json({ error: "Unit bukan bagian dari Jalur Cerdas" }, { status: 403 })
    }
    if (!isRecord(body) || !isRecord(body.answers)) {
      return NextResponse.json(
        { error: "Jawaban per soal diperlukan untuk menghitung hasil di server", code: "ANSWERS_REQUIRED" },
        { status: 400 }
      )
    }
    const answers = body.answers

    let storedQuestions: { id: string; jawaban: string | number }[] = []
    try {
      const parsed = JSON.parse(unit.content || "{}")
      if (Array.isArray(parsed?.questions)) {
        storedQuestions = parsed.questions.filter(
          (question: unknown): question is { id: string; jawaban: string | number } =>
            isRecord(question) &&
            typeof question.id === "string" &&
            (typeof question.jawaban === "string" || typeof question.jawaban === "number")
        )
      }
    } catch {}

    if (storedQuestions.length === 0) {
      return NextResponse.json({ error: "Unit tidak memiliki soal yang valid" }, { status: 404 })
    }

    // Score dihitung dari jawaban + kunci yang dibaca server. Body.score
    // sengaja tidak dipakai sebagai dasar completion atau reward.
    const score = scoreJalurAnswers(storedQuestions, answers).score
    const questionById = new Map(storedQuestions.map((question) => [question.id, question]))
    const answeredQuestionIds = Object.keys(answers).filter((id) => questionById.has(id))

    const existing = await db.userUnitProgress.findUnique({
      where: { userId_unitId: { userId: user.id, unitId } },
    })

    if (existing?.completed) {
      return NextResponse.json({ progress: existing, isComplete: true, earnedXp: 0, message: "Already completed" })
    }

    const isComplete = score >= 70

    if (isComplete) {
      // Completion hanya sah bila jawaban yang dikirim juga sudah melalui
      // endpoint submit dan memiliki evidence server-verified yang sama.
      const evidenceRows = await db.learningEvidence.findMany({
        where: {
          userId: user.id,
          source: "JALUR_CERDAS",
          activityId: unitId,
          questionId: { in: answeredQuestionIds },
        },
        select: { questionId: true, selectedAnswer: true, isCorrect: true },
      })
      const evidenceByQuestion = new Map(evidenceRows.map((row) => [row.questionId, row]))
      const evidenceMatches = answeredQuestionIds.every((questionId) => {
        const row = evidenceByQuestion.get(questionId)
        const answer = answers[questionId]
        const question = questionById.get(questionId)
        return Boolean(
          row &&
          question &&
          row.selectedAnswer === String(answer) &&
          row.isCorrect === isJalurAnswerCorrect(question.jawaban, answer)
        )
      })
      if (!evidenceMatches) {
        return NextResponse.json(
          { error: "Jawaban belum memiliki evidence server", code: "EVIDENCE_REQUIRED" },
          { status: 409 }
        )
      }
    }

    if (!isComplete) {
      const progress = await db.userUnitProgress.upsert({
        where: { userId_unitId: { userId: user.id, unitId } },
        create: { userId: user.id, unitId, completed: false, score, xpEarned: 0, coinEarned: 0 },
        update: { score },
      })
      return NextResponse.json({ progress, isComplete: false, earnedXp: 0 })
    }

    const BASE_XP_REWARD = unit.xpReward ?? 50
    const COIN_REWARD = unit.coinReward ?? 10
    // XP Boost dari toko koin. Angka akhir juga yang dicatat di UserUnitProgress,
    // supaya rekap XP belajar tetap sama dengan XP yang masuk ke User.xp.
    // Lewat pintu tunggal: batas per submit, kuota harian, boost, jejak ledger,
    // dan pembaruan xp/level/liga sekaligus. Unit ini dijaga "Already completed"
    // di atas, jadi XP-nya memang hanya bisa cair sekali per unit.
    const hasilXp = await awardXp(user.id, "JALUR_CERDAS", BASE_XP_REWARD, unitId)
    const XP_REWARD = hasilXp.xpDiberikan
    const boosted = hasilXp.boosted

    // awardXp() returns zero without `kuotaHabis` when the same reference was
    // already processed. Do not let a concurrent/replayed request continue to
    // the User.coins increment and overwrite the first payout.
    if (BASE_XP_REWARD > 0 && XP_REWARD === 0 && !hasilXp.kuotaHabis) {
      const current = await db.userUnitProgress.findUnique({
        where: { userId_unitId: { userId: user.id, unitId } },
      })
      return NextResponse.json({ progress: current, isComplete: true, earnedXp: 0, message: "Already completed" })
    }

    const progress = await db.userUnitProgress.upsert({
      where: { userId_unitId: { userId: user.id, unitId } },
      create: {
        userId: user.id, unitId,
        completed: true, score,
        xpEarned: XP_REWARD, coinEarned: COIN_REWARD,
        completedAt: new Date(),
      },
      update: {
        completed: true, score,
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
    // Level & rank TIDAK dihitung ulang di sini. awardXp() sudah menuliskannya
    // dari kurva resmi di transaksi yang sama; blok lama di sini menghitung
    // ulang dengan rumus usang (xp/500) dan menimpa hasil yang benar.

    // Learning Loop: catat aktivitas + skill, bangun rekomendasi, dan refresh
    // aksi berikutnya. Hanya berjalan pada penyelesaian pertama (existing yang
    // sudah completed sudah di-return di atas). Best-effort — jangan pernah
    // gagalkan respon progress.
    try {
      const skill = unit?.title ? detectUnitSkill(unit.title) : "READING"
      await recordActivity({
        userId: user.id,
        type: "JALUR_CERDAS",
        subtype: "LESSON_COMPLETE",
        skill,
        skillDelta: 8,
        xp: XP_REWARD,
        coin: COIN_REWARD,
        meta: { unitId },
        reference: `jalur-unit-${unitId}-complete`,
        journey: {
          title: "Selesai: " + (unit?.title ?? "Unit"),
          description: "Unit Jalur Cerdas selesai",
          icon: "zap",
        },
      })
    } catch { /* best-effort */ }

    try { await generateRecommendations(user.id) } catch { /* best-effort */ }
    try { await refreshNextAction(user.id) } catch { /* best-effort */ }

    // Unit berikutnya: dalam level yang sama, atau level JALUR berikutnya.
    let nextUnitId: string | null = null
    try {
      if (unit) {
        const nextInLevel = await db.learningUnit.findFirst({
          where: { levelId: unit.levelId, order: { gt: unit.order }, isActive: true },
          orderBy: { order: "asc" },
          select: { id: true },
        })
        if (nextInLevel) {
          nextUnitId = nextInLevel.id
        } else if (unit.level) {
          const nextLevel = await db.learningLevel.findFirst({
            where: { type: "JALUR", level: { gt: unit.level.level } },
            orderBy: { level: "asc" },
            select: { id: true },
          })
          if (nextLevel) {
            const firstUnit = await db.learningUnit.findFirst({
              where: { levelId: nextLevel.id, isActive: true },
              orderBy: { order: "asc" },
              select: { id: true },
            })
            nextUnitId = firstUnit?.id ?? null
          }
        }
      }
    } catch { /* best-effort */ }

    return NextResponse.json({
      progress,
      isComplete: true,
      earnedXp: XP_REWARD,
      baseXp: BASE_XP_REWARD,
      boosted,
      nextUnitId,
    })
  } catch (error) {
    console.error("Progress error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
