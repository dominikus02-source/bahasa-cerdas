#!/usr/bin/env node
/**
 * preflight-ukbi-load.ts — SAFE preflight for the UKBI 200-user load test.
 * Prints ONLY non-secret facts (hosts, masked refs, counts, paket id).
 * Exit 0 = go / exit 1 = STOP.
 *
 *   STAGING_* env dari staging.env (source sebelum jalan)
 *   opsional --tokens <path> untuk memvalidasi token file warm-up
 */

import { assertStagingGate } from "./lib/staging-gate"
import { stagingDb } from "./lib/staging-db"
import { readFileSync, existsSync } from "node:fs"

const TOKENS_ARG = process.argv.find((a) => a.startsWith("--tokens="))?.split("=")[1] || ""
const EMAIL_PREFIX = process.env.STAGING_TEST_EMAIL_PREFIX || "ukbi-loadtest"
const EMAIL_DOMAIN = process.env.STAGING_TEST_EMAIL_DOMAIN || "loaded-test"
const COUNT = parseInt(process.env.STAGING_TEST_COUNT || "200", 10)

function hostOf(u: string) {
  try {
    return new URL(u).host
  } catch {
    return "<invalid>"
  }
}

async function main() {
  console.log("🔍 PREFLIGHT UKBI 200-USER LOAD TEST\n")

  const gate = await assertStagingGate(process.env)
  console.log(`   Gate staging  : ${gate.ok ? "PASS 12/12" : "FAIL"} (ref ${gate.derivedRef?.slice(0, 4)}…${gate.derivedRef?.slice(-4)})`)
  if (!gate.ok) process.exit(1)

  const db = stagingDb(process.env)

  // Paket
  const paket = await db.paketKompetensi.findFirst({ where: { title: "UKBI Load Test Staging" } })
  if (!paket) {
    console.error("❌ Paket 'UKBI Load Test Staging' TIDAK ada di staging DB — jalankan seed dulu.")
    process.exit(1)
  }
  const pool = (paket.questionPool as string[] | null)?.length ?? 0
  const sections = Array.isArray(paket.sections) ? (paket.sections as Array<{ seksi: string; count: number }>) : []
  const sectionTotal = sections.reduce((n, s) => n + (Number(s.count) || 0), 0)
  console.log(`   Paket          : id=${paket.id} soalPool=${pool} section=${sectionTotal} durasi=${paket.duration}m`)
  if (!paket.id.startsWith("lt-ukbi-200-")) {
    console.error("❌ id paket tidak punya prefix lt-ukbi-200- — bukan paket staging load test. STOP.")
    process.exit(1)
  }

  // Jumlah user kohort di staging DB
  const emails = Array.from({ length: COUNT }, (_, i) => `${EMAIL_PREFIX}-${String(i + 1).padStart(3, "0")}@${EMAIL_DOMAIN}.id`)
  const userCount = await db.user.count({ where: { email: { in: emails } } })
  console.log(`   User kohort    : ${userCount}/${COUNT} ada di staging DB (Prisma User)`)

  // Riwayat aktivitas kohort (harus semua 0 setelah warm-up --reset)
  // BUG FIX (2026-08-20): count memakai email (string) di kolom userId (UUID)
  // → selalu 0 palsu. Resolve email → UUID dulu agar preflight jujur.
  const cohort = await db.user.findMany({ where: { email: { in: emails } }, select: { id: true } })
  const userIds = cohort.map((u) => u.id)
  const [sessions, answers, progres, cert, xp] = await db.$transaction([
    db.testSession.count({ where: { userId: { in: userIds } } }),
    db.testAnswer.count({ where: { userId: { in: userIds } } }),
    db.progresKompetensi.count({ where: { userId: { in: userIds } } }),
    db.kompetensiCertificate.count({ where: { userId: { in: userIds } } }),
    db.xPTransaction.count({ where: { userId: { in: userIds }, source: "KOMPETENSI" } }),
  ])
  console.log(`   Riwayat kohort : sessions=${sessions} answers=${answers} progres=${progres} cert=${cert} xpKOMPETENSI=${xp}`)
  console.log(`                    (warn: setelah warm-up --reset harus 0/0/0/0/0)`)

  // Token file (opsional validasi)
  let tokensReady = "n/a (tanpa --tokens=)"
  if (TOKENS_ARG) {
    if (existsSync(TOKENS_ARG)) {
      const arr = JSON.parse(readFileSync(TOKENS_ARG, "utf8")) as Array<{ user: string; cookie: string }>
      const withCookie = arr.filter((t) => t && t.cookie).length
      tokensReady = `${arr.length} sesi (${withCookie}/ber-cookie) — ${arr.length >= 200 && withCookie >= 200 ? "READY" : "BELUM READY"}`
    } else {
      tokensReady = "FILE TIDAK ADA"
    }
  }
  console.log(`   Token file     : ${tokensReady}`)

  // Safety flags — baru untuk k6 (bukan warm-up/preflight)
  console.log(`\n   Approval       : UKBI_LOADTEST_APPROVED=${process.env.UKBI_LOADTEST_APPROVED === "true" ? "true ✓" : "belum/tdk"}`)
  console.log(`   Env            : UKBI_LOADTEST_ENV=${process.env.UKBI_LOADTEST_ENV === "staging" ? "staging ✓" : "belum/tdk"}`)
  if (process.env.UKBI_LOADTEST_APPROVED !== "true" || process.env.UKBI_LOADTEST_ENV !== "staging") {
    console.error("\n⚠️  Approval flags k6 belum lengkap. Load test TIDAK boleh jalan. STOP.")
    process.exit(1)
  }

  console.log(`\n   Staging base   : ${hostOf(process.env.STAGING_BASE_URL || "")}  (production = DILARANG)`)
  console.log(`   Auth host      : ${hostOf(process.env.STAGING_SUPABASE_URL || "")}`)
  console.log(`   DB host        : ${hostOf(process.env.STAGING_DATABASE_URL || "")}`)

  if (sessions > 0 || answers > 0 || progres > 0) {
    console.error("\n⚠️  Kohort punya riwayat UKBI. Jalankan warm-up dengan --reset agar bersih. (masih bisa lanjut bila disengaja)")
  }

  await db.$disconnect()
  console.log("\nPREFLIGHT OK.\n")
  process.exit(0)
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : String(e))
  process.exit(1)
})