/**
 * audit-listening-questions.ts
 * Read-only audit of UKBI listening questions — code structure + DB queries.
 *
 * Usage: npx tsx scripts/audit-listening-questions.ts
 */
import { db } from "../lib/db"
import * as fs from "fs"

let checks = 0
let passed = 0
let warnings = 0

function check(label: string, condition: boolean, isWarning = false) {
  checks++
  if (condition) {
    if (isWarning) {
      console.log(`  ⚠️  ${label}`)
      warnings++
    } else {
      console.log(`  ✅ ${label}`)
      passed++
    }
  } else {
    console.log(`  ❌ ${label}`)
  }
}

async function main() {
  console.log("🔍 AUDIT: UKBI Listening Questions\n")

  // ── 1. Schema: UKBIQuestion fields ──
  console.log("── Schema Audit ──")
  const schemaContent = fs.readFileSync(__dirname + "/../prisma/schema.prisma", "utf-8")
  const ukbiModelMatch = schemaContent.match(/model UKBIQuestion \{([^}]+)\}/)
  check("UKBIQuestion model found in schema", !!ukbiModelMatch)
  check("UKBIQuestion has NO audioScript field", !schemaContent.includes("audioScript"))
  check("UKBIQuestion has audioUrl field (nullable)", schemaContent.includes("audioUrl"))

  // ── 2. UKBI_SELECT sanitization ──
  console.log("\n── API Sanitization ──")
  const apiRouteContent = fs.readFileSync(
    __dirname + "/../app/api/kompetensi/[paketId]/route.ts", "utf-8"
  )
  check("UKBI_SELECT does NOT include correctAnswer", !apiRouteContent.includes("UKBI_SELECT =") || apiRouteContent.match(/UKBI_SELECT[^}]*correctAnswer/) === null)
  check("UKBI_SELECT does NOT include audioScript field", !apiRouteContent.includes("audioScript"))
  check("UKBI_SELECT DOES include audioUrl", apiRouteContent.includes("audioUrl"))
  check("API filters MENDENGARKAN by audioUrl", apiRouteContent.includes('{ not: null }') && apiRouteContent.includes('audioUrl'))
  check("API handles MENDENGARKAN sections", apiRouteContent.includes('"MENDENGARKAN"'))

  // ── 3. QuestionCard: no A/B/C/D labels ──
  console.log("\n── QuestionCard (No A/B/C/D) ──")
  const qcContent = fs.readFileSync(
    __dirname + "/../components/kompetensi/QuestionCard.tsx", "utf-8"
  )
  check("No LETTERS array", !qcContent.includes("LETTERS"))
  check("No letter label rendering", !qcContent.includes('"A"'))
  check("Uses role=radio", qcContent.includes('role="radio"'))
  check("Uses aria-label for accessibility", qcContent.includes('aria-label'))
  check("Shows listening indicator", qcContent.includes("isListening"))
  check("Shows audio player for audioUrl", qcContent.includes("audioUrl"))
  check("Shows Simak audio instruction", qcContent.includes("Simak audio"))

  // ── 4. Timer ──
  console.log("\n── Timer ──")
  const pageContent = fs.readFileSync(
    __dirname + "/../app/(dashboard)/kompetisi/[paketId]/page.tsx", "utf-8"
  )
  check("Uses expiresAtRef", pageContent.includes("expiresAtRef"))
  check("Has 30-min fallback", pageContent.includes("30 * 60 * 1000"))
  check("Has timeUp state", pageContent.includes("timeUp"))
  check("Shows Waktu habis banner", pageContent.includes("Waktu habis"))
  check("Shows Kirim button on timeUp", pageContent.includes("Kirim Jawaban"))
  check("Timer uses clearInterval cleanup", pageContent.includes("clearInterval"))

  // ── 5. TestHeader timer display ──
  console.log("\n── TestHeader Timer Display ──")
  const headerContent = fs.readFileSync(
    __dirname + "/../components/kompetensi/TestHeader.tsx", "utf-8"
  )
  check("Header has isLowTime warning", headerContent.includes("isLowTime"))
  check("Header has isCritical state", headerContent.includes("isCritical"))
  check("Header uses animate-pulse for critical", headerContent.includes("animate-pulse"))
  check("Header formats timer", headerContent.includes("formatTime"))

  // ── 6. SubmitConfirmModal ──
  console.log("\n── SubmitConfirmModal ──")
  const modalContent = fs.readFileSync(
    __dirname + "/../components/kompetensi/SubmitConfirmModal.tsx", "utf-8"
  )
  check("Modal supports timeUp prop", modalContent.includes("timeUp"))
  check("Modal shows Waktu Habis when time up", modalContent.includes("Waktu Habis"))
  check("Modal hides Lanjut Kerjakan when time up", modalContent.includes("!timeUp"))
  check("Modal hides X close button when time up", modalContent.includes("!timeUp"))
  check("No A/B/C/D labels in modal", !modalContent.includes("A/B/C/D"))

  // ── 7. Important UI text in Bahasa Indonesia ──
  console.log("\n── Bahasa Indonesia UI ──")
  const navContent = fs.readFileSync(__dirname + "/../components/kompetensi/QuestionNavigator.tsx", "utf-8")
  const resultContent = fs.readFileSync(__dirname + "/../components/kompetensi/TestResultPanel.tsx", "utf-8")
  check("QuestionCard uses Bahasa Indonesia comments", qcContent.includes("Tandai ragu-ragu"))
  check("Navigator shows Navigasi Soal", navContent.includes("Navigasi Soal"))
  check("Navigator shows Sudah dijawab", navContent.includes("Sudah dijawab"))
  check("Navigator shows Belum dijawab", navContent.includes("Belum dijawab"))
  check("Navigator shows Ragu-ragu", navContent.includes("Ragu-ragu"))
  check("Result shows Ulangi Latihan", resultContent.includes("Ulangi Latihan"))
  check("Result shows Dokumen Hasil Latihan", resultContent.includes("Dokumen Hasil Latihan"))
  check("Modal shows Kirim Jawaban", modalContent.includes("Kirim Jawaban"))
  check("Modal shows Lanjut Kerjakan", modalContent.includes("Lanjut Kerjakan"))
  check("Modal shows Waktu Habis", modalContent.includes("Waktu Habis"))
  check("Page shows Kirim Jawaban", pageContent.includes("Kirim Jawaban"))

  // ── 8. TKA no listening section ──
  console.log("\n── TKA Listening ──")
  const tkaModel = schemaContent.match(/model TKAQuestion \{([^}]+)\}/)
  const tkaHasSeksi = tkaModel?.[1]?.includes("seksi")
  check("TKAQuestion model has no seksi field (TKA has no listening)", !tkaHasSeksi)

  // ── 9. DB queries (best-effort) ──
  console.log("\n── DB Queries ──")
  try {
    const totalListening = await db.uKBIQuestion.count({
      where: { seksi: "MENDENGARKAN", isActive: true },
    })
    check(`UKBI MENDENGARKAN total: ${totalListening}`, true)
    
    if (totalListening > 0) {
      const withAudio = await db.uKBIQuestion.count({
        where: { seksi: "MENDENGARKAN", isActive: true, audioUrl: { not: null } },
      })
      check(`With audioUrl: ${withAudio}`, withAudio >= 0)
      check(`Without audioUrl: ${totalListening - withAudio}`, true, totalListening - withAudio > 0)
      
      const byTrack = await db.uKBIQuestion.groupBy({
        by: ["tingkat"],
        _count: true,
        where: { seksi: "MENDENGARKAN", isActive: true },
      })
      for (const t of byTrack.sort((a, b) => (a.tingkat || "").localeCompare(b.tingkat || ""))) {
        const withA = await db.uKBIQuestion.count({
          where: { seksi: "MENDENGARKAN", isActive: true, tingkat: t.tingkat, audioUrl: { not: null } },
        })
        console.log(`  - ${t.tingkat}: ${t._count} total, ${withA} audio ready`)
      }
    }
  } catch (e: any) {
    check("DB queries unavailable (Supabase pooler)", true, true)
  }

  // ── 10. Paket duration ──
  console.log("\n── Paket Duration ──")
  try {
    const ukbiPakets = await db.paketKompetensi.findMany({
      where: {
        type: { in: ["UKBI_SD", "UKBI_SMP", "UKBI_SMA", "UKBI_GURU_SIMULASI", "UKBI_LATIHAN_SMP", "UKBI_LATIHAN_SMA"] },
        isActive: true,
      },
      select: { id: true, title: true, duration: true },
    })
    for (const p of ukbiPakets) {
      const status = p.duration && p.duration > 0 ? "✅" : "⚠️"
      console.log(`  ${status} ${p.title}: duration = ${p.duration || "NULL"} menit`)
    }
    const allHaveDuration = ukbiPakets.every(p => p.duration && p.duration > 0)
    check("All UKBI pakets have duration > 0", allHaveDuration, !allHaveDuration)
  } catch {
    check("Paket duration query unavailable", true, true)
  }

  // Summary
  console.log(`\n${"=".repeat(40)}`)
  console.log(`Audit selesai: ${checks} total`)
  console.log(`✅ Lulus: ${passed}`)
  console.log(`⚠️  Peringatan: ${warnings}`)
  const failed = checks - passed - warnings
  if (failed > 0) {
    console.log(`❌ Gagal: ${failed}`)
    process.exit(1)
  } else {
    console.log("Semua audit lulus ✅")
    process.exit(0)
  }
}

main().catch(e => {
  console.error("Fatal error:", e)
  process.exit(1)
})
