import { KataPlayQuestion, KataPlayLevel, KataPlayLesson } from "../../kataplay-content"

// ── Events ──
export type GameEventType =
  | "session_start"
  | "question_shown"
  | "answer_correct"
  | "answer_wrong"
  | "life_lost"
  | "game_over"
  | "session_end"
  | "level_complete"
  | "lesson_complete"
  | "streak_milestone"

export type GameEvent = {
  type: GameEventType
  question: KataPlayQuestion
  answeredOption: string
  timeToAnswerMs: number
  currentStreak: number
  livesRemaining: number
  sessionQuestionIndex: number
  sessionTotalQuestions: number
}

// ── Performance snapshot (per session) ──
export type PerQuestionRecord = {
  questionIndex: number
  questionId: string
  questionType: string
  correct: boolean
  timeToAnswerMs: number
  difficultyAtTime: number
}

export type SessionPerformance = {
  levelId: string
  lessonIds: string[]
  totalQuestions: number
  correct: number
  wrong: number
  accuracy: number
  bestStreak: number
  avgTimeToAnswer: number
  questions: PerQuestionRecord[]
  xpEarned: number
}

// ── Long-term learner profile ──
export type QuestionHistoryEntry = {
  questionKey: string
  seenCount: number
  correctCount: number
  lastSeenAt: number
  nextReviewAt: number
  reviewStage: number
  mastered: boolean
  timesWrong: number
}

export type ErrorPattern = {
  type: string
  confidence: number
  examples: string[]
  firstDetectedAt: number
}

export type LearnerProfile = {
  id: string
  totalXp: number
  totalSessions: number
  totalCorrect: number
  totalWrong: number
  questionHistory: Record<string, QuestionHistoryEntry>
  errorPatterns: ErrorPattern[]
  preferredQuestionTypes: string[]
  averageAccuracy: number
  lastSessionAt: number
  currentStreakDays: number
  longestStreakDays: number
}

// ── Agent decisions ──
export type DifficultyParams = {
  level: number
  livesGranted: number
  hintLevel: "none" | "subtle" | "direct"
  distractorDifficulty: "easy" | "moderate" | "hard"
  xpMultiplier: number
}

export type AgentDecisions = {
  feedbackMessage: string | null
  difficultyChange: DifficultyParams
  nextQuestionOverride: KataPlayQuestion | null
  sessionSummary: Record<string, string | number> | null
  reviewRecommended: boolean
  recommendedLessonId: string | null
}

// ── Agent context (what agents share) ──
export type AgentContext = {
  learnerProfile: LearnerProfile
  currentLevel: KataPlayLevel | null
  currentLesson: KataPlayLesson | null
  sessionPerformance: SessionPerformance
  difficulty: DifficultyParams
  lastEvent: GameEvent | null
  allEvents: GameEvent[]
  isMainSemua: boolean
}

// ── Agent interface ──
export interface KataPlayAgent {
  name: string
  onEvent(ctx: AgentContext, event: GameEvent): Partial<AgentDecisions>
  getInitialDecisions?(ctx: AgentContext): Partial<AgentDecisions>
  getSessionEndDecisions?(ctx: AgentContext): Partial<AgentDecisions>
}

// ── Storage keys ──
export const STORAGE_KEY_PROFILE = "kataplay-agent-profile"
