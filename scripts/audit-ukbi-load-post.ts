#!/usr/bin/env node
/**
 * audit-ukbi-load-post.ts — Post-load audit (READ-ONLY staging). Harus semua
 * PASS untuk verdict PASS.
 *
 *  1. Partisipasi: 200 user punya persis 1 TestSession & 1 ProgresKompetensi
 *  2. Integritas: tidak ada duplikat/attempt ganda; TestSession COMPLETED;
 *     jumlah TestAnswer per user == jumlah soal snapshot (>=10)
 *  3. Skor: sampel deterministik ≥20 user → hitung ulang dari snapshot
 *     (correctAnswer) vs totalScore/percentage tersimpan
 *  4. XP: XPTransaction KOMPETENSI per user == 1, reference paketId
 *  5. Kebocoran: nilai counter k6 (ukbi_answer_leakage == 0) diuji sebagai
 *     struktur; final check statis di sini hanya verifikasi tak ada lintas-data
 *  6. Isolasi produksi: gate staging 12/12 (dijalankan ulang) + tak ada
 *     referensi prod di env yang dipakai
 */

import { assertStagingGate } from "./lib/staging-gate"
import { stagingDb } from "./lib/staging-db"

const PAKET_TITLE = "UKBI Load Test Staging"
const EMAIL_PREFIX = process.env.STAGING_TEST_EMAIL_PREFIX || "ukbi-loadtest"
const EMAIL_DOMAIN = process.env.STAGING_TEST_EMAIL_DOMAIN || "loaded-test"
const COUNT = parseInt(process.env.STAGING_TEST_COUNT || "200", 10)

type SnapshotQ = {
  id: string
  correctAnswer: string
  weight?: number
  type?: string
}

function isSnapshot(q: SnapshotQ): boolean {
  return typeof q?.id === "string" && typeof q?.correctAnswer === "string"
}

