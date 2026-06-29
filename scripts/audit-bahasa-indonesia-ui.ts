import { readFileSync, existsSync, statSync, readdirSync } from "fs"
import { join, relative } from "path"

const ROOT = join(__dirname, "..")

const SKIP_DIRS = ["node_modules", ".next", "dist", "build", "coverage", ".git", ".vercel", ".opencode"]

const ENGLISH_PATTERNS: { pattern: RegExp; suggest: string; severity: "critical" | "warning" | "allowed" }[] = [
  { pattern: /(?<!["'`])\bDashboard\b(?!["'`])/g, suggest: "Dasbor", severity: "critical" },
  { pattern: /(?<!["'`])\bOverview\b(?!["'`])/g, suggest: "Ringkasan", severity: "critical" },
  { pattern: /\bGenerating\.\.\./g, suggest: "Memuat...", severity: "critical" },
  { pattern: /\bUploading\.\.\./g, suggest: "Mengunggah...", severity: "critical" },
  { pattern: /\bSaving\.\.\./g, suggest: "Menyimpan...", severity: "critical" },
  { pattern: /\bUpdating\.\.\./g, suggest: "Memperbarui...", severity: "critical" },
  { pattern: /\bFail(?:ed)? to load\b/gi, suggest: "Gagal memuat", severity: "critical" },
  { pattern: /\bSubmit fail(?:ed)?\b/gi, suggest: "Gagal mengirim", severity: "critical" },
  { pattern: /\bPending\b/g, suggest: "Menunggu", severity: "critical" },
  { pattern: /\b(?:Start|Begin) Practice\b/gi, suggest: "Mulai Latihan", severity: "critical" },
  { pattern: /\bView Result\b/gi, suggest: "Lihat Hasil", severity: "critical" },
  { pattern: /\bNo data\b/gi, suggest: "Belum ada data", severity: "critical" },
  { pattern: /\bNo results?\b/gi, suggest: "Tidak ada hasil", severity: "critical" },
  { pattern: /\bComing soon\b/gi, suggest: "Segera tersedia", severity: "critical" },

  // Standalone English words in UI
  { pattern: /(?<=["'`])\s*Export\b(?!\s*(PDF|DOCX|PPTX))(?!["'`])/g, suggest: "Ekspor", severity: "critical" },
  { pattern: /\bExport PDF/gi, suggest: "Ekspor PDF", severity: "critical" },
  { pattern: /\bExport DOCX/gi, suggest: "Ekspor DOCX", severity: "critical" },
  { pattern: /\bExport PPTX/gi, suggest: "Ekspor PPTX", severity: "critical" },
  { pattern: /\bImport\b/g, suggest: "Impor", severity: "warning" },
  { pattern: /\bDownload\b/g, suggest: "Unduh", severity: "critical" },
  { pattern: /\bUpload\b/g, suggest: "Unggah", severity: "critical" },
  { pattern: /\bManage\b/g, suggest: "Kelola", severity: "critical" },
  { pattern: /\bPreview\b/g, suggest: "Pratinjau", severity: "critical" },
  { pattern: /\bEdit (Soal|Kuis|Karya|Kategori|Artikel|Judul)\b/gi, suggest: "Ubah $1", severity: "critical" },
  { pattern: /\bUpdate\b/g, suggest: "Perbarui", severity: "critical" },
  { pattern: /\bPublished\b/g, suggest: "Terbit", severity: "critical" },
  { pattern: /\bSuccess\b(?!\s*\()/g, suggest: "Berhasil", severity: "critical" },
  { pattern: /\bHistory\b/g, suggest: "Riwayat", severity: "critical" },
  { pattern: /\bAnalytics\b/g, suggest: "Analitik", severity: "critical" },
  { pattern: /\bCertificate\b/gi, suggest: "Dokumen Hasil Latihan", severity: "critical" },
  { pattern: /\bProfiles?\b(?!\.)/g, suggest: "Profil", severity: "critical" },
  { pattern: /\bError\b(?!\s*\()/g, suggest: "Kesalahan/Gagal", severity: "critical" },
  { pattern: /\bRetry\b/g, suggest: "Coba lagi", severity: "critical" },
  { pattern: /\bTry again\b/gi, suggest: "Coba lagi", severity: "critical" },
  { pattern: /\bPassword\b/g, suggest: "Kata Sandi", severity: "critical" },
  { pattern: /\bAdmin Panel\b/g, suggest: "Panel Admin", severity: "critical" },
  { pattern: /\bData Center\b/g, suggest: "Pusat Data", severity: "critical" },
  { pattern: /\bAI Analytics\b/g, suggest: "Analitik AI", severity: "critical" },
  { pattern: /\bAI Quota\b/g, suggest: "Kuota AI", severity: "critical" },
  { pattern: /\b(Dashboard)\s+(Guru|Murid)\b/g, suggest: "Dasbor $2", severity: "critical" },
  { pattern: /COMPLETED(?![a-z])/g, suggest: "SELESAI", severity: "critical" },
  { pattern: /\bTanpa Download\b/g, suggest: "Tanpa Unduh", severity: "critical" },
  { pattern: /\bUpload(?:ing)? (Video|Cover|File|Karya)\b/gi, suggest: "Unggah $1", severity: "critical" },
  { pattern: /\bAuto-generate\b/gi, suggest: "Buat otomatis", severity: "critical" },
  { pattern: /\bHigher Order Thinking Skills\b/gi, suggest: "Keterampilan Berpikir Tingkat Tinggi (HOTS)", severity: "warning" },
  { pattern: /(?<![a-zA-Z])(?:Export|Generate|Preview|Upload|Download|Edit|Update|Import)\s/gi, suggest: "Gunakan Bahasa Indonesia", severity: "critical" },
]

function walk(dir: string): string[] {
  const result: string[] = []
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const full = join(dir, entry)
      const isDir = statSync(full).isDirectory()
      if (entry.startsWith(".")) continue
      if (isDir) {
        if (SKIP_DIRS.includes(entry)) continue
        result.push(...walk(full))
      } else if (/\.(tsx|ts|jsx|js|md)$/.test(full)) {
        result.push(full)
      }
    }
  } catch {}
  return result
}

function main() {
  process.stdout.write("Scanning files... ")
  const files = walk(ROOT)
  console.log(`${files.length} files found.\n`)

  let totalFiles = 0
  let totalMatches = 0
  interface Match { file: string; line: number; text: string; suggestion: string; severity: string }
  const criticals: Match[] = []
  const warnings: Match[] = []
  const allowed: Match[] = []

  for (const file of files) {
    const relPath = relative(ROOT, file)
    const content = readFileSync(file, "utf-8")
    const lines = content.split("\n")
    let fileMatched = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      for (const rule of ENGLISH_PATTERNS) {
        rule.pattern.lastIndex = 0
        let match: RegExpExecArray | null
        while ((match = rule.pattern.exec(line)) !== null) {
          totalMatches++
          fileMatched = true
          const entry: Match = {
            file: relPath,
            line: i + 1,
            text: match[0],
            suggestion: rule.suggest,
            severity: rule.severity,
          }
          if (rule.severity === "critical") criticals.push(entry)
          else if (rule.severity === "warning") warnings.push(entry)
          else allowed.push(entry)
        }
      }
    }
    if (fileMatched) totalFiles++
  }

  console.log("🔍 AUDIT BAHASA INDONESIA UI")
  console.log("=".repeat(80))
  console.log(`Total files scanned: ${files.length}`)
  console.log(`Files with matches: ${totalFiles}`)
  console.log(`Total matches: ${totalMatches}`)

  console.log(`\n🔴 CRITICAL (${criticals.length}):`)
  const sortedCrits = [...criticals].sort((a, b) => a.file.localeCompare(b.file))
  for (const c of sortedCrits) {
    console.log(`  ${c.file}:${c.line}  "${c.text}" → ${c.suggestion}`)
  }

  console.log(`\n🟡 WARNING (${warnings.length}):`)
  for (const w of warnings) {
    console.log(`  ${w.file}:${w.line}  "${w.text}" → ${w.suggestion}`)
  }

  console.log("\n" + "=".repeat(80))
  console.log(`\nSUMMARY: ${criticals.length} critical, ${warnings.length} warning, ${allowed.length} allowed`)
  if (criticals.length > 0) {
    console.log(`\n⚠️  ${criticals.length} critical issues need fixing.`)
    process.exit(1)
  }
  console.log("✅ No critical issues found.\n")
}

main()
