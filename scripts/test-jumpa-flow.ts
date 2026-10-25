/**
 * JUMPA — uji alur penuh: jadwal (validasi WIB, durasi paket, audiens),
 * izin (murid tidak bisa menjadwalkan, non-anggota tidak bisa masuk),
 * gerbang ruang terjadwal, teks & penerima notifikasi, pengingat, sweep,
 * cron, migrasi RLS, dan cek statis UI masuk (flag, token warna, teks banner).
 * Murni + cek statis (tanpa DB/jaringan). Jalankan: npm run test:jumpa-flow
 */
import { existsSync, readFileSync } from "fs"
import { join as pathJoin } from "path"
import {
  canManageSchedule,
  canSchedule,
  durationChoices,
  formatWib,
  formatWibTime,
  parseWib,
  reminderDue,
  scheduledGate,
  toWibParts,
  validateSchedule,
  type ScheduleInput,
} from "../lib/jumpa/schedule"
import { buildNotice, noticeAudience, noticeKey, pushAllowedNow, type NoticeRoom } from "../lib/jumpa/notify"
import { evaluateJoin, type JoinInput, type JumpaActor } from "../lib/jumpa/permissions"
import { sweepActionFor } from "../lib/jumpa/lifecycle"
import { linkInviteExpiry } from "../lib/jumpa/caps"

