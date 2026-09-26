/**
 * scripts/test-live-pulse.ts — BahasaCerdas Live Pulse: Test Suite
 *
 * Tests:
 *  1. lib/presence.ts — Unit tests (no Redis required)
 *  2. Heartbeat provider — Architecture checks
 *  3. API routes — Auth + response shape
 *  4. LivePulseCard — UI structure
 *  5. Privacy — No sensitive data exposure
 *  6. Integration — End-to-end wiring
 *
 * Usage: npx tsx scripts/test-live-pulse.ts
 */
import { readFileSync, existsSync } from "fs"
import { join } from "path"

let passed = 0
let failed = 0
const failures: string[] = []

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++
  } else {
    failed++
    failures.push(msg)
  }
}

function fileExists(path: string): boolean {
  return existsSync(join(process.cwd(), path))
}

function readFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf-8")
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1: File existence
// ═══════════════════════════════════════════════════════════════
console.log("SECTION 1: File existence")

assert(fileExists("lib/presence.ts"), "lib/presence.ts must exist")
assert(fileExists("lib/presence-location.ts"), "Presence location mapper must exist")
assert(fileExists("app/api/presence/heartbeat/route.ts"), "Heartbeat API must exist")
assert(fileExists("app/api/analytics/live/route.ts"), "Live analytics API must exist")
assert(fileExists("components/providers/HeartbeatProvider.tsx"), "HeartbeatProvider must exist")
assert(fileExists("components/admin/LivePulseCard.tsx"), "LivePulseCard must exist")

// ═══════════════════════════════════════════════════════════════
// SECTION 2: Presence engine (lib/presence.ts)
// ═══════════════════════════════════════════════════════════════
console.log("SECTION 2: Presence engine")

const presence = readFile("lib/presence.ts")

assert(presence.includes("bc:presence:"), "Key prefix must be bc:presence:")
assert(presence.includes("PRESENCE_TTL_SECONDS = 60"), "TTL must be 60 seconds")
assert(presence.includes("setPresence"), "Must export setPresence")
assert(presence.includes("getOnlineUsers"), "Must export getOnlineUsers")
assert(presence.includes("getTotalKaryaCount"), "Must export getTotalKaryaCount")
assert(presence.includes("isUserOnline"), "Must export isUserOnline")
assert(presence.includes("removePresence"), "Must export removePresence")
assert(presence.includes("@upstash/redis"), "Must use Upstash Redis")
// Check privacy: presence stores role + coarse menu key, never identity/IP/full URL
assert(!presence.includes("email:") && !presence.includes("email ="), "Must not store email as data field")
assert(!presence.includes("ipAddress") && !presence.includes("ip_address"), "Must not store IP address")
assert(!presence.includes("pageUrl") && !presence.includes("currentUrl"), "Must not store full page URL")
assert(presence.includes("p?: string"), "Presence value may store coarse menu key")
assert(presence.includes("locations:"), "Presence aggregate must expose menu locations")
assert(presence.includes("r: \"GURU\"") || presence.includes("{ r: role }"), "Must store role via { r: role } pattern")
assert(presence.includes("isPresenceAvailable"), "Must export isPresenceAvailable")
assert(presence.includes("PresenceRole"), "Must define PresenceRole type")
assert(presence.includes("\"GURU\"") && presence.includes("\"MURID\"") && presence.includes("\"ADMIN\""), "Must support all three roles")

// Check fail-open pattern
assert(presence.includes("catch") && presence.includes("return false"), "setPresence must fail-open (return false on error)")
assert(presence.includes("return empty") || presence.includes("return { total: 0"), "getOnlineUsers must fail-open (return empty on error)")

// Check TTL constant
assert(presence.includes("ex: PRESENCE_TTL_SECONDS") || presence.includes("ex: 60"), "Redis SET must use TTL")

// ═══════════════════════════════════════════════════════════════
// SECTION 3: Heartbeat API
// ═══════════════════════════════════════════════════════════════
console.log("SECTION 3: Heartbeat API")

