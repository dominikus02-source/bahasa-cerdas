/**
 * JUMPA Fase 2 — uji jenis ruang (KELAS / GURU / MURID): pembuatan,
 * izin masuk lewat undangan/komunitas/tautan, batas, berbagi layar,
 * perlindungan anak (Arena Junior), dan wiring rute/UI.
 * Murni (tanpa DB/jaringan). Jalankan: npm run test:jumpa-room-types
 */
import { readFileSync } from "fs"
import { join as pathJoin } from "path"
import {
  canCreateRoom,
  evaluateJoin,
  publishSourcesFor,
  JUMPA_CREATABLE_KINDS,
  type JoinInput,
  type JoinRelation,
  type JumpaActor,
} from "../lib/jumpa/permissions"
import { JUMPA_CAPS, JUMPA_LINK_INVITE_TTL_HOURS, JUMPA_MURID_MAX_ACTIVE_ROOMS, roomEndsAt } from "../lib/jumpa/caps"
import { generateInviteToken, hashInviteToken, INVITE_TOKEN_RE } from "../lib/jumpa/code"

let passed = 0
let failed = 0
function check(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✅ ${label}`) }
  else { failed++; console.log(`  ❌ ${label}`) }
}
const read = (p: string) => readFileSync(pathJoin(process.cwd(), p), "utf8")

const guru: JumpaActor = { role: "GURU", isFounder: false, isJunior: false }
const murid: JumpaActor = { role: "MURID", isFounder: false, isJunior: false }
const junior: JumpaActor = { role: "MURID", isFounder: false, isJunior: true }
const founder: JumpaActor = { role: "ADMIN", isFounder: true, isJunior: false }
const admin: JumpaActor = { role: "ADMIN", isFounder: false, isJunior: false }
const NOW = new Date("2026-10-18T03:00:00Z")
const noRel: JoinRelation = { isCreator: false, isGroupOwner: false, isGroupMember: false, groupActive: true, isExistingParticipant: false, isRemoved: false }
const roomOf = (kind: "KELAS" | "GURU" | "MURID") => ({
  kind,
  status: "LIVE" as const,
  isLocked: false,
  startedAt: new Date(NOW.getTime() - 5 * 60_000),
  maxDurationMin: JUMPA_CAPS[kind].maxDurationMin,
  maxParticipants: JUMPA_CAPS[kind].maxParticipants,
})
const join = (kind: "KELAS" | "GURU" | "MURID", actor: JumpaActor, rel: Partial<JoinRelation> = {}, over: Partial<JoinInput> = {}) =>
  evaluateJoin({ actor, room: roomOf(kind), activeOthers: 0, now: NOW, ...over, relation: { ...noRel, ...rel } })

console.log("\n=== JUMPA FASE 2 — JENIS RUANG ===\n")

console.log("1. Batas per jenis")
check("Fase 2 membuka KELAS, GURU, MURID", JSON.stringify([...JUMPA_CREATABLE_KINDS]) === '["KELAS","GURU","MURID"]')
check("KELAS 50 org / 120 mnt", JUMPA_CAPS.KELAS.maxParticipants === 50 && JUMPA_CAPS.KELAS.maxDurationMin === 120)
check("GURU 25 org / 120 mnt", JUMPA_CAPS.GURU.maxParticipants === 25 && JUMPA_CAPS.GURU.maxDurationMin === 120)
check("MURID 8 org / 60 mnt", JUMPA_CAPS.MURID.maxParticipants === 8 && JUMPA_CAPS.MURID.maxDurationMin === 60)
check("Murid maksimal 1 ruang aktif", JUMPA_MURID_MAX_ACTIVE_ROOMS === 1)
check("roomEndsAt = mulai + durasi", roomEndsAt(NOW, 60)?.getTime() === NOW.getTime() + 3_600_000 && roomEndsAt(null, 60) === null)
const full = (k: "KELAS" | "GURU" | "MURID", actor: JumpaActor, rel: Partial<JoinRelation>) => join(k, actor, rel, { activeOthers: JUMPA_CAPS[k].maxParticipants })
check("GURU penuh (25) → ROOM_FULL", (() => { const d = full("GURU", guru, { isCommunityMember: true }); return !d.ok && d.code === "ROOM_FULL" })())
check("MURID penuh (8) → ROOM_FULL", (() => { const d = full("MURID", murid, { isGroupMember: true }); return !d.ok && d.code === "ROOM_FULL" })())
check("MURID lewat 60 mnt → ROOM_EXPIRED", (() => { const d = join("MURID", murid, { isCreator: true }, { room: { ...roomOf("MURID"), startedAt: new Date(NOW.getTime() - 61 * 60_000) } }); return !d.ok && d.code === "ROOM_EXPIRED" })())

console.log("\n2. Ruang GURU (guru↔guru)")
check("Guru buat ruang GURU tanpa komunitas", canCreateRoom({ actor: guru, kind: "GURU", group: null }).ok)
check("Founder buat ruang GURU", canCreateRoom({ actor: founder, kind: "GURU", group: null }).ok)
check("Guru buat ruang GURU untuk komunitas yang disetujui & ia anggota", canCreateRoom({ actor: guru, kind: "GURU", group: null, community: { actorIsMember: true, approved: true } }).ok)
check("Komunitas belum disetujui → ditolak", (() => { const d = canCreateRoom({ actor: guru, kind: "GURU", group: null, community: { actorIsMember: true, approved: false } }); return !d.ok && d.code === "NOT_COMMUNITY_MEMBER" })())
check("Bukan anggota komunitas → ditolak", !canCreateRoom({ actor: guru, kind: "GURU", group: null, community: { actorIsMember: false, approved: true } }).ok)
check("Murid tidak bisa buat ruang GURU", !canCreateRoom({ actor: murid, kind: "GURU", group: null }).ok)
check("Admin non-founder tidak bisa buat ruang", !canCreateRoom({ actor: admin, kind: "GURU", group: null }).ok)
check("Pembuat = HOST", (() => { const d = join("GURU", guru, { isCreator: true }); return d.ok && d.roomRole === "HOST" })())
check("Webinar: akun Guru terdaftar dengan kode dapat bergabung", (() => { const d = evaluateJoin({ actor: guru, room: { ...roomOf("GURU"), mode: "WEBINAR" }, activeOthers: 0, now: NOW, relation: noRel }); return d.ok && d.roomRole === "MEMBER" && d.accessVia === "LINK" })())
check("Webinar interaktif: akun Murid non-Junior terdaftar dapat bergabung", (() => { const d = evaluateJoin({ actor: murid, room: { ...roomOf("GURU"), mode: "WEBINAR" }, activeOthers: 0, now: NOW, relation: noRel }); return d.ok && d.roomRole === "MEMBER" })())
check("Webinar: akun Junior tetap ditolak", (() => { const d = evaluateJoin({ actor: junior, room: { ...roomOf("GURU"), mode: "WEBINAR" }, activeOthers: 0, now: NOW, relation: noRel }); return !d.ok && d.code === "JUNIOR_NOT_ALLOWED" })())
check("Ruang guru biasa tetap hanya untuk guru yang diundang", !join("GURU", murid).ok)
check("Guru anggota komunitas → MEMBER (COMMUNITY)", (() => { const d = join("GURU", guru, { isCommunityMember: true }); return d.ok && d.accessVia === "COMMUNITY" })())
check("Guru diundang langsung → MEMBER (INVITED_USER)", (() => { const d = join("GURU", guru, { isUserInvited: true }); return d.ok && d.accessVia === "INVITED_USER" })())
check("Guru membawa tautan sah → MEMBER (LINK)", (() => { const d = join("GURU", guru, { hasValidLink: true }); return d.ok && d.accessVia === "LINK" })())
check("Guru tanpa undangan → NOT_INVITED", (() => { const d = join("GURU", guru); return !d.ok && d.code === "NOT_INVITED" })())
check("Murid dengan tautan/undangan tetap ditolak di ruang GURU", !join("GURU", murid, { hasValidLink: true, isUserInvited: true, isCommunityMember: true }).ok)
check("Peserta lama boleh masuk lagi (tautan kedaluwarsa)", join("GURU", guru, { isExistingParticipant: true }).ok)
check("Dikeluarkan → REMOVED walau punya tautan", (() => { const d = join("GURU", guru, { hasValidLink: true, isRemoved: true }); return !d.ok && d.code === "REMOVED" })())
check("Co-host tersimpan dipulihkan untuk guru", (() => { const d = join("GURU", guru, { isCommunityMember: true, storedRoomRole: "COHOST" }); return d.ok && d.roomRole === "COHOST" })())
check("Co-host tidak dihitung kapasitas & lolos kunci", join("GURU", guru, { isCommunityMember: true, storedRoomRole: "COHOST" }, { activeOthers: 25, room: { ...roomOf("GURU"), isLocked: true } }).ok)

console.log("\n3. Ruang MURID (belajar bareng) — perlindungan anak")
const myClass = { ownedByActor: false, isActive: true, actorIsMember: true }
check("Murid anggota kelas boleh buat ruang MURID", canCreateRoom({ actor: murid, kind: "MURID", group: myClass }).ok)
check("Murid bukan anggota kelas → NOT_GROUP_MEMBER", (() => { const d = canCreateRoom({ actor: murid, kind: "MURID", group: { ...myClass, actorIsMember: false } }); return !d.ok && d.code === "NOT_GROUP_MEMBER" })())
check("Kelas nonaktif → GROUP_INACTIVE", (() => { const d = canCreateRoom({ actor: murid, kind: "MURID", group: { ...myClass, isActive: false } }); return !d.ok && d.code === "GROUP_INACTIVE" })())
check("Arena Junior tidak bisa buat ruang MURID (JUNIOR_NOT_ALLOWED)", (() => { const d = canCreateRoom({ actor: junior, kind: "MURID", group: myClass }); return !d.ok && d.code === "JUNIOR_NOT_ALLOWED" })())
check("Arena Junior tidak bisa ikut ruang MURID", (() => { const d = join("MURID", junior, { isGroupMember: true }); return !d.ok && d.code === "JUNIOR_NOT_ALLOWED" })())
check("Guru tidak bisa buat ruang MURID", !canCreateRoom({ actor: guru, kind: "MURID", group: myClass }).ok)
check("Teman sekelas → MEMBER", (() => { const d = join("MURID", murid, { isGroupMember: true }); return d.ok && d.roomRole === "MEMBER" })())
check("Murid kelas lain ditolak", !join("MURID", murid).ok)
check("Undangan/tautan tidak berlaku di ruang MURID (hanya sekelas)", !join("MURID", murid, { isUserInvited: true, hasValidLink: true, isInvitedGroupMember: true, isCommunityMember: true }).ok)
check("Guru tidak masuk ruang MURID (log tetap dipantau)", !join("MURID", guru, { isGroupMember: true, isUserInvited: true }).ok)
check("Admin tidak masuk ruang MURID", !join("MURID", admin, { isGroupMember: true }).ok)
check("Murid tidak pernah jadi co-host walau tersimpan", (() => { const d = join("MURID", murid, { isGroupMember: true, storedRoomRole: "COHOST" }); return d.ok && d.roomRole === "MEMBER" })())
check("Kelas nonaktif → teman sekelas ditolak", !join("MURID", murid, { isGroupMember: true, groupActive: false }).ok)

console.log("\n4. Ruang KELAS + undangan")
check("Murid kelas lain yang diundang (GROUP) → INVITED_GROUP", (() => { const d = join("KELAS", murid, { isInvitedGroupMember: true }); return d.ok && d.accessVia === "INVITED_GROUP" })())
check("Junior anggota kelas yang diundang tetap boleh di KELAS (diawasi guru)", join("KELAS", junior, { isInvitedGroupMember: true }).ok)
check("Guru rekan diundang (USER) → MEMBER", (() => { const d = join("KELAS", guru, { isUserInvited: true }); return d.ok && d.roomRole === "MEMBER" })())
check("Tautan guru tidak berlaku di ruang KELAS", !join("KELAS", guru, { hasValidLink: true }).ok)
check("Anggota komunitas tidak otomatis masuk ruang KELAS", !join("KELAS", guru, { isCommunityMember: true }).ok)

console.log("\n5. Berbagi layar per jenis ruang")
const kelasOff = { kind: "KELAS" as const, allowMuridScreenShare: false }
const kelasOn = { kind: "KELAS" as const, allowMuridScreenShare: true }
check("Guru host KELAS: boleh berbagi layar", publishSourcesFor("HOST", "GURU", kelasOff).includes("screen_share"))
check("Guru member ruang GURU: boleh berbagi layar", publishSourcesFor("MEMBER", "GURU", { kind: "GURU", allowMuridScreenShare: false }).includes("screen_share"))
check("Murid KELAS default: tidak boleh", !publishSourcesFor("MEMBER", "MURID", kelasOff).includes("screen_share"))
check("Murid KELAS saat guru mengizinkan: boleh", publishSourcesFor("MEMBER", "MURID", kelasOn).includes("screen_share"))
check("Murid host ruang MURID: boleh", publishSourcesFor("HOST", "MURID", { kind: "MURID", allowMuridScreenShare: false }).includes("screen_share"))
check("Murid member ruang MURID: tidak boleh", !publishSourcesFor("MEMBER", "MURID", { kind: "MURID", allowMuridScreenShare: true }).includes("screen_share"))
check("Selalu ada kamera + mikrofon", ["camera", "microphone"].every((s) => publishSourcesFor("MEMBER", "MURID", kelasOff).includes(s as never)))

console.log("\n6. Tautan undangan guru")
const tok = generateInviteToken()
check("Token undangan 32 karakter base64url", INVITE_TOKEN_RE.test(tok))
check("Token acak tiap kali", generateInviteToken() !== tok)
check("Hash sha256 hex stabil", hashInviteToken(tok) === hashInviteToken(tok) && /^[0-9a-f]{64}$/.test(hashInviteToken(tok)))
check("Hash ≠ token (token mentah tidak disimpan)", hashInviteToken(tok) !== tok)
check("Masa berlaku 24 jam", JUMPA_LINK_INVITE_TTL_HOURS === 24)

console.log("\n7. Wiring (statis)")
const roomsRoute = read("app/api/jumpa/rooms/route.ts")
check("POST /rooms menerima kind KELAS|GURU|MURID (+UMUM di balik flag)", roomsRoute.includes('z.enum(["KELAS", "GURU", "MURID", "UMUM"])') && roomsRoute.includes('.default("KELAS")'))
const service = read("lib/jumpa/service.ts")
check("createRoom memakai canCreateRoom (tanpa bypass)", service.includes("canCreateRoom({"))
check("createRoom membatasi 1 ruang MURID aktif", service.includes("JUMPA_MURID_MAX_ACTIVE_ROOMS"))
check("loadRoomContext memeriksa undangan, komunitas, tautan (hash)", ["jumpaInvite.findMany", "communityMember.findFirst", "hashInviteToken(linkToken)"].every((s) => service.includes(s)))
check("Beranda: Junior hanya melihat ruang KELAS", service.includes('actor.isJunior ? ["KELAS"]'))
const tokenRoute = read("app/api/jumpa/rooms/[code]/token/route.ts")
check("Token route meneruskan konteks ruang ke publishSourcesFor", tokenRoute.includes("allowMuridScreenShare: ctx.room.allowMuridScreenShare"))
check("Token route menerima token undangan tervalidasi", tokenRoute.includes("INVITE_TOKEN_RE.test(body.invite)"))
check("Token route: JUNIOR_NOT_ALLOWED → 403", tokenRoute.includes("JUNIOR_NOT_ALLOWED: 403"))
const roomPage = read("app/jumpa/[code]/page.tsx")
check("Halaman ruang meneruskan ?u= ke login & API", roomPage.includes("inviteToken") && roomPage.includes("encodeURIComponent(next)"))
const home = read("app/jumpa/page.tsx")
check("/jumpa: admin non-founder diarahkan ke panel pantau", home.includes('redirect("/jumpa/pantau")'))
const schema = read("prisma/schema.prisma")
check("Schema: JumpaInvite.tokenHash unik", /model JumpaInvite \{[\s\S]*tokenHash\s+String\?\s+@unique/.test(schema))

console.log(`\n${passed} lulus, ${failed} gagal\n`)
if (failed > 0) process.exit(1)
