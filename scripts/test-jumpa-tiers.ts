/**
 * JUMPA Fase 3 — uji paket Gratis/Premium, kebijakan media (performa),
 * preferensi, dan wiring (penegakan server, bundle lazy, tanpa emoji/hex).
 * Murni (tanpa DB/jaringan). Jalankan: npm run test:jumpa-tiers
 */
import { readFileSync, readdirSync } from "fs"
import { join as pathJoin } from "path"
import {
  JUMPA_TIERS,
  JUMPA_MURID_FREE,
  JUMPA_UPGRADE_URL,
  cameraCapFor,
  checkDailyQuota,
  limitsFor,
  startOfJakartaDay,
  tierFromCreatedMetadata,
  tierView,
} from "../lib/jumpa/tiers"
import { JUMPA_CAPS } from "../lib/jumpa/caps"
import { tierForPlan } from "../lib/jumpa/entitlement"
import { classifyDevice, publishPolicy, receivePolicy } from "../components/jumpa/media-policy"
import { DEFAULT_MEDIA_PREFS, parseMediaPrefs } from "../components/jumpa/media-prefs"
import { shortName } from "../components/jumpa/format"

let passed = 0
let failed = 0
function check(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✅ ${label}`) }
  else { failed++; console.log(`  ❌ ${label}`) }
}
const read = (p: string) => readFileSync(pathJoin(process.cwd(), p), "utf8")

console.log("\n1. Tabel paket")
const F = JUMPA_TIERS.FREE
const P = JUMPA_TIERS.PREMIUM
check("Gratis: durasi ruang guru lebih pendek dari Premium", F.rooms.KELAS.maxDurationMin < P.rooms.KELAS.maxDurationMin && F.rooms.GURU.maxDurationMin < P.rooms.GURU.maxDurationMin)
check("Gratis: durasi 40–45 menit (1 JP)", F.rooms.KELAS.maxDurationMin >= 40 && F.rooms.KELAS.maxDurationMin <= 45)
check("Gratis: peserta lebih sedikit dari Premium", F.rooms.KELAS.maxParticipants < P.rooms.KELAS.maxParticipants && F.rooms.GURU.maxParticipants < P.rooms.GURU.maxParticipants)
check("Gratis: kelas 30 orang (keputusan CEO)", F.rooms.KELAS.maxParticipants === 30)
check("Gratis: ruang guru 10/45, 3 ruang per hari (tetap)", F.rooms.GURU.maxParticipants === 10 && F.rooms.GURU.maxDurationMin === 45 && F.roomsPerDay === 3)
check("Gratis: maks 720p, Premium 1080p", F.maxCameraHeight === 720 && P.maxCameraHeight === 1080)
check("Gratis: kuota ruang per hari, Premium tanpa batas", typeof F.roomsPerDay === "number" && F.roomsPerDay > 0 && P.roomsPerDay === null)
check("Gratis: tanpa rekaman", F.features.recording === false)
check("Premium = batas penuh Fase 2 (KELAS 50/120, GURU 25/120)", P.rooms.KELAS.maxParticipants === 50 && P.rooms.KELAS.maxDurationMin === 120 && P.rooms.GURU.maxParticipants === 25 && P.rooms.GURU.maxDurationMin === 120)
check("JUMPA_CAPS diturunkan dari tabel paket (satu sumber)", JUMPA_CAPS.KELAS.maxParticipants === P.rooms.KELAS.maxParticipants && JUMPA_CAPS.MURID.maxDurationMin === JUMPA_MURID_FREE.maxDurationMin)
check("Ruang MURID: gratis 8, premium 15", limitsFor("FREE", "MURID").maxParticipants === 8 && limitsFor("PREMIUM", "MURID").maxParticipants === 15 && limitsFor("FREE", "MURID").maxDurationMin === 60)
check("limitsFor mengembalikan salinan (tabel tidak bisa diubah pemanggil)", (() => { const l = limitsFor("FREE", "KELAS"); l.maxDurationMin = 999; return F.rooms.KELAS.maxDurationMin !== 999 })())
check("Kamera ruang MURID maks 720p", cameraCapFor("PREMIUM", "MURID") === 720)

console.log("\n2. Hak paket dari langganan yang ada")
check("PRO (termasuk trial guru) → PREMIUM", tierForPlan("PRO") === "PREMIUM")
check("FOUNDER → PREMIUM", tierForPlan("FOUNDER") === "PREMIUM")
check("FREE → FREE", tierForPlan("FREE") === "FREE")
check("MURID_PREMIUM tidak membuka ruang guru Premium", tierForPlan("MURID_PREMIUM") === "FREE")
check("Plan tidak dikenal / null → FREE", tierForPlan(null) === "FREE" && tierForPlan("SCHOOL") === "FREE")
const ent = read("lib/jumpa/entitlement.ts")
check("entitlement memakai resolvePlan() yang sudah ada", ent.includes("resolvePlan(userId)") && ent.includes("@/lib/premium-economy/plans"))
check("Gagal baca DB → FREE (fail-closed)", ent.includes('return { tier: "FREE"'))

console.log("\n3. Kuota ruang per hari")
const limit = F.roomsPerDay as number
check("Gratis: di bawah kuota boleh", checkDailyQuota("FREE", "KELAS", limit - 1).ok)
const deny = checkDailyQuota("FREE", "GURU", limit)
check("Gratis: kuota habis → TIER_DAILY_LIMIT", !deny.ok && deny.code === "TIER_DAILY_LIMIT")
check("Pesan kuota berbahasa Indonesia", !deny.ok && /per hari/.test(deny.message))
check("Premium: tanpa batas", checkDailyQuota("PREMIUM", "KELAS", 500).ok)
check("Ruang MURID tidak dihitung kuota", checkDailyQuota("FREE", "MURID", 99).ok)
const d = startOfJakartaDay(new Date("2026-10-18T16:30:00Z")) // 23:30 WIB tgl 18
check("Awal hari WIB benar (23:30 WIB → 00:00 WIB hari yang sama)", d.toISOString() === "2026-10-17T17:00:00.000Z")
const d2 = startOfJakartaDay(new Date("2026-10-18T17:10:00Z")) // 00:10 WIB tgl 19
check("Lewat tengah malam WIB → hari baru", d2.toISOString() === "2026-10-18T17:00:00.000Z")

console.log("\n4. Tampilan paket & ajakan upgrade")
const v = tierView({ tier: "FREE", kind: "KELAS", maxParticipants: 30, maxDurationMin: 45, viewerIsGuruCreator: true })
check("Guru pembuat ruang Gratis melihat ajakan upgrade", v.canUpgrade && v.upgradeUrl === JUMPA_UPGRADE_URL)
check("Peserta lain (murid) tidak melihat ajakan", !tierView({ tier: "FREE", kind: "KELAS", maxParticipants: 30, maxDurationMin: 45, viewerIsGuruCreator: false }).canUpgrade)
check("Ruang MURID tidak pernah menampilkan ajakan", !tierView({ tier: "FREE", kind: "MURID", maxParticipants: 8, maxDurationMin: 60, viewerIsGuruCreator: true }).canUpgrade)
check("Premium tidak menampilkan ajakan", !tierView({ tier: "PREMIUM", kind: "GURU", maxParticipants: 25, maxDurationMin: 120, viewerIsGuruCreator: true }).canUpgrade)
check("Ruang lama (tanpa tier di metadata) = PREMIUM (perilaku Fase 2)", tierFromCreatedMetadata({ kind: "KELAS" }) === "PREMIUM" && tierFromCreatedMetadata(null) === "PREMIUM")
check("Metadata tier FREE terbaca", tierFromCreatedMetadata({ tier: "FREE" }) === "FREE")
check("URL upgrade = halaman langganan yang sudah ada", JUMPA_UPGRADE_URL === "/guru/berlangganan")

console.log("\n5. Penegakan di server")
const svc = read("lib/jumpa/service.ts")
check("createRoom memakai limitsFor(tier, kind)", svc.includes("limitsFor(tier, req.kind"))
check("createRoom menegakkan kuota harian", svc.includes("checkDailyQuota(tier, req.kind, createdToday)"))
check("createRoom menyimpan tier di event ROOM_CREATED", svc.includes('action: "ROOM_CREATED"') && svc.includes("tier,"))
check("createRoom: ruang MURID memakai tier pembuat", svc.includes("Ruang MURID memakai tier pembuat"))
check("loadRoomContext membaca tier ruang", svc.includes("tierFromCreatedMetadata(created?.metadata)"))
const tokenRoute = read("app/api/jumpa/rooms/[code]/token/route.ts")
check("Token API mengirim tierView (batas dari baris ruang)", tokenRoute.includes("tierView({") && tokenRoute.includes("maxParticipants: ctx.room.maxParticipants"))
check("Token API tetap menegakkan kapasitas lewat evaluateJoin", tokenRoute.includes("loadRoomContext(code, user, activeOthers"))
const createRoute = read("app/api/jumpa/rooms/route.ts")
check("Create API meneruskan kode TIER_DAILY_LIMIT + upgradeUrl", createRoute.includes("result.extra"))
check("Tidak ada angka paket di luar tiers.ts (caps.ts turunan)", !/maxDurationMin: 45/.test(read("lib/jumpa/caps.ts")) && read("lib/jumpa/caps.ts").includes("JUMPA_TIERS.PREMIUM"))

console.log("\n6. Kebijakan media (ringan di HP)")
const android = classifyDevice({ userAgent: "Mozilla/5.0 (Linux; Android 11; SM-A125F) Chrome/120 Mobile", hardwareConcurrency: 8, deviceMemory: 3 })
const iphone = classifyDevice({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari", hardwareConcurrency: 6, deviceMemory: undefined })
const ipad = classifyDevice({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari", maxTouchPoints: 5 })
const laptop = classifyDevice({ userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120", hardwareConcurrency: 8, deviceMemory: 8 })
check("Android RAM 3 GB terdeteksi HP lemah", android.mobile && android.android && android.lowEnd)
check("iPhone & iPadOS terdeteksi iOS", iphone.ios && ipad.ios && ipad.mobile)
check("Codec: H.264 di iOS, VP8 di Android & desktop", publishPolicy("auto", iphone, 720).codec === "h264" && publishPolicy("auto", android, 720).codec === "vp8" && publishPolicy("auto", laptop, 720).codec === "vp8")
const pa = publishPolicy("auto", android, 720)
check("HP lemah Otomatis: 360p ≤ 20 fps", pa.capture.height === 360 && pa.capture.fps <= 20)
const pl = publishPolicy("auto", laptop, 1080)
check("Desktop Otomatis: 720p, 2 lapis simulcast tambahan", pl.capture.height === 720 && pl.layers.length === 2)
check("Lapisan simulcast urut rendah → tinggi & di bawah capture", pl.layers.every((l, i, a) => l.height < pl.capture.height && (i === 0 || a[i - 1].height < l.height)))
check("HP Otomatis fps lebih rendah dari desktop", publishPolicy("auto", { ...android, lowEnd: false }, 720).capture.fps < 30)
check("Hemat Data: 360p/15 fps + audio speech", publishPolicy("hemat", laptop, 1080).capture.height === 360 && publishPolicy("hemat", laptop, 1080).capture.fps === 15 && publishPolicy("hemat", laptop, 1080).audio === "speech")
check("HD Gratis dibatasi 720p", publishPolicy("hd", laptop, 720).capture.height === 720)
check("HD Premium desktop 1080p", publishPolicy("hd", laptop, 1080).capture.height === 1080)
check("HD di HP tetap maks 720p", publishPolicy("hd", iphone, 1080).capture.height === 720)
const rm = receivePolicy("auto", android)
check("HP: grid 4 tile per halaman, strip dibatasi", rm.pageSize === 4 && rm.stripMax <= 6)
check("Desktop: grid 16 tile per halaman (seperti Meet)", receivePolicy("auto", laptop).pageSize === 16)
check("Koneksi lemah → kualitas terima rendah & strip lebih kecil", receivePolicy("auto", laptop, true).remoteQuality === "low" && receivePolicy("auto", laptop, true).stripMax < receivePolicy("auto", laptop).stripMax)
check("Hemat Data di HP: pixelDensity 1", receivePolicy("hemat", android).pixelDensity === 1)

console.log("\n7. Preferensi media")
const old = parseMediaPrefs(JSON.stringify({ camera: false, mic: true }))
check("Preferensi Fase 1/2 tetap terbaca (default field baru)", old.camera === false && old.quality === "auto" && old.audioOnly === false && old.noiseSuppression === true)
check("Kualitas tak dikenal → auto", parseMediaPrefs(JSON.stringify({ quality: "ultra" })).quality === "auto")
check("deviceId aneh dibuang", parseMediaPrefs(JSON.stringify({ devices: { videoinput: "<script>", audioinput: "abc123" } })).devices.videoinput === undefined)
check("JSON rusak → default", parseMediaPrefs("{oops").camera === DEFAULT_MEDIA_PREFS.camera)

console.log("\n8. Nama di strip pembicara")
check("'Dewi Permata' → 'Dewi P.' (tidak terpotong)", shortName("Dewi Permata") === "Dewi P.")
check("Satu kata panjang dipendekkan rapi", shortName("Muhammadiyahsyah").length <= 10)
check("Nama kosong → 'Peserta'", shortName("  ") === "Peserta")
const tile = read("components/jumpa/ParticipantTile.tsx")
check("Tile kecil memakai shortName + nama lengkap di aria/title", tile.includes("shortName(name)") && tile.includes("aria-label={label}"))

console.log("\n9. Performa & bundle")
const files = readdirSync(pathJoin(process.cwd(), "components/jumpa")).filter((f) => /\.(tsx?|css)$/.test(f))
const all = files.map((f) => [f, read(`components/jumpa/${f}`)] as const)
check("Tanpa framer-motion di JUMPA", all.every(([, s]) => !/from "framer-motion"/.test(s)))
const app = read("components/jumpa/JumpaApp.tsx")
check("Ruang (LiveKit) dimuat lazy lewat next/dynamic", /dynamic\(loadRoomView/.test(app) && app.includes('import("./JumpaRoomView")'))
const eager = ["JumpaApp.tsx", "JumpaLobby.tsx", "JumpaHome.tsx", "StartJumpaButton.tsx", "SettingsPanel.tsx", "TierUi.tsx", "media-policy.ts", "media-prefs.ts"]
check("Lobby/beranda/tombol KelasKu tidak meng-import livekit", eager.every((f) => !/from "(livekit-client|@livekit\/components-react)"/.test(read(`components/jumpa/${f}`))))
check("JumpaApp tidak meng-import JumpaRoomView secara statis", !/^import .*JumpaRoomView"/m.test(app.replace(/^import type .*$/gm, "")))
const room = read("components/jumpa/JumpaRoomView.tsx")
check("Stage di-memo & tile di-memo", room.includes("const Stage = memo(") && tile.includes("memo(Tile"))
check("Grid berhalaman (usePagination)", room.includes("usePager(pageSize, tracks, speakingKey)"))
check("Hitung mundur di komponen sendiri (tidak me-render ulang ruang)", !room.includes("useCountdown(") && room.includes("<CountdownChip"))
const tierUiSrc = read("components/jumpa/TierUi.tsx")
check("Hitung mundur hanya di 10 menit terakhir (semua paket)", tierUiSrc.includes("COUNTDOWN_SHOW_SEC = 10 * 60") && !room.includes("alwaysShow"))
check("Rekaman = Premium segera, blur aktif untuk premium", JUMPA_TIERS.PREMIUM.features.recording === false && JUMPA_TIERS.PREMIUM.features.backgroundBlur === true)
const ctl = read("components/jumpa/media-controller.tsx")
check("adaptiveStream + dynacast + simulcast", ctl.includes("adaptiveStream:") && ctl.includes("dynacast: true") && ctl.includes("simulcast: true"))
check("Mode audio saja berhenti berlangganan video kamera", ctl.includes("pub.setSubscribed(false)"))
check("Koneksi lemah dipantau (ConnectionQuality)", ctl.includes("ConnectionQuality.Poor"))
const css = read("components/jumpa/jumpa.css")
check("HP: backdrop-filter dimatikan", /@media \(max-width: 767px\), \(pointer: coarse\) \{\s*\.jumpa-glass \{\s*-webkit-backdrop-filter: none;/.test(css))
check("Nameplate tanpa blur", !/\.jumpa-nameplate[^{]*\{[^}]*backdrop-filter:/.test(css))

console.log("\n10. Tema & ikon")
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F900}-\u{1F9FF}]/u
check("Tanpa emoji di komponen JUMPA", all.every(([, s]) => !EMOJI.test(s)))
check("Tanpa hex di jumpa.css (token tema)", !/#[0-9a-fA-F]{3,8}\b/.test(css))
const ui = all.filter(([f]) => f.endsWith(".tsx")).map(([, s]) => s).join("\n")
check("Teks UI kunci berbahasa Indonesia", ["Pengaturan", "Hemat Data", "Mode audio saja", "Peredam bising", "Lihat Premium", "Kualitas video"].every((t) => ui.includes(t)))

console.log("\n11. Copy singkat, tanpa pengulangan")
const tierUi = read("components/jumpa/TierUi.tsx")
const sheet = tierUi.slice(tierUi.indexOf("export function UpgradeSheet"))
check("Lembar upgrade: angka Premium kelas hanya sekali", (sheet.match(/P\.rooms\.KELAS\.maxDurationMin/g) ?? []).length === 1)
check("Lembar upgrade: tanpa paragraf penjelasan ganda", !sheet.includes("{body}"))
const home = read("components/jumpa/JumpaHome.tsx")
check("Kuota habis tidak diulang di banner error", /TIER_DAILY_LIMIT"\) \{ setLimitHit\(true\); return; \}/.test(home))

console.log(`\n${passed} lulus, ${failed} gagal\n`)
if (failed > 0) process.exit(1)
