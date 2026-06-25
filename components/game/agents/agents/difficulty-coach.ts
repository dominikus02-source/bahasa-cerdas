import { KataPlayAgent, AgentContext, GameEvent, AgentDecisions, DifficultyParams } from "../core/types"

export class DifficultyCoachAgent implements KataPlayAgent {
  name = "DifficultyCoach"

  onEvent(ctx: AgentContext, event: GameEvent): Partial<AgentDecisions> {
    const diff = { ...ctx.difficulty }
    const recentQuestions = ctx.sessionPerformance.questions.slice(-5)
    const recentCorrect = recentQuestions.filter((q) => q.correct).length
    const recentAccuracy = recentQuestions.length > 0 ? recentCorrect / recentQuestions.length : 0

    if (event.type === "answer_correct") {
      const streak = event.currentStreak
      if (streak >= 3 && streak < 5) diff.level = Math.min(5, diff.level + 1)
      if (streak >= 5) {
        diff.level = Math.min(5, diff.level + 1)
        diff.distractorDifficulty = "hard"
      }
      if (recentAccuracy >= 0.8 && diff.hintLevel === "direct") diff.hintLevel = "subtle"
      if (recentAccuracy >= 0.9) diff.hintLevel = "none"
    }

    if (event.type === "answer_wrong") {
      diff.level = Math.max(1, diff.level - 1)
      if (recentAccuracy < 0.5) {
        diff.hintLevel = "direct"
        diff.distractorDifficulty = "easy"
        diff.livesGranted = Math.max(3, diff.livesGranted)
        diff.xpMultiplier = 0.8
      } else if (recentAccuracy < 0.65) {
        diff.hintLevel = "subtle"
        diff.distractorDifficulty = "moderate"
      }
    }

    if (event.type === "life_lost" && ctx.sessionPerformance.wrong >= 3) {
      diff.livesGranted = Math.min(5, diff.livesGranted + 1)
    }

    // Streak milestones: bonus lives
    if (event.type === "streak_milestone" && event.currentStreak >= 5) {
      diff.livesGranted = Math.min(5, diff.livesGranted + 1)
    }

    return { difficultyChange: diff }
  }

  getSessionEndDecisions(ctx: AgentContext): Partial<AgentDecisions> {
    return {}
  }
}
