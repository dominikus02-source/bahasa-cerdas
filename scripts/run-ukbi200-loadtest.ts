#!/usr/bin/env node
/**
 * run-ukbi200-loadtest.ts — npm `loadtest:ukbi-200` (guarded k6 launcher).
 *
 * Safety chain BEFORE k6 menyentuh jaringan:
 *   1. Staging gate 12/12 (scripts/lib/staging-gate.ts) — STAGING_* harus
 *      ter-isolasi, ref production TIDAK boleh terdeteksi.
 *   2. Loadtest interlock (loadtest/ukbi-200-gate.mjs): BASE_URL wajib non-
 *      production, PAKET_ID prefix staging, UKBI_LOADTEST_ENV=staging,
 *      UKBI_LOADTEST_APPROVED=true.
 *
 * Gagal satu saja → exit 1 SEBELUM k6 di-spawn.
 *
 * Penggunaan:
 *   STAGING_*=... UKBI_LOADTEST_ENV=staging UKBI_LOADTEST_APPROVED=true \
 *   BASE_URL=<staging> PAKET_ID=<lt-ukbi-200-...> USERS='[...]' \
 *   npm run loadtest:ukbi-200
 */

import { spawnSync } from "child_process"
import { fileURLToPath } from "url"
import path from "path"
import { verifyStagingGate } from "./lib/staging-gate"

const GATE_MJS = path.join(process.cwd(), "loadtest", "ukbi-200-gate.mjs")

async function main() {
  // 1. Staging infra gate (STAGING_*)
  const gate = await verifyStagingGate(process.env)
  const fails = gate.checks.filter((c) => !c.ok)
  if (fails.length > 0) {
    console.error("❌ STAGING GATE FAIL — k6 TIDAK dijalankan:")
    for (const f of fails) console.error(`   [${f.id}] ${f.name} — ${f.detail}`)
    process.exit(1)
  }
  console.log("✅ STAGING GATE 12/12 PASS")

  // 2. Loadtest interlock (BASE_URL/PAKET_ID/flags) — modul DIJALANKAN di node
  const { enforceLoadtestGate } = await import(fileURLToPath(new URL(`file://${GATE_MJS}`)))
  const approved = enforceLoadtestGate(process.env)
  console.log(`✅ LOADTEST GATE PASS (target ${approved.baseUrl} / ${approved.paketId})`)

  // 3. Spawn k6 (stdio inherit — timestamps/counters k6 diteruskan apa adanya)
  const args = [
    "run",
    "-e",
    `BASE_URL=${approved.baseUrl}`,
    "-e",
    `PAKET_ID=${approved.paketId}`,
    "-e",
    `UKBI_LOADTEST_ENV=staging`,
    "-e",
    `UKBI_LOADTEST_APPROVED=true`,
    path.join(process.cwd(), "loadtest", "04-ukbi-200-users.js"),
  ]
  if (process.env.USERS) args.push("-e", `USERS=${process.env.USERS}`)
  if (process.env.UKBI_LOADTEST_ALLOW_LOCAL === "true")
    args.push("-e", "UKBI_LOADTEST_ALLOW_LOCAL=true")
  if (process.env.VERCEL_BYPASS_TOKEN) args.push("-e", `VERCEL_BYPASS_TOKEN=${process.env.VERCEL_BYPASS_TOKEN}`)

  const res = spawnSync("k6", args, { stdio: "inherit", env: process.env })
  process.exit(res.status ?? 1)
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : String(e))
  process.exit(1)
})