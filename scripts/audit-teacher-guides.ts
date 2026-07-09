/**
 * Audit Teacher Guides — Structural Validator (New Type)
 *
 * Validates all 6 grades (VII–XII) for completeness and integrity.
 *
 * Usage:
 *   npx tsx scripts/audit-teacher-guides.ts             # all grades
 *   npx tsx scripts/audit-teacher-guides.ts --sma        # SMA only (X, XI, XII)
 *   npx tsx scripts/audit-teacher-guides.ts --grade=X    # single grade
 */

import { getAllChapters, allGrades } from "../data/buku-panduan/index"

const SMA_GRADES = new Set(["X", "XI", "XII"])
const GRADE_FILTER = process.argv.find((a) => a.startsWith("--grade="))?.split("=")[1]
const SMA_ONLY = process.argv.includes("--sma")

function gradeInScope(grade: string): boolean {
  if (GRADE_FILTER) return grade === GRADE_FILTER
  if (SMA_ONLY) return SMA_GRADES.has(grade)
  return true
}

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value)
  else if (Array.isArray(value)) value.forEach((v) => collectStrings(v, out))
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collectStrings(v, out))
  return out
}

let passed = 0
let failed = 0

function check(condition: boolean, msg: string) {
  if (condition) {
    passed++
  } else {
    console.error(`  ❌ FAIL: ${msg}`)
    failed++
  }
}

function checkWarn(condition: boolean, msg: string) {
  if (condition) {
    passed++
  } else {
    console.warn(`  ⚠️  WARN: ${msg}`)
    passed++
  }
}

