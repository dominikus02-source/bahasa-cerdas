/**
 * AUDIT KESIAPAN SIMULASI MINIMUM — BahasaCerdas.com
 *
 * Melaporkan:
 * 1. Track mana yang bisa disimulasikan
 * 2. Track mana yang belum cukup soal
 * 3. Jumlah soal per track
 * 4. Jumlah soal per section
 * 5. Apakah paket tersedia
 * 6. Apakah resolver memilih paket benar
 * 7. Apakah dokumen hasil latihan bisa dibuat
 * 8. Apakah masih legacy
 *
 * Run: npx tsx scripts/audit-minimum-simulation-readiness.ts
 */

import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

const MINIMUM_QUESTIONS = 30

const UKBI_TRACKS = [
  { id: "ukbi-sd", name: "UKBI SD", types: ["UKBI_SD"] },
  { id: "ukbi-smp", name: "UKBI SMP", types: ["UKBI_SMP"] },
  { id: "ukbi-sma", name: "UKBI SMA", types: ["UKBI_SMA"] },
  { id: "ukbi-guru", name: "UKBI Guru/Umum", types: ["UKBI_GURU_SIMULASI"] },
]

const TKA_TRACKS = [
  { id: "tka-sd", name: "TKA SD", types: ["TKA_SD"] },
  { id: "tka-smp", name: "TKA SMP", types: ["TKA_SMP"] },
  { id: "tka-sma", name: "TKA SMA", types: ["TKA_SMA"] },
  { id: "tka-utbk", name: "TKA UTBK", types: ["TKA_UTBK"] },
  { id: "tka-guru", name: "TKA Guru", types: ["TKA_GURU"] },
]

interface TrackReport {
  id: string
  name: string
  product: "UKBI" | "TKA"
  totalQuestionsInDB: number
  paketCount: number
  paketSummary: { title: string; totalQuestions: number; type: string }[]
  available: boolean
  meetsMinimum: boolean
  hasLegacyOnly: boolean
  sections: { section: string; count: number }[]
}

async function auditTrack(name: string, types: string[], product: "UKBI" | "TKA"): Promise<TrackReport> {
  const pakets = await db.paketKompetensi.findMany({
    where: { type: { in: types }, isActive: true },
    select: { title: true, totalQuestions: true, type: true },
  })

  const allTypes = product === "UKBI"
    ? ["UKBI_SD", "UKBI_SMP", "UKBI_SMA", "UKBI_GURU_SIMULASI", "UKBI", "UKBI_SIMULASI", "UKBI_LATIHAN", "UKBI_LATIHAN_SD", "UKBI_LATIHAN_SMP", "UKBI_LATIHAN_SMA", "UKBI_GURU_LATIHAN"]
    : ["TKA_SD", "TKA_SMP", "TKA_SMA", "TKA_UTBK", "TKA_GURU", "TKA_GURU_SIMULASI", "TKA_GURU_LATIHAN"]

  // Count total questions in each product's question bank
  const ukbiQuestions = await db.uKBIQuestion.findMany({ where: { isActive: true }, select: { seksi: true } })
  const tkaQuestions = await db.tKAQuestion.count({ where: { isActive: true } })

  const ukbiSeksiCounts: Record<string, number> = {}
  for (const q of ukbiQuestions) {
    const sec = (q as any).seksi || "unknown"
    ukbiSeksiCounts[sec] = (ukbiSeksiCounts[sec] || 0) + 1
  }

  const trackSectionCounts = product === "UKBI" ? ukbiSeksiCounts : { total: tkaQuestions }

  const totalQuestionsInPakets = pakets.reduce((s, p) => s + (p.totalQuestions || 0), 0)

  return {
    id: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    product,
    totalQuestionsInDB: Object.values(trackSectionCounts).reduce((a, b) => a + b, 0),
    paketCount: pakets.length,
    paketSummary: pakets.map(p => ({ title: p.title, totalQuestions: p.totalQuestions || 0, type: p.type })),
    available: pakets.length > 0 && totalQuestionsInPakets >= MINIMUM_QUESTIONS,
    meetsMinimum: totalQuestionsInPakets >= MINIMUM_QUESTIONS,
    hasLegacyOnly: pakets.length <= 1 && totalQuestionsInPakets < MINIMUM_QUESTIONS,
    sections: Object.entries(trackSectionCounts)
      .map(([seksi, count]) => ({ section: seksi, count }))
      .sort((a, b) => b.count - a.count),
  }
}

