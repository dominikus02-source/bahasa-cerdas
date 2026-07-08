export type Phase = "A" | "B" | "C" | "D" | "E" | "F"

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
  learningGoals: string[]
  keyConcepts: {
    definition: string
    characteristics: string[]
    structure: { name: string; description: string }[]
    languageFeatures: string[]
    examples: { label: string; content: string; analysis?: string }[]
  }
  languageFocus: {
    aspects: string[]
    notes?: string
  }
  activities: {
    opening: string[]
    core: string[]
    group: string[]
    reflection: string[]
  }
  studentTasks: { type: string; description: string }[]
  assessment: {
    diagnostic: { question: string; purpose: string }[]
    formative: { method: string; criteria: string[] }[]
    summative: { type: string; description: string }[]
  }
  rubric: {
    aspects: { name: string; criteria: { level: string; description: string }[] }[]
  }
  differentiation: {
    support: string[]
    challenge: string[]
  }
  remedial: string[]
  enrichment: string[]
  teacherNotes: string[]
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
