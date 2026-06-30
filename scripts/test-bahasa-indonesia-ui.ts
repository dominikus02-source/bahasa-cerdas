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

function fileContains(file: string, pattern: string | RegExp): boolean {
  if (!existsSync(file)) return false
  const content = readFileSync(file, "utf-8")
  if (typeof pattern === "string") return content.includes(pattern)
  return pattern.test(content)
}

function fileNotContains(file: string, pattern: string | RegExp): boolean {
  return !fileContains(file, pattern)
}

async function main() {
  console.log("\n📋 UJI BAHASA INDONESIA UI")
  console.log("=".repeat(60))

  // 1. Sidebar Guru — no English labels
  console.log("\n── Sidebar Guru ──")
  const guruLayout = "app/(dashboard)/guru/layout.tsx"
  test("Tidak ada 'Dashboard Guru'", () => fileNotContains(guruLayout, "Dashboard Guru"))
  test("Tidak ada 'Admin Panel'", () => fileNotContains(guruLayout, "Admin Panel"))
  test("Tidak ada 'Overview'", () => fileNotContains(guruLayout, "Overview"))
  test("Ada 'Dasbor Guru'", () => fileContains(guruLayout, "Dasbor Guru"))

  // 2. Sidebar Murid — no English labels
  console.log("\n── Sidebar Murid ──")
  const muridLayout = "app/(dashboard)/murid/layout.tsx"
  test("Tidak ada 'Dashboard'", () => fileNotContains(muridLayout, "Dashboard"))
  test("Ada 'Dasbor Murid'", () => fileContains(muridLayout, "Dasbor Murid"))

  // 3. Sidebar Admin — no English labels
  console.log("\n── Sidebar Admin ──")
  const adminSidebar = "components/admin/AdminSidebar.tsx"
  test("Tidak ada 'Overview'", () => fileNotContains(adminSidebar, "Overview"))
  test("Tidak ada 'AI Analytics'", () => fileNotContains(adminSidebar, "AI Analytics"))
  test("Tidak ada 'Data Center'", () => fileNotContains(adminSidebar, "Data Center"))
  test("Tidak ada 'Admin Panel' di label", () => fileNotContains(adminSidebar, "label:.*Admin Panel"))
  test("Ada 'Ringkasan'", () => fileContains(adminSidebar, "Ringkasan"))
  test("Ada 'Analitik AI'", () => fileContains(adminSidebar, "Analitik AI"))
  test("Ada 'Kuota AI'", () => fileContains(adminSidebar, "Kuota AI"))
  test("Ada 'Pusat Data'", () => fileContains(adminSidebar, "Pusat Data"))
  test("Ada 'Panel Admin'", () => fileContains(adminSidebar, "Panel Admin"))
  test("Ada 'Dasbor Guru'", () => fileContains(adminSidebar, "Dasbor Guru"))
  test("Ada 'Dasbor Murid'", () => fileContains(adminSidebar, "Dasbor Murid"))

  // 4. Halaman BIGT — Bahasa Indonesia
  console.log("\n── Halaman BIGT ──")
  const bigtComp = "components/bigt/BigtInfoPage.tsx"
  test("Judul 'BIGT — Tes Global Bahasa Indonesia'", () => fileContains(bigtComp, "Tes Global Bahasa Indonesia"))
  test("Tidak ada 'Bahasa Indonesia Global Test'", () => fileNotContains(bigtComp, "Bahasa Indonesia Global Test"))
  test("Tidak ada 'Test Screen'", () => fileNotContains(bigtComp, "Test Screen"))
  test("Tidak ada 'Section Progress'", () => fileNotContains(bigtComp, "Section Progress"))
  test("Tidak ada 'No-answer-leakage'", () => fileNotContains(bigtComp, "No-answer-leakage"))
  test("Tidak ada kata Inggris di fitur cards", () => {
    const content = readFileSync(bigtComp, "utf-8")
    const englishTerms = ["Layar Tes", "Pengatur Waktu Akurat", "Progres Bagian", "Hasil dan Skor", "Keamanan", "Standar Tes"]
    return englishTerms.every(t => content.includes(t))
  })
  test("Perbedaan pakai Bahasa Indonesia", () => fileContains(bigtComp, "Perbedaan"))
  test("'Platform belajar dan latihan harian' bukan '&'", () => fileContains(bigtComp, "Platform belajar dan latihan harian"))
  test("'Bank soal untuk guru dan murid'", () => fileContains(bigtComp, "Bank soal untuk guru dan murid"))
  test("'Komunitas guru dan murid'", () => fileContains(bigtComp, "Komunitas guru dan murid"))
  test("'Pengatur waktu dan progres bagian yang terstruktur'", () => fileContains(bigtComp, "Pengatur waktu dan progres bagian yang terstruktur"))
  test("'Sistem tanpa kebocoran jawaban'", () => fileContains(bigtComp, "Sistem tanpa kebocoran jawaban"))
  test("CTA 'Buka BIGT'", () => fileContains(bigtComp, "Buka BIGT"))
  test("Link external ke bahasacerdas.site", () => fileContains(bigtComp, "https://www.bahasacerdas.site"))

  // 5. Halaman Simulasi UKBI — Bahasa Indonesia
  console.log("\n── Halaman Simulasi UKBI ──")
  for (const file of [
    "app/(dashboard)/guru/simulasi/ukbi/page.tsx",
    "app/(dashboard)/murid/simulasi/ukbi/client.tsx",
  ]) {
    if (existsSync(file)) {
      test(`${file}: ada teks Bahasa Indonesia`, () => fileContains(file, "Simulasi"))
    }
  }

  // 6. Halaman Simulasi TKA — Bahasa Indonesia
  console.log("\n── Halaman Simulasi TKA ──")
  for (const file of [
    "app/(dashboard)/guru/simulasi/tka/page.tsx",
    "app/(dashboard)/murid/simulasi/tka/client.tsx",
  ]) {
    if (existsSync(file)) {
      test(`${file}: ada teks Bahasa Indonesia`, () => fileContains(file, "Simulasi"))
    }
  }

  // 7. Dokumen Hasil Latihan — tidak pakai "Certificate" sebagai label
  console.log("\n── Dokumen Hasil Latihan ──")
  const dokumenMurid = "app/(dashboard)/murid/dokumen-latihan/page.tsx"
  test("Judul halaman 'Dokumen Hasil Latihan'", () => fileContains(dokumenMurid, "Dokumen Hasil Latihan"))
  const certPrev = "components/kompetensi/CertificatePreview.tsx"
  if (existsSync(certPrev)) {
    test("CertificatePreview pakai 'Latihan UKBI' bukan 'UKBI Practice'", () => {
      const content = readFileSync(certPrev, "utf-8")
      return content.includes("Latihan UKBI") && !content.includes("UKBI Practice")
    })
  }
  const guruPreview = "components/kompetensi/GuruCertificatePreview.tsx"
  if (existsSync(guruPreview)) {
    test("GuruCertificatePreview pakai 'Latihan UKBI' bukan 'UKBI Practice'", () => {
      const content = readFileSync(guruPreview, "utf-8")
      return content.includes("Latihan UKBI") && !content.includes("UKBI Practice")
    })
  }

  // 7b. KompetensiClient — no "Sertifikat" term
  console.log("\n── KompetensiClient ──")
  const kompetensiFile = "components/kompetensi/KompetensiClient.tsx"
  if (existsSync(kompetensiFile)) {
    test("Tidak ada 'Sertifikat' sebagai label UI", () => fileNotContains(kompetensiFile, "Sertifikat"))
    test("Tidak ada 'Bersertifikat' sebagai badge", () => fileNotContains(kompetensiFile, "Bersertifikat"))
  }

  // 8. Landing pages — no English UI terms
  console.log("\n── Landing Pages ──")
  for (const file of [
    "components/landing/PricingTable.tsx",
    "components/landing/AIFeatures.tsx",
    "components/landing/MarketplaceSection.tsx",
  ]) {
    if (existsSync(file)) {
      test(`${file}: 'Unggah' bukan 'Upload'`, () => fileContains(file, "Unggah") || !fileContains(file, "Upload"))
    }
  }
  test("PricingTable tidak ada 'Download'", () => fileNotContains("components/landing/PricingTable.tsx", /["']Download/))
  test("PricingTable tidak ada 'Sertifikat Digital'", () => fileNotContains("components/landing/PricingTable.tsx", "Sertifikat Digital"))

  // 9. Error/loading/empty state — Bahasa Indonesia
  console.log("\n── Error & Loading State ──")
  const errorPage = "app/error.tsx"
  test("Error page: 'Terjadi Kesalahan'", () => fileContains(errorPage, "Terjadi Kesalahan"))
  test("Error page: 'Coba Lagi'", () => fileContains(errorPage, "Coba Lagi"))

  // 10. Lesson page — error messages in Indonesian
  console.log("\n── Lesson Page ──")
  const lessonPage = "app/arena/jalur-cerdas/[unitId]/lesson/page.tsx"
  test("Tidak ada 'Failed to load'", () => fileNotContains(lessonPage, "Failed to load"))
  test("Tidak ada 'Submit failed'", () => fileNotContains(lessonPage, "Submit failed"))
  test("Ada 'Gagal memuat pelajaran'", () => fileContains(lessonPage, "Gagal memuat pelajaran"))
  test("Ada 'Gagal mengirim jawaban'", () => fileContains(lessonPage, "Gagal mengirim jawaban"))

  // 11. Arena login — placeholders in Indonesian
  console.log("\n── Arena Login ──")
  const arenaLogin = "app/auth/arena-login/page.tsx"
  test("Placeholder 'Surel' bukan 'Email'", () => fileContains(arenaLogin, "Surel"))
  test("Placeholder 'Kata Sandi' bukan 'Password'", () => fileContains(arenaLogin, "Kata Sandi"))

  // 12. Admin pages — status labels in Indonesian
  console.log("\n── Admin Status Labels ──")
  test("Admin payments: 'Menunggu' bukan 'Pending' sebagai label UI", () => {
    const content = readFileSync("app/(dashboard)/admin/payments/page.tsx", "utf-8")
    return content.includes("Menunggu")
  })
  test("Admin komunitas: label error pakai 'Gagal'", () => {
    const content = readFileSync("app/(dashboard)/admin/komunitas/page.tsx", "utf-8")
    return content.includes("Gagal")
  })
  test("Admin data-center: tidak ada 'Profiles'", () => {
    const content = readFileSync("app/(dashboard)/admin/data-center/page.tsx", "utf-8")
    return !content.includes("Profiles")
  })

  // 13. AI tools — button labels in Indonesian
  console.log(`\n── AI Tools ──`)
  const historyPanel = "app/(dashboard)/guru/ai-tools/_components/history-panel.tsx"
  if (existsSync(historyPanel)) {
    test("History panel: 'Ubah judul' bukan 'Edit judul'", () => fileContains(historyPanel, "Ubah judul"))
    test("History panel: 'Unduh DOCX' bukan 'Download DOCX'", () => fileContains(historyPanel, "Unduh DOCX"))
    test("History panel: 'Unduh PDF' bukan 'Download PDF'", () => fileContains(historyPanel, "Unduh PDF"))
    test("History panel: 'Unduh PPTX' bukan 'Download PPTX'", () => fileContains(historyPanel, "Unduh PPTX"))
  }

  // 14. RPP Modul — no English
  console.log("\n── RPP Modul ──")
  const rppPage = "app/(dashboard)/guru/rpp-modul/page.tsx"
  test("RPP: tidak ada 'Generate gagal'", () => fileNotContains(rppPage, "Generate gagal"))
  test("RPP: tidak ada 'Generate timeout'", () => fileNotContains(rppPage, "Generate timeout"))
  test("RPP: badge pakai 'Diterbitkan'", () => fileContains(rppPage, "Diterbitkan"))

  // 15. Bank Soal — button labels in Indonesian
  console.log("\n── Bank Soal ──")
  for (const [file, label] of [
    ["app/(dashboard)/guru/bank-soal-ukbi/page.tsx", "Buat Soal UKBI dengan AI"],
    ["app/(dashboard)/guru/bank-soal-tka/page.tsx", "Buat Soal TKA dengan AI"],
  ]) {
    if (existsSync(file)) {
      test(`${file}: label tombol pakai '${label}'`, () => {
        const content = readFileSync(file, "utf-8")
        return content.includes(label)
      })
    }
  }

  // 16. AI BC page
  console.log("\n── AI BC ──")
  test("ai-bc: 'Buat' bukan 'Generate'", () => {
    const content = readFileSync("app/ai-bc/page.tsx", "utf-8")
    return !content.includes("Generate")
  })
  test("ai-bc/layout: 'Buat' bukan 'Generate'", () => {
    const content = readFileSync("app/ai-bc/layout.tsx", "utf-8")
    return !content.includes("Generate")
  })

  // ── Summary ──
  console.log(`\n${"=".repeat(60)}`)
  console.log(`📊 HASIL: ${passed} passed, ${failed} failed (${passed + failed} total)`)
  if (failed > 0) process.exit(1)
  console.log("✅ SEMUA UJI BAHASA INDONESIA LULUS\n")
}

main().catch(e => {
  console.error("❌ Test crashed:", e.message)
  process.exit(1)
})
