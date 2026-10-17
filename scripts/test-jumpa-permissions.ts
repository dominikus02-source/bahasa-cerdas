/**
 * JUMPA Fase 1 — uji matriks izin & batas (murni, tanpa DB/jaringan).
 * Jalankan: npm run test:jumpa-permissions
 */
import { readFileSync } from "fs"
import { join as pathJoin } from "path"
import {
  canCreateRoom,
  effectiveRole,
  evaluateJoin,
  publishSourcesFor,
  PHASE1_CREATABLE_KINDS,
  type JoinInput,
  type JoinRelation,
  type JumpaActor,
} from "../lib/jumpa/permissions"
import { JUMPA_CAPS, capsFor, isPastDuration } from "../lib/jumpa/caps"
import { generateRoomCode, isValidRoomCode, generateLivekitRoomName } from "../lib/jumpa/code"
import { livekitCspOrigins } from "../lib/jumpa/config"
import { parseMediaPrefs, DEFAULT_MEDIA_PREFS } from "../components/jumpa/media-prefs"
import { gridColumns, initials, parseParticipantMeta } from "../components/jumpa/format"

let passed = 0
let failed = 0
function check(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✅ ${label}`) }
  else { failed++; console.log(`  ❌ ${label}`) }
}

const guru: JumpaActor = { role: "GURU", isFounder: false, isJunior: false }
const murid: JumpaActor = { role: "MURID", isFounder: false, isJunior: false }
const junior: JumpaActor = { role: "MURID", isFounder: false, isJunior: true }
const founder: JumpaActor = { role: "MURID", isFounder: true, isJunior: false }
const admin: JumpaActor = { role: "ADMIN", isFounder: false, isJunior: false }

const NOW = new Date("2026-10-18T03:00:00Z")
const noRel: JoinRelation = { isCreator: false, isGroupOwner: false, isGroupMember: false, groupActive: true, isExistingParticipant: false, isRemoved: false }
const room = { kind: "KELAS" as const, status: "LIVE" as const, isLocked: false, startedAt: new Date(NOW.getTime() - 10 * 60_000), maxDurationMin: 120, maxParticipants: 50 }
const join = (over: Partial<JoinInput> & { relation?: Partial<JoinRelation> }) =>
  evaluateJoin({ actor: guru, room, activeOthers: 0, now: NOW, ...over, relation: { ...noRel, ...over.relation } })

console.log("\n=== JUMPA — PERMISSIONS & CAPS ===\n")

console.log("1. Peran efektif")
check("GURU → GURU", effectiveRole(guru) === "GURU")
check("MURID → MURID", effectiveRole(murid) === "MURID")
check("Founder → GURU", effectiveRole(founder) === "GURU")
check("ADMIN non-founder → ditolak (null)", effectiveRole(admin) === null)

console.log("\n2. Buat ruang (Fase 1)")
const ownGroup = { ownedByActor: true, isActive: true }
check("Fase 1 hanya KELAS", PHASE1_CREATABLE_KINDS.length === 1 && PHASE1_CREATABLE_KINDS[0] === "KELAS")
check("Guru pemilik kelas boleh buat KELAS", canCreateRoom({ actor: guru, kind: "KELAS", group: ownGroup }).ok)
check("Founder boleh buat KELAS", canCreateRoom({ actor: founder, kind: "KELAS", group: ownGroup }).ok)
const notOwner = canCreateRoom({ actor: guru, kind: "KELAS", group: { ownedByActor: false, isActive: true } })
check("Guru BUKAN pemilik kelas ditolak (NOT_GROUP_OWNER)", !notOwner.ok && notOwner.code === "NOT_GROUP_OWNER")
const inactive = canCreateRoom({ actor: guru, kind: "KELAS", group: { ownedByActor: true, isActive: false } })
check("Kelas nonaktif ditolak", !inactive.ok && inactive.code === "GROUP_INACTIVE")
check("Tanpa kelas ditolak", !canCreateRoom({ actor: guru, kind: "KELAS", group: null }).ok)
const muridCreate = canCreateRoom({ actor: murid, kind: "KELAS", group: ownGroup })
check("Murid tidak bisa buat KELAS", !muridCreate.ok && muridCreate.code === "ROLE_NOT_ALLOWED")
const guruKind = canCreateRoom({ actor: guru, kind: "GURU", group: null })
check("Ruang GURU belum tersedia di Fase 1", !guruKind.ok && guruKind.code === "KIND_NOT_AVAILABLE")
const muridKind = canCreateRoom({ actor: murid, kind: "MURID", group: null })
check("Ruang MURID belum tersedia di Fase 1", !muridKind.ok && muridKind.code === "KIND_NOT_AVAILABLE")
check("Admin tidak bisa buat ruang", !canCreateRoom({ actor: admin, kind: "KELAS", group: ownGroup }).ok)
// Matriks Fase 2 (sudah ditegakkan bila kind dibuka)
const all = ["KELAS", "GURU", "MURID"] as const
check("[Fase 2] Murid boleh buat MURID", canCreateRoom({ actor: murid, kind: "MURID", group: null, allowedKinds: all }).ok)
check("[Fase 2] Junior tidak boleh buat MURID", !canCreateRoom({ actor: junior, kind: "MURID", group: null, allowedKinds: all }).ok)
check("[Fase 2] Guru tidak boleh buat MURID", !canCreateRoom({ actor: guru, kind: "MURID", group: null, allowedKinds: all }).ok)
check("[Fase 2] Murid tidak boleh buat GURU", !canCreateRoom({ actor: murid, kind: "GURU", group: null, allowedKinds: all }).ok)

console.log("\n3. Masuk ruang KELAS")
const creator = join({ relation: { isCreator: true } })
check("Pembuat (guru) = HOST", creator.ok && creator.roomRole === "HOST" && creator.accessVia === "CREATOR")
const owner = join({ relation: { isGroupOwner: true } })
check("Guru pemilik kelas = HOST", owner.ok && owner.roomRole === "HOST")
const member = join({ actor: murid, relation: { isGroupMember: true } })
check("Murid anggota kelas = MEMBER", member.ok && member.roomRole === "MEMBER" && member.effective === "MURID")
const juniorMember = join({ actor: junior, relation: { isGroupMember: true } })
check("Murid Junior anggota kelas boleh masuk ruang KELAS", juniorMember.ok)
const outsider = join({ actor: murid })
check("Murid luar kelas ditolak (NOT_INVITED)", !outsider.ok && outsider.code === "NOT_INVITED")
const otherGuru = join({ actor: guru })
check("Guru lain (bukan pemilik) ditolak", !otherGuru.ok && otherGuru.code === "NOT_INVITED")
check("Guru yang kebetulan anggota kelas tidak jadi peserta murid", !join({ actor: guru, relation: { isGroupMember: true } }).ok)
const inactiveMember = join({ actor: murid, relation: { isGroupMember: true, groupActive: false } })
check("Kelas nonaktif → murid ditolak", !inactiveMember.ok)
const adminJoin = join({ actor: admin, relation: { isGroupOwner: true } })
check("Admin ditolak", !adminJoin.ok && adminJoin.code === "ROLE_NOT_ALLOWED")

console.log("\n4. Status, kunci, kapasitas, durasi")
const ended = join({ room: { ...room, status: "ENDED" }, relation: { isCreator: true } })
check("Ruang ENDED ditolak bahkan untuk host", !ended.ok && ended.code === "ROOM_ENDED")
const expired = join({ room: { ...room, startedAt: new Date(NOW.getTime() - 121 * 60_000) }, relation: { isCreator: true } })
check("Lewat durasi → ROOM_EXPIRED", !expired.ok && expired.code === "ROOM_EXPIRED")
check("Belum mulai tidak dianggap lewat durasi", join({ room: { ...room, startedAt: null }, relation: { isCreator: true } }).ok)
const locked = join({ actor: murid, room: { ...room, isLocked: true }, relation: { isGroupMember: true } })
check("Terkunci → murid baru ditolak (ROOM_LOCKED)", !locked.ok && locked.code === "ROOM_LOCKED")
check("Terkunci → peserta lama boleh masuk lagi", join({ actor: murid, room: { ...room, isLocked: true }, relation: { isGroupMember: true, isExistingParticipant: true } }).ok)
check("Terkunci → host tetap boleh", join({ room: { ...room, isLocked: true }, relation: { isCreator: true } }).ok)
const full = join({ actor: murid, activeOthers: 50, relation: { isGroupMember: true } })
check("Penuh → murid ditolak (ROOM_FULL)", !full.ok && full.code === "ROOM_FULL")
check("Penuh → host tetap boleh", join({ activeOthers: 50, relation: { isCreator: true } }).ok)
check("49 orang lain → masih boleh", join({ actor: murid, activeOthers: 49, relation: { isGroupMember: true } }).ok)
const removed = join({ actor: murid, relation: { isGroupMember: true, isRemoved: true } })
check("Pernah dikeluarkan → REMOVED", !removed.ok && removed.code === "REMOVED")
check("Semua pesan tolak berbahasa Indonesia", [outsider, locked, full, ended, expired, removed].every((d) => !d.ok && /[a-z]/.test(d.message) && !/forbidden|denied/i.test(d.message)))

console.log("\n5. Ruang MURID/GURU (aturan Fase 2, sudah ditegakkan)")
const mroom = { ...room, kind: "MURID" as const, maxParticipants: 8, maxDurationMin: 60 }
check("Murid sekelas boleh masuk ruang MURID", join({ actor: murid, room: mroom, relation: { isGroupMember: true } }).ok)
check("Guru tidak masuk ruang MURID", !join({ actor: guru, room: mroom, relation: { isGroupMember: true } }).ok)
check("Junior tidak masuk ruang MURID", !join({ actor: junior, room: mroom, relation: { isGroupMember: true } }).ok)
check("Murid bukan sekelas ditolak", !join({ actor: murid, room: mroom }).ok)
const groom = { ...room, kind: "GURU" as const }
check("Murid tidak masuk ruang GURU", !join({ actor: murid, room: groom, relation: { isGroupMember: true } }).ok)

console.log("\n6. Sumber publish & caps")
check("Fase 1 publish = kamera + mikrofon saja", JSON.stringify(publishSourcesFor("MEMBER", "MURID")) === '["camera","microphone"]')
check("Host pun belum dapat screen share di Fase 1", !publishSourcesFor("HOST", "GURU").includes("screen_share" as never))
check("Caps MURID 8 org / 60 mnt", JUMPA_CAPS.MURID.maxParticipants === 8 && JUMPA_CAPS.MURID.maxDurationMin === 60)
check("Caps KELAS 50 org / 120 mnt", capsFor("KELAS").maxParticipants === 50 && capsFor("KELAS").maxDurationMin === 120)
check("isPastDuration tepat di batas = belum lewat", !isPastDuration(new Date(NOW.getTime() - 60 * 60_000), 60, NOW))

console.log("\n7. Kode ruang")
const codes = new Set(Array.from({ length: 500 }, () => generateRoomCode()))
check("500 kode unik", codes.size === 500)
check("Semua kode valid xxx-xxxx-xxx", [...codes].every(isValidRoomCode))
check("Tanpa karakter ambigu (0 o 1 l i)", [...codes].every((c) => !/[01loi]/.test(c)))
check("Kode tidak valid ditolak", !isValidRoomCode("../etc") && !isValidRoomCode("ABC-DEFG-HIJ") && !isValidRoomCode(""))
check("Nama ruang LiveKit acak (bc-uuid)", /^bc-[0-9a-f-]{36}$/.test(generateLivekitRoomName()))

console.log("\n8. CSP & preferensi media")
check("CSP origin default jumpa.bahasacerdas.com", JSON.stringify(livekitCspOrigins("wss://jumpa.bahasacerdas.com")) === '["wss://jumpa.bahasacerdas.com","https://jumpa.bahasacerdas.com"]')
check("CSP origin ikut URL VPS lain", livekitCspOrigins("wss://media.contoh.id/").includes("wss://media.contoh.id"))
check("CSP abaikan URL non-ws", livekitCspOrigins("https://x.y").length === 0 && livekitCspOrigins("bukan url").length === 0)
check("Default media: kamera NYALA, mik NYALA", DEFAULT_MEDIA_PREFS.camera && DEFAULT_MEDIA_PREFS.mic)
check("Prefs kosong → default", JSON.stringify(parseMediaPrefs(null)) === JSON.stringify({ camera: true, mic: true }))
check("Prefs tersimpan dibaca", JSON.stringify(parseMediaPrefs('{"camera":false,"mic":true}')) === JSON.stringify({ camera: false, mic: true }))
check("Prefs rusak → default", parseMediaPrefs("{rusak").camera === true)
check("Prefs tipe salah → default per field", JSON.stringify(parseMediaPrefs('{"camera":"no","mic":false}')) === JSON.stringify({ camera: true, mic: false }))

console.log("\n9. Helper UI")
check("initials", initials("Siti Nur Aisyah") === "SA" && initials("budi") === "B" && initials("  ") === "?")
check("Metadata palsu diabaikan", parseParticipantMeta('{"bcRole":"ADMIN","roomRole":"OWNER"}').bcRole === null)
check("Metadata valid terbaca", parseParticipantMeta('{"bcRole":"GURU","roomRole":"HOST"}').roomRole === "HOST")
check("Grid mobile maks 2 kolom", gridColumns(12, false) === 2 && gridColumns(2, false) === 1)
check("Grid desktop 3x3 untuk 9", gridColumns(9, true) === 3 && gridColumns(1, true) === 1)

console.log("\n10. Struktur & guard")
const ROOT = pathJoin(import.meta.dirname, "..")
const read = (p: string) => readFileSync(pathJoin(ROOT, p), "utf-8")
const nextConfig = read("next.config.ts")
check("Permissions-Policy izinkan kamera untuk origin sendiri", nextConfig.includes("camera=(self)") && !nextConfig.includes('"camera=()'))
check("CSP connect-src memakai livekitCspOrigins", read("middleware.ts").includes("...livekitCspOrigins()"))
check("/jumpa/ self-auth (redirect ?next=)", read("lib/supabase/proxy.ts").includes('"/jumpa/"'))
check("Flag NEXT_PUBLIC_JUMPA_ENABLED default mati", read("lib/features.ts").includes('process.env.NEXT_PUBLIC_JUMPA_ENABLED === "true"'))
check("Layout JUMPA notFound bila flag mati", read("app/jumpa/layout.tsx").includes("if (!JUMPA_ENABLED) notFound()"))
for (const r of ["app/api/jumpa/rooms/route.ts", "app/api/jumpa/rooms/[code]/route.ts", "app/api/jumpa/rooms/[code]/token/route.ts"]) {
  const src = read(r)
  check(`${r}: flag guard + auth`, src.includes("jumpaDisabledResponse()") && src.includes("getUser()"))
}
check("Tombol KelasKu tersembunyi saat flag mati", read("components/jumpa/StartJumpaButton.tsx").includes("if (!JUMPA_ENABLED) return null"))
check("KelasKu memasang StartJumpaButton", read("app/(dashboard)/guru/kelasku/page.tsx").includes("<StartJumpaButton groupId={activeGroup.id}"))
const migration = read("prisma/migrations/20261018000000_jumpa_phase1/migration.sql")
check("Migration: 3 tabel + RLS enable", ["JumpaRoom", "JumpaParticipant", "JumpaEvent"].every((t) => migration.includes(`CREATE TABLE "${t}"`) && migration.includes(`ALTER TABLE "${t}" ENABLE ROW LEVEL SECURITY`)))
check("Migration add-only (tanpa DROP/ALTER COLUMN tabel lama)", !/^\s*DROP\s/im.test(migration) && !/ALTER TABLE "(?!Jumpa)/.test(migration))
const css = read("components/jumpa/jumpa.css")
check("jumpa.css tanpa hex hardcode (THEME RULE)", !/#[0-9a-fA-F]{3,8}\b/.test(css))
const ui = ["components/jumpa/JumpaLobby.tsx", "components/jumpa/JumpaRoomView.tsx", "components/jumpa/ParticipantTile.tsx", "components/jumpa/JumpaApp.tsx"].map(read).join("\n")
check("UI JUMPA tanpa bg-white/text-slate-900/hex", !/bg-white|text-slate-900|bg-\[#/.test(ui))
check("Label kontrol Bahasa Indonesia", ["Mikrofon", "Kamera", "Lainnya", "Keluar", "Gabung sekarang"].every((l) => ui.includes(l)))
const compose = read("ops/vps/docker-compose.yml")
check("Compose: livekit profile jumpa, 2 CPU / 1.5 GB", compose.includes('profiles: ["jumpa"]') && compose.includes("cpus: 2.0\n    mem_limit: 1536m"))
check("Compose: 7880 hanya localhost", compose.includes('"127.0.0.1:7880:7880"'))
check("Caddy situs JUMPA opsional via import glob", read("ops/vps/Caddyfile").includes("import /etc/caddy/conf.d/*.caddy") && read("ops/vps/caddy/jumpa.caddy").includes("jumpa.bahasacerdas.com"))

console.log(`\n${passed} lulus, ${failed} gagal\n`)
if (failed > 0) process.exit(1)
