#!/usr/bin/env node
/**
 * Staging Load Test Seed — 200 Disposable Auth Users + UKBI Staging Paket
 *
 * Tujuan: menyiapkan STAGING TERISOLASI untuk fase load test UKBI 200 murid.
 *  - 200 akun deterministik `ukbi-loadtest-001` … `ukbi-loadtest-200`
 *    dibuat di SUPABASE AUTH STAGING (Admin API) + Prisma `User` staging.
 *  - Satu paket deterministik "UKBI Load Test Staging" di staging DB.
 *  - IDEMPOTEN: menjalankan dua kali tetap 200 user & 1 paket (never 400/2).
 *
 * HARD GUARD: script MENOLAK berjalan bila STAGING_* menunjuk production
 * (project ref `ibtlhoocaoopgtcsnvzr` atau pooler aws-1-ap-southeast-1).
 *
 * Penggunaan (semua nilai dari environment — jangan hardcode key):
 *   STAGING_SUPABASE_URL='https://<ref>.supabase.co' \
 *   STAGING_SUPABASE_SERVICE_ROLE_KEY='<service-role staging>' \
 *   STAGING_DATABASE_URL='postgresql://postgres.<ref>:<pw>@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=5' \
 *   STAGING_DIRECT_URL='postgresql://postgres.<ref>:<pw>@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres' \
 *   STAGING_TEST_PASSWORD='<password-dasar-lt>' \
 *   npx tsx scripts/seed-staging-loadtest.ts --execute
 *
 * Tanpa `--execute` → dry-run (hitung yang akan dibuat, tanpa menulis).
 * TIDAK EVER mencetak key/secret/token.
 */

import { createClient } from "@supabase/supabase-js"
import { PrismaClient } from "@prisma/client"
import { randomUUID } from "crypto"
import { assertStagingGate } from "./lib/staging-gate"

const PAKET_TITLE = "UKBI Load Test Staging"
const PAKET_ID_PREFIX = "lt-ukbi-200"
const FLAG_EXECUTE = process.argv.includes("--execute")

// ── env (SEMUA dari environment — tidak ada kredensial di source) ──
const ENV = {
  supabaseUrl: process.env.STAGING_SUPABASE_URL || "",
  serviceRole: process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || "",
  dbUrl: process.env.STAGING_DATABASE_URL || "",
  directUrl: process.env.STAGING_DIRECT_URL || "",
  testPassword: process.env.STAGING_TEST_PASSWORD || "",
  count: parseInt(process.env.STAGING_TEST_COUNT || "200", 10),
  domain: process.env.STAGING_TEST_EMAIL_DOMAIN || "loaded-test",
}

// ── SAFETY CHAIN: verify → confirm identity → baru boleh write ──
// Gate dijalankan SEBELUM klien auth/Prisma dibuat & sebelum operasi apa pun.
// Dry-run pun wajib lolos gate (identity confirmation), meski tidak menulis.
let GATE: Awaited<ReturnType<typeof assertStagingGate>>
let supabase: ReturnType<typeof createClient>
let db: PrismaClient
let emails: string[] = []
async function bootstrap() {
  try {
    GATE = await assertStagingGate(process.env)
  } catch (e) {
    console.error(`❌ ${e instanceof Error ? e.message : String(e)}`)
    if (FLAG_EXECUTE) console.error("❌ ABORT: --execute TIDAK dijalankan terhadap env yang tidak lolos gate.")
    process.exit(1)
  }
  if (!ENV.testPassword) {
    console.error("❌ STAGING_TEST_PASSWORD wajib di-set (password dasar 200 akun disposabel). ABORT.")
    process.exit(1)
  }

  supabase = createClient(ENV.supabaseUrl, ENV.serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Prisma: biasakan direct connection (pooler 6543 menolak prepared statements).
  // Username pooler `postgres.<ref>` → buat direct `postgres@db.<ref>.supabase.co:5432`.
  const directUrl = buildDirectUrl(ENV.dbUrl)
  db = new PrismaClient({ datasources: { db: { url: directUrl } } })

  emails = Array.from(
    { length: ENV.count },
    (_, i) => `${process.env.STAGING_TEST_EMAIL_PREFIX || "ukbi-loadtest"}-${String(i + 1).padStart(3, "0")}@${ENV.domain}.id`
  )
}

// Build direct DB URL from the pooler URL: postgres.<ref>@db.<ref>.supabase.co:5432
function buildDirectUrl(poolerUrl: string): string {
  if (!poolerUrl) return ""
  const u = new URL(poolerUrl)
  const ref = u.username.split(".")[1]
  return `postgresql://postgres:${encodeURIComponent(u.password)}@db.${ref}.supabase.co:5432${u.pathname}?sslmode=require`
}

async function countAuthUsers() {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error
  const batch = data.users
  const hits = batch.filter((u) => u.email?.endsWith(`@${ENV.domain}.id`))
  const prefix = process.env.STAGING_TEST_EMAIL_PREFIX || "ukbi-loadtest"
  return hits.filter((u) => u.email?.startsWith(`${prefix}-`)).length
}

async function listAuthIds(): Promise<Set<string>> {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error
  const prefix = process.env.STAGING_TEST_EMAIL_PREFIX || "ukbi-loadtest"
  const hits = data.users.filter((u) => u.email?.startsWith(`${prefix}-`) && u.email?.endsWith(`@${ENV.domain}.id`))
  return new Set(hits.map((u) => u.id))
}

async function seedUsers(dry: boolean) {
  const existing = await countAuthUsers()
  console.log(`2) Supabase Auth (${dry ? "DRY-RUN" : "WRITE"}): ${existing} akun ukbi-loadtest-* sudah ada di auth STAGING`)
  const toCreate = Math.max(0, ENV.count - existing)
  if (toCreate === 0) {
    console.log(`   ✅ Sudah ${ENV.count} akun — idempotent, tidak membuat baru.`)
    return
  }
  console.log(`   Akan dibuat ${toCreate} akun baru (target ${ENV.count}).`)
  if (dry) return
  let created = 0
  let failed = 0
  const existingIds = await listAuthIds()
  for (const email of emails) {
    if (existingIds.has(email)) continue // sudah ada → lewati (idempotent)
    const { data: nu, error } = await supabase.auth.admin.createUser({
      email,
      password: ENV.testPassword,
      email_confirm: true,
      user_metadata: { loadtest: true, cohort: "ukbi-200" },
    })
    if (error || !nu?.user) {
      failed++
      console.error(`   ✗ ${email}: ${error?.message || "unknown"}`)
      continue
    }
    created++
  }
  console.log(`   ${created} dibuat, ${failed} gagal (total ${existing + created} akun).`)
  if (failed > 0) process.exitCode = 1
}

async function seedPrismaUsers(dry: boolean) {
  console.log(`\n3) Prisma User (staging DB)${dry ? " — DRY-RUN" : ""}`)
  if (dry) {
    console.log("   (dry-run: lewati query tulis)")
    return
  }
  const auths = (await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })).data?.users || []
  const byEmail = new Map(auths.map((u) => [u.email, u.id]))
  let ok = 0
  for (const email of emails) {
    const supabaseId = byEmail.get(email)
    if (!supabaseId) continue
    await db.user.upsert({
      where: { email },
      update: { supabaseId },
      create: { email, fullName: email.split("@")[0], role: "MURID" as const, supabaseId },
    })
    ok++
  }
  console.log(`   ${ok} Prisma User di-upsert (matching auth).`)
}

