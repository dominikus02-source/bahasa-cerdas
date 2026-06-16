/**
 * Load test script for BahasaCerdas API
 * Run: npx tsx scripts/load-test.ts
 * 
 * Tests the critical endpoints by simulating concurrent users.
 * Requires a valid session token (set SESSION_TOKEN env var or it will test unauthenticated paths).
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000"
const CONCURRENT_USERS = parseInt(process.env.CONCURRENT_USERS || "20", 10)
const REQUESTS_PER_USER = parseInt(process.env.REQUESTS_PER_USER || "5", 10)

const endpoints = [
  { path: "/api/user/me", weight: 10 },      // every page load
  { path: "/api/notifikasi", weight: 5 },      // sidebar polling
  { path: "/api/karya", weight: 3 },           // marketplace
  { path: "/api/user/sertifikat", weight: 1 }, // profile pages
  { path: "/api/user/rekening", weight: 1 },   // seller pages
]

// Weighted random endpoint selection
function pickEndpoint(): string {
  const total = endpoints.reduce((s, e) => s + e.weight, 0)
  let r = Math.random() * total
  for (const ep of endpoints) {
    r -= ep.weight
    if (r <= 0) return ep.path
  }
  return endpoints[0].path
}

async function simulateUser(userId: number): Promise<{ ok: number; fail: number; ms: number[] }> {
  const results = { ok: 0, fail: 0, ms: [] as number[] }

  for (let i = 0; i < REQUESTS_PER_USER; i++) {
    const path = pickEndpoint()
    const url = `${BASE_URL}${path}`
    try {
      const start = Date.now()
      const res = await fetch(url, {
        headers: { "User-Agent": `loadtest/${userId}` },
        signal: AbortSignal.timeout(10000),
      })
      const elapsed = Date.now() - start
      results.ms.push(elapsed)

      if (res.ok) {
        results.ok++
      } else {
        results.fail++
        if (res.status === 429) process.stdout.write("⏳")
        else process.stdout.write("✗")
      }
    } catch {
      results.fail++
      process.stdout.write("⚠")
    }
  }
  return results
}

async function main() {
  console.log(`\n🚀 Load Testing ${BASE_URL}`)
  console.log(`   ${CONCURRENT_USERS} concurrent users × ${REQUESTS_PER_USER} requests\n`)

  const users = Array.from({ length: CONCURRENT_USERS }, (_, i) => simulateUser(i + 1))

  const overallStart = Date.now()
  const allResults = await Promise.all(users)
  const totalMs = Date.now() - overallStart

  let totalOk = 0, totalFail = 0
  const allTimes: number[] = []

  for (const r of allResults) {
    totalOk += r.ok
    totalFail += r.fail
    allTimes.push(...r.ms)
  }

  const totalRequests = totalOk + totalFail
  const sorted = [...allTimes].sort((a, b) => a - b)
  const avg = allTimes.reduce((s, t) => s + t, 0) / allTimes.length
  const p50 = sorted[Math.floor(sorted.length * 0.5)]
  const p95 = sorted[Math.floor(sorted.length * 0.95)]
  const p99 = sorted[Math.floor(sorted.length * 0.99)]

  console.log(`\n\n📊 Results (${totalRequests} requests in ${totalMs}ms)\n`)
  console.log(`   ✅ Success: ${totalOk}`)
  console.log(`   ❌ Failed:  ${totalFail}`)
  console.log(`   📈 RPS:     ${Math.round((totalRequests / totalMs) * 1000)}`)
  console.log(`   ⚡ Avg:     ${Math.round(avg)}ms`)
  console.log(`   📉 P50:     ${p50}ms`)
  console.log(`   📊 P95:     ${p95}ms`)
  console.log(`   📊 P99:     ${p99}ms`)

  if (totalFail > 0) {
    console.log(`\n⚠️  ${totalFail} requests failed — check server logs`)
  }

  const passRate = (totalOk / totalRequests) * 100
  if (passRate >= 99) {
    console.log("\n✅ PASS: >=99% success rate")
  } else if (passRate >= 95) {
    console.log("\n⚠️  WARN: 95-99% success rate — review failures")
  } else {
    console.log("\n❌ FAIL: <95% success rate — needs investigation")
  }

  if (p95 > 5000) {
    console.log("⚠️  WARN: P95 > 5000ms — response times too high")
  }
}

main().catch(console.error)
