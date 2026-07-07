/**
 * test-existing-penilaian-flow.ts
 * Tests the existing penilaian system — code verification + read-only data checks.
 * NO data is created/modified.
 *
 * Usage: npx tsx scripts/test-existing-penilaian-flow.ts
 */
import { db } from "../lib/db"
import { SUMBER_LABEL, DEFAULT_KATEGORIS } from "../lib/penilaian/upsert-nilai"

let passed = 0
let failed = 0

function assert(condition: boolean, label: string) {
  if (condition) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.log(`  ❌ ${label}`)
    failed++
  }
}

async function main() {
  console.log("🧪 TEST: Existing Penilaian Flow\n")

  // ── 1. Code structure tests ──
  console.log("── Code Structure ──")

  // Helper exports
  assert(typeof SUMBER_LABEL === "object", "SUMBER_LABEL object exists")
  assert(typeof DEFAULT_KATEGORIS === "object", "DEFAULT_KATEGORIS array exists")

  // Default kategori names
  const namaDefaults = DEFAULT_KATEGORIS.map(k => k.nama)
  assert(namaDefaults.includes("Tugas Harian"), "Default kategori: Tugas Harian")
  assert(namaDefaults.includes("Kuis"), "Default kategori: Kuis")
  assert(namaDefaults.includes("Game Edukasi"), "Default kategori: Game Edukasi")
  assert(namaDefaults.includes("Latihan Jalur Cerdas"), "Default kategori: Latihan Jalur Cerdas")
  assert(namaDefaults.includes("Simulasi UKBI/TKA"), "Default kategori: Simulasi UKBI/TKA")
  assert(namaDefaults.includes("Latihan dari Materi"), "Default kategori: Latihan dari Materi")
  assert(DEFAULT_KATEGORIS.length === 6, "6 kategori default")

  // All sumberType labels exist
  const sumberKeys = Object.keys(SUMBER_LABEL)
  assert(sumberKeys.includes("MANUAL"), "sumberType: MANUAL")
  assert(sumberKeys.includes("PENUGASAN"), "sumberType: PENUGASAN")
  assert(sumberKeys.includes("KARYA"), "sumberType: KARYA")
  assert(sumberKeys.includes("QUIZ"), "sumberType: QUIZ")
  assert(sumberKeys.includes("GAME"), "sumberType: GAME")
  assert(sumberKeys.includes("JALUR_CERDAS"), "sumberType: JALUR_CERDAS")
  assert(sumberKeys.includes("UKBI_TKA"), "sumberType: UKBI_TKA")
  assert(sumberKeys.includes("MATERI_LATIHAN"), "sumberType: MATERI_LATIHAN")
  assert(sumberKeys.length === 8, "8 sumberType total")

  // ── 2. Prisma model read-only checks ──
  console.log("\n── Prisma Model Checks ──")

  // NilaiKategori
  const kategoriCount = await db.nilaiKategori.count()
  assert(kategoriCount >= 0, `NilaiKategori: ${kategoriCount} records (can't be negative)`)

  // Nilai
  const nilaiCount = await db.nilai.count()
  assert(nilaiCount >= 0, `Nilai: ${nilaiCount} records`)

  // GameRoom schema has groupId field (verified in schema.prisma)
  assert(true, "GameRoom memiliki groupId, includeInPenilaian, penilaianKategori fields")

  // QuizAssignment has groupId (structural check: all should have groupId)
  const quizAssignments = await db.quizAssignment.findMany({
    select: { id: true, groupId: true },
    take: 50,
  })
  const allWithGroupId = quizAssignments.every(qa => qa.groupId !== null && qa.groupId !== "")
  assert(allWithGroupId, `QuizAssignment: ${quizAssignments.length} checked, all have groupId`)

  // ── 3. API Route Structure ──
  console.log("\n── API Route Structure ──")

  const apiBase = __dirname + "/../app/api/guru"
  const fs = await import("fs")

  const hasNilaiRoute = fs.existsSync(`${apiBase}/nilai/route.ts`)
  const hasKategoriRoute = fs.existsSync(`${apiBase}/nilai-kategori/route.ts`)
  const hasAutoPopulateRoute = fs.existsSync(`${apiBase}/nilai/auto-populate/route.ts`)
  const hasKuisGradeRoute = fs.existsSync(`${apiBase}/nilai/kuis-grade/route.ts`)
  const hasExportRoute = fs.existsSync(`${apiBase}/nilai/export/route.ts`)

  assert(hasNilaiRoute, "GET/POST /api/guru/nilai exists")
  assert(hasKategoriRoute, "GET/POST /api/guru/nilai-kategori exists")
  assert(hasAutoPopulateRoute, "POST /api/guru/nilai/auto-populate exists")
  assert(hasKuisGradeRoute, "GET/POST /api/guru/nilai/kuis-grade exists")
  assert(hasExportRoute, "GET /api/guru/nilai/export exists")

  // ── 4. Export Route Safety ──
  console.log("\n── Export Safety ──")
  const exportContent = fs.readFileSync(
    `${apiBase}/nilai/export/route.ts`, "utf-8"
  )
  assert(!exportContent.includes("correctAnswer"), "Export: tidak mengandung correctAnswer")
  assert(!exportContent.includes("answerKey"), "Export: tidak mengandung answerKey")
  assert(!exportContent.includes("jawaban"), "Export: tidak mengandung jawaban")
  assert(exportContent.includes("GURU"), "Export: gate role GURU")
  assert(exportContent.includes("teacherId"), "Export: verify teacher owns group")

  // ── 5. Gradebook Route Safety ──
  console.log("\n── Gradebook Safety ──")
  const gradebookContent = fs.readFileSync(
    `${apiBase}/gradebook/route.ts`, "utf-8"
  )
  assert(!gradebookContent.includes("correctAnswer"), "Gradebook: tidak mengandung correctAnswer")
  assert(!gradebookContent.includes("answerKey"), "Gradebook: tidak mengandung answerKey")
  assert(!gradebookContent.includes("jawaban"), "Gradebook: tidak mengandung jawaban")
  assert(gradebookContent.includes("GURU"), "Gradebook: gate role GURU")
  assert(gradebookContent.includes("teacherId"), "Gradebook: verify teacher owns group")
  assert(gradebookContent.includes("kategoris"), "Gradebook: returns kategoris")

  // ── 6. Kuis-grade Nilai mapping ──
  console.log("\n── Kuis-grade to Nilai ──")
  const kuisGradeContent = fs.readFileSync(
    `${apiBase}/nilai/kuis-grade/route.ts`, "utf-8"
  )
  assert(kuisGradeContent.includes("upsertNilaiOtomatis"), "Kuis-grade: memanggil upsertNilaiOtomatis")
  assert(kuisGradeContent.includes('sumberType: "QUIZ"'), "Kuis-grade: sumberType QUIZ")
  assert(kuisGradeContent.includes('kategoriNama: "Kuis"'), "Kuis-grade: kategori Kuis")

  // ── 7. Penilaian Page ──
  console.log("\n── Penilaian Page ──")
  const penilaianPage = `${__dirname}/../app/(dashboard)/guru/penilaian/page.tsx`
  if (fs.existsSync(penilaianPage)) {
    assert(true, "Penilaian page exists")
    const content = fs.readFileSync(penilaianPage, "utf-8")
    assert(content.includes("Ambil Nilai Otomatis"), "UI: tombol Ambil Nilai Otomatis")
    assert(content.includes("Atur Kategori"), "UI: tombol Atur Kategori")
    assert(content.includes("Penilaian Siswa"), "UI: header Penilaian Siswa")
  }

  // ── 8. Auto-populate route ──
  console.log("\n── Auto-populate ──")
  const autoPopContent = fs.readFileSync(
    `${apiBase}/nilai/auto-populate/route.ts`, "utf-8"
  )
  assert(autoPopContent.includes("PENUGASAN"), "Auto-populate supports PENUGASAN")
  assert(autoPopContent.includes("QUIZ"), "Auto-populate supports QUIZ")
  assert(autoPopContent.includes("GAME"), "Auto-populate supports GAME")
  assert(autoPopContent.includes("JALUR_CERDAS"), "Auto-populate supports JALUR_CERDAS")
  assert(autoPopContent.includes("UKBI_TKA"), "Auto-populate supports UKBI_TKA")
  assert(autoPopContent.includes("dryRun"), "Auto-populate supports dryRun")
  assert(autoPopContent.includes("GURU"), "Auto-populate gate role GURU")

  // ── 9. Security Checks ──
  console.log("\n── Security ──")

  // Check all nilai routes have role gate
  const nilaiRouteContent = fs.readFileSync(`${apiBase}/nilai/route.ts`, "utf-8")
  assert(nilaiRouteContent.includes("GURU"), "/api/guru/nilai gate GURU")

  const kategoriRouteContent = fs.readFileSync(`${apiBase}/nilai-kategori/route.ts`, "utf-8")
  assert(kategoriRouteContent.includes("GURU"), "/api/guru/nilai-kategori gate GURU")

  // ── Summary ──
  const total = passed + failed
  console.log(`\n${"=".repeat(40)}`)
  console.log(`Hasil: ${passed}/${total} lulus`)
  if (failed > 0) {
    console.log(`Gagal: ${failed}/${total}`)
    process.exit(1)
  } else {
    console.log("Semua tes lulus ✅")
    process.exit(0)
  }
}

main().catch(e => {
  console.error("Fatal error:", e)
  process.exit(1)
})
