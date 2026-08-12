# OBROLAN 4.0 — FINAL REPORT

**Tanggal:** 12 Agustus 2026
**Status:** ✅ SELESAI — tanpa commit/push (sesuai instruksi, berhenti setelah laporan)

---

## 1. Ringkasan Eksekutif

`/arena/chat` (Web) bertransformasi dari halaman Arena menjadi **produk Student Shell: Class Communication Workspace**. Web memakai chrome-nya sendiri (top bar "Obrolan", tanpa header/subnav Arena, tanpa banner boost), workspace desktop-first selebar 1440px (sidebar 280–320 / percakapan flex-1 / konteks 280–320), akses kelas-only (anggota + guru kelas), moderasi guru (hapus pesan soft-delete, kunci/buka obrolan), dan integritas kelas aktif dipertahankan di semua lapisan. URL `/arena/chat` tetap, perilaku APK (TWA) 100% tidak berubah. Semua data real (0 mock/fake).

**Hasil verifikasi:** 95/95 test Obrolan 4.0 · 14/14 suite regresi hijau · tsc 0 error · ESLint 0 error · build exit 0 (364/364 halaman).

## 2. Audit Temuan (Pra-Implementasi)

| # | Temuan | Dampak |
|---|--------|--------|
| A1 | `Group` tidak punya kolom lock; `ChatMessage` tidak punya deletedAt/deletedBy | Moderasi & lock butuh schema baru → pengecualian `prisma/` (spesifikasi §S) |
| A2 | Guru TIDAK tercatat sebagai GroupMember | Kelas yang diampu guru tidak pernah muncul di sidebar → sumber kedua: `teacherId: user.id` |
| A3 | Tidak ada API moderasi/lock | Perlu 2 route baru (additive) |
| A4 | Tidak ada model unread-count | Fitur unread disembunyikan (spesifikasi: "jika tersedia") |
| A5 | Layout merender header Arena + subnav pills + banner di SEMUA route arena (web) | Perlu branch `isChatWeb` |
| A6 | `ActiveBoostBanner` hadir di semua route | Harus disembunyikan di web chat |
| A7 | Global nav murid (`MuridMobileNav`, murid layout, bottom-nav) merujuk `/arena/chat` | TIDAK disentuh (URL tetap) |

## 3. Arsitektur & Keputusan Desain

- **Student Shell, bukan Arena page:** web chat memakai top bar sendiri (h-14, logo MessageCircle, tagline "Ruang komunikasi kelas", aksi Dasbor + HeaderActions + LogoutButton). Konsep sama dengan RUTE_TANPA_GERBANG (login bare) — chrome minimal untuk produk non-Arena.
- **Dua sumber kelas di sidebar:** `GroupMember` (di mana user terdaftar) + `Group.teacherId === user.id` (kelas yang diampu, untuk GURU/ADMIN/founder) — di-dedupe via `Set`.
- **Server-enforced, bukan sekadar UI:** lock dicek di POST send (403 `CLASS_CHAT_LOCKED`), delete dicek di route DELETE, semua route memakai `isActive: true` di query.
- **Soft-delete audit-friendly:** konten pesan tidak pernah dihapus dari DB; klien hanya menerima placeholder `{deleted: true, content: null, user: null}`.
- **Lock state tunggal:** `lockedMap` di client diinisialisasi dari data server, disinkron dari polling GET, dan diubah hanya lewat `toggleLock` → POST lock.
- **APK-aware heights:** shell `md:h-[calc(100dvh-7rem)]` (APK, chrome Arena + BottomNav) vs `md:h-[calc(100dvh-3.5rem)]` (web, top bar Obrolan 56px).
- **Statistik moderasi WIB:** `moderationStats` menghitung "pesan hari ini" mulai 00:00 WIB (UTC+7) — konsisten zona Indonesia.

## 4. Perubahan Prisma (Additive) + Migrasi Manual

`prisma/schema.prisma` (7+ / 2−, 2 "hapus" hanya whitespace alignment):

