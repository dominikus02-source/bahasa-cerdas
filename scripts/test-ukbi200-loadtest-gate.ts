#!/usr/bin/env node
/**
 * test-ukbi200-loadtest-gate.ts — deterministic tests for the k6 safety
 * interlock (loadtest/ukbi-200-gate.mjs) + static assertions on the journey
 * script. NO network calls, NO DB, NO production access.
 */

import { strict as assert } from "assert"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const gateMjsUrl = fileURLToPath(new URL(`file://${path.join(process.cwd(), "loadtest", "ukbi-200-gate.mjs")}`))

async function main() {
  const gate = await import(gateMjsUrl)

let passed = 0
function ok(name: string) {
  passed++
  console.log(`  ✅ ${name}`)
}
function throws(name: string, fn: () => unknown, pattern?: RegExp) {
  let threw = false
  try {
    fn()
  } catch (e) {
    threw = true
    if (pattern && !pattern.test(String(e))) {
      console.error(`  ❌ ${name} — error tidak cocok pola: ${e}`)
      process.exitCode = 1
      return
    }
  }
  if (!threw) {
    console.error(`  ❌ ${name} — seharusnya throw`)
    process.exitCode = 1
  } else {
    passed++
    console.log(`  ✅ ${name}`)
  }
}

console.log("TESTS — UKBI 200 LOAD TEST SAFETY GATE")

// ── 1. BASE_URL wajib ──
throws("BASE_URL wajib (missing → throw)", () => gate.enforceLoadtestGate({}), /BASE_URL wajib/)

// ── 2. Production host diblokir ──
for (const host of ["https://www.bahasacerdas.com", "https://bahasacerdas.com", "https://game.bahasacerdas.com"]) {
  throws(
    `production host diblokir (${host})`,
    () => gate.enforceLoadtestGate({ BASE_URL: host, PAKET_ID: "lt-ukbi-200-abc", UKBI_LOADTEST_ENV: "staging", UKBI_LOADTEST_APPROVED: "true" }),
    /DILARANG/
  )
}

// ── 3. localhost hanya dengan ALLOW eksplisit ──
throws(
  "localhost tanpa ALLOW → throw",
  () => gate.enforceLoadtestGate({ BASE_URL: "http://localhost:3000", PAKET_ID: "lt-ukbi-200-abc", UKBI_LOADTEST_ENV: "staging", UKBI_LOADTEST_APPROVED: "true" }),
  /ALLOW_LOCAL/
)
ok(
  "localhost dengan ALLOW → lolos",
  (() => {
    const r = gate.enforceLoadtestGate({ BASE_URL: "http://localhost:3000", PAKET_ID: "lt-ukbi-200-abc", UKBI_LOADTEST_ENV: "staging", UKBI_LOADTEST_APPROVED: "true", UKBI_LOADTEST_ALLOW_LOCAL: "true" })
    assert.equal(r.host, "localhost")
    return true
  })()
)

// ── 4. PAKET_ID prefix staging ──
throws("PAKET_ID missing → throw", () =>
  gate.enforceLoadtestGate({ BASE_URL: "https://staging.bahasacerdas.com", UKBI_LOADTEST_ENV: "staging", UKBI_LOADTEST_APPROVED: "true" }), /PAKET_ID wajib/)
throws(
  "PAKET_ID non-staging (mis. paket production) → throw",
  () => gate.enforceLoadtestGate({ BASE_URL: "https://staging.bahasacerdas.com", PAKET_ID: "ukbi-sd-practice", UKBI_LOADTEST_ENV: "staging", UKBI_LOADTEST_APPROVED: "true" }),
  /lt-ukbi-200/
)

// ── 5. Interlock flags ──
throws("UKBI_LOADTEST_ENV != staging → throw", () =>
  gate.enforceLoadtestGate({ BASE_URL: "https://staging.bahasacerdas.com", PAKET_ID: "lt-ukbi-200-abc", UKBI_LOADTEST_ENV: "production", UKBI_LOADTEST_APPROVED: "true" }), /UKBI_LOADTEST_ENV/)
throws("UKBI_LOADTEST_APPROVED missing → throw", () =>
  gate.enforceLoadtestGate({ BASE_URL: "https://staging.bahasacerdas.com", PAKET_ID: "lt-ukbi-200-abc", UKBI_LOADTEST_ENV: "staging" }), /APPROVED/)

// ── 6. Happy path staging ──
ok("staging lengkap → lolos", (() => {
  const r = gate.enforceLoadtestGate({
    BASE_URL: "https://staging.bahasacerdas.com",
    PAKET_ID: "lt-ukbi-200-abcdef12",
    UKBI_LOADTEST_ENV: "staging",
    UKBI_LOADTEST_APPROVED: "true",
  })
  assert.equal(r.paketId, "lt-ukbi-200-abcdef12")
  return true
})())

// ── 7. Statis: 04 memanggil gate, tidak ada default production / password ──
const src04 = fs.readFileSync(path.join(process.cwd(), "loadtest", "04-ukbi-200-users.js"), "utf8")
for (const token of ["enforceLoadtestGate", "UKBI_LOADTEST_ENV", "UKBI_LOADTEST_APPROVED"]) {
  assert.ok(src04.includes(token), `${token} harus ada di 04`)
  passed++
  console.log(`  ✅ 04 memakai ${token}`)
}
assert.ok(!/https?:\/\/(www\.)?bahasacerdas\.com/.test(src04), "04 tidak boleh punya default production URL")
assert.ok(!/password\s*[:=]/.test(src04), "04 tidak boleh menyimpan password di source")
passed += 2
console.log("  ✅ 04 tanpa default production URL & tanpa password di source")

const srcLib = fs.readFileSync(path.join(process.cwd(), "loadtest", "lib.js"), "utf8")
assert.ok(!/changeme|'loadtest@bahasacerdas\.test'/.test(srcLib), "lib.js tidak boleh punya kredensial default")
passed++
console.log("  ✅ lib.js tanpa kredensial default")

const srcSeed = fs.readFileSync(path.join(process.cwd(), "scripts", "seed-staging-loadtest.ts"), "utf8")
assert.ok(!/Loadtest-Pass-2026/.test(srcSeed), "seed tidak boleh punya password hardcoded")
passed++
console.log("  ✅ seed tanpa password hardcoded")

console.log(`\nRESULT: ${passed} assertions PASS`)
  process.exit(process.exitCode ?? 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})