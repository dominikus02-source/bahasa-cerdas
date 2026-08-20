#!/usr/bin/env node
/**
 * observe-ukbi-load.ts — Observability sampler berjalan NON-BLOCKING di
 * background selama k6 load test (~20 menit). Sample per 10 detik:
 *   - DB staging: koneksi aktif (pg_stat_activity), kueri aktif, kueri terpanjang
 *   - Redis staging: info clients/blocks/used_memory, keyspace pool
 * Output: JSONL ke path arg (default /tmp …/observe-ukbi.jsonl). TANPA secret.
 *
 *   STAGING_* env dari staging.env. Jalankan: npx tsx script &  (background)
 *   Stop otomatis setelah MAX-MINGGU (default 22 menit) atau saat SIGTERM.
 */

import { assertStagingGate } from "./lib/staging-gate"
import { stagingDb } from "./lib/staging-db"
import { createWriteStream } from "node:fs"

const OUT = process.argv.find((a) => a.startsWith("--out="))?.split("=")[1] ||
  "/var/folders/dh/39_9l3qs70vc6fd873zc7fsr0000gn/T/opencode/observe-ukbi.jsonl"
const INTERVAL_MS = 10_000
const MAX_RUN_MS = (parseInt(process.env.OBSERVE_MAX_MS || "1320000", 10)) // 22 menit default

let redisHealthy = true
let cachedRedis: null | { host: string } = null

async function redisInfoLine(): Promise<Record<string, unknown>> {
  const url = process.env.STAGING_REDIS_URL || ""
  const token = process.env.STAGING_REDIS_TOKEN || ""
  if (!url || !token) return { redis: "unconfigured" }
  try {
    const u = new URL(url)
    u.username = ""
    u.password = ""
    const res = await fetch(`${u.origin}/info`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) {
      redisHealthy = false
      return { redis: `HTTP ${res.status}`, healthy: redisHealthy }
    }
    const text = await res.text()
    // Key metrics dari INFO
    const grab = (k: string) => text.match(new RegExp(`^${k}:(.+?)$`, "m"))?.[1]?.trim() ?? ""
    const out: Record<string, unknown> = {
      redis_connection_kind: u.origin,
      redis_clients: grab("connected_clients"),
      redis_blocked: grab("blocked_clients"),
      redis_mem: grab("used_memory_human"),
      redis_ops: grab("total_commands_processed"),
      redis_keys: grab("db0"),
      redis_healthy: (redisHealthy = true),
    }
    return out
  } catch (e) {
    redisHealthy = false
    return { redis: `ERROR ${e instanceof Error ? e.message : String(e)}`, healthy: redisHealthy }
  }
}

async function sample(db: Awaited<ReturnType<typeof stagingDb>>): Promise<Record<string, unknown>> {
  const row: Record<string, unknown> = { t: new Date().toISOString() }
  try {
    const [conn, active, long] = await db.$transaction([
      db.$queryRawUnsafe(
        `SELECT count(*)::int AS total, count(*) FILTER (WHERE state='active')::int AS active,
                count(*) FILTER (WHERE state='idle in transaction')::int AS idle_tx
         FROM pg_stat_activity WHERE datname = current_database()`
      ),
      db.$queryRawUnsafe(
        `SELECT coalesce(max(extract(epoch from (now()-query_start)))::numeric(6,1),0)::text AS longest_sec
         FROM pg_stat_activity WHERE datname = current_database() AND state='active'`
      ),
      db.$queryRawUnsafe(
        `SELECT pid::text, state, left(query, 60) AS q
         FROM pg_stat_activity
         WHERE datname = current_database() AND state='active'
         ORDER BY query_start LIMIT 5`
      ),
    ])
    const c = (conn as Array<Record<string, number>>)[0] || {}
    const l = (long as Array<Record<string, string>>)[0] || {}
    row.db_total = c.total
    row.db_active = c.active
    row.db_idle_tx = c.idle_tx
    row.db_longest_sec = l.longest_sec
    row.db_top = (active as Array<Record<string, string>>).map((r) => `${r.pid}:${(r.q || "").slice(0, 50)}`)
  } catch (e) {
    row.db_error = e instanceof Error ? e.message.slice(0, 120) : String(e)
  }
  Object.assign(row, await redisInfoLine())
  return row
}

async function main() {
  if (!cachedRedis) {
    const r = await assertStagingGate(process.env)
    if (!r.ok) {
      console.error("❌ GATE staging FAIL — observer berhenti (JANGAN collect data dari non-staging).")
      process.exit(1)
    }
  }
  const db = stagingDb(process.env)
  const out = createWriteStream(OUT, { flags: "a" })

  const startedAt = Date.now()
  console.log(`⏱️  Observer jalan: sample per ${INTERVAL_MS / 1000}s, maks ${Math.round(MAX_RUN_MS / 60000)} menit → ${OUT}`)

  const tick = async () => {
    if (Date.now() - startedAt > MAX_RUN_MS) {
      console.log("✓ Observer selesai (timeout).")
      out.end()
      await db.$disconnect()
      process.exit(0)
    }
    const row = await sample(db)
    out.write(JSON.stringify(row) + "\n")
    setTimeout(tick, INTERVAL_MS)
  }
  tick()
}

process.on("SIGTERM", () => {
  console.log("SIGTERM — observer berhenti.")
  process.exit(0)
})
process.on("SIGINT", () => {
  console.log("SIGINT — observer berhenti.")
  process.exit(0)
})

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : String(e))
  process.exit(1)
})