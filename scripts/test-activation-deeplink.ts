/**
 * scripts/test-activation-deeplink.ts — Q1.1 Classroom Activation Deep-Link
 *
 * Tests:
 *  1. buildClassJoinUrl — deep-link URL generation
 *  2. buildShareMessage — share message content
 *  3. Onboarding page — deep-link import, share buttons
 *  4. Gabung-kelas page — searchParams pre-fill
 *  5. ShareKelasModal — class_invite_shared event
 *  6. Product event constants — new events registered
 *  7. Telemetry wiring — correct events fired
 *
 * Usage: npx tsx scripts/test-activation-deeplink.ts
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

function readFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf-8")
}

function fileExists(path: string): boolean {
  return existsSync(join(process.cwd(), path))
}

// ═══════════════════════════════════════════════════════════════
// SECTION 1: buildClassJoinUrl
// ═══════════════════════════════════════════════════════════════

const gcsCopy = readFile("lib/guru/gcs-copy.ts")

assert(gcsCopy.includes("buildClassJoinUrl"), "buildClassJoinUrl exists")
assert(gcsCopy.includes("gabung-kelas?kode="), "buildClassJoinUrl uses ?kode= query param")
assert(
  gcsCopy.includes("encodeURIComponent(accessCode)"),
  "buildClassJoinUrl encodes access code"
)

// ═══════════════════════════════════════════════════════════════
// SECTION 2: buildShareMessage — no commission mention
// ═══════════════════════════════════════════════════════════════

assert(gcsCopy.includes("buildShareMessage"), "buildShareMessage exists")
assert(
  gcsCopy.includes("bergabung ke kelas"),
  "buildShareMessage includes class join instruction"
)
assert(
  gcsCopy.includes("Gunakan kode"),
  "buildShareMessage includes access code prompt"
)

// ═══════════════════════════════════════════════════════════════
// SECTION 3: Onboarding page — deep-link support
// ═══════════════════════════════════════════════════════════════

const onboarding = readFile("app/(dashboard)/guru/onboarding/page.tsx")

assert(
  onboarding.includes("buildClassJoinUrl"),
  "Onboarding imports buildClassJoinUrl"
)
assert(
  onboarding.includes("buildShareMessage"),
  "Onboarding imports buildShareMessage"
)
assert(
  onboarding.includes('class_invite_shared'),
  "Onboarding tracks class_invite_shared event"
)
assert(
  onboarding.includes("Salin Tautan Undangan"),
  "Onboarding has deep-link copy button"
)
assert(
  onboarding.includes("handleCopyLink"),
  "Onboarding has handleCopyLink function"
)
assert(
  onboarding.includes("Salin Kode Saja"),
  "Onboarding has fallback code-only copy"
)
assert(
  onboarding.includes("Link2"),
  "Onboarding imports Link2 icon for deep-link button"
)
assert(
  onboarding.includes('?kode=${createdClass.accessCode}'),
  "Milestone step links to deep-link URL"
)

// ═══════════════════════════════════════════════════════════════
// SECTION 4: Gabung-kelas page — ?kode= pre-fill
// ═══════════════════════════════════════════════════════════════

const gabungKelas = readFile("app/(dashboard)/murid/gabung-kelas/page.tsx")

assert(
  gabungKelas.includes("useSearchParams"),
  "Gabung-kelas imports useSearchParams"
)
assert(
  gabungKelas.includes('searchParams.get("kode")'),
  "Gabung-kelas reads ?kode= from URL"
)
assert(
  gabungKelas.includes('class_invite_opened'),
  "Gabung-kelas tracks class_invite_opened event on deep-link"
)
assert(
  gabungKelas.includes("toUpperCase"),
  "Gabung-kelas normalizes code to uppercase"
)

// ═══════════════════════════════════════════════════════════════
// SECTION 5: ShareKelasModal — telemetry
// ═══════════════════════════════════════════════════════════════

const shareModal = readFile("components/guru/gcs/ShareKelasModal.tsx")

assert(
  shareModal.includes('class_invite_shared'),
  "ShareKelasModal tracks class_invite_shared"
)
assert(
  shareModal.includes('flow: "kelasku"'),
  "ShareKelasModal sets flow=kelasku in event"
)

// ═══════════════════════════════════════════════════════════════
// SECTION 6: Product event constants
// ═══════════════════════════════════════════════════════════════

const eventStore = readFile("lib/analytics/product-event-store.ts")

assert(
  eventStore.includes("class_invite_shared"),
  "Product event constant CLASS_INVITE_SHARED defined"
)
assert(
  eventStore.includes("class_invite_opened"),
  "Product event constant CLASS_INVITE_OPENED defined"
)

// ═══════════════════════════════════════════════════════════════
// SECTION 7: Security — no bypasses
// ═══════════════════════════════════════════════════════════════

const groupJoinApi = readFile("app/api/group/join/route.ts")

assert(
  groupJoinApi.includes("toUpperCase"),
  "Join API normalizes code to uppercase (security)"
)
assert(
  groupJoinApi.includes("isActive: true"),
  "Join API checks class isActive"
)
assert(
  groupJoinApi.includes("sudah terdaftar"),
  "Join API checks duplicate membership"
)
assert(
  groupJoinApi.includes("Kode tidak valid"),
  "Join API rejects invalid codes"
)

// ═══════════════════════════════════════════════════════════════
// SECTION 8: Onboarding regression — existing flows preserved
// ═══════════════════════════════════════════════════════════════

assert(onboarding.includes("handleSkipToClass"), "Onboarding preserves skip-to-class flow")
assert(onboarding.includes("handleFinish"), "Onboarding preserves finish flow")
assert(onboarding.includes("/api/user/onboarded"), "Onboarding calls onboarded API")
assert(onboarding.includes("Kelasku"), "Onboarding navigates to Kelasku")

// ═══════════════════════════════════════════════════════════════
// SECTION 9: Telemetry naming conventions
// ═══════════════════════════════════════════════════════════════

assert(
  onboarding.includes('flow: "onboarding"'),
  "Onboarding event uses flow=onboarding"
)
assert(
  shareModal.includes('method: "code"') || shareModal.includes('method: "link"') || shareModal.includes('method: "native"'),
  "ShareKelasModal event includes method"
)

// ═══════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════

console.log("\n" + "═".repeat(60))
console.log("  Q1.1 CLASSROOM ACTIVATION DEEP-LINK TEST SUITE")
console.log("═".repeat(60))
console.log(`  Passed: ${passed}`)
console.log(`  Failed: ${failed}`)
console.log("═".repeat(60))

if (failed > 0) {
  console.log("\n  FAILURES:")
  failures.forEach((f, i) => console.log(`    ${i + 1}. ${f}`))
  process.exit(1)
}

console.log("  All tests passed!")
process.exit(0)
