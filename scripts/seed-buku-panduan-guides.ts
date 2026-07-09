/**
 * Seed Buku Panduan Guru — All Grades (VII–XII)
 *
 * Dry-run by default. Use --execute to write to DB.
 *
 * Usage:
 *   npx tsx scripts/seed-buku-panduan-guides.ts           # dry-run
 *   npx tsx scripts/seed-buku-panduan-guides.ts --execute  # write
 *
 * Requires DATABASE_URL. Next.js loads .env/.env.local automatically at
 * runtime, but a standalone `tsx script` does not — the ./load-env import
 * (kept first, before lib/db) handles that.
 */

import "./load-env"
import { db } from "../lib/db"
import { allGrades, getAllChapters } from "../data/buku-panduan/index"

const DRY_RUN = !process.argv.includes("--execute")

const LEVEL_MAP: Record<string, { level: number }> = {
  VII: { level: 1 },
  VIII: { level: 3 },
  IX: { level: 5 },
  X: { level: 7 },
  XI: { level: 9 },
  XII: { level: 11 },
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

  // Deactivate all existing PANDUAN units
  if (!DRY_RUN) {
    const updated = await db.learningUnit.updateMany({
      where: { level: { type: "PANDUAN" } },
      data: { isActive: false },
    })
    console.log(`  Deactivated ${updated.count} old PANDUAN units\n`)
  } else {
    console.log("  [DRY] Would deactivate all old PANDUAN units\n")
  }

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

      if (DRY_RUN) {
        console.log(`  [DRY] Upsert LearningLevel: type=PANDUAN, level=${levelNum}, title="${levelTitle}"`)
      } else {
        const level = await db.learningLevel.upsert({
          where: { type_level: { type: "PANDUAN", level: levelNum } },
          update: { title: levelTitle, description: levelDescription, order: levelNum },
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
    console.log(`    • ${allChapters.length} chapters across VII, VIII, IX, X, XI, XII`)
    console.log(`    • ${6} LearningLevel records`)
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
  const tc = chapter.teachingContent
  return {
    guide: {
      overview: chapter.overview,
      learningGoals: chapter.learningGoals,
      keywords: chapter.keywords,
      suggestedDuration: chapter.suggestedDuration,
      teachingContent: {
        textNature: tc.textNature,
        contentComposition: tc.contentComposition,
        textVariants: tc.textVariants,
        structurePattern: tc.structurePattern,
        languageFeatures: tc.languageFeatures,
        productionProcedure: tc.productionProcedure,
      },
      exampleText: chapter.exampleText,
      learningActivities: chapter.learningActivities,
      worksheet: chapter.worksheet,
      assessment: chapter.assessment,
      rubric: chapter.rubric,
      differentiation: chapter.differentiation,
      remedial: chapter.remedial,
      enrichment: chapter.enrichment,
      teacherNotes: chapter.teacherNotes,
      reflection: chapter.reflection,
      aiContextPrompt: chapter.aiContextPrompt,
      readingPractice: chapter.readingPractice,
      sourceBasis: chapter.sourceBasis,
      reviewStatus: chapter.reviewStatus,
      tags: chapter.tags,
      isReady: chapter.isReady,
    },
    belajar: formatBelajar(chapter),
    latihan: formatLatihan(chapter),
    kuis: formatKuis(chapter),
  }
}

function formatBelajar(chapter: (typeof allGrades)[0]["semesters"][0]["chapters"][0]) {
  const tc = chapter.teachingContent
  const features = Array.isArray(tc.textVariants.variantDescriptions)
    ? tc.textVariants.variantDescriptions.map((v: any) => `• ${typeof v === "string" ? v : `${v.name}: ${v.description}`}`)
    : [`• ${tc.textVariants.types}`]
  return {
    tujuan: chapter.learningGoals,
    materi: [
      {
        judul: `Apa Itu ${chapter.shortTitle}?`,
        isi: [
          tc.textNature.definition,
          "",
          ...tc.textNature.characteristics.map((c: string) => `• ${c}`),
          "",
          `PENTING: ${tc.textNature.distinction}`,
        ],
        contoh: [chapter.exampleText.content],
        catatan: tc.textNature.socialFunction,
      },
      {
        judul: `Struktur ${chapter.shortTitle}`,
        isi: Array.isArray(tc.structurePattern.generalPattern)
          ? tc.structurePattern.generalPattern.map((p: any) =>
              typeof p === "string" ? `• ${p}` : `✓ ${p.name}: ${p.description}`
            )
          : [`• ${tc.structurePattern.generalPattern}`],
        catatan: tc.structurePattern.readingGuide,
      },
      {
        judul: `Kebahasaan ${chapter.shortTitle}`,
        isi: [
          tc.languageFeatures.register,
          "",
          ...(Array.isArray(tc.languageFeatures.features)
            ? tc.languageFeatures.features.map((f: any) =>
                typeof f === "string" ? `• ${f}` : `✓ ${f.name}: ${f.description}`
              )
            : []),
        ],
      },
    ],
    rangkuman: tc.contentComposition.mainIdeas
      ? Array.isArray(tc.contentComposition.mainIdeas)
        ? tc.contentComposition.mainIdeas
        : [tc.contentComposition.mainIdeas]
      : tc.textNature.characteristics.slice(0, 5),
  }
}

/**
 * Latihan interaktif — untuk bab yang sudah punya readingPractice (kelas
 * X-XII), soal PG + isian singkat berbasis bacaan asli menggantikan
 * derivasi lama dari assessment.diagnostic (opsi Ya/Tidak/Mungkin generik,
 * jawaban selalu index 0 — tidak menguji pemahaman bacaan sama sekali).
 * Bab tanpa readingPractice (VII-IX) tetap memakai derivasi lama, tidak disentuh.
 */
function formatLatihan(chapter: (typeof allGrades)[0]["semesters"][0]["chapters"][0]) {
  const rp = chapter.readingPractice
  if (rp) {
    const pg = rp.multipleChoice.map((q, i) => ({
      id: i + 1,
      tipe: "PG" as const,
      soal: q.question,
      opsi: q.options,
      jawaban: q.correctIndex,
      penjelasan: q.explanation,
    }))
    const isian = rp.shortAnswer.map((q, i) => ({
      id: pg.length + i + 1,
      tipe: "ISIAN" as const,
      soal: q.question,
      opsi: [] as string[],
      jawaban: q.sampleAnswer,
      penjelasan: q.explanation,
    }))
    return [...pg, ...isian]
  }

  const diag = chapter.assessment.diagnostic
  if (Array.isArray(diag) && diag.length > 0 && typeof diag[0] === "object" && "question" in diag[0]) {
    return (diag as { question: string; purpose: string }[]).map((q, i) => ({
      id: i + 1,
      soal: q.question,
      opsi: ["Ya", "Tidak", "Mungkin"],
      jawaban: 0,
      penjelasan: q.purpose,
    }))
  }
  if (Array.isArray(diag)) {
    return (diag as string[]).map((q, i) => ({
      id: i + 1,
      soal: q,
      opsi: ["Ya", "Tidak", "Mungkin"],
      jawaban: 0,
      penjelasan: q,
    }))
  }
  return []
}

/**
 * Kuis cepat — sama seperti formatLatihan, memakai readingPractice.quiz
 * (5 PG + 2 isian + 1 uraian mini dijadikan isian) jika tersedia; bab
 * tanpa readingPractice tetap memakai derivasi lama dari assessment.summative.
 */
function formatKuis(chapter: (typeof allGrades)[0]["semesters"][0]["chapters"][0]) {
  const rp = chapter.readingPractice
  if (rp) {
    const pg = rp.quiz.multipleChoice.map((q, i) => ({
      id: i + 1,
      tipe: "PG" as const,
      soal: q.question,
      opsi: q.options,
      jawaban: q.correctIndex,
      penjelasan: q.explanation,
    }))
    const isian = rp.quiz.shortAnswer.map((q, i) => ({
      id: pg.length + i + 1,
      tipe: "ISIAN" as const,
      soal: q.question,
      opsi: [] as string[],
      jawaban: q.sampleAnswer,
      penjelasan: q.explanation,
    }))
    const mini = {
      id: pg.length + isian.length + 1,
      tipe: "ISIAN" as const,
      soal: rp.quiz.miniEssay.question,
      opsi: [] as string[],
      jawaban: rp.quiz.miniEssay.guidance,
      penjelasan: rp.quiz.miniEssay.rubricNote,
    }
    return [...pg, ...isian, mini]
  }

  const sum = chapter.assessment.summative
  if (Array.isArray(sum) && sum.length > 0 && typeof sum[0] === "object" && "type" in sum[0]) {
    return (sum as { type: string; description: string }[]).map((s, i) => ({
      id: i + 1,
      soal: s.description,
      opsi: ["Sangat Setuju", "Setuju", "Kurang Setuju", "Tidak Setuju"],
      jawaban: 0,
      penjelasan: `Penilaian: ${s.type}`,
    }))
  }
  if (Array.isArray(sum)) {
    return (sum as string[]).map((s, i) => ({
      id: i + 1,
      soal: s,
      opsi: ["Sangat Setuju", "Setuju", "Kurang Setuju", "Tidak Setuju"],
      jawaban: 0,
      penjelasan: s,
    }))
  }
  return []
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(() => process.exit(0))
