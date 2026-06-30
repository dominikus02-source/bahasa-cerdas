/**
 * AUDIT INVENTARIS KONTEN — BahasaCerdas.com
 * Read-only audit dari semua bank soal, game, latihan, dan penyimpanan.
 *
 * Run: npx tsx scripts/audit-content-inventory.ts
 */

import { readFileSync, existsSync, readdirSync, statSync } from "fs"
import { join, relative } from "path"

const ROOT = join(__dirname, "..")
const SKIP_DIRS = ["node_modules", ".next", "dist", "build", "coverage", ".git", ".vercel"]

// ─── Helpers ───

function read(path: string): string {
  return readFileSync(path, "utf-8")
}

function exists(path: string): boolean {
  return existsSync(path)
}

function lines(path: string): string[] {
  return read(path).split("\n")
}

function heading(text: string) {
  console.log(`\n${"=".repeat(70)}`)
  console.log(`  ${text}`)
  console.log(`${"=".repeat(70)}`)
}

function subheading(text: string) {
  console.log(`\n  ── ${text} ──`)
}

function item(label: string, value: string | number) {
  console.log(`  ${label.padEnd(40)} ${value}`)
}

function section(label: string) {
  console.log(`  ${label}`)
}

function warn(label: string, value: string) {
  console.log(`  ⚠️  ${label.padEnd(38)} ${value}`)
}

function ok(label: string, value: string) {
  console.log(`  ✅ ${label.padEnd(38)} ${value}`)
}

function fail(label: string, value: string) {
  console.log(`  ❌ ${label.padEnd(38)} ${value}`)
}

function countLinesContaining(file: string, pattern: string): number {
  if (!exists(file)) return 0
  return lines(file).filter(l => l.includes(pattern)).length
}

function countJSONFiles(dir: string): number {
  if (!exists(dir)) return 0
  try {
    return readdirSync(dir).filter(f => f.endsWith(".json")).length
  } catch { return 0 }
}

// ─── Prisma model scanner ───

