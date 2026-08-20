#!/usr/bin/env node
/**
 * warmup-ukbi-tokens.ts — Warm-up 200 authenticated staging sessions BEFORE
 * the k6 cohort (mission Phase 2A/2B requirement: tokens pre-warmed, k6 NEVER
 * logs in).
 *
 *   STAGING_* env dari staging.env (source sebelum jalan) + opsi:
 *     --reset          hapus fixture kohort (TestSession/TestAnswer/
 *                      ProgresKompetensi/Certificate/XP) di STAGING saja
 *     UKBI_TOKENS_FILE path token file (default /tmp …/ukbi-tokens.json)
 *
 * Alur per attempt:
 *   POST {STAGING_BASE_URL}/api/auth/login {email,password} dengan cookie
 *   dummy UNIK per attempt (sb-<ref>-auth-token=<random>) → karena rate
 *   limiter login di-key per-session (sess|<hash>), 200 serial login dari
 *   1 IP TIDAK menabrak bucket ip|shared 10/600s (founder-approved caveat
 *   hanya relevan untuk kohort k6 nyata, bukan warm-up infra).
 *
 * Pacing serial ≥1.5s (bukti Phase K2: 200/200 @1.5s).
 *
 * Keluaran (TANPA secret):
 *   - token file JSON (0600) → k6 baca via open() absolute path
 *   - hitungan saja (200/200 OK, n gagal jenis X)
 * exit 0 = 200/200, exit 1 = STOP (jangan lanjut ke k6).
 */

import { createClient } from "@supabase/supabase-js"
import { assertStagingGate, extractSupabaseRef } from "./lib/staging-gate"
import { randomUUID } from "node:crypto"
import { chmodSync, writeFileSync } from "node:fs"
import { stagingDb } from "./lib/staging-db"

const FLAG_RESET = process.argv.includes("--reset")
const TOKENS_PATH =
  process.env.UKBI_TOKENS_FILE || "/var/folders/dh/39_9l3qs70vc6fd873zc7fsr0000gn/T/opencode/ukbi-tokens.json"
const EMAIL_PREFIX = process.env.STAGING_TEST_EMAIL_PREFIX || "ukbi-loadtest"
const EMAIL_DOMAIN = process.env.STAGING_TEST_EMAIL_DOMAIN || "loaded-test"
const COUNT = parseInt(process.env.STAGING_TEST_COUNT || "200", 10)
const PACING_MS = 1600

const emails = Array.from(
  { length: COUNT },
  (_, i) => `${EMAIL_PREFIX}-${String(i + 1).padStart(3, "0")}@${EMAIL_DOMAIN}.id`
)

function maskEmail(e: string): string {
  const [local, domain] = e.split("@")
  return `${local.slice(0, 8)}…@${domain}`
}

async function loginOnce(baseUrl: string, email: string, password: string) {
  // Cookie dummy UNIK: bucket rate-limit jadi sess|<hash> per attempt.
  const dummyCookie = `sb-${randomUUID()}-auth-token=${randomUUID()}`
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: dummyCookie },
    body: JSON.stringify({ email, password }),
    redirect: "manual",
  })
  const setCookies: string[] = []
  // Node fetch: headers.getSetCookie() (Node ≥18.14)
  if (typeof (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie === "function") {
    setCookies.push(...(res.headers as unknown as { getSetCookie(): string[] }).getSetCookie())
  } else {
    const raw = res.headers.get("set-cookie")
    if (raw) setCookies.push(raw)
  }
  const cookiePairs: string[] = []
  for (const sc of setCookies) {
    const pair = sc.split(";")[0].trim()
    if (pair) cookiePairs.push(pair)
  }
  const body = await res.text()
  return { status: res.status, cookies: cookiePairs, body }
}

