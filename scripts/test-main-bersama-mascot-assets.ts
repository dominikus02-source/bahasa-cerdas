/**
 * Test aset maskot Main Bersama — READY batch (2026-09-21).
 * Pola QA repo (tsx standalone, tanpa framework test).
 *
 * Jalankan: npx tsx scripts/test-main-bersama-mascot-assets.ts
 *
 * Opsional (butuh dev server hidup) untuk memverifikasi HTTP 200:
 *   MB_MASCOT_HTTP_BASE=http://localhost:3000 npx tsx scripts/test-main-bersama-mascot-assets.ts
 *
 * Yang dikunci tes ini:
 *  - READY (locked) 4/4 + MOVE (candidate) 4/4; celebrate/podium tetap null
 *  - path URL == path fisik (invariant case — Linux/Vercel case-sensitive)
 *  - runtime = WebP valid, PUNYA kanal alpha, dimensi 1024, ukuran hemat
 *  - master PNG lossless (READY + MOVE) tetap utuh di docs/, bukan runtime
 *  - READY LOCKED tidak tersentuh sejak commit terakhir (bukti via git)
 *  - tidak ada sisa drop lama (bc_*_mascot) / dua sistem penamaan
 *  - TeamMascot jatuh ke TeamBadge saat src null / team tidak dikenal
 */
import fs from "fs"
import path from "path"
import zlib from "zlib"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"

import {
  TEAM_MASCOTS,
  TEAM_IDS,
  TeamMascot,
  TeamBadge,
} from "../components/main-bersama/art/registry"

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

const REPO = path.resolve(__dirname, "..")
const PUBLIC_DIR = path.join(REPO, "public")
const MASTER_DIR = path.join(REPO, "docs", "main-bersama", "art-source", "mascots", "ready")
const MOVE_DIR = path.join(REPO, "docs", "main-bersama", "art-source", "mascots", "move")
const ART_SOURCE_DIR = path.join(REPO, "docs", "main-bersama", "art-source", "mascots")
const REF_SHEET = path.join(ART_SOURCE_DIR, "maskot-main-bersama-master.png")

const POSES = ["ready", "move", "celebrate", "podium"] as const
const MAX_WEBP_BYTES = 220 * 1024

/** WebP minimal parser: RIFF/WEBP + chunk walker (VP8X / ALPH). */
function parseWebp(buf: Buffer) {
  const riff = buf.subarray(0, 4).toString("ascii") === "RIFF"
  const webp = buf.subarray(8, 12).toString("ascii") === "WEBP"
  const chunks: string[] = []
  let width = 0
  let height = 0
  let hasAlphaChunk = false
  let offset = 12
  while (offset + 8 <= buf.length) {
    const fourcc = buf.subarray(offset, offset + 4).toString("ascii")
    const size = buf.readUInt32LE(offset + 4)
    chunks.push(fourcc)
    if (fourcc === "VP8X") {
      const d = buf.subarray(offset + 8, offset + 18)
      width = 1 + (d[4] | (d[5] << 8) | (d[6] << 16))
      height = 1 + (d[7] | (d[8] << 8) | (d[9] << 16))
      if ((d[0] & 0x10) !== 0) hasAlphaChunk = true // bit alpha
    }
    if (fourcc === "ALPH") hasAlphaChunk = true
    offset += 8 + size + (size % 2)
  }
  return { riff, webp, chunks, width, height, hasAlphaChunk }
}

/** PNG minimal decoder: cukup untuk membaca IHDR + membuktikan alpha nyata. */
function decodePng(buf: Buffer) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const validSignature = buf.subarray(0, 8).equals(sig)

  let offset = 8
  let width = 0
  let height = 0
  let bitDepth = 0
  let colorType = -1
  const idat: Buffer[] = []

  while (offset + 8 <= buf.length) {
    const len = buf.readUInt32BE(offset)
    const type = buf.subarray(offset + 4, offset + 8).toString("ascii")
    const data = buf.subarray(offset + 8, offset + 8 + len)
    if (type === "IHDR") {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    } else if (type === "IDAT") {
      idat.push(Buffer.from(data))
    } else if (type === "IEND") {
      break
    }
    offset += 12 + len
  }

  let transparentSamples = 0
  let sampledPixels = 0

  if (colorType === 6 && bitDepth === 8 && idat.length > 0) {
    const raw = zlib.inflateSync(Buffer.concat(idat))
    const bpp = 4
    const stride = width * bpp
    const out = Buffer.alloc(height * stride)
    let pos = 0

    for (let y = 0; y < height; y++) {
      const filter = raw[pos++]
      const line = raw.subarray(pos, pos + stride)
      pos += stride
      const cur = out.subarray(y * stride, (y + 1) * stride)
      const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null

      for (let x = 0; x < stride; x++) {
        const a = x >= bpp ? cur[x - bpp] : 0
        const b = prev ? prev[x] : 0
        const c = prev && x >= bpp ? prev[x - bpp] : 0
        let v = line[x]
        if (filter === 1) v += a
        else if (filter === 2) v += b
        else if (filter === 3) v += (a + b) >> 1
        else if (filter === 4) {
          const p = a + b - c
          const pa = Math.abs(p - a)
          const pb = Math.abs(p - b)
          const pc = Math.abs(p - c)
          v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
        }
        cur[x] = v & 0xff
      }

      // sampling agar cepat (setiap piksel ke-7 secara horizontal)
      for (let x = 0; x < width; x += 7) {
        sampledPixels++
        if (cur[x * bpp + 3] === 0) transparentSamples++
      }
    }
  }

  return { validSignature, width, height, bitDepth, colorType, transparentSamples, sampledPixels }
}

