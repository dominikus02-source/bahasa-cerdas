# P1-B — Guru Authorization Consistency & Ownership Hardening: PHASE 0 AUDIT

> **STATUS: PHASE 0 — AUDIT ONLY.** Dokumen ini berisi hasil audit read-only.
> Belum ada perubahan kode, belum ada commit/push. Implementasi dimulai
> hanya setelah approval eksplisit pengguna.

- **Tanggal audit**: 2026-08-08
- **Auditor**: opencode (P1-B)
- **Cakupan**: `app/api/guru/**`, `app/api/group/**`, `app/(dashboard)/guru/**`, `lib/**`
- **Baseline**: P1-A (SSOT Implementation) selesai — lihat `docs/P1_A_SSOT_IMPLEMENTATION_REPORT.md`

---

## 1. Tujuan Fase

Menyelaraskan seluruh guard authorization Guru ke satu pola SSOT
(`isTeacherOrStudent` dari `lib/teacher/students.ts`) **tanpa blanket
replacement** — setiap route dianalisis berdasar fungsi, actor, resource,
ownership, business rule, side effect, data sensitivity, dan existing policy —
serta meng-hardening cek ownership lintas-guru (cross-owner) dan data sensitif
(finansial / data pribadi).

## 2. Definisi Policy (Sumber Kebenaran)

| Actor | Policy |
|-------|--------|
| **GURU** | Mengakses resource miliknya sendiri (ownership). Resource bersama/read-only boleh diakses. |
| **ADMIN** | Mendapat **Guru Experience** (boleh akses endpoint guru) tapi **BUKAN superuser atas resource guru** kecuali ada policy existing eksplisit. |
| **FOUNDER** | Tidak mendapat auto-bypass ownership. Hanya kebal guard `isTeacherOrStudent`. |
| **MURID** | Ditolak dari seluruh endpoint guru-only (401/403). |

`isTeacherOrStudent(user)` = `user.role === "GURU" || user.role === "ADMIN" || user.isFounder === true`
(`lib/teacher/students.ts:22`).

## 3. Metodologi

1. Scan seluruh pola guard: `role !== "GURU"`, `role === "GURU"`,
   `role?.toUpperCase() !== "GURU"`, `isFounder`, `role === "ADMIN"`,
   `isTeacher*`, `isTeacherOrStudent`, dan helper SSOT.
2. Untuk setiap route: baca penuh, catat guard saat ini, ownership check,
   data sensitivity, side effect, dan policy existing.
3. Klasifikasi tiap route ke satu kategori action: `KEEP`, `MIGRATE`,
   `SPECIAL CASE`, `NEEDS POLICY REVIEW`.
4. Bedakan **AUTHORIZATION** (siapa boleh masuk) vs **OWNERSHIP** (boleh
   menyentuh resource siapa). Guard SSOT TIDAK menggantikan cek ownership.

## 4. Hasil Scan Guard (Angka Aktual — 2026-08-08)

| Pola guard | Jumlah aktual | Lokasi |
|-----------|---------------|--------|
| `role !== "GURU"` (strict) — app/api/guru + group | **22** | 15 file (lihat §6) |
| `role !== "GURU"` — lib (business rule) | 2 | `lib/ai-gateway/trial-service.ts:21,59` (KEEP — trial khusus GURU) |
| `role?.toUpperCase() !== "GURU"` (strict guard) | **4** | `bank-soal/route.ts`, `bank-soal/send`, `bank-soal/preview`, `latihan/pick` |
| `role?.toUpperCase() !== "GURU"` (non-guard, query param) | 2 | `latihan/route.ts` (kelas/tema di-uppercase — bukan guard) |
| `role === "GURU"` (non-guard) | 1 | `lib/teacher/students.ts:22` (definisi SSOT itu sendiri) |
| `role !== "ADMIN"` dll. | 11 | pencarian `role.*ADMIN` — mayoritas `role === "ADMIN"` untuk policy khusus admin/privilege |
| `isTeacherOrStudent` dipakai | 45 file | sudah SSOT (baseline P1-A) |
| `isTeacher` (local const) | 0 | tidak ada |
| `isTeacherOrHigher` | 4 | `lib/teacher/students.ts` doc + `app/api/group/route.ts:13,24,44` (wrapper = `isTeacherOrStudent`) |
| Route tanpa role guard sama sekali (auth-only) | 6 | `soal-pool` (dead), `misi`, `soal-set` GET, `soal-set/[id]` GET, `dashboard`, `materi/[id]/download` |

