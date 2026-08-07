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
  console.log("\n📋 DOKUMEN LATIHAN SANITIZATION TEST")
  console.log("=".repeat(60))

  // Check files for sensitive field exposure
  const files = [
    "app/(dashboard)/murid/dokumen-latihan/page.tsx",
    "app/(dashboard)/guru/dokumen-latihan/page.tsx",
    "components/kompetensi/CertificatePreview.tsx",
    "components/kompetensi/GuruCertificatePreview.tsx",
    "app/(dashboard)/murid/sertifikat/page.tsx",
    "app/(dashboard)/guru/sertifikat/page.tsx",
  ]

  const sensitiveFields = [
    "correctAnswer", "answerKey", "jawaban",
    "userAnswer", "studentAnswer",
    "snapshot", "seed", "questionPool",
    "options.*correct", "isCorrect",
  ]

  console.log("\n── Sensitive Field Check ──")
  for (const file of files) {
    if (!fs.existsSync(file)) {
      test(`${file}: file exists`, () => false)
      continue
    }
    const content = fs.readFileSync(file, "utf-8")
    for (const field of sensitiveFields) {
      if (content.includes(field)) {
        test(`${file}: does not contain ${field}`, () => false)
      }
    }
  }

  // Check API route used
  console.log("\n── API Route Check ──")
  const muridDoc = fs.readFileSync("app/(dashboard)/murid/dokumen-latihan/page.tsx", "utf-8")
  const guruDoc = fs.readFileSync("app/(dashboard)/guru/dokumen-latihan/page.tsx", "utf-8")

  test("Murid page fetches from /api/user/sertifikat", () => muridDoc.includes("/api/user/sertifikat"))
  test("Guru page fetches from /api/guru/dokumen-siswa (repository API)", () => guruDoc.includes("/api/guru/dokumen-siswa"))

  // Check overview — makes sure the CertificatePreview is imported (not raw API render)
  console.log("\n── Component Check ──")
  test("Murid page imports CertificatePreview", () => muridDoc.includes("CertificatePreview"))
  test("Guru page imports GuruCertificatePreview", () => guruDoc.includes("GuruCertificatePreview"))
  test("CertificatePreview does not use dangerouslySetInnerHTML", () => {
    const certPrev = fs.readFileSync("components/kompetensi/CertificatePreview.tsx", "utf-8")
    return !certPrev.includes("dangerouslySetInnerHTML")
  })
  test("GuruCertificatePreview does not use dangerouslySetInnerHTML", () => {
    const guruPrev = fs.readFileSync("components/kompetensi/GuruCertificatePreview.tsx", "utf-8")
    return !guruPrev.includes("dangerouslySetInnerHTML")
  })

  // Check no raw data leak
  console.log("\n── Data Exposure Check ──")
  test("CertificatePreview does not JSON.stringify raw cert data", () => {
    const cp = fs.readFileSync("components/kompetensi/CertificatePreview.tsx", "utf-8")
    return !cp.includes("JSON.stringify")
  })

  // Check the API route for answerDetails exposure
  console.log("\n── API Sanitization Check ──")
  try {
    const apiRoute = fs.readFileSync("app/api/user/sertifikat/route.ts", "utf-8")
    test("API route does not expose answerDetails", () => !apiRoute.includes("answerDetails"))
    test("API route does not expose correctAnswer", () => !apiRoute.includes("correctAnswer"))
    test("API route uses sanitizer or select", () => apiRoute.includes("select") || apiRoute.includes("sanitize"))
  } catch {
    test("API route exists", () => false)
  }

  // Guru repository API (additive — repository dokumen guru)
  try {
    const repoRoute = fs.readFileSync("app/api/guru/dokumen-siswa/route.ts", "utf-8")
    test("Guru repo API does not expose correctAnswer", () => !repoRoute.includes("correctAnswer"))
    test("Guru repo API does not expose answerDetails", () => !repoRoute.includes("answerDetails"))
    test("Guru repo API selects safe fields", () => repoRoute.includes("select") || repoRoute.includes("items"))
  } catch {
    test("Guru repo API exists", () => false)
  }

  // ── Summary ──
  console.log(`\n${"=".repeat(60)}`)
  console.log(`📊 RESULT: ${passed} passed, ${failed} failed (${passed + failed} total)`)
  if (failed > 0) process.exit(1)
  console.log("✅ ALL DOKUMEN SANITIZATION TESTS PASSED\n")
}

main().catch(e => {
  console.error("❌ Test crashed:", e.message)
  process.exit(1)
})
