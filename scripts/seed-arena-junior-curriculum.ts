/**
 * Seed kerangka kurikulum Arena Junior (TK–Kelas 6).
 *
 * Sumber: data/arena-junior/curriculum-map.json (diadaptasi dari kurikulum KataPlay).
 * 7 stage × 6 unit × 3 pelajaran = 126 pelajaran.
 *
 * Sifat:
 * - Dry-run by default (--execute untuk menerapkan)
 * - Upsert-only: tidak ada deleteMany/truncate, progres murid tidak tersentuh
 * - Idempoten: kunci unik (grade, stageOrder, unitOrder, lessonOrder)
 *
 * Yang di-seed HANYA metadata pelajaran (judul, tipe, XP, urutan). Kolom `content`
 * (soal + kunci jawaban) sengaja dibiarkan null — bank soal diproduksi terpisah.
 */

import fs from "node:fs"
import path from "node:path"
import type { ArenaJuniorGrade } from "@prisma/client"
import { createScriptPrisma } from "./script-prisma"
import { normalkanKarakter } from "../lib/arena-junior/karakter"

const prisma = createScriptPrisma()

const EXECUTE = process.argv.includes("--execute")
const DRY_RUN = !EXECUTE

const GRADE_BY_BAND: Record<string, ArenaJuniorGrade> = {
  TK: "TK",
  "Kelas 1": "K1",
  "Kelas 2": "K2",
  "Kelas 3": "K3",
  "Kelas 4": "K4",
  "Kelas 5": "K5",
  "Kelas 6": "K6",
}

type LessonSource = {
  id: string
  title: string
  subtitle?: string
  order: number
  estimatedMinutes: number
  xpReward: number
  lessonType: string
  questionCount: number
  characterHint: string
}

type UnitSource = { order: number; title: string; lessons: LessonSource[] }

type StageSource = {
  order: number
  title: string
  gradeBand: string
  themeColor?: string
  icon?: string
  units: UnitSource[]
}

async function main() {
  const file = path.join(process.cwd(), "data/arena-junior/curriculum-map.json")
  if (!fs.existsSync(file)) {
    console.error(`❌ Berkas kurikulum tidak ditemukan: ${file}`)
    process.exit(1)
  }

  const { stages } = JSON.parse(fs.readFileSync(file, "utf-8")) as { stages: StageSource[] }

  const rows = stages.flatMap((stage) => {
    const grade = GRADE_BY_BAND[stage.gradeBand]
    if (!grade) {
      console.warn(`⚠️  Jenjang tidak dikenal, dilewati: "${stage.gradeBand}"`)
      return []
    }
    return stage.units.flatMap((unit) =>
      unit.lessons.map((lesson) => ({
        grade,
        stageOrder: stage.order,
        stageTitle: stage.title,
        unitOrder: unit.order,
        unitTitle: unit.title,
        lessonOrder: lesson.order,
        title: lesson.title,
        subtitle: lesson.subtitle ?? null,
        estimatedMinutes: lesson.estimatedMinutes,
        xpReward: lesson.xpReward,
        questionCount: lesson.questionCount,
        lessonType: lesson.lessonType,
        // Kurikulum asal memakai "lily"/"budi" yang tidak punya aset gambar;
        // dinormalkan ke karakter resmi (hazel/alby) saat masuk database.
        characterHint: normalkanKarakter(lesson.characterHint),
        sourceKey: lesson.id,
        themeColor: stage.themeColor ?? null,
        icon: stage.icon ?? null,
      }))
    )
  })

  console.log(`📚 Kurikulum: ${stages.length} stage, ${rows.length} pelajaran\n`)
  for (const stage of stages) {
    const count = stage.units.reduce((n, u) => n + u.lessons.length, 0)
    console.log(
      `  ${stage.icon ?? "•"} ${stage.gradeBand.padEnd(9)} ${String(stage.units.length).padStart(2)} unit  ${String(count).padStart(3)} pelajaran`
    )
  }

  const sebelum = await prisma.arenaJuniorLesson.count()
  console.log(`\nPelajaran di database sekarang: ${sebelum}`)

  if (DRY_RUN) {
    console.log(`\n🧪 DRY RUN — akan meng-upsert ${rows.length} pelajaran.`)
    console.log("   Jalankan ulang dengan --execute untuk menerapkan.")
    return
  }

  let n = 0
  for (const row of rows) {
    await prisma.arenaJuniorLesson.upsert({
      where: {
        grade_stageOrder_unitOrder_lessonOrder: {
          grade: row.grade,
          stageOrder: row.stageOrder,
          unitOrder: row.unitOrder,
          lessonOrder: row.lessonOrder,
        },
      },
      // `content` tidak disentuh: kalau bank soal sudah diisi, seed ulang metadata
      // tidak akan menghapusnya.
      update: row,
      create: row,
    })
    n++
    if (n % 20 === 0) console.log(`  … ${n}/${rows.length}`)
  }

  const sesudah = await prisma.arenaJuniorLesson.count()
  console.log(`\n✅ ${n} pelajaran ter-upsert. Total di database: ${sesudah}`)
}

main()
  .catch((e) => {
    console.error("❌ Seed gagal:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