**Kesimpulan**: P1-A mengklaim "20 guard tersisa". Hitung ulang menunjukkan
**22 guard strict** di route + **4 guard toUpperCase** + **2 business-rule lib**
= **28 total**, tersebar di **16 file** (15 app/api/guru + group/[id]).

## 5. Referensi Helper SSOT (Baseline P1-A, TIDAK DIUBAH di P1-B)

`lib/teacher/students.ts`:

| Helper | Fungsi |
|--------|--------|
| `isTeacherOrStudent(user)` | Guard role: GURU \| ADMIN \| founder |
| `getTeacherGroups(teacherId, take?)` | Grup milik guru + counts |
| `getTeacherStudents(teacherId)` | Siswa milik guru |
| `getTeacherStudentIds(teacherId)` | Hanya id siswa |
| `getTeacherGroupDetail(groupId, teacherId)` | Detail 1 grup milik guru |

## 6. Authorization Matrix

Kolom: Route | Method | Actor | Resource | Current Guard | Ownership | Data Sensitivity | Policy | Action

### A. Bank Soal & Soal Set

| Route | Method | Guard saat ini | Ownership saat ini | Data sensitivity | Action |
|-------|--------|----------------|--------------------|------------------|--------|
| `app/api/guru/soal/route.ts` | GET | `role !== "GURU"` 401 | `uploaderId = dbUser.id` (where) | Soal pribadi guru | **MIGRATE** |
| `app/api/guru/soal/route.ts` | POST | `role !== "GURU"` 401 | `uploaderId = dbUser.id` | Soal pribadi guru | **MIGRATE** |
| `app/api/guru/soal/route.ts` | PATCH | `role !== "GURU"` 401 | `existing.uploaderId !== dbUser.id` → 404 | Soal pribadi guru | **MIGRATE** |
| `app/api/guru/soal/route.ts` | DELETE | `role !== "GURU"` 401 | `existing.uploaderId !== dbUser.id` → 404 | Soal pribadi guru | **MIGRATE** |
| `app/api/guru/soal-set/route.ts` | GET | **tanpa role guard** (auth-only) | `creatorId = dbUser.id` (where) | Set + metadata | **MIGRATE** (tambah guard) |
| `app/api/guru/soal-set/route.ts` | POST | `role !== "GURU"` 401 | `creatorId = dbUser.id` (create) | Set baru | **MIGRATE** |
| `app/api/guru/soal-set/[id]/route.ts` | GET | **tanpa role guard** (auth-only) | `set.creatorId !== dbUser.id` → 404 | Set + soal | **MIGRATE** (tambah guard) |
| `app/api/guru/soal-set/[id]/route.ts` | PUT | `role !== "GURU"` 401 | `set.creatorId !== dbUser.id` → 404 | Set | **MIGRATE** |
| `app/api/guru/soal-set/[id]/route.ts` | DELETE | `role !== "GURU"` 401 | `set.creatorId !== dbUser.id` → 404 | Set | **MIGRATE** |
| `app/api/guru/soal-set/[id]/questions/route.ts` | GET | `role !== "GURU"` 401 | `set.creatorId !== dbUser.id` → 404 | Soal | **MIGRATE** |
| `app/api/guru/soal-set/[id]/questions/route.ts` | POST | `role !== "GURU"` 401 | `set.creatorId !== dbUser.id` → 404 | Soal → set | **MIGRATE** |
| `app/api/guru/soal-set/[id]/use/route.ts` | POST | auth-only | **TIDAK ADA cek ownership** ⚠️ | `useCount++` + **kebocoran questionIds milik guru lain** | **NEEDS POLICY REVIEW** (critical) |
| `app/api/guru/bank-soal/route.ts` | GET | `toUpperCase() !== "GURU" && !== "ADMIN" && !isFounder` | Resource bersama (MASTER_BANK) | Bank bersama (shared) | **MIGRATE** |
| `app/api/guru/bank-soal/send/route.ts` | POST | `toUpperCase() !== "GURU" && !== "ADMIN" && !isFounder` | `groups teacherId` check | Kirim ke kelas | **MIGRATE** |
| `app/api/guru/bank-soal/preview/route.ts` | GET | `toUpperCase() !== "GURU" && !== "ADMIN" && !isFounder` | Resource bersama (MASTER_BANK) | Bank bersama (shared) | **MIGRATE** |
| `app/api/guru/latihan/pick/route.ts` | POST | `toUpperCase() !== "GURU"` (tanpa ADMIN/founder!) | Resource bersama (MASTER_BANK) | Bank bersama | **NEEDS POLICY REVIEW** (inkonsisten dgn bank-soal) |