/**
 * Pastikan setiap segmen path URL ada di disk dengan CASE yang sama persis.
 * Ini invariant yang menangkap `public/Main-Bersama` vs URL `/main-bersama/…`
 * (macOS tidak peduli, Linux/Vercel 404).
 */
function pathCaseMatches(urlPath: string): { ok: boolean; bad?: string } {
  const segments = urlPath.split("/").filter(Boolean)
  let current = PUBLIC_DIR
  for (const seg of segments) {
    if (!fs.existsSync(current)) return { ok: false, bad: `${current} tidak ada` }
    const entries = fs.readdirSync(current)
    if (!entries.includes(seg)) return { ok: false, bad: `segmen "${seg}" tidak exact-case di ${current}` }
    current = path.join(current, seg)
  }
  return { ok: true }
}

function expected(team: string, pose: "ready" | "move" = "ready") {
  return `/main-bersama/jelajah/mascots/jelajah-${team}-${pose}.webp`
}

/** Arsip master lossless PNG per pose. */
function masterPath(team: string, pose: "ready" | "move") {
  return path.join(pose === "ready" ? MASTER_DIR : MOVE_DIR, `jelajah-${team}-${pose}.png`)
}

async function main() {
  console.log("\n── A. Registry: slot READY (locked) + MOVE (candidate) ──")
  for (const team of TEAM_IDS) {
    test(`${team}: ready terisi`, () => TEAM_MASCOTS[team].ready.src === expected(team, "ready"))
  }
  for (const team of TEAM_IDS) {
    test(`${team}: move terisi`, () => TEAM_MASCOTS[team].move.src === expected(team, "move"))
  }
  test("pose celebrate + podium SEMUA masih null (fallback aktif)", () =>
    TEAM_IDS.every((t) => ["celebrate", "podium"].every((p) => TEAM_MASCOTS[t][p as "celebrate"].src === null)))
  test(`total slot kosong = 8 (4 tim × 2 pose: celebrate + podium)`, () =>
    TEAM_IDS.reduce(
      (n, t) => n + POSES.filter((p) => TEAM_MASCOTS[t][p].src === null).length,
      0
    ) === 8)
  test("tepat 8 slot src terisi (4 READY + 4 MOVE, tidak ada slot liar)", () =>
    TEAM_IDS.reduce((n, t) => n + POSES.filter((p) => TEAM_MASCOTS[t][p].src !== null).length, 0) === 8)
  test("semua src lowercase (aman di Linux)", () =>
    TEAM_IDS.every((t) =>
      (["ready", "move"] as const).every((p) => {
        const s = TEAM_MASCOTS[t][p].src as string
        return s === s.toLowerCase()
      })))
  test("semua src di bawah /main-bersama/jelajah/mascots/", () =>
    TEAM_IDS.every((t) =>
      (["ready", "move"] as const).every((p) =>
        (TEAM_MASCOTS[t][p].src as string).startsWith("/main-bersama/jelajah/mascots/"))))
  test("semua src berekstensi .webp", () =>
    TEAM_IDS.every((t) =>
      (["ready", "move"] as const).every((p) => (TEAM_MASCOTS[t][p].src as string).endsWith(".webp"))))
  test("TIDAK ada src yang masih .png", () =>
    TEAM_IDS.every((t) =>
      (["ready", "move"] as const).every((p) => !(TEAM_MASCOTS[t][p].src as string).endsWith(".png"))))
  test("src MOVE memakai suffix -move.webp (bukan menimpa READY)", () =>
    TEAM_IDS.every((t) => (TEAM_MASCOTS[t].move.src as string).includes("-move.webp")))

  console.log("\n── B. URL ↔ path fisik (invariant case, Linux/Vercel) ──")
  for (const team of TEAM_IDS) {
    for (const pose of ["ready", "move"] as const) {
      const url = TEAM_MASCOTS[team][pose].src as string
      const r = pathCaseMatches(url)
      test(`${team}/${pose}: path URL exact-case ada di disk`, () => r.ok)
      if (!r.ok) console.log(`        ↳ ${r.bad}`)
      test(`${team}/${pose}: file runtime ada`, () =>
        fs.existsSync(path.join(PUBLIC_DIR, url.slice(1))))
    }
  }
  // CATATAN: `fs.existsSync("public/Main-Bersama")` SELALU true di macOS
  // (case-insensitive) sehingga tidak bisa dipakai. Gunakan readdir yang
  // mengembalikan nama asli di disk.
  test(`tidak ada entri "Main-Bersama" salah kapital di public/`, () =>
    !fs.readdirSync(PUBLIC_DIR).includes("Main-Bersama"))
  test(`entri exact-case "main-bersama" ada di public/`, () =>
    fs.readdirSync(PUBLIC_DIR).includes("main-bersama"))
  test(`segmen jelajah & mascots exact-case di disk`, () =>
    fs.readdirSync(path.join(PUBLIC_DIR, "main-bersama")).includes("jelajah") &&
    fs.readdirSync(path.join(PUBLIC_DIR, "main-bersama", "jelajah")).includes("mascots"))

  console.log("\n── C. Runtime WebP (READY + MOVE): container valid, alpha hadir, hemat ──")
  for (const team of TEAM_IDS) {
    for (const pose of ["ready", "move"] as const) {
      const url = TEAM_MASCOTS[team][pose].src as string
      const buf = fs.readFileSync(path.join(PUBLIC_DIR, url.slice(1)))
      const w = parseWebp(buf)

      test(`${team}/${pose}: container RIFF/WEBP valid`, () => w.riff && w.webp)
      test(`${team}/${pose}: chunk VP8X + ALPH hadir (kanal alpha nyata)`, () =>
        w.chunks.includes("VP8X") && w.hasAlphaChunk)
      test(`${team}/${pose}: dimensi 1024×1024`, () => w.width === 1024 && w.height === 1024)
      test(`${team}/${pose}: ukuran ≤ ${MAX_WEBP_BYTES / 1024} KB`, () => buf.length <= MAX_WEBP_BYTES)
      test(`${team}/${pose}: ≥70% lebih kecil dari master PNG`, () => {
        const master = masterPath(team, pose)
        if (!fs.existsSync(master)) return false
        return buf.length <= fs.statSync(master).size * 0.3
      })
    }
  }
  test("8 runtime WebP ukurannya berbeda (8 artwork distinct)", () =>
    new Set(
      TEAM_IDS.flatMap((t) =>
        (["ready", "move"] as const).map((p) =>
          fs.statSync(path.join(PUBLIC_DIR, (TEAM_MASCOTS[t][p].src as string).slice(1))).size
        )
      )
    ).size === 8)

  console.log("\n── D. Master lossless PNG tetap utuh di docs/ (bukan runtime) ──")
  for (const team of TEAM_IDS) {
    for (const pose of ["ready", "move"] as const) {
      const master = masterPath(team, pose)
      test(`${team}/${pose}: master PNG ada di docs/`, () => fs.existsSync(master))
      if (!fs.existsSync(master)) continue
      const info = decodePng(fs.readFileSync(master))
      test(`${team}/${pose}: master PNG valid, 1254×1254, RGBA bitDepth 8`, () =>
        info.validSignature && info.width === 1254 && info.height === 1254 && info.colorType === 6)
      test(`${team}/${pose}: master punya piksel transparan nyata (>5% sampel alpha=0)`, () => {
        const ratio = info.sampledPixels ? info.transparentSamples / info.sampledPixels : 0
        return ratio > 0.05
      })
    }
  }

  console.log("\n── D2. READY LOCKED tidak berubah (bukti vs commit terakhir) ──")
  try {
    const { execSync } = require("child_process")
    const readyPaths = TEAM_IDS.map((t) => `public/main-bersama/jelajah/mascots/jelajah-${t}-ready.webp`)
    const changed = execSync(`git diff --name-only HEAD -- ${readyPaths.join(" ")}`, {
      cwd: REPO,
      encoding: "utf8",
    }).trim()
    test("4 runtime READY tidak tersentuh sejak commit terakhir", () => changed === "")
    if (changed) console.log(`        ↳ berubah: ${changed}`)

    const changedMaster = execSync(
      `git diff --name-only HEAD -- docs/main-bersama/art-source/mascots/ready`,
      { cwd: REPO, encoding: "utf8" }
    ).trim()
    test("master READY di docs/ tidak tersentuh", () => changedMaster === "")
  } catch {
    console.log("  ⏭  dilewati (git tidak tersedia / bukan repo git)")
  }

  console.log("\n── E. Satu sistem penamaan (drop lama sudah di-quarantine) ──")
  test("tidak ada file .png di runtime dir (master tidak ikut deploy)", () =>
    fs.readdirSync(path.join(PUBLIC_DIR, "main-bersama", "jelajah", "mascots")).every((f) => !f.endsWith(".png")))
  test("tidak ada bc_*_mascot.png di public/main-bersama/", () =>
    fs.readdirSync(path.join(PUBLIC_DIR, "main-bersama")).every((f) => !f.startsWith("bc_")))
  test("tidak ada bc_*_mascot.png di docs/art-source/mascots/", () =>
    fs.readdirSync(ART_SOURCE_DIR).every((f) => !f.startsWith("bc_")))
  test("reference sheet master ada di docs/", () => fs.existsSync(REF_SHEET))
  test("reference sheet TIDAK ada lagi di public/", () =>
    !fs.existsSync(path.join(PUBLIC_DIR, "maskot main bersama.png")))

  console.log("\n── F. Fallback TeamBadge tetap jalan ──")
  const fallback = renderToStaticMarkup(React.createElement(TeamBadge, { teamId: "elang" }))
  test("TeamBadge merender markup badge (svg + mb-team-badge)", () =>
    fallback.includes("mb-team-badge") && fallback.includes("<svg"))

  const movePose = renderToStaticMarkup(
    React.createElement(TeamMascot, { teamId: "elang", pose: "celebrate" as const })
  )
  test("pose 'celebrate' (src null) → TeamBadge, BUKAN <img>", () =>
    movePose.includes('class="mb-team-badge"') && !movePose.includes("<img"))

  const podiumPose = renderToStaticMarkup(
    React.createElement(TeamMascot, { teamId: "rusa", pose: "podium" as const })
  )
  test("pose 'podium' (src null) → TeamBadge, BUKAN <img>", () =>
    podiumPose.includes('class="mb-team-badge"') && !podiumPose.includes("<img"))

  const moveRendered = renderToStaticMarkup(
    React.createElement(TeamMascot, { teamId: "elang", pose: "move" as const, size: 64 })
  )
  test("pose 'move' (src ada) → <img> dengan src MOVE yang benar", () =>
    moveRendered.includes("<img") &&
    moveRendered.includes(expected("elang", "move")) &&
    !moveRendered.includes('class="mb-team-badge"'))

  const unknownTeam = renderToStaticMarkup(
    React.createElement(TeamMascot, { teamId: "naga-tidak-ada", pose: "ready" as const })
  )
  test("teamId tidak dikenal → TeamBadge, BUKAN <img>", () =>
    unknownTeam.includes('class="mb-team-badge"') && !unknownTeam.includes("<img"))

  const readyElang = renderToStaticMarkup(
    React.createElement(TeamMascot, { teamId: "elang", pose: "ready" as const, size: 76 })
  )
  test("pose 'ready' → <img> dengan src runtime yang benar", () =>
    readyElang.includes("<img") && readyElang.includes(expected("elang")))

  for (const team of TEAM_IDS) {
    const html = renderToStaticMarkup(
      React.createElement(TeamMascot, { teamId: team, pose: "ready" as const, size: 64 })
    )
    test(`${team}: render READY memuat src + tidak ada badge fallback`, () =>
      html.includes(expected(team)) && !html.includes('class="mb-team-badge"'))
  }

  console.log("\n── G. TeamBadge masih diekspor dari registry (kontrak 8B) ──")
  test("registry re-export TeamBadge", () => typeof TeamBadge === "function")

  const httpBase = process.env.MB_MASCOT_HTTP_BASE
  if (httpBase) {
    console.log(`\n── H. HTTP 200 (opsional, base=${httpBase}) ──`)
    for (const team of TEAM_IDS) {
      for (const pose of ["ready", "move"] as const) {
        const url = `${httpBase}${expected(team, pose)}`
        try {
          const res = await fetch(url)
          const type = res.headers.get("content-type") ?? ""
          const bytes = (await res.arrayBuffer()).byteLength
          test(`${team}/${pose}: HTTP 200 + image/webp + ${bytes} byte`, () =>
            res.status === 200 && type.includes("image/webp") && bytes > 50_000)
        } catch (e: any) {
          test(`${team}/${pose}: HTTP 200`, () => {
            throw new Error(`fetch gagal: ${e.message}`)
          })
        }
      }
    }
  } else {
    console.log("\n── H. HTTP 200: dilewati (set MB_MASCOT_HTTP_BASE untuk mengaktifkan) ──")
  }

  console.log("\n" + "=".repeat(60))
  console.log(`Hasil: ${passed} lulus, ${failed} gagal`)
  if (failed > 0) {
    process.exit(1)
  }
  process.exit(0)
}

main()
