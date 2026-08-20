#!/usr/bin/env node
/**
 * staging-gate.ts — SHARED staging isolation gate (HARD FAIL).
 *
 * Satu-satunya sumber kebenaran untuk "is env staging?" yang dipakai oleh:
 *   - scripts/verify-staging-environment.ts   (CLI gate)
 *   - scripts/seed-staging-loadtest.ts        (sebelum --execute)
 *   - scripts/run-ukbi200-loadtest.ts         (before spawning k6)
 *
 * 12 checks, SEMUA harus PASS (exit failure = STOP).
 *
 * PRINSIP:
 *   1. Hanya membaca var STAGING_* (TIDAK pernah membaca var production yang
 *      mungkin tertinggal di shell, selain untuk BANDINGKAN host Redis).
 *   2. Isolasi ditentukan dari FAKTA (hostname, project-ref Supabase, host DB,
 *      endpoint Redis, deployment URL) — BUKAN NODE_ENV/VERCEL_ENV.
 *   3. Ref production `ibtlhoocaoopgtcsnvzr` hanya dipakai sebagai NEGATIVE
 *      CHECK (terdeteksi → FAIL HARD). Tidak ada secret production di source.
 *   4. Tidak pernah mencetak secret: hanya host / status.
 *   5. Live checks (auth admin call, Redis INFO) hanya ditembak SETELAH
 *      URL staging lolos guard ref — sehingga env production tipe apa pun
 *      gagal di lapisan string, tanpa satupun request.
 */

export const PRODUCTION_REF = "ibtlhoocaoopgtcsnvzr"
export const PRODUCTION_HOSTS = new Set([
  "bahasacerdas.com",
  "www.bahasacerdas.com",
  "game.bahasacerdas.com",
  "bahasacerdas.site",
])
export const LOADTEST_PAKET_PREFIX = "lt-ukbi-200-"

export interface GateCheck {
  id: number
  name: string
  ok: boolean
  detail: string
}

export interface GateResult {
  checks: GateCheck[]
  ok: boolean
  derivedRef: string | null
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return "<invalid>"
  }
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname
  } catch {
    return "<invalid>"
  }
}

/** Ekstrak project-ref Supabase (20–22 karakter [a-z0-9]) dari URL/DSN/string. */
export function extractSupabaseRef(input: string): string | null {
  const m = input.match(/(?:postgres\.|https?:\/\/|db\.)([a-z0-9]{20,22})(?:\.|\/|:)/)
  return m ? m[1] : null
}

/** Bentuk JWT: tiga segmen base64url dipisah titik — ciri service_role key. */
export function looksLikeJwt(key: string): boolean {
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key) && key.length >= 20
}

function check(id: number, name: string, ok: boolean, detail: string): GateCheck {
  return { id, name, ok, detail }
}

