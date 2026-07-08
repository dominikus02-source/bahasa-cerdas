/**
 * Audit Teacher Guides — Structural Validator
 *
 * Validates canonical data for completeness and integrity.
 *
 * Usage:
 *   npx tsx scripts/audit-teacher-guides.ts
 */

import { getAllChapters, allGrades } from "../data/buku-panduan/index"

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

function main() {
  console.log("═══════════════════════════════════════════")
  console.log("  AUDIT TEACHER GUIDES")
  console.log("═══════════════════════════════════════════\n")

  // 1. Check no duplicate IDs across all grades
  const allIds = getAllChapters().map((c) => c.chapter.id)
  const uniqueIds = new Set(allIds)
  check(allIds.length === uniqueIds.size, "No duplicate chapter IDs")

  // 2. Check no duplicate slugs within same grade
  for (const grade of allGrades) {
    const slugs = grade.semesters.flatMap((s) => s.chapters.map((c) => c.slug))
    const uniqueSlugs = new Set(slugs)
    check(slugs.length === uniqueSlugs.size, `${grade.grade}: No duplicate slugs`)
  }

  // 3. Check no duplicate titles within same grade
  for (const grade of allGrades) {
    const titles = grade.semesters.flatMap((s) => s.chapters.map((c) => c.title))
    const uniqueTitles = new Set(titles)
    check(titles.length === uniqueTitles.size, `${grade.grade}: No duplicate titles`)
  }

  // 4. Check consecutive chapter numbers
  for (const grade of allGrades) {
    const allChs = grade.semesters.flatMap((s) => s.chapters)
    const expected = allChs.map((_, i) => i + 1)
    const actual = allChs.map((c) => c.chapterNumber)
    check(
      JSON.stringify(expected) === JSON.stringify(actual),
      `${grade.grade}: Chapter numbers consecutive (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`,
    )
  }

  // 5. Check valid semester values (1 or 2)
  for (const c of getAllChapters()) {
    check(c.chapter.semester === 1 || c.chapter.semester === 2, `${c.chapter.id}: Valid semester (${c.chapter.semester})`)
  }

  // 6. Check all chapters have non-empty required fields
  for (const c of getAllChapters()) {
    const ch = c.chapter
    check(!!ch.id, `${ch.id}: Has id`)
    check(!!ch.title, `${ch.id}: Has title`)
    check(!!ch.shortTitle, `${ch.id}: Has shortTitle`)
    check(!!ch.kd, `${ch.id}: Has KD`)
    check(!!ch.emoji, `${ch.id}: Has emoji`)
    check(!!ch.description, `${ch.id}: Has description`)
    check(ch.learningGoals.length > 0, `${ch.id}: Has learningGoals (${ch.learningGoals.length})`)
    check(ch.keyConcepts.characteristics.length > 0, `${ch.id}: Has keyConcepts.characteristics`)
    check(ch.keyConcepts.structure.length > 0, `${ch.id}: Has keyConcepts.structure`)
    check(ch.keyConcepts.examples.length > 0, `${ch.id}: Has examples`)
    check(ch.activities.opening.length > 0, `${ch.id}: Has activities.opening`)
    check(ch.activities.core.length > 0, `${ch.id}: Has activities.core`)
    check(ch.activities.reflection.length > 0, `${ch.id}: Has activities.reflection`)
    check(ch.studentTasks.length > 0, `${ch.id}: Has studentTasks`)
    check(ch.assessment.diagnostic.length > 0, `${ch.id}: Has assessment.diagnostic`)
    check(ch.assessment.formative.length > 0, `${ch.id}: Has assessment.formative`)
    check(ch.assessment.summative.length > 0, `${ch.id}: Has assessment.summative`)
    check(ch.rubric.aspects.length > 0, `${ch.id}: Has rubric aspects`)
    check(ch.differentiation.support.length > 0, `${ch.id}: Has differentiation.support`)
    check(ch.differentiation.challenge.length > 0, `${ch.id}: Has differentiation.challenge`)
    check(ch.teacherNotes.length > 0, `${ch.id}: Has teacherNotes`)
    check(ch.tags.length > 0, `${ch.id}: Has tags`)
  }

  // 7. Check rubrics have 4 levels
  for (const c of getAllChapters()) {
    for (const aspect of c.chapter.rubric.aspects) {
      check(
        aspect.criteria.length === 4,
        `${c.chapter.id}: Rubric aspect "${aspect.name}" has 4 levels (got ${aspect.criteria.length})`,
      )
    }
  }

  // 8. Check that each grade has correct number of chapters
  const expectedCounts: Record<string, number> = { VII: 7, VIII: 7, IX: 6 }
  for (const grade of allGrades) {
    const totalCh = grade.semesters.reduce((sum, s) => sum + s.chapters.length, 0)
    const expected = expectedCounts[grade.grade]
    if (expected) {
      check(totalCh === expected, `${grade.grade}: ${expected} chapters total (got ${totalCh})`)
    }
  }

  // 9. Check semester distribution
  for (const grade of allGrades) {
    for (const sem of grade.semesters) {
      check(sem.chapters.length > 0, `${grade.grade} S${sem.semester}: Has at least 1 chapter (${sem.chapters.length})`)
    }
  }

  // 10. Check isReady status
  for (const c of getAllChapters()) {
    check(c.chapter.isReady === true, `${c.chapter.id}: isReady = true`)
  }

  console.log(`\n───────────────────────────────────────`)
  console.log(`  RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`)
  console.log(`───────────────────────────────────────`)

  if (failed > 0) {
    process.exit(1)
  } else {
    console.log(`\n✅ All audits passed!`)
    process.exit(0)
  }
}

main()
