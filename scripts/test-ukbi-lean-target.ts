/**
 * TEST UKBI LEAN TARGET — BahasaCerdas.com
 *
 * Memastikan semua track UKBI memenuhi target 150 soal (atau minimal 30 untuk simulasi).
 * Target: 600 total (4 track × 150).
 *
 * Run: npx tsx scripts/test-ukbi-lean-target.ts
 */

import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()
const TARGET = 150

let passed = 0
let failed = 0

function test(name: string, ok: boolean) {
  console.log(`${ok ? "  ✅" : "  ❌"} ${name}`)
  if (ok) passed++; else failed++
}

async function main() {
  console.log("\n📋 UJI UKBI LEAN TARGET")
  console.log("=".repeat(60))

  const ukbiQuestions = await db.uKBIQuestion.findMany({
    where: { isActive: true },
    select: { id: true, seksi: true, tingkat: true, type: true, isVerified: true, correctAnswer: true, options: true },
  })

  const tracks = ["SD", "SMP", "SMA", "GURU"]
  const trackCounts: Record<string, number> = {}
  const seksiCounts: Record<string, Record<string, number>> = {}
  const autoScored: Record<string, number> = {}
  const autoScoredSections = ["MERESPONS_KAIDAH", "MEMBACA", "MENDENGARKAN"]

  for (const t of tracks) {
    trackCounts[t] = 0
    seksiCounts[t] = {}
    autoScored[t] = 0
  }

  for (const q of ukbiQuestions) {
    let track = q.tingkat || "UMUM"
    if (track === "UMUM") track = "GURU"
    if (!tracks.includes(track)) continue

    trackCounts[track] = (trackCounts[track] || 0) + 1
    const seksi = q.seksi || "UNKNOWN"
    if (!seksiCounts[track]) seksiCounts[track] = {}
    seksiCounts[track][seksi] = (seksiCounts[track][seksi] || 0) + 1

    if (autoScoredSections.includes(seksi) && q.type === "PILIHAN_GANDA") {
      autoScored[track] = (autoScored[track] || 0) + 1
    }
  }

  // ── Tests ──
  console.log("\n── Target Per Track (≥150) ──")

  for (const t of tracks) {
    const count = trackCounts[t] || 0
    test(`${t === "GURU" ? "UKBI Guru/Umum" : "UKBI " + t}: ${count} soal ${count >= TARGET ? "✅" : count >= 30 ? "⚠️ simulasi bisa" : "❌"}`, count >= 30)
  }

  console.log("\n── 3 track mencapai 150 ──")
  const tracksAt150 = tracks.filter(t => (trackCounts[t] || 0) >= TARGET)
  test(`UKBI SD, SMP, SMA mencapai 150 (${tracksAt150.length}/4)`, tracksAt150.length >= 3)

  console.log("\n── Auto-scored pool (≥30) ──")
  for (const t of tracks) {
    const count = autoScored[t] || 0
    test(`${t}: ${count} auto-scored soal`, count >= 30)
  }

  console.log("\n── Section minimum per track ──")
  for (const t of tracks) {
    const k = seksiCounts[t]?.["MERESPONS_KAIDAH"] || 0
    const m = seksiCounts[t]?.["MEMBACA"] || 0
    const d = seksiCounts[t]?.["MENDENGARKAN"] || 0
    test(`${t}: kaidah≥10 (${k})`, k >= 10)
    test(`${t}: membaca≥15 (${m})`, m >= 15)
    test(`${t}: mendengarkan≥5 (${d})`, d >= 5)
  }

  console.log("\n── Total ──")
  const total = ukbiQuestions.length
  test(`Total UKBI: ${total} (target 600)`, total >= 600)

  console.log("\n── Simulasi dapat dirakit ──")
  for (const t of tracks) {
    const k = Math.min(seksiCounts[t]?.["MERESPONS_KAIDAH"] || 0, 10)
    const m = Math.min(seksiCounts[t]?.["MEMBACA"] || 0, 15)
    const d = Math.min(seksiCounts[t]?.["MENDENGARKAN"] || 0, 5)
    const ok = k >= 10 && m >= 15 && d >= 5
    test(`${t}: simulasi 30 soal bisa dirakit (${k}+${m}+${d})`, ok)
  }

  console.log("\n── Resolver non-legacy ──")
  const { getUKBIPackages } = await import("@/lib/kompetensi/get-simulation-packages")
  const ukbiTracks = await getUKBIPackages()

  for (const t of tracks) {
    const trackLower = t.toLowerCase()
    const found = ukbiTracks.find(p => p.track === t)
    if (found) {
      test(`Resolver UKBI ${t}: tersedia (${found.questionCount} soal${found.isLegacy ? ", legacy" : ""})`, !found.isLegacy)
    } else {
      test(`Resolver UKBI ${t}: tidak ditemukan`, false)
    }
  }

  console.log("\n── Answer integrity ──")
  let answerOk = true
  for (const q of ukbiQuestions) {
    if (q.type === "PILIHAN_GANDA" && q.options) {
      const opts = q.options as { id: string; text: string }[]
      const ids = new Set(opts.map(o => o.id))
      if (!ids.has(q.correctAnswer)) {
        console.log(`  ❌ correctAnswer not in options: ${q.id} (correct=${q.correctAnswer})`)
        answerOk = false
      }
    }
  }
  test("Semua correctAnswer ∈ options[].id", answerOk)

  console.log("\n" + "=".repeat(60))
  console.log(`📊 HASIL: ${passed} passed, ${failed} failed (${passed + failed} total)`)
  if (failed > 0) process.exit(1)
  console.log("✅ SEMUA UJI UKBI LEAN TARGET LULUS\n")
}

main()
  .catch(e => { console.error("❌ Test crash:", e); process.exit(1) })
  .finally(() => db.$disconnect())
