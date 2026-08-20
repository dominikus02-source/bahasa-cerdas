#!/usr/bin/env node
/**
 * verify-staging-environment.ts — CLI HARD FAIL gate (12 checks).
 *
 * Semua sumber kebenaran ada di scripts/lib/staging-gate.ts; file ini hanya
 * menampilkan hasil dan exit code.
 *
 *   STAGING_SUPABASE_URL STAGING_SUPABASE_SERVICE_ROLE_KEY STAGING_DATABASE_URL \
 *   STAGING_DIRECT_URL STAGING_REDIS_URL STAGING_REDIS_TOKEN STAGING_BASE_URL \
 *   npx tsx scripts/verify-staging-environment.ts
 *
 * exit 0 = 12/12 PASS; exit 1 = ada FAIL (STOP, jangan seed/load test).
 * Tidak pernah mencetak secret — hanya host & status.
 */

import { verifyStagingGate } from "./lib/staging-gate"

function maskRef(ref: string | null): string {
  return ref ? `${ref.slice(0, 6)}…${ref.slice(-4)}` : "?"
}

async function main() {
  console.log("🧪 VERIFY STAGING ENVIRONMENT (12-check HARD gate)\n")

  const { checks, ok, derivedRef } = await verifyStagingGate(process.env)

  console.table(
    checks.map((c) => ({
      "#": c.id,
      CHECK: c.name,
      STATUS: c.ok ? "PASS" : "FAIL",
      DETAIL: c.detail,
    }))
  )

  console.log(`\nIdentitas staging (derivasi): ref ${maskRef(derivedRef)}`)

  const fails = checks.filter((c) => !c.ok)
  if (fails.length === 0) {
    console.log("\nSTAGING GATE = PASS (12/12). Load test & seed diizinkan.")
    process.exit(0)
  }
  console.log(`\nSTAGING GATE = FAIL (${fails.length}/12) — STOP. Tidak boleh seed/load test.`)
  process.exit(1)
}

main().catch((e) => {
  console.error("Fatal:", e)
  process.exit(1)
})