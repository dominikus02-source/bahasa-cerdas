/**
 * Test aset maskot Main Bersama — 4 pose per regu (2026-09-22).
 * Pola QA repo (tsx standalone, tanpa framework test).
 *
 * Jalankan: npx tsx scripts/test-main-bersama-mascot-assets.ts
 *
 * Opsional (butuh dev server hidup) untuk memverifikasi HTTP 200:
 *   MB_MASCOT_HTTP_BASE=http://localhost:3000 npx tsx scripts/test-main-bersama-mascot-assets.ts
 *
 * Yang dikunci tes ini:
 *  - READY/MOVE/CELEBRATE locked 4/4 + PODIUM candidate 4/4
 *  - path URL == path fisik (invariant case — Linux/Vercel case-sensitive)
 *  - runtime = WebP valid, PUNYA kanal alpha, dimensi 1024, ukuran hemat
 *  - master PNG lossless empat pose tetap utuh di docs/
 *  - READY, MOVE, dan CELEBRATE locked tidak tersentuh sejak commit terakhir
 *  - tidak ada ZIP/drop lama di source dir (satu sistem penamaan)
 *  - TeamMascot merender setiap pose; TeamBadge tetap fallback untuk team tak dikenal
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
const CELEBRATE_DIR = path.join(REPO, "docs", "main-bersama", "art-source", "mascots", "celebrate")
const PODIUM_DIR = path.join(REPO, "docs", "main-bersama", "art-source", "mascots", "podium")
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

function expected(team: string, pose: (typeof POSES)[number] = "ready") {
  return `/main-bersama/jelajah/mascots/jelajah-${team}-${pose}.webp`
}

/** Arsip master lossless PNG per pose. */
function masterPath(team: string, pose: (typeof POSES)[number]) {
  const dir =
    pose === "ready"
      ? MASTER_DIR
      : pose === "move"
        ? MOVE_DIR
        : pose === "celebrate"
          ? CELEBRATE_DIR
          : PODIUM_DIR
  return path.join(dir, `jelajah-${team}-${pose}.png`)
}

/** Semua pose punya runtime art; TeamBadge tetap defensive fallback. */
const FILLED_POSES = POSES