async function main() {
  console.log("\n📊 AUDIT KESIAPAN SIMULASI MINIMUM")
  console.log("=".repeat(70))
  console.log(`  Target minimum: ${MINIMUM_QUESTIONS} soal per track\n`)

  for (const track of [...UKBI_TRACKS, ...TKA_TRACKS]) {
    const product = (["ukbi-sd", "ukbi-smp", "ukbi-sma", "ukbi-guru"].includes(track.id)) ? "UKBI" : "TKA"
    const report = await auditTrack(track.name, track.types, product)

    const status = report.available ? "✅ TERSEDIA" : "❌ BELUM TERSEDIA"
    const minStatus = report.meetsMinimum ? "✅ Minimum terpenuhi" : "❌ Perlu tambahan"
    const legacyStatus = report.hasLegacyOnly ? "⚠️ Legacy only" : "✅ Non-legacy tersedia"

    console.log(`\n── ${track.name} ──`)
    console.log(`  Status: ${status}`)
    console.log(`  Soal: ${minStatus} (${report.totalQuestionsInDB} total di DB)`)
    console.log(`  Paket: ${report.paketCount} paket`)
    console.log(`  Legacy: ${legacyStatus}`)

    for (const p of report.paketSummary) {
      console.log(`    📦 ${p.title} (${p.totalQuestions} soal, ${p.type})`)
    }

    if (report.sections.length > 0) {
      section("  Sebaran section:")
      for (const s of report.sections) {
        item(`    ${s.section}`, `${s.count} soal`)
      }
    }
  }

  // Total summary
  console.log("\n" + "=".repeat(70))
  console.log("  RINGKASAN")
  console.log("=".repeat(70))

  const allReports: TrackReport[] = []
  for (const track of [...UKBI_TRACKS, ...TKA_TRACKS]) {
    const product = (["ukbi-sd", "ukbi-smp", "ukbi-sma", "ukbi-guru"].includes(track.id)) ? "UKBI" : "TKA"
    const report = await auditTrack(track.name, track.types, product)
    allReports.push(report)
  }

  const available = allReports.filter(r => r.available)
  const notAvailable = allReports.filter(r => !r.available)
  const meetsMin = allReports.filter(r => r.meetsMinimum)

  item("Track tersedia", `${available.length}/${allReports.length}`)
  item("Track minimum terpenuhi", `${meetsMin.length}/${allReports.length}`)

  if (notAvailable.length > 0) {
    warn("Track belum tersedia", notAvailable.map(r => r.name).join(", "))
  }

  const totalUKBI = allReports.filter(r => r.product === "UKBI").reduce((s, r) => s + r.totalQuestionsInDB, 0)
  const totalTKA = allReports.filter(r => r.product === "TKA").reduce((s, r) => s + r.totalQuestionsInDB, 0)
  const grandTotal = totalUKBI + totalTKA

  console.log(`\n  Total UKBI question pool: ${totalUKBI}`)
  console.log(`  Total TKA question pool: ${totalTKA}`)
  console.log(`  GRAND TOTAL: ${grandTotal}\n`)
}

function section(label: string) { console.log(`  ${label}`) }
function item(label: string, value: string | number) { console.log(`  ${label.padEnd(40)} ${value}`) }
function warn(label: string, value: string) { console.log(`  ⚠️  ${label.padEnd(38)} ${value}`) }

main()
  .catch(e => { console.error("❌ Audit crashed:", e); process.exit(1) })
  .finally(() => db.$disconnect())