### B. Materi & Penugasan

| Route | Method | Guard saat ini | Ownership saat ini | Data sensitivity | Action |
|-------|--------|----------------|--------------------|------------------|--------|
| `app/api/guru/materi/route.ts` | GET | `role !== "GURU" && !== "ADMIN" && !isFounder` | `OR isPublished OR uploaderId=user` | Materi publik + pribadi | **MIGRATE** |
| `app/api/guru/materi/route.ts` | POST | sama | `uploaderId = dbUser.id` | Materi baru | **MIGRATE** |
| `app/api/guru/materi/route.ts` | PATCH | sama | `existing.uploaderId !== dbUser.id` → 404 | Materi pribadi | **MIGRATE** |
| `app/api/guru/materi/route.ts` | DELETE | sama | `existing.uploaderId !== dbUser.id` → 404 | Materi pribadi | **MIGRATE** |
| `app/api/guru/materi/[id]/kirim/route.ts` | POST | `role !== "GURU" && !== "ADMIN" && !isFounder` | `materi.uploaderId` OR published; `groups teacherId` check | Kirim materi | **MIGRATE** |
| `app/api/guru/materi/[id]/download/route.ts` | GET | auth-only (intentional) | `isPublished OR uploaderId`; kuota 10 / premium ∞ | Materi publik | **KEEP** |

### C. Panduan (Buku Panduan Guru)

| Route | Method | Guard saat ini | Ownership saat ini | Data sensitivity | Action |
|-------|--------|----------------|--------------------|------------------|--------|
| `app/api/guru/panduan/route.ts` | GET | `role !== "GURU" && !isFounder` (TANPA ADMIN) | resource bersama (konten kurikulum) | Konten kurikulum | **NEEDS POLICY REVIEW** |
| `app/api/guru/panduan/[unitId]/route.ts` | GET | `role !== "GURU" && !isFounder` (TANPA ADMIN) | resource bersama | Konten kurikulum | **NEEDS POLICY REVIEW** |

### D. Toko Karya & Finansial

| Route | Method | Guard saat ini | Ownership saat ini | Data sensitivity | Action |
|-------|--------|----------------|--------------------|------------------|--------|
| `app/api/guru/earnings/route.ts` | GET | `isTeacherOrStudent` (SSOT) | `userId: user.id`, `sellerId: user.id` | **Finansial** (saldo, riwayat penarikan, rekening bank) | **KEEP** ✅ |
| `app/api/guru/withdraw/route.ts` | POST | `role !== "GURU" && !isFounder` (TANPA ADMIN) | `tx.user.updateMany({ id: user.id, saldo >= amount })` — atomik | **Finansial** (uang rill) | **SPECIAL CASE** |
| `app/api/guru/karya-comment/[commentId]/route.ts` | DELETE | `role !== "GURU" && !isFounder` → lalu owner-check via class | GURU yang mengajar kelas penulis karya (groupMember join) | Komentar karya | **SPECIAL CASE** |

### E. Simulasi & Nilai (sudah SSOT)

