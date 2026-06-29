import fs from "fs"

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

async function main() {
  console.log("\n📋 BIGT MENU TEST")
  console.log("=".repeat(60))

  // BIGT page files
  console.log("\n── Page Existence ──")
  test("/murid/bigt page exists", () => fs.existsSync("app/(dashboard)/murid/bigt/page.tsx"))
  test("/guru/bigt page exists", () => fs.existsSync("app/(dashboard)/guru/bigt/page.tsx"))

  // Murid sidebar — check BOTH layout (production) and standalone component
  console.log("\n── Murid Sidebar BIGT ──")
  const muridLayout = fs.readFileSync("app/(dashboard)/murid/layout.tsx", "utf-8")
  test("BIGT label in MuridLayout (production)", () => muridLayout.includes('"BIGT"'))
  test("BIGT href /murid/bigt in MuridLayout", () => muridLayout.includes('/murid/bigt"'))
  const muridSidebar = fs.readFileSync("components/dashboard/MuridSidebar.tsx", "utf-8")
  test("BIGT label in MuridSidebar (standalone)", () => muridSidebar.includes('"BIGT"'))
  test("BIGT href /murid/bigt in MuridSidebar", () => muridSidebar.includes('"/murid/bigt"') || muridSidebar.includes("'/murid/bigt'"))

  // Guru sidebar — check BOTH layout (production) and standalone component
  console.log("\n── Guru Sidebar BIGT ──")
  const guruLayout = fs.readFileSync("app/(dashboard)/guru/layout.tsx", "utf-8")
  test("BIGT label in GuruLayout (production)", () => guruLayout.includes('"BIGT"'))
  test("BIGT href /guru/bigt in GuruLayout", () => guruLayout.includes('/guru/bigt"'))
  const guruSidebar = fs.readFileSync("components/dashboard/GuruSidebar.tsx", "utf-8")
  test("BIGT label in GuruSidebar (standalone)", () => guruSidebar.includes('"BIGT"'))
  test("BIGT href /guru/bigt in GuruSidebar", () => guruSidebar.includes('"/guru/bigt"') || guruSidebar.includes("'/guru/bigt'"))

  // BIGT page content
  console.log("\n── BIGT Page Content ──")
  const bigtMurid = fs.readFileSync("app/(dashboard)/murid/bigt/page.tsx", "utf-8")
  const bigtGuru = fs.readFileSync("app/(dashboard)/guru/bigt/page.tsx", "utf-8")
  test("Murid BIGT page imports BigtInfoPage", () => bigtMurid.includes("BigtInfoPage"))
  test("Guru BIGT page imports BigtInfoPage", () => bigtGuru.includes("BigtInfoPage"))
  test("Murid BIGT page passes role=murid", () => bigtMurid.includes('role="murid"'))
  test("Guru BIGT page passes role=guru", () => bigtGuru.includes('role="guru"'))

  // BigtInfoPage component
  console.log("\n── BigtInfoPage Component ──")
  const bigtComp = fs.readFileSync("components/bigt/BigtInfoPage.tsx", "utf-8")
  test("BIGT external link to bahasacerdas.site", () => bigtComp.includes("https://www.bahasacerdas.site"))
  test("BIGT link target _blank", () => bigtComp.includes('target="_blank"'))
  test("BIGT link rel noopener noreferrer", () => bigtComp.includes('rel="noopener noreferrer"'))
  test("BIGT has ExternalLink icon", () => bigtComp.includes("ExternalLink"))
  test("BIGT no iframe", () => !bigtComp.includes("iframe"))
  test("BIGT mentions BahasaCerdas vs BIGT perbedaan", () => bigtComp.includes("Perbedaan"))
  test("BIGT has Buka BIGT button text", () => bigtComp.includes("Buka BIGT"))
  test("BIGT does not link auth/session", () => !bigtComp.includes("supabase") && !bigtComp.includes("session") && !bigtComp.includes("auth"))

  // ── Summary ──
  console.log(`\n${"=".repeat(60)}`)
  console.log(`📊 RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`)
  if (failed > 0) process.exit(1)
  console.log("✅ ALL BIGT TESTS PASSED\n")
}

main().catch(e => {
  console.error("❌ Test crashed:", e.message)
  process.exit(1)
})
