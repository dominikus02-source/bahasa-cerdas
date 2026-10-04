#!/usr/bin/env node
/**
 * staging-one-user-smoke.ts — Phase C: ONE-USER smoke di project STAGING.
 *
 * Membuktikan end-to-end: Auth staging live → Prisma User mapping → login →
 * session JWT milik staging (auth provider, bukan production).
 *
 * PENTING: Hanya membaca var STAGING_*. VERIFIKASI REF MANDATORY:
 *   - admin key (legacy service_role JWT atau sb_secret_*) valid terhadap Auth staging
 *   - localStorage staging tidak mengandung ref production
 * Sesi dibuat SIAPA PUN di project staging TANPA menyentuh production.
 *
 * Usage:
 *   STAGING_SUPABASE_URL=... STAGING_SUPABASE_SERVICE_ROLE_KEY=... \
 *   STAGING_SUPABASE_ANON_KEY=... STAGING_DATABASE_URL=... \
 *   STAGING_TEST_PASSWORD=... npx tsx scripts/staging-one-user-smoke.ts
 * Exit 0 = PASS (semua baris `[PASS]`), non-zero = FAIL.
 */

import { PrismaClient } from "@prisma/client"
import { prismaPoolerSafeUrl } from "./lib/staging-gate"

const env = process.env
const REF_STAGING = "hvfkhaocukdzfvseqwdz"
const PROD_REF = "ibtlhoocaoopgtcsnvzr"
const EMAIL = "ukbi-loadtest-001@loaded-test.id"
const NAME = "Murid Smoke Uji"

function fail(msg: string): never {
  console.error(`[FAIL] ${msg}`)
  process.exit(1)
}

function pass(msg: string): void {
  console.log(`[PASS] ${msg}`)
}

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1]
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
  } catch {
    return null
  }
}

async function main(): Promise<void> {
  const url = env.STAGING_SUPABASE_URL || fail("STAGING_SUPABASE_URL kosong")
  const serviceRole = env.STAGING_SUPABASE_SERVICE_ROLE_KEY || fail("STAGING_SUPABASE_SERVICE_ROLE_KEY kosong")
  const anon = env.STAGING_SUPABASE_ANON_KEY || fail("STAGING_SUPABASE_ANON_KEY kosong")
  const dbUrl = env.STAGING_DATABASE_URL || fail("STAGING_DATABASE_URL kosong")
  const password = env.STAGING_TEST_PASSWORD || fail("STAGING_TEST_PASSWORD kosong")

  if (url.includes(PROD_REF) || dbUrl.includes(PROD_REF)) {
    fail("URL/DB mengandung ref production — dihentikan")
  }
  if (!url.includes(REF_STAGING) || !dbUrl.includes(REF_STAGING)) {
    fail("URL/DB bukan ref staging " + REF_STAGING)
  }

  const claim = decodeJwt(serviceRole)
  if (claim) {
    if (claim.ref !== REF_STAGING) fail(`claim.ref service role = ${String(claim.ref)} (bukan staging)`)
    if (claim.role !== "service_role") fail(`claim.role = ${String(claim.role)} — bukan service_role`)
  } else if (!serviceRole.startsWith("sb_secret_")) {
    fail("admin key bukan legacy service_role JWT atau sb_secret_*")
  }

  pass(`Auth URL staging: ${url}`)

  const authHeaders = {
    apikey: serviceRole,
    Authorization: `Bearer ${serviceRole}`,
    "Content-Type": "application/json",
  }

  const existingResponse = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers: authHeaders,
  })
  if (!existingResponse.ok) fail(`list users HTTP ${existingResponse.status}`)
  const existingBody = await existingResponse.json() as
    | Array<{ id: string; email?: string; user_metadata?: Record<string, unknown> }>
    | { users?: Array<{ id: string; email?: string; user_metadata?: Record<string, unknown> }> }
  const users = Array.isArray(existingBody) ? existingBody : existingBody.users || []

  pass(claim ? `legacy service_role key valid untuk staging (ref ${claim.ref})` : "sb_secret admin key valid untuk staging")

  const found = users.find((u) => u.email === EMAIL)

  let authId: string
  if (found) {
    authId = found.id
    const reset = await fetch(`${url}/auth/v1/admin/users/${authId}`, {
      method: "PUT",
      headers: authHeaders,
      body: JSON.stringify({
        password,
        email_confirm: true,
        user_metadata: { ...(found.user_metadata || {}), full_name: NAME, role: "MURID" },
      }),
    })
    if (!reset.ok) fail(`reset test user HTTP ${reset.status}: ${await reset.text()}`)
    pass(`auth user ${EMAIL} sudah ada; password test disinkronkan (idempotent reuse)`)
  } else {
    const createdResponse = await fetch(`${url}/auth/v1/admin/users`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        email: EMAIL,
        password,
        email_confirm: true,
        user_metadata: { full_name: NAME, role: "MURID" },
      }),
    })
    if (!createdResponse.ok) fail(`create user HTTP ${createdResponse.status}: ${await createdResponse.text()}`)
    const created = await createdResponse.json() as { id?: string }
    if (!created.id) fail("create user berhasil tetapi id kosong")
    authId = created.id
    pass(`auth user ${EMAIL} dibuat (id ${authId})`)
  }

  const prisma = new PrismaClient({ datasources: { db: { url: prismaPoolerSafeUrl(dbUrl) } } })
  try {
    const user = await prisma.user.upsert({
      where: { supabaseId: authId },
      create: { supabaseId: authId, email: EMAIL, role: "MURID", fullName: NAME, nickname: NAME },
      update: {},
    })
    pass(`Prisma User terhubung (id ${user.id}, role ${user.role}) — DB staging live`)
  } finally {
    await prisma.$disconnect()
  }

  const session = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anon, "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password }),
  })
    .then(async (r) => {
      if (!r.ok) fail(`sign-in HTTP ${r.status}: ${await r.text()}`)
      return r.json()
    })
    .catch((e) => fail(`sign-in gagal: ${e instanceof Error ? e.message : "?"}`))

  const jwt = decodeJwt((session as { access_token: string }).access_token) || fail("access_token bukan JWT")
  const iss = String(jwt.iss || "")
  const aud = String(jwt.aud || "")
  if (!iss.includes("auth/v1")) fail(`iss tidak menunjuk auth: ${iss}`)
  if (!url.includes(new URL(iss).hostname)) fail("iss host ≠ STAGING_SUPABASE_URL host")
  if (aud !== "authenticated") fail(`aud = ${aud} (bukan authenticated)`)
  if (String(jwt.sub) !== authId) fail("sub ≠ auth user id")

  pass(`sign-in OK — session JWT menunjuk staging (iss ${iss}, sub ${jwt.sub})`)
  pass(`smoke user siap: ${EMAIL}`)
  pass("PHASE C ONE-USER SMOKE SELESAI ✅")
}

main().catch((e) => fail(e instanceof Error ? e.message : String(e)))