| Route | Guard | Ownership | Action |
|-------|-------|-----------|--------|
| `hasil-tka`, `assign-tka`, `buat-assessment`, `tinjau-konstruktif`, `dokumen-siswa`, `simulasi/rekap`, `gradebook`, `penugasan`, `penugasan/[id]`, `pengumuman`, `kelasku/[id]`, `nilai/*`, `nilai-kategori/*`, `literasi/stats`, `hasil-karya/leaderboard`, `dashboard/social`, `dashboard/analytics` | `isTeacherOrStudent` (SSOT) | `teacherId`/`groupId`/`getTeacherGroups`/`getTeacherStudentIds` | **KEEP** ✅ |

### F. Game & Dashboard (sudah SSOT)

| Route | Guard | Ownership | Action |
|-------|-------|-----------|--------|
| `game-hub`, `guru/leaderboard` | `isTeacherOrStudent` | hostId / teacher | **KEEP** ✅ |
| `app/api/guru/dashboard/route.ts` | auth-only | semua query `user.id` (self-scoped) | **KEEP** (self-scoped, data sendiri) |

### G. Misi & Soal Pool

| Route | Method | Guard saat ini | Ownership | Data sensitivity | Action |
|-------|--------|----------------|-----------|------------------|--------|
| `app/api/guru/misi/route.ts` | GET | auth-only | `cekMisiGuru(user.id)` self-scoped | status misi diri sendiri | **NEEDS POLICY REVIEW** |
| `app/api/guru/soal-pool/route.ts` | GET | auth-only | resource bersama (aktif paketKompetensi) | bank bersama | **KEEP** (dead route — tidak ada konsumen UI; aktif paket publik) |

### H. Group (Kelasku)

| Route | Method | Guard saat ini | Ownership | Data sensitivity | Action |
|-------|--------|----------------|-----------|------------------|--------|
| `app/api/group/[id]/route.ts` | GET | auth-only | `group.teacherId !== dbUser.id` → 403 | Data kelas (anggota, email, nilai, progres) | **MIGRATE** (tambah guard) |
| `app/api/group/[id]/route.ts` | PATCH | `role !== "GURU" && !isPrivileged` (ADMIN\|founder) | `group.teacherId !== dbUser.id && !isPrivileged` → 404 | Data kelas | **MIGRATE** (seragam ke SSOT; isPrivileged sudah mewakili ADMIN/founder) |
| `app/api/group/[id]/route.ts` | DELETE | `role !== "GURU" && !isPrivileged` (ADMIN\|founder) | `group.teacherId !== dbUser.id && !isPrivileged` → 404 | Data kelas | **MIGRATE** |
| `app/api/group/route.ts` | GET/POST | `isTeacherOrHigher` (= `isTeacherOrStudent`) | `getTeacherGroups` (SSOT) | Data kelas | **KEEP** ✅ |

## 7. Ownership Matrix (Cross-Owner Check)

Tujuan: pastikan setiap guru HANYA bisa baca/tulis resource miliknya sendiri,
kecuali resource bersama yang memang publik/shared.

| Resource | Kolom ownership | Route yang sudah benar | Route yang TIDAK cek ownership |
|----------|-----------------|------------------------|-------------------------------|
| Soal | `uploaderId` | soal GET/POST/PATCH/DELETE ✅ | — |
| SoalSet | `creatorId` | soal-set GET/POST, soal-set/[id] GET/PUT/DELETE, questions GET/POST ✅ | **`soal-set/[id]/use` ⚠️ TIDAK ADA cek — CRITICAL** |
| Materi | `uploaderId` | materi GET/POST/PATCH/DELETE, kirim ✅ | — |
| Kelas (Group) | `teacherId` | group/route GET/POST, group/[id] GET/PATCH/DELETE, kelasku/[id], penugasan, pengumuman, bank-soal/send, materi/[id]/kirim ✅ | — |
| Komentar karya | guru-mengajar-penulis | karya-comment/[commentId] ✅ (via groupMember join) | — |
| Bank Soal bersama (MASTER_BANK) | — (shared) | bank-soal/\*, latihan/pick — resource publik bersama, bukan kepemilikan | — |
| Saldo/Penarikan | `userId`/`sellerId` | earnings, withdraw ✅ (atomik `updateMany saldo>=amount`) | — |
| Nilai | `teacherId` via grup | gradebook, nilai/\*, penilaian ✅ | — |
| Misi Guru | `user.id` | misi ✅ (self-scoped) | — |

