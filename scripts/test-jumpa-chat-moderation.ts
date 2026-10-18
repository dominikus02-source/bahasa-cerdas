/**
 * JUMPA Fase 2 — uji obrolan, moderasi, sinyal data-channel, tangan,
 * reaksi, laporan & log. Murni (tanpa DB/jaringan) + cek statis wiring.
 * Jalankan: npm run test:jumpa-chat-moderation
 */
import { readFileSync } from "fs"
import { join as pathJoin } from "path"
import { sanitizeChatContent, toChatView, chatRetentionCutoff, CHAT_DELETED_PLACEHOLDER } from "../lib/jumpa/chat"
import {
  canDeleteChat,
  canModerate,
  canViewRoomLogs,
  reportRecipients,
  JUMPA_REPORT_CATEGORIES,
  type ModerationActor,
} from "../lib/jumpa/permissions"
import { JUMPA_CHAT_MAX_LEN, JUMPA_CHAT_RETENTION_DAYS } from "../lib/jumpa/caps"
import {
  encodeSignal,
  parseServerSignal,
  parsePeerSignal,
  handQueue,
  allowReaction,
  JUMPA_TOPICS,
  JUMPA_REACTIONS,
} from "../lib/jumpa/signals"

let passed = 0
let failed = 0
function check(label: string, cond: boolean) {
  if (cond) { passed++; console.log(`  ✅ ${label}`) }
  else { failed++; console.log(`  ❌ ${label}`) }
}
const read = (p: string) => readFileSync(pathJoin(process.cwd(), p), "utf8")
const enc = (v: unknown) => new TextEncoder().encode(JSON.stringify(v))

console.log("\n— Sanitasi obrolan —")
check("Kosong ditolak", !sanitizeChatContent("   ").ok)
check("Bukan string ditolak", !sanitizeChatContent(42).ok)
const long = sanitizeChatContent("a".repeat(JUMPA_CHAT_MAX_LEN + 1))
check("Terlalu panjang ditolak (CHAT_TOO_LONG)", !long.ok && long.code === "CHAT_TOO_LONG")
check("Tepat batas diterima", sanitizeChatContent("a".repeat(JUMPA_CHAT_MAX_LEN)).ok)
const html = sanitizeChatContent("<script>alert(1)</script>halo <b>kawan</b>")
check("Tag HTML dibuang", html.ok && !html.content.includes("<") && html.content.includes("halo kawan"))
const onlyTags = sanitizeChatContent("<img src=x>")
check("Hanya tag → kosong", !onlyTags.ok && onlyTags.code === "CHAT_EMPTY")
const ctrl = sanitizeChatContent("baris1\nbaris2\u0007")
check("Baris baru dipertahankan, karakter kontrol dibuang", ctrl.ok && ctrl.content === "baris1\nbaris2")
check("Pesan error berbahasa Indonesia", !long.ok && /karakter/.test(long.message))

console.log("\n— Soft-delete & retensi —")
const base = { id: "m1", userId: "u1", content: "rahasia", createdAt: new Date("2026-10-18T03:00:00Z") }
const live = toChatView({ ...base, deletedAt: null }, "Ani")
const gone = toChatView({ ...base, deletedAt: new Date() }, "Ani")
check("Pesan aktif tampil apa adanya", live.content === "rahasia" && !live.deleted)
check("Pesan terhapus: konten tidak pernah dikirim", gone.content === CHAT_DELETED_PLACEHOLDER && gone.deleted && !JSON.stringify(gone).includes("rahasia"))
check("createdAt ISO", live.createdAt === "2026-10-18T03:00:00.000Z")
const now = new Date("2026-10-18T00:00:00Z")
check(`Retensi ${JUMPA_CHAT_RETENTION_DAYS} hari`, now.getTime() - chatRetentionCutoff(now).getTime() === JUMPA_CHAT_RETENTION_DAYS * 86_400_000)
check("Retensi default 90 hari", JUMPA_CHAT_RETENTION_DAYS === 90)