export async function verifyStagingGate(
  env: Record<string, string | undefined>
): Promise<GateResult> {
  const supabaseUrl = env.STAGING_SUPABASE_URL || ""
  const serviceRole = env.STAGING_SUPABASE_SERVICE_ROLE_KEY || ""
  const dbUrl = env.STAGING_DATABASE_URL || ""
  const directUrl = env.STAGING_DIRECT_URL || ""
  const redisUrl = env.STAGING_REDIS_URL || ""
  const redisToken = env.STAGING_REDIS_TOKEN || ""
  const baseUrl = env.STAGING_BASE_URL || ""
  const allowLocal = env.UKBI_LOADTEST_ALLOW_LOCAL === "true"

  // Production Redis ambient (untuk BANDING host saja — tidak pernah dicetak).
  const ambientProdRedis = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || ""

  const checks: GateCheck[] = []

  // ── PRIMITIF DERIVATIF ──
  const refs: Array<{ label: string; ref: string | null }> = [
    { label: "db", ref: dbUrl ? extractSupabaseRef(dbUrl) : null },
    { label: "direct", ref: directUrl ? extractSupabaseRef(directUrl) : null },
    { label: "supabaseUrl", ref: supabaseUrl ? extractSupabaseRef(supabaseUrl) : null },
    { label: "redis", ref: redisUrl ? extractSupabaseRef(redisUrl) : null },
  ]
  const nonNullRefs = refs.filter((r) => r.ref !== null).map((r) => r.ref as string)
  const consistentRef = nonNullRefs.length > 0 && new Set(nonNullRefs).size === 1 ? nonNullRefs[0] : null

  // LIVE guard: jangan request apa pun bila URL belum terbukti non-production.
  const urlRefOk = !!supabaseUrl && (!extractSupabaseRef(supabaseUrl) || extractSupabaseRef(supabaseUrl) !== PRODUCTION_REF)
  const dbRefOk = !!dbUrl && !dbUrl.includes(PRODUCTION_REF)

  // 1. DATABASE_URL is staging
  const dbHost = hostOf(dbUrl)
  checks.push(
    check(
      1,
      "DATABASE_URL is staging",
      !!dbUrl && dbUrl.startsWith("postgres") && dbRefOk && !!extractSupabaseRef(dbUrl),
      dbUrl ? `${dbHost} (ref ${extractSupabaseRef(dbUrl) || "?"})` : "(kosong)"
    )
  )

  // 2. DIRECT_URL is staging
  const directRef = directUrl ? extractSupabaseRef(directUrl) : null
  const dbRef = dbUrl ? extractSupabaseRef(dbUrl) : null
  checks.push(
    check(
      2,
      "DIRECT_URL is staging",
      !!directUrl && directUrl.startsWith("postgres") && !directUrl.includes(PRODUCTION_REF) && !!directRef && (!dbRef || directRef === dbRef),
      directUrl ? `${hostOf(directUrl)} (ref ${directRef || "?"})` : "(kosong)"
    )
  )

  // 3. NEXT_PUBLIC_SUPABASE_URL is staging
  const suRef = supabaseUrl ? extractSupabaseRef(supabaseUrl) : null
  checks.push(
    check(
      3,
      "NEXT_PUBLIC_SUPABASE_URL is staging",
      !!supabaseUrl && supabaseUrl.startsWith("https://") && suRef !== null && suRef !== PRODUCTION_REF && (!dbRef || suRef === dbRef),
      supabaseUrl ? `${hostOf(supabaseUrl)} (ref ${suRef || "?"})` : "(kosong)"
    )
  )

  // 4. SERVICE_ROLE_KEY milik staging (format + validasi LIVE terhadap staging auth)
  let keyDetail = serviceRole ? "(set)" : "(kosong)"
  let keyLive = false
  if (urlRefOk && !!supabaseUrl && looksLikeJwt(serviceRole)) {
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1`, {
        headers: { apikey: serviceRole, Authorization: `Bearer ${serviceRole}` },
        signal: AbortSignal.timeout(10_000),
      })
      keyLive = res.ok
      keyDetail = keyLive ? "(LIVE: valid untuk auth project ini)" : `(LIVE: HTTP ${res.status})`
    } catch (e) {
      keyDetail = `(LIVE: ${e instanceof Error ? e.message : "error"})`
    }
  }
  checks.push(
    check(
      4,
      "SERVICE_ROLE_KEY milik staging",
      urlRefOk && looksLikeJwt(serviceRole) && keyLive,
      keyDetail
    )
  )

  // 5. Redis is staging (URL + token + host ≠ production + LIVE INFO)
  let redisLive = false
  let redisDetail = redisUrl ? `${hostOf(redisUrl)}` : "(kosong)"
  const redisHost = redisUrl ? hostOf(redisUrl) : ""
  const ambientProdRedisHost = ambientProdRedis ? hostOf(ambientProdRedis) : ""
  const redisSeparate = !ambientProdRedisHost || redisHost !== ambientProdRedisHost
  if (redisUrl && redisToken && !redisUrl.includes(PRODUCTION_REF) && redisSeparate) {
    try {
      // Upstash REST: https://{host}/info dengan Bearer token. Strip creds dari
      // URL & ubah skema rediss→https (fetch menolak URL ber-kredensial).
      let restUrl = redisUrl.replace(/^redis[s]?:\/\//i, "https://")
      const u = new URL(restUrl)
      u.username = ""
      u.password = ""
      u.pathname = "/info"
      const res = await fetch(u.toString(), {
        headers: { Authorization: `Bearer ${redisToken}` },
        signal: AbortSignal.timeout(10_000),
      })
      redisLive = res.ok
      redisDetail = redisLive ? `${hostOf(redisUrl)} (LIVE INFO OK)` : `${hostOf(redisUrl)} (LIVE HTTP ${res.status})`
    } catch (e) {
      redisDetail = `${hostOf(redisUrl)} (LIVE: ${e instanceof Error ? e.message : "error"})`
    }
  }
  checks.push(
    check(
      5,
      "Redis is staging",
      !!redisUrl && redisUrl.startsWith("https://") && !!redisToken && redisSeparate && !redisUrl.includes(PRODUCTION_REF) && redisLive,
      redisDetail
    )
  )

  // 6. Auth project is staging
  checks.push(
    check(
      6,
      "Auth project is staging",
      suRef !== null && suRef !== PRODUCTION_REF && consistentRef === suRef,
      suRef ? `ref ${suRef} konsisten dengan DB/Redis` : "ref tidak terdeteksi"
    )
  )

  // 7. BASE_URL is staging (localhost hanya bila eksplisit ALLOW_LOCAL)
  const bh = hostnameOf(baseUrl)
  const isLocalHost = bh === "localhost" || bh === "127.0.0.1" || bh === "[::1]"
  const baseOk =
    !!baseUrl &&
    bh !== "<invalid>" &&
    !PRODUCTION_HOSTS.has(bh) &&
    (allowLocal ? true : !isLocalHost)
  checks.push(
    check(
      7,
      "BASE_URL is staging",
      baseOk,
      baseUrl ? `${bh}${isLocalHost ? (allowLocal ? " (local, eksplisit ALLOW)" : " (local TANPA ALLOW → FAIL)") : ""}` : "(kosong)"
    )
  )

  // 8. Loadtest target ikut ambil BASE_URL (static self-check k6 gate assets)
  const fs = await import("node:fs")
  const path = await import("node:path")
  const gate04 = fs.readFileSync(path.join(process.cwd(), "loadtest", "04-ukbi-200-users.js"), "utf8")
  const gateMjs = fs.readFileSync(path.join(process.cwd(), "loadtest", "ukbi-200-gate.mjs"), "utf8")
  const k6AssetsOk =
    gate04.includes("enforceLoadtestGate") &&
    gate04.includes("UKBI_LOADTEST_ENV") &&
    gate04.includes("UKBI_LOADTEST_APPROVED") &&
    gateMjs.includes("BASE_URL") &&
    gateMjs.includes(LOADTEST_PAKET_PREFIX) &&
    !/https?:\/\/www\.bahasacerdas\.com/.test(gate04)
  checks.push(
    check(
      8,
      "Loadtest target terkunci ke staging",
      k6AssetsOk,
      k6AssetsOk ? "gate k6 ada (BASE_URL wajib, ENV/APPROVED interlock, prefix paket)" : "asset k6 tidak lolos self-check — periksa"
    )
  )

  // 9. Production DB ref TIDAK terdeteksi
  const anyProductionRef = [dbUrl, directUrl, supabaseUrl, redisUrl].some((u) => u.includes(PRODUCTION_REF))
  checks.push(
    check(
      9,
      "Production DB ref tidak terdeteksi",
      !anyProductionRef,
      anyProductionRef ? "terdeteksi ibtlhoocaoopgtcsnvzr — FAIL HARD" : "tidak ada"
    )
  )

  // 10. Production Supabase ref TIDAK terdeteksi (alur derivasi)
  checks.push(
    check(
      10,
      "Production Supabase ref tidak terdeteksi (derivasi)",
      nonNullRefs.every((r) => r !== PRODUCTION_REF) && suRef !== PRODUCTION_REF,
      nonNullRefs.length > 0 ? `ref derivasi: ${consistentRef || "INKONSISTEN"}` : "tidak ada ref"
    )
  )

  // 11. Production Redis endpoint TIDAK terdeteksi
  checks.push(
    check(
      11,
      "Production Redis endpoint tidak terdeteksi",
      redisSeparate && !redisUrl.includes(PRODUCTION_REF),
      ambientProdRedisHost ? `host staging (${redisHost || "-"}) ≠ production (${ambientProdRedisHost})` : "tidak ada prod ambient untuk dibandingkan"
    )
  )

  // 12. Required staging variables ada
  const required = [
    ["STAGING_SUPABASE_URL", supabaseUrl],
    ["STAGING_SUPABASE_SERVICE_ROLE_KEY", serviceRole],
    ["STAGING_DATABASE_URL", dbUrl],
    ["STAGING_DIRECT_URL", directUrl],
    ["STAGING_REDIS_URL", redisUrl],
    ["STAGING_REDIS_TOKEN", redisToken],
    ["STAGING_BASE_URL", baseUrl],
  ]
  const missing = required.filter(([, v]) => !v).map(([n]) => n)
  checks.push(
    check(
      12,
      "Required staging variables ada",
      missing.length === 0,
      missing.length === 0 ? "semua STAGING_* ada" : `kurang: ${missing.join(", ")}`
    )
  )

  return { checks, ok: checks.every((c) => c.ok), derivedRef: consistentRef }
}

/** Convenience untuk caller CLI: throw bila gate gagal. */
export async function assertStagingGate(env: Record<string, string | undefined>): Promise<GateResult> {
  const res = await verifyStagingGate(env)
  if (!res.ok) {
    const fails = res.checks.filter((c) => !c.ok).map((c) => `  [${c.id}] ${c.name} — ${c.detail}`)
    throw new Error(`STAGING GATE FAIL (${fails.length}/${res.checks.length}):\n${fails.join("\n")}`)
  }
  return res
}