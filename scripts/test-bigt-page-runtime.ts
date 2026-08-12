import { readFileSync, existsSync } from "fs"

let passed = 0
let failed = 0

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      console.log(`  ✅ ${name}`)
      passed++
    } else {
      console.log(`  ❌ ${name}`)
      failed++
    }
  } catch (e: any) {
    console.log(`  ❌ ${name} — ${e.message}`)
    failed++
  }
}

function assertNoContent(file: string, patterns: string[], label: string) {
  const content = readFileSync(file, "utf-8")
  for (const p of patterns) {
    test(`${label}: no "${p}"`, () => !content.includes(p))
  }
}

function assertHasContent(file: string, patterns: string[], label: string) {
  const content = readFileSync(file, "utf-8")
  for (const p of patterns) {
    test(`${label}: has "${p}"`, () => content.includes(p))
  }
}

async function main() {
  console.log("\n📋 BIGT PAGE RUNTIME TEST")
  console.log("=".repeat(60))

  // 1. Page file existence
  console.log("\n── Page Existence ──")
  const guruBigt = "app/(dashboard)/guru/bigt/page.tsx"
  const muridBigt = "app/(dashboard)/murid/bigt/page.tsx"
  test(`${guruBigt} exists`, () => existsSync(guruBigt))
  test(`${muridBigt} exists`, () => existsSync(muridBigt))

  // 2. Guru BIGT page — no auth/db leak
  console.log("\n── Guru BIGT Page Runtime Safety ──")
  assertNoContent(guruBigt, ["import.*createClient", "import.*@/lib/db", "db.", "force-dynamic", "supabase.auth", "redirect"], "Guru BIGT page")
  assertHasContent(guruBigt, ['BigtInfoPage', 'role="guru"'], "Guru BIGT page")

  // 3. Murid BIGT page — no auth/db leak
  console.log("\n── Murid BIGT Page Runtime Safety ──")
  assertNoContent(muridBigt, ["import.*createClient", "import.*@/lib/db", "db.", "force-dynamic", "supabase.auth", "redirect"], "Murid BIGT page")
  assertHasContent(muridBigt, ['BigtInfoPage', 'role="murid"'], "Murid BIGT page")

  // 4. BigtInfoPage component — server-safe / no browser APIs
  console.log("\n── BigtInfoPage Component Safety ──")
  const bigtComp = readFileSync("components/bigt/BigtInfoPage.tsx", "utf-8")
  test("no window usage", () => !bigtComp.includes("window."))
  test("no document usage", () => !bigtComp.includes("document."))
  test("no localStorage usage", () => !bigtComp.includes("localStorage"))
  test("no sessionStorage usage", () => !bigtComp.includes("sessionStorage"))
  test("no fetch call", () => !bigtComp.match(/fetch\s*\(/))
  test("no axios import", () => !bigtComp.includes("axios"))
  test("no DB query", () => !bigtComp.includes("prisma") && !bigtComp.includes("db."))
  test("no Supabase import", () => !bigtComp.includes("supabase"))
  test("no useEffect", () => !bigtComp.includes("useEffect"))
  test("no useState", () => !bigtComp.includes("useState"))
  test("no useRouter", () => !bigtComp.includes("useRouter"))
  test("has external link target _blank", () => bigtComp.includes('target="_blank"'))
  test("has rel noopener noreferrer", () => bigtComp.includes('rel="noopener noreferrer"'))
  test("has correct external URL", () => bigtComp.includes("https://www.bahasacerdas.site"))
  test("no iframe", () => !bigtComp.includes("iframe"))

  // 5. Sidebar link structure — no nested interactive elements
  console.log("\n── Sidebar Link Structure ──")
  for (const [label, file] of [
    ["Guru layout", "app/(dashboard)/guru/layout.tsx"],
    ["Murid layout", "app/(dashboard)/murid/layout.tsx"],
  ] as [string, string][]) {
    const content = readFileSync(file, "utf-8")
    test(`${label}: uses <Link> for navigation items`, () => {
      const navSection = content
      const linkCount = (navSection.match(/<Link href=/g) || []).length
      const nestedButtonCount = (navSection.match(/<button>.*Link.*<\/button>/gs) || []).length +
        (navSection.match(/Link.*button.*>/gs) || []).length
      return linkCount > 0 && nestedButtonCount === 0
    })
    test(`${label}: no button wrapping Link`, () => !/button[^>]*>[\s\S]*?<Link/.test(content))
    test(`${label}: no Link wrapping button`, () => !/<Link[^>]*>[\s\S]*?<button/.test(content))
    test(`${label}: contains /guru/bigt or /murid/bigt href`, () => {
      const target = label.includes("Guru") ? "/guru/bigt" : "/murid/bigt"
      const expectPresent = label.includes("Guru")
      // Student Experience Consolidation: /murid/bigt moved OUT of sidebar to home sections
      return expectPresent ? content.includes(target) : !content.includes(target)
    })
  }

  // 6. Sidebar no "Sertifikat" label
  console.log("\n── Sidebar Label Clean ──")
  for (const file of ["app/(dashboard)/guru/layout.tsx", "app/(dashboard)/murid/layout.tsx"]) {
    const content = readFileSync(file, "utf-8")
    test(`${file}: no "Sertifikat" label`, () => !content.includes("Sertifikat"))
  }

  // 7. Simulasi UKBI/TKA links — guru in sidebar, murid on home sections (STEP 4)
  console.log("\n── Simulation Links Present ──")
  const guruLayout = readFileSync("app/(dashboard)/guru/layout.tsx", "utf-8")
  test("Guru layout has Simulasi UKBI link", () => guruLayout.includes('/guru/simulasi/ukbi"'))
  test("Guru layout has Simulasi TKA link", () => guruLayout.includes('/guru/simulasi/tka"'))
  const simulasiSection = readFileSync("components/student-home/SimulasiUjianSection.tsx", "utf-8")
  test("Home SimulasiUjianSection has Simulasi UKBI link", () => simulasiSection.includes('/murid/simulasi/ukbi"'))
  test("Home SimulasiUjianSection has Simulasi TKA link", () => simulasiSection.includes('/murid/simulasi/tka"'))

  // ── Summary ──
  console.log(`\n${"=".repeat(60)}`)
  console.log(`📊 RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`)
  if (failed > 0) process.exit(1)
  console.log("✅ ALL BIGT PAGE RUNTIME TESTS PASSED\n")
}

main().catch(e => {
  console.error("❌ Test crashed:", e.message)
  process.exit(1)
})
