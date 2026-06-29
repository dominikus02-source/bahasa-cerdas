export interface QuestionSnapshot {
  id: string
  product: "UKBI" | "TKA" | string
  section?: string
  type: string
  text: string
  options: Array<{ id: string; text: string }>
  correctAnswer: string
  difficulty?: string | number
  weight?: number
  seksi?: string
  kompetensi?: string
  tags?: string[]
}

export interface AttemptSnapshot {
  version: "1.0"
  createdAt: string
  seed: string
  paketId: string
  userId: string
  questionOrder: string[]
  questions: QuestionSnapshot[]
}

export interface UserAnswerRecord {
  questionId: string
  selectedOptionId?: string
  selectedAnswer?: string
  isCorrect?: boolean
  score?: number
  section?: string
  kompetensi?: string
}

export interface AttemptAnswerDetails {
  version: "1.0"
  attemptId: string
  sessionId?: string
  paketId: string
  userId: string
  product: "UKBI" | "TKA" | string
  startedAt: string
  submittedAt: string
  seed: string
  snapshot?: AttemptSnapshot
  userAnswers: UserAnswerRecord[]
  scoring: {
    totalQuestions: number
    correctCount: number
    rawScore: number
    percentage: number
    scaledScore?: number
    predicate?: string
    sectionBreakdown?: Record<string, unknown>
    competencyBreakdown?: Record<string, unknown>
  }
  audit: {
    scoredFromSnapshot: true
    liveDbFallbackUsed: boolean
    snapshotVersion: "1.0"
  }
}

export interface ResultSummary {
  attemptId: string
  attemptNumber: number
  submittedAt: string
  totalScore: number
  percentage: number
  predicate?: string
  predikatLama?: string
  benar: number
  salah: number
  total: number
  sectionScores?: Record<string, unknown>
}
