import { KataPlayAgent, AgentContext, GameEvent, AgentDecisions, ErrorPattern } from "../core/types"

const phoneticPairs = [
  ["B", "P"], ["D", "T"], ["M", "N"], ["C", "J"],
  ["G", "K"], ["F", "V"], ["S", "Z"], ["L", "R"],
]

export class ProgressAnalystAgent implements KataPlayAgent {
  name = "ProgressAnalyst"

  onEvent(ctx: AgentContext, event: GameEvent): Partial<AgentDecisions> {
    if (event.type !== "answer_wrong") return {}

    const correctAnswer = event.question.correctAnswer
    const chosenAnswer = event.answeredOption
    const patterns = this.detectPatterns(correctAnswer, chosenAnswer, ctx)

    if (patterns.length > 0) {
      const profile = ctx.learnerProfile
      for (const newPattern of patterns) {
        const existing = profile.errorPatterns.find((p) => p.type === newPattern.type)
        if (existing) {
          existing.confidence = Math.min(1, existing.confidence + 0.15)
          if (!existing.examples.includes(newPattern.examples[0]!)) {
            existing.examples.push(newPattern.examples[0]!)
          }
        } else {
          profile.errorPatterns.push(newPattern)
        }
      }
    }

    return {}
  }

  getSessionEndDecisions(ctx: AgentContext): Partial<AgentDecisions> {
    const perf = ctx.sessionPerformance
    const profile = ctx.learnerProfile
    const weakPatterns = profile.errorPatterns
      .filter((p) => p.confidence >= 0.4)
      .sort((a, b) => b.confidence - a.confidence)

    const summary: Record<string, string | number> = {
      accuracy: `${Math.round(perf.accuracy * 100)}%`,
      bestStreak: perf.bestStreak,
      avgSpeed: `${Math.round(perf.avgTimeToAnswer / 1000)}s`,
    }
    if (weakPatterns.length > 0) {
      summary.weakArea = weakPatterns[0]!.type
    }

    return {
      sessionSummary: summary,
      reviewRecommended: weakPatterns.length > 0,
    }
  }

  private detectPatterns(
    correct: string,
    chosen: string,
    ctx: AgentContext
  ): ErrorPattern[] {
    const patterns: ErrorPattern[] = []

    // Phonetic confusion
    for (const [a, b] of phoneticPairs) {
      if (
        (correct.includes(a) && chosen.includes(b)) ||
        (correct.includes(b) && chosen.includes(a))
      ) {
        patterns.push({
          type: `phonetic_${a}_${b}`,
          confidence: 0.3,
          examples: [`${correct} → ${chosen}`],
          firstDetectedAt: Date.now(),
        })
      }
    }

    // Vowel swap
    const correctVowels = correct.match(/[AEIOU]/g) || []
    const chosenVowels = chosen.match(/[AEIOU]/g) || []
    const sharedVowels = correctVowels.filter((v) => chosenVowels.includes(v))
    if (correctVowels.length > 1 && sharedVowels.length <= correctVowels.length - 2) {
      patterns.push({
        type: "vowel_swap",
        confidence: 0.25,
        examples: [`${correct} → ${chosen}`],
        firstDetectedAt: Date.now(),
      })
    }

    // Transposition
    if (correct.length >= 3 && chosen.length === correct.length) {
      const diffs: number[] = []
      for (let i = 0; i < correct.length; i++) {
        if (correct[i] !== chosen[i]) diffs.push(i)
      }
      if (diffs.length === 2 && Math.abs(diffs[0]! - diffs[1]!) === 1) {
        patterns.push({
          type: "transposition",
          confidence: 0.3,
          examples: [`${correct} → ${chosen}`],
          firstDetectedAt: Date.now(),
        })
      }
    }

    return patterns
  }
}
