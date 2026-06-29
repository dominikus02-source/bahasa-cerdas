/**
 * Phase Simulation Workflow 1 — QA Tests
 *
 * Tests:
 * 1. MuridSidebar has menu items: Simulasi UKBI, Simulasi TKA, Dokumen Hasil Latihan, BIGT
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

  // 1. Read MuridLayout (production sidebar)
  console.log(`\n${YELLOW}--- Murid Layout (Production Sidebar) ---${RESET}`)
  assertContains("app/(dashboard)/murid/layout.tsx", "Simulasi UKBI", "MuridLayout contains 'Simulasi UKBI'")
  assertContains("app/(dashboard)/murid/layout.tsx", "Simulasi TKA", "MuridLayout contains 'Simulasi TKA'")
  assertContains("app/(dashboard)/murid/layout.tsx", "Dokumen Hasil Latihan", "MuridLayout contains 'Dokumen Hasil Latihan'")
  assertContains("app/(dashboard)/murid/layout.tsx", "BIGT", "MuridLayout contains 'BIGT'")
  assertContains("app/(dashboard)/murid/layout.tsx", "/murid/simulasi/ukbi", "MuridLayout links to /murid/simulasi/ukbi")
  assertContains("app/(dashboard)/murid/layout.tsx", "/murid/simulasi/tka", "MuridLayout links to /murid/simulasi/tka")
  assertContains("app/(dashboard)/murid/layout.tsx", "/murid/dokumen-latihan", "MuridLayout links to /murid/dokumen-latihan")
  assertContains("app/(dashboard)/murid/layout.tsx", "/murid/bigt", "MuridLayout links to /murid/bigt")
  assertNotContains("app/(dashboard)/murid/layout.tsx", 'label="Sertifikat"', "MuridLayout no 'Sertifikat' label")

  // Also check standalone MuridSidebar component
  console.log(`\n${YELLOW}--- MuridSidebar (Standalone) ---${RESET}`)
  assertContains("components/dashboard/MuridSidebar.tsx", "Simulasi UKBI", "MuridSidebar contains 'Simulasi UKBI'")
  assertContains("components/dashboard/MuridSidebar.tsx", "Simulasi TKA", "MuridSidebar contains 'Simulasi TKA'")
  assertContains("components/dashboard/MuridSidebar.tsx", "Dokumen Hasil Latihan", "MuridSidebar contains 'Dokumen Hasil Latihan'")
  assertContains("components/dashboard/MuridSidebar.tsx", "BIGT", "MuridSidebar contains 'BIGT'")
  assertContains("components/dashboard/MuridSidebar.tsx", "/murid/simulasi/ukbi", "MuridSidebar links to /murid/simulasi/ukbi")
  assertContains("components/dashboard/MuridSidebar.tsx", "/murid/simulasi/tka", "MuridSidebar links to /murid/simulasi/tka")
  assertContains("components/dashboard/MuridSidebar.tsx", "/murid/dokumen-latihan", "MuridSidebar links to /murid/dokumen-latihan")
  assertContains("components/dashboard/MuridSidebar.tsx", "/murid/bigt", "MuridSidebar links to /murid/bigt")

  // 2. Read GuruLayout (production sidebar)
  console.log(`\n${YELLOW}--- Guru Layout (Production Sidebar) ---${RESET}`)
  assertContains("app/(dashboard)/guru/layout.tsx", "Simulasi UKBI", "GuruLayout contains 'Simulasi UKBI'")
  assertContains("app/(dashboard)/guru/layout.tsx", "Simulasi TKA", "GuruLayout contains 'Simulasi TKA'")
  assertContains("app/(dashboard)/guru/layout.tsx", "Hasil Murid", "GuruLayout contains 'Hasil Murid'")
  assertContains("app/(dashboard)/guru/layout.tsx", "Dokumen Latihan Murid", "GuruLayout contains 'Dokumen Latihan Murid'")
  assertContains("app/(dashboard)/guru/layout.tsx", "BIGT", "GuruLayout contains 'BIGT'")
  assertContains("app/(dashboard)/guru/layout.tsx", "/guru/simulasi/ukbi", "GuruLayout links to /guru/simulasi/ukbi")
  assertContains("app/(dashboard)/guru/layout.tsx", "/guru/simulasi/tka", "GuruLayout links to /guru/simulasi/tka")
  assertContains("app/(dashboard)/guru/layout.tsx", "/guru/hasil-simulasi", "GuruLayout links to /guru/hasil-simulasi")
  assertContains("app/(dashboard)/guru/layout.tsx", "/guru/dokumen-latihan", "GuruLayout links to /guru/dokumen-latihan")
  assertContains("app/(dashboard)/guru/layout.tsx", "/guru/bigt", "GuruLayout links to /guru/bigt")
  assertNotContains("app/(dashboard)/guru/layout.tsx", 'label="Sertifikat"', "GuruLayout no 'Sertifikat' label")

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
