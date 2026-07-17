/**
 * UKBI & TKA Question Bank Audit — Batch 1
 *
 * Validates all JSON files in data/question-bank/ukbi/ and data/question-bank/tka/
 * for structural integrity, content quality, and schema compliance.
 *
 * Run: npx tsx scripts/audit-ukbi-tka-question-bank.ts
 */

import * as fs from "fs"
import * as path from "path"

const BANKS_DIR = path.join(__dirname, "..", "data", "question-bank")

interface QuestionItem {
  id: string
  product: string
  track: string
  section: string
  band: string
  type: string
  difficulty: number
  stem?: string
  passage?: string
  prompt?: string
  options?: { id: string; text: string }[]
  correctAnswer?: string
  explanation?: string
  tags?: string[]
  source: string
  status: string
  cognitive?: string
  domain?: string
  rubric?: any[]
  scoringMode?: string
  wordLimit?: { min: number; max: number }
}

interface BankFile {
  meta: any
  questions: QuestionItem[]
}

const VALID_SECTIONS = ["merespons-kaidah", "membaca", "mendengarkan", "menulis", "berbicara"]
const VALID_COGNITIVE = ["MENGINGAT", "PEMAHAMAN", "PENERAPAN", "ANALISIS", "EVALUASI", "KREASI"]
const VALID_DOMAIN = ["SINTAS", "SOSIAL", "VOKASIONAL", "AKADEMIK"]
const VALID_BANDS = ["TERBATAS", "SEMENJAK", "MADYA", "UNGGUL", "MARGINAL"]

let totalChecks = 0
let passedChecks = 0
let failedChecks = 0
let warnings: string[] = []

function check(condition: boolean, label: string) {
  totalChecks++
  if (condition) {
    passedChecks++
  } else {
    failedChecks++
    console.error(`  ❌ ${label}`)
  }
}

function warn(msg: string) {
  warnings.push(msg)
}

function validateQuestions(questions: QuestionItem[], filePath: string, bankType: string) {
  for (const q of questions) {
    const prefix = `${q.id}`

    check(q.id && q.id.length > 5, `${prefix}: has valid ID`)
    check(q.product === "UKBI_PRACTICE" || q.product === "TKA_PRACTICE", `${prefix}: valid product`)
    check(VALID_SECTIONS.includes(q.section), `${prefix}: valid section "${q.section}"`)
    check(q.type === "pilihan_ganda" || q.type === "constructed", `${prefix}: valid type "${q.type}"`)
    check(typeof q.difficulty === "number" && q.difficulty >= 1 && q.difficulty <= 4, `${prefix}: valid difficulty ${q.difficulty}`)
    check(!q.stem || q.stem.length > 5, `${prefix}: stem has content`)
    check(!q.prompt || q.prompt.length > 5, `${prefix}: prompt has content`)
    check(q.stem || q.prompt, `${prefix}: has stem or prompt`)

    if (bankType === "ukbi") {
      check(q.band && VALID_BANDS.includes(q.band), `${prefix}: valid band "${q.band}"`)
      check(q.cognitive && VALID_COGNITIVE.includes(q.cognitive), `${prefix}: valid cognitive "${q.cognitive}"`)
      check(q.domain && VALID_DOMAIN.includes(q.domain), `${prefix}: valid domain "${q.domain}"`)
    }

    if (q.type === "pilihan_ganda" || q.type === "PILIHAN_GANDA") {
      check(q.options && q.options.length >= 2, `${prefix}: has 2+ options`)

      if (q.options) {
        const optionIds = q.options.map((o) => o.id)
        check(q.correctAnswer && optionIds.includes(q.correctAnswer), `${prefix}: correctAnswer "${q.correctAnswer}" exists in options`)

        const texts = q.options.map((o) => o.text?.trim().toLowerCase() || "")
        const uniqueTexts = new Set(texts)
        check(texts.length === uniqueTexts.size, `${prefix}: no duplicate option texts`)

        q.options.forEach((o, i) => {
          check(o.id && o.id.length > 0, `${prefix}: option ${i} has ID`)
          check(o.text && o.text.length > 0, `${prefix}: option ${i} has text`)
        })
      }

      check(q.explanation && q.explanation.length > 10, `${prefix}: explanation has content`)
    }

    if (q.type === "constructed") {
      check(q.scoringMode === "rubric", `${prefix}: has scoringMode "rubric"`)
      check(q.rubric && q.rubric.length >= 2, `${prefix}: has rubric with 2+ criteria`)
      check(q.wordLimit && q.wordLimit.min && q.wordLimit.max, `${prefix}: has wordLimit`)
    }

    if (q.passage && q.passage.length > 0) {
      check(q.passage.length > 50, `${prefix}: passage is substantial (>50 chars)`)
    }
  }
}

function scanBankDir(bankType: string) {
  const bankDir = path.join(BANKS_DIR, bankType)
  if (!fs.existsSync(bankDir)) {
    console.log(`\n  ⚠️  No ${bankType} directory found`)
    return
  }

  console.log(`\n── ${bankType.toUpperCase()} ──`)

  const tracks = fs.readdirSync(bankDir).sort()
  for (const track of tracks) {
    const trackDir = path.join(bankDir, track)
    if (!fs.statSync(trackDir).isDirectory()) continue

    console.log(`\n  Track: ${track}`)

    const sections = fs.readdirSync(trackDir).sort()
    let trackTotal = 0

    for (const section of sections) {
      const sectionDir = path.join(trackDir, section)
      if (!fs.statSync(sectionDir).isDirectory()) continue

      const files = fs.readdirSync(sectionDir).filter((f) => f.endsWith(".json")).sort()
      for (const file of files) {
        const filePath = path.join(sectionDir, file)
        try {
          const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as BankFile
          const count = data.questions?.length || 0
          trackTotal += count

          check(true, `${track}/${section}/${file}: valid JSON (${count} questions)`)
          validateQuestions(data.questions, filePath, bankType)
        } catch (err: any) {
          check(false, `${track}/${section}/${file}: JSON parse error — ${err.message}`)
        }
      }
    }

    console.log(`  → ${trackTotal} total questions in ${track}`)
  }
}

function main() {
  console.log("=".repeat(60))
  console.log("  UKBI & TKA QUESTION BANK — Audit Batch 1")
  console.log("=".repeat(60))

  check(fs.existsSync(BANKS_DIR), "Bank directory exists")

  scanBankDir("ukbi")
  scanBankDir("tka")

  console.log("\n" + "=".repeat(60))
  console.log("  AUDIT RESULTS")
  console.log("=".repeat(60))
  console.log(`  Total checks:  ${totalChecks}`)
  console.log(`  Passed:        ${passedChecks}`)
  console.log(`  Failed:        ${failedChecks}`)

  if (warnings.length > 0) {
    console.log(`\n  Warnings (${warnings.length}):`)
    warnings.forEach((w) => console.log(`    ⚠️  ${w}`))
  }

  if (failedChecks > 0) {
    console.log(`\n  ❌ Audit FAILED — ${failedChecks} checks failed`)
    process.exit(1)
  } else {
    console.log(`\n  ✅ Audit PASSED — all ${totalChecks} checks passed`)
  }

  console.log("\n" + "=".repeat(60) + "\n")
}

main()