console.log("\n— Izin hapus obrolan & moderasi —")
const gHost: ModerationActor = { userId: "g1", roomRole: "HOST", effective: "GURU" }
const gCo: ModerationActor = { userId: "g2", roomRole: "COHOST", effective: "GURU" }
const gMem: ModerationActor = { userId: "g3", roomRole: "MEMBER", effective: "GURU" }
const mHost: ModerationActor = { userId: "m1", roomRole: "HOST", effective: "MURID" }
const mMem: ModerationActor = { userId: "m2", roomRole: "MEMBER", effective: "MURID" }
check("Pemilik pesan boleh hapus pesannya", canDeleteChat({ actor: mMem, messageUserId: "m2", roomKind: "KELAS" }).ok)
check("Murid tidak boleh hapus pesan orang lain", !canDeleteChat({ actor: mMem, messageUserId: "x", roomKind: "KELAS" }).ok)
check("Guru host boleh hapus pesan siapa pun", canDeleteChat({ actor: gHost, messageUserId: "x", roomKind: "KELAS" }).ok)
check("Guru co-host boleh hapus pesan", canDeleteChat({ actor: gCo, messageUserId: "x", roomKind: "GURU" }).ok)
check("Guru anggota biasa tidak boleh hapus pesan orang lain", !canDeleteChat({ actor: gMem, messageUserId: "x", roomKind: "GURU" }).ok)
check("Murid host (ruang MURID) tidak boleh hapus pesan teman", !canDeleteChat({ actor: mHost, messageUserId: "x", roomKind: "MURID" }).ok)
check("Murid host hanya kunci/buka/akhiri", ["LOCK", "UNLOCK", "END"].every((a) => canModerate({ actor: mHost, action: a as "LOCK", roomKind: "MURID" }).ok))
check("Murid host tidak bisa mute/keluarkan", !canModerate({ actor: mHost, action: "REMOVE", roomKind: "MURID", target: { userId: "m2", roomRole: "MEMBER", effective: "MURID" } }).ok)
check("Co-host tidak bisa mengakhiri ruang", !canModerate({ actor: gCo, action: "END", roomKind: "KELAS" }).ok)
check("Co-host tidak bisa matikan obrolan", !canModerate({ actor: gCo, action: "TOGGLE_CHAT", roomKind: "KELAS" }).ok)
check("Host bisa matikan obrolan", canModerate({ actor: gHost, action: "TOGGLE_CHAT", roomKind: "KELAS" }).ok)
check("Host tidak bisa menindak dirinya", !canModerate({ actor: gHost, action: "MUTE_AUDIO", roomKind: "KELAS", target: { userId: "g1", roomRole: "HOST", effective: "GURU" } }).ok)
check("Co-host hanya guru", !canModerate({ actor: gHost, action: "SET_COHOST", roomKind: "KELAS", target: { userId: "m2", roomRole: "MEMBER", effective: "MURID" } }).ok)

