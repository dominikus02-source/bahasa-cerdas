import { kelasVII } from "./guides-vii"
import { kelasVIII } from "./guides-viii"
import { kelasIX } from "./guides-ix"
import { kelasX } from "./guides-x"
import { kelasXI } from "./guides-xi"
import { kelasXII } from "./guides-xii"

export type { GuideChapter, GradeData, Phase } from "./types"
export { kelasVII, kelasVIII, kelasIX, kelasX, kelasXI, kelasXII }

export const allGrades = [kelasVII, kelasVIII, kelasIX, kelasX, kelasXI, kelasXII]

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
