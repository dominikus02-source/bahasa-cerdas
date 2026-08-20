// ukbi-200-gate.mjs — LOAD TEST SAFETY INTERLOCK (pure ESM, no k6 imports).
//
// Dipakai oleh:
//   - loadtest/04-ukbi-200-users.js  (dipanggil SAAT INIT — throw sebelum
//     satu request pun dikirim)
//   - scripts/run-ukbi200-loadtest.ts (node wrapper, sebelum spawn k6)
//   - scripts/test-ukbi200-loadtest-gate.ts (unit test node)
//
// Aturan:
//   - BASE_URL WAJIB (tidak ada default production / tanpa default).
//   - Host production (bahasacerdas.com/w*) → FAIL.
//   - localhost/127.0.0.1 → hanya bila UKBI_LOADTEST_ALLOW_LOCAL=true.
//   - PAKET_ID wajib, harus berawalan prefix paket STAGING (lt-ukbi-200-).
//   - Interlock ganda: UKBI_LOADTEST_ENV=staging DAN UKBI_LOADTEST_APPROVED=true.
//   - Tidak ada password/kredensial di source ini.

export const UKBI_PAKET_PREFIX = "lt-ukbi-200-"

const PROD_HOSTS = new Set([
  "bahasacerdas.com",
  "www.bahasacerdas.com",
  "game.bahasacerdas.com",
  "bahasacerdas.site",
])

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"])

// k6 (goja) TIDAK punya global URL — parse manual.
function parseHost(baseUrl) {
  if (!/^https?:\/\//i.test(baseUrl)) return null
  const m = baseUrl.match(/^[a-z][a-z0-9+.-]*:\/\/([^/?#]+)/i)
  const authority = m ? m[1] : baseUrl.split(/[/?#]/)[0]
  return authority.split(":")[0].toLowerCase()
}

export function enforceLoadtestGate(env) {
  const baseUrl = (env && env.BASE_URL) || ""
  if (!baseUrl) {
    throw new Error(
      "BASE_URL wajib diisi (deployment STAGING). Load test TIDAK pernah diarahkan ke production."
    )
  }

  const host = parseHost(baseUrl)
  if (!host) {
    throw new Error(`BASE_URL tidak valid: ${baseUrl}`)
  }

  if (PROD_HOSTS.has(host)) {
    throw new Error(
      `DILARANG: BASE_URL menunjuk production (${host}). Pakai deployment staging (mis. staging.bahasacerdas.com / *.vercel.app).`
    )
  }

  if (LOCAL_HOSTS.has(host)) {
    const allowLocal = (env && env.UKBI_LOADTEST_ALLOW_LOCAL) === "true"
    if (!allowLocal) {
      throw new Error(
        `BASE_URL menunjuk host lokal (${host}). Atur UKBI_LOADTEST_ALLOW_LOCAL=true HANYA untuk tes lokal eksplisit.`
      )
    }
  }

  const paketId = (env && env.PAKET_ID) || ""
  if (!paketId) {
    throw new Error("PAKET_ID wajib diisi (paket staging dari seed-staging-loadtest).")
  }
  if (!paketId.startsWith(UKBI_PAKET_PREFIX)) {
    throw new Error(
      `PAKET_ID harus berawalan "${UKBI_PAKET_PREFIX}" (paket staging), bukan paket lain. Diterima: ${paketId}`
    )
  }

  if ((env && env.UKBI_LOADTEST_ENV) !== "staging") {
    throw new Error(
      "Safety interlock: UKBI_LOADTEST_ENV harus bernilai 'staging' (production/missing → STOP)."
    )
  }
  if ((env && env.UKBI_LOADTEST_APPROVED) !== "true") {
    throw new Error(
      "Safety interlock: UKBI_LOADTEST_APPROVED harus 'true' (eksplisit dari operator)."
    )
  }

  return { baseUrl, host, paketId }
}