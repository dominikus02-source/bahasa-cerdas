/**
 * TEST KEAMANAN — Content Inventory Audit
 *
 * Memastikan:
 * 1. Script audit read-only (tidak ada write/delete)
 * 2. Tidak ada env vars yang diekspose
 * 3. Tidak ada correctAnswer/jawaban yang bocor ke output
 * 4. Semua output dalam Bahasa Indonesia
 *
 * Run: npx tsx scripts/test-content-inventory-safety.ts
 */

import { readFileSync } from "fs"

const ROOT = __dirname

function read(path: string): string {
  try {
    return readFileSync(path, "utf-8")
  } catch {
    return ""
  }
}

function test(name: string, fn: () => boolean) {
  const ok = fn()
  console.log(`${ok ? "  ✅" : "  ❌"} ${name}`)
  return ok
}

function main() {
  console.log("\n🧪 TEST KEAMANAN — Content Inventory Audit")
  console.log("=".repeat(60))

  const script = read(`${ROOT}/audit-content-inventory.ts`)
  let passed = 0
  let total = 0

  // 1. Tidak ada write operations
  total++
  passed += test("Tidak ada writeFileSync/appendFileSync", () =>
    !script.includes("writeFileSync") && !script.includes("appendFileSync")
  )

  // 2. Tidak ada delete operations
  total++
  passed += test("Tidak ada unlinkSync/rmSync/rmdirSync", () =>
    !script.includes("unlinkSync") && !script.includes("rmSync") && !script.includes("rmdirSync")
  )

  // 3. Tidak ada create operations
  total++
  passed += test("Tidak ada mkdirSync/copyFileSync", () =>
    !script.includes("mkdirSync") && !script.includes("copyFileSync")
  )

  // 4. Tidak ada rename operations
  total++
  passed += test("Tidak ada renameSync", () =>
    !script.includes("renameSync")
  )

  // 5. Tidak ada chmod/chown
  total++
  passed += test("Tidak ada chmodSync/chownSync", () =>
    !script.includes("chmodSync") && !script.includes("chownSync")
  )

  // 6. Tidak ada exec/spawn/child_process
  total++
  passed += test("Tidak ada exec/spawn/child_process", () => {
    // Hanya deteksi child_process module, bukan .exec() regex method
    const lines = script.split("\n")
    const dangerous = lines.filter(l =>
      (l.includes("require(") || l.includes("import ")) &&
      l.includes("child_process")
    )
    return dangerous.length === 0
  })

  // 7. Tidak ada import fs promises (write/delete)
  total++
  passed += test("Tidak ada fs promises write/delete", () => {
    const lines = script.split("\n")
    return !lines.some(l =>
      (l.includes("from") || l.includes("require")) &&
      l.includes("fs") &&
      l.includes("promises")
    )
  })

  // 8. Tidak ada env vars yang diekspose
  total++
  passed += test("Tidak ada process.env dalam output", () =>
    !script.includes("process.env")
  )

  // 9. Tidak ada correctAnswer dalam console.log
  total++
  passed += test("Tidak ada correctAnswer dalam output cetak", () => {
    // Cek apakah ada console.log yang menyertakan correctAnswer
    const logLines = script.split("\n").filter(l => l.includes("console.log"))
    return !logLines.some(l => l.toLowerCase().includes("correctanswer"))
  })

  // 10. Output dalam Bahasa Indonesia
  total++
  passed += test("Output menggunakan Bahasa Indonesia (tidak ada English greeting)", () => {
    const logLines = script.split("\n").filter(l => l.includes("console.log"))
    // Tidak ada "Hello", "Welcome", "Summary", "Total Questions" di output
    const englishGreetings = ["Hello", "Welcome", "Summary", "Total Questions", "Questions count"]
    return !logLines.some(l => englishGreetings.some(g => l.includes(g)))
  })

  // 11. Tidak ada import prisma (tidak perlu koneksi DB)
  total++
  passed += test("Tidak ada import PrismaClient/@prisma/client", () =>
    !script.includes("@prisma/client") && !script.includes("PrismaClient")
  )

  // 12. Tidak ada import supabase
  total++
  passed += test("Tidak ada import Supabase", () =>
    !script.includes("createClient") && !script.includes("@supabase")
  )

  // 13. Script tidak mengubah file di luar current directory
  total++
  passed += test("Tidak ada path absolut write operations", () => {
    // Hanya read operations menggunakan readFileSync/existsSync/readdirSync
    const writeOps = script.match(/writeFileSync|appendFileSync|unlinkSync|rmSync|mkdirSync/g)
    return !writeOps
  })

  // 14. Script readonly verification di output
  total++
  passed += test("Ada pesan 'Read-only'/'tidak ada data diubah' di output", () =>
    script.includes("tidak ada data diubah") || script.includes("Read-only")
  )

  console.log(`\n${"=".repeat(60)}`)
  console.log(`  Hasil: ${passed}/${total} lulus`)
  if (passed === total) {
    console.log("  ✅ SEMUA AMAN — Script read-only, Bahasa Indonesia, tidak bocor data.")
  } else {
    console.log(`  ❌ ${total - passed} gagal — perbaiki sebelum lanjut.`)
    process.exit(1)
  }
}

main()