const heartbeat = readFile("app/api/presence/heartbeat/route.ts")

assert(heartbeat.includes("POST"), "Heartbeat must be POST")
assert(heartbeat.includes("getUser"), "Heartbeat must use getUser()")
assert(heartbeat.includes("setPresence"), "Heartbeat must call setPresence")
assert(heartbeat.includes("401") || heartbeat.includes("Unauthorized"), "Must return 401 for unauthenticated")
assert(heartbeat.includes("isFounder"), "Must derive role from user (isFounder)")
assert(heartbeat.includes("role === \"GURU\""), "Must derive role from user (GURU)")
assert(heartbeat.includes("request.json()"), "Heartbeat must read pathname telemetry body")
assert(heartbeat.includes("resolvePresenceLocation"), "Heartbeat must reduce pathname to a coarse menu bucket")
assert(!heartbeat.includes("x-forwarded"), "Must not forward/accept IP headers")
assert(heartbeat.includes("pathname"), "Heartbeat body must be limited to pathname telemetry")

// ═══════════════════════════════════════════════════════════════
// SECTION 4: Live analytics API
// ═══════════════════════════════════════════════════════════════
console.log("SECTION 4: Live analytics API")

const analytics = readFile("app/api/analytics/live/route.ts")

assert(analytics.includes("GET"), "Live analytics must be GET")
assert(analytics.includes("getUser"), "Must use getUser()")
assert(analytics.includes("isFounder"), "Must check isFounder")
assert(analytics.includes("ADMIN"), "Must allow ADMIN role")
assert(analytics.includes("403") || analytics.includes("Forbidden"), "Must return 403 for non-founder")
assert(analytics.includes("getOnlineUsers"), "Must call getOnlineUsers")
assert(analytics.includes("getTotalKaryaCount"), "Must call getTotalKaryaCount")
assert(analytics.includes("onlineUsers"), "Response must include onlineUsers")
assert(analytics.includes("onlineGuru"), "Response must include onlineGuru")
assert(analytics.includes("onlineMurid"), "Response must include onlineMurid")
assert(analytics.includes("totalKarya"), "Response must include totalKarya")
assert(analytics.includes("generatedAt"), "Response must include generatedAt")
assert(analytics.includes("presenceWindowSeconds"), "Response must include presenceWindowSeconds")
assert(analytics.includes("presenceAvailable"), "Response must include presenceAvailable")
assert(analytics.includes("onlineLocations"), "Response must include current menu distribution")
assert(analytics.includes("presenceAvailable: online.available"), "Must report actual Redis read health, not config-only availability")
assert(analytics.includes("force-dynamic"), "Must be force-dynamic")

// Must not expose user identities in analytics response
assert(!analytics.includes("getUsernames"), "Must not expose usernames")
assert(!analytics.includes("userIds"), "Must not expose user IDs list")
assert(!analytics.includes("emails:") && !analytics.includes("emails ="), "Must not expose emails data")
assert(!analytics.includes("IP addresses") || analytics.includes("Must not"), "Must not expose IP addresses")

// ═══════════════════════════════════════════════════════════════
// SECTION 5: HeartbeatProvider
// ═══════════════════════════════════════════════════════════════
console.log("SECTION 5: HeartbeatProvider")

const provider = readFile("components/providers/HeartbeatProvider.tsx")

