/**
 * UKBI & TKA Question Bank Seed — Batch 1
 *
 * Scans all JSON files in data/question-bank/ukbi/ and data/question-bank/tka/
 * and seeds questions into the database.
 *
 * Dry-run by default. Use --execute to apply.
 *
 * Run: npx tsx scripts/seed-ukbi-tka-question-bank.ts
 *      npx tsx scripts/seed-ukbi-tka-question-bank.ts --execute
 */

import { PrismaClient } from "@prisma/client"
import * as fs from "fs"
import * as path from "path"

const db = new PrismaClient()
const isExecute = process.argv.includes("--execute")

const BANKS_DIR = path.join(__dirname, "..", "data", "question-bank")

const SEKSI_MAP: Record<string, string> = {
  "merespons-kaidah": "MERESPONS_KAIDAH",
  membaca: "MEMBACA",
  mendengarkan: "MENDENGARKAN",
  menulis: "MENULIS",
  berbicara: "BERBICARA",
}

const TRACK_TINGKAT: Record<string, string> = {
  sd: "SD",
  smp: "SMP",
  sma: "SMA",
  guru: "GURU",
}

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
  audioScript?: string
  audioRef?: string | null
  prompt?: string
  speakingTask?: string
  scoringMode?: string
  wordLimit?: { min: number; max: number }
  rubric?: any[]
  sampleExpectedResponse?: string
  options?: { id: string; text: string }[]
  correctAnswer?: string
  explanation?: string
  tags?: string[]
  source: string
  status: string
  cognitive?: string
  domain?: string
}

interface BankMeta {
  product: string
  track: string
  section: string
  set: string
  totalItems: number
  source: string
}

interface BankFile {
  meta: BankMeta
  questions: QuestionItem[]
}

async function scanBankDir(bankType: string): Promise<{ track: string; item: QuestionItem }[]> {
  const allQuestions: { track: string; item: QuestionItem }[] = []
  const bankDir = path.join(BANKS_DIR, bankType)

  if (!fs.existsSync(bankDir)) {
    console.log(`  ⚠️  Bank directory not found: ${bankDir}`)
    return allQuestions
  }

  const tracks = fs.readdirSync(bankDir)
  for (const track of tracks) {
    const trackDir = path.join(bankDir, track)
    if (!fs.statSync(trackDir).isDirectory()) continue

    const sections = fs.readdirSync(trackDir)
    for (const section of sections) {
      const sectionDir = path.join(trackDir, section)
      if (!fs.statSync(sectionDir).isDirectory()) continue

      const files = fs.readdirSync(sectionDir).filter((f) => f.endsWith(".json"))
      for (const file of files.sort()) {
        const filePath = path.join(sectionDir, file)
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as BankFile

        for (const item of data.questions) {
          allQuestions.push({ track, item })
        }

        console.log(`  📁 ${bankType}/${track}/${section}/${file} → ${data.questions.length} questions`)
      }
    }
  }

  return allQuestions
}

