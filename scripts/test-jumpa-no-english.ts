/**
 * JUMPA — tidak boleh ada bahasa Inggris di UI.
 * Memindai string literal & teks JSX di komponen/halaman JUMPA serta pesan
 * error API/izin yang tampil ke pengguna, lalu menandai kata Inggris umum.
 * Jalankan: npm run test:jumpa-no-english
 */
import { readFileSync, readdirSync, statSync } from "fs"
import { join } from "path"

const ROOTS = ["components/jumpa", "app/jumpa", "app/api/jumpa", "app/api/cron/jumpa-sweep", "app/api/cron/jumpa-reminders", "lib/jumpa"]
// Kata Inggris yang sering bocor ke UI. Pakai batas kata, tidak peka huruf besar.
const WORDS = [
  "live", "by", "host", "co-host", "cohost", "speaker", "speakers", "auto", "low", "medium", "high",
  "loading", "error", "join", "joined", "leave", "left", "mute", "muted", "unmute", "share", "sharing",
  "screen", "chat", "settings", "setting", "camera", "microphone", "mic", "participant", "participants",
  "invite", "copy", "copied", "close", "send", "delete", "report", "grid", "layout", "online", "offline",
  "reconnecting", "connecting", "connected", "disconnected", "preview", "trial", "free", "upgrade",
  "limit", "quota", "cancel", "done", "back", "home", "dashboard", "room", "start", "end", "ended",
  "kick", "remove", "lock", "locked", "unlock", "waiting", "signal", "hand", "raise", "reaction",
  "noise", "blur", "background", "quality", "default", "allow", "please", "try", "again", "failed",
  "not", "found", "the", "you", "your", "and", "with", "is", "are", "on", "off", "new", "save",
  "hd", "unknown", "excellent", "good", "poor", "lost", "account", "page", "next", "previous",
]
const RE = new RegExp(`(?<![\\p{L}-])(${WORDS.join("|")})(?![\\p{L}-])`, "iu")
// Nama produk/merek dan istilah serapan yang diizinkan.
const ALLOW = [/\bJUMPA\b/g, /\bBahasaCerdas\b/g, /\bPremium\b/g, /\bMGMP\b/g, /\(HD\)/g, /\bKelasKu\b/g, /\bLiveKit\b/g]

function files(dir: string): string[] {
  let out: string[] = []
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) out = out.concat(files(p))
    else if (/\.(tsx?|mts)$/.test(f)) out.push(p)
  }
  return out
}

/** Apakah string ini kemungkinan teks untuk manusia (bukan id/kunci/kelas CSS)? */
function isHumanText(s: string): boolean {
  const t = s.trim()
  if (t.length < 2) return false
  if (/^[a-z0-9_.:/#@?=&%*+()[\]{}$-]+$/.test(t)) return false // id, path, kunci
  if (/^[A-Z0-9_]+$/.test(t)) return false // ENUM
  if (/^(bg|text|flex|grid|min|max|px|py|mt|mb|ml|mr|p|m|w|h|gap|rounded|border|jumpa|sm:|md:|lg:|absolute|relative|fixed|inline|hidden|block|items|justify|truncate|shrink|animate|font|tracking|leading|overflow|z-|opacity|transition|cursor|pointer|select|ring|shadow|aspect|object|place|inset|top|left|right|bottom|order|col|row|self|space|whitespace|break|sr-only|underline|uppercase|normal-case)/.test(t) && !/[.!?]$/.test(t)) return false
  return /[A-Za-z]/.test(t)
}

const findings: string[] = []
for (const root of ROOTS) {
  for (const file of files(root)) {
    const src = readFileSync(file, "utf8")
    const lines = src.split("\n")
    lines.forEach((line, i) => {
      const l = line.trim()
      if (/^(import|export \* from|\/\/|\*|\/\*)/.test(l)) return
      if (/console\.(log|error|warn|info)\(/.test(l)) return
      if (/\.includes\(/.test(l)) return // pencocokan pesan error internal
      const cands: string[] = []
      // String literal (bukan className/type/key).
      const strRe = /(className|class|data-[\w-]+|key|type|role|rel|target|href|src|id|htmlFor|name|method|mode|kind|source|case|variant|tone)\s*[=:]\s*["'`][^"'`]*["'`]|["'`]([^"'`\n]*)["'`]/g
      let m: RegExpExecArray | null
      while ((m = strRe.exec(line))) if (m[2] !== undefined) cands.push(m[2])
      // Nilai yang pasti tampil (label/judul/pesan) dicek walau satu kata kapital (mis. "HD").
      const uiRe = /\b(title|label|hint|message|error|placeholder|aria-label|alt)\s*[:=]\s*["'`]([^"'`\n]+)["'`]/g
      while ((m = uiRe.exec(line))) {
        const t = m[2].trim()
        let x = t
        for (const a of ALLOW) x = x.replace(a, " ")
        if (/^[A-Z]{2,}$/.test(t) && RE.test(x)) findings.push(`${file}:${i + 1}  "${t}"  ← ${t}`)
      }
      // Teks JSX di antara tag.
      const jsxRe = />([^<>{}`"]*[A-Za-z][^<>{}`"]*)</g
      while ((m = jsxRe.exec(line))) cands.push(m[1])
      for (const raw of cands) {
        if (!isHumanText(raw)) continue
        if (/\$\{[^}]*$/.test(raw)) continue
        if (/^\//.test(raw.trim())) continue // path/URL
        if (/[:)]\s*(string|number|boolean|Promise|Date)\b|\bnew Date\(/.test(raw)) continue // kode
        let text = raw.replace(/\$\{[^}]*\}/g, " ")
        for (const a of ALLOW) text = text.replace(a, " ")
        // Kata dalam operator/ekspresi JS, bukan kalimat.
        if (/(===|!==|=>|&&|\|\|)/.test(text)) continue
        const hit = RE.exec(text)
        if (hit) findings.push(`${file}:${i + 1}  "${raw.trim()}"  ← ${hit[1]}`)
      }
    })
  }
}

if (findings.length) {
  console.log(`❌ ${findings.length} teks berbahasa Inggris di UI JUMPA:\n` + findings.map((f) => "  " + f).join("\n"))
  process.exit(1)
}
console.log("✅ Tidak ada kata Inggris umum di UI JUMPA.")