assert(provider.includes("\"use client\""), "Must be client component")
assert(provider.includes("20_000") || provider.includes("20000") || provider.includes("20 * 1000"), "Heartbeat interval must be 20 seconds")
assert(provider.includes("visibilityState"), "Must respect document.visibilityState")
assert(provider.includes("visible"), "Must only send when visible")
assert(provider.includes("navigator.onLine"), "Must check online status")
assert(provider.includes("useUserStore"), "Must use Zustand store for user ID")
assert(provider.includes("/api/presence/heartbeat"), "Must call heartbeat endpoint")
assert(provider.includes("usePathname"), "Provider must track route changes")
assert(provider.includes("JSON.stringify({ pathname })"), "Provider must send current pathname")
assert(provider.includes("setInterval"), "Must use setInterval")
assert(provider.includes("clearInterval"), "Must clean up interval")
assert(provider.includes("catch"), "Must handle fetch errors gracefully")
assert(provider.includes("return null") || !provider.includes("return (") || provider.match(/return\s*\(\s*null\s*\)/), "Must not render any visible UI")
assert(provider.includes("userId"), "Must only heartbeat when user is authenticated")
assert(!provider.includes("localStorage"), "Must not use localStorage for presence")
assert(!provider.includes("WebSocket"), "Must not use WebSocket")
assert(!provider.includes("sessionStorage"), "Must not use sessionStorage for presence")

// ═══════════════════════════════════════════════════════════════
// SECTION 6: LivePulseCard
// ═══════════════════════════════════════════════════════════════
console.log("SECTION 6: LivePulseCard")

const card = readFile("components/admin/LivePulseCard.tsx")

assert(card.includes("\"use client\""), "Must be client component")
assert(card.includes("/api/analytics/live"), "Must fetch live analytics API")
assert(card.includes("15_000") || card.includes("15000") || card.includes("15 * 1000"), "Poll interval must be 15 seconds")
assert(card.includes("onlineUsers"), "Must display online users count")
assert(card.includes("onlineGuru"), "Must display guru count")
assert(card.includes("onlineMurid"), "Must display murid count")
assert(card.includes("onlineAdmin"), "Must display admin count")
assert(card.includes("onlineLocations"), "Must display active menu distribution")
assert(card.includes("MapPin"), "Must identify active menu section visually")
assert(card.includes("totalKarya"), "Must display total karya count")
assert(card.includes("animate-ping") || card.includes("pulse"), "Must have pulsing indicator")
assert(card.includes("setInterval"), "Must have auto-refresh")
assert(card.includes("clearInterval"), "Must clean up interval")
assert(card.includes("Gagal") || card.includes("error"), "Must have error state")
assert(card.includes("animate-pulse") || card.includes("skeleton"), "Must have loading skeleton")
assert(card.includes("TTL"), "Must show TTL info")
assert(card.includes("Live Pulse"), "Must have 'Live Pulse' heading")
assert(card.includes("Near-real-time"), "Must use 'Near-real-time' terminology")
assert(card.includes("presenceAvailable"), "Must handle presenceAvailable field")
assert(card.includes("Live Pulse tidak tersedia"), "Must show unavailable state when presenceAvailable=false")
assert(card.includes("WifiOff"), "Must import WifiOff icon for unavailable state")
assert(card.includes("detik lalu"), "Time label must use 'detik lalu' (not 'd lalu')")
assert(card.includes("detik"), "Footer must use 'detik' (not 'd')")

// Green indicator must be conditional on presenceAvailable
assert(card.includes("presenceOk"), "Indicator must be conditional on presenceAvailable")
assert(card.includes("bg-slate-400") || card.includes("bg-slate"), "Must have gray indicator for unavailable state")

// Card must not expose user identities
assert(!card.includes("getUsernames"), "Must not expose usernames")
assert(!card.includes("email:") && !card.includes("email ="), "Must not expose emails in data")

// Card must not have broken time labels
assert(!card.includes("}d lalu"), "Must not use 'd lalu' for seconds (should be 'detik lalu')")
assert(!card.includes("60d"), "Must not use '60d' for TTL (should be '60 detik')")

// ═══════════════════════════════════════════════════════════════
// SECTION 7: Provider wiring
// ═══════════════════════════════════════════════════════════════
console.log("SECTION 7: Provider wiring")

const providers = readFile("app/providers.tsx")
assert(providers.includes("HeartbeatProvider"), "providers.tsx must import HeartbeatProvider")
assert(providers.includes("<HeartbeatProvider"), "providers.tsx must render HeartbeatProvider")

// ═══════════════════════════════════════════════════════════════
// SECTION 8: Executive dashboard wiring
// ═══════════════════════════════════════════════════════════════
console.log("SECTION 8: Executive dashboard wiring")

