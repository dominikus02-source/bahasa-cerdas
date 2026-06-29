/**
 * Jalur Cerdas — Leakage Test
 *
 * Tests that the GET /api/jalur-cerdas/[unitId] sanitization logic
 * properly strips jawaban/correctAnswer from question objects.
 *
 * This tests the transform logic directly (same code used in route.ts):
 *   const { jawaban, ...rest } = q
 *   return rest
 */

import { PrismaClient } from "@prisma/client"

const db = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } })

const LEAKED_FIELDS = ["jawaban", "correctAnswer", "answerKey", "internalNotes", "explanationBeforeSubmit"]

interface Question {
  id: string
  tipe: string
  soal: string
  opsi?: string[]
  jawaban?: string | number
  penjelasan?: string
  [key: string]: unknown
}

function sanitizeQuestions(questions: Question[]): Question[] {
  return questions.map((q: Question) => {
    const { jawaban, ...rest } = q
    return rest
  })
}

async function main() {
  console.log("=== Jalur Cerdas — Leakage Test (Logic) ===\n")

  const units = await db.learningUnit.findMany({
    where: { isActive: true, level: { type: "JALUR" } },
    select: { id: true, title: true, content: true },
  })

  console.log(`Testing sanitization logic on ${units.length} JALUR units...\n`)

  let pass = true
  let totalQuestions = 0
  let totalLeakedAfterSanitize = 0
  let totalJawabanInDb = 0

  for (const unit of units) {
    let konten: any = null
    try { konten = JSON.parse(unit.content || "{}") } catch { continue }
    if (!konten?.questions) continue

    const rawQuestions: Question[] = konten.questions

    // 1. Count raw jawaban (expected: all questions should have jawaban in DB)
    for (const q of rawQuestions) {
      totalQuestions++

      if (!("jawaban" in q) || q.jawaban === undefined || q.jawaban === null) {
        console.log(`  ✗ MISSING jawaban in DB: "${unit.title.substring(0, 40)}" / ${q.id}`)
        pass = false
      } else {
        totalJawabanInDb++
      }
    }

    // 2. Apply sanitization (same logic as API route)
    const sanitized = sanitizeQuestions(rawQuestions)

    // 3. Verify no leaked fields in sanitized output
    for (const q of sanitized) {
      for (const field of LEAKED_FIELDS) {
        if (field in q) {
          console.log(`  ✗ LEAKED "${field}" after sanitize: "${unit.title.substring(0, 40)}" / ${q.id}`)
          totalLeakedAfterSanitize++
          pass = false
        }
      }

      // Check empty soal
      if (!q.soal || String(q.soal).trim() === "") {
        console.log(`  ✗ EMPTY soal: "${unit.title.substring(0, 40)}" / ${q.id}`)
        pass = false
      }

      // Check invalid type
      if (!["pilihan_ganda", "benar_salah", "isi_blank"].includes(q.tipe)) {
        console.log(`  ✗ INVALID tipe "${q.tipe}": "${unit.title.substring(0, 40)}" / ${q.id}`)
        pass = false
      }

      // Check pilihan_ganda options
      if (q.tipe === "pilihan_ganda" && (!q.opsi || q.opsi.length < 2)) {
        console.log(`  ✗ BAD options (${q.opsi?.length || 0}): "${unit.title.substring(0, 40)}" / ${q.id}`)
        pass = false
      }
    }
  }

  console.log(`\n--- Results ---`)
  console.log(`Questions in DB with jawaban: ${totalJawabanInDb}/${totalQuestions}`)
  console.log(`Leaked after sanitization: ${totalLeakedAfterSanitize}`)
  console.log(`\nOverall: ${pass ? "✅ PASS" : "✗ FAIL"}`)

  if (!pass) process.exit(1)

  await db.$disconnect()
}

main().catch((e) => {
  console.error("Test failed:", e.message?.substring(0, 200))
  process.exit(1)
})