```prisma
model Group {
  ...
  isActive        Boolean          @default(true)
  chatLocked      Boolean          @default(false)   // +BARU
  ...
}

model ChatMessage {
  ...
  content   String
  deletedAt DateTime?   // +BARU (soft-delete)
  deletedBy String?     // +BARU (audit siapa)
  createdAt DateTime  @default(now())
}
```

**Migrasi manual:** `prisma/migrations/manual/2026-08-12_obrolan4_chat_lock.sql` (idempotent: `ADD COLUMN IF NOT EXISTS` ×3 + index `ChatMessage_groupId_deletedAt_idx`).
⚠️ **WAJIB dijalankan di Supabase SQL Editor (PRODUCTION + PREVIEW)** — sebelum itu kolom tidak ada di runtime (route meng-query-nya).

## 5. File Diubah

| File | Perubahan |
|------|-----------|
| `prisma/schema.prisma` | +chatLocked, +deletedAt, +deletedBy (additive) |
| `app/api/chat/[groupId]/route.ts` | select +chatLocked; respons +`locked` + `moderation` (guru saja); `sanitizeMessages()` sembunyikan pesan terhapus |
| `app/api/chat/send/route.ts` | select +chatLocked; enforcement `chatLocked && !isTeacher` → 403 CLASS_CHAT_LOCKED |
| `app/arena/chat/page.tsx` | REWRITE: GROUP_SELECT + ownedGroups (teacherId) + dedupe Set + `isTeacher` per kelas |
| `app/arena/chat/chat-client.tsx` | REWRITE 4.0 (~980 baris): lock, moderasi, delete menu, badge GURU, empty states, APK-aware shell |
| `app/arena/layout.tsx` | Branch `isChatWeb`: top bar Obrolan sendiri, subnav/banner disembunyikan, container 1440px |
| `scripts/test-arena-chat.ts` | Diperluas 43 → 95 checks (T.1–T.30 + regresi) |
| `scripts/test-arena-web.ts` | Pengecualian prisma/ didokumentasikan (additive chat lock) |
| `scripts/test-student-shell.ts` | Pengecualian prisma/ didokumentasikan |
| `scripts/test-karya-consolidation.ts` | Forbidden list: prisma/ → hanya schema.prisma dilarang selain itu |
| `scripts/test-social-hardening.ts` | Migrasi yang diizinkan: +2026-08-12_obrolan4_chat_lock.sql |

## 6. File Baru

| File | Fungsi |
|------|--------|
| `app/api/chat/message/[messageId]/route.ts` | DELETE — soft-delete pesan: owner ATAU guru kelas/admin/founder; idempotent; 404 CHAT_MESSAGE_NOT_FOUND, 403 CHAT_DELETE_FORBIDDEN |
| `app/api/chat/[groupId]/lock/route.ts` | POST `{locked}` — kunci/buka obrolan: guru kelas/admin/founder only; 404 CLASS_NOT_FOUND, 403 CHAT_LOCK_FORBIDDEN |
| `prisma/migrations/manual/2026-08-12_obrolan4_chat_lock.sql` | Migrasi idempotent |

## 7. File TIDAK Disentuh (Zona Lindung — 0 diff)

`lib/apk.ts` · `lib/gamification/` · `lib/learning-loop/` · `engines/` · `app/api/player/` · `app/api/group/` · `app/arena/bottom-nav.tsx` · `components/dashboard/MuridMobileNav.tsx` · `app/(dashboard)/murid/layout.tsx` — diverifikasi `git diff --name-only HEAD` kosong. (Pengecualian: `prisma/` dibuka sesuai §S, terbatas schema.prisma + 1 file SQL.)

## 8. UI/UX — Student Shell Web

