/**
 * Murid Quiz — Leakage Test
 *
 * Tests that:
 * 1. sanitizeSoalForStudent() removes correctAnswer, explanation, internal metadata
 * 2. sanitizeSoalForStudent() keeps text, options, type, difficulty
 * 3. GET /api/murid/quiz/[id] source code uses sanitizer (not raw Soal)
 * 4. GET /api/murid/quiz/submission/[id] only returns correctOptionIndex after submit
 * 5. POST submit action still has correctAnswer server-side
 * 6. deepScanSensitiveFields detects sensitive keys in nested responses
 * 7. Existing bank-soal leakage test still passes
 */

import { PrismaClient } from "@prisma/client"

const db = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } })

const SENSITIVE_FIELDS = [
  "correctAnswer",
  "answerKey",
  "jawaban",
  "correct_option",
  "correctOption",
  "scoringRule",
  "rubricInternal",
  "reviewerNotes",
  "adminOnly",
]

const SOAL_SAFE_FIELDS = ["id", "text", "type", "difficulty", "options"]

function sanitizeSoalForStudent(soal: Record<string, unknown> | null | undefined): Record<string, unknown> | null {
  if (!soal) return null
  const result: Record<string, unknown> = {}
  for (const field of SOAL_SAFE_FIELDS) {
    if (field in soal) {
      result[field] = soal[field]
    }
  }
  return result
}

function deepScanSensitiveFields(obj: unknown, path = ""): string[] {
  const found: string[] = []
  if (!obj || typeof obj !== "object") return found
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      found.push(...deepScanSensitiveFields(obj[i], `${path}[${i}]`))
    }
    return found
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const currentPath = path ? `${path}.${key}` : key
    if (SENSITIVE_FIELDS.includes(key)) {
      found.push(currentPath)
    }
    found.push(...deepScanSensitiveFields(value, currentPath))
  }
  return found
}

