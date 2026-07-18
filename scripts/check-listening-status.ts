import { PrismaClient } from "@prisma/client"
import * as fs from "fs"
import * as path from "path"

const prisma = new PrismaClient()

async function main() {
  // Semua soal MENDENGARKAN
  const all = await prisma.uKBIQuestion.findMany({
    where: { seksi: "MENDENGARKAN" },
    select: {
      id: true,
      tingkat: true,
      audioUrl: true,
      text: true,
      passage: true,
      options: true,
      type: true,
      isActive: true,
    },
  })

  console.log(`Total soal MENDENGARKAN di DB: ${all.length}\n`)

  // Breakdown per tingkat
  const byTingkat: Record<string, { total: number; withAudio: number }> = {}
  for (const q of all) {
    const t = q.tingkat
    if (!byTingkat[t]) byTingkat[t] = { total: 0, withAudio: 0 }
    byTingkat[t].total++
    if (q.audioUrl) byTingkat[t].withAudio++
  }

  console.log("Breakdown per tingkat:")
  console.log("Tingkat  | Total | Punya audioUrl")
  console.log("---------|-------|---------------")
  for (const [t, d] of Object.entries(byTingkat).sort()) {
    console.log(`${t.padEnd(8)} | ${String(d.total).padStart(5)} | ${String(d.withAudio).padStart(13)}`)
  }

  // Sample struktur options
  const sample = all.slice(0, 3)
  console.log("\n=== SAMPLE 3 SOAL ===")
  for (const q of sample) {
    console.log(`\n--- ${q.id} (${q.tingkat}) ---`)
    console.log(`audioUrl: ${q.audioUrl}`)
    console.log(`text (100 char): ${q.text.slice(0, 100)}`)
    console.log(`passage (100 char): ${(q.passage || "").slice(0, 100)}`)
    const opts = q.options as any
    if (Array.isArray(opts)) {
      console.log(`options: array ${opts.length} items`)
      if (opts.length > 0) console.log(`  first option: ${JSON.stringify(opts[0]).slice(0, 80)}`)
    } else {
      console.log(`options keys: ${Object.keys(opts || {}).join(", ")}`)
    }
  }

  // Cek JSON source files untuk audioScript
  console.log("\n=== CEK JSON SOURCE FILES ===")
  const dirs = ["sd", "smp", "sma", "guru"]
  let totalJson = 0
  let totalWithScript = 0
  let totalWithAudio = 0

  for (const dir of dirs) {
    const dirPath = path.join(process.cwd(), "data/question-bank/ukbi", dir, "mendengarkan")
    if (!fs.existsSync(dirPath)) continue
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith(".json"))
    for (const f of files) {
      const data = JSON.parse(fs.readFileSync(path.join(dirPath, f), "utf-8"))
      const qs = data.questions || []
      const withScript = qs.filter((q: any) => q.audioScript).length
      const withAudioUrl = qs.filter((q: any) => q.audioUrl).length
      totalJson += qs.length
      totalWithScript += withScript
      totalWithAudio += withAudioUrl
      console.log(`${dir}/mendengarkan/${f}: ${qs.length} soal | ${withScript} audioScript | ${withAudioUrl} audioUrl`)
    }
  }

  console.log(`\nTOTAL di JSON: ${totalJson} soal | ${totalWithScript} punya audioScript | ${totalWithAudio} punya audioUrl`)

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
