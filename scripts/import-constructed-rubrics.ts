import { PrismaClient } from "@prisma/client"
import { readFileSync, readdirSync, existsSync } from "fs"
import * as path from "path"

const prisma = new PrismaClient()

/**
 * Import rubrik + metadata konstruktif dari JSON bank soal ke kolom `options`
 * di DB. Struktur options yang dihasilkan:
 *   { instruction, constraints, rubric, scoringMode, sampleExpectedResponse, speakingTask? }
 * Client hanya menerima { instruction, constraints } (disanitasi API).
 * Rubrik dibaca server-side saat grading AI.
 */

const DIRS = ["sd", "smp", "sma", "guru"]
const SEKSIS = ["menulis", "berbicara"]

interface JsonQ {
  id: string
  prompt?: string
  wordLimit?: { min?: number; max?: number }
  speakingTask?: string
  rubric?: any
  scoringMode?: string
  sampleExpectedResponse?: string
}

async function main() {
  const isExecute = process.argv.includes("--execute")
  if (!isExecute) console.log("DRY-RUN\n")

  let updated = 0
  let notFound = 0
  let noRubric = 0

  for (const dir of DIRS) {
    for (const seksi of SEKSIS) {
      const dirPath = path.join(process.cwd(), "data/question-bank/ukbi", dir, seksi)
      if (!existsSync(dirPath)) continue
      const files = readdirSync(dirPath).filter((f) => f.endsWith(".json"))

      for (const f of files) {
        const data = JSON.parse(readFileSync(path.join(dirPath, f), "utf-8"))
        for (const q of (data.questions || []) as JsonQ[]) {
          if (!q.rubric) {
            noRubric++
            continue
          }

          const isMenulis = seksi === "menulis"
          const options = {
            instruction: q.prompt || null,
            constraints: isMenulis
              ? { minWords: q.wordLimit?.min ?? null, maxWords: q.wordLimit?.max ?? null }
              : { preparationTimeSec: 30, responseTimeSec: 60 },
            ...(q.speakingTask ? { speakingTask: q.speakingTask } : {}),
            rubric: q.rubric,
            scoringMode: q.scoringMode || "rubric",
            sampleExpectedResponse: q.sampleExpectedResponse || null,
          }

          if (!isExecute) {
            updated++
            continue
          }

          const res = await prisma.uKBIQuestion.updateMany({
            where: { id: q.id },
            data: { options },
          })
          if (res.count > 0) updated++
          else notFound++
        }
      }
    }
  }

  console.log(`\nUpdated: ${updated} | Not in DB: ${notFound} | No rubric in JSON: ${noRubric}`)
  if (!isExecute) console.log("(Dry-run — pass --execute to apply)")

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