async function main() {
  console.log("=".repeat(60))
  console.log("  UKBI & TKA QUESTION BANK — Seed Batch 1")
  console.log("=".repeat(60))
  console.log(`  Mode: ${isExecute ? "🔴 EXECUTE" : "🟡 DRY-RUN"}`)
  console.log("=".repeat(60))

  const allQuestions = [...(await scanBankDir("ukbi")), ...(await scanBankDir("tka"))]

  if (allQuestions.length === 0) {
    console.log("\n  ❌ No questions found to seed")
    await db.$disconnect()
    process.exit(0)
  }

  console.log(`\n  Total items: ${allQuestions.length}`)

  // Count per track
  const trackCounts: Record<string, number> = {}
  for (const { track, item } of allQuestions) {
    const key = `${item.product}_${track}`
    trackCounts[key] = (trackCounts[key] || 0) + 1
  }
  for (const [track, count] of Object.entries(trackCounts).sort()) {
    console.log(`  ${track}: ${count} questions`)
  }

  // Check duplicate IDs
  const idSet = new Set<string>()
  const duplicateIds: string[] = []
  for (const { item } of allQuestions) {
    if (idSet.has(item.id)) duplicateIds.push(item.id)
    idSet.add(item.id)
  }
  if (duplicateIds.length > 0) {
    console.error(`\n  ❌ Duplicate IDs: ${duplicateIds.join(", ")}`)
    if (isExecute) {
      await db.$disconnect()
      process.exit(1)
    }
  } else {
    console.log(`\n  ✅ All ${allQuestions.length} IDs unique`)
  }

  // Validate basic structure
  let validationErrors = 0
  for (const { item } of allQuestions) {
    const errors: string[] = []

    if (item.type === "pilihan_ganda" || !item.type || item.type === "PILIHAN_GANDA") {
      if (!item.options || item.options.length === 0) {
        errors.push("no options")
      }
      if (item.correctAnswer && item.options) {
        const optionIds = item.options.map((o) => o.id)
        if (!optionIds.includes(item.correctAnswer)) {
          errors.push(`correctAnswer "${item.correctAnswer}" not in options [${optionIds.join(",")}]`)
        }
      }
      if (item.options) {
        const texts = item.options.map((o) => o.text?.trim().toLowerCase() || "")
        const uniqueTexts = new Set(texts)
        if (texts.length !== uniqueTexts.size) {
          errors.push("duplicate option texts")
        }
      }
    }

    if (item.type === "constructed") {
      if (!item.rubric || item.rubric.length === 0) errors.push("no rubric")
      if (!item.scoringMode) errors.push("no scoringMode")
      if (!item.wordLimit) errors.push("no wordLimit")
    }

    if (!item.explanation && item.type !== "constructed") errors.push("no explanation")
    if (!item.stem && !item.prompt) errors.push("no stem or prompt")

    if (errors.length > 0) {
      console.warn(`  ⚠️  ${item.id}: ${errors.join(", ")}`)
      validationErrors++
    }
  }

  if (validationErrors > 0) {
    console.log(`\n  ⚠️  ${validationErrors} items with validation warnings (will be skipped)`)
  }

  // Process questions
  let inserted = 0
  let updated = 0
  let unchanged = 0
  let skipped = 0
  const needsReview: string[] = []

  for (const { track, item } of allQuestions) {
    const seksi = SEKSI_MAP[item.section]
    if (!seksi) {
      console.warn(`  ⚠️  Unknown section "${item.section}" for ${item.id}, skipping`)
      skipped++
      needsReview.push(`${item.id}: unknown section "${item.section}"`)
      continue
    }

    const questionType = item.type === "constructed" ? "CONSTRUCTED" : "PILIHAN_GANDA"
    const difficulty = item.difficulty <= 2 ? "EASY" : item.difficulty === 3 ? "MEDIUM" : "HARD"
    const text = item.stem || item.prompt || ""
    if (!text) {
      console.warn(`  ⚠️  Empty text for ${item.id}, skipping`)
      skipped++
      needsReview.push(`${item.id}: empty text`)
      continue
    }

    const explanation = item.explanation || null
    const cognitive = (item.cognitive || "PEMAHAMAN") as any
    const domain = (item.domain || "SINTAS") as any
    const tingkat = TRACK_TINGKAT[track] || "UMUM"
    const isTKA = item.product === "TKA_PRACTICE" || item.product?.startsWith("TKA")

    if (!isExecute) {
      inserted++
      continue
    }

    try {
      if (isTKA) {
        const existing = await (db as any).tKAQuestion.findUnique({ where: { id: item.id } })
        if (existing) {
          unchanged++
        } else {
          await (db as any).tKAQuestion.create({
            data: {
              id: item.id,
              kompetensi: (item as any).kompetensi || "LITERASI_MEMBACA",
              subKompetensi: item.section || null,
              text,
              passage: item.passage || null,
              type: questionType,
              options: item.options || [],
              correctAnswer: item.correctAnswer || "",
              explanation,
              difficulty: difficulty as any,
              tingkat,
              isActive: true,
              isVerified: true,
            },
          })
          inserted++
        }
      } else {
        const existing = await db.uKBIQuestion.findUnique({ where: { id: item.id } })
        if (existing) {
          const changed =
            existing.text !== text ||
            existing.seksi !== seksi ||
            existing.difficulty !== difficulty ||
            JSON.stringify(existing.options) !== JSON.stringify(item.options) ||
            existing.correctAnswer !== item.correctAnswer ||
            existing.explanation !== explanation ||
            existing.passage !== (item.passage || null) ||
            existing.tingkat !== tingkat

          if (changed) {
            await db.uKBIQuestion.update({
              where: { id: item.id },
              data: {
                seksi: seksi as any,
                text,
                passage: item.passage || null,
                type: questionType,
                options: item.options || [],
                correctAnswer: item.correctAnswer || "",
                explanation,
                difficulty: difficulty as any,
                cognitive,
                domain,
                keywords: item.tags || [],
                isActive: true,
                isVerified: true,
                tingkat,
              },
            })
            updated++
          } else {
            unchanged++
          }
        } else {
          await db.uKBIQuestion.create({
            data: {
              id: item.id,
              seksi: seksi as any,
              text,
              passage: item.passage || null,
              type: questionType,
              options: item.options || [],
              correctAnswer: item.correctAnswer || "",
              explanation,
              difficulty: difficulty as any,
              cognitive,
              domain,
              keywords: item.tags || [],
              isActive: true,
              isVerified: true,
              tingkat,
            },
          })
          inserted++
        }
      }
    } catch (err: any) {
      console.error(`  ❌ Error processing ${item.id}: ${err.message}`)
      needsReview.push(`${item.id}: ${err.message}`)
      skipped++
    }
  }

  console.log("\n" + "=".repeat(60))
  console.log("  SUMMARY")
  console.log("=".repeat(60))
  if (!isExecute) {
    console.log(`  (Dry-run) ${allQuestions.length} items would be processed`)
    console.log(`  Use --execute to apply`)
  } else {
    console.log(`  Inserted:  ${inserted}`)
    console.log(`  Updated:   ${updated}`)
    console.log(`  Unchanged: ${unchanged}`)
    console.log(`  Skipped:   ${skipped}`)
  }

  if (needsReview.length > 0) {
    console.log(`\n  Needs review (${needsReview.length}):`)
    needsReview.forEach((r) => console.log(`    - ${r}`))
  }

  console.log("\n" + "=".repeat(60) + "\n")
  await db.$disconnect()
  if (needsReview.length > 0 && isExecute) process.exit(1)
  process.exit(0)
}

main().catch((e) => {
  console.error("❌ Seed failed:", e.message)
  process.exit(1)
})
