export type Phase = "A" | "B" | "C" | "D" | "E" | "F"

export type ReviewStatus = "ready" | "needs-review" | "placeholder"

export type SourceBasis = "founder-smp-list" | "cp-atp-research" | "sibi-research" | "internal-review-needed"

export interface TeachingSection {
  textNature: {
    definition: string
    characteristics: string[]
    socialFunction: string
    lifeBenefits: string
    distinction: string
  }
  contentComposition: {
    infoPoints: string[]
    buildingElements: string[]
    mainIdeas: string | string[]
    partRelationships: string
    simpleExample: string
  }
  textVariants: {
    types: string | string[]
    variantDescriptions: { name: string; description: string; example: string }[] | string[]
    groupingBasis: string
  }
  structurePattern: {
    generalPattern: { name: string; description: string }[] | string[]
    variationNotes: string
    readingGuide: string
  }
  languageFeatures: {
    register: string
    features: { name: string; description: string; example: string }[] | string[]
    wordChoice: string
    sentencePattern: string
    conjunctions: string
    style: string
    spelling: string
    punctuation: string
  }
  productionProcedure: {
    preProduction: string | string[]
    production: string | string[]
    revision: string | string[]
    editing: string | string[]
    publication: string | string[]
    bestPractices: string | string[]
  }
}

export interface ReadingMultipleChoice {
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  skillTarget: string
}

export interface ReadingShortAnswer {
  question: string
  sampleAnswer: string
  explanation: string
}

export interface ReadingEssay {
  question: string
  guidance: string
  rubricNote: string
}

/**
 * Latihan Berbasis Bacaan (format pedagogik) — untuk kelas X-XII.
 * Memisahkan PG, isian, dan esai dalam array terpisah.
 */
export interface BacaanPractice {
  stimulusTitle: string
  stimulusText: string
  multipleChoice: ReadingMultipleChoice[]
  shortAnswer: ReadingShortAnswer[]
  essay: ReadingEssay[]
  quiz: {
    stimulusExcerpt: string
    multipleChoice: ReadingMultipleChoice[]
    shortAnswer: ReadingShortAnswer[]
    miniEssay: ReadingEssay
  }
}

export interface PracticeQuestion {
  id: string
  type: "pilihan_ganda" | "jawaban_singkat" | "uraian" | "produksi"
  questionText: string
  options?: string[]
  correctAnswer: string | string[]
  explanation: string
  skillTarget: string
  difficulty: "mudah" | "sedang" | "menantang"
}

export interface ReadingPractice {
  title: string
  stimulusTitle: string
  stimulusText: string
  questions: PracticeQuestion[]
}

export interface QuickQuiz {
  title: string
  stimulusTitle?: string
  stimulusText?: string
  questions: PracticeQuestion[]
}

export interface GuideChapter {
  id: string
  slug: string
  grade: string
  phase: Phase
  semester: 1 | 2
  chapterNumber: number
  title: string
  shortTitle: string
  kd: string
  emoji: string
  description: string
  overview: string
  learningGoals: string[]
  keywords: string[]
  suggestedDuration: string
  teachingContent: TeachingSection
  exampleText: {
    title: string
    content: string
    analysis: {
      structure: string
      content: string
      language: string
      strengths: string
      improvements: string
    }
  }
  learningActivities: {
    opening: string[]
    core: string[]
    group: string[]
    individual: string[]
    reflection: string[]
  }
  worksheet: {
    title: string
    purpose: string
    instructions: string[]
    activities: { name: string; items: string[] }[] | string
    studentOutput: string
  }
  assessment: {
    diagnostic: { question: string; purpose: string }[] | string[]
    formative: { method: string; criteria: string[] }[] | string[]
    summative: { type: string; description: string }[] | string[]
  }
  rubric: {
    aspects: { name: string; criteria: { level: string | number; description: string }[] }[]
  }
  differentiation: {
    support: string[]
    regular: string[]
    challenge: string[]
  }
  remedial: string[]
  enrichment: string[]
  teacherNotes: {
    teachingStrategies: string[]
    commonMisconceptions: { misconception: string; correction: string }[]
    feedbackGuide: string[]
    classroomManagement: string[]
  }
  reflection: {
    studentQuestions: string[]
    teacherQuestions: string[]
  }
  readingPractice?: ReadingPractice
  quickQuiz?: QuickQuiz
  /** Opsional — hanya diisi untuk bab yang sudah punya latihan berbasis bacaan (kelas X-XII per Juli 2026). */
  bacaanPractice?: BacaanPractice
  aiContextPrompt: string
  sourceBasis: SourceBasis
  reviewStatus: ReviewStatus
  tags: string[]
  isReady: boolean
}

export interface GradeData {
  grade: string
  label: string
  phase: Phase
  semesters: {
    semester: 1 | 2
    chapters: GuideChapter[]
  }[]
}