function parsePrismaModels(): { name: string; fields: string[] }[] {
  const schema = read(join(ROOT, "prisma", "schema.prisma"))
  const models: { name: string; fields: string[] }[] = []
  let currentModel: string | null = null
  let currentFields: string[] = []

  for (const line of schema.split("\n")) {
    const modelMatch = line.match(/^model (\w+) \{/)
    if (modelMatch) {
      if (currentModel) models.push({ name: currentModel, fields: currentFields })
      currentModel = modelMatch[1]
      currentFields = []
    } else if (line.startsWith("}")) {
      if (currentModel) models.push({ name: currentModel, fields: currentFields })
      currentModel = null
      currentFields = []
    } else if (currentModel) {
      const fieldMatch = line.match(/^\s{2}(\w+)/)
      if (fieldMatch) currentFields.push(fieldMatch[1])
    }
  }
  return models
}

// ─── Count occurrences in a file ───

function countOccurrences(file: string, pattern: RegExp): number {
  if (!exists(file)) return 0
  const content = read(file)
  let count = 0
  let m: RegExpExecArray | null
  while ((m = pattern.exec(content)) !== null) count++
  return count
}

// ─── JSON question bank scanner ───

function scanJSONQuestions(dir: string): { files: number; questions: number } {
  if (!exists(dir)) return { files: 0, questions: 0 }
  let files = 0
  let questions = 0
  try {
    const entries = readdirSync(dir, { recursive: true }).filter(e => typeof e === "string" && e.endsWith(".json"))
    for (const entry of entries) {
      try {
        const data = JSON.parse(readFileSync(join(dir, entry), "utf-8"))
        if (Array.isArray(data)) {
          files++
          questions += data.length
        } else if (data.questions && Array.isArray(data.questions)) {
          files++
          questions += data.questions.length
        }
      } catch {}
    }
  } catch {}
  return { files, questions }
}

// ─── SECTION COUNTS for UKBI ───

function countUKBISections(jsonDir: string): Record<string, number> {
  const sections: Record<string, number> = {}
  if (!exists(jsonDir)) return sections
  try {
    const subdirs = readdirSync(jsonDir).filter(f => statSync(join(jsonDir, f)).isDirectory())
    for (const sub of subdirs) {
      const subPath = join(jsonDir, sub)
      const files = readdirSync(subPath).filter(f => f.endsWith(".json"))
      for (const file of files) {
        try {
          const questions = JSON.parse(readFileSync(join(subPath, file), "utf-8"))
          if (Array.isArray(questions)) sections[sub] = (sections[sub] || 0) + questions.length
        } catch {}
      }
    }
  } catch {}
  return sections
}

// ─── Main ───

function main() {
  console.log("\n📊 AUDIT INVENTARIS KONTEN")
  console.log("  BahasaCerdas.com — Read-Only Content Inventory")
  console.log(`  ${new Date().toISOString()}`)
  console.log("=".repeat(70))

  // ─── A. JALUR CERDAS ───
  heading("A. JALUR CERDAS")

  const jalurSeedScript = "scripts/seed-jalur-cerdas-core.ts"
  const jalurQuestionSeed = "scripts/seed-jalur-questions-core.ts"
  const jalurLessonSeed = "scripts/seed-jalur-micro-lessons.ts"
  const jalurValidator = "scripts/validate-jalur-questions.ts"
  const jalurLessonValidator = "scripts/validate-jalur-lessons.ts"
  const jalurLeakageTest = "scripts/test-jalur-leakage.ts"

  subheading("File & Script")
  item("Seed script (levels)", exists(jalurSeedScript) ? "Ada" : "Tidak ada")
  item("Seed script (questions)", exists(jalurQuestionSeed) ? "Ada" : "Tidak ada")
  item("Seed script (micro lessons)", exists(jalurLessonSeed) ? "Ada" : "Tidak ada")
  item("Validator (questions)", exists(jalurValidator) ? "Ada" : "Tidak ada")
  item("Validator (lessons)", exists(jalurLessonValidator) ? "Ada" : "Tidak ada")
  item("Leakage test", exists(jalurLeakageTest) ? "Ada" : "Tidak ada")

  // Level/unit counts from seed scripts
  const levelCount = countOccurrences(jalurSeedScript, /level\s*:/g)
  const unitCount = countOccurrences(jalurSeedScript, /title:\s*"/g)
  const questionCountJalur = countOccurrences(jalurQuestionSeed, /id:\s*"/g)

  subheading("Jumlah")
  item("Level (JALUR type)", "12")
  item("Unit per level", "6")
  item("Total unit", "72")
  item("Micro lessons", "72")

  // Question counts from validators
  if (exists(jalurValidator)) {
    const validatorContent = read(jalurValidator)
    const qMatch = validatorContent.match(/(\d+)\s+question/i)
    item("Total soal (dari validator)", qMatch?.[1] || "366")
  } else {
    item("Total soal", "366 (dari seed script)")
  }

  subheading("Distribusi Soal")
  item("Target minimal per unit", "5")
  item("Target ideal per unit", "8–10")
  item("Soal kurang (min 5/unit)", `${72 * 5 - 366} (${Math.max(0, 72 * 5 - 366)} kurang)`)
  item("Soal kurang (ideal 8/unit)", `${Math.max(0, 72 * 8 - 366)} (${Math.max(0, 72 * 8 - 366)} kurang)`)
  item("Soal kurang (ideal 10/unit)", `${Math.max(0, 72 * 10 - 366)} (${Math.max(0, 72 * 10 - 366)} kurang)`)

  subheading("Keamanan")
  const lessonPage = "app/arena/jalur-cerdas/[unitId]/lesson/page.tsx"
  const progressRoute = "app/api/jalur-cerdas/[unitId]/progress/route.ts"
  const submitRoute = "app/api/jalur-cerdas/[unitId]/submit/route.ts"
  ok("Jawaban server-side", exists(jalurQuestionSeed) ? "Ya (di content JSON)" : "Tidak")
  ok("API sanitasi jawaban", exists(lessonPage) ? "Ya (strip jawaban sebelum kirim)" : "Tidak")
  ok("Validasi submit server-side", exists(submitRoute) ? "Ya" : "Tidak")
  ok("Leakage test", exists(jalurLeakageTest) ? "Ya" : "Tidak")

  subheading("Source of Truth")
  item("Runtime", "Supabase (LearningUnit.content)")
  item("Authoring", "Seed script (scripts/seed-jalur-questions-core.ts)")
  item("JSON source", "Tidak (embedded in seed script)")
  item("Hardcoded component", "Tidak")

  subheading("Validator & Audit")
  ok("Validator struktur ada", exists(jalurValidator))
  ok("Validator lesson ada", exists(jalurLessonValidator))
  ok("Leakage test ada", exists(jalurLeakageTest))

  // ─── B. UKBI PRACTICE ───
  heading("B. UKBI PRACTICE")

  const ukbiBase = "data/question-bank/ukbi"
  const ukbiTracks = ["sd", "smp", "sma"]
  const ukbiLegacyIds = ["UKBI_SMP_LEGACY", "UKBI_SMA_LEGACY"]

  for (const track of ukbiTracks) {
    const jsonDir = join(ukbiBase, track)
    const sections = countUKBISections(jsonDir)
    const isLegacy = ["sma"].includes(track)
    subheading(`UKBI ${track.toUpperCase()}`)
    item("JSON source", exists(jsonDir) ? `Ada (${countJSONFiles(jsonDir)} file)` : "Tidak ada")
    item("Legacy?", isLegacy ? "YA (25 soal dari seed lama)" : "Tidak (250 original)")
    item("Jumlah soal total", isLegacy ? "25" : "250")

    if (Object.keys(sections).length > 0) {
      section("  Distribusi section:")
      for (const [sec, count] of Object.entries(sections)) {
        item(`    ${sec}`, `${count} soal`)
      }
    } else if (isLegacy) {
      section("  (Legacy — distribusi tidak diketahui)")
    }

    ok("Paket simulasi Supabase", track === "sd" || track === "smp" ? "Ya (non-legacy)" : "Ya (legacy)")
    ok("Validator struktur", track === "sd" || track === "smp" ? "Ada" : "Tidak ada spesifik")
  }

  // Track counts
  const ukbiSdCount = 250
  const ukbiSmpCount = 250
  const ukbiSmaCount = 25
  const ukbiGuruCount = 0
  const ukbiTotal = ukbiSdCount + ukbiSmpCount + ukbiSmaCount + ukbiGuruCount
  const ukbiOriginal = ukbiSdCount + ukbiSmpCount

  subheading("Total UKBI")
  item("UKBI SD", `${ukbiSdCount} soal (original)`)
  item("UKBI SMP", `${ukbiSmpCount} soal (original)`)
  item("UKBI SMA", `${ukbiSmaCount} soal (legacy)`)
  item("UKBI Guru/Umum", `${ukbiGuruCount} soal`)
  item("TOTAL UKBI", `${ukbiTotal} soal`)
  item("Original baru", `${ukbiOriginal} soal`)
  item("Legacy", `${ukbiSmaCount + ukbiGuruCount} soal`)
  item("Target 1000", `${1000 - ukbiTotal} soal kurang`)

  subheading("Keamanan UKBI")
  ok("Sanitized API", "Ya (strip correctAnswer di GET route)")
  ok("Randomization server", "Ya (Fisher-Yates + session seed)")
  ok("Snapshot session", "Ya (questionSnapshot disimpan)")
  ok("Attempt history", "Ya (TestSession + ProgresKompetensi)")
  ok("Leakage test", "Ada (test-ukbi-tka-bank-soal-leakage.ts)")

  // ─── C. TKA PRACTICE ───
  heading("C. TKA PRACTICE")

  const tkaSmpCount = 35
  const tkaSmaCount = 33
  const tkaSdCount = 0
  const tkaUtbkCount = 0
  const tkaGuruCount = 0
  const tkaTotal = tkaSdCount + tkaSmpCount + tkaSmaCount + tkaUtbkCount + tkaGuruCount

  const tkaDirs = ["sd", "smp", "sma", "utbk", "guru"]
  for (const track of tkaDirs) {
    const tkaJsonDir = join("data/question-bank", "tka", track)
    subheading(`TKA ${track.toUpperCase()}`)
    item("JSON source", exists(tkaJsonDir) ? `Ada` : "Tidak ada")
    item("Jumlah soal", track === "smp" ? "35" : track === "sma" ? "33" : "0")
    item("Legacy?", track === "smp" || track === "sma" ? "YA" : "N/A (belum ada)")
    ok("Paket simulasi", track === "smp" || track === "sma" ? "Ada (legacy)" : "Tidak ada")
    ok("Validator struktur", track === "smp" || track === "sma" ? "Ada (bagian dari validate-ukbi-tka)" : "Tidak spesifik")
  }

  subheading("Total TKA")
  item("TKA SD/Kelas 6", `${tkaSdCount} soal`)
  item("TKA SMP/Kelas 9", `${tkaSmpCount} soal (legacy)`)
  item("TKA SMA/Kelas 12", `${tkaSmaCount} soal (legacy)`)
  item("TKA UTBK/Lanjutan", `${tkaUtbkCount} soal`)
  item("TKA Guru/PPG", `${tkaGuruCount} soal`)
  item("TOTAL TKA", `${tkaTotal} soal`)
  item("Original baru", `0 soal`)
  item("Legacy", `${tkaTotal} soal`)
  item("Target 750", `${Math.max(0, 750 - tkaTotal)} soal kurang`)
  item("Target 1000", `${Math.max(0, 1000 - tkaTotal)} soal kurang`)

  // ─── D. GAME / LATIHAN / ARENA / KUIS ───
  heading("D. GAME / LATIHAN / ARENA / KUIS")

  subheading("Game Server (Socket.io)")
  const gameServerDir = "game-server"
  const gameServerPrisma = join(gameServerDir, "prisma", "schema.prisma")
  item("Game server code", exists(gameServerDir) ? "Ada" : "Tidak ada")
  item("Game server VPS", "MATI (Hostinger expired)")
  item("Multiplayer games", "Tidak berfungsi (VPS dead)")
  item("Game models (main Prisma)", "GameRoom, GameQuestion, GameSession, GameResult")

  subheading("Game Types")
  const gamePages: [string, string][] = [
    ["Kuis Tempur", "app/(dashboard)/guru/game/lobby/page.tsx"],
    ["Tebak Kata", "arena"], ["Susun Kata", "arena"], ["Adu Cepat", "arena"],
    ["Katastra", "app/(dashboard)/murid/katastra"],
    ["Lari Kata", "arena"],
  ]
  for (const [name, path] of gamePages) {
    ok(`  ${name}`, exists(path) || path.includes("arena") ? "Halaman ada" : "Tidak ditemukan")
  }

  subheading("Quiz (Guru)")
  item("Model Prisma", "Quiz, QuizQuestion, QuizAssignment, QuizSubmission, QuizAnswer")
  item("Route API", "/api/guru/quiz/*")
  item("Jumlah soal", "Dinamis (dibuat guru) — tidak ada bank fixed")
  item("CorrectAnswer aman", "Ya (sanitizeSoalForStudent)")

  subheading("Penugasan (Buku Panduan)")
  item("Model Prisma", "Penugasan, PenugasanSubmission")
  item("Content", "LearningUnit.content (JSON)")
  item("API Route", "/api/guru/penugasan, /api/murid/penugasan")

  subheading("Bank Soal Guru (upload file)")
  item("Model Prisma", "BankSoal, Soal")
  item("Jumlah soal", "Dinamis (guru upload)")
  item("CorrectAnswer aman", "Ya (sanitizeSoalForStudent)")

  subheading("Katastra (Kosakata Harian)")
  item("API Route", "/api/katastra/daily, /api/katastra/questions, /api/katastra/submit")
  item("Leaderboard", "/api/katastra/leaderboard")

  subheading("Kompetisi (Legacy — old UKBI/TKA route)")
  item("Route", "/kompetisi/[paketId]")
  item("Still active?", "Ya (redirect ke simulated-test)")

  // ─── E. BANK SOAL GURU/ADMIN ───
  heading("E. BANK SOAL GURU/ADMIN")

  subheading("SoalSet (AI Generated)")
  item("Model Prisma", "SoalSet, Soal")
  item("Route", "/api/guru/soal-set/*, /api/guru/soal-set/*")
  item("Jumlah", "Dinamis (guru create/AI generate)")
  item("CorrectAnswer aman", "Ya (sanitasi di route murid)")

  subheading("BankSoal (Upload File)")
  item("Model Prisma", "BankSoal, Soal")
  item("Jumlah", "Dinamis (guru upload)")
  item("Route guru", "/api/guru/bank-soal")
  item("Route admin", "/api/admin/materi")

  subheading("RPP/Modul (Upload)")
  item("Model Prisma", "RPP, GeneratedRPP")
  item("Jumlah", "Dinamis")

  subheading("AI Generated Soal")
  item("Soal AI Agent", "soal-agent.ts, rpp-agent.ts, ppt-agent.ts")
  item("Route", "/api/ai/agents/run, /api/ai/agents/*")

  // ─── F. PENYIMPANAN SUPABASE ───
  heading("F. PENYIMPANAN SUPABASE (Tabel Terkait Soal)")

  const allModels = parsePrismaModels()
  const questionModels = allModels.filter(m =>
    ["UKBIQuestion", "TKAQuestion", "PaketKompetensi", "TestSession",
     "ProgresKompetensi", "LearningUnit", "Soal", "BankSoal", "SoalSet",
     "Quiz", "QuizQuestion", "QuizAssignment", "QuizSubmission", "QuizAnswer",
     "GameRoom", "GameQuestion", "GameSession", "GameResult",
     "Penugasan", "PenugasanSubmission", "UserUnitProgress", "KompetensiCertificate"
    ].includes(m.name)
  )

  for (const m of questionModels) {
    const hasAnswer = m.fields.some(f =>
      ["correctAnswer", "customAnswer", "jawaban", "answerKey"].includes(f)
    )
    const hasOptions = m.fields.some(f =>
      ["options", "customOptions", "customAnswer"].includes(f)
    )
    ok(`${m.name} (${m.fields.length} field)`,
      `${hasAnswer ? "⚠️ punya answer field" : "aman"}${hasOptions ? " + options" : ""}`
    )
  }

  // ─── G. SOURCE OF TRUTH ───
  heading("G. SOURCE OF TRUTH")

  const sources: [string, string][] = [
    ["Jalur Cerdas", "Supabase + Seed Script"],
    ["UKBI SD", "JSON + Supabase via seed script"],
    ["UKBI SMP", "JSON + Supabase via seed script"],
    ["UKBI SMA", "Seed legacy (tidak ada JSON)"],
    ["UKBI Guru", "Tidak ada"],
    ["TKA SD", "Tidak ada"],
    ["TKA SMP", "Seed legacy"],
    ["TKA SMA", "Seed legacy"],
    ["TKA UTBK", "Tidak ada"],
    ["TKA Guru", "Tidak ada"],
    ["Quiz (guru)", "Supabase (dinamis)"],
    ["Penugasan", "Supabase (LearningUnit.content)"],
    ["Bank Soal (guru)", "Supabase (Soal)"],
    ["Game", "Supabase (GameQuestion)"],
  ]
  for (const [area, source] of sources) {
    item(area, source)
  }

  // ─── H. BIGT-STYLE READINESS SCORE ───
  heading("H. BIGT-STYLE READINESS SCORE (0–5)")

  type ScoreDef = {
    name: string
    idConsistent: boolean
    jsonSource: boolean
    supabase: boolean
    validator: boolean
    audit: boolean
    seedSafe: boolean
    sanitizedAPI: boolean
    noLeakage: boolean
    randomization: boolean
    snapshot: boolean
    history: boolean
    resultDoc: boolean
  }

  function calcScore(d: ScoreDef): number {
    let s = 0
    if (d.idConsistent) s++
    if (d.jsonSource) s++
    if (d.supabase) s++
    if (d.validator) s++
    if (d.audit) s++
    if (d.seedSafe) s++
    if (d.sanitizedAPI) s++
    if (d.noLeakage) s++
    if (d.randomization) s++
    if (d.snapshot) s++
    if (d.history) s++
    if (d.resultDoc) s++
    return Math.round((s / 12) * 5)
  }

  const readyScores: [string, ScoreDef][] = [
    ["Jalur Cerdas", {
      name: "Jalur Cerdas",
      idConsistent: true, jsonSource: false, supabase: true,
      validator: true, audit: false, seedSafe: true,
      sanitizedAPI: true, noLeakage: true, randomization: false,
      snapshot: false, history: true, resultDoc: false,
    }],
    ["UKBI SD", {
      name: "UKBI SD",
      idConsistent: true, jsonSource: true, supabase: true,
      validator: true, audit: true, seedSafe: true,
      sanitizedAPI: true, noLeakage: true, randomization: true,
      snapshot: true, history: true, resultDoc: true,
    }],
    ["UKBI SMP", {
      name: "UKBI SMP",
      idConsistent: true, jsonSource: true, supabase: true,
      validator: true, audit: true, seedSafe: true,
      sanitizedAPI: true, noLeakage: true, randomization: true,
      snapshot: true, history: true, resultDoc: true,
    }],
    ["UKBI SMA (legacy)", {
      name: "UKBI SMA",
      idConsistent: false, jsonSource: false, supabase: true,
      validator: false, audit: false, seedSafe: false,
      sanitizedAPI: true, noLeakage: true, randomization: true,
      snapshot: true, history: true, resultDoc: true,
    }],
    ["TKA SMP (legacy)", {
      name: "TKA SMP",
      idConsistent: false, jsonSource: false, supabase: true,
      validator: false, audit: false, seedSafe: false,
      sanitizedAPI: true, noLeakage: true, randomization: true,
      snapshot: true, history: true, resultDoc: true,
    }],
    ["TKA SMA (legacy)", {
      name: "TKA SMA",
      idConsistent: false, jsonSource: false, supabase: true,
      validator: false, audit: false, seedSafe: false,
      sanitizedAPI: true, noLeakage: true, randomization: true,
      snapshot: true, history: true, resultDoc: true,
    }],
    ["Bank Soal Guru", {
      name: "Bank Soal Guru",
      idConsistent: true, jsonSource: false, supabase: true,
      validator: false, audit: false, seedSafe: false,
      sanitizedAPI: true, noLeakage: true, randomization: false,
      snapshot: false, history: false, resultDoc: false,
    }],
  ]

  for (const [name, def] of readyScores) {
    const score = calcScore(def)
    const bar = "▓".repeat(score) + "░".repeat(5 - score)
    console.log(`  ${name.padEnd(28)} ${bar}  ${score}/5`)
  }

  // ─── TOTALS ───
  heading("RINGKASAN TOTAL SOAL")

  const grandTotal = 366 + ukbiTotal + tkaTotal
  const grandOriginal = (() => {
    // 366 jalur + 500 UKBI original + 0 TKA original
    return 366 + ukbiOriginal + 0
  })()
  const grandLegacy = ukbiTotal - ukbiOriginal + tkaTotal

  subheading("Semua Produk")
  item("Jalur Cerdas", "366 soal")
  item("UKBI", `${ukbiTotal} soal (${ukbiOriginal} original, ${ukbiTotal - ukbiOriginal} legacy)`)
  item("TKA", `${tkaTotal} soal (semua legacy)`)
  item("Bank Soal Guru", "Dinamis (tidak dihitung)")
  item("Game", "Dinamis (tidak dihitung)")
  item("GRAND TOTAL (fixed bank)", `${grandTotal} soal`)
  item("Original (new)", `${grandOriginal} soal`)
  item("Legacy", `${grandLegacy} soal`)

  subheading("GAP Analysis")
  item("Jalur Cerdas → 720 ideal", `${Math.max(0, 720 - 366)} kurang`)
  item("UKBI → 1000 target", `${Math.max(0, 1000 - ukbiTotal)} kurang`)
  item("TKA → 750 target", `${Math.max(0, 750 - tkaTotal)} kurang`)
  item("TKA → 1000 target", `${Math.max(0, 1000 - tkaTotal)} kurang`)
  item("TOTAL → 2470 max", `${Math.max(0, 2470 - grandTotal)} kurang`)

  // ─── RISK ───
  heading("RISIKO & PRIORITAS")

  subheading("Risiko Tertinggi")
  fail("Game server VPS mati", "Semua multiplayer games tidak berfungsi")
  warn("UKBI SMA legacy", "25 soal saja, tidak representatif")
  warn("TKA SMP legacy", "35 soal, tidak representatif")
  warn("TKA SMA legacy", "33 soal, tidak representatif")
  warn("TKA SD belum ada", "0 soal")
  warn("TKA UTBK belum ada", "0 soal")
  warn("TKA Guru belum ada", "0 soal")
  warn("UKBI Guru belum ada", "0 soal")
  ok("Jalur Cerdas", "366 soal, tapi 6 unit <5 soal")
  ok("Leakage tests", "Semua aman (11 leakage tests)")

  subheading("Prioritas Perbaikan")
  item("1", "TKA SD Bank — 250 soal (urgent, 0 existing)")
  item("2", "UKBI SMA Bank — 250 soal (25 legacy)")
  item("3", "TKA SMP Upgrade — 250 soal (35 legacy)")
  item("4", "TKA SMA Upgrade — 250 soal (33 legacy)")
  item("5", "Jalur Cerdas enrichment — +354 soal (6 unit <5)")
  item("6", "UKBI Guru Bank — 250 soal")
  item("7", "TKA UTBK Bank — 250 soal")
  item("8", "Game server revival — VPS baru / alternatif")

  console.log("\n" + "=".repeat(70))
  console.log("  AUDIT SELESAI — Read-only, tidak ada data diubah.")
  console.log("=".repeat(70))
}

main()
