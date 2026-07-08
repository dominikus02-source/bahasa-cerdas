/**
 * Seed Buku Panduan Guru — Canonical Data
 *
 * Replaces old PANDUAN seed data for VII-IX with canonical
 * founder-approved chapter order and guide content.
 *
 * Dry-run by default. Use --execute to write to DB.
 *
 * Usage:
 *   npx tsx scripts/seed-buku-panduan-guides.ts           # dry-run
 *   npx tsx scripts/seed-buku-panduan-guides.ts --execute  # write
 */

import { db } from "../lib/db"
import { allGrades, getAllChapters } from "../data/buku-panduan/index"

const DRY_RUN = !process.argv.includes("--execute")

const LEVEL_MAP: Record<string, { level: number; title: string }> = {
  VII: { level: 1, title: "Kelas VII Semester 1" },
  VIII: { level: 3, title: "Kelas VIII Semester 1" },
  IX: { level: 5, title: "Kelas IX Semester 1" },
}

async function main() {
  if (DRY_RUN) {
    console.log("═══════════════════════════════════════════")
    console.log("  BUKU PANDUAN GURU — DRY RUN")
    console.log("  Pass --execute to write to database")
    console.log("═══════════════════════════════════════════\n")
  } else {
    console.log("⚡ Executing seed...\n")
  }

  // 1. Deactivate all existing PANDUAN units for VII-IX
  if (!DRY_RUN) {
    const updated = await db.learningUnit.updateMany({
      where: {
        grade: { in: ["VII", "VIII", "IX"] },
        level: { type: "PANDUAN" },
      },
      data: { isActive: false },
    })
    console.log(`  Deactivated ${updated.count} old PANDUAN units\n`)
  } else {
    console.log("  [DRY] Would deactivate old PANDUAN units for VII-IX\n")
  }

  // 2. Process each grade
  let totalChaptersCreated = 0

  for (const grade of allGrades) {
    for (const sem of grade.semesters) {
      const baseInfo = LEVEL_MAP[grade.grade]
      if (!baseInfo) {
        console.warn(`  ⚠️ No level mapping for grade ${grade.grade}, skipping`)
        continue
      }

      const levelNum = baseInfo.level + (sem.semester - 1)
      const levelTitle = `${grade.label} Semester ${sem.semester}`
      const levelDescription = `Materi ${grade.label} semester ${sem.semester} — Buku Panduan Guru`

      // Upsert LearningLevel
      if (DRY_RUN) {
        console.log(`  [DRY] Upsert LearningLevel: type=PANDUAN, level=${levelNum}, title="${levelTitle}"`)
      } else {
        const level = await db.learningLevel.upsert({
          where: { type_level: { type: "PANDUAN", level: levelNum } },
          update: {
            title: levelTitle,
            description: levelDescription,
            order: levelNum,
          },
          create: {
            type: "PANDUAN",
            level: levelNum,
            title: levelTitle,
            description: levelDescription,
            order: levelNum,
            color: "from-emerald-400 to-teal-500",
            emoji: "📚",
          },
        })
        console.log(`  ✅ LearningLevel: "${levelTitle}"`)

        // Create units for this level
        for (const ch of sem.chapters) {
          const content = buildContent(ch)
          const unit = await db.learningUnit.create({
            data: {
              levelId: level.id,
              title: ch.title,
              subtitle: ch.description.substring(0, 120),
              topik: ch.shortTitle,
              grade: ch.grade,
              semester: ch.semester,
              kd: ch.kd,
              order: ch.chapterNumber,
              content: JSON.stringify(content),
              emoji: ch.emoji,
              isActive: true,
              color: "from-emerald-100 to-teal-100",
            },
          })
          totalChaptersCreated++
          console.log(`    📗 ${ch.title} → ${unit.id}`)
        }
      }
    }
  }

  if (DRY_RUN) {
    const allChapters = getAllChapters()
    console.log(`\n  Would create:`)
    console.log(`    • ${allChapters.length} chapters across VII, VIII, IX`)
    console.log(`    • ${3} LearningLevel records (assuming 3 semesters active)`)
    console.log(`    • ${allChapters.length} LearningUnit records`)
    console.log(`\n  Grades:`)
    for (const g of allGrades) {
      const chCount = g.semesters.reduce((sum, s) => sum + s.chapters.length, 0)
      console.log(`    • ${g.label}: ${chCount} chapters (${g.semesters.length} semesters)`)
    }
    console.log("\n  ── No changes made. Run with --execute to seed.")
  } else {
    console.log(`\n✅ Seed complete: ${totalChaptersCreated} chapters created`)
  }
}

function buildContent(chapter: (typeof allGrades)[0]["semesters"][0]["chapters"][0]) {
  return {
    guide: {
      learningGoals: chapter.learningGoals,
      keyConcepts: chapter.keyConcepts,
      languageFocus: chapter.languageFocus,
      activities: chapter.activities,
      studentTasks: chapter.studentTasks,
      assessment: chapter.assessment,
      rubric: chapter.rubric,
      differentiation: chapter.differentiation,
      remedial: chapter.remedial,
      enrichment: chapter.enrichment,
      teacherNotes: chapter.teacherNotes,
      tags: chapter.tags,
    },
    belajar: {
      tujuan: chapter.learningGoals,
      materi: [
        {
          judul: `Apa Itu ${chapter.shortTitle}?`,
          isi: [
            chapter.keyConcepts.definition,
            "",
            ...chapter.keyConcepts.characteristics.map((c) => `• ${c}`),
            "",
            `PENTING: ${chapter.shortTitle} adalah materi yang mengajarkan kita untuk memahami dan mengaplikasikan konsep kebahasaan dalam konteks yang tepat.`,
          ],
          contoh: chapter.keyConcepts.examples.map((e) => e.content),
          catatan: chapter.languageFocus.notes,
        },
      ],
      rangkuman: chapter.keyConcepts.characteristics.slice(0, 5).map((c) => c.replace(/^[A-Z]/, (m) => m.toLowerCase())),
    },
    latihan: chapter.assessment.diagnostic.map((q, i) => ({
      id: i + 1,
      soal: q.question,
      opsi: ["Ya", "Tidak", "Mungkin"],
      jawaban: 0,
      penjelasan: q.purpose,
    })),
    praktik: {
      petunjuk: chapter.studentTasks
        .filter((t) => t.type === "individual")
        .map((t) => t.description)
        .join("\n"),
      tips: chapter.teacherNotes,
      contoh: chapter.keyConcepts.examples[0]?.content,
    },
    kuis: chapter.assessment.summative.map((s, i) => ({
      id: i + 1,
      soal: s.description,
      opsi: ["Sangat Setuju", "Setuju", "Kurang Setuju", "Tidak Setuju"],
      jawaban: 0,
      penjelasan: `Penilaian: ${s.type}`,
    })),
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(() => process.exit(0))