console.log("\n— Sinyal data-channel (anti-pemalsuan) —")
const chatNew = { t: "chat.new", message: { id: "c1", userId: "u1", name: "Ani", content: "hai", deleted: false, createdAt: "x" } }
check("chat.new dari server diterima", parseServerSignal(JUMPA_TOPICS.chat, enc(chatNew), true)?.t === "chat.new")
check("chat.new dari peserta DITOLAK", parseServerSignal(JUMPA_TOPICS.chat, enc(chatNew), false) === null)
check("room.ended palsu dari peserta ditolak", parseServerSignal(JUMPA_TOPICS.room, enc({ t: "room.ended", reason: "HOST" }), false) === null)
check("mod.removed dari server diterima", parseServerSignal(JUMPA_TOPICS.moderation, enc({ t: "mod.removed" }), true)?.t === "mod.removed")
check("Topik salah ditolak", parseServerSignal(JUMPA_TOPICS.hand, enc({ t: "mod.removed" }), true) === null)
check("Tanpa topik ditolak", parseServerSignal(undefined, enc({ t: "mod.removed" }), true) === null)
check("Alasan room.ended tidak dikenal ditolak", parseServerSignal(JUMPA_TOPICS.room, enc({ t: "room.ended", reason: "HACK" }), true) === null)
check("JSON rusak ditolak", parseServerSignal(JUMPA_TOPICS.room, new TextEncoder().encode("{oops"), true) === null)
check("Payload > 16 KB ditolak", parseServerSignal(JUMPA_TOPICS.chat, enc({ ...chatNew, pad: "x".repeat(17_000) }), true) === null)
check("room.role nilai tak sah ditolak", parseServerSignal(JUMPA_TOPICS.room, enc({ t: "room.role", userId: "u", roomRole: "ADMIN" }), true) === null)
check("encodeSignal ↔ parse bolak-balik", parseServerSignal(JUMPA_TOPICS.room, encodeSignal({ t: "room.locked", locked: true }), true)?.t === "room.locked")
check("Angkat tangan dari peserta diterima", parsePeerSignal(JUMPA_TOPICS.hand, enc({ t: "hand", raised: true, at: 5 }), "MEMBER")?.t === "hand")
check("hand.lower dari MEMBER ditolak", parsePeerSignal(JUMPA_TOPICS.hand, enc({ t: "hand.lower", userId: "x" }), "MEMBER") === null)
check("hand.lower dari metadata kosong ditolak", parsePeerSignal(JUMPA_TOPICS.hand, enc({ t: "hand.lower", userId: "x" }), null) === null)
check("hand.lower dari HOST diterima", parsePeerSignal(JUMPA_TOPICS.hand, enc({ t: "hand.lower", userId: "x" }), "HOST")?.t === "hand.lower")
check("hand.lower dari COHOST diterima", parsePeerSignal(JUMPA_TOPICS.hand, enc({ t: "hand.lower", userId: "x" }), "COHOST")?.t === "hand.lower")
check("Peserta tidak bisa kirim di topik server", parsePeerSignal(JUMPA_TOPICS.chat, enc(chatNew), "HOST") === null)
check("Reaksi yang dikenal diterima", JUMPA_REACTIONS.every((r) => parsePeerSignal(JUMPA_TOPICS.reaction, enc({ t: "react", r }), "MEMBER")?.t === "react"))
check("Reaksi bebas (teks/emoji sembarang) ditolak", parsePeerSignal(JUMPA_TOPICS.reaction, enc({ t: "react", r: "<b>x</b>" }), "MEMBER") === null)

console.log("\n— Antrean tangan & batas reaksi —")
const q = handQueue([{ userId: "c", at: 30 }, { userId: "a", at: 10 }, { userId: "b", at: 10 }, { userId: "d", at: 20 }])
check("Antrean urut waktu angkat, seri → userId", q.map((x) => x.userId).join("") === "abdc")
check("handQueue tidak memutasi input", (() => { const arr = [{ userId: "b", at: 2 }, { userId: "a", at: 1 }]; handQueue(arr); return arr[0].userId === "b" })())
check("Reaksi ke-5 dalam 3 dtk masih boleh", allowReaction([0, 100, 200, 300], 400))
check("Reaksi ke-6 dalam 3 dtk ditolak", !allowReaction([0, 100, 200, 300, 400], 500))
check("Setelah jendela lewat boleh lagi", allowReaction([0, 100, 200, 300, 400], 3500))