async function main() {
  console.log("\n── A. Registry: READY/MOVE/CELEBRATE locked + PODIUM candidate ──")
  for (const team of TEAM_IDS) {
    test(`${team}: ready terisi`, () => TEAM_MASCOTS[team].ready.src === expected(team, "ready"))
  }
  for (const team of TEAM_IDS) {
    test(`${team}: move terisi`, () => TEAM_MASCOTS[team].move.src === expected(team, "move"))
  }
  for (const team of TEAM_IDS) {
    test(`${team}: celebrate terisi`, () =>
      TEAM_MASCOTS[team].celebrate.src === expected(team, "celebrate"))
  }
  for (const team of TEAM_IDS) {
    test(`${team}: podium terisi`, () => TEAM_MASCOTS[team].podium.src === expected(team, "podium"))
  }
  test("total slot kosong = 0", () =>
    TEAM_IDS.reduce(
      (n, t) => n + POSES.filter((p) => TEAM_MASCOTS[t][p].src === null).length,
      0
    ) === 0)
  test("tepat 16 slot src terisi (4 pose × 4 regu)", () =>
    TEAM_IDS.reduce((n, t) => n + POSES.filter((p) => TEAM_MASCOTS[t][p].src !== null).length, 0) === 16)
  test("semua src lowercase (aman di Linux)", () =>
    TEAM_IDS.every((t) =>
      FILLED_POSES.every((p) => {
        const s = TEAM_MASCOTS[t][p].src as string
        return s === s.toLowerCase()
      })))
  test("semua src di bawah /main-bersama/jelajah/mascots/", () =>
    TEAM_IDS.every((t) =>
      FILLED_POSES.every((p) =>
        (TEAM_MASCOTS[t][p].src as string).startsWith("/main-bersama/jelajah/mascots/"))))
  test("semua src berekstensi .webp", () =>
    TEAM_IDS.every((t) =>
      FILLED_POSES.every((p) => (TEAM_MASCOTS[t][p].src as string).endsWith(".webp"))))
  test("TIDAK ada src yang masih .png", () =>
    TEAM_IDS.every((t) =>
      FILLED_POSES.every((p) => !(TEAM_MASCOTS[t][p].src as string).endsWith(".png"))))
  test("src tiap pose memakai suffix pose-nya sendiri (tidak saling menimpa)", () =>
    TEAM_IDS.every((t) =>
      FILLED_POSES.every((p) => (TEAM_MASCOTS[t][p].src as string).endsWith(`-${p}.webp`))))

  console.log("\n── B. URL ↔ path fisik (invariant case, Linux/Vercel) ──")
  for (const team of TEAM_IDS) {
    for (const pose of FILLED_POSES) {
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

  console.log("\n── C. Runtime WebP (semua pose): container valid, alpha hadir, hemat ──")
  for (const team of TEAM_IDS) {
    for (const pose of FILLED_POSES) {
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
  test("16 runtime WebP ukurannya berbeda (16 artwork distinct)", () =>
    new Set(
      TEAM_IDS.flatMap((t) =>
        FILLED_POSES.map((p) =>
          fs.statSync(path.join(PUBLIC_DIR, (TEAM_MASCOTS[t][p].src as string).slice(1))).size
        )
      )
    ).size === 16)

  console.log("\n── D. Master lossless PNG semua pose tetap utuh di docs/ (bukan runtime) ──")
  for (const team of TEAM_IDS) {
    for (const pose of FILLED_POSES) {
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

  console.log("\n── D2. READY/MOVE/CELEBRATE LOCKED tidak berubah (bukti vs commit terakhir) ──")
  try {
    const { execSync } = require("child_process")
    const changedIn = (args: string) =>
      execSync(`git diff --name-only HEAD -- ${args}`, { cwd: REPO, encoding: "utf8" }).trim()

    const readyRuntime = TEAM_IDS.map(
      (t) => `public/main-bersama/jelajah/mascots/jelajah-${t}-ready.webp`
    )
    const changedReady = changedIn(readyRuntime.join(" "))
    test("4 runtime READY tidak tersentuh sejak commit terakhir", () => changedReady === "")
    if (changedReady) console.log(`        ↳ berubah: ${changedReady}`)

    test("master READY di docs/ tidak tersentuh", () =>
      changedIn("docs/main-bersama/art-source/mascots/ready") === "")

    const moveRuntime = TEAM_IDS.map(
      (t) => `public/main-bersama/jelajah/mascots/jelajah-${t}-move.webp`
    )
    const changedMove = changedIn(moveRuntime.join(" "))
    test("4 runtime MOVE tidak tersentuh sejak commit terakhir", () => changedMove === "")
    if (changedMove) console.log(`        ↳ berubah: ${changedMove}`)

    test("master MOVE di docs/ tidak tersentuh", () =>
      changedIn("docs/main-bersama/art-source/mascots/move") === "")

    const celebrateRuntime = TEAM_IDS.map(
      (t) => `public/main-bersama/jelajah/mascots/jelajah-${t}-celebrate.webp`
    )
    const changedCelebrate = changedIn(celebrateRuntime.join(" "))
    test("4 runtime CELEBRATE tidak tersentuh sejak commit terakhir", () => changedCelebrate === "")
    if (changedCelebrate) console.log(`        ↳ berubah: ${changedCelebrate}`)

    test("master CELEBRATE di docs/ tidak tersentuh", () =>
      changedIn("docs/main-bersama/art-source/mascots/celebrate") === "")
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
  test("tidak ada ZIP pengiriman di source dir (semua pose)", () =>
    [MASTER_DIR, MOVE_DIR, CELEBRATE_DIR, PODIUM_DIR].every((d) =>
      fs.readdirSync(d).every((f) => !f.toLowerCase().endsWith(".zip"))))

  console.log("\n── F. Fallback TeamBadge + render per pose ──")
  const fallback = renderToStaticMarkup(React.createElement(TeamBadge, { teamId: "elang" }))
  test("TeamBadge merender markup badge (svg + mb-team-badge)", () =>
    fallback.includes("mb-team-badge") && fallback.includes("<svg"))

  const podiumPose = renderToStaticMarkup(
    React.createElement(TeamMascot, { teamId: "rusa", pose: "podium" as const })
  )
  test("pose 'podium' (src ada) → <img> dengan src PODIUM yang benar", () =>
    podiumPose.includes("<img") &&
    podiumPose.includes(expected("rusa", "podium")) &&
    !podiumPose.includes('class="mb-team-badge"'))

  for (const pose of FILLED_POSES) {
    const html = renderToStaticMarkup(
      React.createElement(TeamMascot, { teamId: "elang", pose, size: 64 })
    )
    test(`pose '${pose}' (src ada) → <img> dengan src ${pose.toUpperCase()} yang benar`, () =>
      html.includes("<img") &&
      html.includes(expected("elang", pose)) &&
      !html.includes('class="mb-team-badge"'))
  }

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

  for (const team of TEAM_IDS) {
    const html = renderToStaticMarkup(
      React.createElement(TeamMascot, { teamId: team, pose: "podium" as const, size: 64 })
    )
    test(`${team}: render PODIUM memuat src + tidak ada badge fallback`, () =>
      html.includes(expected(team, "podium")) && !html.includes('class="mb-team-badge"'))
  }

  console.log("\n── G. TeamBadge masih diekspor dari registry (kontrak 8B) ──")
  test("registry re-export TeamBadge", () => typeof TeamBadge === "function")

  const httpBase = process.env.MB_MASCOT_HTTP_BASE
  if (httpBase) {
    console.log(`\n── H. HTTP 200 (opsional, base=${httpBase}) ──`)
    for (const team of TEAM_IDS) {
      for (const pose of FILLED_POSES) {
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
