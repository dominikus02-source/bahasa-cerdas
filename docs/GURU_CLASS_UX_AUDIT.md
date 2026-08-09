# GURU CLASS UX AUDIT — BahasaCerdas

> Status: **AUDIT — belum ada implementasi**. Dokumen ini hanya temuan + rekomendasi.
> Tanggal audit: 8 Agustus 2026 · Mode: ADDITIVE-ONLY · Semua perubahan memerlukan persetujuan founder.

---

## 1. Ringkasan Eksekutif

Ekosistem Guru BahasaCerdas secara fungsional **lengkap** — kelas, tugas, nilai, bank soal,
pengumuman, penilaian, game, simulasi semuanya ada dan route-nya hidup. Masalah utama BUKAN
"fitur hilang", melainkan tiga hal struktural:

1. **SSOT murid/kelas hanya dipakai 5 route.** `lib/teacher/students.ts` (getTeacherGroups /
   getTeacherStudents / getTeacherStudentIds) baru dipakai oleh `/api/group`, `/api/guru/siswa`,
   `/api/guru/dashboard/analytics`, `/api/guru/game-hub`, dan `SimulationAnalyticsService`.
   Selebihnya ~30 route guru/murid menulis ulang query `group.findMany`/`groupMember.findMany`/
   `user.findMany` secara inline dengan filter & guard yang **tidak konsisten** (62 match di audit).
2. **Dua gaya guard akses.** Route lama pakai `createClient()` + `supabase.auth.getUser()` + cek
   role inline (`role.toUpperCase() !== "GURU"`); route baru pakai `getUser()` +
   `isTeacherOrStudent` (GURU|ADMIN|founder). Akibat: founder/ADMIN tidak konsisten diperlakukan —
   mis. `/api/guru/quiz/[id]/assign` menolak founder/ADMIN (hanya GURU), sedangkan
   `/api/guru/bank-soal/send` mengizinkan GURU/ADMIN/founder.
3. **Backend AI Latihan yatim (orphan).** `POST /api/guru/latihan` (AI generate, DeepSeek→Groq→
   Gemini) dan `/api/guru/latihan/pick` **tidak punya pemanggil UI sama sekali**. Halaman bank-soal
   saat ini hanya: daftar latihan (GET), kirim soal MASTER_BANK (send), preview. Guru tidak punya
   tombol untuk *membuat* latihan AI baru dari UI.

Root cause "Belum ada siswa terdaftar" sudah terkonfirmasi dan ter-fix: `/api/guru/siswa` dulu
hanya mengizinkan role `GURU` → founder/ADMIN kena 403 → list kosong; kini memakai
`isTeacherOrStudent`.

---

## 2. Sumber Data & Metodologi

- Baca kode langsung (bukan inferensi): `lib/teacher/students.ts`, `prisma/schema.prisma`
  (model Group/GroupMember/Quiz/Penugasan/Pengumuman/Soal/BankSoal/Nilai), seluruh route di
  `app/api/group/**` dan `app/api/guru/{quiz,kelasku,pengumuman,penugasan,nilai,gradebook,siswa,
  game-hub,dashboard,bank-soal,latihan,materi}**`, serta halaman
  `app/(dashboard)/guru/{data-siswa,kelasku,kuis,kuis/new,tugas-murid,bank-soal,bank-soal/[id],
  soal,penilaian,gradebook,beranda,game,materi-ajar,media-pembelajaran,olimpiade,akun}` dan
  `components/dashboard/GuruNav.tsx`.
- Grep repository: `group.findMany|groupMember.findMany|user.findMany|groupMember.findUnique`
  di `app/api` → 62 match. `getTeacherStudents|getTeacherStudentIds|getTeacherGroups` → 29 match.
- QA baseline: `tsc --noEmit` 0 error; `test:guru-phase` & `test:gamification-engine` SEMUA
  LULUS; `test:simulation-workflow` 65/65; `test-phase-simulation-workflow` 65/65;
  `test:bigt-menu` 23/23; build dengan dummy env sukses (tanpa env gagal — isu env masking, bukan
  regresi).
- **BASELINE FAILURE pra-eksis (di luar area audit)**: `test:bahasa-ui` 5 kegagalan di
  `BigtInfoPage.tsx`/panel RPP.

---

## 3. Current IA vs Target IA

`components/dashboard/GuruNav.tsx` — `GURU_NAV` (12 grup; founderOnly = Admin; maks 1 level submenu).

