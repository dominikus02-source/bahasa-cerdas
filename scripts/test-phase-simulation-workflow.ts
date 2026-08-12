/**
 * Phase Simulation Workflow 1 — QA Tests
 *
 * Tests:
 * 1. Murid sidebar (layout + mobile nav) is the 6-item shell; Simulasi/UKBI/TKA/BIGT/Dokumen
 *    moved OUT of sidebar into home sections (Student Experience Consolidation STEP 4):
 *    SimulasiUjianSection (Simulasi UKBI, Simulasi TKA, BIGT, Hasil Latihan) +
 *    RuangBelajarSection (gabung-kelas, tugasku)
 * 2. GuruSidebar has menu items: Simulasi UKBI, Simulasi TKA, Hasil Murid, Dokumen Latihan Murid, BIGT
 * 3. BIGT page has external link to https://www.bahasacerdas.site with target blank + noopener noreferrer
 * 4. Certificate has disclaimer (not official UKBI/TKA)
 * 5. Certificate does not expose correctAnswer/answerKey/jawaban
 *
 * Run: npx tsx scripts/test-phase-simulation-workflow.ts
 */

import { readFileSync, existsSync } from "fs"
import { join } from "path"

const RED = "\x1b[31m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const RESET = "\x1b[0m"

let passed = 0
let failed = 0
const errors: string[] = []

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++
    console.log(`  ${GREEN}✓${RESET} ${label}`)
  } else {
    failed++
    const msg = `✗ ${label}`
    errors.push(msg)
    console.log(`  ${RED}${msg}${RESET}`)
  }
}

function readFile(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf-8")
}

function assertContains(filePath: string, pattern: string, label: string) {
  const content = readFile(filePath)
  assert(content.includes(pattern), label)
}

function assertNotContains(filePath: string, pattern: string, label: string) {
  const content = readFile(filePath)
  assert(!content.includes(pattern), label)
}