**1 critical ownership risk** ditemukan (lihat §9).

## 8. Sensitive Data Audit

| Data | Route | Dilindungi? |
|------|-------|-------------|
| Saldo, totalEarned, riwayat penarikan, no. rekening bank | earnings GET | ✅ SSOT + scoped `user.id`/`sellerId` |
| Uang rill (penarikan) | withdraw POST | ✅ GURU/founder-only + atomik `updateMany saldo >= amount` + MINIMAL_PENARIKAN |
| Email siswa, progres, nilai | group/[id] GET | ⚠️ **tanpa guard role** (hanya auth + ownership teacherId). Ownership sudah benar (hanya guru pemilik), tapi ADD guard role utk konsistensi — data siswa sensitif. |
| NISN / No. Absensi siswa | guru/siswa API (sudah SSOT P1-A) | ✅ |
| Soal + kunci jawaban guru lain | **`soal-set/[id]/use`** | ❌ **BOCOR** — user mana pun bisa baca `questionIds` milik guru lain + increment `useCount` |
| Bank bersama MASTER_BANK | bank-soal/\*, latihan/pick | ✅ resource publik bersama (kunci jawaban bank ini memang untuk semua guru) |

## 9. Critical Ownership Risk (Wajib Perbaiki di Fase Implementasi)

### `app/api/guru/soal-set/[id]/use/route.ts` — POST (⚠️ CRITICAL)

- **Guard saat ini**: hanya auth (`getUser()` ada, `dbUser` ada). **TIDAK ada
  cek role** DAN **TIDAK ada cek ownership** (`set.creatorId !== dbUser.id`).
- **Eksploitasi**: user mana pun yang login (termasuk MURID) dengan id set apa
  pun dapat:
  1. `useCount++` — memanipulasi statistik popularitas set milik guru lain.
  2. Membaca `set.questions.map(q => q.id)` — **kebocoran daftar ID soal** milik
     guru lain (data yang seharusnya privat per-guru).
- **Usulan fix** (dilakukan hanya di fase implementasi, setelah approval):
  - Tambah guard `isTeacherOrStudent(dbUser)` → 403 untuk selain guru/admin/founder.
  - Tambah ownership: `if (set.creatorId !== dbUser.id) → 404` (atau 403).
- **Klasifikasi**: `NEEDS POLICY REVIEW` (karena juga perlu keputusan: apakah
  set milik guru lain BOLEH dipakai guru lain untuk kuis? Saat ini endpoint
  memang didesain agar murid memakai set guru — tapi tanpa ownership check
  berarti idempotensi & pembatasan hilang. Rekomendasi: batasi ke pemilik
  + GURU/ADMIN/founder, kecuali ada policy eksplisit bahwa set itu shareable).

## 10. Rangkuman Klasifikasi

### MIGRATE (11 file / ~20 metode) — ke `isTeacherOrStudent`, pertahankan ownership:
1. `app/api/guru/soal/route.ts` (4 metode)
2. `app/api/guru/soal-set/route.ts` (GET + POST)
3. `app/api/guru/soal-set/[id]/route.ts` (GET + PUT + DELETE)
4. `app/api/guru/soal-set/[id]/questions/route.ts` (GET + POST)
5. `app/api/guru/bank-soal/route.ts` (GET)
6. `app/api/guru/bank-soal/send/route.ts` (POST)
7. `app/api/guru/bank-soal/preview/route.ts` (GET)
8. `app/api/guru/materi/route.ts` (4 metode)
9. `app/api/guru/materi/[id]/kirim/route.ts` (POST)
10. `app/api/guru/buat-tka/route.ts` (POST)
11. `app/api/group/[id]/route.ts` (GET + PATCH + DELETE)