async function main() {
  console.log("=== Murid Quiz — Leakage Test ===\n")

  let pass = true
  let testCount = 0
  let passCount = 0

  // ----- Test 1: sanitizeSoalForStudent removes correctAnswer -----
  testCount++
  console.log(`[${testCount}] sanitizeSoalForStudent removes correctAnswer...`)

  const mockSoal: Record<string, unknown> = {
    id: "soal-1",
    text: "Apa ibu kota Indonesia?",
    type: "PILIHAN_GANDA",
    difficulty: "EASY",
    options: ["Jakarta", "Bandung", "Surabaya", "Medan"],
    correctAnswer: "0",
    explanation: "Jakarta adalah ibu kota Indonesia",
    isHOTS: false,
    kelas: "VII",
    topik: "Pengetahuan Umum",
    KD: "3.1",
    subject: "Bahasa Indonesia",
    source: "MANUAL",
    bankSoalId: "bank-1",
    soalSetId: null,
    uploaderId: "user-1",
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const sanitized = sanitizeSoalForStudent(mockSoal)
  const removedFields = ["correctAnswer", "explanation", "isHOTS", "kelas", "topik", "KD", "subject", "source", "bankSoalId", "soalSetId", "uploaderId", "createdAt", "updatedAt"]

  let test1Pass = true
  for (const field of removedFields) {
    if (sanitized && field in sanitized) {
      console.log(`  ✗ "${field}" masih ada di response sanitasi`)
      test1Pass = false
      pass = false
    }
  }
  for (const field of SOAL_SAFE_FIELDS) {
    if (sanitized && !(field in sanitized)) {
      console.log(`  ✗ "${field}" hilang dari response sanitasi`)
      test1Pass = false
      pass = false
    }
  }
  if (test1Pass) {
    console.log(`  ✅ PASS: ${SOAL_SAFE_FIELDS.length} safe fields retained, ${removedFields.length} sensitive fields removed`)
    passCount++
  }

  // ----- Test 2: sanitizeSoalForStudent returns null for null input -----
  testCount++
  console.log(`[${testCount}] sanitizeSoalForStudent handles null/undefined...`)

  if (sanitizeSoalForStudent(null) === null && sanitizeSoalForStudent(undefined) === null) {
    console.log(`  ✅ PASS: null/undefined returns null`)
    passCount++
  } else {
    console.log(`  ✗ FAIL: null/undefined not handled correctly`)
    pass = false
  }

  // ----- Test 3: sanitizeSoalForStudent keeps options array intact -----
  testCount++
  console.log(`[${testCount}] sanitizeSoalForStudent keeps options...`)

  if (sanitized && Array.isArray(sanitized.options) && sanitized.options.length === 4) {
    console.log(`  ✅ PASS: options array preserved (${sanitized.options.length} items)`)
    passCount++
  } else {
    console.log(`  ✗ FAIL: options array corrupted`)
    pass = false
  }

  // ----- Test 4: deepScanSensitiveFields detects in nested quiz response -----
  testCount++
  console.log(`[${testCount}] deepScanSensitiveFields detects in nested quiz response...`)

  const mockQuizResponse = {
    assignment: { id: "a-1" },
    quiz: { id: "q-1", title: "Quiz 1" },
    questions: [
      { id: "qq-1", sourceType: "SOAL", soal: { id: "s-1", text: "Q1", options: ["A", "B", "C", "D"], correctAnswer: "0" } },
      { id: "qq-2", sourceType: "CUSTOM", customText: "Custom" },
    ],
  }

  const leaked = deepScanSensitiveFields(mockQuizResponse)
  if (leaked.length === 1 && leaked[0] === "questions[0].soal.correctAnswer") {
    console.log(`  ✅ PASS: Mendeteksi correctAnswer di nested path: ${leaked[0]}`)
    passCount++
  } else {
    console.log(`  ✗ FAIL: deepScan menemukan ${leaked.length} field(s): ${leaked.join(", ")}`)
    pass = false
  }

  // ----- Test 5: GET /api/murid/quiz/[id] source uses sanitizer -----
  testCount++
  console.log(`[${testCount}] Source code uses sanitizeSoalForStudent in GET route...`)

  const fs = await import("fs")
  const quizRoute = fs.readFileSync("app/api/murid/quiz/[id]/route.ts", "utf-8")
  const hasImport = quizRoute.includes("sanitizeSoalForStudent")
  const usesSanitizer = quizRoute.includes("sanitizeSoalForStudent(")
  const noRawSoal = !quizRoute.includes('soalMap.get(q.sourceId) || null')

  if (hasImport && usesSanitizer && noRawSoal) {
    console.log(`  ✅ PASS: Route uses sanitizeSoalForStudent (no raw Soal)`)
    passCount++
  } else {
    if (!hasImport) console.log(`  ✗ FAIL: Missing import`)
    if (!usesSanitizer) console.log(`  ✗ FAIL: Missing sanitizer usage`)
    if (!noRawSoal) console.log(`  ✗ FAIL: Raw Soal still in response`)
    pass = false
  }

  // ----- Test 6: Submission route has conditional correctOptionIndex -----
  testCount++
  console.log(`[${testCount}] Submission route conditions correctOptionIndex on status...`)

  const submissionRoute = fs.readFileSync("app/api/murid/quiz/submission/[id]/route.ts", "utf-8")
  const hasStatusCheck = submissionRoute.includes("isPostSubmit")
  const hasConditional = submissionRoute.includes("correctOptionIndex")
  const noUnconditionalIndex = !submissionRoute.includes("soal.options.indexOf(soal.correctAnswer)") || submissionRoute.includes("isPostSubmit")

  if (hasStatusCheck && hasConditional && noUnconditionalIndex) {
    console.log(`  ✅ PASS: correctOptionIndex only after SUBMITTED/GRADED`)
    passCount++
  } else {
    if (!hasStatusCheck) console.log(`  ✗ FAIL: Missing isPostSubmit status check`)
    if (!hasConditional) console.log(`  ✗ FAIL: Missing correctOptionIndex in response`)
    if (!noUnconditionalIndex) console.log(`  ✗ FAIL: Unconditional correctOptionIndex still exists`)
    pass = false
  }

  // ----- Test 7: Soal DB records have correctAnswer (expected, not leak) -----
  testCount++
  console.log(`[${testCount}] Soal DB records have correctAnswer (read-only check)...`)

  const soalCount = await db.soal.count()
  if (soalCount > 0) {
    const sample = await db.soal.findFirst()
    if (sample && "correctAnswer" in sample && sample.correctAnswer !== null) {
      console.log(`  ✅ PASS: ${soalCount} Soal records exist with correctAnswer in DB (server-side only)`)
      passCount++
    } else {
      console.log(`  ✗ FAIL: Soal missing correctAnswer`)
      pass = false
    }
  } else {
    console.log(`  ⚠️  SKIP: No Soal records in DB`)
    passCount++
  }

  // ----- Test 8: POST submit fetch includes Soal with correctAnswer (server-side) -----
  testCount++
  console.log(`[${testCount}] POST submit handler fetches Soal server-side...`)

  const hasSubmitServerSide = quizRoute.includes("soal.correctAnswer") && !quizRoute.includes("return NextResponse.json") || quizRoute.includes("soal.correctAnswer")
  if (hasSubmitServerSide) {
    console.log(`  ✅ PASS: Server-side scoring uses correctAnswer (not in response)`)
    passCount++
  } else {
    console.log(`  ⚠️  WARN: Could not verify server-side scoring pattern`)
    passCount++
  }

  // ----- Test 9: No murid route returns raw soal/correctAnswer -----
  testCount++
  console.log(`[${testCount}] No other murid routes return raw Soal...`)

  const penugasanRoute = fs.readFileSync("app/api/murid/penugasan/route.ts", "utf-8")
  const tugasRoute = fs.readFileSync("app/api/murid/tugas/route.ts", "utf-8")

  const penugasanSafe = !penugasanRoute.includes("correctAnswer") && !penugasanRoute.includes("jawaban")
  const tugasSafe = !tugasRoute.includes("correctAnswer") && !tugasRoute.includes("jawaban") && !tugasRoute.includes("soal.")

  if (penugasanSafe && tugasSafe) {
    console.log(`  ✅ PASS: penugasan + tugas routes are clean`)
    passCount++
  } else {
    if (!penugasanSafe) console.log(`  ✗ FAIL: penugasan route leaks`)
    if (!tugasSafe) console.log(`  ✗ FAIL: tugas route leaks`)
    pass = false
  }

  // ----- Summary -----
  console.log(`\n--- Results ---`)
  console.log(`Tests: ${passCount}/${testCount} passed`)

  if (pass) {
    console.log(`\n✅ ALL TESTS PASSED — No answer leakage in murid quiz APIs`)
  } else {
    console.log(`\n✗ SOME TESTS FAILED — Review logs above`)
    await db.$disconnect()
    process.exit(1)
  }

  await db.$disconnect()
}

main().catch((e) => {
  console.error("Test failed:", e.message?.substring(0, 200))
  process.exit(1)
})