async function main() {
  console.log(`\n${YELLOW}=== Phase Simulation Workflow 1 — QA Tests ===${RESET}\n`)

  // 1. Read MuridLayout (production sidebar) — Student Experience Consolidation STEP 4
  console.log(`\n${YELLOW}--- Murid Layout (Production Sidebar) ---${RESET}`)
  assertNotContains("app/(dashboard)/murid/layout.tsx", "Simulasi UKBI", "MuridLayout no 'Simulasi UKBI'")
  assertNotContains("app/(dashboard)/murid/layout.tsx", "Simulasi TKA", "MuridLayout no 'Simulasi TKA'")
  assertNotContains("app/(dashboard)/murid/layout.tsx", "Dokumen Hasil Latihan", "MuridLayout no 'Dokumen Hasil Latihan'")
  assertNotContains("app/(dashboard)/murid/layout.tsx", "BIGT", "MuridLayout no 'BIGT'")
  assertNotContains("app/(dashboard)/murid/layout.tsx", "/murid/simulasi/ukbi", "MuridLayout no /murid/simulasi/ukbi")
  assertNotContains("app/(dashboard)/murid/layout.tsx", "/murid/simulasi/tka", "MuridLayout no /murid/simulasi/tka")
  assertNotContains("app/(dashboard)/murid/layout.tsx", "/murid/dokumen-latihan", "MuridLayout no /murid/dokumen-latihan")
  assertNotContains("app/(dashboard)/murid/layout.tsx", "/murid/bigt", "MuridLayout no /murid/bigt")
  assertNotContains("app/(dashboard)/murid/layout.tsx", "/murid/gabung-kelas", "MuridLayout no /murid/gabung-kelas")
  assertNotContains("app/(dashboard)/murid/layout.tsx", "/arena/toko-koin", "MuridLayout no /arena/toko-koin")
  assertContains("app/(dashboard)/murid/layout.tsx", 'href="/murid/beranda"', "MuridLayout links to /murid/beranda")
  assertContains("app/(dashboard)/murid/layout.tsx", 'href="/murid/profile"', "MuridLayout links to /murid/profile")
  assertContains("app/(dashboard)/murid/layout.tsx", 'href="/arena"', "MuridLayout links to /arena")
  assertContains("app/(dashboard)/murid/layout.tsx", 'href="/murid/karya"', "MuridLayout links to /murid/karya")
  assertContains("app/(dashboard)/murid/layout.tsx", 'href="/arena/chat"', "MuridLayout links to /arena/chat")
  assertContains("app/(dashboard)/murid/layout.tsx", 'href="/murid/pengaturan"', "MuridLayout links to /murid/pengaturan")
  assertNotContains("app/(dashboard)/murid/layout.tsx", 'label="Sertifikat"', "MuridLayout no 'Sertifikat' label")

  // Also check standalone MuridSidebar component (mobile nav drawer)
  console.log(`\n${YELLOW}--- MuridSidebar (Standalone) ---${RESET}`)
  assertNotContains("components/dashboard/MuridMobileNav.tsx", "Simulasi UKBI", "MuridNav no 'Simulasi UKBI'")
  assertNotContains("components/dashboard/MuridMobileNav.tsx", "Simulasi TKA", "MuridNav no 'Simulasi TKA'")
  assertNotContains("components/dashboard/MuridMobileNav.tsx", "Dokumen Hasil Latihan", "MuridNav no 'Dokumen Hasil Latihan'")
  assertNotContains("components/dashboard/MuridMobileNav.tsx", "BIGT", "MuridNav no 'BIGT'")
  assertNotContains("components/dashboard/MuridMobileNav.tsx", "/murid/simulasi/ukbi", "MuridNav no /murid/simulasi/ukbi")
  assertNotContains("components/dashboard/MuridMobileNav.tsx", "/murid/simulasi/tka", "MuridNav no /murid/simulasi/tka")
  assertNotContains("components/dashboard/MuridMobileNav.tsx", "/murid/dokumen-latihan", "MuridNav no /murid/dokumen-latihan")
  assertNotContains("components/dashboard/MuridMobileNav.tsx", "/murid/bigt", "MuridNav no /murid/bigt")
  assertContains("components/dashboard/MuridMobileNav.tsx", 'href: "/murid/beranda"', "MuridNav links to /murid/beranda")
  assertContains("components/dashboard/MuridMobileNav.tsx", 'href: "/murid/profile"', "MuridNav links to /murid/profile")
  assertContains("components/dashboard/MuridMobileNav.tsx", 'href: "/arena"', "MuridNav links to /arena")
  assertContains("components/dashboard/MuridMobileNav.tsx", 'href: "/murid/karya"', "MuridNav links to /murid/karya")
  assertContains("components/dashboard/MuridMobileNav.tsx", 'href: "/arena/chat"', "MuridNav links to /arena/chat")
  assertContains("components/dashboard/MuridMobileNav.tsx", 'href: "/murid/pengaturan"', "MuridNav links to /murid/pengaturan")

  // Simulation menu now lives on the home page (Student Experience Consolidation STEP 4)
  console.log(`\n${YELLOW}--- Murid Home Sections (Simulasi & Ruang Belajar) ---${RESET}`)
  assertContains("components/student-home/SimulasiUjianSection.tsx", "Simulasi UKBI", "SimulasiUjianSection has 'Simulasi UKBI'")
  assertContains("components/student-home/SimulasiUjianSection.tsx", "Simulasi TKA", "SimulasiUjianSection has 'Simulasi TKA'")
  assertContains("components/student-home/SimulasiUjianSection.tsx", "BIGT", "SimulasiUjianSection has 'BIGT'")
  assertContains("components/student-home/SimulasiUjianSection.tsx", "Hasil Latihan", "SimulasiUjianSection has 'Hasil Latihan'")
  assertContains("components/student-home/SimulasiUjianSection.tsx", "/murid/simulasi/ukbi", "SimulasiUjianSection links to /murid/simulasi/ukbi")
  assertContains("components/student-home/SimulasiUjianSection.tsx", "/murid/simulasi/tka", "SimulasiUjianSection links to /murid/simulasi/tka")
  assertContains("components/student-home/SimulasiUjianSection.tsx", "/murid/bigt", "SimulasiUjianSection links to /murid/bigt")
  assertContains("components/student-home/SimulasiUjianSection.tsx", "/murid/dokumen-latihan", "SimulasiUjianSection links to /murid/dokumen-latihan")
  assertContains("components/student-home/RuangBelajarSection.tsx", "/murid/gabung-kelas", "RuangBelajarSection links to /murid/gabung-kelas")
  assertContains("components/student-home/RuangBelajarSection.tsx", "/murid/tugasku", "RuangBelajarSection links to /murid/tugasku")

  // 2. Read GuruLayout (production sidebar)
  console.log(`\n${YELLOW}--- Guru Layout (Production Sidebar) ---${RESET}`)
  assertContains("components/dashboard/GuruNav.tsx", "Simulasi UKBI", "GuruLayout contains 'Simulasi UKBI'")
  assertContains("components/dashboard/GuruNav.tsx", "Simulasi TKA", "GuruLayout contains 'Simulasi TKA'")
  assertContains("components/dashboard/GuruNav.tsx", "Hasil", "GuruLayout contains 'Hasil' menu (Hasil Murid / Hasil Simulasi)")
  assertContains("components/dashboard/GuruNav.tsx", "Dokumen Latihan Murid", "GuruLayout contains 'Dokumen Latihan Murid'")
  assertContains("components/dashboard/GuruNav.tsx", "BIGT", "GuruLayout contains 'BIGT'")
  assertContains("components/dashboard/GuruNav.tsx", "/guru/simulasi/ukbi", "GuruLayout links to /guru/simulasi/ukbi")
  assertContains("components/dashboard/GuruNav.tsx", "/guru/simulasi/tka", "GuruLayout links to /guru/simulasi/tka")
  assertContains("components/dashboard/GuruNav.tsx", "/guru/hasil-simulasi", "GuruLayout links to /guru/hasil-simulasi")
  assertContains("components/dashboard/GuruNav.tsx", "/guru/dokumen-latihan", "GuruLayout links to /guru/dokumen-latihan")
  assertContains("components/dashboard/GuruNav.tsx", "/guru/bigt", "GuruLayout links to /guru/bigt")
  assertNotContains("components/dashboard/GuruNav.tsx", 'label="Sertifikat"', "GuruLayout no 'Sertifikat' label")

  // Also check standalone GuruSidebar component
  console.log(`\n${YELLOW}--- GuruSidebar (Standalone) ---${RESET}`)
  assertContains("components/dashboard/GuruSidebar.tsx", "Simulasi UKBI", "GuruSidebar contains 'Simulasi UKBI'")
  assertContains("components/dashboard/GuruSidebar.tsx", "Simulasi TKA", "GuruSidebar contains 'Simulasi TKA'")
  assertContains("components/dashboard/GuruSidebar.tsx", "Hasil Murid", "GuruSidebar contains 'Hasil Murid'")
  assertContains("components/dashboard/GuruSidebar.tsx", "Dokumen Latihan Murid", "GuruSidebar contains 'Dokumen Latihan Murid'")
  assertContains("components/dashboard/GuruSidebar.tsx", "BIGT", "GuruSidebar contains 'BIGT'")
  assertContains("components/dashboard/GuruSidebar.tsx", "/guru/simulasi/ukbi", "GuruSidebar links to /guru/simulasi/ukbi")
  assertContains("components/dashboard/GuruSidebar.tsx", "/guru/simulasi/tka", "GuruSidebar links to /guru/simulasi/tka")
  assertContains("components/dashboard/GuruSidebar.tsx", "/guru/hasil-simulasi", "GuruSidebar links to /guru/hasil-simulasi")
  assertContains("components/dashboard/GuruSidebar.tsx", "/guru/dokumen-latihan", "GuruSidebar links to /guru/dokumen-latihan")
  assertContains("components/dashboard/GuruSidebar.tsx", "/guru/bigt", "GuruSidebar links to /guru/bigt")

  // 3. Read BIGT component
  console.log(`\n${YELLOW}--- BIGT Page ---${RESET}`)
  assertContains("components/bigt/BigtInfoPage.tsx", "https://www.bahasacerdas.site", "BIGT links to bahasacerdas.site")
  assertContains("components/bigt/BigtInfoPage.tsx", 'target="_blank"', "BIGT link has target _blank")
  assertContains("components/bigt/BigtInfoPage.tsx", 'rel="noopener noreferrer"', "BIGT link has rel noopener noreferrer")
  assertNotContains("components/bigt/BigtInfoPage.tsx", "iframe", "BIGT page does NOT iframe bahasacerdas.site")
  assertContains("components/bigt/BigtInfoPage.tsx", "BIGT", "BIGT page mentions BIGT")

  // 4. Certificate disclaimer
  console.log(`\n${YELLOW}--- Certificate Disclaimer ---${RESET}`)
  assertContains("components/kompetensi/CertificatePreview.tsx", "bukan sertifikat resmi UKBI/TKA", "CertificatePreview has disclaimer")
  assertContains("components/kompetensi/GuruCertificatePreview.tsx", "bukan sertifikat resmi UKBI/TKA", "GuruCertificatePreview has disclaimer")
  assertContains("components/kompetensi/CertificatePreview.tsx", "hasil latihan/simulasi di BahasaCerdas", "CertificatePreview: practice/simulation")
  assertContains("components/kompetensi/GuruCertificatePreview.tsx", "hasil latihan/simulasi di BahasaCerdas", "GuruCertificatePreview: practice/simulation")

  // 5. Answer leakage check
  console.log(`\n${YELLOW}--- Answer Leakage ---${RESET}`)
  assertNotContains("components/kompetensi/CertificatePreview.tsx", "correctAnswer", "CertificatePreview no correctAnswer")
  assertNotContains("components/kompetensi/GuruCertificatePreview.tsx", "correctAnswer", "GuruCertificatePreview no correctAnswer")
  assertNotContains("components/kompetensi/CertificatePreview.tsx", "answerKey", "CertificatePreview no answerKey")
  assertNotContains("components/kompetensi/GuruCertificatePreview.tsx", "answerKey", "GuruCertificatePreview no answerKey")

  // 6. Route existence
  console.log(`\n${YELLOW}--- Route Existence ---${RESET}`)
  const routes = [
    "app/(dashboard)/murid/simulasi/ukbi/page.tsx",
    "app/(dashboard)/murid/simulasi/tka/page.tsx",
    "app/(dashboard)/murid/dokumen-latihan/page.tsx",
    "app/(dashboard)/murid/sertifikat/page.tsx",
    "app/(dashboard)/murid/bigt/page.tsx",
    "app/(dashboard)/guru/simulasi/ukbi/page.tsx",
    "app/(dashboard)/guru/simulasi/tka/page.tsx",
    "app/(dashboard)/guru/hasil-simulasi/page.tsx",
    "app/(dashboard)/guru/dokumen-latihan/page.tsx",
    "app/(dashboard)/guru/sertifikat/page.tsx",
    "app/(dashboard)/guru/bigt/page.tsx",
  ]
  for (const route of routes) {
    assert(existsSync(join(process.cwd(), route)), `Route exists: ${route}`)
  }

  // 7. UKBI page disclaimer
  console.log(`\n${YELLOW}--- UKBI Simulation Page ---${RESET}`)
  assertContains("app/(dashboard)/murid/simulasi/ukbi/client.tsx", "bukan skor resmi UKBI", "UKBI page disclaimer")

  // 8. TKA page disclaimer
  console.log(`\n${YELLOW}--- TKA Simulation Page ---${RESET}`)
  assertContains("app/(dashboard)/murid/simulasi/tka/client.tsx", "bukan hasil resmi TKA", "TKA page disclaimer")

  // 9. Helper existence
  console.log(`\n${YELLOW}--- Helper ---${RESET}`)
  assert(existsSync(join(process.cwd(), "lib/kompetensi/get-simulation-packages.ts")), "Helper exists")

  // Summary
  console.log(`\n${YELLOW}=== Results ===${RESET}`)
  console.log(`  ${GREEN}Passed: ${passed}${RESET}`)
  console.log(`  ${RED}Failed: ${failed}${RESET}`)

  if (failed > 0) {
    console.log(`\n${RED}Errors:${RESET}`)
    for (const e of errors) {
      console.log(`  ${RED}${e}${RESET}`)
    }
    process.exit(1)
  } else {
    console.log(`\n${GREEN}All tests passed!${RESET}`)
  }
}

main()
