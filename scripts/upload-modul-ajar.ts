/**
 * Upload modul ajar ber-watermark ke Bank Modul Ajar (model Materi + Supabase Storage).
 *
 * Dry-run default (hanya memetakan tema/kelas/judul, tanpa upload).
 * Butuh env: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (hanya untuk --execute).
 *
 * Usage (dari apps/web):
 *   npx tsx scripts/upload-modul-ajar.ts --dir "/Users/user/Downloads/Perangkat Ajar BI"
 *   npx tsx scripts/upload-modul-ajar.ts --dir "..." --execute
 */
import "./load-env"
import fs from "fs"
import path from "path"
import { randomUUID } from "crypto"
import { createClient } from "@supabase/supabase-js"
import { db } from "../lib/db"

const DIR = (() => {
  const i = process.argv.indexOf("--dir")
  return i >= 0 ? process.argv[i + 1] : `${process.env.HOME}/Downloads/Perangkat Ajar BI`
})()
const EXECUTE = process.argv.includes("--execute")
const BUCKET = "documents"

function gradeOf(rel: string): string | null {
  if (/BINDONESIA-7/i.test(rel)) return "SMP Kelas 7"
  if (/BINDONESIA[ -]8/i.test(rel)) return "SMP Kelas 8"
  if (/BINDONESIA-9/i.test(rel)) return "SMP Kelas 9"
  return null
}

function romanToInt(s: string): number | null {
  const map: Record<string, number> = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 }
  s = s.toLowerCase(); let n = 0
  for (let i = 0; i < s.length; i++) {
    const c = map[s[i]]; if (!c) return null
    const nx = map[s[i + 1]]
    n += nx && c < nx ? -c : c
  }
  return n > 0 ? n : null
}
function babNum(text: string): number | null {
  const m = text.match(/bab\s+([ivxlcdm]+|\d+)/i)
  if (!m) return null
  return /^\d+$/.test(m[1]) ? parseInt(m[1]) : romanToInt(m[1])
}

// Tema konsisten "Bab N" (+ judul bab bila ada) untuk pencarian guru.
function temaOf(rel: string): string {
  const parts = rel.split(path.sep)
  let n: number | null = null
  for (const p of parts) { n = babNum(p); if (n) break }
  let title = ""
  const dirs = parts.slice(0, -1) // hanya folder, bukan nama file
  const babFolder = dirs.find((p) => /^Modul Ajar Bab\s+\d+\s+\S/i.test(p))
  if (babFolder && n) {
    const m = babFolder.match(/^Modul Ajar Bab\s+\d+\s+(.+)$/i)
    if (m) title = m[1].replace(/\.docx$/i, "").trim()
  }
  if (n) return title ? `Bab ${n} ${title}` : `Bab ${n}`
  const sem = parts.find((p) => /Semester (Ganjil|Genap)/i.test(p))
  if (sem) return sem.replace(/^Modul Ajar\s+/i, "").trim()
  return "Modul Ajar"
}

function collect(dir: string): string[] {
  const out: string[] = []
  ;(function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else if (/\.docx$/i.test(e.name) && !e.name.startsWith("~$") && /Modul Ajar/i.test(p)) out.push(p)
    }
  })(dir)
  return out
}

async function main() {
  if (!fs.existsSync(DIR)) {
    console.error(`❌ Folder tidak ditemukan: ${DIR}\n   Ekstrak dulu ZIP-nya, lalu --dir arahkan ke folder "Perangkat Ajar BI".`)
    process.exit(1)
  }

  const founder = await db.user.findFirst({ where: { OR: [{ isFounder: true }, { role: "ADMIN" }] }, select: { id: true, email: true } })
  if (!founder) { console.error("❌ Tidak ada user founder/admin untuk uploaderId."); process.exit(1) }

  const files = collect(DIR)
  console.log(`Ditemukan ${files.length} file modul ajar di:\n  ${DIR}`)
  console.log(`Uploader: ${founder.email}\n`)

  const plan = files.map((f) => {
    const rel = path.relative(DIR, f)
    return { f, rel, grade: gradeOf(rel), tema: temaOf(rel), title: path.basename(f).replace(/\.docx$/i, "") }
  })
  const skipNoGrade = plan.filter((p) => !p.grade)
  const ready = plan.filter((p) => p.grade)

  // Ringkasan tema per kelas
  const byGrade: Record<string, Set<string>> = {}
  for (const p of ready) { (byGrade[p.grade!] ??= new Set()).add(p.tema) }
  for (const g of Object.keys(byGrade).sort()) {
    console.log(`${g}: ${ready.filter((p) => p.grade === g).length} file, tema: ${[...byGrade[g]].join(" | ")}`)
  }
  if (skipNoGrade.length) console.log(`\n⚠️  ${skipNoGrade.length} file tanpa kelas terdeteksi (dilewati).`)

  if (!EXECUTE) {
    console.log(`\n── DRY RUN. Tambahkan --execute untuk mengunggah. Contoh 8 entri: ──`)
    ready.slice(0, 8).forEach((p) => console.log(`  [${p.grade}] tema="${p.tema}" — ${p.title}`))
    process.exit(0)
  }

  // === EXECUTE ===
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) { console.error("❌ Butuh NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY di env untuk --execute."); process.exit(1) }
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  let ok = 0, skip = 0, fail = 0
  for (const p of ready) {
    try {
      const exists = await db.materi.findFirst({ where: { title: p.title, grade: p.grade! } })
      if (exists) { skip++; continue }
      const buf = fs.readFileSync(p.f)
      const key2 = `${founder.id}/modul-ajar/${randomUUID()}.docx`
      const up = await supabase.storage.from(BUCKET).upload(key2, buf, {
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        cacheControl: "31536000", upsert: false,
      })
      if (up.error) { console.error("upload gagal:", p.title, up.error.message); fail++; continue }
      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(key2)
      await db.materi.create({ data: {
        title: p.title, description: null, content: "", fileUrl: pub.publicUrl, fileKey: key2,
        fileType: "DOCX", grade: p.grade!, subject: "Bahasa Indonesia", tema: p.tema,
        isPublished: true, uploaderId: founder.id,
      } })
      ok++
      if (ok % 20 === 0) console.log(`  ...${ok} terunggah`)
    } catch (e: any) { console.error("gagal:", p.title, e?.message); fail++ }
  }
  console.log(`\n✅ Selesai: ${ok} terunggah, ${skip} dilewati (sudah ada), ${fail} gagal.`)
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