const executive = readFile("app/(dashboard)/admin/executive/page.tsx")
assert(executive.includes("LivePulseCard"), "Executive page must import LivePulseCard")
assert(executive.includes("<LivePulseCard"), "Executive page must render LivePulseCard")

// ═══════════════════════════════════════════════════════════════
// SECTION 9: Privacy & security
// ═══════════════════════════════════════════════════════════════
console.log("SECTION 9: Privacy & security")

// No sensitive data in presence value
assert(!presence.includes("lastSeen"), "Presence value must not include lastSeen")
assert(!presence.includes("currentPage") && !presence.includes("pageUrl"), "Presence must not store raw/full current page")
assert(presence.includes("labelForPresenceLocation"), "Presence must resolve coarse menu labels centrally")
assert(!presence.includes("userAgent"), "Presence value must not include user agent")
assert(!presence.includes("session") || presence.includes("// session") || presence.includes("* session"), "Presence value must not include session info")

// Auth checks
assert(heartbeat.includes("401") || heartbeat.includes("Unauthorized"), "Heartbeat requires auth")
assert(analytics.includes("403") || analytics.includes("Forbidden"), "Live analytics requires auth (founder)")

// No IP tracking in any file
const allFiles = [presence, heartbeat, analytics, provider, card]
for (const file of allFiles) {
  assert(!file.includes("x-real-ip") && !file.includes("x-forwarded-for"), "Must not read IP headers")
}

// ═══════════════════════════════════════════════════════════════
// SECTION 10: Design spec compliance
// ═══════════════════════════════════════════════════════════════
console.log("SECTION 10: Design spec compliance")

// TTL = 60 seconds (matches heartbeat 20s × 3 = 60s)
assert(presence.includes("60"), "TTL must be 60 seconds per spec")

// Heartbeat interval = 20 seconds (matches spec)
assert(
  provider.includes("20_000") || provider.includes("20000"),
  "Client heartbeat must be 20 seconds per spec"
)

// Aggregation = from Redis (not DB polling)
assert(analytics.includes("getOnlineUsers"), "Must aggregate from Redis, not DB")
assert(!analytics.includes("lastActiveAt") || analytics.includes("presence"), "Must not use DB lastActiveAt for live count")

// Karya count = from DB (canonical source)
assert(analytics.includes("getTotalKaryaCount"), "Karya count must be from DB")
assert(analytics.includes("studentKarya") || presence.includes("studentKarya"), "Karya count must use StudentKarya model")

// No new dependencies added by Live Pulse
const packageJson = JSON.parse(readFile("package.json"))
const newDeps = ["pusher", "ably", "ioredis"]
for (const dep of newDeps) {
  assert(
    !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep],
    `Must not add ${dep} as dependency`
  )
}
// socket.io is pre-existing (game server), not added by Live Pulse
assert(!!packageJson.dependencies?.["socket.io"], "Pre-existing socket.io (game server) is acceptable")

// No schema changes — presence is Redis-only, not DB
const schema = readFile("prisma/schema.prisma")
// lastSeenAt may exist on non-User models (e.g. AgentTelegramBinding) — that's fine
// The rule is: User model must NOT have lastSeenAt/isOnline/onlineStatus
const userModelMatch = schema.match(/model User \{[\s\S]*?(?=\nmodel )/)
const userModel = userModelMatch ? userModelMatch[0] : ""
assert(!userModel.includes("lastSeenAt"), "User model must not add lastSeenAt")
assert(!userModel.includes("isOnline"), "User model must not add isOnline")
assert(!userModel.includes("onlineStatus"), "User model must not add onlineStatus")

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════
console.log("\n" + "═".repeat(60))
console.log(`RESULTS: ${passed} passed, ${failed} failed`)
if (failures.length > 0) {
  console.log("\nFAILURES:")
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`))
}
console.log("═".repeat(60))

process.exit(failed > 0 ? 1 : 0)
