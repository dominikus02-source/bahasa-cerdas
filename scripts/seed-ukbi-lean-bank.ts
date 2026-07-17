/**
 * UKBI Lean Bank Seed — Phase UKBI 600 Quality Bank
 *
 * Seeds ALL UKBI tracks (SD, SMP, SMA, Guru) from JSON source files.
 * Dry-run by default. Use --execute to apply.
 *
 * Run: npx tsx scripts/seed-ukbi-lean-bank.ts
 *      npx tsx scripts/seed-ukbi-lean-bank.ts --execute
 */

import { PrismaClient } from "@prisma/client"
import * as fs from "fs"
import * as path from "path"

const db = new PrismaClient()
const isExecute = process.argv.includes("--execute")

const BANKS_DIR = path.join(__dirname, "..", "data", "question-bank", "ukbi")

const SEKSI_MAP: Record<string, string> = {
  "merespons-kaidah": "MERESPONS_KAIDAH",
  "membaca": "MEMBACA",
  "mendengarkan": "MENDENGARKAN",
  "menulis": "MENULIS",
  "berbicara": "BERBICARA",
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

interface BankFile {
  meta: { track: string; section: string; totalItems: number }
  questions: QuestionItem[]
}

async function main() {
  console.log("=".repeat(60))
  console.log("  UKBI LEAN BANK — Seed Script")
  console.log("=".repeat(60))
  console.log(`  Mode: ${isExecute ? "🔴 EXECUTE" : "🟡 DRY-RUN"}`)
  console.log("=".repeat(60))

  if (!fs.existsSync(BANKS_DIR)) {
    console.error(`❌ Bank directory not found: ${BANKS_DIR}`)
    process.exit(1)
  }

  const allQuestions: { track: string; item: QuestionItem }[] = []
  const trackCounts: Record<string, number> = {}
  const sectionCounts: Record<string, Record<string, number>> = {}
  let totalFiles = 0

  const tracks = fs.readdirSync(BANKS_DIR)
  for (const track of tracks) {
    const trackDir = path.join(BANKS_DIR, track)
    if (!fs.statSync(trackDir).isDirectory()) continue

    const sections = fs.readdirSync(trackDir)
    for (const section of sections) {
      const sectionDir = path.join(trackDir, section)
      if (!fs.statSync(sectionDir).isDirectory()) continue

      const files = fs.readdirSync(sectionDir).filter(f => f.endsWith(".json"))
      for (const file of files) {
        const filePath = path.join(sectionDir, file)
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8")) as BankFile
        totalFiles++

        for (const item of data.questions) {
          allQuestions.push({ track, item })
          trackCounts[track] = (trackCounts[track] || 0) + 1

          const sec = data.meta.section || "unknown"
          if (!sectionCounts[track]) sectionCounts[track] = {}
          sectionCounts[track][sec] = (sectionCounts[track][sec] || 0) + 1
        }

        console.log(`  📁 ${track}/${section}/${file} → ${data.questions.length} questions`)
      }
    }
  }

  console.log(`\n  Total files: ${totalFiles}`)
  console.log(`  Total items: ${allQuestions.length}`)

  for (const [track, count] of Object.entries(trackCounts)) {
    console.log(`  ${track.toUpperCase()}: ${count} questions`)
    if (sectionCounts[track]) {
      for (const [sec, cnt] of Object.entries(sectionCounts[track])) {
        console.log(`    ${sec}: ${cnt}`)
      }
    }
  }

  // Check duplicate IDs
  const idSet = new Set<string>()
  const duplicateIds: string[] = []
  for (const { item } of allQuestions) {
    if (idSet.has(item.id)) duplicateIds.push(item.id)
    idSet.add(item.id)
  }
  if (duplicateIds.length > 0) {
    console.error(`❌ Duplicate IDs found: ${duplicateIds.join(", ")}`)
    process.exit(1)
  }
  console.log(`\n  ✅ All ${allQuestions.length} IDs are unique`)

  // Check duplicate option texts
  let dupOptionsFound = false
  for (const { item } of allQuestions) {
    if (item.options && item.type === "pilihan_ganda") {
      const texts = item.options.map(o => o.text.toLowerCase().trim())
      const uniqueTexts = new Set(texts)
      if (texts.length !== uniqueTexts.size) {
        console.error(`❌ Duplicate option texts in ${item.id}`)
        dupOptionsFound = true
      }
    }
  }
  if (dupOptionsFound) {
    console.error("❌ Fix duplicate option texts before executing")
    process.exit(1)
  }
  console.log("  ✅ No duplicate option texts")

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

    // Soal konstruktif (Menulis/Berbicara) tak punya opsi PG. Simpan metadata
    // (instruksi, rubrik, batas kata/waktu) di field `options` agar layar
    // simulasi bisa membacanya tanpa perlu kolom baru di skema.
    const it = item as any
    const optionsData =
      questionType === "CONSTRUCTED"
        ? {
            instruction: it.speakingTask || it.instruction || null,
            constraints: it.constraints || null,
            rubric: it.rubric || null,
            scoringMode: it.scoringMode || "rubric",
            sampleExpectedResponse: it.sampleExpectedResponse || null,
          }
        : item.options || []

    if (!isExecute) {
      inserted++
      continue
    }

    try {
      const existing = await db.uKBIQuestion.findUnique({ where: { id: item.id } })

      if (existing) {
        const changed =
          existing.text !== text ||
          existing.seksi !== seksi ||
          existing.difficulty !== difficulty ||
          JSON.stringify(existing.options) !== JSON.stringify(optionsData) ||
          existing.correctAnswer !== item.correctAnswer ||
          existing.explanation !== explanation ||
          existing.passage !== (item.passage || null) ||
          existing.tingkat !== tingkat ||
          existing.type !== questionType

        if (changed) {
          console.log(`  🔄 Updating ${item.id} (${item.section})`)
          await db.uKBIQuestion.update({
            where: { id: item.id },
            data: {
              seksi: seksi as any,
              text,
              passage: item.passage || null,
              type: questionType,
              options: optionsData,
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
    } catch (err: any) {
      console.error(`  ❌ Error processing ${item.id}: ${err.message}`)
      needsReview.push(`${item.id}: ${err.message}`)
      skipped++
    }
  }

  const tracksCompleted: string[] = []
  const tracksBelow: { track: string; count: number; target: number }[] = []

  for (const [track, count] of Object.entries(trackCounts)) {
    if (count >= 150) tracksCompleted.push(track)
    else tracksBelow.push({ track, count, target: 150 })
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
    needsReview.forEach(r => console.log(`    - ${r}`))
  }

  console.log(`\n  Tracks completed (≥150):`)
  for (const t of tracksCompleted) console.log(`    ✅ ${t.toUpperCase()}`)
  console.log(`  Tracks still below 150:`)
  for (const t of tracksBelow) console.log(`    ⚠️  ${t.track.toUpperCase()}: ${t.count}/${t.target}`)

  // Ensure PaketKompetensi records exist
  console.log("\n── PaketKompetensi ──")
  const PAKET_CONFIGS = [
    { track: "sd",   type: "UKBI_SD",            title: "Simulasi UKBI SD Practice",     duration: 60 },
    { track: "smp",  type: "UKBI_SMP",           title: "Simulasi UKBI SMP Practice",    duration: 75 },
    { track: "sma",  type: "UKBI_SMA",           title: "Simulasi UKBI SMA Practice",    duration: 75 },
    { track: "guru", type: "UKBI_GURU_SIMULASI", title: "Simulasi UKBI Guru Practice",   duration: 90 },
  ]

  for (const cfg of PAKET_CONFIGS) {
    if (!isExecute) {
      console.log(`  (Dry-run) Would ensure Paket "${cfg.title}"`)
    } else {
      const existingPk = await db.paketKompetensi.findFirst({
        where: { type: cfg.type as any, title: cfg.title },
      })
      const sections = [
        { name: "Seksi I: Merespons Kaidah", count: 10, seksi: "MERESPONS_KAIDAH", timeLimit: Math.round(cfg.duration * 0.3) },
        { name: "Seksi II: Membaca", count: 15, seksi: "MEMBACA", timeLimit: Math.round(cfg.duration * 0.45) },
        { name: "Seksi III: Mendengarkan", count: 5, seksi: "MENDENGARKAN", timeLimit: Math.round(cfg.duration * 0.25) },
      ]

      if (existingPk) {
        await db.paketKompetensi.update({
          where: { id: existingPk.id },
          // Set `sectionsData` juga (dipakai rute GET; `sections` sebagai fallback)
          // agar paket tak pernah "0 soal" karena definisi seksi kosong.
          data: { duration: cfg.duration, totalQuestions: 30, sections, sectionsData: sections, isActive: true },
        })
        console.log(`  ✅ Updated Paket: ${cfg.title}`)
      } else {
        await db.paketKompetensi.create({
          data: {
            title: cfg.title,
            description: `Simulasi UKBI untuk ${cfg.track.toUpperCase()}. Soal original BahasaCerdas.`,
            type: cfg.type as any,
            mode: "SIMULASI",
            duration: cfg.duration,
            passingScore: 0,
            passingGrade: "D",
            sections: sections as any,
            sectionsData: sections as any,
            totalQuestions: 30,
            isActive: true,
            isPremium: false,
            attemptLimit: -1,
          },
        })
        console.log(`  ✅ Created Paket: ${cfg.title}`)
      }
    }
  }

  console.log("\n" + "=".repeat(60) + "\n")
  await db.$disconnect()
  if (needsReview.length > 0 && isExecute) process.exit(1)
  process.exit(0)
}

main().catch(e => { console.error("❌ Seed failed:", e.message); process.exit(1) })