| # | Target IA (founder) | Aktual GURU_NAV | Status |
|---|---|---|---|
| 1 | Beranda | Beranda → `/guru/beranda` (link langsung) | ✅ |
| 2 | Pusat Literasi | Pusat Literasi → `/guru/feed-karya` (link langsung) | ✅ |
| 3 | Alat Ajar | Alat Ajar (accordion): Bank Soal, Materi Ajar, Buku Ajar, Media Pembelajaran | ✅ |
| 4 | Kelasku | Kelasku (accordion): Dashboard Kelas, Tugas, **Nilai**, Data Siswa | ⚠️ **Pengumuman tidak ada di submenu** (hanya tab di dalam `/guru/kelasku`) |
| 5 | Gim | Gim → `/guru/game` | ✅ |
| 6 | Toko Karya | Toko Karya (accordion): Jual Karya, Jelajahi Karya `/marketplace`, Pendapatan `/guru/pengaturan/saldo` | ✅ |
| 7 | Simulasi & Tes | Simulasi & Tes (accordion): UKBI, TKA, Evaluasi Simulasi (activeOn 3 legacy), BIGT | ✅ |
| 8 | Alat AI | Alat AI → `/guru/ai-tools` | ✅ |
| 9 | Komunitas | Komunitas → `/guru/komunitas` | ✅ |
| 10 | Kalender | Kalender → `/guru/olimpiade` | ⚠️ hub "Kalender Kegiatan" **statis** (Lomba/Olimpiade, Kalender Event, Webinar) — tanpa data/API |
| 11 | Akun Saya | Akun Saya (accordion): Ringkasan Akun `/guru/akun`, Profil | ✅ |
| 12 | Admin | Admin → `/admin` (founderOnly) | ✅ |

**Semua route target ada di filesystem (tidak ada 404 langsung).** Catatan:
- "Nilai" memakai `activeOn: ["/guru/penilaian", "/guru/gradebook"]` sehingga Buku Nilai ikut menandai "Nilai" aktif — bagus.
- "Evaluasi Simulasi" memakai `activeOn` 3 route legacy (hasil-simulasi/tinjau-simulasi/dokumen-latihan) — bagus.
- Kalender menunjuk `/guru/olimpiade` yang judulnya memang "Kalender Kegiatan", tapi konten subhalaman-nya statis.

---

## 4. Route Inventory Guru (Ringkas)

Tabel lengkap 62 match query raw ada di **Lampiran A**. Ringkasan per domain:

### Kelas & Data Siswa
| Route | Guard | SSOT? | Catatan |
|---|---|---|---|
| GET/POST `/api/group` | `isTeacherOrStudent` | ✅ `getTeacherGroups` | POST buat kelas, `generateCode()` 8 char (alfabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`) |
| POST `/api/group/join` | dbUser | raw (unik legit) | cocok `accessCode`+`isActive`, 409 jika sudah member |
| GET `/api/group/[id]` | teacher owner | raw | detail kelas guru (members, quizzes.results, progres, UKBI/TKA) |
| GET `/api/group/[id]/student` | membership | raw (unik legit) | tampilan murid |
| GET `/api/group/memberships` | dbUser (tanpa role check) | raw | list keanggotaan murid |
| POST `/api/group/[id]/claim` | membership | raw (tx unik) | claim kelas |
| GET `/api/guru/siswa` | `isTeacherOrStudent` | ✅ `getTeacherStudents` | **SSOT; dedupe lintas kelas** |
| PATCH `/api/guru/siswa/[id]` | role GURU + owned | raw | noAbsen/NISN, cek membership kelas milik guru |

### Kelasku (dashboard detail) — DUPLIKASI
| Route | Catatan |
|---|---|
| GET `/api/guru/kelasku/[id]` | detail guru (members + tugasAktif + pengumuman + materis + nilais + progres) |
| GET `/api/group/[id]` | detail guru SERUPA (members + quizzes + progres + UKBI/TKA) |

Dua endpoint teacher-detail yang tumpang-tindih; halaman `/guru/kelasku` memakai salah satunya
(membaca member progress termasuk `quizResults/ukbiCount/tkaCount`). **Rekomendasi: jadikan
satu.**

### Kuis / Bank Soal / Latihan
| Route | Guard | Catatan |
|---|---|---|
| GET/POST `/api/guru/quiz` | lawas (createClient) | GET filter status/type/kelas + `_count`; POST buat kuis |
| POST `/api/guru/quiz/[id]/assign` | **hanya role GURU** | validasi `quiz.creatorId` + groupIds milik guru; upsert `quizId_groupId`; notif+push. **founder/ADMIN ditolak** — tidak konsisten dengan route lain |
| GET `/api/guru/bank-soal` | lawas GURU/ADMIN/founder | grupkan MASTER_BANK by topik+kelas (tema) |
| POST `/api/guru/bank-soal/send` | lawas GURU/ADMIN/founder | ambil acak MASTER_BANK (clamp 5–30), bump `usedCount`, buat Quiz LATIHAN + QuizQuestion + QuizAssignment per kelas, notif + XP `GURU_TUGAS` |
| GET `/api/guru/bank-soal/preview` | GURU/ADMIN/founder | pratinjau soal (tanpa bump usedCount) |
| GET/POST `/api/guru/latihan` | lawas | **POST AI-generate → TIDAK ADA UI** |
| GET/DELETE `/api/guru/latihan/[id]`, `.../assignment/[assignId]` | — | analitik per latihan; hapus assignment per kelas |
| POST `/api/guru/latihan/pick` | — | **TIDAK ADA UI** |
| GET/POST/PUT/DELETE `/api/guru/soal`, `/api/guru/soal-set`, `/api/guru/soal-set/[id]/questions` | lawas | manajemen soal manual + set |

### Tugas, Pengumuman, Penilaian
| Route | Guard | Catatan |
|---|---|---|
| GET/POST `/api/guru/penugasan` | lawas | list + progress; POST buildLatihan/buildKuis/resolvePraktik + XP |
| GET/POST `/api/guru/pengumuman` | lawas | GET by groupId (order pinned desc); POST create+notify+XP |
| PATCH/DELETE `/api/guru/pengumuman/[id]` | lawas | edit + toggle pinned |
| GET `/api/guru/nilai` | pemilik kelas | filter groupId/kategoriId/userId |
| POST `/api/guru/nilai/auto-populate` | GURU | 5 sumber (Tugas/Kuis/Game/Jalur Cerdas/UKBI-TKA) |
| POST `/api/guru/nilai/kuis-grade` | — | → upsertNilaiOtomatis (QUIZ) |
| GET/POST `/api/guru/nilai/bulk`, `/api/guru/nilai/stats`, `/api/guru/nilai/export` | — | input massal / stat / CSV+DOCX |
| GET `/api/guru/gradebook` | pemilik | tanpa groupId = daftar kelas; dengan groupId = members+kategoris+nilais+penugasans |
| GET/POST `/api/guru/materi`, `/api/guru/materi/[id]/kirim` | lawas | materi ajar (kirim ke kelas = group.findMany raw) |
| GET `/api/guru/panduan` | — | buku panduan (Buku Ajar) |

---

## 5. SSOT Audit — lib/teacher/students.ts

**Definisi (sudah benar):**
- `isTeacherOrStudent(user)` → role `GURU` | `ADMIN` | `isFounder` → true.
- `STUDENT_SELECT` → id/fullName/avatar/email/xp/level/streak/league/lastActiveAt + `profile.noAbsen/nisn`.
- `getTeacherGroups(teacherId)` → kelas milik guru + `isActive`.
- `getTeacherStudents(teacherId)` → **dedupe** murid lintas kelas via `getTeacherStudentIds` → `user.findMany({ id in ids, isActive? })`.
- `getTeacherStudentIds(teacherId)` → id unik murid semua kelas guru.

**Pemakaian produksi (HANYA 5):**
| File | Fungsi |
|---|---|
| `app/api/group/route.ts` | getTeacherGroups |
| `app/api/guru/siswa/route.ts` | getTeacherStudents |
| `app/api/guru/dashboard/analytics/route.ts` | getTeacherStudentIds |
| `app/api/guru/game-hub/route.ts` | getTeacherStudentIds |
| `lib/simulation/SimulationAnalyticsService.ts` | ketiganya (rekap/tinjau/dokumen) |

**Kesenjangan:** ~30 route masih inline query murid/kelas (lihat Lampiran A). Risiko nyata:
- Scope kelas tidak seragam (ada yang `teacherId` saja, ada yang `teacherId && isActive`, ada yang
  `groupMember` dari sisi murid tanpa cek guru).
- Filter role murid tidak konsisten (SSOT sengaja **tanpa filter role** — semua anggota kelas;
  beberapa route lama menambahkan `role: "MURID"`, yang bisa menghilangkan anggota non-murid).
- Founder/ADMIN di beberapa route ditolak (see §6).

**Rekomendasi SSOT (additive):**
1. Migrasi bertahap route guru ke `getTeacherStudents/getTeacherStudentIds/getTeacherGroups`.
2. Jangan menambah filter role di SSOT — pertahankan "semua anggota kelas aktif".
3. Tambah satu helper baru bila perlu (mis. `getGroupMembersForTeacher(teacherId, groupId)` untuk
   guard kelas spesifik) supaya pola `group.findMany({teacherId})` + `groupMember.findMany({groupId})`
   tidak diulang.

---

## 6. Guard/Auth Consistency

| Gaya | Pola | Contoh |
|---|---|---|
| **Baru** | `getUser()` (lib/supabase/server) + `isTeacherOrStudent` | `/api/guru/siswa`, `/api/group`, `/api/guru/dashboard/analytics`, `/api/guru/game-hub` |
| **Lawas** | `createClient()` + `supabase.auth.getUser()` + `db.user.findUnique` + cek role inline | `/api/guru/quiz`, `/api/guru/bank-soal`, `/api/guru/quiz/[id]/assign`, `/api/guru/penugasan`, `/api/guru/pengumuman`, `/api/guru/siswa/[id]` |

**Bug konsistensi terdeteksi:**
- `/api/guru/quiz/[id]/assign` → `role?.toUpperCase() !== "GURU"` → **menolak ADMIN & founder**,
  sedangkan route bank-soal send mengizinkan keduanya. Founder yang mengakses kelasku → assign kuis
  gagal 403.
- Pola lawas juga rawan karena `db.user.findUnique({supabaseId})` tanpa cache, dan role diambil
  dari DB Prisma (bukan dari Supabase session), sehingga perubahan role perlu sinkronisasi.

**Rekomendasi:** semua endpoint guru baru harus pakai `getUser()` + `isTeacherOrStudent`; route
lawas dimigrasi bertahap. Standar baku: **GURU | ADMIN | founder = boleh mengelola kelas**.

---

## 7. Root Cause — "Belum ada siswa terdaftar"

- Gejala: `/guru/data-siswa` kosong untuk founder/ADMIN.
- Akar: `/api/guru/siswa` hanya mengizinkan `role === "GURU"` → founder/ADMIN 403 → [].
- Status: **FIXED** — route kini memakai `isTeacherOrStudent` (GURU|ADMIN|founder) + SSOT
  `getTeacherStudents`.
- Catatan: dengan SSOT dedupe lintas kelas, murid yang ikut >1 kelas milik guru yang sama muncul
  sekali. Untuk murid lintas-guru, data tetap per-guru (kelas milik guru itu).

---

## 8. Kelasku Deep Dive

- Halaman `/guru/kelasku` (±1001 baris, client): satu halaman tanpa `[id]` route; detail kelas
  dibuka via modal (`showGroup`); punya tab pengumuman (CRUD + pin). Interface `MemberProgress`
  membawa `progress`, `quizResults`, `ukbiCount`, `tkaCount` → memakai GET `/api/group/[id]`.
- API `/api/guru/kelasku/[id]` ada dan serupa (members + tugasAktif + pengumuman + materis +
  nilais + progres, take 50) — **duplikasi dengan `/api/group/[id]`**.
- **Temuan:** target IA memasukkan "Pengumuman" sebagai anak Kelasku, tetapi submenu saat ini tidak
  mencantumkannya (hanya tab di dalam halaman). Keputusan:
  - Opsi A (rekomendasi, additive): biarkan sebagai tab di `/guru/kelasku`, cukup catat di
    dokumentasi (nav tetap 4 item) — tidak menambah route.
  - Opsi B: buat `/guru/pengumuman` halaman mandiri + tambah link di submenu Kelasku.

---

## 9. Alat Ajar Deep Dive

### Bank Soal `/guru/bank-soal` (rewrite LATIHAN HARIAN — saat ini ±547 baris)
Fungsi sekarang:
1. **Kirim ke Kelas** — grid tema MASTER_BANK (dari `GET /api/guru/bank-soal`), klik → modal pilih
   kelas+grup, jumlah soal (clamp 5–30), difficulty, tenggat → `POST /api/guru/bank-soal/send`
   (buat Quiz LATIHAN + assignments + XP guru). Ada **Preview** (`GET /api/guru/bank-soal/preview`).
2. **Latihan Saya** — daftar `GET /api/guru/latihan` (quiz type LATIHAN milik guru) dengan stat
   assignment/submission; klik → analitik `/guru/bank-soal/[id]`; hapus assignment per kelas.
3. Pool UKBI/TKA + asesmen (assessment modal) — preservasi existing.

**Temuan besar:** wizard "AI Generate" (4 langkah) yang ada di AGENTS.md **SUDAH TIDAK ADA** di
halaman ini. Grep seluruh repo membuktikan `POST /api/guru/latihan` dan `/api/guru/latihan/pick`
tidak dipanggil oleh UI mana pun. Guru hanya bisa: (a) kirim soal MASTER_BANK existing, (b)
kelola soal manual di `/guru/soal`, (c) buat kuis manual di `/guru/kuis/new`. **Fitur AI latihan
terpotong di backend.**

### Orphan (hidup tapi tidak di nav)
- `/guru/kuis` (+ `/new`, `/kuis/[id]/results`, `/kuis/[id]/assign`) — builder kuis manual.
- `/guru/soal` — "Semua Soal" (kelola soal + set).
- `/guru/buat-tka`, `/guru/hasil-tka`, `/guru/tka-guru`, `/guru/tka-utbk`, `/guru/bank-soal-tka`,
  `/guru/bank-soal-ukbi` — legacy, tidak di nav.
- `/guru/video-belajar`, `/guru/artikel` — tetap hidup, dikonsolidasi ke Media Pembelajaran (tab).
- `/guru/sertifikat`, `/guru/kompetensi`, `/guru/ukbi` — redirect stub.

### Broken link (potensi 404)
- `/guru/kuis/page.tsx` memuat link **`/guru/kuis/${quiz.id}/edit`** tetapi route
  `/guru/kuis/[id]/edit` **tidak ada** di filesystem → klik = 404. (Kuis di-edit lewat `/guru/soal`/
  build ulang, bukan edit in-place.)

### Materi Ajar & Buku Ajar
- `/guru/materi-ajar` → CRUD materi via `POST /api/guru/materi` (+kirim via `/api/guru/materi/[id]/kirim`,
  scope kelas raw).
- `/guru/panduan-guru` (Buku Ajar) → `GET /api/guru/panduan`; kirim unit sebagai penugasan via
  `/api/guru/penugasan`.

---

## 10. Penilaian & Gradebook (existing, sudah solid)

- `/guru/penilaian` (571 baris): selector kelas, CRUD NilaiKategori, "Ambil Nilai Otomatis"
  (5 sumber, dry-run + import), tabel nilai siswa×kategori (badge sumber, edit + manual-protection),
  export CSV/DOC. `SUMBER_LABEL`: MANUAL/PENUGASAN/KARYA/QUIZ/GAME/JALUR_CERDAS/UKBI_TKA/
  MATERI_LATIHAN; ambang `getColor` 85/70/60/40.
- Subroute: `/penilaian/kuis` (grade kuis → upsertNilaiOtomatis), `/penilaian/input-massal`
  (`POST /api/guru/nilai/bulk`), `/penilaian/rapor` (rapor A–E).
- `/guru/gradebook`: tab `kategori|penugasan`, `SUMBER_COLOR` konsisten, stats bar rata/tertinggi/
  terendah, search, export CSV.
- Guard pemilik kelas via `group.teacherId === dbUser.id` (raw group.findMany) — aman tapi duplikat.

---

## 11. Data Issues & Opportunities

| # | Temuan | Severitas | Saran |
|---|---|---|---|
| 1 | `User.league` ditandai USANG di schema (diganti PlayerProfile/weeklyXP) | Rendah | jangan dipakai untuk fitur baru; pertahankan utk kompat |
| 2 | `noAbsen` tanpa constraint unik per kelas | Rendah | validasi app-level saat PATCH; hindari migration berat |
| 3 | SSOT tanpa filter role murid (semua anggota kelas) | Info | keputusan sudah benar — jangan ubah |
| 4 | MASTER_BANK `usedCount` di-bump setiap kirim → distribusi merata | Info | ok; jangan expose ke guru |
| 5 | Detail kelas diduplikasi di 2 API (`/api/group/[id]` & `/api/guru/kelasku/[id]`) | Sedang | satukan (additive: jadikan satu sebagai superset) |
| 6 | `POST /api/guru/quiz/[id]/assign` menolak ADMIN/founder | Sedang | samakan guard ke isTeacherOrStudent |
| 7 | AI Latihan (POST `/api/guru/latihan`) tanpa UI | Sedang | tambah UI entry (wizard) di Alat Ajar atau Bank Soal |
| 8 | Kalender `/guru/olimpiade` statis tanpa data | Rendah | biarkan sebagai landing, atau wire ke data event |

---

## 12. Orphan Routes & Broken Links

**Orphan (hidup, tidak di nav — keputusan V3 "route lama tetap hidup"):**
`/guru/kuis*`, `/guru/soal*`, `/guru/buat-tka`, `/guru/hasil-tka`, `/guru/tka-guru`,
`/guru/tka-utbk`, `/guru/bank-soal-tka`, `/guru/bank-soal-ukbi`, `/guru/video-belajar`,
`/guru/artikel`, `/guru/olimpiade/{info,kalender,webinar}`.

**Broken:**
- `/guru/kuis/[id]/edit` — link ada di `/guru/kuis` tapi route TIDAK ADA → 404.

---

## 13. User Flows (Current vs Proposed)

### F1 — Melihat data siswa
- **Current:** Kelasku → Data Siswa (`/guru/data-siswa`) → `GET /api/guru/siswa` (SSOT) → tabel +
  edit noAbsen inline (`PATCH /api/guru/siswa/[id]`).
- **Proposed:** sama (sudah SSOT). Tambah: klik baris → lihat progres (gradebook/penilaian), CTA
  "Kirim Tugas", "Kirim Pengumuman" dari halaman Data Siswa.
- Klik: `Data Siswa` → tabel → (detail siswa baru).

### F2 — Kirim tugas/kuis ke kelas
- **Current (Bank Soal):** Alat Ajar → Bank Soal → grid tema → "Kirim ke Kelas" → pilih kelas +
  jumlah + difficulty + tenggat → `POST /api/guru/bank-soal/send` → Quiz LATIHAN + assignment.
- **Current (Kuis manual):** (orphan) `/guru/kuis/new` → wizard 3 langkah → `POST /api/guru/quiz`
  → `/guru/kuis/[id]/assign` → pilih kelas.
- **Current (Penugasan):** Alat Ajar → Buku Ajar → pilih bab → "Kirim" → modal pilih kelas +
  tenggat → `POST /api/guru/penugasan`.
- **Proposed:** satukan di Alat Ajar. Bank Soal = tema/paket siap kirim + wizard AI (hidupkan
  kembali). Kuis manual tetap di `/guru/kuis` (link dari Alat Ajar). CTA konsisten "Kirim → pilih
  kelas → tenggat → notifikasi murid".

### F3 — Kelola nilai
- **Current:** Kelasku → Nilai (`/guru/penilaian`) → auto-populate / edit manual → export;
  Buku Nilai (`/guru/gradebook`) tab kategori/penugasan. Guard pemilik kelas di masing-masing.
- **Proposed:** sama (sudah modern). Tambah jembatan dari Data Siswa → profil nilai siswa.

### F4 — Kirim pengumuman
- **Current:** Kelasku → Dashboard Kelas → tab Pengumuman → form → `POST /api/guru/pengumuman` →
  notifikasi murid + XP guru. Pin/edit via `PATCH /api/guru/pengumuman/[id]`.
- **Proposed:** opsional tambah shortcut di Beranda (CTA "+ Buat → Pengumuman") yang
  deep-link ke `/guru/kelasku?tab=pengumuman`.

### F5 — Kirim latihan (bank soal)
- **Current:** Bank Soal → kirim MASTER_BANK (send) → cek analitik `/guru/bank-soal/[id]`.
- **Proposed:** tambah langkah **AI Generate** (wizard) sebelum kirim (backend sudah siap), dan
  preview sebelum konfirmasi (preview route sudah ada).

---

## 14. Temuan Kunci — AI Latihan Orphan

- Backend: `POST /api/guru/latihan` — tema+kelas+difficulty → AI (DeepSeek→Groq→Gemini) → simpan
  Soal + Quiz LATIHAN + QuizQuestion. Rate-limit 20/min.
- Backend: `POST /api/guru/latihan/pick` — random pick untuk guru (per MASTER_QUESTION_BANK.md).
- UI: **tidak ada pemanggil** (grep seluruh repo — hanya GET list & DELETE di bank-soal pages).
- Dampak: guru tidak bisa membuat latihan baru dengan AI dari UI; fitur terlihat "hilang" meski
  backend jalan.
- Saran (additive): tambahkan tombol "Buat Latihan AI" di `/guru/bank-soal` → wizard (tema,
  kelas, jumlah, difficulty) → `POST /api/guru/latihan` → muncul di "Latihan Saya".

---

## 15. Rekomendasi IA Final (Proposed — menunggu persetujuan)

```
Beranda
Pusat Literasi            → /guru/feed-karya
Alat Ajar (accordion)     → Bank Soal (/guru/bank-soal) [+ "Buat Latihan AI" di dalam halaman]
                            Materi Ajar (/guru/materi-ajar)
                            Buku Ajar (/guru/panduan-guru)
                            Media Pembelajaran (/guru/media-pembelajaran)
                            Kuis (BARU → /guru/kuis)          ← kuis manual saat ini orphan
Kelasku (accordion)       → Dashboard Kelas (/guru/kelasku)
                            Tugas (/guru/tugas-murid)
                            Nilai (/guru/penilaian; activeOn /guru/gradebook)
                            Data Siswa (/guru/data-siswa)
                            Pengumuman (OPSIONAL: link dalam halaman atau tab — tanpa route baru)
Gim                       → /guru/game
Toko Karya (accordion)    → Jual Karya / Jelajahi / Pendapatan
Simulasi & Tes (accordion)→ UKBI / TKA / Evaluasi Simulasi (activeOn legacy) / BIGT
Alat AI                   → /guru/ai-tools
Komunitas                 → /guru/komunitas
Kalender                  → /guru/olimpiade (tetap hub; opsional wire data)
Akun Saya (accordion)     → Ringkasan Akun / Profil
Admin                     → /admin (founderOnly)
```

**Jawaban atas 4 pertanyaan founder** (dari data audit):
1. *SSOT murid?* → Sudah ada (`lib/teacher/students.ts`), TAPI hanya 5 route yang pakai → **migrasi
   bertahap** + jadikan wajib untuk route guru baru.
2. *Di mana "kelas action" (kirim tugas/kuis/materi/pengumuman) berada?* → Tersebar: kirim penugasan
   di Buku Ajar, kirim bank soal di Bank Soal, pengumuman di Kelasku, materi di Materi Ajar.
   Tidak ada satu tempat "Kirim ke Kelas". **Rekomendasi: Alat Ajar = content creation, Kelasku =
   class action** (sesuai rencana founder); tiap item konten punya tombol "Kirim ke Kelas" yang
   konsisten.
3. *Data murid lengkap?* → Ya lewat SSOT (profil + noAbsen + nisn + xp/level/streak + progres).
4. *Duplicate backend?* → Ada: detail kelas 2 API, pattern query murid ~30 tempat, guard 2 gaya.
   **Semua additive-fixable, tidak perlu migration schema besar.**

---

## 16. Implementation Roadmap (Additive-Only, menunggu persetujuan)

1. **P0 — Guard & konsistensi:** samakan `POST /api/guru/quiz/[id]/assign` ke `isTeacherOrStudent`;
   arahkan semua endpoint guru baru ke `getUser()`+`isTeacherOrStudent`.
2. **P0 — Broken link:** tambah halaman `/guru/kuis/[id]/edit` ATAU ubah link di `/guru/kuis`
   menjadi edit di `/guru/soal`/build ulang.
3. **P1 — SSOT migrasi:** pindahkan ~16 route guru "daftar kelas/murid" ke
   `getTeacherGroups/getTeacherStudents/getTeacherStudentIds` (tanpa ubah response shape).
4. **P1 — Hidupkan AI Latihan:** tambah wizard "Buat Latihan AI" di `/guru/bank-soal` memakai
   `POST /api/guru/latihan` (backend siap). Preview sebelum kirim (route siap).
5. **P1 — Konsolidasi detail kelas:** jadikan satu endpoint superset (tanpa hapus route lama).
6. **P2 — Kelasku/Pengumuman:** opsional link Pengumuman di submenu Kelasku; CTA "+ Buat →
   Pengumuman" di Beranda deep-link ke tab.
7. **P2 — Kalender:** wire `/guru/olimpiade` ke data (atau biarkan landing statis).
8. **QA:** jalankan seluruh test chain + `tsc` + build dummy env sebelum push.

---

## 17. Risk Register

| Risiko | Level | Mitigasi |
|---|---|---|
| Migrasi SSOT mengubah scope kelas (salah filter) | Medium | Additive-only; response shape sama; test per route |
| Founder/ADMIN menolak assign kuis (bug aktif) | Medium | Fix guard P0 |
| AI Latihan tidak ada UI → guru pindah kompetitor | Medium | Wizard P1 |
| Perubahan nav memengaruhi test (`test-bigt-menu`, `test-simulation-workflow`) | Medium | Pertahankan route legacy + `activeOn`; update test eksplisit |
| Migration SQL tidak diterapkan (GameRoom groupId, noAbsen, learning_loop, pengumuman_pin, ai_evaluation) | Medium | Daftar SQL manual menunggu eksekusi user di SQL Editor |

**SQL manual yang masih menunggu dijalankan di Supabase SQL Editor** (dari fase sebelumnya):
`2026-08-02_no_absen.sql` (noAbsen) — sisanya sudah dijalankan user. GameRoom `groupId` masih
belum (catat sebagai blocker utk F2/Gradebook game).

---

## 18. QA Baseline (hasil audit, bukan perubahan)

| Check | Hasil |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run test:guru-phase` | ✅ SEMUA LULUS |
| `npm run test:gamification-engine` | ✅ SEMUA LULUS |
| `npm run test:simulation-workflow` | ✅ 65/65 |
| `npx tsx scripts/test-phase-simulation-workflow.ts` | ✅ 65/65 |
| `npm run test:bigt-menu` | ✅ 23/23 |
| `npm run build` (dummy env) | ✅ sukses |
| `test:bahasa-ui` | ⚠️ 5 kegagalan PRA-EKSIS (BigtInfoPage/panel RPP, di luar area audit) |
| All nav target routes exist | ✅ (no 404 di nav) |
| Broken link `/guru/kuis/[id]/edit` | ❌ route tidak ada |

---

## 19. Files Changed

**Tidak ada file yang diubah.** Dokumen ini hasil audit read-only (audit → laporan → menunggu
persetujuan → implementasi).

---

## 20. Lampiran A — Inventori query murid/kelas raw (62 match)

### A. Route sisi murid (membership check — legit, boleh pakai helper tapi risiko rendah)
`chat/send`, `chat/[groupId]`, `murid/pengumuman/[id]/submit`, `murid/pengumuman`,
`murid/materi`, `murid/quiz/[id]`, `murid/dashboard/summary`, `murid/tugas`, `murid/penugasan`,
`murid/nickname`, `group/[id]/student`, `group/memberships` → `groupMember.findUnique/findMany`
(scoped ke `userId` sendiri).

### B. Route sisi guru — "daftar kelas/murid milik guru" (SEHARUSNYA SSOT)
`guru/penugasan`, `guru/materi/[id]/kirim`, `guru/buat-assessment`, `guru/gradebook`,
`guru/bank-soal/send`, `guru/dashboard/social`, `guru/nilai/stats`, `guru/nilai/export`,
`guru/nilai/auto-populate`, `guru/latihan/[id]`, `guru/quiz/[id]/assign`,
`guru/literasi/stats`, `guru/hasil-karya/leaderboard`, `guru/siswa/[id]`, `guru/dokumen-siswa`,
`guru/assign-tka`, `guru/tinjau-konstruktif` → `group.findMany({teacherId})` /
`groupMember.findMany({groupId})` inline; guard & filter `isActive`/role tidak seragam.

### C. Route game/karya (mix — perlu helper scoping)
`game/tantang` (kelas guru + kelas murid), `siswa/karya` (visibility members), `katastra/leaderboard`,
`siswa/aktif`, `siswa/league` (platform-wide, bukan class-scope).

### D. Admin/platform (bukan class-scope — legit)
`admin/analytics`, `admin/analytics/dashboard`, `admin/users`, `admin/ai-quota`,
`admin/ai-quota/audit-log`, `admin/ai-analytics`, `admin/payments/health`,
`cron/ajakan-harian`, `cron/pengingat-tugas`, `auth/register`, `user/online`,
`user/profile`, `siswa/karya/[id]/report` → `user.findMany`/`groupMember.findMany` platform.

---

## Lampiran B — Ringkasan Temuan (untuk terminal / handoff)

```
ROOT CAUSE   : "Belum ada siswa terdaftar" = /api/guru/siswa menolak founder/ADMIN (403) — FIXED via isTeacherOrStudent
SSOT         : lib/teacher/students.ts benar, tapi HANYA 5 route yang memakainya; ~30 route lain inline query
GUARD        : 2 gaya (createClient vs getUser) — /api/guru/quiz/[id]/assign menolak founder/ADMIN (bug aktif)
DUPLIKASI    : detail kelas ada 2 API (/api/group/[id] & /api/guru/kelasku/[id])
ORPHAN       : POST /api/guru/latihan (AI generate) + /pick TIDAK punya UI; /guru/kuis* & /guru/soal* di nav
BROKEN LINK  : /guru/kuis/[id]/edit → route tidak ada (404)
NAV          : 12 grup sesuai target IA; Pengumuman hanya tab (bukan menu); Kalender → /guru/olimpiade (statis)
FILES        : 0 diubah (audit read-only)
NEXT         : tunggu persetujuan → roadmap P0 (guard+broken link) → P1 (SSOT, AI Latihan UI, konsolidasi detail kelas)
```