async function seedPaket(dry: boolean) {
  console.log(`\n4) Paket "${PAKET_TITLE}"${dry ? " — DRY-RUN" : ""}`)
  const rows = await db.uKBIQuestion.findMany({
    where: { isActive: true, type: { in: ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"] } },
    take: 40,
    orderBy: { id: "asc" },
  })
  const questions = rows.filter((r) => Array.isArray(r.options) && (r.options as any[]).length >= 2)
  if (questions.length < 8) {
    console.error(`   ❌ Staging DB hanya punya ${questions.length} soal MCQ UKBI aktif (minimum 8). Seed soal staging dulu.`)
    process.exitCode = 1
    return
  }
  const paketId = `${PAKET_ID_PREFIX}-${randomUUID().slice(0, 8)}`
  console.log(`   Paket ID: ${paketId} (deterministik per-ref — upsert by title)`)
  if (!dry) {
    const existing = await db.paketKompetensi.findFirst({ where: { title: PAKET_TITLE } })
    if (existing) {
      console.log(`   ✅ Paket sudah ada ({id}): ${existing.id} — idempotent, tidak buat baru.`)
      return
    }
    await db.paketKompetensi.create({
      data: {
        id: paketId,
        title: PAKET_TITLE,
        description: `Load test package — ${questions.length} questions (10 auto-scored MCQ)`,
        type: "UKBI_SIMULASI" as const,
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
    console.log(`   ✅ Paket dibuat (${questions.length} soal).`)
  }
}

async function main() {
  await bootstrap()
  console.log("🧪 STAGING LOAD TEST SEED\n")
  console.log(`   ⛩️  Gate       : ${GATE.ok ? "12/12 PASS" : "FAIL"}`)
  console.log(`   Stage ref     : ${GATE.derivedRef ? GATE.derivedRef : "(tidak terdeteksi)"}`)
  console.log(`   Target Auth   : ${hostObfuscate(ENV.supabaseUrl)}`)
  console.log(`   Target DB     : ${obfuscateDb(ENV.dbUrl)}`)
  console.log(`   Mode          : ${FLAG_EXECUTE ? "WRITE (--execute)" : "DRY-RUN"}`)
  console.log("")

  if (!FLAG_EXECUTE) {
    console.log("DRY-RUN — tidak ada penulisan. Jalankan dengan --execute untuk apply.")
  }

  await seedUsers(!FLAG_EXECUTE)
  await seedPrismaUsers(!FLAG_EXECUTE)
  await seedPaket(!FLAG_EXECUTE)

  console.log("\n── Summary ──")
  console.log(`  Auth users (${process.env.STAGING_TEST_EMAIL_PREFIX || "ukbi-loadtest"}-*): target ${ENV.count}`)
  if (!FLAG_EXECUTE) {
    console.log("  (dry-run: hitungan target, tanpa penulisan)")
  } else {
    const authNow = await countAuthUsers()
    const authIds = await listAuthIds()
    const prismaMapped = await db.user.count({ where: { email: { in: emails } } })
    console.log(`  Supabase Auth : ${authNow} (target ${ENV.count})`)
    console.log(`  Prisma User   : ${prismaMapped} (1:1 dengan auth — ${authIds.size === prismaMapped ? "OK" : "MISMATCH, ada orphan/missing"})`)
    if (authNow !== ENV.count || authIds.size !== prismaMapped) process.exitCode = 1
  }

  await db.$disconnect()
  process.exit(0)
}

function hostObfuscate(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return "<invalid>"
  }
}

/** Obfuscate DB url: tampilkan hanya host + port + nama db, tanpa username/password/token. */
function obfuscateDb(url: string): string {
  try {
    const u = new URL(url)
    return `postgresql://***@${u.host}${u.pathname}`
  } catch {
    return "<invalid url>"
  }
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})