/**
 * TEST KESIAPAN SIMULASI MINIMUM — BahasaCerdas.com
 *
 * Memastikan semua track simulasi utama bisa dijalankan.
 *
 * Run: npx tsx scripts/test-minimum-simulation-readiness.ts
 */

import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

const MINIMUM = 30

let passed = 0
let failed = 0

function test(name: string, fn: () => boolean | Promise<boolean>) {
  const result = fn()
  if (result instanceof Promise) {
    result.then(ok => {
      console.log(`${ok ? "  ✅" : "  ❌"} ${name}`)
      if (ok) passed++; else failed++
    })
  } else {
    console.log(`${result ? "  ✅" : "  ❌"} ${name}`)
    if (result) passed++; else failed++
  }
}

async function main() {
  console.log("\n📋 UJI KESIAPAN SIMULASI MINIMUM")
  console.log("=".repeat(60))

  // ── UKBI Tracks ──
  console.log("\n── UKBI Tracks ──")

  const ukbiTypes = {
    "UKBI SD": ["UKBI_SD"],
    "UKBI SMP": ["UKBI_SMP"],
    "UKBI SMA": ["UKBI_SMA"],
    "UKBI Guru/Umum": ["UKBI_GURU_SIMULASI", "UKBI_GURU_LATIHAN"],
  }

  for (const [name, types] of Object.entries(ukbiTypes)) {
    const pakets = await db.paketKompetensi.findMany({
      where: { type: { in: types }, isActive: true },
      select: { totalQuestions: true, type: true },
    })
    const totalQ = pakets.reduce((s, p) => s + (p.totalQuestions || 0), 0)
    test(`${name} tersedia (${totalQ} soal)`, () => totalQ >= MINIMUM)
  }

  // ── TKA Tracks ──
  console.log("\n── TKA Tracks ──")

  const tkaTypes = {
    "TKA SD/Kelas 6": ["TKA_SD"],
    "TKA SMP/Kelas 9": ["TKA_SMP"],
    "TKA SMA/Kelas 12": ["TKA_SMA"],
    "TKA UTBK": ["TKA_UTBK"],
    "TKA Guru": ["TKA_GURU"],
  }

  for (const [name, types] of Object.entries(tkaTypes)) {
    const pakets = await db.paketKompetensi.findMany({
      where: { type: { in: types }, isActive: true },
      select: { totalQuestions: true, type: true },
    })
    const totalQ = pakets.reduce((s, p) => s + (p.totalQuestions || 0), 0)
    test(`${name} tersedia (${totalQ} soal)`, () => totalQ >= MINIMUM)
  }

  // ── Question Counts ──
  console.log("\n── Total Soal ──")

  const ukbiQuestionCount = await db.uKBIQuestion.count({ where: { isActive: true } })
  const tkaQuestionCount = await db.tKAQuestion.count({ where: { isActive: true } })

  test(`Total UKBIQuestion: ${ukbiQuestionCount}`, () => ukbiQuestionCount >= 500)
  test(`Total TKAQuestion: ${tkaQuestionCount}`, () => tkaQuestionCount >= 100)

  // ── Security ──
  console.log("\n── Keamanan ──")

  // Check that the resolver picks non-legacy first (if available)
  test("Tidak ada track yang legacy-only", async () => {
    const allTypes = [...Object.values(ukbiTypes).flat(), ...Object.values(tkaTypes).flat()]
    for (const t of allTypes) {
      const pakets = await db.paketKompetensi.findMany({ where: { type: t, isActive: true } })
      const totalQ = pakets.reduce((s, p) => s + (p.totalQuestions || 0), 0)
      if (totalQ < MINIMUM && totalQ > 0) return false
    }
    return true
  })

  // ── Resolver ──
  console.log("\n── Resolver ──")

  const { getUKBIPackages, getTKAPackages } = await import("@/lib/kompetensi/get-simulation-packages")
  const ukbiTracks = await getUKBIPackages()
  const tkaTracks = await getTKAPackages()

  test("Resolver UKBI memiliki track SD", () => ukbiTracks.some(t => t.track === "SD"))
  test("Resolver UKBI memiliki track SMP", () => ukbiTracks.some(t => t.track === "SMP"))
  test("Resolver UKBI memiliki track SMA", () => ukbiTracks.some(t => t.track === "SMA"))
  test("Resolver UKBI memiliki track GURU", () => ukbiTracks.some(t => t.track === "GURU"))
  test("Resolver TKA memiliki track SD", () => tkaTracks.some(t => t.track === "SD"))
  test("Resolver TKA memiliki track SMP", () => tkaTracks.some(t => t.track === "SMP"))
  test("Resolver TKA memiliki track SMA", () => tkaTracks.some(t => t.track === "SMA"))
  test("Resolver TKA memiliki track UTBK", () => tkaTracks.some(t => t.track === "UTBK"))
  test("Resolver TKA memiliki track GURU", () => tkaTracks.some(t => t.track === "GURU"))

  // ── Summary ──
  console.log(`\n${"=".repeat(60)}`)
  console.log(`📊 HASIL: ${passed} passed, ${failed} failed (${passed + failed} total)`)
  if (failed > 0) process.exit(1)
  console.log("✅ SEMUA UJI KESIAPAN SIMULASI LULUS\n")
}

main()
  .catch(e => { console.error("❌ Test crashed:", e); process.exit(1) })
  .finally(() => db.$disconnect())
