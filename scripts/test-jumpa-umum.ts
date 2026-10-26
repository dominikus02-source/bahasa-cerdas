/**
 * JUMPA UMUM — uji ruang akun umum (murni, tanpa DB/jaringan) + pagar sumber.
 * Cakupan: buat/masuk, akun sekolah (guru/founder/murid) ikut ruang UMUM
 * lewat tautan/kode sebagai peserta biasa, isolasi satu arah (UMUM ✕ ruang
 * sekolah), flag mati, satu ruang aktif, batas global, kuota harian, paket, moderasi,
 * undangan, publish source. Jalankan: npm run test:jumpa-umum
 */
import { readFileSync } from "fs"
import { join as pathJoin } from "path"
import {
  canCreateRoom,
  canInvite,
  canModerate,
  effectiveRole,
  evaluateJoin,
  publishSourcesFor,
  reportRecipients,
  JUMPA_UMUM_ALLOW_JUNIOR,
  JUMPA_UMUM_CODE_JOIN,
  type JoinInput,
  type JoinRelation,
  type JumpaActor,
} from "../lib/jumpa/permissions"
import {
  capsFor,
  checkUmumCreateGuards,
  umumConcurrentCap,
  JUMPA_UMUM_DEFAULT_CONCURRENT_ROOMS,
  JUMPA_UMUM_MAX_ACTIVE_ROOMS_PER_USER,
} from "../lib/jumpa/caps"
import {
  cameraCapFor,
  checkDailyQuota,
  limitsFor,
  tierView,
  umumTierDef,
  JUMPA_TIERS,
  JUMPA_UMUM_PREMIUM_ENABLED,
  JUMPA_UMUM_TIERS,
} from "../lib/jumpa/tiers"
import { canSchedule } from "../lib/jumpa/schedule"
import { noticeAudience } from "../lib/jumpa/notify"
import { isRoleUmumEnabled } from "../lib/auth/umum-flag"

