/**
 * AUDIT UKBI LEAN TARGET — BahasaCerdas.com
 *
 * Audit distribusi UKBI terhadap target 150 soal per track.
 * Total target: 600 soal (4 track × 150).
 *
 * Run: npx tsx scripts/audit-ukbi-lean-target.ts
 */

import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()

const TARGET_PER_TRACK = 150
const TARGET_TOTAL = 600

const SEKSI_TARGET: Record<string, { target: number; simulation: number }> = {
  MERESPONS_KAIDAH: { target: 45, simulation: 10 },
  MEMBACA:          { target: 60, simulation: 15 },
  MENDENGARKAN:     { target: 30, simulation: 5 },
  MENULIS:          { target: 8,  simulation: 0 },
  BERBICARA:        { target: 7,  simulation: 0 },
}

const SEKSI_ORDER = ["MERESPONS_KAIDAH", "MEMBACA", "MENDENGARKAN", "MENULIS", "BERBICARA"]

interface TrackAudit {
  track: string
  tingkat: string
  totalSoal: number
  totalAutoScored: number
  seksiCounts: Record<string, number>
  seksiGaps: Record<string, number>
  legacyCount: number
  originalCount: number
  meetsTarget: boolean
  meetsAutoScored: boolean
  status: "Tersedia" | "Paket awal tersedia" | "Belum tersedia"
}

async function main() {
  console.log("=".repeat(70))
  console.log("  AUDIT UKBI LEAN TARGET — BahasaCerdas.com")
  console.log("  Target: 150 soal per track, 600 total")
  console.log("=".repeat(70))

  const ukbiQuestions = await db.uKBIQuestion.findMany({
    where: { isActive: true },
    select: { id: true, seksi: true, tingkat: true, type: true, isVerified: true },
  })

  console.log(`\n📊 Total UKBI questions: ${ukbiQuestions.length}\n`)

  const TRACKS: { track: string; tingkat: string; label: string }[] = [
    { track: "SD",   tingkat: "SD",   label: "UKBI SD" },
    { track: "SMP",  tingkat: "SMP",  label: "UKBI SMP" },
    { track: "SMA",  tingkat: "SMA",  label: "UKBI SMA" },
    { track: "GURU", tingkat: "GURU", label: "UKBI Guru/Umum" },
  ]

  let grandTotal = 0
  const audits: TrackAudit[] = []

  for (const trk of TRACKS) {
    const questions = ukbiQuestions.filter(q => {
      if (trk.track === "GURU") return q.tingkat === "GURU" || q.tingkat === "UMUM"
      return q.tingkat === trk.tingkat
    })

    const total = questions.length
    grandTotal += total

    const seksiCounts: Record<string, number> = {}
    let legacyCount = 0
    let originalCount = 0
    let totalAutoScored = 0
    const autoScoredSections = ["MERESPONS_KAIDAH", "MEMBACA", "MENDENGARKAN"]

    for (const q of questions) {
      const seksi = q.seksi || "UNKNOWN"
      seksiCounts[seksi] = (seksiCounts[seksi] || 0) + 1
      if (q.isVerified) originalCount++
      else legacyCount++
      if (autoScoredSections.includes(seksi) && q.type === "PILIHAN_GANDA") {
        totalAutoScored++
      }
    }

    const seksiGaps: Record<string, number> = {}
    for (const seksi of SEKSI_ORDER) {
      const count = seksiCounts[seksi] || 0
      const target = SEKSI_TARGET[seksi]?.target || 0
      const gap = Math.max(0, target - count)
      if (gap > 0) seksiGaps[seksi] = gap
    }

    const meetsTarget = total >= TARGET_PER_TRACK
    const meetsAutoScored = totalAutoScored >= 30
    const status: TrackAudit["status"] =
      total >= TARGET_PER_TRACK ? "Tersedia"
      : total >= 30 ? "Paket awal tersedia"
      : "Belum tersedia"

    audits.push({
      track: trk.label,
      tingkat: trk.tingkat,
      totalSoal: total,
      totalAutoScored,
      seksiCounts,
      seksiGaps,
      legacyCount: questions.filter(q => !q.isVerified).length,
      originalCount: questions.filter(q => q.isVerified).length,
      meetsTarget,
      meetsAutoScored,
      status,
    })
  }

  // Print per-track
  for (const a of audits) {
    const flag = a.meetsTarget ? "✅" : a.totalSoal >= 30 ? "⚠️" : "❌"
    console.log(`\n${"=".repeat(60)}`)
    console.log(`  ${flag} ${a.track}`)
    console.log(`  Status: ${a.status}`)
    console.log(`  Total: ${a.totalSoal} soal (target: ${TARGET_PER_TRACK})`)
    console.log(`  Auto-scored pool: ${a.totalAutoScored} soal`)
    console.log(`  Original: ${a.originalCount} | Legacy: ${a.legacyCount}`)

    if (a.seksiGaps && Object.keys(a.seksiGaps).length > 0) {
      console.log(`\n  ⚠️  Kekurangan section:`)
      for (const [seksi, gap] of Object.entries(a.seksiGaps)) {
        const current = a.seksiCounts[seksi] || 0
        const target = SEKSI_TARGET[seksi]?.target || 0
        console.log(`    ${seksi}: ${current}/${target} (kurang ${gap})`)
      }
    } else {
      console.log(`\n  ✅ Semua section mencapai target`)
    }

    console.log(`\n  Distribusi section:`)
    for (const seksi of SEKSI_ORDER) {
      const count = a.seksiCounts[seksi] || 0
      const target = SEKSI_TARGET[seksi]?.target || 0
      const bar = count >= target ? "✅" : count > 0 ? "⚠️" : "⬜"
      const sim = SEKSI_TARGET[seksi]?.simulation || 0
      console.log(`    ${bar} ${seksi}: ${count} soal (target: ${target}, simulasi: ${sim})`)
    }
  }

  // Summary
  console.log(`\n${"=".repeat(60)}`)
  console.log("  RINGKASAN")
  console.log("=".repeat(60))
  console.log(`  Total UKBI: ${grandTotal} / ${TARGET_TOTAL}`)
  console.log(`  Target total: ${grandTotal >= TARGET_TOTAL ? "✅ Tercapai" : "❌ Belum"}`)

  for (const a of audits) {
    console.log(`  ${a.track}: ${a.totalSoal} soal — ${a.status}`)
  }

  console.log(`\n  Tracks mencapai 150:`)
  for (const a of audits) {
    console.log(`    ${a.meetsTarget ? "✅" : "❌"} ${a.track}: ${a.totalSoal}`)
  }

  console.log(`\n  Total new questions needed: ${audits.reduce((s, a) => s + Object.values(a.seksiGaps || {}).reduce((x, y) => x + y, 0), 0)}`)

  // Simulasi check
  console.log(`\n  Simulasi 30 soal dapat dirakit?`)
  for (const a of audits) {
    const kaidah = Math.min((a.seksiCounts["MERESPONS_KAIDAH"] || 0), 10)
    const membaca = Math.min((a.seksiCounts["MEMBACA"] || 0), 15)
    const mendengarkan = Math.min((a.seksiCounts["MENDENGARKAN"] || 0), 5)
    const canAssemble = kaidah >= 10 && membaca >= 15 && mendengarkan >= 5
    console.log(`    ${canAssemble ? "✅" : "❌"} ${a.track}: kaidah=${kaidah}/10, membaca=${membaca}/15, mendengarkan=${mendengarkan}/5`)
  }

  await db.$disconnect()
  process.exit(0)
}

main().catch(e => { console.error("❌ Audit crash:", e.message); process.exit(1) })