> Catatan buat-tka: guard saat ini `role !== "GURU" && !isFounder && role !== "ADMIN"`
> SUDAH setara `isTeacherOrStudent` secara semantik — MIGRATE = seragamkan bentuk kode.

### KEEP (sudah benar / intentionally berbeda) (8):
1. `earnings` GET — SSOT + scoped, finansial ✅
2. `dashboard` GET — auth-only self-scoped ✅
3. `dashboard/social`, `dashboard/analytics` — SSOT ✅
4. `materi/[id]/download` GET — auth-only intentional (murid unduh materi publik; kuota 10) ✅
5. `soal-pool` GET — dead route, resource bersama publik ✅
6. `game-hub`, `guru/leaderboard` — SSOT ✅
7. Semua route Simulasi/Nilai/Penugasan/Pengumuman/Kelasku SSOT ✅
8. `lib/ai-gateway/trial-service.ts` — business rule: trial khusus GURU ✅

### SPECIAL CASE (2) — tulis komentar `// P1-B SPECIAL CASE: ...`:
1. **`withdraw` POST** — finansial uang rill, sengaja **GURU/founder-only**
   (tanpa ADMIN), atomik `updateMany saldo >= amount`. Policy finansial yang
   sengaja lebih ketat. → tambah komentar SPECIAL CASE.
2. **`karya-comment/[commentId]` DELETE** — moderasi karya: ADMIN/founder bebas
   ATAU GURU yang mengajar kelas penulis karya (cek via groupMember join).
   Bukan ownership sederhana `userId` — ini kebijakan moderasi eksplisit.
   → tambah komentar SPECIAL CASE.

### NEEDS POLICY REVIEW (5):
1. **`soal-set/[id]/use`** — CRITICAL: tanpa ownership, bocorkan questionIds;
   perlu keputusan shareability set.
2. **`panduan` + `panduan/[unitId]`** — guard GURU|founder TANPA ADMIN.
   Keputusan: apakah ADMIN boleh akses konten kurikulum panduan? (rekomendasi:
   ya — resource bersama read-only).
3. **`latihan/pick`** — inkonsisten: hanya GURU (tanpa ADMIN/founder), padahal
   `bank-soal/send` + `bank-soal/preview` mengizinkan ADMIN/founder. Resource
   sama (MASTER_BANK). Rekomendasi: seragamkan ke GURU|ADMIN|founder.
4. **`misi` GET** — auth-only tapi fitur guru (GuruMissionCard di beranda
   guru). Data self-scoped (aman), tapi sebaiknya guard `isTeacherOrStudent`.
5. **`soal-pool` GET** — dead route (tidak ada konsumen UI). Keputusan:
   biarkan, atau beri guard / hapus. (Rekomendasi: KEEP dengan guard SSOT jika
   suatu saat dipakai kembali.)

## 11. Rencana Implementasi (Fase Berikutnya, HANYA setelah approval)

1. **MIGRATE** — 11 file: ganti guard `role !== "GURU"` →
   `!isTeacherOrStudent(...)` (atau bentuk setara), **PERTAHANKAN** semua cek
   ownership yang ada (`uploaderId`, `creatorId`, `teacherId`).
2. **Tambah guard SSOT** untuk route auth-only yang belum punya role guard:
   `soal-set` GET, `soal-set/[id]` GET, `group/[id]` GET, `misi` (menunggu
   keputusan policy).
3. **SPECIAL CASE** — tambah komentar `// P1-B SPECIAL CASE: ...` pada
   `withdraw` dan `karya-comment/[commentId]` sesuai format.
4. **NEEDS POLICY REVIEW** — `soal-set/[id]/use` (fix critical + ownership),
   `panduan`, `latihan/pick`, `misi`, `soal-pool` — implementasi setelah
   keputusan pengguna per item.
5. **TIDAK mengubah**: GuruNav, UI Guru, Pusat Literasi, Panggung Literasi,
   AI Latihan UI, detail kelas consolidation, TKA enrichment, game server,
   GameRoom migration, Prisma schema.

## 12. Rencana Test (scripts/test-guru-phase.ts — TEST 9+)