let passed = 0
let failed = 0
function check(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✅ ${label}`) }
  else { failed++; console.log(`  ❌ ${label}`) }
}
const src = (p: string) => readFileSync(pathJoin(__dirname, "..", p), "utf8")

const umum: JumpaActor = { role: "UMUM", isFounder: false, isJunior: false, umumEnabled: true }
const umumOff: JumpaActor = { role: "UMUM", isFounder: false, isJunior: false, umumEnabled: false }
const umumUnset: JumpaActor = { role: "UMUM", isFounder: false, isJunior: false }
const umumJunior: JumpaActor = { role: "UMUM", isFounder: false, isJunior: true, umumEnabled: true }
const guru: JumpaActor = { role: "GURU", isFounder: false, isJunior: false, umumEnabled: true }
const founder: JumpaActor = { role: "GURU", isFounder: true, isJunior: false, umumEnabled: true }
const murid: JumpaActor = { role: "MURID", isFounder: false, isJunior: false, umumEnabled: true }
const admin: JumpaActor = { role: "ADMIN", isFounder: false, isJunior: false, umumEnabled: true }
const muridJunior: JumpaActor = { role: "MURID", isFounder: false, isJunior: true, umumEnabled: true }
const guruFlagOff: JumpaActor = { role: "GURU", isFounder: false, isJunior: false, umumEnabled: false }
const muridFlagOff: JumpaActor = { role: "MURID", isFounder: false, isJunior: false }

const NOW = new Date("2026-10-26T03:00:00Z")
const noRel: JoinRelation = { isCreator: false, isGroupOwner: false, isGroupMember: false, groupActive: true, isExistingParticipant: false, isRemoved: false }
/** Relasi "paling longgar" — semua jalur masuk menyala. */
const allRel: JoinRelation = {
  isCreator: true, isGroupOwner: true, isGroupMember: true, groupActive: true, isExistingParticipant: true, isRemoved: false,
  isInvitedGroupMember: true, isUserInvited: true, isCommunityMember: true, hasValidLink: true, storedRoomRole: "COHOST",
}
const roomOf = (kind: "KELAS" | "GURU" | "MURID" | "UMUM") => ({
  kind, status: "LIVE" as const, isLocked: false, startedAt: new Date(NOW.getTime() - 5 * 60_000), maxDurationMin: 45, maxParticipants: 10,
})
const join = (actor: JumpaActor, kind: "KELAS" | "GURU" | "MURID" | "UMUM", rel: Partial<JoinRelation> = {}, over: Partial<JoinInput> = {}) =>
  evaluateJoin({ actor, room: roomOf(kind), activeOthers: 0, now: NOW, ...over, relation: { ...noRel, ...rel } })

console.log("\n=== JUMPA UMUM ===\n")

console.log("1. Flag & peran efektif")
check("UMUM + flag nyala → UMUM", effectiveRole(umum) === "UMUM")
check("UMUM + flag mati → null (default-deny)", effectiveRole(umumOff) === null)
check("UMUM tanpa umumEnabled → null", effectiveRole(umumUnset) === null)
check("GURU tetap GURU", effectiveRole(guru) === "GURU")
check("MURID tetap MURID", effectiveRole(murid) === "MURID")
check("Founder tetap GURU", effectiveRole(founder) === "GURU")
check("ADMIN non-founder tetap null", effectiveRole(admin) === null)
{
  const prev = process.env.ENABLE_ROLE_UMUM
  delete process.env.ENABLE_ROLE_UMUM
  check("ENABLE_ROLE_UMUM default MATI", isRoleUmumEnabled() === false)
  process.env.ENABLE_ROLE_UMUM = "true"
  check("ENABLE_ROLE_UMUM=true → nyala", isRoleUmumEnabled() === true)
  if (prev === undefined) delete process.env.ENABLE_ROLE_UMUM; else process.env.ENABLE_ROLE_UMUM = prev
}
const offCreate = canCreateRoom({ actor: umumOff, kind: "UMUM", group: null })
check("Flag mati: UMUM tidak bisa buat ruang (pesan lama)", !offCreate.ok && offCreate.code === "ROLE_NOT_ALLOWED" && offCreate.message === "Akun ini belum bisa memakai JUMPA.")
const offJoin = join(umumOff, "UMUM", allRel)
check("Flag mati: UMUM tidak bisa masuk ruang UMUM", !offJoin.ok && offJoin.code === "ROLE_NOT_ALLOWED")
check("Flag mati: GURU tidak bisa masuk ruang UMUM (ruang UMUM tertutup)", (() => { const d = join(guruFlagOff, "UMUM", { hasValidLink: true }); return !d.ok && d.code === "ROLE_NOT_ALLOWED" })())
check("Flag mati / tidak diisi: MURID tidak bisa masuk ruang UMUM", !join(muridFlagOff, "UMUM", { hasValidLink: true }).ok)

console.log("\n2. Buat ruang UMUM")
check("UMUM boleh buat ruang UMUM tanpa kelas", canCreateRoom({ actor: umum, kind: "UMUM", group: null }).ok)
for (const k of ["KELAS", "GURU", "MURID"] as const) {
  const d = canCreateRoom({ actor: umum, kind: k, group: { ownedByActor: true, isActive: true, actorIsMember: true } })
  check(`UMUM tidak bisa buat ruang ${k}`, !d.ok && d.code === "ROLE_NOT_ALLOWED")
}
for (const [label, a] of [["GURU", guru], ["Founder", founder], ["MURID", murid], ["ADMIN", admin]] as const) {
  check(`${label} tidak bisa buat ruang UMUM`, !canCreateRoom({ actor: a, kind: "UMUM", group: null }).ok)
}
check("UMUM Junior tidak bisa buat ruang", !canCreateRoom({ actor: umumJunior, kind: "UMUM", group: null }).ok)
check("allowedKinds tanpa UMUM → ditolak", !canCreateRoom({ actor: umum, kind: "UMUM", group: null, allowedKinds: ["KELAS", "GURU"] }).ok)
// Hasil guru/murid tidak berubah
check("Guru masih boleh buat ruang GURU", canCreateRoom({ actor: guru, kind: "GURU", group: null }).ok)
check("Guru pemilik masih boleh buat KELAS", canCreateRoom({ actor: guru, kind: "KELAS", group: { ownedByActor: true, isActive: true } }).ok)
check("Murid anggota masih boleh buat MURID", canCreateRoom({ actor: murid, kind: "MURID", group: { ownedByActor: false, isActive: true, actorIsMember: true } }).ok)

console.log("\n3. Masuk ruang UMUM (tautan / kode)")
const byCode = join(umum, "UMUM")
check("JUMPA_UMUM_CODE_JOIN aktif (kode = undangan)", JUMPA_UMUM_CODE_JOIN === true)
check("UMUM lain masuk lewat kode → MEMBER/LINK", byCode.ok && byCode.roomRole === "MEMBER" && byCode.accessVia === "LINK")
const byLink = join(umum, "UMUM", { hasValidLink: true })
check("UMUM lain masuk lewat tautan → MEMBER/LINK", byLink.ok && byLink.roomRole === "MEMBER" && byLink.accessVia === "LINK")
const creatorJoin = join(umum, "UMUM", { isCreator: true })
check("Pembuat UMUM → HOST", creatorJoin.ok && creatorJoin.roomRole === "HOST")
const cohost = join(umum, "UMUM", { storedRoomRole: "COHOST", isExistingParticipant: true })
check("COHOST tersimpan berlaku untuk UMUM di ruang UMUM", cohost.ok && cohost.roomRole === "COHOST")
const removed = join(umum, "UMUM", { isRemoved: true })
check("UMUM yang dikeluarkan tidak bisa masuk lagi", !removed.ok)
const locked = evaluateJoin({ actor: umum, room: { ...roomOf("UMUM"), isLocked: true }, activeOthers: 1, now: NOW, relation: noRel })
check("Ruang UMUM terkunci menolak pendatang baru", !locked.ok)
const full = join(umum, "UMUM", {}, { activeOthers: 10 })
check("Ruang UMUM penuh (10) menolak peserta ke-11", !full.ok)
const juniorJoin = join(umumJunior, "UMUM")
check("UMUM Junior tidak bisa masuk", !juniorJoin.ok && juniorJoin.code === "JUNIOR_NOT_ALLOWED")

console.log("\n4. Akun sekolah ikut ruang UMUM lewat tautan/kode (keputusan founder)")
for (const [label, a, eff] of [["MURID", murid, "MURID"], ["GURU", guru, "GURU"], ["Founder", founder, "GURU"]] as const) {
  const viaLink = join(a, "UMUM", { hasValidLink: true })
  check(`${label} masuk ruang UMUM lewat tautan → MEMBER/LINK (peran ${eff})`, viaLink.ok && viaLink.roomRole === "MEMBER" && viaLink.accessVia === "LINK" && viaLink.effective === eff)
  const viaCode = join(a, "UMUM")
  check(`${label} masuk ruang UMUM lewat kode → MEMBER`, viaCode.ok && viaCode.roomRole === "MEMBER")
  // Tidak pernah kuasa pemandu, walau semua relasi lain (kelas, undangan,
  // COHOST tersimpan) menyala — kecuali benar-benar pembuat (mustahil: hanya UMUM yang bisa membuat).
  const noHost = join(a, "UMUM", { ...allRel, isCreator: false })
  check(`${label} di ruang UMUM tidak pernah HOST/COHOST (COHOST tersimpan diabaikan)`, noHost.ok && noHost.roomRole === "MEMBER")
  const removedSchool = join(a, "UMUM", { hasValidLink: true, isRemoved: true })
  check(`${label} yang dikeluarkan pemandu tidak bisa masuk lagi`, !removedSchool.ok && removedSchool.code === "REMOVED")
  const lockedSchool = evaluateJoin({ actor: a, room: { ...roomOf("UMUM"), isLocked: true }, activeOthers: 1, now: NOW, relation: { ...noRel, hasValidLink: true } })
  check(`${label} ditolak saat ruang UMUM dikunci`, !lockedSchool.ok && lockedSchool.code === "ROOM_LOCKED")
  check(`${label} ditolak saat ruang UMUM penuh (10)`, (() => { const d = join(a, "UMUM", { hasValidLink: true }, { activeOthers: 10 }); return !d.ok && d.code === "ROOM_FULL" })())
}
const muridJr = join(muridJunior, "UMUM", { hasValidLink: true })
check("Murid Junior (TK–SD) tetap ditolak di ruang UMUM", JUMPA_UMUM_ALLOW_JUNIOR === false && !muridJr.ok && muridJr.code === "JUNIOR_NOT_ALLOWED")
check("ADMIN non-founder tetap tanpa JUMPA (tidak berubah)", (() => { const d = join(admin, "UMUM", { hasValidLink: true }); return !d.ok && d.code === "ROLE_NOT_ALLOWED" })())
check("Murid Junior tetap boleh masuk KELAS-nya (tidak berubah)", (() => { const d = join(muridJunior, "KELAS", { isGroupMember: true }); return d.ok && d.roomRole === "MEMBER" })())
check("Guru: COHOST tersimpan tetap berlaku di ruang GURU (tidak berubah)", (() => { const d = join(guru, "GURU", { storedRoomRole: "COHOST", hasValidLink: true }); return d.ok && d.roomRole === "COHOST" })())

console.log("\n5. Isolasi: UMUM ✕ ruang KELAS/GURU/MURID")
for (const k of ["KELAS", "GURU", "MURID"] as const) {
  const d = join(umum, k, allRel)
  check(`UMUM ditolak masuk ruang ${k} (meski semua relasi menyala)`, !d.ok && d.code === "ROLE_NOT_ALLOWED")
}
// Hasil guru/murid di ruang sekolah tidak berubah
check("Guru pembuat ruang GURU tetap HOST", (() => { const d = join(guru, "GURU", { isCreator: true }); return d.ok && d.roomRole === "HOST" })())
check("Murid anggota kelas tetap masuk KELAS", (() => { const d = join(murid, "KELAS", { isGroupMember: true }); return d.ok && d.roomRole === "MEMBER" })())
check("Murid tanpa relasi tetap ditolak di KELAS", !join(murid, "KELAS").ok)

console.log("\n6. Publish source, moderasi, undangan")
check("UMUM di ruang UMUM boleh berbagi layar", publishSourcesFor("MEMBER", "UMUM", { kind: "UMUM", allowMuridScreenShare: false }).includes("screen_share"))
check("UMUM di ruang lain tidak dapat layar", !publishSourcesFor("MEMBER", "UMUM", { kind: "KELAS", allowMuridScreenShare: true }).includes("screen_share"))
check("Murid di ruang UMUM: kamera + mik saja", (() => { const s = publishSourcesFor("MEMBER", "MURID", { kind: "UMUM", allowMuridScreenShare: true }); return s.length === 2 && s.includes("camera") && s.includes("microphone") })())
check("Guru peserta di ruang UMUM: kamera, mik, layar (seperti peserta umum)", publishSourcesFor("MEMBER", "GURU", { kind: "UMUM", allowMuridScreenShare: false }).includes("screen_share"))
const umumHost = { userId: "h", roomRole: "HOST" as const, effective: "UMUM" as const }
const umumMember = { userId: "m", roomRole: "MEMBER" as const, effective: "UMUM" as const }
const guruHost = { userId: "g", roomRole: "HOST" as const, effective: "GURU" as const }
const guruMemberInUmum = { userId: "g2", roomRole: "MEMBER" as const, effective: "GURU" as const }
const muridMemberInUmum = { userId: "c", roomRole: "MEMBER" as const, effective: "MURID" as const }
check("Host UMUM boleh LOCK ruang UMUM", canModerate({ actor: umumHost, action: "LOCK", roomKind: "UMUM" }).ok)
check("Host UMUM boleh END ruang UMUM", canModerate({ actor: umumHost, action: "END", roomKind: "UMUM" }).ok)
check("Host UMUM boleh REMOVE peserta UMUM", canModerate({ actor: umumHost, action: "REMOVE", roomKind: "UMUM", target: { userId: "m", roomRole: "MEMBER", effective: "UMUM" } }).ok)
check("Host UMUM boleh SET_COHOST peserta UMUM", canModerate({ actor: umumHost, action: "SET_COHOST", roomKind: "UMUM", target: { userId: "m", roomRole: "MEMBER", effective: "UMUM" } }).ok)
check("Peserta UMUM (MEMBER) tidak bisa REMOVE", !canModerate({ actor: umumMember, action: "REMOVE", roomKind: "UMUM", target: { userId: "x", roomRole: "MEMBER", effective: "UMUM" } }).ok)
check("Guru host tidak punya kuasa di ruang UMUM", !canModerate({ actor: guruHost, action: "END", roomKind: "UMUM" }).ok)
check("Host UMUM tidak punya kuasa di ruang KELAS", !canModerate({ actor: umumHost, action: "END", roomKind: "KELAS" }).ok)
for (const action of ["REMOVE", "MUTE_AUDIO", "MUTE_VIDEO", "STOP_SCREEN"] as const) {
  check(`Host UMUM boleh ${action} peserta MURID`, canModerate({ actor: umumHost, action, roomKind: "UMUM", target: muridMemberInUmum }).ok)
  check(`Host UMUM boleh ${action} peserta GURU`, canModerate({ actor: umumHost, action, roomKind: "UMUM", target: guruMemberInUmum }).ok)
}
check("Wakil pemandu UMUM boleh REMOVE peserta MURID", canModerate({ actor: { userId: "co", roomRole: "COHOST", effective: "UMUM" }, action: "REMOVE", roomKind: "UMUM", target: muridMemberInUmum }).ok)
check("Host UMUM tidak bisa jadikan GURU wakil pemandu (BAD_TARGET)", (() => { const d = canModerate({ actor: umumHost, action: "SET_COHOST", roomKind: "UMUM", target: guruMemberInUmum }); return !d.ok && d.code === "BAD_TARGET" })())
check("Host UMUM tidak bisa jadikan MURID wakil pemandu (BAD_TARGET)", (() => { const d = canModerate({ actor: umumHost, action: "SET_COHOST", roomKind: "UMUM", target: muridMemberInUmum }); return !d.ok && d.code === "BAD_TARGET" })())
for (const action of ["REMOVE", "MUTE_AUDIO", "LOCK", "UNLOCK", "END", "DELETE_CHAT", "SET_COHOST"] as const) {
  check(`Guru peserta di ruang UMUM tidak bisa ${action}`, !canModerate({ actor: guruMemberInUmum, action, roomKind: "UMUM", target: muridMemberInUmum }).ok)
  check(`Murid peserta di ruang UMUM tidak bisa ${action}`, !canModerate({ actor: muridMemberInUmum, action, roomKind: "UMUM", target: guruMemberInUmum }).ok)
}
check("Guru 'COHOST' (andai tersimpan) tetap tanpa kuasa di ruang UMUM", !canModerate({ actor: { userId: "g3", roomRole: "COHOST", effective: "GURU" }, action: "REMOVE", roomKind: "UMUM", target: muridMemberInUmum }).ok)
check("Guru host masih boleh END ruang GURU", canModerate({ actor: guruHost, action: "END", roomKind: "GURU" }).ok)
check("Host UMUM boleh membuat tautan undangan", canInvite({ actor: umumHost, roomKind: "UMUM", invite: { kind: "LINK" } }).ok)
check("Host UMUM tidak bisa undang perorangan (tanpa direktori)", !canInvite({ actor: umumHost, roomKind: "UMUM", invite: { kind: "USER", targetEffective: "UMUM" } }).ok)
check("Host UMUM tidak bisa undang kelas", !canInvite({ actor: umumHost, roomKind: "UMUM", invite: { kind: "GROUP", ownsGroup: true, groupActive: true } }).ok)
check("Peserta UMUM tidak bisa membuat tautan", !canInvite({ actor: umumMember, roomKind: "UMUM", invite: { kind: "LINK" } }).ok)
check("Guru tidak bisa mengundang ke ruang UMUM", !canInvite({ actor: guruHost, roomKind: "UMUM", invite: { kind: "LINK" } }).ok)
for (const kind of ["USER", "GROUP", "COMMUNITY", "LINK"] as const) {
  check(`Guru peserta ruang UMUM tidak bisa undang (${kind})`, !canInvite({ actor: guruMemberInUmum, roomKind: "UMUM", invite: { kind, targetEffective: "MURID", targetInActorGroups: true, ownsGroup: true, groupActive: true, isCommunityMember: true, communityApproved: true } }).ok)
  check(`Murid peserta ruang UMUM tidak bisa undang (${kind})`, !canInvite({ actor: muridMemberInUmum, roomKind: "UMUM", invite: { kind, targetEffective: "MURID" } }).ok)
}
check("Host UMUM tidak bisa undang murid/guru lewat direktori", !canInvite({ actor: umumHost, roomKind: "UMUM", invite: { kind: "USER", targetEffective: "MURID" } }).ok && !canInvite({ actor: umumHost, roomKind: "UMUM", invite: { kind: "USER", targetEffective: "GURU" } }).ok)
check("Guru tidak bisa mengundang akun UMUM ke ruang GURU", !canInvite({ actor: guruHost, roomKind: "GURU", invite: { kind: "USER", targetEffective: "UMUM" } }).ok)
check("Guru masih bisa membuat tautan ruang GURU", canInvite({ actor: guruHost, roomKind: "GURU", invite: { kind: "LINK" } }).ok)
check("Ruang UMUM tidak menyiarkan notifikasi", noticeAudience({ roomKind: "UMUM", creatorId: "h", groupMemberIds: ["a"], communityMemberIds: ["b"], invitedUserIds: ["c"] }).length === 0)
check("Laporan ruang UMUM hanya ke admin", (() => { const r = reportRecipients({ groupTeacherId: null, creatorId: "h", creatorEffective: "UMUM", adminIds: ["adm"], reporterId: "m" }); return r.length === 1 && r[0] === "adm" })())
check("Laporan murid peserta ruang UMUM → admin (bukan pemandu UMUM)", (() => { const r = reportRecipients({ groupTeacherId: null, creatorId: "h", creatorEffective: "UMUM", adminIds: ["adm", "fdr"], reporterId: "c" }); return r.length === 2 && !r.includes("h") })())
check("UMUM tidak bisa menjadwalkan", !canSchedule(umum, "UMUM").ok)

console.log("\n7. Paket Gratis UMUM (10 orang · 45 menit · 720p · 3 ruang/hari)")
const free = limitsFor("FREE", "UMUM")
check("limitsFor FREE UMUM = 10/45", free.maxParticipants === 10 && free.maxDurationMin === 45)
const prem = limitsFor("PREMIUM", "UMUM")
check("PREMIUM belum aktif → UMUM tetap 10/45", !JUMPA_UMUM_PREMIUM_ENABLED && prem.maxParticipants === 10 && prem.maxDurationMin === 45)
check("Kait UMUM_PREMIUM = 25/120 (belum aktif)", JUMPA_UMUM_TIERS.UMUM_PREMIUM.room.maxParticipants === 25 && JUMPA_UMUM_TIERS.UMUM_PREMIUM.room.maxDurationMin === 120)
check("umumTierDef(PREMIUM) = Gratis selama kait mati", umumTierDef("PREMIUM") === JUMPA_UMUM_TIERS.UMUM_FREE)
check("Kamera UMUM 720p", cameraCapFor("FREE", "UMUM") === 720 && cameraCapFor("PREMIUM", "UMUM") === 720)
check("capsFor UMUM = 10/45", capsFor("UMUM").maxParticipants === 10 && capsFor("UMUM").maxDurationMin === 45)
const web = limitsFor("PREMIUM", "UMUM", true)
check("Tanpa webinar UMUM (0/0)", web.maxParticipants === 0 && web.maxDurationMin === 0)
check("Kuota harian: ruang ke-1..3 boleh", [0, 1, 2].every((n) => checkDailyQuota("FREE", "UMUM", n).ok))
const q4 = checkDailyQuota("FREE", "UMUM", 3)
check("Kuota harian: ruang ke-4 ditolak (TIER_DAILY_LIMIT)", !q4.ok && q4.code === "TIER_DAILY_LIMIT")
check("Kuota harian PREMIUM UMUM tetap 3 (kait mati)", !checkDailyQuota("PREMIUM", "UMUM", 3).ok)
const tv = tierView({ tier: "FREE", kind: "UMUM", maxParticipants: 10, maxDurationMin: 45, viewerIsGuruCreator: true })
check("tierView UMUM tanpa ajakan upgrade", !tv.canUpgrade && tv.upgradeUrl === null && tv.label === "Gratis")
check("Paket guru tidak berubah (FREE KELAS 30/45)", JUMPA_TIERS.FREE.rooms.KELAS.maxParticipants === 30 && JUMPA_TIERS.FREE.rooms.KELAS.maxDurationMin === 45)

console.log("\n8. Pagar penyalahgunaan")
check("Satu ruang aktif per akun", JUMPA_UMUM_MAX_ACTIVE_ROOMS_PER_USER === 1)
const g0 = checkUmumCreateGuards({ myActiveRooms: 0, globalActiveRooms: 0, globalCap: 50 })
check("Tanpa ruang aktif → boleh", g0.ok)
const g1 = checkUmumCreateGuards({ myActiveRooms: 1, globalActiveRooms: 0, globalCap: 50 })
check("Sudah punya 1 ruang aktif → 409 TOO_MANY_ROOMS", !g1.ok && g1.status === 409 && g1.code === "TOO_MANY_ROOMS")
const gFull = checkUmumCreateGuards({ myActiveRooms: 0, globalActiveRooms: 50, globalCap: 50 })
check("Batas global penuh → 429 UMUM_CAPACITY_FULL", !gFull.ok && gFull.status === 429 && gFull.code === "UMUM_CAPACITY_FULL")
check("Pesan penuh ramah & berbahasa Indonesia", !gFull.ok && /ramai/.test(gFull.message) && /coba lagi/.test(gFull.message))
check("Batas global 49/50 → boleh", checkUmumCreateGuards({ myActiveRooms: 0, globalActiveRooms: 49, globalCap: 50 }).ok)
check("Env kosong → default 50", umumConcurrentCap(undefined) === 50 && JUMPA_UMUM_DEFAULT_CONCURRENT_ROOMS === 50)
check("Env tidak valid → default 50", umumConcurrentCap("abc") === 50 && umumConcurrentCap("-5") === 50 && umumConcurrentCap("1.5") === 50)
check("Env 120 → 120", umumConcurrentCap(" 120 ") === 120)
check("Env 0 → 0 (tutup sementara)", umumConcurrentCap("0") === 0 && !checkUmumCreateGuards({ myActiveRooms: 0, globalActiveRooms: 0, globalCap: 0 }).ok)
check("Env sangat besar dibatasi 10000", umumConcurrentCap("999999") === 10_000)

console.log("\n9. Pagar sumber (server & UI)")
const service = src("lib/jumpa/service.ts")
check("createRoom UMUM memakai advisory lock (serialisasi pagar)", /advisoryXactLock\(tx, UMUM_CREATE_LOCK_KEY\)/.test(service) && /createUmumRoom/.test(service) && /pg_advisory_xact_lock/.test(readFileSync("lib/db/advisory-lock.ts", "utf8")))
check("createUmumRoom membaca JUMPA_UMUM_MAX_CONCURRENT_ROOMS", /JUMPA_UMUM_MAX_CONCURRENT_ROOMS/.test(service) && /umumConcurrentCap\(/.test(service))
check("createUmumRoom menolak webinar", /WEBINAR_NOT_AVAILABLE/.test(service))
check("loadActor menggerbangi UMUM dengan isRoleUmumEnabled() (semua akun)", /umumEnabled:\s*isRoleUmumEnabled\(\)/.test(service))
const route = src("app/api/jumpa/rooms/route.ts")
check("POST /rooms menerima kind UMUM tanpa groupId", /"UMUM"\]\)/.test(route) && /b\.kind === "UMUM"/.test(route))
check("POST /rooms tetap rate-limit 10/menit", /maxRequests: 10, windowSeconds: 60/.test(route))
const token = src("app/api/jumpa/rooms/[code]/token/route.ts")
check("Token: tidak ada notifikasi live untuk ruang UMUM", /ctx\.room\.kind !== "UMUM"/.test(token))
check("Token: murid di ruang UMUM tanpa foto profil (nama tampilan saja)", /ctx\.room\.kind === "UMUM" && effective === "MURID" \? null/.test(token))
const home = src("components/jumpa/JumpaHome.tsx")
check("Beranda UMUM: kartu 'Mulai ruang baru'", /Mulai ruang baru/.test(home) && /create\(\{ kind: "UMUM" \}\)/.test(home))
check("Beranda UMUM: ketentuan kelas disembunyikan", /isUmum && data\.umum \? <UmumTerms/.test(home))
const page = src("app/jumpa/page.tsx")
check("Dasbor UMUM → /umum", /isUmum\(user\.role\) \? UMUM_HOME/.test(page))
const roomPage = src("app/jumpa/[code]/page.tsx")
check("Halaman ruang: judul disembunyikan untuk penonton lintas sisi", /crossed \? "Ruang JUMPA"/.test(roomPage))
check("Halaman ruang: pengingat murid di ruang UMUM", /ctx\.effective === "MURID"/.test(roomPage) && /bukan kelasmu/.test(roomPage) && /umumNotice=\{umumNotice\}/.test(roomPage))
check("Halaman ruang: lembar bagikan ruang UMUM hanya untuk akun UMUM", /isUmumRoom && ctx\.effective !== "UMUM"/.test(roomPage))
const app = src("components/jumpa/JumpaApp.tsx")
check("Tautan undangan tidak auto-join bila ada pengingat murid", /!props\.umumNotice/.test(app))
const lobby = src("components/jumpa/JumpaLobby.tsx")
check("Lobi menampilkan pengingat (token merek)", /jumpa-umum-notice/.test(lobby) && /var\(--clr-warning\)/.test(lobby))
const roomView = src("components/jumpa/JumpaRoomView.tsx")
check("Ruang: kuasa pemandu ruang UMUM hanya untuk akun UMUM (UI)", /info\.kind === "UMUM" \? self\.bcRole === "UMUM" : self\.bcRole === "GURU"/.test(roomView))
const actions = src("lib/jumpa/room-actions.ts")
check("Server: pencarian undangan ruang UMUM selalu kosong", /h\.room\.kind === "UMUM" \|\| h\.actor\.effective === "UMUM"\) return \{ ok: true, users: \[\] \}/.test(actions))
check("Server: bypass obrolan pemandu ruang UMUM hanya akun UMUM", /room\.kind === "UMUM" \? me\.actor\.effective === "UMUM"/.test(actions))
const sched = src("lib/jumpa/scheduling.ts")
check("Riwayat guru/murid tidak memuat ruang UMUM", /effective === "GURU" \? \["KELAS", "GURU", "MURID"\] : actor\.isJunior \? \["KELAS"\] : \["KELAS", "MURID"\]/.test(sched))
const mig = src("prisma/migrations/20261026000000_jumpa_room_kind_umum/migration.sql")
check("Migrasi aditif: ADD VALUE 'UMUM'", /ALTER TYPE "JumpaRoomKind" ADD VALUE IF NOT EXISTS 'UMUM'/.test(mig) && !/DROP|DELETE|UPDATE /i.test(mig.replace(/--.*$/gm, "")))

console.log(`\n${passed} lulus, ${failed} gagal\n`)
if (failed > 0) process.exit(1)
