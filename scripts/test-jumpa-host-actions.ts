/**
 * JUMPA Fase 2 — uji kontrol host (mute, keluarkan, kunci, akhiri, co-host,
 * izin layar), undangan, auto-akhir (sweep) & kehadiran (webhook).
 * Murni + cek statis (tanpa DB/jaringan). Jalankan: npm run test:jumpa-host-actions
 */
import { readFileSync, readdirSync, statSync } from "fs"
import { join as pathJoin } from "path"
import { canInvite, canModerate, type JumpaModerationAction, type ModerationActor, type ModerationTarget } from "../lib/jumpa/permissions"
import { attendanceOnJoin, attendanceOnLeave, isAttending, sweepActionFor, webhookDedupeKey, type AttendanceState } from "../lib/jumpa/lifecycle"

let passed = 0
let failed = 0
function check(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✅ ${label}`) }
  else { failed++; console.log(`  ❌ ${label}`) }
}
const read = (p: string) => readFileSync(pathJoin(process.cwd(), p), "utf8")
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = pathJoin(dir, f)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

const host: ModerationActor = { userId: "h", roomRole: "HOST", effective: "GURU" }
const cohost: ModerationActor = { userId: "c", roomRole: "COHOST", effective: "GURU" }
const guruMember: ModerationActor = { userId: "g", roomRole: "MEMBER", effective: "GURU" }
const muridHost: ModerationActor = { userId: "mh", roomRole: "HOST", effective: "MURID" }
const muridMember: ModerationActor = { userId: "m", roomRole: "MEMBER", effective: "MURID" }
const tMurid: ModerationTarget = { userId: "m", roomRole: "MEMBER", effective: "MURID" }
const tGuru: ModerationTarget = { userId: "g", roomRole: "MEMBER", effective: "GURU" }
const tCohost: ModerationTarget = { userId: "c2", roomRole: "COHOST", effective: "GURU" }
const tHost: ModerationTarget = { userId: "h", roomRole: "HOST", effective: "GURU" }
const ok = (actor: ModerationActor, action: JumpaModerationAction, target?: ModerationTarget, roomKind: "KELAS" | "GURU" | "MURID" = "KELAS") =>
  canModerate({ actor, action, roomKind, target }).ok

console.log("\n=== JUMPA FASE 2 — KONTROL HOST ===\n")

console.log("1. Guru host")
for (const a of ["MUTE_AUDIO", "MUTE_VIDEO", "STOP_SCREEN", "REMOVE"] as const) check(`Host boleh ${a} murid`, ok(host, a, tMurid))
for (const a of ["LOCK", "UNLOCK", "END", "TOGGLE_CHAT", "ALLOW_MURID_SCREEN", "DISALLOW_MURID_SCREEN"] as const) check(`Host boleh ${a}`, ok(host, a))
check("Host boleh jadikan guru co-host", ok(host, "SET_COHOST", tGuru))
check("Host TIDAK bisa jadikan murid co-host", !ok(host, "SET_COHOST", tMurid))
check("Host tidak bisa SET_COHOST yang sudah co-host", !ok(host, "SET_COHOST", tCohost))
check("Host utama dapat menaikkan peserta webinar ke panggung", canModerate({ actor: host, action: "ALLOW_STAGE", roomKind: "GURU", target: tMurid }).ok)
check("Host utama dapat menurunkan peserta dari panggung", canModerate({ actor: host, action: "REMOVE_STAGE", roomKind: "GURU", target: tMurid }).ok)
check("Host tidak dapat mengatur panggung di ruang kelas", !canModerate({ actor: host, action: "ALLOW_STAGE", roomKind: "KELAS", target: tMurid }).ok)
check("Host boleh cabut co-host", ok(host, "UNSET_COHOST", tCohost))
check("UNSET_COHOST ke non-cohost ditolak", !ok(host, "UNSET_COHOST", tGuru))
check("Tidak bisa menindak diri sendiri", !ok(host, "REMOVE", { ...tGuru, userId: "h" }))
check("Aksi bersasaran tanpa target ditolak", !ok(host, "MUTE_AUDIO"))
check("Izin layar murid hanya di ruang KELAS", !ok(host, "ALLOW_MURID_SCREEN", undefined, "GURU"))

console.log("\n2. Co-host (guru)")
for (const a of ["MUTE_AUDIO", "MUTE_VIDEO", "STOP_SCREEN", "REMOVE"] as const) check(`Co-host boleh ${a} murid`, ok(cohost, a, tMurid))
check("Co-host boleh kunci/buka", ok(cohost, "LOCK") && ok(cohost, "UNLOCK"))
check("Co-host TIDAK bisa akhiri untuk semua", !ok(cohost, "END"))
check("Co-host tidak bisa atur co-host", !ok(cohost, "SET_COHOST", tGuru))
check("Co-host tidak dapat menaikkan atau menurunkan peserta panggung", !canModerate({ actor: cohost, action: "ALLOW_STAGE", roomKind: "GURU", target: tMurid }).ok && !canModerate({ actor: cohost, action: "REMOVE_STAGE", roomKind: "GURU", target: tMurid }).ok)
check("Co-host tidak bisa atur obrolan / izin layar", !ok(cohost, "TOGGLE_CHAT") && !ok(cohost, "ALLOW_MURID_SCREEN"))
check("Co-host tidak bisa menindak co-host lain", !ok(cohost, "REMOVE", tCohost))
check("Tidak ada yang bisa menindak HOST", !ok(cohost, "MUTE_AUDIO", tHost) && !ok(host, "REMOVE", { ...tHost, userId: "x" }))

console.log("\n3. Peserta & murid")
for (const a of ["MUTE_AUDIO", "REMOVE", "LOCK", "END", "TOGGLE_CHAT", "DELETE_CHAT"] as const) check(`Guru member tidak boleh ${a}`, !ok(guruMember, a, tMurid))
for (const a of ["MUTE_AUDIO", "MUTE_VIDEO", "STOP_SCREEN", "REMOVE", "LOCK", "END", "DELETE_CHAT"] as const) {
  check(`Murid member tidak boleh ${a} (di KELAS & MURID)`, !ok(muridMember, a, tMurid, "KELAS") && !ok(muridMember, a, tMurid, "MURID"))
}
check("Murid host ruang MURID boleh kunci/buka/akhiri ruangnya", ok(muridHost, "LOCK", undefined, "MURID") && ok(muridHost, "UNLOCK", undefined, "MURID") && ok(muridHost, "END", undefined, "MURID"))
for (const a of ["MUTE_AUDIO", "MUTE_VIDEO", "STOP_SCREEN", "REMOVE", "DELETE_CHAT", "TOGGLE_CHAT", "SET_COHOST"] as const) {
  check(`Murid host TIDAK punya kuasa atas murid lain: ${a}`, !ok(muridHost, a, tMurid, "MURID"))
}
check("Murid 'HOST' di ruang KELAS (tak mungkin) tetap tanpa kuasa", !ok(muridHost, "END", undefined, "KELAS"))

console.log("\n3b. Pengamanan panggung webinar");
const tokenRoute = read("app/api/jumpa/rooms/[code]/token/route.ts");
const roomView = read("components/jumpa/JumpaRoomView.tsx");
const panels = read("components/jumpa/RoomPanels.tsx");
const stageActions = read("lib/jumpa/room-actions.ts");
check("Token webinar peserta biasa tidak memberi izin publikasi", tokenRoute.includes('ctx.room.mode === "WEBINAR" && roomRole === "MEMBER"') && tokenRoute.includes("? []"));
check("Kamera dan mikrofon peserta webinar mati saat masuk", roomView.includes('props.info.mode === "WEBINAR" && props.self.roomRole === "MEMBER"'));
check("Tombol panggung hanya muncul bagi pemandu utama", panels.includes('self.roomRole === "HOST"') && panels.includes('"Naikkan ke panggung"') && panels.includes('"Turunkan dari panggung"'));
check("Aksi panggung mengubah izin LiveKit di server", stageActions.includes('case "ALLOW_STAGE":') && stageActions.includes("buildParticipantPermission([...sources])"));
check("Kegagalan izin panggung tidak dilaporkan berhasil", stageActions.includes('if (!updated) return fail(503, "MEDIA_UNAVAILABLE"'));
const jumpaService = read("lib/jumpa/service.ts");
const jumpaSchema = read("prisma/schema.prisma");
const stageMigration = read("prisma/migrations/20261031120000_jumpa_webinar_stage/migration.sql");
check("Izin panggung tersimpan pada peserta", jumpaSchema.includes("stageApproved Boolean") && stageMigration.includes('ADD COLUMN "stageApproved" BOOLEAN NOT NULL DEFAULT false'));
check("Persetujuan panggung dibaca saat token diterbitkan", jumpaService.includes("stageApproved: participant.stageApproved") && tokenRoute.includes("!ctx.participant?.stageApproved"));
check("Persetujuan panggung disimpan setelah izin LiveKit berhasil", stageActions.includes('data: { stageApproved: action === "ALLOW_STAGE" }'));

console.log("\n4. Undangan")
const inv = (actor: ModerationActor, roomKind: "KELAS" | "GURU" | "MURID", invite: Parameters<typeof canInvite>[0]["invite"]) => canInvite({ actor, roomKind, invite }).ok
check("Host KELAS undang kelasnya sendiri", inv(host, "KELAS", { kind: "GROUP", ownsGroup: true, groupActive: true }))
check("Host KELAS tidak bisa undang kelas guru lain", !inv(host, "KELAS", { kind: "GROUP", ownsGroup: false, groupActive: true }))
check("Kelas nonaktif tidak bisa diundang", !inv(host, "KELAS", { kind: "GROUP", ownsGroup: true, groupActive: false }))
check("Undangan kelas tidak untuk ruang GURU", !inv(host, "GURU", { kind: "GROUP", ownsGroup: true, groupActive: true }))
check("Host GURU undang komunitas (anggota, disetujui)", inv(host, "GURU", { kind: "COMMUNITY", isCommunityMember: true, communityApproved: true }))
check("Komunitas belum disetujui ditolak", !inv(host, "GURU", { kind: "COMMUNITY", isCommunityMember: true, communityApproved: false }))
check("Komunitas tidak untuk ruang KELAS", !inv(host, "KELAS", { kind: "COMMUNITY", isCommunityMember: true, communityApproved: true }))
check("Tautan guru hanya ruang GURU", inv(host, "GURU", { kind: "LINK" }) && !inv(host, "KELAS", { kind: "LINK" }))
check("Ruang GURU: undang guru ya, murid tidak", inv(host, "GURU", { kind: "USER", targetEffective: "GURU" }) && !inv(host, "GURU", { kind: "USER", targetEffective: "MURID", targetInActorGroups: true }))
check("Ruang KELAS: murid kelas sendiri ya, murid lain tidak", inv(host, "KELAS", { kind: "USER", targetEffective: "MURID", targetInActorGroups: true }) && !inv(host, "KELAS", { kind: "USER", targetEffective: "MURID", targetInActorGroups: false }))
check("Pengguna tak dikenal ditolak", !inv(host, "KELAS", { kind: "USER", targetEffective: null }))
check("Co-host guru boleh mengundang", inv(cohost, "GURU", { kind: "USER", targetEffective: "GURU" }))
check("Member tidak bisa mengundang", !inv(guruMember, "GURU", { kind: "USER", targetEffective: "GURU" }))
check("Murid tidak bisa mengundang (termasuk host ruang MURID)", !inv(muridHost, "MURID", { kind: "USER", targetEffective: "MURID", targetInActorGroups: true }) && !inv(muridMember, "KELAS", { kind: "LINK" }))
check("Ruang MURID tidak menerima undangan apa pun", !inv(host, "MURID", { kind: "USER", targetEffective: "GURU" }))

console.log("\n5. Auto-akhir (cron sweep)")
const NOW = new Date("2026-10-18T05:00:00Z")
const live = (minAgo: number, max = 60, warnedAt: Date | null = null) => ({ status: "LIVE" as const, startedAt: new Date(NOW.getTime() - minAgo * 60_000), createdAt: new Date(NOW.getTime() - minAgo * 60_000), maxDurationMin: max, warnedAt })
check("LIVE baru 10 mnt → tidak ada aksi", sweepActionFor(live(10), NOW) === null)
check("Sisa 10 mnt → WARN", sweepActionFor(live(50), NOW) === "WARN")
check("Sudah diperingatkan → tidak WARN lagi", sweepActionFor(live(52, 60, new Date()), NOW) === null)
check("Tepat di batas → END_TIME_LIMIT", sweepActionFor(live(60), NOW) === "END_TIME_LIMIT")
check("Lewat batas → END_TIME_LIMIT", sweepActionFor(live(125, 120), NOW) === "END_TIME_LIMIT")
check("ENDED → tidak disentuh", sweepActionFor({ ...live(500), status: "ENDED" }, NOW) === null)
const sched = (hAgo: number) => ({ status: "SCHEDULED" as const, startedAt: null, createdAt: new Date(NOW.getTime() - hAgo * 3_600_000), maxDurationMin: 120, warnedAt: null })
check("SCHEDULED 2 jam → biarkan", sweepActionFor(sched(2), NOW) === null)
check("SCHEDULED > 24 jam → END_STALE", sweepActionFor(sched(25), NOW) === "END_STALE")

console.log("\n6. Kehadiran (webhook)")
const t0 = new Date("2026-10-18T05:00:00Z")
const at = (s: number) => new Date(t0.getTime() + s * 1000)
let s: AttendanceState = { lastJoinedAt: null, lastLeftAt: null, totalSeconds: 0, joinCount: 0 }
s = attendanceOnJoin(s, at(0))
check("Join → hadir, joinCount 1", isAttending(s) && s.joinCount === 1)
s = attendanceOnLeave(s, at(600))
check("Leave setelah 10 mnt → 600 dtk", !isAttending(s) && s.totalSeconds === 600)
const again = attendanceOnLeave(s, at(900))
check("Leave ganda idempoten", again.totalSeconds === 600)
s = attendanceOnJoin(s, at(1000))
s = attendanceOnJoin(s, at(1300)) // leave hilang
check("Join ganda menutup sesi sebelumnya (+300)", s.totalSeconds === 900 && s.joinCount === 3)
s = attendanceOnLeave(s, at(1360))
check("Total akumulatif", s.totalSeconds === 960)
const crazy = attendanceOnLeave(attendanceOnJoin({ lastJoinedAt: null, lastLeftAt: null, totalSeconds: 0, joinCount: 0 }, at(0)), at(48 * 3600))
check("Satu sesi dibatasi 6 jam (event hilang)", crazy.totalSeconds === 6 * 3600)
check("Dedupe pakai id event", webhookDedupeKey("EV_1", "participant_joined", "bc-x", "u", 1) === "wh:EV_1")
check("Dedupe fallback deterministik", webhookDedupeKey(undefined, "participant_left", "bc-x", "u", 5) === webhookDedupeKey(undefined, "participant_left", "bc-x", "u", 5))

console.log("\n7. Kontrol lewat server API (statis)")
const clientFiles = walk("components/jumpa").filter((f) => /\.(tsx?|css)$/.test(f))
check("Komponen klien tidak mengimpor livekit-server-sdk", clientFiles.every((f) => !read(f).includes("livekit-server-sdk")))
check("Komponen klien tidak menyebut roomAdmin", clientFiles.every((f) => !read(f).includes("roomAdmin")))
const roomActionsSource = read("lib/jumpa/room-actions.ts")
check("moderate() memutuskan lewat canModerate", roomActionsSource.includes("canModerate({ actor: me.actor, action, roomKind: room.kind, target })"))
check("REMOVE mencatat removedAt sebelum memutus LiveKit", roomActionsSource.indexOf("removedAt: new Date(), removedById") < roomActionsSource.indexOf("await removeLivekitParticipant("))
check("Keluarkan mencabut token lama (revokeTokenTs)", read("lib/jumpa/livekit.ts").includes("revokeTokenTs"))
check("endRoomForAll idempoten (updateMany status ≠ ENDED)", roomActionsSource.includes('where: { id: room.id, status: { not: "ENDED" } }'))
const modRoute = read("app/api/jumpa/rooms/[code]/moderation/route.ts")
check("Rute moderasi: flag guard + auth + rate limit", ["jumpaDisabledResponse()", "getUser()", "rateLimitRoute("].every((x) => modRoute.includes(x)))
const cron = read("app/api/cron/jumpa-sweep/route.ts")
check("Cron sweep fail-closed tanpa CRON_SECRET (503)", cron.includes("if (!secret)") && cron.includes("status: 503"))
check("Cron sweep pakai perbandingan waktu-konstan", cron.includes("timingSafeEqual"))
check("Cron sweep dilewati (200) saat flag mati", cron.includes("if (!JUMPA_ENABLED)"))
check("Crontab memanggil jumpa-sweep tiap 5 menit", /^\*\/5 \* \* \* \* .*\/api\/cron\/jumpa-sweep/m.test(read("ops/vps/cron/root.crontab")))
const webhook = read("app/api/jumpa/webhook/route.ts")
check("Webhook memverifikasi tanda tangan (WebhookReceiver)", webhook.includes("new WebhookReceiver(config.apiKey, config.apiSecret).receive(body, auth)"))
check("Webhook tanpa Authorization → 401", webhook.includes('if (!auth) return jumpaError(401'))
check("Proxy: webhook dikecualikan dari redirect domain (hanya path itu)", read("lib/supabase/proxy.ts").includes('pathname === "/api/jumpa/webhook"'))
const bg = read("lib/jumpa/background.ts")
check("Webhook idempoten via dedupeKey unik (P2002 → duplicate)", bg.includes("dedupeKey") && bg.includes('"P2002"'))

console.log(`\n${passed} lulus, ${failed} gagal\n`)
if (failed > 0) process.exit(1)