| # | Deskripsi |
|---|-----------|
| TEST 9 | GURU valid: setiap route MIGRATE menerima akses GURU (struktur guard SSOT) |
| TEST 10 | ADMIN valid: setiap route MIGRATE menerima ADMIN (Guru Experience) |
| TEST 11 | FOUNDER valid: setiap route MIGRATE menerima founder |
| TEST 12 | MURID ditolak: tidak ada route guru yang mengizinkan MURID (401/403) |
| TEST 13 | Cross-owner class: group/[id] GET/PATCH/DELETE tolak guru non-pemilik (kecuali ADMIN/founder via isPrivileged) |
| TEST 14 | Cross-owner resource: soal PATCH/DELETE, soal-set/[id] PUT/DELETE, materi PATCH/DELETE, questions POST tolak non-pemilik |
| TEST 15 | Financial ownership: earnings/withdraw scoped ke user.id / sellerId |
| TEST 16 | SPECIAL CASE dipertahankan: withdraw GURU/founder-only (ADMIN ditolak), karya-comment DELETE via moderasi |
| TEST 17 | soal-set/[id]/use: setelah fix — MURID 403, guru non-pemilik 403/404, pemilik OK |
| TEST 18 | Regresi: seluruh existing TEST 1–8 tetap lulus; leakage tests tidak melemah |

## 13. Catatan Implementasi (diisi SETELAH approval)

> Seksi ini diisi pada fase implementasi: file yang diubah, diff summary,
> hasil QA, dan catatan.

- (kosong)

## 14. Hasil QA Fase Implementasi (diisi setelah approval)

| Check | Hasil |
|-------|-------|
| `npx tsc --noEmit` | ⏳ |
| ESLint (file berubah) | ⏳ |
| `npm run test:guru-phase` | ⏳ |
| `npm run test:gamification-engine` | ⏳ |
| `npm run test:simulation-workflow` | ⏳ |
| `npm run test:phase-simulation-workflow` | ⏳ |
| `npm run build` (dummy env) | ⏳ |

## 15. New Regression / Pre-existing / Environment (diisi setelah approval)

- (kosong)

## 16. Asumsi & Keputusan yang Perlu Konfirmasi Pengguna

1. **`soal-set/[id]/use`**: apakah set milik guru lain boleh dipakai guru lain
   untuk kuis? (Rekomendasi: batasi ke pemilik + GURU/ADMIN/founder).
2. **`panduan`**: izinkan ADMIN mengakses konten kurikulum? (Rekomendasi: ya).
3. **`latihan/pick`**: seragamkan ke GURU|ADMIN|founder? (Rekomendasi: ya).
4. **`misi`**: tambah guard `isTeacherOrStudent`? (Rekomendasi: ya).
5. **`soal-pool`**: biarkan dead route, atau beri guard? (Rekomendasi: guard SSOT).
6. **`withdraw`** tetap GURU/founder-only (ADMIN ditolak) — konfirmasi.

## 17. Risiko

1. **`soal-set/[id]/use`** — kebocoran questionIds + manipulasi useCount (critical,
   sudah teridentifikasi).
2. Blanket replacement dilarang — risiko drift guard baru jika implementasi
   asal ganti (dicegah oleh analisis per-route di §6).
3. Mengubah guard bisa menutup akses admin yang sah — dicegah dengan TEST 10/11
   (ADMIN/founder valid) sebelum & sesudah.
4. Data siswa sensitif (email, nilai) di `group/[id]` — ownership sudah benar,
   tapi guard role perlu ditambah untuk konsistensi defense-in-depth.

## 18. Rekomendasi Urutan Implementasi

1. Fix **critical**: `soal-set/[id]/use` (ownership + guard).
2. **MIGRATE** 11 file (guard SSOT + pertahankan ownership).
3. **SPECIAL CASE** comment pada `withdraw` & `karya-comment/[commentId]`.
4. **NEEDS POLICY REVIEW** items setelah konfirmasi pengguna.
5. Jalankan QA penuh (§14) + test baru TEST 9–18.
6. NO COMMIT / NO PUSH (aturan P1-B) kecuali diminta.
