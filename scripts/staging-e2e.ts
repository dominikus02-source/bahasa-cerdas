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
import { createClient } from "@supabase/supabase-js"
import { PrismaClient } from "@prisma/client"
import { randomUUID } from "crypto"
import { assertStagingGate } from "./lib/staging-gate"

const APP = "https://bahasa-cerdas-staging.vercel.app"
const PAKET_TITLE = "UKBI Load Test Staging"
const PAKET_ID_PREFIX = "lt-ukbi-200"
const EMAIL = "ukbi-loadtest-001@loaded-test.id"

const ENV = {
  supabaseUrl: process.env.STAGING_SUPABASE_URL || "",
  anonKey: process.env.STAGING_SUPABASE_ANON_KEY || "",
  serviceRole: process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || "",
  dbUrl: process.env.STAGING_DIRECT_URL || process.env.STAGING_DATABASE_URL || "",
  testPassword: process.env.STAGING_TEST_PASSWORD || "",
}

let fails = 0
const ok = (name: string, cond: boolean, detail = "") => {
  console.log(`[${cond ? "PASS" : "FAIL"}] ${name}${detail ? " — " + detail : ""}`)
  if (!cond) fails++
}

async function main() {
  await assertStagingGate(process.env)
  console.log("⛩️  Gate 12/12 PASS — env staging terkonfirmasi\n")

  const supabase = createClient(ENV.supabaseUrl, ENV.anonKey, { auth: { persistSession: false } })
  const admin = createClient(ENV.supabaseUrl, ENV.serviceRole, { auth: { persistSession: false } })
  const db = new PrismaClient({ datasources: { db: { url: ENV.dbUrl } } })
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

  // ── 2) LOGIN — password grant vs staging auth REST, lalu bangun cookie SSR
  // (app pakai @supabase/ssr yang membaca cookie `sb-<ref>-auth-token`,
  //  bukan header Authorization).
  const host = new URL(ENV.supabaseUrl).host
  const cookieName = `sb-${host.split(".")[0]}-auth-token`
  const tokenRes = await fetch(`${ENV.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ENV.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: ENV.testPassword }),
  })
  const tokenBody: any = await tokenRes.json()
  ok("login staging (password grant)", tokenRes.status === 200 && !!tokenBody?.access_token, `HTTP ${tokenRes.status}`)
  if (!tokenBody?.access_token) process.exit(1)
  // SSR cookie (@supabase/ssr base64url): name `supabase.auth.token`,
  // value = "base64-" + base64url(JSON string session)
  const cookieValue = "base64-" + Buffer.from(
    JSON.stringify({
      access_token: tokenBody.access_token,
      refresh_token: tokenBody.refresh_token,
      expires_at: tokenBody.expires_at,
      expires_in: tokenBody.expires_in,
      token_type: tokenBody.token_type,
      user: tokenBody.user,
    })
  ).toString("base64url")

  const headers = {
    Cookie: `${cookieName}=${cookieValue}`,
    apikey: ENV.anonKey,
    "Content-Type": "application/json",
  }
  const scan = (payload: string) => {
    const hits: string[] = []
    for (const needle of ["correctAnswer", "answerKey", '"rubric"', '"jawaban"']) {
      if (payload.includes(needle)) hits.push(needle)
    }
    return hits
  }

  // ── 3) /api/user/me ──
  const me = await fetch(`${APP}/api/user/me`, { headers }).then((r) => r.json().catch(() => ({})))
  const meRole = me?.data?.user?.role ?? me?.user?.role
  ok("user/me (app) role MURID", meRole === "MURID", `role=${meRole}`)

  // ── 4) daftar paket ──
  const list = await fetch(`${APP}/api/kompetensi?limit=50`, { headers }).then((r) => r.json().catch(() => ({})))
  const found = (list?.data || []).find((p: any) => p?.title === PAKET_TITLE) || (list?.data || []).find((p: any) => p?.id === paketId)
  ok("paket tampil di GET /api/kompetensi", !!found, found ? found.title : "tidak ketemu")

  // ── 5) START — GET /api/kompetensi/[paketId] ──
  const startRes = await fetch(`${APP}/api/kompetensi/${paketId}`, { headers })
  const startBody = await startRes.text()
  ok("start session HTTP 200 (tanpa 429)", startRes.status === 200, `HTTP ${startRes.status}`)
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
  const patchRes = await fetch(`${APP}/api/kompetensi/${paketId}`, {
    method: "PATCH", headers, body: JSON.stringify({ answers: answered, flagged: [] }),
  })
  ok("autosave PATCH HTTP 200", patchRes.status === 200, `HTTP ${patchRes.status}`)

  // ── 7) SUBMIT — POST ──
  for (const q of questions.slice(5)) {
    const opt = Array.isArray(q?.options) && q.options.length > 0 ? q.options[0].id ?? q.options[0] : "dummy"
    if (q?.id) answered[q.id] = String(opt)
  }
  const submitRes = await fetch(`${APP}/api/kompetensi/${paketId}/submit`, {
    method: "POST", headers, body: JSON.stringify({ answers: answered, timeSpent: 60 }),
  })
  const submitBody = await submitRes.text()
  ok("submit POST HTTP 200", submitRes.status === 200, `HTTP ${submitRes.status}`)
  const leakSubmit = scan(submitBody)
  ok("no answer-key leakage (submit)", leakSubmit.length === 0, leakSubmit.length ? leakSubmit.join(",") : "bersih")
  const submitJson: any = JSON.parse(submitBody)
  const sres = submitJson?.data?.result ?? submitJson?.result ?? submitJson?.skor ?? submitJson?.session
  ok("submit mengembalikan hasil", !!sres, JSON.stringify(sres).slice(0, 120))

  // ── 8) RESULT ──
  const hasilRes = await fetch(`${APP}/api/kompetensi/${paketId}/hasil`, { headers })
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
  const oneMore = await db.progresKompetensi.count({ where: { userId: userRow!.id } })
  ok("hanya 1 progres per user+paket (no duplicate)", oneMore === 1, `count=${oneMore}`)

  await db.$disconnect()
  console.log(`\n${fails === 0 ? "✅ PHASE G ONE-USER E2E: SEMUA PASS" : `❌ ${fails} FAIL`}`)
  process.exit(fails === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error("Fatal:", e?.message || e)
  process.exit(1)
})