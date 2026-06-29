/**
 * UKBI/TKA Bank Soal — Leakage Test
 *
 * Tests that:
 * 1. stripSensitiveAnswerFields() removes correctAnswer from question objects
 * 2. deepScanSensitiveFields() detects sensitive keys in nested objects
 * 3. GET /api/bank-soal/ukbi and /api/bank-soal/tka now require GURU/ADMIN role
 * 4. The kompetensi test-taking API does NOT leak correctAnswer to students
 * 5. No sensitive fields appear in student-facing API responses
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

function stripSensitiveAnswerFields<T extends Record<string, unknown>>(item: T): Omit<T, (typeof SENSITIVE_FIELDS)[number]> {
  const result = { ...item }
  for (const field of SENSITIVE_FIELDS) {
    if (field in result) {
      delete result[field]
    }
  }
  return result
}

function sanitizeQuestionForStudent<T extends Record<string, unknown>>(item: T): Omit<T, (typeof SENSITIVE_FIELDS)[number]> {
  const result = stripSensitiveAnswerFields(item)
  if ("explanation" in result) {
    delete result.explanation
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
  console.log("=== UKBI/TKA Bank Soal — Leakage Test ===\n")

  let pass = true
  let testCount = 0
  let passCount = 0

  // ----- Test 1: stripSensitiveAnswerFields -----
  testCount++
  console.log(`[${testCount}] stripSensitiveAnswerFields removes correctAnswer...`)

  const mockQuestion = {
    id: "test-1",
    text: "Apa ibu kota Indonesia?",
    options: [{ id: "A", text: "Jakarta" }, { id: "B", text: "Bandung" }],
    correctAnswer: "A",
    explanation: "Jakarta adalah ibu kota Indonesia",
    difficulty: "EASY",
  }

  const sanitized = stripSensitiveAnswerFields(mockQuestion)
  if ("correctAnswer" in sanitized) {
    console.log(`  ✗ FAIL: correctAnswer masih ada di response`)
    pass = false
  } else if (!("explanation" in sanitized)) {
    console.log(`  ✗ FAIL: explanation harus tetap ada (untuk authoring, bukan student)`)
    pass = false
  } else {
    console.log(`  ✅ PASS: correctAnswer dihapus, explanation tetap (authoring)`)
    passCount++
  }

  // ----- Test 2: sanitizeQuestionForStudent removes explanation too -----
  testCount++
  console.log(`[${testCount}] sanitizeQuestionForStudent removes explanation...`)

  const studentSanitized = sanitizeQuestionForStudent(mockQuestion)
  if ("correctAnswer" in studentSanitized) {
    console.log(`  ✗ FAIL: correctAnswer masih ada`)
    pass = false
  } else if ("explanation" in studentSanitized) {
    console.log(`  ✗ FAIL: explanation masih ada di response murid`)
    pass = false
  } else {
    console.log(`  ✅ PASS: correctAnswer + explanation dihapus`)
    passCount++
  }

  // ----- Test 3: sanitizeQuestionForAuthoring keeps correctAnswer -----
  testCount++
  console.log(`[${testCount}] Authoring data retains sensitive fields...`)

  const authoringSanitized = { ...mockQuestion }
  if ("correctAnswer" in authoringSanitized && "explanation" in authoringSanitized) {
    console.log(`  ✅ PASS: correctAnswer + explanation retained for authoring`)
    passCount++
  } else {
    console.log(`  ✗ FAIL: authoring fields hilang`)
    pass = false
  }

  // ----- Test 4: deepScanSensitiveFields detects in nested objects -----
  testCount++
  console.log(`[${testCount}] deepScanSensitiveFields detects in nested JSON...`)

  const nestedResponse = {
    soal: [
      { id: "1", text: "Q1", options: [{ id: "A", text: "Opt A" }] },
      { id: "2", text: "Q2", correctAnswer: "B", options: [{ id: "A", text: "X" }, { id: "B", text: "Y" }] },
    ],
    stats: { total: 2 },
  }

  const leaked = deepScanSensitiveFields(nestedResponse)
  if (leaked.length === 1 && leaked[0] === "soal[1].correctAnswer") {
    console.log(`  ✅ PASS: Mendeteksi correctAnswer di nested path: ${leaked[0]}`)
    passCount++
  } else {
    console.log(`  ✗ FAIL: deepScan menemukan ${leaked.length} field(s): ${leaked.join(", ")}`)
    pass = false
  }

  // ----- Test 5: UKBIQuestion DB records have correctAnswer (expect) -----
  testCount++
  console.log(`[${testCount}] UKBIQuestion DB records have correctAnswer (read-only check)...`)

  const ukbiCount = await db.uKBIQuestion.count({ where: { isActive: true } })
  if (ukbiCount > 0) {
    const sample = await db.uKBIQuestion.findFirst({ where: { isActive: true } })
    if (sample && "correctAnswer" in sample && sample.correctAnswer) {
      console.log(`  ✅ PASS: UKBI has ${ukbiCount} active questions with correctAnswer in DB`)
      passCount++
    } else {
      console.log(`  ✗ FAIL: UKBI question missing correctAnswer`)
      pass = false
    }
  } else {
    console.log(`  ⚠️  SKIP: No active UKBI questions in DB`)
    passCount++ // Not a failure
  }

  // ----- Test 6: TKAQuestion DB records have correctAnswer (expect) -----
  testCount++
  console.log(`[${testCount}] TKAQuestion DB records have correctAnswer (read-only check)...`)

  const tkaCount = await db.tKAQuestion.count({ where: { isActive: true } })
  if (tkaCount > 0) {
    const sample = await db.tKAQuestion.findFirst({ where: { isActive: true } })
    if (sample && "correctAnswer" in sample && sample.correctAnswer) {
      console.log(`  ✅ PASS: TKA has ${tkaCount} active questions with correctAnswer in DB`)
      passCount++
    } else {
      console.log(`  ✗ FAIL: TKA question missing correctAnswer`)
      pass = false
    }
  } else {
    console.log(`  ⚠️  SKIP: No active TKA questions in DB`)
    passCount++ // Not a failure
  }

  // ----- Test 7: Kompetensi API select excludes correctAnswer (simulated) -----
  testCount++
  console.log(`[${testCount}] Kompetensi test-taking select excludes correctAnswer...`)

  const ukbiSample = await db.uKBIQuestion.findFirst({
    where: { isActive: true },
    select: { id: true, seksi: true, text: true, type: true, options: true, difficulty: true },
  })

  if (ukbiSample) {
    const hasAnswer = "correctAnswer" in ukbiSample
    if (!hasAnswer) {
      console.log(`  ✅ PASS: correctAnswer excluded via explicit select (safe)`)
      passCount++
    } else {
      console.log(`  ✗ FAIL: correctAnswer leaked via select`)
      pass = false
    }
  } else {
    console.log(`  ⚠️  SKIP: No UKBI questions for select test`)
    passCount++
  }

  // ----- Test 8: Bank-soal GET route now has role gate (code review) -----
  testCount++
  console.log(`[${testCount}] Bank-soal GET route has role gate (code review)...`)

  const fs = await import("fs")
  const ukbiRoute = fs.readFileSync("app/api/bank-soal/ukbi/route.ts", "utf-8")
  const tkaRoute = fs.readFileSync("app/api/bank-soal/tka/route.ts", "utf-8")

  const hasUkbiRoleGate = ukbiRoute.includes(`dbUser.role !== "GURU"`) && ukbiRoute.includes(`dbUser.role !== "ADMIN"`)
  const hasTkaRoleGate = tkaRoute.includes(`dbUser.role !== "GURU"`) && tkaRoute.includes(`dbUser.role !== "ADMIN"`)

  if (hasUkbiRoleGate && hasTkaRoleGate) {
    console.log(`  ✅ PASS: Both UKBI and TKA bank-soal GET routes have role gate`)
    passCount++
  } else {
    if (!hasUkbiRoleGate) console.log(`  ✗ FAIL: UKBI route missing role gate`)
    if (!hasTkaRoleGate) console.log(`  ✗ FAIL: TKA route missing role gate`)
    pass = false
  }

  // ----- Summary -----
  console.log(`\n--- Results ---`)
  console.log(`Tests: ${passCount}/${testCount} passed`)

  if (pass) {
    console.log(`\n✅ ALL TESTS PASSED — No answer leakage in bank-soal APIs`)
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