function main() {
  console.log("═══════════════════════════════════════════")
  console.log("  AUDIT TEACHER GUIDES (New Type)")
  if (GRADE_FILTER) console.log(`  Scope: grade ${GRADE_FILTER}`)
  else if (SMA_ONLY) console.log("  Scope: SMA (X, XI, XII)")
  console.log("═══════════════════════════════════════════\n")

  const scopedGrades = allGrades.filter((g) => gradeInScope(g.grade))
  const scopedChapters = getAllChapters().filter((c) => gradeInScope(c.chapter.grade))

  // 1. No duplicate IDs across all grades in scope
  const allIds = scopedChapters.map((c) => c.chapter.id)
  const uniqueIds = new Set(allIds)
  check(allIds.length === uniqueIds.size, "No duplicate chapter IDs")

  // 2. No duplicate slugs within same grade
  for (const grade of scopedGrades) {
    const slugs = grade.semesters.flatMap((s) => s.chapters.map((c) => c.slug))
    const uniqueSlugs = new Set(slugs)
    check(slugs.length === uniqueSlugs.size, `${grade.grade}: No duplicate slugs`)
  }

  // 3. No duplicate titles within same grade
  for (const grade of scopedGrades) {
    const titles = grade.semesters.flatMap((s) => s.chapters.map((c) => c.title))
    const uniqueTitles = new Set(titles)
    check(titles.length === uniqueTitles.size, `${grade.grade}: No duplicate titles`)
  }

  // 4. Chapter numbers: valid, unique per grade, cover 1..N
  for (const grade of scopedGrades) {
    const nums = grade.semesters.flatMap((s) => s.chapters.map((c) => c.chapterNumber))
    const sorted = [...nums].sort((a, b) => a - b)
    check(nums.every((n) => n > 0), `${grade.grade}: All chapter numbers > 0`)
    check(new Set(nums).size === nums.length, `${grade.grade}: All chapter numbers unique (got ${JSON.stringify(nums)})`)
    check(sorted[0] === 1 && sorted[sorted.length - 1] === sorted.length,
      `${grade.grade}: Chapter numbers cover 1-${sorted.length} (got ${JSON.stringify(sorted)})`)
  }

  // 5. Valid semester values
  for (const c of scopedChapters) {
    check(c.chapter.semester === 1 || c.chapter.semester === 2, `${c.chapter.id}: Valid semester (${c.chapter.semester})`)
  }

  // 6. Required fields present
  for (const c of scopedChapters) {
    const ch = c.chapter
    check(!!ch.id, `${ch.id}: Has id`)
    check(!!ch.title, `${ch.id}: Has title`)
    check(!!ch.shortTitle, `${ch.id}: Has shortTitle`)
    check(!!ch.kd, `${ch.id}: Has KD`)
    check(!!ch.emoji, `${ch.id}: Has emoji`)
    check(!!ch.description, `${ch.id}: Has description`)
    check(!!ch.overview, `${ch.id}: Has overview`)
    check(ch.learningGoals.length > 0, `${ch.id}: Has learningGoals (${ch.learningGoals.length})`)
    check(ch.keywords.length > 0, `${ch.id}: Has keywords`)
    check(!!ch.suggestedDuration, `${ch.id}: Has suggestedDuration`)

    // TeachingContent
    const tc = ch.teachingContent
    check(!!tc.textNature.definition, `${ch.id}: Has textNature.definition`)
    check(tc.textNature.characteristics.length >= 3, `${ch.id}: textNature.characteristics >= 3 (${tc.textNature.characteristics.length})`)
    check(!!tc.textNature.socialFunction, `${ch.id}: Has textNature.socialFunction`)
    check(!!tc.textNature.lifeBenefits, `${ch.id}: Has textNature.lifeBenefits`)
    check(!!tc.textNature.distinction, `${ch.id}: Has textNature.distinction`)
    check(tc.contentComposition.infoPoints.length > 0, `${ch.id}: Has contentComposition.infoPoints`)
    check(tc.contentComposition.buildingElements.length > 0, `${ch.id}: Has contentComposition.buildingElements`)
    check(!!tc.contentComposition.simpleExample, `${ch.id}: Has contentComposition.simpleExample`)
    check(tc.structurePattern.generalPattern.length >= 3, `${ch.id}: structurePattern.generalPattern >= 3`)
    check(!!tc.structurePattern.readingGuide, `${ch.id}: Has structurePattern.readingGuide`)
    check(!!tc.languageFeatures.register, `${ch.id}: Has languageFeatures.register`)
    check(tc.languageFeatures.features.length >= 3, `${ch.id}: languageFeatures.features >= 3`)
    check(!!tc.productionProcedure.preProduction, `${ch.id}: Has productionProcedure.preProduction`)
    check(!!tc.productionProcedure.production, `${ch.id}: Has productionProcedure.production`)

    // ExampleText
    check(!!ch.exampleText.title, `${ch.id}: Has exampleText.title`)
    check(!!ch.exampleText.content, `${ch.id}: Has exampleText.content`)
    check(!!ch.exampleText.analysis.structure, `${ch.id}: Has exampleText.analysis.structure`)
    check(!!ch.exampleText.analysis.strengths, `${ch.id}: Has exampleText.analysis.strengths`)

    // LearningActivities
    check(ch.learningActivities.opening.length > 0, `${ch.id}: Has activities.opening`)
    check(ch.learningActivities.core.length > 0, `${ch.id}: Has activities.core`)
    check(ch.learningActivities.individual.length > 0, `${ch.id}: Has activities.individual`)

    // Worksheet
    check(!!ch.worksheet.title, `${ch.id}: Has worksheet.title`)
    check(!!ch.worksheet.purpose, `${ch.id}: Has worksheet.purpose`)
    check(ch.worksheet.instructions.length > 0, `${ch.id}: Has worksheet.instructions`)

    // Assessment
    check(ch.assessment.diagnostic.length > 0, `${ch.id}: Has assessment.diagnostic`)
    check(ch.assessment.formative.length > 0, `${ch.id}: Has assessment.formative`)
    check(ch.assessment.summative.length > 0, `${ch.id}: Has assessment.summative`)

    // Rubric
    check(ch.rubric.aspects.length >= 3, `${ch.id}: Has rubric aspects >= 3 (${ch.rubric.aspects.length})`)

    // Differentiation
    check(ch.differentiation.support.length > 0, `${ch.id}: Has differentiation.support`)
    check(ch.differentiation.regular.length > 0, `${ch.id}: Has differentiation.regular`)
    check(ch.differentiation.challenge.length > 0, `${ch.id}: Has differentiation.challenge`)

    // Remedial & Enrichment
    check(ch.remedial.length > 0, `${ch.id}: Has remedial`)
    check(ch.enrichment.length > 0, `${ch.id}: Has enrichment`)

    // TeacherNotes
    check(ch.teacherNotes.teachingStrategies.length > 0, `${ch.id}: Has teacherNotes.teachingStrategies`)
    check(ch.teacherNotes.commonMisconceptions.length > 0, `${ch.id}: Has teacherNotes.commonMisconceptions`)
    check(ch.teacherNotes.classroomManagement.length > 0, `${ch.id}: Has teacherNotes.classroomManagement`)

    // Reflection
    check(ch.reflection.studentQuestions.length > 0, `${ch.id}: Has reflection.studentQuestions`)
    check(ch.reflection.teacherQuestions.length > 0, `${ch.id}: Has reflection.teacherQuestions`)

    // Metadata
    check(!!ch.aiContextPrompt, `${ch.id}: Has aiContextPrompt`)
    check(!!ch.sourceBasis, `${ch.id}: Has sourceBasis`)
    check(!!ch.reviewStatus, `${ch.id}: Has reviewStatus`)
    check(ch.tags.length > 0, `${ch.id}: Has tags`)
    check(ch.isReady === true, `${ch.id}: isReady = true`)
  }

  // 7. Rubrics have 4 levels per aspect
  for (const c of scopedChapters) {
    for (const aspect of c.chapter.rubric.aspects) {
      check(aspect.criteria.length === 4, `${c.chapter.id}: Rubric aspect "${aspect.name}" has 4 levels (got ${aspect.criteria.length})`)
    }
  }

  // 8. Chapter counts
  const expectedCounts: Record<string, number> = { VII: 9, VIII: 9, IX: 8, X: 7, XI: 7, XII: 7 }
  for (const grade of scopedGrades) {
    const totalCh = grade.semesters.reduce((sum, s) => sum + s.chapters.length, 0)
    const expected = expectedCounts[grade.grade]
    if (expected) {
      check(totalCh === expected, `${grade.grade}: ${expected} chapters total (got ${totalCh})`)
    }
  }

  // 9. Semester distribution — each semester has chapters
  for (const grade of scopedGrades) {
    for (const sem of grade.semesters) {
      check(sem.chapters.length > 0, `${grade.grade} S${sem.semester}: Has at least 1 chapter (${sem.chapters.length})`)
    }
  }

  // 10. Source basis & review status correctness
  for (const c of scopedChapters) {
    check(["founder-smp-list", "cp-atp-research", "sibi-research", "internal-review-needed"].includes(c.chapter.sourceBasis),
      `${c.chapter.id}: Valid sourceBasis (${c.chapter.sourceBasis})`)
    check(["ready", "needs-review", "placeholder"].includes(c.chapter.reviewStatus),
      `${c.chapter.id}: Valid reviewStatus (${c.chapter.reviewStatus})`)
  }

  // 11. Grade is VII-XII for PANDUAN
  for (const c of scopedChapters) {
    check(["VII", "VIII", "IX", "X", "XI", "XII"].includes(c.chapter.grade),
      `${c.chapter.id}: Valid grade (${c.chapter.grade})`)
  }

  // 12. Phase correctness
  for (const c of scopedChapters) {
    const phaseMap: Record<string, string> = { VII: "D", VIII: "D", IX: "D", X: "E", XI: "F", XII: "F" }
    const expectedPhase = phaseMap[c.chapter.grade] || "?"
    checkWarn(c.chapter.phase === expectedPhase, `${c.chapter.id}: Phase = ${expectedPhase} (got ${c.chapter.phase})`)
  }

  // 13. Banned English terms in user-facing content (must use Indonesian equivalents)
  // worksheet→lembar kerja, assessment→asesmen, feedback→umpan balik, activity→aktivitas,
  // student→peserta didik, teacher→guru, quiz→kuis, reading passage→bacaan/stimulus,
  // language features→fitur kebahasaan, prompt/output→kept only as internal AI-context field names.
  const BANNED_ENGLISH = /\b(worksheet|assessment|feedback|activit(y|ies)|students?|teachers?|quiz|reading passage|language features)\b/i
  for (const c of scopedChapters) {
    // Exclude aiContextPrompt (internal AI-facing prompt, not user-facing UI content)
    const { aiContextPrompt: _skip, ...rest } = c.chapter
    const strings = collectStrings(rest)
    const offenders = strings.filter((s) => BANNED_ENGLISH.test(s))
    const isClean = offenders.length === 0
    if (SMA_GRADES.has(c.chapter.grade)) {
      check(isClean, `${c.chapter.id}: No banned English terms in user-facing content${isClean ? "" : ` (found: ${offenders[0]?.slice(0, 80)})`}`)
    } else {
      checkWarn(isClean, `${c.chapter.id}: No banned English terms in user-facing content${isClean ? "" : ` (found: ${offenders[0]?.slice(0, 80)})`}`)
    }
  }

  // 14. Placeholder detection — no unfinished/stub content
  const PLACEHOLDER_PATTERNS = ["TODO", "Coming soon", "Lorem ipsum", "Penjelasan singkat", "Isi materi", "TBD"]
  for (const c of scopedChapters) {
    const strings = collectStrings(c.chapter)
    const found = PLACEHOLDER_PATTERNS.filter((p) => strings.some((s) => s.includes(p)))
    const isClean = found.length === 0
    if (SMA_GRADES.has(c.chapter.grade)) {
      check(isClean, `${c.chapter.id}: No placeholder text${isClean ? "" : ` (found: ${found.join(", ")})`}`)
    } else {
      checkWarn(isClean, `${c.chapter.id}: No placeholder text${isClean ? "" : ` (found: ${found.join(", ")})`}`)
    }
  }

  // 15. Reading-based practice (Latihan Berbasis Bacaan) — mandatory for SMA (X-XII)
  for (const c of scopedChapters) {
    if (!SMA_GRADES.has(c.chapter.grade)) continue
    const rp = c.chapter.readingPractice
    check(!!rp, `${c.chapter.id}: Has readingPractice (bacaan + soal)`)
    if (!rp) continue
    const wordCount = rp.stimulusText.trim().split(/\s+/).length
    check(wordCount >= 300, `${c.chapter.id}: readingPractice.stimulusText >= 300 words (got ${wordCount})`)
    check(rp.multipleChoice.length >= 8 && rp.multipleChoice.length <= 12,
      `${c.chapter.id}: readingPractice.multipleChoice 8-12 (got ${rp.multipleChoice.length})`)
    check(rp.shortAnswer.length >= 3 && rp.shortAnswer.length <= 5,
      `${c.chapter.id}: readingPractice.shortAnswer 3-5 (got ${rp.shortAnswer.length})`)
    check(rp.essay.length >= 2 && rp.essay.length <= 3,
      `${c.chapter.id}: readingPractice.essay 2-3 (got ${rp.essay.length})`)
    check(rp.quiz.multipleChoice.length === 5, `${c.chapter.id}: readingPractice.quiz.multipleChoice = 5 (got ${rp.quiz.multipleChoice.length})`)
    check(rp.quiz.shortAnswer.length === 2, `${c.chapter.id}: readingPractice.quiz.shortAnswer = 2 (got ${rp.quiz.shortAnswer.length})`)
    check(!!rp.quiz.miniEssay?.question, `${c.chapter.id}: readingPractice.quiz.miniEssay present`)
    // Every MCQ must reference a valid option index with explanation + skill target (no bare logic-only questions)
    const validMC = rp.multipleChoice.every((q) => q.correctIndex >= 0 && q.correctIndex < q.options.length && !!q.explanation && !!q.skillTarget)
    check(validMC, `${c.chapter.id}: All readingPractice.multipleChoice items have valid correctIndex, explanation, skillTarget`)
  }

  // 16. needsReview status enforced for SMA (never claimed as founder-final)
  for (const c of scopedChapters) {
    if (!SMA_GRADES.has(c.chapter.grade)) continue
    check(c.chapter.reviewStatus === "needs-review", `${c.chapter.id}: reviewStatus = needs-review (SMA content must never claim founder-final status)`)
    check(c.chapter.sourceBasis !== "founder-smp-list", `${c.chapter.id}: sourceBasis is not founder-smp-list (SMA content is not from the SMP founder list)`)
  }

  console.log(`\n───────────────────────────────────────`)
  console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`)
  console.log(`───────────────────────────────────────`)

  if (failed > 0) {
    console.log(`\n❌ ${failed} failures found`)
    process.exit(1)
  } else {
    console.log(`\n✅ All audits passed!`)
    process.exit(0)
  }
}

main()
