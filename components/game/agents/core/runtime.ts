import { KataPlayQuestion, KataPlayLevel, KataPlayLesson } from "../../kataplay-content"
import {
  KataPlayAgent,
  AgentContext,
  AgentDecisions,
  GameEvent,
  GameEventType,
  SessionPerformance,
  PerQuestionRecord,
  LearnerProfile,
  QuestionHistoryEntry,
  ErrorPattern,
  DifficultyParams,
  STORAGE_KEY_PROFILE,
} from "./types"

function loadProfile(): LearnerProfile {
  if (typeof window === "undefined") return createEmptyProfile()
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILE)
    if (raw) return JSON.parse(raw)
  } catch {}
  return createEmptyProfile()
}

function saveProfile(profile: LearnerProfile) {
  localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile))
}

function createEmptyProfile(): LearnerProfile {
  return {
    id: `learner_${Date.now()}`,
    totalXp: 0,
    totalSessions: 0,
    totalCorrect: 0,
    totalWrong: 0,
    questionHistory: {},
    errorPatterns: [],
    preferredQuestionTypes: [],
    averageAccuracy: 0,
    lastSessionAt: 0,
    currentStreakDays: 0,
    longestStreakDays: 0,
  }
}

const defaultDifficulty: DifficultyParams = {
  level: 3,
  livesGranted: 3,
  hintLevel: "subtle",
  distractorDifficulty: "moderate",
  xpMultiplier: 1,
}

export class KataPlayAgentRuntime {
  private agents: KataPlayAgent[] = []
  private context: AgentContext
  private profile: LearnerProfile

  constructor() {
    this.profile = loadProfile()
    this.context = this.buildEmptyContext()
  }

  registerAgent(agent: KataPlayAgent) {
    this.agents.push(agent)
  }

  private buildEmptyContext(): AgentContext {
    return {
      learnerProfile: this.profile,
      currentLevel: null,
      currentLesson: null,
      sessionPerformance: this.zeroSession(),
      difficulty: { ...defaultDifficulty },
      lastEvent: null,
      allEvents: [],
      isMainSemua: false,
    }
  }

  private zeroSession(): SessionPerformance {
    return {
      levelId: "", lessonIds: [], totalQuestions: 0,
      correct: 0, wrong: 0, accuracy: 0, bestStreak: 0,
      avgTimeToAnswer: 0, questions: [], xpEarned: 0,
    }
  }

  startSession(level: KataPlayLevel, lesson: KataPlayLesson | null, isMainSemua: boolean) {
    this.context = this.buildEmptyContext()
    this.context.currentLevel = level
    this.context.currentLesson = lesson
    this.context.isMainSemua = isMainSemua
    this.context.sessionPerformance = {
      ...this.zeroSession(),
      levelId: level.id,
      lessonIds: lesson ? [lesson.id] : level.lessons.map((l) => l.id),
      totalQuestions: 10,
    }
    this.profile.totalSessions++
    this.profile.lastSessionAt = Date.now()
    saveProfile(this.profile)
  }

  fireEvent(event: GameEvent): AgentDecisions {
    this.context.lastEvent = event
    this.context.allEvents.push(event)
    this.context.sessionPerformance = this.updatePerformance(event)

    const decisions: AgentDecisions = {
      feedbackMessage: null,
      difficultyChange: { ...this.context.difficulty },
      nextQuestionOverride: null,
      sessionSummary: null,
      reviewRecommended: false,
      recommendedLessonId: null,
    }

    for (const agent of this.agents) {
      const result = agent.onEvent(this.context, event)
      if (result.feedbackMessage) decisions.feedbackMessage = result.feedbackMessage
      if (result.difficultyChange) decisions.difficultyChange = result.difficultyChange
      if (result.nextQuestionOverride) decisions.nextQuestionOverride = result.nextQuestionOverride
      if (result.reviewRecommended) decisions.reviewRecommended = true
      if (result.recommendedLessonId) decisions.recommendedLessonId = result.recommendedLessonId
    }

    this.context.difficulty = decisions.difficultyChange
    this.updateProfileAfterEvent(event)
    return decisions
  }

  getInitialDecisions(): Partial<AgentDecisions> {
    const result: Partial<AgentDecisions> = {}
    for (const agent of this.agents) {
      if (agent.getInitialDecisions) {
        Object.assign(result, agent.getInitialDecisions(this.context))
      }
    }
    return result
  }

  endSession(xpEarned: number): Partial<AgentDecisions> {
    this.context.sessionPerformance.xpEarned = xpEarned
    this.profile.totalXp += xpEarned
    const result: Partial<AgentDecisions> = {}
    for (const agent of this.agents) {
      if (agent.getSessionEndDecisions) {
        Object.assign(result, agent.getSessionEndDecisions(this.context))
      }
    }
    saveProfile(this.profile)
    return result
  }

  getProfile(): LearnerProfile {
    return this.profile
  }

  getContext(): AgentContext {
    return this.context
  }

  private updatePerformance(event: GameEvent): SessionPerformance {
    const perf = { ...this.context.sessionPerformance }
    const record: PerQuestionRecord = {
      questionIndex: event.sessionQuestionIndex,
      questionId: event.question.instruction + event.question.correctAnswer,
      questionType: event.question.type,
      correct: event.type === "answer_correct",
      timeToAnswerMs: event.timeToAnswerMs,
      difficultyAtTime: this.context.difficulty.level,
    }
    perf.questions = [...perf.questions, record]
    if (event.type === "answer_correct") perf.correct++
    if (event.type === "answer_wrong") perf.wrong++
    const answered = perf.correct + perf.wrong
    perf.accuracy = answered > 0 ? perf.correct / answered : 0
    perf.bestStreak = Math.max(perf.bestStreak, event.currentStreak)
    perf.avgTimeToAnswer = perf.questions.reduce((s, q) => s + q.timeToAnswerMs, 0) / perf.questions.length
    return perf
  }

  private updateProfileAfterEvent(event: GameEvent) {
    const key = event.question.instruction + event.question.correctAnswer
    const existing = this.profile.questionHistory[key]
    const entry: QuestionHistoryEntry = existing
      ? { ...existing, seenCount: existing.seenCount + 1, correctCount: existing.correctCount + (event.type === "answer_correct" ? 1 : 0), timesWrong: existing.timesWrong + (event.type === "answer_wrong" ? 1 : 0), lastSeenAt: Date.now() }
      : { questionKey: key, seenCount: 1, correctCount: event.type === "answer_correct" ? 1 : 0, timesWrong: event.type === "answer_wrong" ? 1 : 0, lastSeenAt: Date.now(), nextReviewAt: Date.now() + 3600000, reviewStage: 0, mastered: false }
    this.profile.questionHistory[key] = entry

    if (event.type === "answer_correct") this.profile.totalCorrect++
    if (event.type === "answer_wrong") this.profile.totalWrong++
    const total = this.profile.totalCorrect + this.profile.totalWrong
    this.profile.averageAccuracy = total > 0 ? this.profile.totalCorrect / total : 0
  }
}
