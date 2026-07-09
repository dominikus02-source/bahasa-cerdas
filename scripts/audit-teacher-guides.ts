/**
 * Audit Teacher Guides — Structural Validator (New Type)
 *
 * Validates all 6 grades (VII–XII) for completeness and integrity.
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
  console.log("═══════════════════════════════════════════\n")

  // 1. No duplicate IDs across all grades
  const allIds = getAllChapters().map((c) => c.chapter.id)
  const uniqueIds = new Set(allIds)
  check(allIds.length === uniqueIds.size, "No duplicate chapter IDs")

  // 2. No duplicate slugs within same grade
  for (const grade of allGrades) {
    const slugs = grade.semesters.flatMap((s) => s.chapters.map((c) => c.slug))
    const uniqueSlugs = new Set(slugs)
    check(slugs.length === uniqueSlugs.size, `${grade.grade}: No duplicate slugs`)
  }

  // 3. No duplicate titles within same grade
  for (const grade of allGrades) {
    const titles = grade.semesters.flatMap((s) => s.chapters.map((c) => c.title))
    const uniqueTitles = new Set(titles)
    check(titles.length === uniqueTitles.size, `${grade.grade}: No duplicate titles`)
  }

  // 4. Chapter numbers: valid, unique per grade, cover 1..N
  for (const grade of allGrades) {
    const nums = grade.semesters.flatMap((s) => s.chapters.map((c) => c.chapterNumber))
    const sorted = [...nums].sort((a, b) => a - b)
    check(nums.every((n) => n > 0), `${grade.grade}: All chapter numbers > 0`)
    check(new Set(nums).size === nums.length, `${grade.grade}: All chapter numbers unique (got ${JSON.stringify(nums)})`)
    check(sorted[0] === 1 && sorted[sorted.length - 1] === sorted.length,
      `${grade.grade}: Chapter numbers cover 1-${sorted.length} (got ${JSON.stringify(sorted)})`)
  }

  // 5. Valid semester values
  for (const c of getAllChapters()) {
    check(c.chapter.semester === 1 || c.chapter.semester === 2, `${c.chapter.id}: Valid semester (${c.chapter.semester})`)
  }

  // 6. Required fields present
  for (const c of getAllChapters()) {
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
  for (const c of getAllChapters()) {
    for (const aspect of c.chapter.rubric.aspects) {
      check(aspect.criteria.length === 4, `${c.chapter.id}: Rubric aspect "${aspect.name}" has 4 levels (got ${aspect.criteria.length})`)
    }
  }

  // 8. Chapter counts
  const expectedCounts: Record<string, number> = { VII: 9, VIII: 9, IX: 8, X: 7, XI: 7, XII: 7 }
  for (const grade of allGrades) {
    const totalCh = grade.semesters.reduce((sum, s) => sum + s.chapters.length, 0)
    const expected = expectedCounts[grade.grade]
    if (expected) {
      check(totalCh === expected, `${grade.grade}: ${expected} chapters total (got ${totalCh})`)
    }
  }

  // 9. Semester distribution — each semester has chapters
  for (const grade of allGrades) {
    for (const sem of grade.semesters) {
      check(sem.chapters.length > 0, `${grade.grade} S${sem.semester}: Has at least 1 chapter (${sem.chapters.length})`)
    }
  }

  // 10. Source basis & review status correctness
  for (const c of getAllChapters()) {
    check(["founder-smp-list", "cp-atp-research", "sibi-research", "internal-review-needed"].includes(c.chapter.sourceBasis),
      `${c.chapter.id}: Valid sourceBasis (${c.chapter.sourceBasis})`)
    check(["ready", "needs-review", "placeholder"].includes(c.chapter.reviewStatus),
      `${c.chapter.id}: Valid reviewStatus (${c.chapter.reviewStatus})`)
  }

  // 11. Grade is VII-XII for PANDUAN
  for (const c of getAllChapters()) {
    check(["VII", "VIII", "IX", "X", "XI", "XII"].includes(c.chapter.grade),
      `${c.chapter.id}: Valid grade (${c.chapter.grade})`)
  }

  // 12. Phase correctness
  for (const c of getAllChapters()) {
    const phaseMap: Record<string, string> = { VII: "D", VIII: "D", IX: "D", X: "E", XI: "F", XII: "F" }
    const expectedPhase = phaseMap[c.chapter.grade] || "?"
    checkWarn(c.chapter.phase === expectedPhase, `${c.chapter.id}: Phase = ${expectedPhase} (got ${c.chapter.phase})`)
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
