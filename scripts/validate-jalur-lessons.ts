/**
 * Jalur Cerdas — Micro Lesson Validator
 *
 * Checks all 72 JALUR units for:
 * - lesson exists
 * - lesson title, summary, explanation present
 * - examples present
 * - tips present
 * - levelBand valid
 * - questions still intact
 */

import { PrismaClient } from "@prisma/client"

const db = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } })

const VALID_BANDS = ["dasar", "menengah", "tinggi"]

interface Lesson {
  title: string
  levelBand: string
  summary: string
  explanation: string
  examples: { label: string; text: string; note?: string }[]
  tips: string[]
  beforePracticePrompt: string
}

async function main() {
  console.log("=== Jalur Cerdas — Micro Lesson Validation ===\n")

  const units = await db.learningUnit.findMany({
    where: { isActive: true, level: { type: "JALUR" } },
    select: { id: true, title: true, content: true, level: { select: { level: true, title: true } } },
    orderBy: [{ level: { level: "asc" } }, { order: "asc" }],
  })

  console.log(`Checking ${units.length} JALUR units...\n`)

  let issues: string[] = []
  let lessonCount = 0
  let questionsPreserved = 0
  let bandCount: Record<string, number> = {}

  for (const unit of units) {
    let konten: any = null
    try { konten = JSON.parse(unit.content || "{}") } catch {
      issues.push(`✗ Cannot parse content for "${unit.title}"`)
      continue
    }

    const lesson: Lesson | undefined = konten?.lesson
    const questions = konten?.questions

    // Check lesson exists
    if (!lesson) {
      issues.push(`✗ Missing lesson in "${unit.title}"`)
      continue
    }

    lessonCount++
    const band = lesson.levelBand
    bandCount[band] = (bandCount[band] || 0) + 1

    // Check levelBand valid
    if (!VALID_BANDS.includes(band)) {
      issues.push(`✗ Invalid levelBand "${band}" in "${unit.title}"`)
    }

    // Check band matches level
    const level = unit.level?.level || 0
    const expectedBand = level <= 4 ? "dasar" : level <= 8 ? "menengah" : "tinggi"
    if (band !== expectedBand) {
      issues.push(`✗ Band mismatch: "${band}" (expected "${expectedBand}" for level ${level}) in "${unit.title}"`)
    }

    // Check required fields
    if (!lesson.title) issues.push(`✗ Missing lesson.title in "${unit.title}"`)
    if (!lesson.summary) issues.push(`✗ Missing lesson.summary in "${unit.title}"`)
    if (!lesson.explanation) issues.push(`✗ Missing lesson.explanation in "${unit.title}"`)
    if (!lesson.beforePracticePrompt) issues.push(`✗ Missing beforePracticePrompt in "${unit.title}"`)

    // Check examples
    if (!lesson.examples || !Array.isArray(lesson.examples) || lesson.examples.length === 0) {
      issues.push(`✗ Missing or empty examples in "${unit.title}"`)
    } else {
      for (let i = 0; i < lesson.examples.length; i++) {
        if (!lesson.examples[i].label) issues.push(`✗ Example ${i + 1} missing label in "${unit.title}"`)
        if (!lesson.examples[i].text) issues.push(`✗ Example ${i + 1} missing text in "${unit.title}"`)
      }
    }

    // Check tips
    if (!lesson.tips || !Array.isArray(lesson.tips) || lesson.tips.length === 0) {
      issues.push(`✗ Missing or empty tips in "${unit.title}"`)
    }

    // Check questions preserved
    if (!questions || !Array.isArray(questions)) {
      issues.push(`✗ Questions array missing in "${unit.title}" — QUESTIONS LOST!`)
    } else {
      questionsPreserved += questions.length
    }
  }

  console.log(`\n--- Results ---`)
  console.log(`Units with lessons: ${lessonCount}/${units.length}`)
  console.log(`Questions preserved: ${questionsPreserved}`)
  console.log(`\nLevel band distribution:`)
  for (const [band, count] of Object.entries(bandCount)) {
    console.log(`  ${band}: ${count} units`)
  }

  console.log(`\n--- Issues (${issues.length}) ---`)
  if (issues.length === 0) {
    console.log("✅ No issues found!")
  } else {
    for (const issue of issues) {
      console.log(issue)
    }
  }

  const pass = issues.length === 0
  console.log(`\n${pass ? "✅ PASS" : "✗ FAIL"}`)

  if (!pass) process.exit(1)

  await db.$disconnect()
}

main().catch((e) => {
  console.error("Validation failed:", e.message?.substring(0, 200))
  process.exit(1)
})