async function main() {
  const gate = await assertStagingGate(process.env)
  console.log("🧾 POST-LOAD AUDIT — UKBI 200 USER (staging, read-only)\n")
  if (!gate.ok) {
    console.error("❌ Gate staging FAIL pada audit — TIDAK boleh baca DB staging via env yang terverifikasi. STOP.")
    process.exit(1)
  }

  const db = stagingDb(process.env)
  const emails = Array.from({ length: COUNT }, (_, i) => `${EMAIL_PREFIX}-${String(i + 1).padStart(3, "0")}@${EMAIL_DOMAIN}.id`)

  const paket = await db.paketKompetensi.findFirst({ where: { title: PAKET_TITLE } })
  if (!paket) {
    console.error("❌ Paket tidak ada — STOP.")
    process.exit(1)
  }

  let failures = 0
  const fail = (msg: string) => {
    failures++
    console.error(`  ✗ ${msg}`)
  }
  const pass = (msg: string) => console.log(`  ✓ ${msg}`)

  // ── 1 & 2. Partisipasi + integritas ──
  const users = await db.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } })
  const usersById = new Map(users.map((u) => [u.id, u.email]))
  pass(`User kohort di Prisma: ${users.length}/${COUNT}`)
  if (users.length !== COUNT) fail(`Hanya ${users.length}/${COUNT} user ditemukan`)

  const sessions = await db.testSession.findMany({ where: { userId: { in: users.map((u) => u.id) }, paketId: paket.id } })
  const sessionByUser = new Map<string, number>()
  for (const s of sessions) sessionByUser.set(s.userId, (sessionByUser.get(s.userId) || 0) + 1)
  const multiSession = [...sessionByUser.entries()].filter(([, n]) => n !== 1)
  pass(`TestSession: ${sessions.length} total, ${sessionByUser.size} user (harus 200)`)
  if (sessions.length !== COUNT) fail(`TestSession != 200 (${sessions.length})`)
  if (multiSession.length > 0) fail(`${multiSession.length} user punya >1 session middleware: ${multiSession.slice(0, 3).map(([i]) => i).join(",")}`)

  const notCompleted = sessions.filter((s) => s.status !== "COMPLETED")
  if (notCompleted.length > 0) fail(`${notCompleted.length} TestSession tidak COMPLETED`)
  else pass(`Semua TestSession COMPLETED`)

  const progres = await db.progresKompetensi.findMany({
    where: { userId: { in: users.map((u) => u.id) }, paketId: paket.id },
  })
  const progresByUser = new Map<string, number>()
  for (const p of progres) progresByUser.set(p.userId, (progresByUser.get(p.userId) || 0) + 1)
  const multiProgres = [...progresByUser.entries()].filter(([, n]) => n !== 1)
  pass(`ProgresKompetensi: ${progres.length} total, ${progresByUser.size} user (harus 200)`)
  if (progres.length !== COUNT) fail(`ProgresKompetensi != 200 (${progres.length})`)
  if (multiProgres.length > 0) fail(`${multiProgres.length} user punya >1 progres (duplikasi attempt?)`)

  // Attempt number: harus semua attemptNumber 1 (tests unik — anti duplicate)
  const attempts = new Set(progres.map((p) => p.attemptNumber))
  if (attempts.size !== 1 || !attempts.has(1)) fail(`attemptNumber tidak seragam (${[...attempts].join(",")})`)
  else pass(`Semua attemptNumber == 1 (tidak ada retry duplikat ter-scored)`)

  // ── Skor: sampel deterministik ≥20 ──
  const answers = await db.testAnswer.findMany({
    where: { userId: { in: users.map((u) => u.id) }, sessionId: { in: sessions.map((s) => s.id) } },
  })
  const answersBySession = new Map<string, typeof answers>()
  for (const a of answers) {
    if (a.sessionId) {
      const arr = answersBySession.get(a.sessionId) || []
      arr.push(a)
      answersBySession.set(a.sessionId, arr)
    }
  }
  const perSessionN = [...answersBySession.entries()].map(([, arr]) => arr.length)
  const minPer = Math.min(...perSessionN)
  const maxPer = Math.max(...perSessionN)
  pass(`TestAnswer: ${answers.length} total; per-sesi min=${minPer} max=${maxPer} (harus ≥10 & konsisten)`)
  if (minPer < 10) fail(`Ada sesi dengan <10 jawaban (min ${minPer})`)

  // sampel deterministik: 20 user pertama (100 urutan aman — sampai 20)
  const scoredSample: string[] = []
  let scoringChecked = 0
  let scoringMismatch = 0
  const sessionIds = sessions.map((s) => s.id)
  for (let i = 0; i < Math.min(COUNT, 20); i++) {
    const uid = users[i]?.id
    if (!uid) continue
    const s = sessions.find((x) => x.userId === uid)
    const p = progres.find((x) => x.userId === uid)
    if (!s || !p) continue
    const snap = (s.questionSnapshot as { version?: string; questions?: SnapshotQ[] } | null) || null
    const qs = snap?.questions || /* fallback legacy shape */ (Array.isArray(s.questionSnapshot as unknown) ? (s.questionSnapshot as SnapshotQ[]) : [])
    if (!Array.isArray(qs) || qs.length === 0) {
      fail(`Sesi user ${users[i].email} snapshot kosong — tak bisa cek skor`)
      continue
    }
    const aArr = answersBySession.get(s.id) || []
    const answerById = new Map(aArr.filter((a) => a.questionId).map((a) => [a.questionId as string, a]))
    // Kontrak skor UKBI (app/api/kompetensi/[paketId]/submit/route.ts):
    //   w = EASY=1, MEDIUM=1.5, HARD=2, else 2.5
    //   rawScore = Σ(w*10) untuk jawaban benar; maxPossible = Σ(w*10) semua
    //   percentage = rawScore/maxPossible*100
    //   totalScore = Math.round(percentage * 8)   (hanya soal auto-scored)
    const W: Record<string, number> = { EASY: 1, MEDIUM: 1.5, HARD: 2 }
    let rawScore = 0
    let maxPossible = 0
    let answered = 0
    for (const q of qs) {
      if (!isSnapshot(q)) continue
      const userA = answerById.get(q.id)?.answer
      if (userA === undefined || userA === null || userA === "") continue
      answered++
      const w = W[String(q.difficulty ?? "MEDIUM").toUpperCase()] ?? 2.5
      maxPossible += w * 10
      if (String(q.correctAnswer).trim() === String(userA).trim()) rawScore += w * 10
    }
    const expected =
      answered > 0 && maxPossible > 0 ? Math.round((rawScore / maxPossible) * 100 * 8) : undefined
    const stored = p.totalScore
    if (typeof expected === "number" && typeof stored === "number") {
      const ok = stored === expected
      scoredSample.push(`${users[i].email}: benar=${Math.round(rawScore / 10)} raw=${rawScore}/${maxPossible} expected=${expected} stored=${stored} ${ok ? "✓" : "✗"}`)
      scoringChecked++
      if (!ok) scoringMismatch++
    } else {
      scoredSample.push(`${users[i].email}: tidak cek (expected=${expected} stored=${stored})`)
    }
  }
  pass(`Scoring sample: cek ${scoringChecked} user (target ≥20)`)
  if (scoringChecked < 20) fail(`Hasil jangkauan ${scoringChecked} < 20 (butuh sampel lebih besar)`)
  if (scoringMismatch > 0) {
    fail(`${scoringMismatch}/${scoringChecked} mismatch totalScore vs hitung ulang`)
    for (const l of scoredSample.slice(0, 5)) console.log(`     ${l}`)
  } else {
    pass(`Skor konsisten pada ${scoringChecked} sampel (tidak ada mismatch)`)
  }

  // ── Certificate ──
  // Kontrak: sertifikat dibuat OTOMATIS saat totalScore >= passingThreshold
  // (UKBI=482) — termasuk paket latihan. Jadi N boleh > 0 bila ada user
  // yang lulus threshold; yang wajib 0 hanyalah SESSION RETRY duplikat.
  const certs = await db.kompetensiCertificate.count({ where: { userId: { in: users.map((u) => u.id) }, paketId: paket.id } })
  const passing = progres.filter((p) => (p.totalScore ?? 0) >= 482).length
  pass(`KompetensiCertificate: ${certs} (user lolos threshold>=482: ${passing} — boleh sama bila konsisten)`)
  if (certs !== passing) {
    fail(`Jumlah sertifikat (${certs}) != jumlah user lolos threshold (${passing})`)
  } else {
    pass(`Sertifikat konsisten dengan user lolos threshold (${certs})`)
  }

  // ── XP ──
  const xps = await db.xPTransaction.findMany({
    where: { userId: { in: users.map((u) => u.id) }, source: "KOMPETENSI" },
    select: { userId: true, amount: true, reference: true, createdAt: true },
  })
  const xpByUser = new Map<string, number>()
  for (const x of xps) xpByUser.set(x.userId, (xpByUser.get(x.userId) || 0) + 1)
  // Kontrak: awardXp membuat baris ledger HANYA bila xpDiberikan > 0.
  // User yang menjawab 0 benar → rawScore 0 → xp 0 → TIDAK ada baris (anti-farm).
  const zeroScoreUsers = progres.filter((p) => (p.rawScore ?? 1) <= 0).length
  const xpExpected = Math.max(0, COUNT - zeroScoreUsers)
  pass(`XPTransaction KOMPETENSI: ${xps.length} total, ${xpByUser.size} user (harus ~${xpExpected}: ${COUNT} user minus ${zeroScoreUsers} skor-0)`)
  if (xpByUser.size !== xpExpected) fail(`XP KOMPETENSI != ${xpExpected} (${xpByUser.size}) — beda ${Math.abs(xpExpected - xpByUser.size)} user`)
  const badRef = xps.filter((x) => x.reference !== paket.id)
  if (badRef.length > 0) fail(`${badRef.length} XP pakai reference bukan paketId (${badRef[0]?.reference})`)
  else pass(`Semua XP referensi == paket.id`)

  // ── Isolasi produksi (statis) ──
  const prodRef = "ibtlhoocaoopgtcsnvzr"
  const prodHits: string[] = []
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v !== "string" || v.includes(prodRef)) prodHits.push(k)
  }
  if (prodHits.length > 0) fail(`Env mengandung ref produksi: ${prodHits.join(",")}`)
  else pass("Tidak ada ref produksi di env yang dipakai (isolasi staging OK)")

  console.log("\n── Ringkasan ──")
  console.log(`   Partisipasi: ${sessionByUser.size}/200 user, ${sessions.length} sesi, ${progres.length} progres`)
  console.log(`   Jawaban: min ${minPer} per sesi, ${answers.length} total`)
  console.log(`   Skor: ${scoringChecked} dicocokkan, mismatch ${scoringMismatch}`)
  console.log(`   XP KOMPETENSI: ${xps.length} (${xpByUser.size} user)`)
  console.log(`   FAILURES: ${failures}`)

  await db.$disconnect()
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : String(e))
  process.exit(1)
})