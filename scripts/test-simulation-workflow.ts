import fs from "fs"
import path from "path"

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

function hasLabel(content: string, label: string): boolean {
  return content.includes(`"${label}"`) || content.includes(`'${label}'`)
}

function hasHref(content: string, href: string): boolean {
  return content.includes(`href: "${href}"`) || content.includes(`href="${href}"`)
}

function hasRoute(content: string, route: string): boolean {
  return content.includes(route)
}

async function main() {
  console.log("\n📋 SIMULATION WORKFLOW TEST")
  console.log("=".repeat(60))

  // ── 1. MuridSidebar ──
  console.log("\n── MuridSidebar ──")
  const muridSidebar = fs.readFileSync("components/dashboard/MuridSidebar.tsx", "utf-8")

  test("Menu Simulasi UKBI exists", () => hasLabel(muridSidebar, "Simulasi UKBI"))
  test("Menu Simulasi TKA exists", () => hasLabel(muridSidebar, "Simulasi TKA"))
  test("Menu Dokumen Hasil Latihan exists", () => hasLabel(muridSidebar, "Dokumen Hasil Latihan"))
  test("Menu BIGT exists", () => hasLabel(muridSidebar, "BIGT"))
  test("Route /murid/simulasi/ukbi exists", () => hasHref(muridSidebar, "/murid/simulasi/ukbi"))
  test("Route /murid/simulasi/tka exists", () => hasHref(muridSidebar, "/murid/simulasi/tka"))
  test("Route /murid/dokumen-latihan exists (not /sertifikat)", () => hasHref(muridSidebar, "/murid/dokumen-latihan"))
  test("Route /murid/bigt exists", () => hasHref(muridSidebar, "/murid/bigt"))
  test("No route /murid/sertifikat in sidebar", () => !hasHref(muridSidebar, "/murid/sertifikat"))

  // ── 2. GuruSidebar ──
  console.log("\n── GuruSidebar ──")
  const guruSidebar = fs.readFileSync("components/dashboard/GuruSidebar.tsx", "utf-8")

  test("Menu Simulasi UKBI exists", () => hasLabel(guruSidebar, "Simulasi UKBI"))
  test("Menu Simulasi TKA exists", () => hasLabel(guruSidebar, "Simulasi TKA"))
  test("Menu Hasil Murid exists", () => hasLabel(guruSidebar, "Hasil Murid"))
  test("Menu Dokumen Latihan Murid exists", () => hasLabel(guruSidebar, "Dokumen Latihan Murid"))
  test("Menu BIGT exists", () => hasLabel(guruSidebar, "BIGT"))
  test("Route /guru/simulasi/ukbi exists", () => hasHref(guruSidebar, "/guru/simulasi/ukbi"))
  test("Route /guru/simulasi/tka exists", () => hasHref(guruSidebar, "/guru/simulasi/tka"))
  test("Route /guru/hasil-simulasi exists", () => hasHref(guruSidebar, "/guru/hasil-simulasi"))
  test("Route /guru/dokumen-latihan exists (not /sertifikat)", () => hasHref(guruSidebar, "/guru/dokumen-latihan"))
  test("Route /guru/bigt exists", () => hasHref(guruSidebar, "/guru/bigt"))
  test("No Sertifikat submenu in Kompetensi section", () => !guruSidebar.includes('"Sertifikat"') && !guruSidebar.includes("'Sertifikat'"))
  test("No route /guru/sertifikat in sidebar", () => !hasHref(guruSidebar, "/guru/sertifikat"))

  // ── 3. BIGT Page ──
  console.log("\n── BIGT Pages ──")
  const bigtComponent = fs.readFileSync("components/bigt/BigtInfoPage.tsx", "utf-8")

  test("BIGT page has link to bahasacerdas.site", () => bigtComponent.includes("https://www.bahasacerdas.site"))
  test("BIGT link target _blank", () => bigtComponent.includes('target="_blank"'))
  test("BIGT link rel noopener noreferrer", () => bigtComponent.includes('rel="noopener noreferrer"'))
  test("BIGT page has ExternalLink icon", () => bigtComponent.includes("ExternalLink"))
  test("BIGT page explains perbedaan BC vs BIGT", () => bigtComponent.includes("Perbedaan BahasaCerdas vs BIGT"))
  test("BIGT page does not iframe", () => !bigtComponent.includes("iframe") && !bigtComponent.includes("<iframe"))
  test("BIGT murid page exists", () => fs.existsSync("app/(dashboard)/murid/bigt/page.tsx"))
  test("BIGT guru page exists", () => fs.existsSync("app/(dashboard)/guru/bigt/page.tsx"))

  // ── 4. Terminology check ──
  console.log("\n── Terminology ──")
  const certPreview = fs.readFileSync("components/kompetensi/CertificatePreview.tsx", "utf-8")
  const guruCertPreview = fs.readFileSync("components/kompetensi/GuruCertificatePreview.tsx", "utf-8")
  const muridSertifikat = fs.readFileSync("app/(dashboard)/murid/dokumen-latihan/page.tsx", "utf-8")
  const guruSertifikat = fs.readFileSync("app/(dashboard)/guru/dokumen-latihan/page.tsx", "utf-8")

  test('CertificatePreview uses "Dokumen Hasil Latihan"', () => certPreview.includes("Dokumen Hasil Latihan"))
  test('GuruCertificatePreview uses "Dokumen Hasil Latihan"', () => guruCertPreview.includes("Dokumen Hasil Latihan"))
  test('Murid page uses "Dokumen Hasil Latihan"', () => muridSertifikat.includes("Dokumen Hasil Latihan"))
  test('Guru page uses "Dokumen Latihan Murid"', () => guruSertifikat.includes("Dokumen Latihan Murid"))
  test("CertificatePreview does not say 'Sertifikat resmi'", () => !certPreview.includes("sertifikat resmi") && !certPreview.includes("Sertifikat resmi"))
  test("CertificatePreview has disclaimer", () => certPreview.includes("bukan sertifikat resmi"))
  test("GuruCertificatePreview has disclaimer", () => guruCertPreview.includes("bukan sertifikat resmi"))
  test("Murid dokumen page has disclaimer", () => muridSertifikat.includes("bukan sertifikat resmi"))
  test("Guru dokumen page has disclaimer", () => guruSertifikat.includes("bukan sertifikat resmi"))

  // ── 5. Route check ──
  console.log("\n── Routes ──")
  test("/murid/simulasi/ukbi page exists", () => fs.existsSync("app/(dashboard)/murid/simulasi/ukbi/page.tsx"))
  test("/murid/simulasi/tka page exists", () => fs.existsSync("app/(dashboard)/murid/simulasi/tka/page.tsx"))
  test("/murid/dokumen-latihan page exists", () => fs.existsSync("app/(dashboard)/murid/dokumen-latihan/page.tsx"))
  test("/murid/bigt page exists", () => fs.existsSync("app/(dashboard)/murid/bigt/page.tsx"))
  test("/guru/simulasi/ukbi page exists", () => fs.existsSync("app/(dashboard)/guru/simulasi/ukbi/page.tsx"))
  test("/guru/simulasi/tka page exists", () => fs.existsSync("app/(dashboard)/guru/simulasi/tka/page.tsx"))
  test("/guru/hasil-simulasi page exists", () => fs.existsSync("app/(dashboard)/guru/hasil-simulasi/page.tsx"))
  test("/guru/dokumen-latihan page exists", () => fs.existsSync("app/(dashboard)/guru/dokumen-latihan/page.tsx"))
  test("/guru/bigt page exists", () => fs.existsSync("app/(dashboard)/guru/bigt/page.tsx"))
  test("/murid/sertifikat exists (redirect)", () => fs.existsSync("app/(dashboard)/murid/sertifikat/page.tsx"))
  test("/guru/sertifikat exists (redirect)", () => fs.existsSync("app/(dashboard)/guru/sertifikat/page.tsx"))
  test("/murid/sertifikat redirects to /dokumen-latihan", () => muridSertifikatReexports())
  test("/guru/sertifikat redirects to /dokumen-latihan", () => guruSertifikatReexports())

  // ── 6. Helper Library ──
  console.log("\n── Helper Library ──")
  test("get-simulation-packages.ts exists", () => fs.existsSync("lib/kompetensi/get-simulation-packages.ts"))
  test("getUKBIPackages() exists", () => getSimulPackages().includes("getUKBIPackages"))
  test("getTKAPackages() exists", () => getSimulPackages().includes("getTKAPackages"))
  test("SimulationTrack interface exists", () => getSimulPackages().includes("SimulationTrack"))

  // ── Summary ──
  console.log(`\n${"=".repeat(60)}`)
  console.log(`📊 RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`)
  if (failed > 0) process.exit(1)
  console.log("✅ ALL SIMULATION WORKFLOW TESTS PASSED\n")
}

function muridSertifikatReexports(): boolean {
  const content = fs.readFileSync("app/(dashboard)/murid/sertifikat/page.tsx", "utf-8")
  return content.includes('redirect("/murid/dokumen-latihan")')
}

function guruSertifikatReexports(): boolean {
  const content = fs.readFileSync("app/(dashboard)/guru/sertifikat/page.tsx", "utf-8")
  return content.includes('redirect("/guru/dokumen-latihan")')
}

function getSimulPackages(): string {
  return fs.readFileSync("lib/kompetensi/get-simulation-packages.ts", "utf-8")
}

main().catch(e => {
  console.error("❌ Test crashed:", e.message)
  process.exit(1)
})