console.log("\n— Laporan & log —")
const r1 = reportRecipients({ groupTeacherId: "gt", creatorId: "m1", creatorEffective: "MURID", adminIds: ["a1", "a2"], reporterId: "m2" })
check("Laporan ruang kelas → guru kelas + admin", r1.length === 3 && r1.includes("gt") && r1.includes("a1"))
check("Murid pembuat ruang tidak menerima laporan", !r1.includes("m1"))
const r2 = reportRecipients({ groupTeacherId: null, creatorId: "g1", creatorEffective: "GURU", adminIds: ["a1"], reporterId: "g9" })
check("Ruang guru tanpa kelas → host guru + admin", r2.includes("g1") && r2.includes("a1"))
const r3 = reportRecipients({ groupTeacherId: "gt", creatorId: "gt", creatorEffective: "GURU", adminIds: ["gt", "a1"], reporterId: "a1" })
check("Pelapor tidak menerima laporannya sendiri, tanpa duplikat", !r3.includes("a1") && r3.length === 1)
const room = { createdById: "m1", groupTeacherId: "gt" }
check("Admin melihat semua log", canViewRoomLogs({ userId: "a", role: "ADMIN", isFounder: false }, room))
check("Guru kelas melihat log ruang MURID kelasnya", canViewRoomLogs({ userId: "gt", role: "GURU", isFounder: false }, room))
check("Guru lain tidak melihat log", !canViewRoomLogs({ userId: "gx", role: "GURU", isFounder: false }, room))
check("Murid (termasuk pembuat) tidak melihat log", !canViewRoomLogs({ userId: "m1", role: "MURID", isFounder: false }, room))
check("Kategori laporan berbahasa Indonesia", Object.values(JUMPA_REPORT_CATEGORIES).includes("Perundungan / kata-kata kasar") && "OTHER" in JUMPA_REPORT_CATEGORIES)

console.log("\n— Wiring statis —")
const actions = read("lib/jumpa/room-actions.ts")
const sendChatBody = actions.slice(actions.indexOf("export async function sendChat"))
const iCreate = sendChatBody.indexOf("jumpaChatMessage.create(")
const iSignal = sendChatBody.indexOf("sendServerSignal(")
check("Obrolan disimpan dulu baru disiarkan", iCreate > 0 && iSignal > iCreate)
check("Hapus obrolan = soft-delete (update deletedAt)", /jumpaChatMessage\.update\([^)]*deletedAt/s.test(actions) && !/jumpaChatMessage\.delete\(/.test(actions))
check("Laporan menyimpan cuplikan obrolan (50 pesan terakhir)", /chatSnapshot/.test(actions) && /take: 50/.test(actions))
const bg = read("lib/jumpa/background.ts")
check("Sweep menghapus obrolan lewat retensi", /jumpaChatMessage\.deleteMany\(\{\s*where:\s*\{\s*createdAt:\s*\{\s*lt:\s*chatRetentionCutoff/.test(bg))
const mig = read("prisma/migrations/20261018120000_jumpa_phase2/migration.sql")
const code = mig.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n")
check("Migrasi Fase 2 aditif (tanpa DROP/RENAME/ALTER TYPE)", !/\bDROP\s+(TABLE|COLUMN|INDEX|TYPE|CONSTRAINT)\b/i.test(code) && !/\bRENAME\b/i.test(code) && !/ALTER\s+COLUMN[^;]*\bTYPE\b/i.test(code))
check("Kolom baru NOT NULL punya DEFAULT", code.split(/ADD COLUMN/i).slice(1).every((c) => { const seg = c.split(/,\n|;/)[0]; return !/NOT NULL/i.test(seg) || /DEFAULT/i.test(seg) }))
check("RLS aktif untuk 3 tabel baru", ["JumpaInvite", "JumpaChatMessage", "JumpaReport"].every((t) => code.includes(`ALTER TABLE "${t}" ENABLE ROW LEVEL SECURITY`)))
const chatRoute = read("app/api/jumpa/rooms/[code]/chat/route.ts")
check("Rute obrolan memakai rate limit", /rateLimitRoute/.test(chatRoute))
const pantau = read("lib/jumpa/pantau.ts")
check("Panel pantau tersaring izin log", /canViewRoomLogs|isPantauViewer/.test(pantau))

console.log(`\n${passed} lulus, ${failed} gagal\n`)
if (failed > 0) process.exit(1)