- Top bar sticky sendiri: logo MessageCircle gradient violet, judul "Obrolan", tagline "Ruang komunikasi kelas", aksi Dasbor Murid/Guru + HeaderActions + Logout.
- Header Arena (desktop), subnav pills (desktop + mobile), dan `ActiveBoostBanner` TIDAK dirender di web chat.
- Mobile top bar ikut berubah: logo MessageCircle + label "Obrolan" + href `/arena/chat` (bukan "A" / "Arena").

## 9. Desktop Workspace (1440px)

- Container chat: `max-w-[1440px] py-0 md:px-8` (halaman arena lain tetap `max-w-lg md:max-w-4xl`).
- 3 pane: sidebar daftar kelas (w-72 → lg:w-80) · percakapan `flex-1 min-w-0` · konteks `hidden xl:flex w-[300px]`.
- Sidebar berisi: nama kelas, nama guru kelas (real `teacher.fullName`), badge kunci untuk kelas terkunci, chip "N Kelas Aktif", lastMessage asli `{pengirim}: {isi}`, pencarian kelas.

## 10. Responsif (Mobile-First)

- <768px: daftar kelas jadi layar penuh + back chevron "Kembali ke daftar kelas".
- 768–1023: sidebar toggle (listToggle, tombol List, `md:flex`/`lg:flex`).
- <1280: konteks jadi drawer (`role=dialog`, w-80 max-w-[85vw], backdrop bg-black/40).
- Tanpa fixed min-width; `flex-1 min-w-0` + `break-words` mencegah overflow.

## 11. Akses Murid (Class-Only)

- GET/SEND: member (GroupMember) atau guru kelas (teacherId) atau admin/founder — 403 `CLASS_MESSAGE_FORBIDDEN` di luar itu.
- Guru pratinjau (isGuruPreview) bisa masuk ke kelas yang diampunya via sidebar sendiri.
- URL langsung kelas mati → client menampilkan "Obrolan tidak tersedia" + tombol "Kembali ke Obrolan" (router.refresh).

## 12. Moderasi Guru

- **Hapus pesan (soft-delete):** guru kelas/admin/founder bisa hapus pesan siapa pun; murid hanya pesan sendiri (403 CHAT_DELETE_FORBIDDEN). Menu "Hapus pesan" (MoreVertical) hanya muncul untuk pesan yang boleh dihapus.
- **Placeholder:** pesan terhapus dirender "Pesan telah dihapus" (MessageCircleOff) — isi tidak pernah bocor ke klien (`sanitizeMessages`).
- **Statistik moderasi:** panel MODERASI guru menampilkan status (Aktif/Terkunci), "Pesan hari ini" dan "Pesan dihapus" (hitungan DB WIB) — hanya dikirim ke guru kelas via `moderation: isTeacher ? … : undefined`.

## 13. Chat Lock (Server-Enforced)

- Guru kelas kunci/buka via POST `/api/chat/[groupId]/lock`; murid/guru kelas lain → 403 CHAT_LOCK_FORBIDDEN.
- Saat terkunci: murid ditolak di server (403 CLASS_CHAT_LOCKED) DAN composer menampilkan "Obrolan sedang dikunci oleh guru." tanpa input kirim; guru melihat banner amber dengan tombol "Buka Kembali".
- State sync: server → client via respons GET (`locked`) dan inisialisasi dari `groups[].chatLocked`.

## 14. Kelas Inaktif (Arsip/Hapus)

- Tidak tampil di sidebar (filter `isActive: true` di kedua sumber query).
- GET → 404 CLASS_NOT_FOUND · SEND → 404 · DELETE message → 404 · lock → 404.
- Client: convState unavailable + empty state "Kelas ini sudah tidak aktif." + tombol kembali.

## 15. Perubahan API

| Route | Perubahan |
|-------|-----------|
| GET `/api/chat/[groupId]` | +`locked`, +`moderation` (guru kelas saja), pesan terhapus di-mask (kontrak lama `{messages}` + limit/before/after tetap) |
| POST `/api/chat/send` | +403 `CLASS_CHAT_LOCKED` saat terkunci & bukan guru (kontrak lain tetap) |
| DELETE `/api/chat/message/[messageId]` | **BARU** — soft-delete, idempotent |
| POST `/api/chat/[groupId]/lock` | **BARU** — lock/unlock guru |