let passed = 0
let failed = 0
function check(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✅ ${label}`) }
  else { failed++; console.log(`  ❌ ${label}`) }
}
const read = (p: string) => readFileSync(pathJoin(process.cwd(), p), "utf8")
const code = (r: { ok: boolean } & { code?: string }) => (r.ok ? "OK" : r.code)

const guru: JumpaActor = { role: "GURU", isFounder: false, isJunior: false }
const founder: JumpaActor = { role: "ADMIN", isFounder: true, isJunior: false }
const murid: JumpaActor = { role: "MURID", isFounder: false, isJunior: false }
const junior: JumpaActor = { role: "MURID", isFounder: false, isJunior: true }
const admin: JumpaActor = { role: "ADMIN", isFounder: false, isJunior: false }

// Minggu 18 Okt 2026, 10.00 WIB = 03.00 UTC
const NOW = new Date("2026-10-18T03:00:00Z")

console.log("\n=== JUMPA — ALUR PENUH ===\n")

console.log("1. WIB: parse, format, kembali")
check("parseWib 2026-10-20 14:30 → 07:30 UTC", parseWib("2026-10-20", "14:30")?.toISOString() === "2026-10-20T07:30:00.000Z")
check("parseWib menerima 14.30", parseWib("2026-10-20", "14.30")?.toISOString() === "2026-10-20T07:30:00.000Z")
check("parseWib 00:15 WIB → hari sebelumnya UTC", parseWib("2026-10-21", "00:15")?.toISOString() === "2026-10-20T17:15:00.000Z")
check("parseWib menolak 31 Februari", parseWib("2026-02-31", "10:00") === null)
check("parseWib menolak jam 24", parseWib("2026-10-20", "24:00") === null)
check("parseWib menolak format bebas", parseWib("20/10/2026", "10:00") === null)
const back = toWibParts(new Date("2026-10-20T17:15:00Z"))
check("toWibParts kebalikan parseWib", back.date === "2026-10-21" && back.time === "00:15")
check("formatWib hari ini", formatWib(new Date("2026-10-18T07:30:00Z"), NOW) === "Hari ini · 14.30 WIB")
check("formatWib besok", formatWib(new Date("2026-10-19T01:00:00Z"), NOW) === "Besok · 08.00 WIB")
check("formatWib tanggal", formatWib(new Date("2026-10-20T07:30:00Z"), NOW) === "Selasa, 20 Okt · 14.30 WIB")
check("formatWib 'besok' memakai hari WIB (23.30 WIB → besok 00.30)", formatWib(new Date("2026-10-18T17:30:00Z"), new Date("2026-10-18T16:30:00Z")) === "Besok · 00.30 WIB")
check("formatWibTime", formatWibTime(new Date("2026-10-18T07:05:00Z")) === "14.05 WIB")

console.log("\n2. Validasi jadwal")
const base: ScheduleInput = { date: "2026-10-20", time: "14:30", durationMin: 45, tier: "FREE", kind: "KELAS", hasAudience: true, now: NOW }
const v = validateSchedule(base)
check("Jadwal valid diterima", v.ok && v.startsAt.toISOString() === "2026-10-20T07:30:00.000Z" && v.durationMin === 45)
check("Tanggal salah → BAD_DATE", code(validateSchedule({ ...base, date: "2026-13-01" })) === "BAD_DATE")
check("Kurang dari 5 menit → TOO_SOON", code(validateSchedule({ ...base, date: "2026-10-18", time: "10:03" })) === "TOO_SOON")
check("Jam lampau → TOO_SOON", code(validateSchedule({ ...base, date: "2026-10-17" })) === "TOO_SOON")
check("Tepat 5 menit diterima", validateSchedule({ ...base, date: "2026-10-18", time: "10:05" }).ok)
check("> 60 hari → TOO_FAR", code(validateSchedule({ ...base, date: "2026-12-31" })) === "TOO_FAR")
check("Durasi 10 → BAD_DURATION", code(validateSchedule({ ...base, durationMin: 10 })) === "BAD_DURATION")
check("Durasi 47 (bukan kelipatan 5) → BAD_DURATION", code(validateSchedule({ ...base, durationMin: 47 })) === "BAD_DURATION")
check("Gratis 60 menit → DURATION_OVER_LIMIT", code(validateSchedule({ ...base, durationMin: 60 })) === "DURATION_OVER_LIMIT")
check("Premium 120 menit diterima", validateSchedule({ ...base, tier: "PREMIUM", durationMin: 120 }).ok)
check("Premium 150 menit ditolak", code(validateSchedule({ ...base, tier: "PREMIUM", durationMin: 150 })) === "DURATION_OVER_LIMIT")
check("Tanpa audiens → NO_AUDIENCE", code(validateSchedule({ ...base, kind: "GURU", hasAudience: false })) === "NO_AUDIENCE")
const msg = validateSchedule({ ...base, durationMin: 60 })
check("Pesan batas paket menyebut menit", !msg.ok && msg.message.includes("45 menit"))
check("Pilihan durasi Gratis ≤ 45", JSON.stringify(durationChoices("FREE", "KELAS")) === "[15,30,45]")
check("Pilihan durasi Premium sampai 120", durationChoices("PREMIUM", "GURU").at(-1) === 120)

console.log("\n3. Izin menjadwalkan & mengelola")
check("Guru boleh menjadwalkan kelas", canSchedule(guru, "KELAS").ok)
check("Guru boleh menjadwalkan ruang guru", canSchedule(guru, "GURU").ok)
check("Founder boleh menjadwalkan", canSchedule(founder, "KELAS").ok)
check("Murid TIDAK boleh menjadwalkan kelas", code(canSchedule(murid, "KELAS")) === "ROLE_NOT_ALLOWED")
check("Murid TIDAK boleh menjadwalkan ruang guru", !canSchedule(murid, "GURU").ok)
check("Junior TIDAK boleh menjadwalkan", !canSchedule(junior, "KELAS").ok)
check("Ruang MURID tidak bisa dijadwalkan", code(canSchedule(guru, "MURID")) === "KIND_NOT_SCHEDULABLE")
check("Admin non-founder tidak boleh", !canSchedule(admin, "KELAS").ok)
check("Pembuat boleh ubah jadwal", canManageSchedule({ actorId: "g", createdById: "g", status: "SCHEDULED" }).ok)
check("Orang lain tidak boleh ubah jadwal", !canManageSchedule({ actorId: "x", createdById: "g", status: "SCHEDULED" }).ok)
check("Jadwal yang sudah LIVE tidak bisa diubah", !canManageSchedule({ actorId: "g", createdById: "g", status: "LIVE" }).ok)

console.log("\n4. Gerbang ruang terjadwal & masuk")
const startAt = new Date("2026-10-18T07:30:00Z")
check("Pemandu boleh buka kapan saja", scheduledGate({ status: "SCHEDULED", scheduledAt: startAt, isHost: true, now: NOW }).open)
const g = scheduledGate({ status: "SCHEDULED", scheduledAt: startAt, isHost: false, now: NOW })
check("Peserta ditahan sampai 10 menit sebelum", !g.open && g.opensAt.toISOString() === "2026-10-18T07:20:00.000Z")
check("Peserta boleh masuk 10 menit sebelum", scheduledGate({ status: "SCHEDULED", scheduledAt: startAt, isHost: false, now: new Date("2026-10-18T07:20:00Z") }).open)
check("Begitu LIVE peserta boleh masuk", scheduledGate({ status: "LIVE", scheduledAt: startAt, isHost: false, now: NOW }).open)

const joinBase: JoinInput = {
  actor: murid,
  room: { kind: "KELAS", status: "SCHEDULED", isLocked: false, startedAt: null, maxDurationMin: 45, maxParticipants: 30, scheduledAt: startAt },
  relation: { isCreator: false, isGroupOwner: false, isGroupMember: true, groupActive: true, isExistingParticipant: false, isRemoved: false },
  activeOthers: 0,
  now: NOW,
}
check("Murid anggota: NOT_STARTED sebelum dibuka", code(evaluateJoin(joinBase)) === "NOT_STARTED")
check("Murid anggota: boleh 10 menit sebelum", evaluateJoin({ ...joinBase, now: new Date("2026-10-18T07:21:00Z") }).ok)
check("Murid anggota: boleh begitu LIVE", evaluateJoin({ ...joinBase, room: { ...joinBase.room, status: "LIVE", startedAt: NOW } }).ok)
check("Guru pemilik kelas (pemandu) boleh lebih awal", evaluateJoin({ ...joinBase, actor: guru, relation: { ...joinBase.relation, isGroupMember: false, isGroupOwner: true } }).ok)
check("Pembuat boleh lebih awal", evaluateJoin({ ...joinBase, actor: guru, relation: { ...joinBase.relation, isCreator: true } }).ok)
check("NON-ANGGOTA tidak bisa masuk (NOT_INVITED)", code(evaluateJoin({ ...joinBase, now: new Date("2026-10-18T07:25:00Z"), relation: { ...joinBase.relation, isGroupMember: false } })) === "NOT_INVITED")
check("Non-anggota ditolak sebagai NOT_INVITED, bukan NOT_STARTED", code(evaluateJoin({ ...joinBase, relation: { ...joinBase.relation, isGroupMember: false } })) === "NOT_INVITED")
check("Guru lain (bukan pemilik) tidak bisa masuk kelas", code(evaluateJoin({ ...joinBase, actor: guru, now: new Date("2026-10-18T07:25:00Z"), relation: { ...joinBase.relation, isGroupMember: false } })) === "NOT_INVITED")
check("Murid kelas lain tidak bisa masuk ruang guru", code(evaluateJoin({ ...joinBase, room: { ...joinBase.room, kind: "GURU" }, now: new Date("2026-10-18T07:25:00Z") })) === "NOT_INVITED")
check("Dibatalkan → ROOM_CANCELLED", code(evaluateJoin({ ...joinBase, room: { ...joinBase.room, status: "ENDED", endReason: "CANCELLED" } })) === "ROOM_CANCELLED")
check("Selesai → ROOM_ENDED", code(evaluateJoin({ ...joinBase, room: { ...joinBase.room, status: "ENDED", endReason: "HOST" } })) === "ROOM_ENDED")
{
  const started = new Date(joinBase.now.getTime() - 5 * 60_000);
  check("Tutup karena kosong, durasi belum habis → boleh masuk lagi", evaluateJoin({ ...joinBase, room: { ...joinBase.room, status: "ENDED", endReason: "EMPTY", startedAt: started } }).ok)
  const old = new Date(joinBase.now.getTime() - (joinBase.room.maxDurationMin + 1) * 60_000);
  check("Tutup karena kosong, durasi habis → ROOM_EXPIRED", code(evaluateJoin({ ...joinBase, room: { ...joinBase.room, status: "ENDED", endReason: "EMPTY", startedAt: old } })) === "ROOM_EXPIRED")
  check("Diakhiri waktu habis → ROOM_ENDED", code(evaluateJoin({ ...joinBase, room: { ...joinBase.room, status: "ENDED", endReason: "TIME_LIMIT", startedAt: started } })) === "ROOM_ENDED")
}
check("Dikunci → ROOM_LOCKED", code(evaluateJoin({ ...joinBase, now: new Date("2026-10-18T07:25:00Z"), room: { ...joinBase.room, isLocked: true } })) === "ROOM_LOCKED")
check("Penuh → ROOM_FULL", code(evaluateJoin({ ...joinBase, now: new Date("2026-10-18T07:25:00Z"), activeOthers: 30 })) === "ROOM_FULL")
check("Ruang instan (tanpa jadwal) tidak terkena gerbang", evaluateJoin({ ...joinBase, room: { ...joinBase.room, scheduledAt: null } }).ok)
check("Junior ditolak ruang MURID", code(evaluateJoin({ ...joinBase, actor: junior, room: { ...joinBase.room, kind: "MURID", scheduledAt: null } })) === "JUNIOR_NOT_ALLOWED")

console.log("\n5. Teks notifikasi")
const room: NoticeRoom = { code: "abc-defg-hij", title: "Teks eksposisi", kind: "KELAS", groupName: "7A", scheduledAt: startAt }
const s = buildNotice("SCHEDULED", room, { now: NOW })
check("Dijadwalkan: judul + waktu WIB", s.title === "JUMPA dijadwalkan" && s.body === "Teks eksposisi · Hari ini · 14.30 WIB" && s.link === "/jumpa/abc-defg-hij")
check("Pengingat 10 menit", buildNotice("REMINDER", room).title === "JUMPA 10 menit lagi" && buildNotice("REMINDER", room).body.includes("14.30 WIB"))
const live = buildNotice("LIVE", room)
check("Berlangsung: 'Kelas 7A sedang JUMPA' + 'Gabung sekarang.'", live.title === "Kelas 7A sedang JUMPA" && live.body === "Gabung sekarang.")
check("Nama kelas berawalan 'Kelas' tidak diulang", buildNotice("LIVE", { ...room, groupName: "Kelas 7A" }).title === "Kelas 7A sedang JUMPA")
check("Berlangsung ruang guru: judul umum", buildNotice("LIVE", { ...room, kind: "GURU", groupName: null }).title === "JUMPA sedang berlangsung")
check("Dibatalkan → riwayat, peringatan", buildNotice("CANCELLED", room).link === "/jumpa/riwayat" && buildNotice("CANCELLED", room).type === "warning")
check("Jadwal berubah", buildNotice("RESCHEDULED", room, { now: NOW }).title === "Jadwal JUMPA berubah")
const rep = buildNotice("REPORT", room, { category: "Perundungan" })
check("Laporan → panel pantau ruang itu", rep.link === "/jumpa/pantau?ruang=abc-defg-hij" && rep.body.startsWith("Perundungan"))
check("Tag push per ruang", live.tag === "jumpa-abc-defg-hij")
const allText = (["SCHEDULED", "REMINDER", "LIVE", "CANCELLED", "RESCHEDULED", "REPORT"] as const).map((k) => { const n = buildNotice(k, room, { now: NOW }); return `${n.title} ${n.body}` }).join(" ")
check("Tanpa emoji di notifikasi", !/\p{Extended_Pictographic}/u.test(allText))
check("Tanpa kata Inggris umum di notifikasi", !/\b(join|live|meeting|now|cancel|reminder|room)\b/i.test(allText))
check("Judul panjang dipotong", buildNotice("SCHEDULED", { ...room, title: "x".repeat(200) }, { now: NOW }).body.length < 120)

console.log("\n6. Penerima & idempotensi")
const aud = noticeAudience({ roomKind: "KELAS", creatorId: "g", groupMemberIds: ["m1", "m2", "j1", "g"], communityMemberIds: ["c1"], invitedUserIds: ["u1", "m1"], juniorIds: ["j1"] })
check("Kelas: anggota + undangan, tanpa duplikat", aud.length === 3 && ["m1", "m2", "u1"].every((x) => aud.includes(x)))
check("Pembuat tidak menerima", !aud.includes("g"))
check("Junior tidak menerima", !aud.includes("j1"))
check("Kelas tidak menyiarkan ke komunitas", !aud.includes("c1"))
check("Ruang guru: komunitas + undangan", JSON.stringify(noticeAudience({ roomKind: "GURU", creatorId: "g", groupMemberIds: ["m1"], communityMemberIds: ["c1"], invitedUserIds: ["u1"] }).sort()) === JSON.stringify(["c1", "u1"]))
check("Ruang MURID tidak pernah menyiarkan", noticeAudience({ roomKind: "MURID", creatorId: "m", groupMemberIds: ["m1"], communityMemberIds: [], invitedUserIds: ["m2"] }).length === 0)
check("Dibatasi 500 penerima", noticeAudience({ roomKind: "KELAS", creatorId: "g", groupMemberIds: Array.from({ length: 900 }, (_, i) => `m${i}`), communityMemberIds: [], invitedUserIds: [] }).length === 500)
check("Kunci notifikasi stabil", noticeKey("LIVE", "r1") === "LIVE:r1")
check("Ubah jadwal → kunci pengingat baru", noticeKey("REMINDER", "r1", startAt) !== noticeKey("REMINDER", "r1", new Date(startAt.getTime() + 3600_000)))
check("Laporan berbeda → kunci berbeda", noticeKey("REPORT", "r1", "a") !== noticeKey("REPORT", "r1", "b"))

console.log("\n7. Jam tenang push & pengingat")
check("Murid: push 20.59 WIB boleh", pushAllowedNow("MURID", new Date("2026-10-18T13:59:00Z")))
check("Murid: push 21.00 WIB tidak", !pushAllowedNow("MURID", new Date("2026-10-18T14:00:00Z")))
check("Murid: push 05.59 WIB tidak", !pushAllowedNow("MURID", new Date("2026-10-17T22:59:00Z")))
check("Murid: push 06.00 WIB boleh", pushAllowedNow("MURID", new Date("2026-10-17T23:00:00Z")))
check("Guru: push kapan saja", pushAllowedNow("GURU", new Date("2026-10-18T16:00:00Z")))
check("Pengingat: 10 menit sebelum jatuh tempo", reminderDue(startAt, new Date("2026-10-18T07:20:00Z")))
check("Pengingat: 11 menit sebelum belum", !reminderDue(startAt, new Date("2026-10-18T07:19:00Z")))
check("Pengingat: lewat jam mulai tidak dikirim", !reminderDue(startAt, new Date("2026-10-18T07:30:00Z")))

console.log("\n8. Sweep ruang terjadwal")
const sched = { status: "SCHEDULED" as const, startedAt: null, maxDurationMin: 45, createdAt: new Date("2026-10-01T00:00:00Z"), warnedEndAt: null }
check("Jadwal jauh hari tidak ditutup sweep (stale dihitung dari jam mulai)", sweepActionFor({ ...sched, scheduledAt: new Date("2026-10-20T07:30:00Z") }, NOW) === null)
check("Jadwal lewat >24 jam ditutup", sweepActionFor({ ...sched, scheduledAt: new Date("2026-10-17T00:00:00Z") }, NOW) === "END_STALE")
check("Ruang instan lama tetap ditutup", sweepActionFor(sched, NOW) === "END_STALE")

console.log("\n9. Cron, migrasi, API")
const crontab = read("ops/vps/cron/root.crontab")
check("Cron pengingat tiap menit lewat bc-cron-call", /^\* \* \* \* \* \/usr\/local\/bin\/bc-cron-call \/api\/cron\/jumpa-reminders$/m.test(crontab))
check("Cron sweep tetap ada", crontab.includes("/api/cron/jumpa-sweep"))
const cron = read("app/api/cron/jumpa-reminders/route.ts")
check("Cron pengingat fail-closed CRON_SECRET", cron.includes("CRON_SECRET") && /503|401/.test(cron))
check("Cron pengingat dilewati saat flag mati", cron.includes("JUMPA_ENABLED"))
const mig = read("prisma/migrations/20261019000000_jumpa_flow/migration.sql")
check("Migrasi membuat JumpaNotice", mig.includes('CREATE TABLE "JumpaNotice"'))
check("Migrasi: RLS aktif", /ALTER TABLE "JumpaNotice" ENABLE ROW LEVEL SECURITY/.test(mig))
check("Migrasi: tanpa policy", !/CREATE POLICY/i.test(mig))
check("Migrasi: dedupeKey unik", /UNIQUE INDEX "JumpaNotice_dedupeKey_key"/.test(mig))
check("jumpa-setup.sh memuat migrasi baru", read("ops/vps/jumpa-setup.sh").includes("20261019000000_jumpa_flow"))
const schema = read("prisma/schema.prisma")
check("Schema: model JumpaNotice", /model JumpaNotice \{[\s\S]*dedupeKey\s+String\s+@unique/.test(schema))
for (const p of ["app/api/jumpa/jadwal/route.ts", "app/api/jumpa/rooms/[code]/jadwal/route.ts", "app/api/jumpa/orang/route.ts", "app/api/jumpa/kelas/[groupId]/route.ts", "app/api/jumpa/beranda/route.ts", "app/api/jumpa/rooms/[code]/ringkasan/route.ts"]) {
  const src = read(p)
  check(`${p}: digerbang flag + login`, src.includes("jumpaDisabledResponse()") && src.includes("getUser()"))
}
check("Jadwal API memakai canSchedule (via scheduleRoom)", read("lib/jumpa/scheduling.ts").includes("canSchedule(actor, req.kind)"))
check("Token route memicu notifikasi LIVE di after()", /after\(\(\) => notifyRoomLive/.test(read("app/api/jumpa/rooms/[code]/token/route.ts")))

console.log("\n9b. Beri tahu kelas (notifyClass)")
const offKelas = noticeAudience({ roomKind: "KELAS", creatorId: "g", groupMemberIds: ["m1", "m2"], communityMemberIds: [], invitedUserIds: [], notifyClass: false })
check("Mati + rapat instan kelas → tanpa penerima", offKelas.length === 0)
const offInvite = noticeAudience({ roomKind: "KELAS", creatorId: "g", groupMemberIds: ["m1", "m2"], communityMemberIds: [], invitedUserIds: ["u1"], notifyClass: false })
check("Mati → hanya undangan perorangan, kelas tidak", JSON.stringify(offInvite) === JSON.stringify(["u1"]))
check("Mati → komunitas ruang guru tidak diberi tahu", noticeAudience({ roomKind: "GURU", creatorId: "g", groupMemberIds: [], communityMemberIds: ["c1", "c2"], invitedUserIds: [], notifyClass: false }).length === 0)
check("Nyala (bawaan) → kelas diberi tahu", noticeAudience({ roomKind: "KELAS", creatorId: "g", groupMemberIds: ["m1"], communityMemberIds: [], invitedUserIds: [], notifyClass: true }).length === 1)
check("Skema: JumpaRoom.notifyClass Boolean @default(true)", /notifyClass\s+Boolean\s+@default\(true\)/.test(schema))
const flowSql = read("prisma/migrations/20261019000000_jumpa_flow/migration.sql")
check("Migrasi: kolom notifyClass aditif (DEFAULT true)", flowSql.includes('ALTER TABLE "JumpaRoom" ADD COLUMN "notifyClass" BOOLEAN NOT NULL DEFAULT true;') && !/DROP|RENAME/.test(flowSql.replace(/^--.*$/gm, "")))
const setup = read("ops/vps/jumpa-setup.sh")
check("jumpa-setup.sh memeriksa kolom notifyClass (3 objek)", setup.includes("column_name='notifyClass'") && setup.includes("*_jumpa_flow) echo 3 ;;"))
const svc = read("lib/jumpa/service.ts")
check("createRoom menyimpan notifyClass (MURID selalu false)", svc.includes('notifyClass: req.kind === "MURID" ? false : req.notifyClass !== false'))
const ns = read("lib/jumpa/notify-server.ts")
check("Penerima notifikasi memakai room.notifyClass", /NOTICE_ROOM_SELECT = \{[^}]*notifyClass: true/.test(ns) && ns.includes("notifyClass: room.notifyClass") && ns.includes("room.notifyClass && groupIds.length") && ns.includes("room.notifyClass && communityIds.length"))
check("LIVE, jadwal, pengingat, ubah, batal lewat roomAudience", (read("lib/jumpa/scheduling.ts").match(/deliverRoomNotice\(/g) ?? []).length >= 4 && !/deliverRoomNotice\([^)]*recipients:/.test(read("lib/jumpa/scheduling.ts")))
check("API rapat instan menerima notifyClass", /notifyClass: z\.boolean\(\)\.optional\(\)/.test(read("app/api/jumpa/rooms/route.ts")))
check("API jadwal menerima notifyClass", /notifyClass: z\.boolean\(\)\.optional\(\)/.test(read("app/api/jumpa/jadwal/route.ts")) && read("lib/jumpa/scheduling.ts").includes("notifyClass: req.notifyClass !== false"))
const toggle = read("components/jumpa/NotifyClassToggle.tsx")
check("Sakelar: role=switch + label 'Beri tahu kelas'", toggle.includes('role="switch"') && toggle.includes('"Beri tahu kelas"'))
const panel = read("components/jumpa/KelasJumpaPanel.tsx")
check("Panel kelas: sakelar nyala bawaan & dikirim ke Mulai JUMPA", panel.includes("useState(true)") && panel.includes("<NotifyClassToggle") && panel.includes("notifyClass={notify}") && read("components/jumpa/StartJumpaButton.tsx").includes("JSON.stringify({ groupId, notifyClass })"))
const form = read("components/jumpa/ScheduleForm.tsx")
check("Form jadwal: sakelar nyala bawaan & dikirim", form.includes("const [notify, setNotify] = useState(true)") && form.includes("notifyClass: notify") && form.includes("<NotifyClassToggle"))
check("/jumpa ruang guru: beranda disederhanakan", read("components/jumpa/JumpaHome.tsx").includes("beranda /jumpa yang disederhanakan"))

console.log("\n10. UI masuk: flag, desain, teks")
for (const p of ["components/jumpa/JumpaLaunchBanner.tsx", "components/jumpa/JumpaBerandaCard.tsx", "components/jumpa/KelasJumpaPanel.tsx", "components/jumpa/StartJumpaButton.tsx"]) {
  check(`${p}: tersembunyi bila flag mati`, /if \(!JUMPA_ENABLED[^)]*\) return null/.test(read(p)))
}
const css = read("components/jumpa/jumpa-entry.css")
check("jumpa-entry.css tanpa warna hex", !/#[0-9a-fA-F]{3,8}\b/.test(css))
check("jumpa-entry.css hormati reduced-motion", css.includes("prefers-reduced-motion"))
const banner = read("components/jumpa/JumpaLaunchBanner.tsx")
for (const t of ["BARU di BahasaCerdas", "JUMPA", "Ruang video kelas, langsung di BahasaCerdas.", "Coba JUMPA", 'href="/jumpa"', "localStorage"]) check(`Banner memuat ${t}`, banner.includes(t))
check("Banner bisa ditutup (aria-label Indonesia)", banner.includes('aria-label="Tutup banner JUMPA"'))
for (const f of ["rina", "budi", "ani", "dimas", "citra", "dewi"]) {
  const p = `public/jumpa/wajah/${f}.webp`
  check(`${p} ada & < 40 KB`, existsSync(p) && readFileSync(p).length < 40 * 1024)
}
check("OG 1200×630 ada", existsSync("public/jumpa/og-jumpa-1200x630.jpg"))
const page = read("app/jumpa/[code]/page.tsx")
check("Halaman ruang punya OG generik", page.includes("generateMetadata") && page.includes("og-jumpa-1200x630.jpg"))
check("OG tidak memuat judul ruang", !/generateMetadata[\s\S]*ctx\.view\.title[\s\S]*const KIND_LABEL/.test(page))
check("Tanpa login → gerbang login dengan ?next=", page.includes("JumpaLoginGate") && page.includes("/login?next="))
check("Murid: tombol 'Gabung JUMPA' di panel kelas", read("components/jumpa/KelasJumpaPanel.tsx").includes("Gabung JUMPA"))
check("Guru: 'Mulai JUMPA' di panel kelas", read("components/jumpa/StartJumpaButton.tsx").includes("Mulai JUMPA") && read("components/jumpa/KelasJumpaPanel.tsx").includes("<StartJumpaButton"))
check("Halaman kelas guru memakai panel", read("app/(dashboard)/guru/kelasku/page.tsx").includes('<KelasJumpaPanel groupId={activeGroup.id} role="GURU"'))
check("Halaman kelas murid memakai panel", read("app/(dashboard)/murid/kelasku/[id]/page.tsx").includes('role="MURID"'))
check("Beranda guru: banner + kartu", /JumpaLaunchBanner[\s\S]*JumpaBerandaCard role="GURU"/.test(read("components/guru/TeacherHomeV3.tsx")))
check("Beranda murid: Gabung di atas hero, kartu + banner di bawah", /JumpaBerandaCard role="MURID" show="live"[\s\S]*StudentHomeHero[\s\S]*JumpaBerandaCard role="MURID" show="idle"[\s\S]*JumpaLaunchBanner/.test(read("app/(dashboard)/murid/beranda/page.tsx")))
const share = read("components/jumpa/ShareSheet.tsx")
for (const t of ["wa.me", "Salin tautan", "navigator.share", "qrcode"]) check(`Bagikan: ${t}`, share.includes(t))
// Ruang guru: semua opsi bagikan memakai tautan undangan ?u= (uji CEO 25 Okt:
// "Salin tautan"/WhatsApp memberi tautan polos → penerima harus diundang manual).
check("Bagikan (ruang guru): tautan undangan dibuat otomatis saat dibuka", /useEffect\(\(\) => \{\s*if \(target\.canLink\) void makeLink\(\)/.test(share))
check("Bagikan: url = tautan undangan bila ada", share.includes("const url = link24 ?? "))
check("Bagikan: opsi menunggu tautan undangan", /pending = Boolean\(target\.canLink\) && !link24/.test(share) && (share.match(/disabled=\{pending\}/g) ?? []).length >= 2 && share.includes("href={pending ? undefined"))
check("Bagikan: tanpa tombol tautan terpisah", !share.includes("Tautan undangan 24 jam"))
check("Undangan LINK memakai linkInviteExpiry", read("lib/jumpa/room-actions.ts").includes("linkInviteExpiry(now, room.scheduledAt)"))
{
  const now = new Date("2026-10-25T14:00:00Z")
  const H = 3_600_000
  check("Kedaluwarsa tautan: tanpa jadwal = +24 jam", linkInviteExpiry(now).getTime() === now.getTime() + 24 * H)
  check("Kedaluwarsa tautan: jadwal lampau = +24 jam dari sekarang", linkInviteExpiry(now, new Date(now.getTime() - 5 * H)).getTime() === now.getTime() + 24 * H)
  check("Kedaluwarsa tautan: jadwal 3 hari lagi = jam mulai +24 jam", linkInviteExpiry(now, new Date(now.getTime() + 72 * H)).getTime() === now.getTime() + 96 * H)
}

console.log(`\nHasil: ${passed} lulus, ${failed} gagal\n`)
if (failed > 0) process.exit(1)