async function main() {
  console.log("🌡️  WARM-UP UKBI TOKENS (200 sesi staging, pra-kohort k6)\n")

  // ── GATE 12/12 SEBELUM apa pun ──
  let GATE
  try {
    GATE = await assertStagingGate(process.env)
  } catch (e) {
    console.error(`❌ ${e instanceof Error ? e.message : String(e)}`)
    process.exit(1)
  }
  const supabase = createClient(process.env.STAGING_SUPABASE_URL!, process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const db = stagingDb(process.env)

  const baseUrl = process.env.STAGING_BASE_URL!
  const password = process.env.STAGING_TEST_PASSWORD!
  if (!password) {
    console.error("❌ STAGING_TEST_PASSWORD belum di-set. ABORT.")
    process.exit(1)
  }

  console.log(`   Staging base  : ${new URL(baseUrl).host}`)
  console.log(`   Staging auth  : ${new URL(process.env.STAGING_SUPABASE_URL!).host}`)
  console.log(`   Cohort        : ${COUNT} akun ${maskEmail(emails[0])} … ${maskEmail(emails[COUNT - 1])}`)
  console.log(`   Mode          : ${FLAG_RESET ? "RESET karyawan (--reset) + login" : "login only"}`)
  console.log(`   Pacing        : ${PACING_MS}ms serial (session-scoped bucket)`)

  // ── Identitas kohort di staging Auth ──
  const { data: authUsers, error: authErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (authErr) throw authErr
  const known = new Set((authUsers?.users || []).map((u) => u.email))
  const missing = emails.filter((e) => !known.has(e))
  if (missing.length > 0) {
    console.error(`❌ ${missing.length} akun kohort belum ada di staging Auth (mis. ${maskEmail(missing[0])}). Jalankan seed dulu.`)
    process.exit(1)
  }
  console.log(`   Auth staging  : ${COUNT - missing.length}/${COUNT} akun kohort ada`)
  const stranza = extractSupabaseRef(process.env.STAGING_DATABASE_URL || "")
  const ref = GATE.derivedRef || stranza
  console.log(`   Ref staging   : ${ref ? `${ref.slice(0, 4)}…${ref.slice(-4)}` : "?"}`)

  // ── Paket load test ──
  const paket = await db.paketKompetensi.findFirst({ where: { title: "UKBI Load Test Staging" } })
  if (!paket) {
    console.error("❌ Paket 'UKBI Load Test Staging' tidak ada di staging DB. Jalankan seed dulu.")
    process.exit(1)
  }
  const totalQ = (paket.questionPool as string[] | null)?.length ?? 0
  console.log(`   Paket         : id=${paket.id} soal=${totalQ} durasi=${paket.duration}m`)

  // ── RESET fixture kohort (aktivitas lama, STAGING ONLY) ──
  // BUG FIX (2026-08-20): sebelumnya filter pakai `userId: { in: emails }`
  // (string email) → TIDAK pernah cocok kolom UUID → reset "sukses" dengan
  // 0 baris padahal sesi COMPLETED lama tetap ada → k6 mendapat 400
  // "Tes sudah selesai" di GET paket. Sekarang resolve email → UUID dulu.
  if (FLAG_RESET) {
    const cohort = await db.user.findMany({ where: { email: { in: emails } }, select: { id: true } })
    const userIds = cohort.map((u) => u.id)
    if (userIds.length !== COUNT) {
      console.error(`❌ Prisma User kohort hanya ${userIds.length}/${COUNT} — jangan reset parsial. STOP.`)
      process.exit(1)
    }
    const del = await db.$transaction([
      db.testAnswer.deleteMany({ where: { userId: { in: userIds } } }),
      db.testSession.deleteMany({ where: { userId: { in: userIds } } }),
      db.progresKompetensi.deleteMany({ where: { userId: { in: userIds } } }),
      db.kompetensiCertificate.deleteMany({ where: { userId: { in: userIds } } }),
      db.xPTransaction.deleteMany({ where: { userId: { in: userIds }, source: "KOMPETENSI" } }),
      db.premiumUsage.deleteMany({ where: { userId: { in: userIds } } }),
    ])
    console.log(`   Reset         : TestAnswer=${del[0].count} TestSession=${del[1].count} Progres=${del[2].count} Cert=${del[3].count} XP=${del[4].count} PremiumUsage=${del[5].count}`)
  }

  // ── Login serial 200× (pacing + retry backoff pada Supabase Auth throttle) ──
  // Catatan penting: Supabase Auth (GoTrue) MENERAPKAN rate limit tersendiri
  // pada POST /auth/v1/token?grant_type=password (per IP). Semua login ini
  // berasal dari satu egress IP Vercel, sehingga sesekali didorong balik
  // dengan 401 `{"error":"Request rate limit reached"}` meski bucket app
  // kita bersifat per-session. Retry eksponensial di sini membuat warm-up
  // SELF-PACING dan konvergen ke 200/200 tanpa menebak angka kuota Auth.
  const tokens: Array<{ user: string; cookie: string }> = []
  let failFinal = 0
  let throttleRetries = 0
  const failExamples: string[] = []
  const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))

  for (let i = 0; i < emails.length; i++) {
    const t0 = Date.now()
    const email = emails[i]
    let r: Awaited<ReturnType<typeof loginOnce>>
    let attempt = 0
    let backoff = 3000
    for (;;) {
      attempt++
      try {
        r = await loginOnce(baseUrl, email, password)
      } catch (e) {
        r = { status: 0, cookies: [], error: e instanceof Error ? e.message : String(e) }
      }
      // Retry hanya pada throttle Auth (401 dengan pesan rate-limit) & 429.
      const throttled = r.status === 429 || (r.status === 401 && /rate limit/i.test(r.body || ""))
      if (throttled && attempt <= 12) {
        throttleRetries++
        await sleep(backoff)
        backoff = Math.min(backoff * 1.6, 90_000)
        continue
      }
      break
    }
    if (r!.status === 200 && r!.cookies.length > 0) {
      tokens.push({ user: email, cookie: r!.cookies.join("; ") })
    } else {
      failFinal++
      if (failExamples.length < 6) {
        failExamples.push(`${r!.status === 401 ? "/rate limit/" : ""}${maskEmail(email)} ${r!.status} ${(r!.body || r!.error || "").slice(0, 60)}`)
      }
    }
    if ((i + 1) % 25 === 0) console.log(`   … ${i + 1}/${emails.length} login`)
    const elapsed = Date.now() - t0
    const wait = Math.max(0, PACING_MS - elapsed)
    if (wait > 0) await sleep(wait)
  }

  console.log(`\n── Warm-up summary ──`)
  console.log(`   Tokens OK      : ${tokens.length}/${COUNT}`)
  console.log(`   Throttle retry : ${throttleRetries} (Supabase Auth backoff)`)
  console.log(`   Gagal akhir    : ${failFinal}`)
  if (failExamples.length) console.log(`   Contoh gagal   : ${failExamples.join(" | ")}`)
  console.log(`   Waktu total    : ${Math.round((COUNT * PACING_MS) / 1000)}s perkiraan + retry`)

  if (tokens.length !== COUNT) {
    console.error("\n❌ Warm-up TIDAK sempurna — JANGAN lanjut ke k6 (kohort harus 200/200).")
    process.exit(1)
  }

  writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 0), { mode: 0o600 })
  try {
    chmodSync(TOKENS_PATH, 0o600)
  } catch {
    /* best-effort */
  }
  console.log(`\n✅ Token file: ${TOKENS_PATH} (${tokens.length} sesi, 0600)`)

  await db.$disconnect()
  process.exit(0)
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : String(e))
  process.exit(1)
})