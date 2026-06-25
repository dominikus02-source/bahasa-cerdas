import { KataPlayQuestion, KataPlayLevel, KataPlayLesson } from "../../kataplay-content"
import { KataPlayAgent, AgentContext, GameEvent, AgentDecisions, QuestionHistoryEntry } from "../core/types"
import { kataPlayLevels } from "../../kataplay-content"

export class ContentCuratorAgent implements KataPlayAgent {
  name = "ContentCurator"

  onEvent(ctx: AgentContext, event: GameEvent): Partial<AgentDecisions> {
    const perf = ctx.sessionPerformance
    const profile = ctx.learnerProfile

    if (event.type === "answer_wrong" && perf.wrong >= 3) {
      const weakPatterns = profile.errorPatterns
        .filter((p) => p.confidence >= 0.4)

      if (weakPatterns.length > 0 && ctx.currentLevel) {
        const recommended = this.findRemedialLesson(ctx.currentLevel, weakPatterns[0]!.type)
        if (recommended) {
          return { reviewRecommended: true, recommendedLessonId: recommended.id }
        }
      }
    }

    return {}
  }

  getSessionEndDecisions(ctx: AgentContext): Partial<AgentDecisions> {
    const perf = ctx.sessionPerformance
    const profile = ctx.learnerProfile

    // Update spaced repetition for all seen questions
    for (const q of perf.questions) {
      const entry = profile.questionHistory[q.questionId]
      if (!entry) continue
      if (q.correct) {
        entry.reviewStage = Math.min(6, entry.reviewStage + 1)
        const intervals = [3600000, 86400000, 259200000, 604800000, 2592000000, 7776000000]
        entry.nextReviewAt = Date.now() + (intervals[entry.reviewStage] || intervals[5]!)
        if (entry.reviewStage >= 4) entry.mastered = true
      } else {
        entry.reviewStage = Math.max(0, entry.reviewStage - 2)
        entry.nextReviewAt = Date.now() + 3600000
        entry.mastered = false
      }
    }

    const weakPatterns = profile.errorPatterns
      .filter((p) => p.confidence >= 0.4)

    const summary: Record<string, string | number> = {}
    if (weakPatterns.length > 0) {
      const topError = weakPatterns.sort((a, b) => b.confidence - a.confidence)[0]!
      summary.recommendation = `Latihan ${topError.type} dulu yuk!`
      const remedial = this.findRemedialLesson(
        ctx.currentLevel!,
        topError.type
      )
      if (remedial) summary.nextLesson = remedial.title
    }

    return { sessionSummary: summary }
  }

  selectQuestions(
    level: KataPlayLevel,
    lesson: KataPlayLesson | null,
    count: number,
    profile: Record<string, QuestionHistoryEntry>,
    isMainSemua: boolean
  ): KataPlayQuestion[] {
    if (isMainSemua) {
      const allQuests = level.lessons.flatMap((l) =>
        l.questions.map((q) => ({ q, lessonId: l.id }))
      )
      const due = allQuests.filter(
        (x) => profile[x.q.instruction + x.q.correctAnswer]?.nextReviewAt <= Date.now()
      )
      const dueQs = due.map((x) => x.q)
      const remaining = allQuests
        .filter((x) => !due.includes(x))
        .map((x) => x.q)

      const shuffledDue = [...dueQs].sort(() => Math.random() - 0.5)
      const shuffledRemaining = [...remaining].sort(() => Math.random() - 0.5)
      const result = [
        ...shuffledDue.slice(0, Math.min(3, shuffledDue.length)),
        ...shuffledRemaining.slice(0, count - Math.min(3, shuffledDue.length)),
      ]
      return result.slice(0, count)
    }

    if (lesson) {
      const pool = [...lesson.questions].sort(() => Math.random() - 0.5)
      return pool.slice(0, Math.min(count, pool.length))
    }

    return []
  }

  private findRemedialLesson(level: KataPlayLevel, errorType: string): KataPlayLesson | null {
    const remedialMap: Record<string, string[]> = {
      phonetic_B_P: ["kp_1_2", "kp_1_3"],
      phonetic_D_T: ["kp_1_2"],
      phonetic_M_N: ["kp_1_2"],
      vowel_swap: ["kp_1_1", "kp_2_1"],
      transposition: ["kp_2_1", "kp_2_2", "kp_2_3"],
    }
    const remedialIds = remedialMap[errorType] || []
    return level.lessons.find((l) => remedialIds.includes(l.id)) || null
  }
}
