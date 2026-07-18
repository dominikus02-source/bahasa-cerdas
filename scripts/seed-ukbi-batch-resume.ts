import { PrismaClient } from "@prisma/client"
import { readFileSync, existsSync } from "fs"

const prisma = new PrismaClient()

const SECTION_MAP: Record<string, string> = {
  "mendengarkan": "MENDENGARKAN",
  "membaca": "MEMBACA",
  "merespons-kaidah": "MERESPONS_KAIDAH",
  "menulis": "MENULIS",
  "berbicara": "BERBICARA",
}

const TYPE_MAP: Record<string, string> = {
  "pilihan_ganda": "PILIHAN_GANDA",
  "constructed": "CONSTRUCTED",
}

const DIFFICULTY_MAP: Record<number, string> = {
  1: "EASY",
  2: "MEDIUM",
  3: "HARD",
}

const TRACK_TINGKAT_MAP: Record<string, string> = {
  "UKBI_SD": "SD",
  "UKBI_SMP": "SMP",
  "UKBI_SMA": "SMA",
  "UKBI_GURU": "GURU",
  "UKBI_UMUM": "UMUM",
}

interface RawQuestion {
  id: string
  product: string
  track: string
  section: string
  band: string
  type: string
  difficulty: number
  cognitive: string
  domain: string
  stem: string
  options?: { id: string; text: string }[]
  correctAnswer?: string
  explanation?: string
  passage?: string
  audioUrl?: string
  imageUrl?: string
  passageType?: string
  wordCount?: number
  keywords?: string[]
  isVerified?: boolean
}

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

  // Batch check existing
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
  let errors = 0

  for (const filePath of FILES) {
    if (!existsSync(filePath)) continue
    const data = JSON.parse(readFileSync(filePath, "utf-8"))
    const sectionDir = filePath.split("/").slice(-2, -1)[0]
    const section = SECTION_MAP[sectionDir] ?? sectionDir.toUpperCase()

    for (const q of (data.questions ?? []) as RawQuestion[]) {
      if (existing.has(q.id)) { skipped++; continue }

      const seksi = SECTION_MAP[q.section]
      if (!seksi) { console.error(`❌ ${q.id}: unknown section "${q.section}"`); errors++; continue }

      const type = TYPE_MAP[q.type] ?? "PILIHAN_GANDA"
      const difficulty = DIFFICULTY_MAP[q.difficulty] ?? "MEDIUM"
      const tingkat = TRACK_TINGKAT_MAP[q.track] ?? "UMUM"

      const cognitive = (q.cognitive ?? "PENERAPAN").toUpperCase()
      const domain = (q.domain ?? "SOSIAL").toUpperCase()

      if (!isExecute) { created++; continue }

      try {
        await prisma.uKBIQuestion.create({
          data: {
            id: q.id,
            seksi: seksi as any,
            text: q.stem || "",
            audioUrl: q.audioUrl ?? null,
            imageUrl: q.imageUrl ?? null,
            passage: q.passage ?? null,
            type,
            options: q.options ?? [],
            correctAnswer: q.correctAnswer ?? "",
            explanation: q.explanation ?? null,
            difficulty: difficulty as any,
            cognitive: cognitive as any,
            domain: domain as any,
            tingkat: tingkat as any,
            passageType: q.passageType ?? null,
            wordCount: q.wordCount ?? null,
            keywords: q.keywords ?? [],
            isActive: true,
            isVerified: q.isVerified ?? false,
          },
        })
        created++
      } catch (e) {
        console.error(`❌ ${q.id}: ${e instanceof Error ? e.message : e}`)
        errors++
      }
    }
  }

  console.log(`\nTo create: ${created} | Already exists: ${skipped} | Errors: ${errors}`)
  if (isExecute) {
    console.log("✅ Resume complete")
  } else {
    console.log("(Dry-run — pass --execute to apply)")
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
