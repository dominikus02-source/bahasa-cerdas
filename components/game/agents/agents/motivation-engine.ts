import { KataPlayAgent, AgentContext, GameEvent, AgentDecisions } from "../core/types"

const correctMessages = [
  (s: number) => s >= 5 ? `LUAR BIASA! ${s} berturut-turut! 🔥🔥🔥` : null,
  () => `Yes! Kamu benar! 🎯`,
  () => `Mantap! Jawaban tepat! ✨`,
  () => `Hebat! Kamu pasti belajar! 💪`,
  (s: number) => s >= 3 ? `PANAS! ${s} benar beruntun! 🔥` : null,
  () => `Tepat sekali! 🎉`,
  () => `Kamu hebat! Lanjutkan! ⭐`,
  () => `Nah, gitu dong! 👍`,
  () => `Cerdas! 🧠`,
  (s: number) => s >= 2 ? `Luar biasa! Udah ${s} kali berturut-turut!` : null,
]

const wrongMessages = [
  (s: number) => s <= 1 ? `Yahh, hampir! Coba lagi ya! 💪` : null,
  () => `Almost! Jawabannya lain. Kamu pasti bisa next!`,
  () => `Gapapa, ini bagian dari belajar 📖`,
  (s: number) => s >= 2 ? `Jangan menyerah! Kamu pasti bisa! 🎯` : null,
  () => `Ayo coba lagi! Practice makes perfect!`,
  () => `Belum tepat, tapi kamu semakin dekat! 🎯`,
]

const gameOverMessages = [
  `Game over... Tapi kamu belajar banyak kali ini! 📚`,
  `Setiap juara pernah jatuh. Yuk bangkit lagi! 💪`,
  `Belajar itu perjalanan, bukan perlombaan. Kamu hebat sudah sampai sini! 🌟`,
  `XP tetap kamu dapat! Besok kita coba lagi ya 🚀`,
]

const sessionEndMessages = [
  (c: number, t: number) => c >= 9 ? `Luar Biasa! Kamu nyaris sempurna! 🏆` : null,
  (c: number) => c >= 7 ? `Bagus sekali! Kamu belajar dengan hebat! ⭐` : null,
  (c: number) => c >= 5 ? `Sudah cukup baik! Yuk coba lagi biar lebih hebat! 💪` : null,
  () => `Kamu sudah berusaha. Besok pasti lebih baik! 🌱`,
]

export class MotivationEngineAgent implements KataPlayAgent {
  name = "MotivationEngine"
  private usedCorrectIndices: number[] = []
  private usedWrongIndices: number[] = []
  private usedGameOverIndices: number[] = []

  onEvent(ctx: AgentContext, event: GameEvent): Partial<AgentDecisions> {
    let message: string | null = null

    if (event.type === "answer_correct") {
      message = this.pickMessage(correctMessages, event.currentStreak, this.usedCorrectIndices)
    } else if (event.type === "answer_wrong") {
      message = this.pickMessage(wrongMessages, ctx.sessionPerformance.wrong, this.usedWrongIndices)
      if (!message) message = `Jawaban: ${event.question.correctAnswer}`
    } else if (event.type === "game_over") {
      message = gameOverMessages[this.usedGameOverIndices.length % gameOverMessages.length]
      this.usedGameOverIndices.push(this.usedGameOverIndices.length)
    }

    return { feedbackMessage: message }
  }

  getSessionEndDecisions(ctx: AgentContext): Partial<AgentDecisions> {
    const perf = ctx.sessionPerformance
    for (const gen of sessionEndMessages) {
      const msg = gen(perf.correct, perf.totalQuestions)
      if (msg) return { sessionSummary: { grade: msg } }
    }
    return {}
  }

  private pickMessage(
    pool: Array<(streak: number) => string | null>,
    streakOrWrong: number,
    usedIndices: number[]
  ): string | null {
    const candidates = pool
      .map((fn, i) => ({ msg: fn(streakOrWrong), idx: i }))
      .filter((x) => x.msg !== null && !usedIndices.includes(x.idx))

    if (candidates.length === 0) return null
    const pick = candidates[Math.floor(Math.random() * candidates.length)]!
    usedIndices.push(pick.idx)
    return pick.msg!
  }
}
