/**
 * test:jumpa-input — regresi input JUMPA (bug "Topik (opsional) tidak bisa
 * diketik" di Android, 19 Okt 2026).
 *
 * Akar masalah: JumpaHome merender label waktu ("12 mnt", "Hari ini · 14.30")
 * dengan Date.now() saat SSR & hidrasi. Jam server ≠ jam HP (atau hidrasi
 * lambat melewati pergantian menit) → teks beda → React #418 → seluruh DOM
 * dibuang & dibuat ulang → input yang sedang difokus hilang beserta
 * ketikannya.
 *
 * Uji di sini (tanpa browser, jalan di CI):
 *  1. SSR JumpaHome identik walau jam berbeda 90 detik / 1 jam (deterministik).
 *  2. Semua input/textarea JUMPA aman untuk IME: tidak memotong value di
 *     onChange (pakai maxLength), Enter obrolan diabaikan saat komposisi.
 *  3. Input ≥16px di layar sentuh (Safari iOS tidak memperbesar halaman).
 * Uji browser (ketik, insertText, komposisi IME, ketik sebelum hidrasi):
 * scripts/e2e/jumpa-ketik.mjs.
 */
import { readFileSync, readdirSync } from "fs"
import { join } from "path"
import * as React from "react"
import { renderToString } from "react-dom/server"
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime"
import JumpaHome from "../components/jumpa/JumpaHome"
import type { JumpaHomeData } from "../lib/jumpa/service"

let passed = 0
let failed = 0
function check(label: string, cond: boolean, extra = "") {
  if (cond) { passed++; console.log(`  ✓ ${label}`) } else { failed++; console.log(`  ✗ ${label}${extra ? ` — ${extra}` : ""}`) }
}
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8")

console.log("\n1. SSR JumpaHome tidak bergantung jam")
const T0 = Date.parse("2026-10-19T03:12:40Z")
const data: JumpaHomeData = {
  effective: "GURU",
  isJunior: false,
  rooms: [
    { code: "abc-defg-hij", title: "Rapat MGMP", kind: "GURU", status: "LIVE", place: null, mine: true, startedAt: new Date(T0 - 12 * 60_000 - 30_000).toISOString(), scheduledAt: null, present: { count: 2, initials: ["RS", "JK"] } },
    { code: "klm-nopq-rst", title: "Diskusi cerpen", kind: "KELAS", status: "SCHEDULED", place: "Kelas 8B", mine: true, startedAt: null, scheduledAt: new Date(T0 + 40 * 60_000).toISOString(), present: { count: 0, initials: [] } },
  ],
  groups: [{ id: "g1", name: "Kelas 8B" }],
  communities: [{ id: "c1", name: "MGMP Bahasa Indonesia" }],
  canSeePanel: false,
  plan: { tier: "FREE", trialing: false, roomsToday: 1, roomsPerDay: 3, kelas: { maxParticipants: 30, maxDurationMin: 45 }, guru: { maxParticipants: 25, maxDurationMin: 45 }, upgradeUrl: "/harga" },
}
const router = { push() {}, replace() {}, refresh() {}, back() {}, forward() {}, prefetch() {} }
const realNow = Date.now
function renderAt(ms: number): string {
  Date.now = () => ms
  try {
    return renderToString(
      React.createElement(AppRouterContext.Provider, { value: router as never },
        React.createElement(JumpaHome, { data, displayName: "Rina Sari", dashboardHref: "/guru/beranda" })),
    )
  } finally {
    Date.now = realNow
  }
}
const a = renderAt(T0)
const b = renderAt(T0 + 90_000)
const c = renderAt(T0 + 3_600_000)
check("Render SSR berhasil & memuat input Topik", a.includes('aria-label="Topik ruang"'))
check("HTML sama walau jam +90 detik (pergantian menit)", a === b)
check("HTML sama walau jam +1 jam", a === c)
check("Label durasi berjalan tidak dirender di server", !/\d+ mnt</.test(a))
check("Jadwal pra-mount hanya jam WIB (deterministik)", a.includes("10.52 WIB"))

console.log("\n2. Input aman IME (Gboard/Samsung)")
const dir = "components/jumpa"
const files = readdirSync(dir).filter((f) => f.endsWith(".tsx"))
for (const f of files) {
  const src = read(join(dir, f))
  const bad = src.match(/onChange=\{\(e\) => [^}]*e\.target\.value\.(slice|substring|substr|replace)\(/g)
  check(`${f}: onChange tidak memotong/mengubah value`, !bad, bad?.join(" | "))
}
const panels = read(`${dir}/RoomPanels.tsx`)
check("Obrolan: Enter diabaikan saat komposisi IME", panels.includes("e.nativeEvent.isComposing || e.keyCode === 229"))
check("Obrolan & laporan pakai maxLength", panels.includes("maxLength={JUMPA_CHAT_MAX_LEN}") && panels.includes("maxLength={1000}"))
const home = read(`${dir}/JumpaHome.tsx`)
check("JumpaHome: jam null sampai mount", home.includes("useState<number | null>(null)"))
for (const lbl of ['aria-label="Topik ruang"', 'aria-label="Topik belajar"']) {
  check(`${lbl} pakai maxLength`, new RegExp(`maxLength=\\{\\d+\\}[\\s\\S]{0,200}?${lbl}`).test(home))
}
check("Kode ruang pakai maxLength", home.includes("maxLength={120}"))
const form = read(`${dir}/ScheduleForm.tsx`)
check("Form jadwal: judul & cari orang pakai maxLength", form.includes("maxLength={80}") && form.includes("maxLength={60}"))

console.log("\n3. Safari iOS: input ≥16px di layar sentuh")
const css = read(`${dir}/jumpa.css`)
check(".jumpa-input 16px untuk pointer: coarse", /@media \(pointer: coarse\) \{ \.jumpa-input \{ font-size: 16px; \} \}/.test(css))
check(".jumpa-join-input 16px", /\.jumpa-join-input \{[^}]*font-size: 16px/.test(css))

console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`)
if (failed > 0) process.exit(1)
