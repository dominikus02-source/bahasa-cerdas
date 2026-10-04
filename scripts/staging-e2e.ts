#!/usr/bin/env node
/**
 * staging-e2e.ts — PHASE G: one-user E2E terhadap app staging ter-deploy.
 * 1) Buat paket "UKBI Load Test Staging" bila belum ada (id lt-ukbi-200-<8hex>
 *    — persis logika scripts/seed-staging-loadtest.ts seedPaket).
 * 2) Login via Supabase Auth STAGING (password grant, anon key).
 * 3) Alur penuh lewat app: /api/user/me → /api/kompetensi → GET paket (soal,
 *    cek no-leakage) → PATCH autosave → POST submit → GET hasil.
 * 4) Verifikasi write di DB STAGING (TestSession/ProgresKompetensi/TestAnswer).
 *
 * TIDAK ada k6/loadtest. TIDAK menyentuh production. TIDAK mencetak secret.
 */
import { PrismaClient } from "@prisma/client"
import { randomUUID } from "crypto"
import { assertStagingGate, prismaPoolerSafeUrl } from "./lib/staging-gate"
import { getPeriodKey } from "../lib/premium-economy/period"

const PAKET_TITLE = "UKBI Load Test Staging"
const PAKET_ID_PREFIX = "lt-ukbi-200"
const EMAIL = "ukbi-loadtest-001@loaded-test.id"

const ENV = {
  supabaseUrl: process.env.STAGING_SUPABASE_URL || "",
  anonKey: process.env.STAGING_SUPABASE_ANON_KEY || "",
  dbUrl: process.env.STAGING_DIRECT_URL || process.env.STAGING_DATABASE_URL || "",
  baseUrl: process.env.STAGING_BASE_URL || "",
  testPassword: process.env.STAGING_TEST_PASSWORD || "",
}

let fails = 0
const ok = (name: string, cond: boolean, detail = "") => {
  console.log(`[${cond ? "PASS" : "FAIL"}] ${name}${detail ? " — " + detail : ""}`)
  if (!cond) fails++
}

