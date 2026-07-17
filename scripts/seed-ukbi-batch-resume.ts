import { PrismaClient } from "@prisma/client"
import { readFileSync, existsSync } from "fs"

const prisma = new PrismaClient()

const FILES = [
  "data/question-bank/ukbi/smp/membaca/set-002.json",
  "data/question-bank/ukbi/smp/merespons-kaidah/set-002.json",
  "data/question-bank/ukbi/smp/menulis/set-002.json",
]

async function main() {
  const args = process.argv.slice(2)
  const isExecute = args.includes("--execute")

  if (!isExecute) console.log("🟡 DRY-RUN\n")

  // Collect all IDs
  const allIds: string[] = []
  for (const f of FILES) {
    if (!existsSync(f)) continue
    const data = JSON.parse(readFileSync(f, "utf-8"))
    for (const q of (data.questions ?? [])) allIds.push(q.id)
  }

  // Batch check
  const existing = new Set<string>()
  for (let i = 0; i < allIds.length; i += 50) {
    const batch = allIds.slice(i, i + 50)
    const rows = await prisma.uKBIQuestion.findMany({
      where: { id: { in: batch } },
      select: { id: true },
    })
    rows.forEach(r => existing.add(r.id))
  }

  let created = 0
  let skipped = 0

  for (const filePath of FILES) {
    if (!existsSync(filePath)) continue
    const data = JSON.parse(readFileSync(filePath, "utf-8"))

    for (const q of (data.questions ?? [])) {
      if (existing.has(q.id)) { skipped++; continue }

      if (!isExecute) { created++; continue }

      await prisma.uKBIQuestion.create({
        data: {
          id: q.id,
          seksi: q.seksi,
          text: q.stem || q.prompt || "",
          audioUrl: q.audioUrl ?? null,
          imageUrl: q.imageUrl ?? null,
          passage: q.passage ?? null,
          type: q.type === "constructed" ? "CONSTRUCTED" : "PILIHAN_GANDA",
          options: q.options ?? [],
          correctAnswer: q.correctAnswer ?? "",
          explanation: q.explanation ?? null,
          difficulty: q.difficulty ?? "MEDIUM",
          cognitive: q.cognitive ?? "PENERAPAN",
          domain: q.domain ?? "SOSIAL",
          tingkat: q.tingkat ?? "SMP",
          passageType: q.passageType ?? null,
          wordCount: q.wordCount ?? null,
          keywords: q.keywords ?? [],
          isActive: true,
          isVerified: q.isVerified ?? false,
        },
      })
      created++
    }
  }

  console.log(`To create: ${created} | Already exists: ${skipped}`)
  if (isExecute) console.log("✅ Resume complete")
  else console.log("(Dry-run)")

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
