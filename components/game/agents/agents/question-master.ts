import { KataPlayQuestion } from "../../kataplay-content"
import { KataPlayAgent, AgentContext, GameEvent, AgentDecisions, DifficultyParams } from "../core/types"

const distractorStrategies: Record<string, (correct: string) => string[]> = {
  imageChoice: (c: string) => {
    if (/^[AEIOU]$/.test(c)) return ["A", "I", "E", "O"].filter((x) => x !== c).slice(0, 3)
    if (/^[BCDFGHJKLMNPQRSTVWXYZ]$/.test(c)) return ["B", "D", "P", "S", "M", "C", "T"].filter((x) => x !== c).slice(0, 3)
    if (c.length === 2 && /^[AEIOU]$/.test(c[1] ?? "")) return generateSyllableDistractors(c)
    return generateWordDistractors(c)
  },
  wordChoice: (c: string) => generateWordDistractors(c),
  trueFalse: () => ["Benar", "Salah"],
  fillBlank: (c: string) => {
    if (c.length <= 1) return ["A", "I", "E", "O"].filter((x) => x !== c).slice(0, 3)
    if (c.length <= 2) return ["A", "I", "U", "E", "O"].filter((x) => x !== c).slice(0, 3)
    return generateWordDistractors(c).slice(0, 3)
  },
  matching: () => [],
}

function generateSyllableDistractors(correct: string): string[] {
  const consonants = ["B", "C", "D", "G", "H", "J", "K", "L", "M", "N", "P", "R", "S", "T"]
  const vowels = ["A", "I", "U", "E", "O"]
  const [, cons, vow] = correct.match(/^([BCDFGHJKLMNPQRSTVWXYZ])([AEIOU])$/i) || []
  const alt: string[] = []
  if (cons && vow) {
    for (const c of consonants) if (c !== cons) { alt.push(c + vow); if (alt.length >= 2) break }
    for (const v of vowels) if (v !== vow) { alt.push(cons + v); if (alt.length >= 3) break }
  }
  return alt.slice(0, 3)
}

function generateWordDistractors(correct: string): string[] {
  const result: string[] = []
  if (correct.length >= 3) {
    const chars = correct.split("")
    for (let i = 0; i < chars.length - 1; i++) {
      const swapped = [...chars]
      ;[swapped[i], swapped[i + 1]] = [swapped[i + 1]!, swapped[i]!]
      const candidate = swapped.join("")
      if (candidate !== correct && !result.includes(candidate)) result.push(candidate)
    }
  }
  const vowelSwap = correct.replace(/[AEIOU]/g, (m) => {
    const altVowels: Record<string, string> = { A: "I", I: "A", U: "O", E: "A", O: "U" }
    return altVowels[m] || m
  })
  if (vowelSwap !== correct && !result.includes(vowelSwap)) result.push(vowelSwap)

  const consonantDrop = correct.replace(/^[BCDFGHJKLMNPQRSTVWXYZ]/, "")
  if (consonantDrop !== correct && !result.includes(consonantDrop)) result.push(consonantDrop)

  while (result.length < 3 && result.length > 0) result.push(result[0]!)
  while (result.length < 3) result.push(correct.split("").reverse().join(""))
  return result.slice(0, 3)
}

export class QuestionMasterAgent implements KataPlayAgent {
  name = "QuestionMaster"
  private usedQuestions = new Set<string>()

  onEvent(ctx: AgentContext, event: GameEvent): Partial<AgentDecisions> {
    return {}
  }

  getInitialDecisions(ctx: AgentContext): Partial<AgentDecisions> {
    return {}
  }

  getPool(order: "session" | "random"): KataPlayQuestion[] {
    return []
  }

  generateDistractors(question: KataPlayQuestion, difficulty: DifficultyParams): string[] {
    if (question.options.length >= 4) return question.options
    const strategy = distractorStrategies[question.type] || distractorStrategies.wordChoice
    const distractors = strategy(question.correctAnswer)
    const combined = [question.correctAnswer, ...distractors]
    return combined.sort(() => Math.random() - 0.5)
  }

  getHint(question: KataPlayQuestion, difficulty: DifficultyParams): string | undefined {
    if (difficulty.hintLevel === "none") return undefined
    if (question.hint) return question.hint
    if (difficulty.hintLevel === "direct") return `Coba cari: ${question.correctAnswer}`
    return undefined
  }
}
