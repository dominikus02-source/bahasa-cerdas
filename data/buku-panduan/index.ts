import { kelasVII } from "./guides-vii"
import { kelasVIII } from "./guides-viii"
import { kelasIX } from "./guides-ix"

export type { GuideChapter, GradeData, Phase } from "./types"
export { kelasVII, kelasVIII, kelasIX }

export const allGrades = [kelasVII, kelasVIII, kelasIX]

export function getChapterById(id: string) {
  for (const grade of allGrades) {
    for (const sem of grade.semesters) {
      for (const ch of sem.chapters) {
        if (ch.id === id) return ch
      }
    }
  }
  return null
}

export function getAllChapters() {
  const chapters: {
    grade: string
    semester: number
    chapter: (typeof allGrades)[0]["semesters"][0]["chapters"][0]
  }[] = []
  for (const grade of allGrades) {
    for (const sem of grade.semesters) {
      for (const ch of sem.chapters) {
        chapters.push({ grade: grade.grade, semester: sem.semester, chapter: ch })
      }
    }
  }
  return chapters
}
