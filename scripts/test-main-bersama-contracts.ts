/**
 * Test kontrak domain Main Bersama — pola QA repo (tsx standalone, tanpa framework test).
 * Jalankan: npx tsx scripts/test-main-bersama-contracts.ts
 */
import fs from "fs"
import path from "path"

let passed = 0
let failed = 0

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      console.log(`  ✅ ${name}`)
      passed++
    } else {
      console.log(`  ❌ ${name}`)
      failed++
    }
  } catch (e: any) {
    console.log(`  ❌ ${name} — ${e.message}`)
    failed++
  }
}

import {
  isAnswerSource,
  isAnswerSubmitResult,
  isConnectionStatus,
  isGameMode,
  isMainGameState,
  isParticipantRole,
  isParticipationStatus,
  isRoundPhase,
  isSessionPhase,
  JELAJAH_DEFAULT_TEAMS,
  JELAJAH_TEAM_KEYS,
  toPublicQuestionView,
  validateQuestionSnapshot,
} from "../src/main-bersama/domain"

/**
 * Hapus komentar blok & baris untuk static scan agar nama field
 * di komentar dokumentasi tidak dihitung sebagai kebocoran.
 * Cukup baik untuk QA scan (bukan parser lengkap).
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
}

function main() {
  console.log("\n📋 MAIN BERSAMA CONTRACTS TEST")
  console.log("=".repeat(60))

  console.log("\n── Type Guards: Accept ──")
  test("isGameMode accepts jelajah-kata", () => isGameMode("jelajah-kata"))
  test("isGameMode accepts kota-cahaya", () => isGameMode("kota-cahaya"))
  test("isSessionPhase accepts all 8 phases", () =>
    (["preparing","lobby","question","closed","discussion","paused","summary","ended"] as const)
      .every((p) => isSessionPhase(p)))
  test("isParticipantRole accepts teacher/student/projector", () =>
    isParticipantRole("teacher") && isParticipantRole("student") && isParticipantRole("projector"))
  test("isConnectionStatus accepts connected/disconnected/left", () =>
    isConnectionStatus("connected") && isConnectionStatus("disconnected") && isConnectionStatus("left"))
  test("isParticipationStatus accepts active/inactive", () =>
    isParticipationStatus("active") && isParticipationStatus("inactive"))
  test("isRoundPhase accepts pending/open/review/closed", () =>
    (["pending","open","review","closed"] as const).every((p) => isRoundPhase(p)))
  test("isAnswerSource accepts individual/team-consensus", () =>
    isAnswerSource("individual") && isAnswerSource("team-consensus"))

  console.log("\n── Type Guards: Reject ──")
  test("isGameMode rejects kuis-battle", () => !isGameMode("kuis-battle"))
  test("isSessionPhase rejects loading (UI state)", () => !isSessionPhase("loading"))
  test("isParticipantRole rejects admin", () => !isParticipantRole("admin"))
  test("guards reject null/undefined/numbers", () =>
    !isGameMode(null) && !isSessionPhase(42) && !isParticipantRole(undefined))

  console.log("\n── Answer ACK Guard ──")
  test("accepts ok:true saved with submissionId", () =>
    isAnswerSubmitResult({ ok: true, status: "saved", submissionId: "s1" }))
  test("accepts ok:true already-saved", () =>
    isAnswerSubmitResult({ ok: true, status: "already-saved", submissionId: "s1" }))
  test("rejects ok:true without submissionId", () =>
    !isAnswerSubmitResult({ ok: true, status: "saved" }))
  test("accepts ok:false with known code", () =>
    isAnswerSubmitResult({ ok: false, code: "ROUND_NOT_OPEN" }))
  test("accepts ok:false SUBMISSION_ID_CONFLICT (tahap 3A)", () =>
    isAnswerSubmitResult({ ok: false, code: "SUBMISSION_ID_CONFLICT" }))
  test("rejects ok:false with unknown code", () =>
    !isAnswerSubmitResult({ ok: false, code: "SOMETHING_ELSE" }))
  test("rejects ack containing pre-reveal correctness (correct:true)", () =>
    !isAnswerSubmitResult({ ok: true, status: "saved", submissionId: "s1", correct: true }))

  console.log("\n── Game State Guard ──")
  test("accepts jelajah-kata state", () =>
    isMainGameState({ gameMode: "jelajah-kata", jelajahKata: { teamProgress: { elang: 25 } } }))
  test("accepts kota-cahaya state", () =>
    isMainGameState({ gameMode: "kota-cahaya", kotaCahaya: { correctContribution: 3, target: 10, progressPercent: 30, unlockedMilestones: ["kota-pagi"] } }))
  test("rejects jelajah-kata with non-numeric progress", () =>
    !isMainGameState({ gameMode: "jelajah-kata", jelajahKata: { teamProgress: { elang: "x" } } }))
  test("rejects kota-cahaya missing milestones", () =>
    !isMainGameState({ gameMode: "kota-cahaya", kotaCahaya: { correctContribution: 1, target: 10, progressPercent: 10 } }))

  console.log("\n── Team Constants ──")
  test("4 regu Jelajah Kata: Elang/Harimau/Rusa/Badak", () =>
    JELAJAH_TEAM_KEYS.length === 4 &&
    JELAJAH_DEFAULT_TEAMS.elang.name === "Elang" &&
    JELAJAH_DEFAULT_TEAMS.harimau.name === "Harimau" &&
    JELAJAH_DEFAULT_TEAMS.rusa.name === "Rusa" &&
    JELAJAH_DEFAULT_TEAMS.badak.name === "Badak")
  test("team id === team key (stabil, bukan warna)", () =>
    JELAJAH_TEAM_KEYS.every((k) => JELAJAH_DEFAULT_TEAMS[k].id === k))

  console.log("\n── Question Snapshot Validation ──")
  const validSnapshot = {
    id: "q1",
    sourceQuestionId: "bank-123",
    type: "single-choice",
    prompt: "Sinonim dari 'pandai' adalah…",
    options: [
      { id: "a", text: "Cerdas" },
      { id: "b", text: "Malas" },
    ],
    correctOptionId: "a",
    explanation: "Pandai bermakna cerdas.",
  }
  test("valid snapshot passes", () => validateQuestionSnapshot(validSnapshot).valid)
  test("correctOptionId bukan anggota options → gagal", () =>
    !validateQuestionSnapshot({ ...validSnapshot, correctOptionId: "zzz" }).valid)
  test("kurang dari 2 opsi → gagal", () =>
    !validateQuestionSnapshot({ ...validSnapshot, options: validSnapshot.options.slice(0, 1) }).valid)
  test("option text duplikat → gagal", () =>
    !validateQuestionSnapshot({
      ...validSnapshot,
      options: [
        { id: "a", text: "Cerdas" },
        { id: "b", text: "Cerdas" },
      ],
    }).valid)
  test("prompt kosong → gagal", () =>
    !validateQuestionSnapshot({ ...validSnapshot, prompt: "  " }).valid)
  test("type tidak dikenal → gagal", () =>
    !validateQuestionSnapshot({ ...validSnapshot, type: "essay" }).valid)
  test("passage tanpa content → gagal", () =>
    !validateQuestionSnapshot({ ...validSnapshot, passage: { title: "x" } }).valid)
  test("sourceQuestionId kosong → gagal", () =>
    !validateQuestionSnapshot({ ...validSnapshot, sourceQuestionId: "" }).valid)

  console.log("\n── Anti-Leakage: toPublicQuestionView ──")
  const publicView = toPublicQuestionView(validSnapshot as any)
  test("public view tanpa correctOptionId", () => !("correctOptionId" in publicView))
  test("public view tanpa explanation", () => !("explanation" in publicView))
  test("public view mempertahankan options", () => publicView.options.length === 2)
  test("public view mempertahankan passage bila ada", () =>
    "passage" in toPublicQuestionView({ ...(validSnapshot as any), passage: { content: "bacaan" } }))

  console.log("\n── Static Scan: Framework-Agnostic Imports ──")
  const mbDir = path.join(process.cwd(), "src", "main-bersama")
  const files: string[] = []
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith(".ts")) files.push(full)
    }
  }
  walk(mbDir)
  const forbidden = [
    /from\s+["']next/,
    /from\s+["']react/,
    /from\s+["']@supabase/,
    /from\s+["']socket\.io/,
    /from\s+["']zod["']/,
    /from\s+["']@\/lib\//,
    /from\s+["']@\/components\//,
  ]
  // Tahap 4/5: @prisma + singleton client konvensi repo (@/lib/db)
  // hanya legal di infrastructure/; adapters/ boleh @/lib/db dan
  // @/lib/supabase/server (integrasi BC) tetapi TIDAK @prisma.
  const infraMarker = `${path.sep}infrastructure${path.sep}`
  const adaptersMarker = `${path.sep}adapters${path.sep}`
  const prismaImport = /from\s+["']@prisma/
  const libOther = /from\s+["']@\/lib\/(?!db["']|supabase\/server["'])/
  const offenders = files.filter((f) => {
    const src = stripComments(fs.readFileSync(f, "utf-8"))
    const inInfra = f.includes(infraMarker)
    const inAdapters = f.includes(adaptersMarker)
    if (inInfra) {
      return forbidden.filter((_, i) => i !== 5).some((rx) => rx.test(src))
    }
    if (inAdapters) {
      // adapters: tanpa @prisma; @/lib hanya db & supabase/server.
      return [...forbidden.filter((_, i) => i !== 5), prismaImport, libOther].some((rx) =>
        rx.test(src),
      )
    }
    return [...forbidden, prismaImport].some((rx) => rx.test(src))
  })
  test(`domain/application/games/contracts bebas next/react/prisma/supabase/socket.io; @prisma hanya di infrastructure/; adapters/ hanya boleh @/lib/db & @/lib/supabase/server`, () =>
    offenders.length === 0)

  console.log("\n── Static Scan: Student View Tanpa Kunci Jawaban ──")
  const studentViewSrc = stripComments(
    fs.readFileSync(path.join(mbDir, "contracts", "views", "student.ts"), "utf-8"),
  )
  const questionViewBlock = studentViewSrc.slice(
    studentViewSrc.indexOf("interface StudentQuestionView"),
    studentViewSrc.indexOf("interface StudentRevealView"),
  )
  test("StudentQuestionView TIDAK memuat correctOptionId", () =>
    !questionViewBlock.includes("correctOptionId"))
  test("StudentQuestionView TIDAK memuat isCorrect", () =>
    !questionViewBlock.includes("isCorrect"))
  test("StudentQuestionView TIDAK memuat explanation", () =>
    !questionViewBlock.includes("explanation"))
  test("reveal (correctOptionId) hanya ada di StudentRevealView", () =>
    studentViewSrc.indexOf("correctOptionId") > studentViewSrc.indexOf("interface StudentRevealView"))
  test("union StudentSessionView diekspor", () =>
    studentViewSrc.includes("export type StudentSessionView"))

  console.log("\n── Static Scan: Projector View Public-Safe ──")
  const projectorSrc = stripComments(
    fs.readFileSync(path.join(mbDir, "contracts", "views", "projector.ts"), "utf-8"),
  )
  test("projector TIDAK memuat token/credential", () =>
    !/token|credential|secret/i.test(projectorSrc))
  test("projector TIDAK memuat userId/playerId individual", () =>
    !projectorSrc.includes("userId") && !projectorSrc.includes("playerId"))

  console.log("\n── Repository Interfaces: Domain-Only Types ──")
  const repoDir = path.join(mbDir, "contracts", "repositories")
  const repoFiles = fs.readdirSync(repoDir).filter((f) => f.endsWith(".ts") && f !== "index.ts")
  test("4 interface repo ada", () =>
    repoFiles.includes("session-repository.ts") &&
    repoFiles.includes("player-repository.ts") &&
    repoFiles.includes("round-repository.ts") &&
    repoFiles.includes("answer-repository.ts"))
  test("repo interfaces tidak menyebut Prisma/Supabase/SQL", () =>
    repoFiles.every((f) => {
      const src = stripComments(fs.readFileSync(path.join(repoDir, f), "utf-8"))
      return !/prisma|supabase|SELECT|INSERT|sql/i.test(src)
    }))

  console.log("\n" + "=".repeat(60))
  console.log(`Hasil: ${passed} lulus, ${failed} gagal`)
  if (failed > 0) {
    process.exit(1)
  }
  process.exit(0)
}

main()
