import { PrismaClient } from "@prisma/client"

const db = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL || process.env.DATABASE_URL } },
})

interface Question {
  id: string
  tipe: string
  soal: string
  opsi?: string[]
  jawaban: string | number
  penjelasan?: string
}

interface Unit {
  id: string
  title: string
  level: { title: string } | null
  content: string | null
}

async function main() {
  console.log("=== Jalur Cerdas — Question Validation ===\n")

  const units = await db.learningUnit.findMany({
    where: { isActive: true, level: { type: "JALUR" } },
    select: { id: true, title: true, content: true, level: { select: { title: true } } },
    orderBy: [{ level: { level: "asc" } }, { order: "asc" }],
  })

  console.log(`Found ${units.length} JALUR units\n`)

  let totalQuestions = 0
  let issues: string[] = []
  let questionsPerUnit: { unit: string; count: number }[] = []
  let typeCount: Record<string, number> = {}

  for (const unit of units) {
    let konten: any = null
    try { konten = JSON.parse(unit.content || "{}") } catch { continue }

    if (!konten?.questions || !Array.isArray(konten.questions)) {
      issues.push(`⚠  No questions array in "${unit.title}"`)
      continue
    }

    if (konten.questions.length === 0) {
      issues.push(`⚠  Empty questions array in "${unit.title}"`)
      continue
    }

    questionsPerUnit.push({ unit: unit.title, count: konten.questions.length })

    for (const q of konten.questions as Question[]) {
      totalQuestions++

      typeCount[q.tipe] = (typeCount[q.tipe] || 0) + 1

      if (!q.tipe || !["pilihan_ganda", "benar_salah", "isi_blank"].includes(q.tipe)) {
        issues.push(`✗ [INVALID TYPE] "${q.tipe}" in "${unit.title}" (id: ${q.id?.substring(0, 12)})`)
      }

      if (!q.soal || String(q.soal).trim() === "") {
        issues.push(`✗ [EMPTY SOAL] in "${unit.title}" (id: ${q.id?.substring(0, 12)})`)
      }

      if (q.tipe === "pilihan_ganda") {
        if (!q.opsi || !Array.isArray(q.opsi) || q.opsi.length < 2) {
          issues.push(`✗ [BAD OPTIONS] ${q.opsi?.length || 0} options in "${unit.title}" (id: ${q.id?.substring(0, 12)})`)
        }
      }

      if (q.tipe === "benar_salah") {
        if (!["Benar", "Salah"].includes(String(q.jawaban))) {
          issues.push(`✗ [BAD BOOLEAN ANSWER] "${q.jawaban}" in "${unit.title}" (id: ${q.id?.substring(0, 12)})`)
        }
      }
    }
  }

  // Report units with < 3 questions
  for (const { unit, count } of questionsPerUnit) {
    if (count < 3) {
      issues.push(`⚠  Only ${count} questions in "${unit}" (min recommended: 3)`)
    }
  }

  console.log(`Total questions: ${totalQuestions}`)

  const sortedTypes = Object.entries(typeCount).sort((a, b) => b[1] - a[1])
  console.log(`Question types:`)
  for (const [tipe, count] of sortedTypes) {
    console.log(`  ${tipe}: ${count}`)
  }

  const sortedUnits = questionsPerUnit.sort((a, b) => b.count - a.count)
  console.log(`\nUnits per question count:`)
  const countBuckets: Record<string, number> = {}
  for (const { count } of sortedUnits) {
    const key = count <= 3 ? "≤3" : count <= 5 ? "4-5" : count <= 8 ? "6-8" : "9+"
    countBuckets[key] = (countBuckets[key] || 0) + 1
  }
  for (const [bucket, c] of Object.entries(countBuckets).sort()) {
    console.log(`  ${bucket} questions: ${c} units`)
  }

  console.log(`\n--- Issues (${issues.length}) ---`)
  if (issues.length === 0) {
    console.log("✅ No issues found!")
  } else {
    for (const issue of issues) {
      if (issue.startsWith("⚠")) continue
      console.log(issue)
    }
    console.log()
    for (const issue of issues) {
      if (issue.startsWith("⚠")) console.log(issue)
    }
  }

  console.log(`\nPASS: ${issues.filter(i => i.startsWith("✗")).length === 0 ? "✅" : "✗"}`)
  console.log(`${totalQuestions} questions verified across ${units.length} units`)

  if (issues.some(i => i.startsWith("✗"))) process.exit(1)

  await db.$disconnect()
}

main().catch((e) => {
  console.error("Validation failed:", e.message?.substring(0, 200))
  process.exit(1)
})