async function main() {
  await assertStagingGate(process.env, "compliance")
  console.log("⛩️  Compliance staging gate PASS — env staging terkonfirmasi\n")

  const db = new PrismaClient({ datasources: { db: { url: prismaPoolerSafeUrl(ENV.dbUrl) } } })
  const userRow = await db.user.findUnique({ where: { email: EMAIL } })

  // ── 1) PAKET (idempotent, MCQ-only agar auto-scored; hapus paket lama yang
  //        kurang tepat bila perlu) ──
  let paket: any = null
  const rows = await db.uKBIQuestion.findMany({
    where: { isActive: true, type: { in: ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"] } },
    take: 40,
    orderBy: { id: "asc" },
  })
  const mcq = rows.filter((r) => Array.isArray(r.options) && (r.options as any[]).length >= 2)
  const existingOld = await db.paketKompetensi.findFirst({
    where: { title: PAKET_TITLE, id: { startsWith: PAKET_ID_PREFIX + "-" } },
  })
  if (existingOld) {
    const badPool = existingOld.questionPool as string[]
    const bad = badPool.length === 0 || !badPool.every((id) => mcq.some((m) => m.id === id))
    if (bad) {
      await db.testAnswer.deleteMany({ where: { userId: userRow!.id, paketId: existingOld.id } })
      await db.progresKompetensi.deleteMany({ where: { userId: userRow!.id, paketId: existingOld.id } })
      await db.testSession.deleteMany({ where: { userId: userRow!.id, paketId: existingOld.id } })
      await db.testSession.delete({ where: { userId_paketId: { userId: userRow!.id, paketId: existingOld.id } } }).catch(() => {})
      await db.paketKompetensi.delete({ where: { id: existingOld.id } }).catch(() => {})
      console.log("[INFO] paket lama MCQ-buruk dihapus:", existingOld.id)
    } else {
      paket = existingOld
    }
  }
  if (!paket) {
    const questions = mcq.slice(0, 10)
    ok("staging punya ≥8 soal MCQ UKBI aktif", questions.length >= 8, `${questions.length} soal`)
    if (!(questions.length >= 8)) process.exit(1)
    paket = await db.paketKompetensi.create({
      data: {
        id: `${PAKET_ID_PREFIX}-${randomUUID().slice(0, 8)}`,
        title: PAKET_TITLE,
        description: "Load test package — 10 questions (auto-scored)",
        type: "UKBI_SIMULASI",
        mode: "SIMULASI",
        duration: 30,
        passingScore: 60,
        sections: [
          { seksi: "MERESPONS_KAIDAH", label: "Merespons Kaidah", count: Math.min(6, questions.length) },
          { seksi: "MEMBACA", label: "Membaca", count: Math.max(0, Math.min(4, questions.length - 6)) },
        ],
        totalQuestions: questions.length,
        questionPool: questions.map((q) => q.id),
        isActive: true,
      },
    })
    console.log(`[INFO] paket dibuat: ${paket.id} (${questions.length} soal MCQ)`)
  }
  ok("paket " + PAKET_TITLE + " tersedia", !!paket, `id ${paket!.id}`)
  const paketId = paket!.id

  // This user is disposable staging-only. Reset only this package's prior
  // attempt plus the current simulation quota so every CI run starts from a
  // deterministic state instead of inheriting an old COMPLETED session.
  await db.testAnswer.deleteMany({ where: { userId: userRow!.id, paketId } })
  await db.progresKompetensi.deleteMany({ where: { userId: userRow!.id, paketId } })
  await db.testSession.deleteMany({ where: { userId: userRow!.id, paketId } })
  await db.premiumUsage.deleteMany({
    where: {
      userId: userRow!.id,
      featureCode: "SIMULATION",
      periodKey: getPeriodKey("MONTH"),
    },
  })
  console.log("[INFO] disposable staging attempt state reset")

  // ── 2) LOGIN THROUGH THE CURRENT APPLICATION ──
  // Use the app's own login route so @supabase/ssr owns the cookie format,
  // including chunking/version changes. Hand-building sb-* cookies made this
  // test pass against an older deployment while failing on the current commit.
  const loginRes = await fetch(`${ENV.baseUrl}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: ENV.baseUrl,
    },
    body: JSON.stringify({ email: EMAIL, password: ENV.testPassword }),
    redirect: "manual",
  })
  const loginBody = await loginRes.text()
  ok(
    "login staging lewat app HTTP 200",
    loginRes.status === 200,
    `HTTP ${loginRes.status}${loginRes.status === 200 ? "" : ` body=${loginBody.replace(/\s+/g, " ").slice(0, 220)}`}`
  )
  if (loginRes.status !== 200) process.exit(1)

  const setCookies =
    typeof (loginRes.headers as any).getSetCookie === "function"
      ? (loginRes.headers as any).getSetCookie() as string[]
      : [loginRes.headers.get("set-cookie") || ""].filter(Boolean)
  const cookieHeader = setCookies
    .map((value) => value.split(";")[0]?.trim())
    .filter(Boolean)
    .join("; ")
  ok("login app menghasilkan SSR auth cookie", cookieHeader.includes("sb-"), `${setCookies.length} Set-Cookie`)
  if (!cookieHeader) process.exit(1)

  const headers = {
    Cookie: cookieHeader,
    Origin: ENV.baseUrl,
    "Content-Type": "application/json",
  }

  // Establish the current privacy notice through the real current-commit API.
  // The disposable MURID test identity is declared adult so this simulation E2E
  // tests the core-learning path without fabricating guardian evidence.
  const privacyRes = await fetch(`${ENV.baseUrl}/api/privacy/account`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      birthDate: "1990-01-01",
      acceptedNotice: true,
      publicProfile: false,
      publicWorks: false,
      analytics: false,
      aiAssistance: false,
    }),
  })
  const privacyBody = await privacyRes.text()
  ok(
    "privacy account/current notice HTTP 200",
    privacyRes.status === 200,
    `HTTP ${privacyRes.status}${privacyRes.status === 200 ? "" : ` body=${privacyBody.replace(/\s+/g, " ").slice(0, 220)}`}`
  )
  if (privacyRes.status !== 200) process.exit(1)

  const scan = (payload: string) => {
    const hits: string[] = []
    for (const needle of ["correctAnswer", "answerKey", '"rubric"', '"jawaban"']) {
      if (payload.includes(needle)) hits.push(needle)
    }
    return hits
  }

  // ── 3) /api/user/me ──
  const meRes = await fetch(`${ENV.baseUrl}/api/user/me`, { headers })
  const meText = await meRes.text()
  let me: any = {}
  try { me = JSON.parse(meText) } catch { /* diagnostics below */ }
  const meRole = me?.data?.user?.role ?? me?.user?.role
  ok(
    "user/me (app) role MURID",
    meRes.status === 200 && meRole === "MURID",
    `HTTP ${meRes.status} role=${meRole ?? "-"}${meRes.status === 200 && meRole === "MURID" ? "" : ` body=${meText.replace(/\s+/g, " ").slice(0, 220)}`}`
  )

  // ── 4) daftar paket ──
  const list = await fetch(`${ENV.baseUrl}/api/kompetensi?limit=50`, { headers }).then((r) => r.json().catch(() => ({})))
  const found = (list?.data || []).find((p: any) => p?.title === PAKET_TITLE) || (list?.data || []).find((p: any) => p?.id === paketId)
  ok("paket tampil di GET /api/kompetensi", !!found, found ? found.title : "tidak ketemu")

  // ── 5) START — GET /api/kompetensi/[paketId] ──
  const startRes = await fetch(`${ENV.baseUrl}/api/kompetensi/${paketId}`, { headers })
  const startBody = await startRes.text()
  ok(
    "start session HTTP 200 (tanpa 429)",
    startRes.status === 200,
    `HTTP ${startRes.status}${startRes.status === 200 ? "" : ` body=${startBody.replace(/\s+/g, " ").slice(0, 220)}`}`
  )
  const leakStart = scan(startBody)
  ok("no answer-key leakage (GET paket)", leakStart.length === 0, leakStart.length ? leakStart.join(",") : "bersih")
  let start: any = {}
  try { start = JSON.parse(startBody) } catch { /* */ }
  const data = start?.data ?? start
  const questions: any[] = (Array.isArray(data?.questions) && data.questions.length > 0 && data.questions[0]?.id)
    ? data.questions
    : (data?.questions || []).flatMap((b: any) => b.questions || [])
  ok("soal termuat", questions.length > 0, `${questions.length} soal`)

  // ── 6) AUTOSAVE — PATCH ──
  const answered: Record<string, string> = {}
  for (const q of questions.slice(0, 5)) {
    const opt = Array.isArray(q?.options) && q.options.length > 0 ? q.options[0].id ?? q.options[0] : "dummy"
    if (q?.id) answered[q.id] = String(opt)
  }
  const patchRes = await fetch(`${ENV.baseUrl}/api/kompetensi/${paketId}`, {
    method: "PATCH", headers, body: JSON.stringify({ answers: answered, flagged: [] }),
  })
  const patchBody = await patchRes.text()
  ok(
    "autosave PATCH HTTP 200",
    patchRes.status === 200,
    `HTTP ${patchRes.status}${patchRes.status === 200 ? "" : ` body=${patchBody.replace(/\s+/g, " ").slice(0, 220)}`}`
  )

  // ── 7) SUBMIT — POST ──
  for (const q of questions.slice(5)) {
    const opt = Array.isArray(q?.options) && q.options.length > 0 ? q.options[0].id ?? q.options[0] : "dummy"
    if (q?.id) answered[q.id] = String(opt)
  }
  const submitRes = await fetch(`${ENV.baseUrl}/api/kompetensi/${paketId}/submit`, {
    method: "POST", headers, body: JSON.stringify({ answers: answered, timeSpent: 60 }),
  })
  const submitBody = await submitRes.text()
  ok(
    "submit POST HTTP 200",
    submitRes.status === 200,
    `HTTP ${submitRes.status}${submitRes.status === 200 ? "" : ` body=${submitBody.replace(/\s+/g, " ").slice(0, 220)}`}`
  )
  const leakSubmit = scan(submitBody)
  ok("no answer-key leakage (submit)", leakSubmit.length === 0, leakSubmit.length ? leakSubmit.join(",") : "bersih")
  const submitJson: any = JSON.parse(submitBody)
  const sres = submitJson?.data?.result ?? submitJson?.result ?? submitJson?.skor ?? submitJson?.session
  ok("submit mengembalikan hasil", !!sres, sres ? JSON.stringify(sres).slice(0, 120) : "hasil tidak ada")

  // ── 8) RESULT ──
  const hasilRes = await fetch(`${ENV.baseUrl}/api/kompetensi/${paketId}/hasil`, { headers })
  const hasilBody = await hasilRes.text()
  ok("hasil GET HTTP 200", hasilRes.status === 200, `HTTP ${hasilRes.status}`)
  const leakHasil = scan(hasilBody)
  ok("no answer-key leakage (hasil)", leakHasil.length === 0, leakHasil.length ? leakHasil.join(",") : "bersih")
  if (hasilRes.status === 200) {
    console.log("[INFO] hasil:", hasilBody.replace(/\s+/g, " ").slice(0, 200))
  }

  // ── 9) DB STAGING WRITE VALIDATION ──
  const sessionRow = await db.testSession.findUnique({ where: { userId_paketId: { userId: userRow!.id, paketId } } })
  ok("TestSession COMPLETED di staging DB", sessionRow?.status === "COMPLETED", `status=${sessionRow?.status}`)
  const progres = await db.progresKompetensi.findFirst({ where: { userId: userRow!.id, paketId } })
  ok("ProgresKompetensi tercatat di staging", !!progres)
  const answersCount = await db.testAnswer.count({ where: { userId: userRow!.id, paketId } })
  ok("TestAnswer tercatat di staging", answersCount > 0, `${answersCount} jawaban`)
  const oneMore = await db.progresKompetensi.count({ where: { userId: userRow!.id, paketId } })
  ok("hanya 1 progres per user+paket (no duplicate)", oneMore === 1, `count=${oneMore}`)

  await db.$disconnect()
  console.log(`\n${fails === 0 ? "✅ PHASE G ONE-USER E2E: SEMUA PASS" : `❌ ${fails} FAIL`}`)
  process.exit(fails === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error("Fatal:", e?.message || e)
  process.exit(1)
})