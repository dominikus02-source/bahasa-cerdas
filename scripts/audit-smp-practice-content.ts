import { kelasVII } from "../data/buku-panduan/guides-vii"
import { kelasVIII } from "../data/buku-panduan/guides-viii"
import { kelasIX } from "../data/buku-panduan/guides-ix"
import type { GradeData } from "../data/buku-panduan/types"

const GRADES: Record<string, { data: GradeData; file: string }> = {
  VII: { data: kelasVII, file: "guides-vii.ts" },
  VIII: { data: kelasVIII, file: "guides-viii.ts" },
  IX: { data: kelasIX, file: "guides-ix.ts" },
}

let passed = 0
let failed = 0
let warnings = 0

function check(condition: boolean, label: string) {
  if (condition) { passed++; return }
  console.error(`  ❌ ${label}`)
  failed++
}

function warn(condition: boolean, label: string) {
  if (condition) { passed++; return }
  console.error(`  ⚠️  ${label}`)
  warnings++
}

function getChapters(data: GradeData) {
  return data.semesters.flatMap(s => s.chapters)
}

console.log("=".repeat(60))
console.log("AUDIT: SMP Practice Content (readingPractice & quickQuiz)")
console.log("=".repeat(60))

  for (const [label, { data, file }] of Object.entries(GRADES)) {
  const chapters = getChapters(data)
  console.log(`\n📘 ${label} (${file}) — ${chapters.length} chapters`)

  for (const ch of chapters) {
    const rp = ch.readingPractice
    const qq = ch.quickQuiz

    // Field existence
    check(rp !== undefined, `[${ch.id}] readingPractice exists`)
    check(qq !== undefined, `[${ch.id}] quickQuiz exists`)

    if (!rp || !qq) continue

    // readingPractice structure
    check(typeof rp.title === "string" && rp.title.length > 0, `[${ch.id}] readingPractice.title is non-empty string`)
    check(typeof rp.stimulusTitle === "string" && rp.stimulusTitle.length > 0, `[${ch.id}] readingPractice.stimulusTitle exists`)
    check(typeof rp.stimulusText === "string" && rp.stimulusText.length >= 100, `[${ch.id}] readingPractice.stimulusText >= 100 chars`)
    check(Array.isArray(rp.questions), `[${ch.id}] readingPractice.questions is array`)
    check(rp.questions.length >= 12 && rp.questions.length <= 15, `[${ch.id}] readingPractice questions count ${rp.questions.length} (expect 12-15)`)
    warn(rp.questions.length >= 13 || rp.questions.length >= 14, `[${ch.id}] readingPractice questions count >= 13/14/15`)

    // quickQuiz structure
    check(typeof qq.title === "string" && qq.title.length > 0, `[${ch.id}] quickQuiz.title is non-empty string`)
    check(Array.isArray(qq.questions), `[${ch.id}] quickQuiz.questions is array`)
    check(qq.questions.length >= 10 && qq.questions.length <= 12, `[${ch.id}] quickQuiz questions count ${qq.questions.length} (expect 10-12)`)

    // Validate questions
    const allQuestions = [...rp.questions, ...qq.questions]
    const ids = new Set<string>()
    const validTypes = new Set(["pilihan_ganda", "jawaban_singkat", "uraian", "produksi"])
    const validDifficulties = new Set(["mudah", "sedang", "menantang"])

    for (const q of allQuestions) {
      check(typeof q.id === "string" && q.id.length > 0, `[${ch.id}] question has id`)
      check(validTypes.has(q.type), `[${ch.id}] question ${q.id}: valid type "${q.type}"`)
      check(typeof q.questionText === "string" && q.questionText.length > 0, `[${ch.id}] question ${q.id}: has questionText`)
      check(typeof q.explanation === "string" && q.explanation.length > 0, `[${ch.id}] question ${q.id}: has explanation`)
      check(typeof q.skillTarget === "string" && q.skillTarget.length > 0, `[${ch.id}] question ${q.id}: has skillTarget`)
      check(validDifficulties.has(q.difficulty), `[${ch.id}] question ${q.id}: valid difficulty "${q.difficulty}"`)
      check(!ids.has(q.id), `[${ch.id}] question ${q.id}: unique in chapter`)
      ids.add(q.id)

      if (q.type === "pilihan_ganda") {
        check(Array.isArray(q.options) && q.options.length >= 3, `[${ch.id}] question ${q.id}: has >=3 options`)
        if (Array.isArray(q.options)) {
          check(q.options.includes(q.correctAnswer as string), `[${ch.id}] question ${q.id}: correctAnswer in options`)
        }
        check(typeof q.correctAnswer === "string", `[${ch.id}] question ${q.id}: correctAnswer is string`)
      } else {
        check(typeof q.correctAnswer === "string" || Array.isArray(q.correctAnswer), `[${ch.id}] question ${q.id}: correctAnswer is string|array`)
      }
    }

    // Difficulty distribution
    const rpEasy = rp.questions.filter(q => q.difficulty === "mudah").length
    const rpMedium = rp.questions.filter(q => q.difficulty === "sedang").length
    const rpHard = rp.questions.filter(q => q.difficulty === "menantang").length
    warn(rpEasy >= 3, `[${ch.id}] readingPractice: >=3 mudah (got ${rpEasy})`)
    warn(rpMedium >= 3, `[${ch.id}] readingPractice: >=3 sedang (got ${rpMedium})`)
    warn(rpHard >= 1, `[${ch.id}] readingPractice: >=1 menantang (got ${rpHard})`)

    // Type mix
    const pgCount = rp.questions.filter(q => q.type === "pilihan_ganda").length
    const otherCount = rp.questions.filter(q => q.type !== "pilihan_ganda").length
    warn(pgCount >= 8, `[${ch.id}] readingPractice: >=8 PG (got ${pgCount})`)
    warn(otherCount >= 1, `[${ch.id}] readingPractice: >=1 non-PG (got ${otherCount})`)
  }
}

console.log("\n" + "=".repeat(60))
console.log(`RESULTS: ${passed} passed, ${failed} failed, ${warnings} warnings`)
console.log("=".repeat(60))
if (failed > 0) process.exit(1)