## 16. Kompatibilitas APK (TWA)

- `isChatWeb = !apk && …` → APK tidak pernah memakai chrome Obrolan (tetap chrome Arena + BottomNav).
- `isApk()` dari `lib/apk.ts` tidak berubah; BottomNav tidak berubah; join kelas di APK tetap modal inline (`POST /api/group/join`), web tetap `/murid/gabung-kelas`.
- Tinggi workspace APK `md:h-[calc(100dvh-7rem)]` persis seperti 3.0.

## 17. Test Suite

**`test:arena-chat` — 95/95 ✅** (T.1–T.30 + regresi 3.0):
T.1 script ada · T.2 tanpa nav Arena di web · T.3 APK compat · T.4–5 aktif-only · T.6–7 API blokir inaktif · T.8 URL langsung → unavailable · T.9–12 member/guru baca+kirim · T.13–14 moderasi · T.15–16 lock otorisasi · T.17 locked blokir murid · T.18 unlock · T.19 tanpa fake data · T.20 preview anggota real · T.21 lastMessage real · T.22 empty states · T.23 responsif · T.24 dark mode (160 token) · T.25 no overflow · T.26 BottomNav 0 diff · T.27 zona lindung · T.28 moderation stats WIB · T.29 lock sync · T.30 sidebar real + badge GURU.

**Regresi (semua hijau):** arena-web (47) · student-shell (31) · student-home (51) · student-consolidation · karya-consolidation (40) · global-works-discovery (31/31) · premium-economy (63/63) · social-hardening (27/27) · gamification-engine (SEMUA LULUS).

*Catatan:* test-arena-web, test-student-shell, test-karya-consolidation, test-social-hardening diperbarui untuk mengecualikan perubahan prisma/ chat-lock yang diizinkan §S (dokumentasi di komentar masing-masing).

## 18. TypeScript

`npx tsc --noEmit` → **0 errors** (satu fix: `Avatar name` fallback `m.user?.fullName || "?"` untuk pesan yang user-nya null).

## 19. Build

`npm run build` (dummy env) → **exit 0, compiled 37.7s, 364/364 halaman diprerender** (naik dari 359 — tambahan dari fase sebelumnya + route baru).

## 20. diff-check & ESLint

- `git diff --check` → bersih.
- ESLint 12 file (2 client, 1 layout, 4 route, 5 test): **0 errors, 1 warning** `<img>` (Avatar — konsisten konvensi arena yang sudah ada).
- Diff zona lindung: kosong.

## 21. Gap, Risiko Regresi & Verdict

**Gap / tindak lanjut:**
1. **Migrasi SQL** `2026-08-12_obrolan4_chat_lock.sql` harus dijalankan founder di Supabase SQL Editor (PRODUCTION + PREVIEW) — sebelum itu chatLocked/deletedAt/deletedBy belum ada di DB (query akan error).
2. Moderasi stats "Pesan hari ini" mulai berlaku WIB setelah SQL jalan.
3. Admin/founder mendapat akses tapi `moderation` hanya dikirim ke guru kelas (isTeacher = teacherId) — keputusan konservatif.
4. Tidak ada unread badge (tidak ada model — sesuai spesifikasi "jika tersedia").

**Risiko regresi:** rendah. Semua kontrak respons lama (shape, error code, polling) dipertahankan; perubahan prisma additive; zona lindung 0 diff; APK tidak tersentuh. Test legacy yang menyentuh chat sudah diverifikasi ulang.

**Verdict:** ✅ **OBROLAN 4.0 SELESAI dan siap deploy** — sesuai spesifikasi (AUDIT → PLAN → IMPLEMENT → TEST → BUILD). **TIDAK ada commit/push** (per instruksi); perubahan tersimpan di working tree (11 modified + 3 new).
