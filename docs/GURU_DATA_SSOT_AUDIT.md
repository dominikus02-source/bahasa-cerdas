# GURU DATA SSOT AUDIT

> **Fase:** P1-A Phase 0/1 — Read-only audit & boundary definition
> **Status:** Audit lengkap. Belum ada perubahan kode.
> **Mode:** ADDITIVE ONLY / NO COMMIT / NO PUSH

## 1. Executive Summary

Audit memetakan seluruh alur data Guru → Kelas → Murid di `app/api/guru/**`, `app/api/group/**`, dan `lib/**` terhadap SSOT `lib/teacher/students.ts`. Temuan inti:

1. **SSOT sudah dipakai benar oleh 19 file** (18 route guru + `app/api/group/route.ts` GET). Pola yang sudah benar: `isTeacherOrStudent` sebagai guard + `getTeacherGroups`/`getTeacherStudents`/`getTeacherStudentIds` sebagai population source.
2. **2 population-source `take: 50`** ditemukan di `nilai/stats` (L24) dan `buat-assessment` (L24) — memotong populasi statistik/penilaian.
3. **6 filter `role: "member"`** di scope guru/group (plus 1 write di `group/[id]/claim`) — harus diverifikasi konsumen per lokasi; tidak boleh blanket-replace.
4. **~15 route memakai guard GURU-only** (tanpa ADMIN/founder) yang menghasilkan **false 403** untuk ADMIN/founder yang sah memakai Guru Experience — inkonsistensi authorization (bukan security bypass).
5. **Gap SSOT:** `getTeacherGroups` mengambil `user` hanya `{id, fullName, avatar, email}` dan punya `take: 50` internal — konsumen seperti `getTeacherStudents()` (dipakai `/api/guru/siswa`) tidak membawa `profile{noAbsen,nisn}`, `xp`, `level`, `streak`, `league`, `lastActiveAt` yang tersedia di `STUDENT_SELECT`. Ini gap nyata untuk konsistensi data murid.
6. **Ownership secara umum terjaga.** Semua route nilai/assign/quiz memeriksa `group.teacherId`/`quiz.creatorId`. Tidak ditemukan AUTH PASS + OWNERSHIP FAIL yang memungkinkan guru melihat data guru lain. Pengecualian terdokumentasi: `group/[id]/claim` tanpa role check (fitur murid-side lama).

## 2. Current SSOT Architecture

**File:** `lib/teacher/students.ts`

| Helper | Semantics |
|--------|-----------|
| `isTeacherOrStudent(user)` | Guard Guru Experience: `role === "GURU" \|\| role === "ADMIN" \|\| isFounder`. BUKAN ownership bypass. |
| `getTeacherGroups(teacherId)` | Kelas milik guru + `isActive: true`, include `members` (semua role) + `_count.members`. **`take: 50` internal.** |
| `getTeacherStudentIds(teacherId)` | ID murid unik (dedupe lintas kelas) dari `getTeacherGroups`. |
| `getTeacherStudents(teacherId)` | Murid unik + `groupId/groupName` kelas pertama. **Hanya membawa user `{id, fullName, avatar, email}`.** |
| `getTeacherGroupDetail(teacherId, groupId)` | Satu kelas aktif milik guru, members include `user: STUDENT_SELECT`. **Belum ada konsumen.** |
| `STUDENT_SELECT` | `id, fullName, avatar, email, xp, level, streak, league, lastActiveAt, profile{noAbsen,nisn}` |

**Konsumen SSOT saat ini:**
- `getTeacherGroups`: `app/api/group/route.ts` (GET), `lib/simulation/SimulationAnalyticsService.ts` (4x)
- `getTeacherStudents`: `app/api/guru/siswa/route.ts`
- `getTeacherStudentIds`: `app/api/guru/game-hub/route.ts`, `app/api/guru/dashboard/analytics/route.ts`, `lib/simulation/SimulationAnalyticsService.ts`
- `getTeacherGroupDetail`: **tidak ada pemanggil** (helper tersedia, belum terpakai)
- `isTeacherOrStudent`: 18 route guru + `app/api/group/route.ts`

## 3. BEFORE Metrics

Angka aktual dari repository (grep read-only, bukan perkiraan):

| Metrik | Angka | Catatan |
|--------|-------|---------|
| Total file route guru (`app/api/guru/**/route.ts`) | 65 | `rg -l "export async function (GET\|POST\|...)"` |
| File route guru memakai SSOT guard | 18 | `isTeacherOrStudent`/`getTeacher*` |
| Inline `db.group.*` di scope guru+group | 33 | 27 guru + 6 group |
| Inline `db.groupMember.*` di scope guru+group | 16 | 12 guru + 4 group |
| Total `db.group.*` di seluruh repo | 48 | termasuk siswa/karya, chat, murid, arena |
| Total `db.groupMember.*` di seluruh repo | 46 | termasuk murid-side |
| `role: "member"` (filter) di scope guru+group | 6 | +1 write (`group/[id]/claim` L24) |
| `take: 50`/`take: 100` di scope guru+group | 25 lokasi | 2 population-source |
| Ownership check (`teacherId !==`/`creatorId !==`) di guru | 28 | |
| Route GURU-only guard (false-403 ADMIN/founder) | ~14 | lihat §7 |
| Duplicate class-detail source | 2 | `/api/group/[id]` vs `/api/guru/kelasku/[id]` (scope berbeda) |

> Catatan selisih dari audit sebelumnya: audit ini meng-hitung per *lokasi query* (bukan per file) dan membatasi scope guru+group sesuai tujuan P1-A. Angka 48/46 sebelumnya mencakup murid-side, chat, arena — tidak dihitung sebagai population guru.

## 4. Full Query Inventory

### 4.1 Inline `db.group.*` — scope guru/group (33)

| File | Function | Query | Sumber | Filter | Dedupe | Auth | Ownership | SSOT? | Risiko | Action |
|------|----------|-------|--------|--------|--------|------|-----------|-------|--------|--------|
| `api/group/route.ts` | GET L28 | `getTeacherGroups` | SSOT | isActive | SSOT | SSOT | teacherId (dalam helper) | ✅ SSOT | Rendah | KEEP |
| `api/group/route.ts` | POST L71 | `group.findUnique({accessCode})` | cek kode | — | — | SSOT | — | Tidak (validasi) | Rendah | KEEP |
| `api/group/join` | POST L19 | `group.findUnique({accessCode, isActive})` | join | isActive | — | auth | — | Tidak (murid-side) | Rendah | KEEP |
| `api/group/[id]` | GET L18,117,155 | `group.findUnique` (3x) | detail kelas | — | — | auth saja (tanpa role) | teacherId L117+ | Tidak | **Sedang: tanpa role guard, ownership saja** | SPECIAL CASE |
| `api/group/[id]/claim` | POST L18 | `group.findUnique` | claim ketua | — | — | auth saja (tanpa role) | — | Tidak | **Sedang: siapa pun bisa claim** | SPECIAL CASE |
| `api/guru/siswa/[id]` | PATCH L31 | `ownedGroups = group.findMany({teacherId})` | ownedGroups | — | — | SSOT | teacherId | ⚠️ Inline | Rendah (owner-scoped) | WRAPPER → `getTeacherGroups` |
| `api/guru/gradebook` | GET L16 | `group.findMany({teacherId, isActive:true})` | kelas | isActive | — | SSOT | teacherId | ⚠️ Inline | Rendah (konsisten) | WRAPPER |
| `api/guru/gradebook` | GET L27 | `group.findFirst({id, teacherId})` | detail | — | — | SSOT | teacherId | ⚠️ Inline | Rendah | WRAPPER |
| `api/guru/pengumuman` | GET/POST L24,67 | `group.findFirst({id, teacherId})` | validasi | — | — | local isTeacher | teacherId | ⚠️ Inline | Rendah | WRAPPER |
| `api/guru/kelasku/[id]` | GET L21 | `group.findFirst({id, teacherId})` | detail kelas | — | — | local isTeacher | teacherId | ⚠️ Inline | Rendah | WRAPPER |
| `api/guru/penugasan` | POST L91 | `group.findMany({id in, teacherId})` | validasi | — | — | SSOT | teacherId | ⚠️ Inline | Rendah | KEEP (ownership-scoped) |
| `api/guru/nilai` | GET/POST L23,71 | `group.findUnique({id}, teacherId)` | validasi | — | — | GURU/founder/ADMIN | teacherId | ⚠️ Inline | Rendah | WRAPPER |
| `api/guru/nilai/stats` | GET L21 | `group.findMany({teacherId, isActive}, take:50)` | **population** | isActive | — | GURU/founder (tanpa ADMIN) | teacherId | ⚠️ Inline | **Tinggi: take 50 potong stats** | MIGRATE |
| `api/guru/nilai/auto-populate` | POST L25 | `group.findUnique` | validasi | — | — | GURU/founder/ADMIN | teacherId | ⚠️ Inline | Rendah | KEEP |
| `api/guru/nilai/bulk` | POST L24 | `group.findUnique` | validasi | — | — | GURU/founder/ADMIN | teacherId | ⚠️ Inline | Rendah | KEEP |
| `api/guru/nilai/export` | GET L22 | `group.findUnique` | validasi | — | — | GURU/founder/ADMIN | teacherId | ⚠️ Inline | Rendah | KEEP |
| `api/guru/nilai/kuis-grade` | GET L21 | `group.findUnique` | validasi | — | — | GURU/founder/ADMIN | teacherId | ⚠️ Inline | Rendah | KEEP |
| `api/guru/nilai-kategori` | GET/POST L20,55 | `group.findUnique` (2x) | validasi | — | — | GURU-only | teacherId | ⚠️ Inline | **Guard: false-403** | MIGRATE (guard) |
| `api/guru/buat-assessment` | GET L14 | `group.findMany({teacherId, isActive}, take:50)` | **population** | isActive | — | GURU-only | teacherId | ⚠️ Inline | **Tinggi: take 50 + false-403** | MIGRATE |
| `api/guru/buat-assessment` | POST L57 | `group.findUnique` | validasi | — | — | GURU-only | teacherId | ⚠️ Inline | Rendah | MIGRATE (guard) |
| `api/guru/assign-tka` | POST L14 | `group.findUnique({id, teacherId})` | validasi | — | — | GURU-only | teacherId | ⚠️ Inline | **Guard: false-403** | MIGRATE (guard) |
| `api/guru/quiz/[id]/assign` | POST L33 | `group.findMany({id in, teacherId})` | validasi | — | — | SSOT | creatorId+teacherId | ⚠️ Inline | Rendah | KEEP (ownership-scoped) |
| `api/guru/dashboard/social` | GET L44 | `group.findMany({teacherId})` | kelas | — | — | local isTeacher | teacherId | ⚠️ Inline | Rendah | WRAPPER |
| `api/guru/literasi/stats` | GET L56-57 | `group.findMany({teacherId / id+teacherId})` | kelas | — | — | local isTeacher | teacherId | ⚠️ Inline | Rendah | WRAPPER |
| `api/guru/hasil-karya/leaderboard` | GET L169 | `group.findMany({teacherId})` | kelas | — | — | local isTeacher | teacherId | ⚠️ Inline | Rendah | WRAPPER |
| `api/guru/materi/[id]/kirim` | GET L45 | `group.findMany({id in, teacherId})` | validasi | — | — | GURU/ADMIN/founder | teacherId | ⚠️ Inline | Rendah | KEEP (ownership-scoped) |
| `api/guru/bank-soal/send` | POST L42 | `group.findMany({id in, teacherId})` | validasi | — | — | GURU/ADMIN/founder | teacherId | ⚠️ Inline | Rendah | KEEP (ownership-scoped) |
| `api/guru/latihan/[id]` | GET L52 | `group.findMany` | daftar kelas kirim | — | — | GURU-only | creatorId | ⚠️ Inline | **Guard: false-403** | MIGRATE (guard) |

### 4.2 Inline `db.groupMember.*` — scope guru/group (16)

| File | Function | Query | Sumber | Filter | Dedupe | Auth | Ownership | SSOT? | Risiko | Action |
|------|----------|-------|--------|--------|--------|------|-----------|-------|--------|--------|
| `api/group/[id]` | GET L164 | `groupMember.count({groupId})` | statistik | — | — | auth (tanpa role) | teacherId (di atas) | Tidak | Rendah | KEEP (murid-side detail) |
| `api/group/[id]/student` | GET L18 | `groupMember.findUnique({groupId,userId})` | keanggotaan | — | — | auth | — | Tidak (murid-side) | Rendah | KEEP |
| `api/group/join` | POST L25 | `groupMember.findUnique` | cek duplikat | — | — | auth | — | Tidak (murid-side) | Rendah | KEEP |
| `api/group/memberships` | GET L14 | `groupMember.findMany({userId}, take:50)` | milik sendiri | — | — | auth | — | Tidak (murid-side) | Rendah | KEEP |
| `api/guru/gradebook` | GET L34 | `groupMember.findMany({groupId})` | **population murid** | — | — | SSOT | teacherId | ⚠️ Inline | Rendah (konsisten all-role) | WRAPPER |
| `api/guru/dashboard` | GET L14 | `groupMember.count({group:{teacherId}})` | count | — | — | auth | teacherId | ⚠️ Inline | Rendah (count akurat) | KEEP (count) |
| `api/guru/nilai/stats` | GET L30 | `groupMember.count({groupId, role:"member"})` | count | role | — | GURU/founder | teacherId | ⚠️ Inline | **Sedang: role filter vs SSOT** | SPECIAL CASE (audit konsumen) |
| `api/guru/nilai/export` | GET L31 | `groupMember.findMany({groupId, role:"member"})` | **population** | role | — | GURU/founder/ADMIN | teacherId | ⚠️ Inline | **Sedang: role filter** | SPECIAL CASE (audit konsumen) |
| `api/guru/nilai/auto-populate` | POST L38 | `groupMember.findMany({groupId, role:"member"})` | **population scoring** | role | — | GURU/founder/ADMIN | teacherId | ⚠️ Inline | **Sedang: role filter + score** | SPECIAL CASE (audit konsumen) |
| `api/guru/assign-tka` | POST L26 | `groupMember.findMany({groupId}, {userId})` | population | — | — | GURU-only | teacherId | ⚠️ Inline | Rendah (all-role, konsisten) | WRAPPER |
| `api/guru/quiz/[id]/assign` | POST L98 | `groupMember.findMany({groupId})` (anggota utk notif) | notifikasi | — | — | SSOT | creatorId | ⚠️ Inline | Rendah | KEEP (notifikasi, bukan population inti) |
| `api/guru/siswa/[id]/nickname-history` | GET L14 | `groupMember.findFirst({userId, group:{teacherId}})` | ownership verify | — | — | GURU/founder | teacherId | ⚠️ Inline | Rendah | KEEP (ownership check, bukan population) |
| `api/guru/karya-comment/[commentId]` | DELETE L35 | `groupMember.findFirst({userId, group:{teacherId}})` | ownership verify | — | — | GURU/ADMIN/founder | teacherId | ⚠️ Inline | Rendah | KEEP (ownership check) |
| `api/guru/tinjau-konstruktif` | GET L19 | `groupMember.findMany({group:{teacherId}})` | **population murid** | — | — | SSOT | teacherId | ⚠️ Inline | Rendah (all-role) | WRAPPER → `getTeacherStudentIds` |
| `api/guru/dokumen-siswa` | L99 (legacy) | `groupMember.findMany({group:{teacherId,isActive}})` | **population murid** | isActive | Set (L103) | SSOT | teacherId | ⚠️ Inline | Rendah | WRAPPER (fallback legacy) |
| `api/guru/literasi/stats` | GET L61 | `groupMember.findMany({groupId in, role:"member"})` | **population** | role | — | local isTeacher | teacherId | ⚠️ Inline | **Sedang: role filter** | SPECIAL CASE (audit konsumen) |
| `api/guru/hasil-karya/leaderboard` | GET L174 | `groupMember.findMany({groupId in, role:"member"})` | **population** | role | — | local isTeacher | teacherId | ⚠️ Inline | **Sedang: role filter** | SPECIAL CASE (audit konsumen) |

## 5. `role: "member"` Audit

| File | Query | Consumer | Mengapa role=member? | Population/Business Rule | Action |
|------|-------|----------|----------------------|--------------------------|--------|
| `api/guru/nilai/stats` L30 | `count({groupId, role:"member"})` | Widget "blm dinilai" = totalSiswa × kategori | Diasumsikan hanya murid | **Population count** — SSOT menghitung semua anggota. | SPECIAL CASE: verifikasi apakah ketua/wali ada di kelas; jika ya, hitungan bisa meleset |
| `api/guru/nilai/export` L31 | `findMany({groupId, role:"member"})` | Ekspor CSV/DOCX nilai murid | Diasumsikan hanya murid | **Population** — semua anggota kelas valid | SPECIAL CASE: sama — verifikasi |
| `api/guru/nilai/auto-populate` L38 | `findMany({groupId, role:"member"})` | Filter skor game/jalur utk memberIds | Diasumsikan hanya murid | **Population scoring** — kalau ketua punya skor, tidak masuk | SPECIAL CASE: verifikasi |
| `api/guru/literasi/stats` L61 | `findMany({groupId in, role:"member"})` | Karya/aktivitas murid kelas | Diasumsikan hanya murid | **Population** | SPECIAL CASE: verifikasi |
| `api/guru/hasil-karya/leaderboard` L174 | `findMany({groupId in, role:"member"})` | Top creator/penulis | Diasumsikan hanya murid | **Population** | SPECIAL CASE: verifikasi |
| `api/group/[id]/claim` L24 | `create({role:"member"})` | Klaim ketua (write) | — | Bukan filter | KEEP (data write, bukan query population) |

**Kesimpulan sementara:** `GroupMember.role` praktis hanya berisi `member`/`ketua`. SSOT memilih "semua anggota" agar konsisten dengan `_count.members`. Filter `role:"member"` di 5 lokasi memakai asumsi "ketua bukan murid". **Keputusan final ditunda ke Phase 7** setelah verifikasi data aktual (apakah `ketua` pernah ada / apakah ketua ikut dinilai).

## 6. `take` / Population Audit

| File | Query | Dipakai untuk | take | Population Source? | Action |
|------|-------|---------------|------|--------------------|--------|
| `lib/teacher/students.ts` L52 | `getTeacherGroups` | **SSOT population** | 50 | ⚠️ Ya (internal) | **NEEDS SSOT EXTENSION**: param `take` opsional / hapus cap utk consumer analytics |
| `api/guru/nilai/stats` L24 | `group.findMany({teacherId,isActive})` | Statistik per kelas | 50 | **Ya** | **MIGRATE** (hilangkan take) |
| `api/guru/buat-assessment` L14 | `group.findMany({teacherId,isActive})` | Dropdown assessment | 50 | **Ya** | **MIGRATE** (hilangkan take) |
| `api/guru/kelasku/[id]` L69 | members (via include) | Detail kelas | 10000 | Ya (cap besar) | WRAPPER → `getTeacherGroupDetail` |
| `api/guru/kelasku/[id]` L40,49,55,64 | quiz/penugasan/pengumuman/materi | Tab UI | 50 | Tidak (UI list) | KEEP |
| `api/guru/dokumen-siswa` L114,125 | certs/progres legacy | Daftar dokumen | 100/200 | Tidak (UI list) | KEEP |
| `api/guru/nilai` L39 | nilai | Tabel nilai | 100 | Tidak (UI) | KEEP |
| `api/guru/nilai/stats` L31 | kategori | Per-kategori | 50 | Tidak (UI per kelas) | KEEP |
| `api/guru/nilai-kategori` L28 | kategori | List kategori | 50 | Tidak (UI) | KEEP |
| `api/guru/penugasan` L21 | penugasan | List | 50 | Tidak (UI) | KEEP |
| `api/guru/quiz` L38, `latihan` L83, `materi` L214, `soal*`, `panduan`, `artikel`, `hasil-tka`, `generated-rpp` | list | UI | 50 | Tidak | KEEP |
| `api/guru/literasi/stats` L87 | karya | Statistik | 5000 | Ya (cap aman) | KEEP (batas besar, terdokumentasi) |
| `api/guru/hasil-karya/leaderboard` L69 | karya | Leaderboard | 3000 | Ya (cap aman) | KEEP |
| `api/group/memberships` L16 | memberships | Milik sendiri | 50 | Tidak (murid-side) | KEEP |
| `api/guru/game-hub` L59,65 | hasil | Riwayat singkat | 10/5 | Tidak (UI) | KEEP |
| `api/guru/siswa/[id]/nickname-history` L24 | riwayat | UI | 50 | Tidak | KEEP |

## 7. Auth & Ownership Audit

### 7.1 Guard tidak konsisten (false-403 ADMIN/founder)

| Route | Guard saat ini | SSOT? | Risiko |
|-------|---------------|-------|--------|
| `assign-tka` | GURU only | ❌ | False-403 |
| `buat-assessment` | GURU only | ❌ | False-403 |
| `latihan`, `latihan/[id]`, `latihan/[id]/assignment/[assignId]` | GURU only | ❌ | False-403 |
| `nilai-kategori`, `nilai-kategori/[id]` | GURU only | ❌ | False-403 |
| `nilai/stats` | GURU/founder (tanpa ADMIN) | ❌ | False-403 |
| `hasil-tka`, `generated-rpp`, `rpp` | GURU only | ❌ | False-403 |
| `artikel`, `earnings` | GURU/founder (tanpa ADMIN) | ❌ | False-403 |
| `leaderboard` | GURU/founder (tanpa ADMIN) | ❌ | False-403 |
| `siswa/[id]/nickname-history` | GURU/founder (tanpa ADMIN) | ❌ | False-403 |
| `penugasan/[id]/nilai-praktik` | GURU/founder (tanpa ADMIN) | ❌ | False-403 |

Semua di atas **harus** `isTeacherOrStudent` (GURU|ADMIN|founder) agar konsisten policy Guru Experience.

### 7.2 Ownership — tidak ditemukan AUTH PASS + OWNERSHIP FAIL

Semua route yang menulis/membaca data kelas guru memeriksa `group.teacherId === user.id` atau `quiz.creatorId === user.id` (28 lokasi). Tidak ada celah guru melihat data guru lain. Pengecualian terdokumentasi:

1. **`group/[id]/claim`** — tanpa role check & tanpa ownership; siapa pun yang login bisa men-claim ketua kelas. Ini **fitur murid-side lama**, di luar boundary SSOT guru. Dicatat sebagai SPECIAL CASE; keputusan perbaikan ditunda (di luar scope P1-A).
2. **Bypass ownership ADMIN/founder (pre-existing, dilegalkan)** di `penugasan/[id]` (L34/L86) dan `penugasan/[id]/nilai-praktik` (L26): `user.role !== "ADMIN" && !user.isFounder` → 403. Ini berarti ADMIN/founder **boleh** mengakses penugasan kelas guru lain — melanggar prinsip "ADMIN/founder tidak superuser". Dicatat sebagai risiko; perubahan = di luar ADDITIVE scope (mengubah perilaku existing), perlu keputusan founder.

### 7.3 Guard sudah SSOT (benar)

`quiz/*` (9 route), `penugasan`, `penugasan/[id]`, `siswa`, `siswa/[id]`, `gradebook`, `game-hub`, `dashboard/analytics`, `dokumen-siswa`, `tinjau-konstruktif`, `simulasi/rekap`, `group/route` GET.

## 8. Duplicate Data Sources

| Source | Route | Scope | Klasifikasi |
|--------|-------|-------|-------------|
| Detail kelas | `/api/group/[id]` | Murid-side + guru (detail publik kelas) | KEEP — berbeda concern |
| Detail kelas | `/api/guru/kelasku/[id]` | Guru dashboard kelas | KEEP — berbeda concern (dipetakan utk SSOT population) |
| Population murid | `gradebook` L34, `nilai/export` L31, `auto-populate` L38, `literasi/stats` L61, `hasil-karya/leaderboard` L174, `tinjau-konstruktif` L19, `dokumen-siswa` L99 | Guru | **Duplikat concern SSOT** → konsolidasi via helper |
| Population kelas | `nilai/stats` L21, `buat-assessment` L14, `dashboard/social` L44, `literasi/stats` L56, `hasil-karya/leaderboard` L169 | Guru | **Duplikat concern SSOT** → konsolidasi via helper |

**Aturan:** Jangan hapus route; konsolidasi hanya lapisan query population.

## 9. Route Classification

### 9.1 Target prioritas (spec)

| Route | Guard | Population | Klasifikasi |
|-------|-------|-----------|-------------|
| `/api/guru/siswa` | ✅ SSOT | ✅ `getTeacherStudents` | **KEEP** |
| `/api/guru/siswa/[id]` | ✅ SSOT | ⚠️ `ownedGroups` inline | **WRAPPER** |
| `/api/guru/kelasku/[id]` | ⚠️ local isTeacher | ⚠️ inline `group.findFirst` + members 10000 | **WRAPPER** |
| `/api/guru/gradebook` | ✅ SSOT | ⚠️ inline `group`+`groupMember` (konsisten) | **WRAPPER** |
| `/api/guru/penugasan` | ✅ SSOT | inline (ownership-scoped) | **KEEP** |
| `/api/guru/penugasan/[id]` | ✅ SSOT | `group.members` include (all-role) | **KEEP** |
| `/api/guru/nilai` | ⚠️ GURU/founder/ADMIN | inline (validasi) | **WRAPPER** (guard → SSOT) |
| `/api/guru/nilai/stats` | ⚠️ GURU/founder | ⚠️ **take:50 + role:member** | **MIGRATE** |
| `/api/guru/nilai/auto-populate` | ⚠️ GURU/founder/ADMIN | ⚠️ `role:"member"` | **SPECIAL CASE** (audit) |
| `/api/guru/nilai/bulk` | ⚠️ GURU/founder/ADMIN | inline (validasi) | **WRAPPER** (guard → SSOT) |
| `/api/guru/nilai/export` | ⚠️ GURU/founder/ADMIN | ⚠️ `role:"member"` | **SPECIAL CASE** (audit) |
| `/api/guru/pengumuman` | ⚠️ local isTeacher | inline | **WRAPPER** |
| `/api/guru/pengumuman/[id]` | ⚠️ local isTeacher | inline | **WRAPPER** |
| `/api/guru/game-hub` | ✅ SSOT | ✅ `getTeacherStudentIds` | **KEEP** |
| `/api/guru/dashboard/analytics` | ✅ SSOT | ✅ `getTeacherStudentIds` | **KEEP** |
| `/api/guru/dashboard/social` | ⚠️ local isTeacher | ⚠️ inline + `role:"member"` | **WRAPPER / SPECIAL CASE** |
| `/api/guru/tinjau-konstruktif` | ✅ SSOT | ⚠️ inline `groupMember` | **WRAPPER** |
| `/api/guru/dokumen-siswa` | ✅ SSOT | ⚠️ legacy inline | **WRAPPER** |
| `/api/guru/literasi/stats` | ⚠️ local isTeacher | ⚠️ inline + `role:"member"` | **WRAPPER / SPECIAL CASE** |
| `/api/guru/hasil-karya/leaderboard` | ⚠️ local isTeacher | ⚠️ inline + `role:"member"` | **WRAPPER / SPECIAL CASE** |

### 9.2 Route lain yang diaudit

| Route | Klasifikasi |
|-------|-------------|
| `/api/guru/quiz/*` (9) | **KEEP** (SSOT guard + creatorId) |
| `/api/guru/quiz/[id]/assign` | **KEEP** (ownership-scoped; L98 notif bukan population inti) |
| `/api/guru/materi/[id]/kirim` | **KEEP** (ownership-scoped) |
| `/api/guru/buat-assessment` | **MIGRATE** (take:50 + guard) |
| `/api/guru/assign-tka` | **MIGRATE** (guard; population WRAPPER) |
| `/api/guru/latihan/*` | **MIGRATE** (guard GURU-only → SSOT) |
| `/api/guru/bank-soal/send` | **KEEP** (ownership-scoped) |
| `/api/guru/simulasi/rekap` | **KEEP** (SSOT via SimulationAnalyticsService) |
| `/api/group/route.ts` | **KEEP** (GET SSOT) |
| `/api/group/join` | **KEEP** (murid-side) |
| `/api/group/memberships` | **KEEP** (murid-side) |
| `/api/group/[id]` | **SPECIAL CASE** (no role guard; ownership saja) |
| `/api/group/[id]/student` | **KEEP** (murid-side) |
| `/api/group/[id]/claim` | **SPECIAL CASE** (no role check; pre-existing) |
| `/api/guru/dashboard` | **KEEP** (count akurat via groupMember.count) |
| `/api/guru/karya-comment/[commentId]` | **KEEP** (ownership verification) |
| `/api/guru/siswa/[id]/nickname-history` | **KEEP** (ownership verification; guard → SSOT) |

## 10. SSOT Gap Analysis

### A. SSOT sudah cukup untuk mayoritas
`getTeacherStudentIds` + `getTeacherGroups` sudah menangani game-hub, analytics, simulasi. Pola sudah terbukti.

### B. SSOT PERLU EXTENSION (2 gap nyata)

**Gap 1 — `getTeacherGroups` projection murid terlalu sempit.**
- Helper: `getTeacherGroups` (L42) → include members → `user: { select: { id, fullName, avatar, email } }`.
- Dampak: `getTeacherStudents()` (consumer `/api/guru/siswa`) TIDAK membawa `profile{noAbsen,nisn}`, `xp`, `level`, `streak`, `league`, `lastActiveAt` yang sudah ada di `STUDENT_SELECT`. Halaman Data Siswa (`/api/guru/siswa`) jadi kehilangan data yang sebelumnya tersedia.
- Consumer: `/api/guru/siswa`, `getTeacherStudentIds` (tidak butuh profile), SimulationAnalyticsService (tidak butuh profile).
- Backward-compatible: ya — **perluas include user memakai `STUDENT_SELECT`**. Objek tetap `user`, field bertambah.
- Security impact: tidak ada (data murid milik guru).

**Gap 2 — `getTeacherGroups` `take: 50` internal memotong population.**
- Helper: L52 `take: 50`.
- Dampak: guru dengan >50 kelas → `getTeacherStudentIds`/`getTeacherStudents` hanya mencakup 50 kelas terbaru.
- Backward-compatible: ya — tambah optional param `take?: number` (default 50, consumer analytics memanggil dengan `take: undefined`/besar).
- Consumer: `game-hub`, `dashboard/analytics`, `SimulationAnalyticsService`.
- Security impact: tidak ada.

### C. TIDAK PERLU HELPER BARU
Kedua gap ditangani dengan perluasan helper existing. Tidak membuat `getTeacherStudentsV2`, `getGuruStudents`, `getMuridGuru`, `getClassStudents`, `getTeacherMembers`.

## 11. Priority Matrix

| Priority | File | Problem | Root Cause | Proposed Action | Risk |
|----------|------|---------|------------|-----------------|------|
| P0-of-P1 | `nilai/stats` | Stats terpotong 50 kelas | take:50 population | Hilangkan take / pakai SSOT | Tinggi |
| P0-of-P1 | `buat-assessment` | Dropdown terpotong 50 kelas | take:50 population | Hilangkan take / pakai SSOT | Tinggi |
| P0-of-P1 | `lib/teacher/students.ts` | Population SSOT terpotong 50 kelas | take:50 internal | Extension optional take | Tinggi |
| P0-of-P1 | `lib/teacher/students.ts` | `/api/guru/siswa` hilang profile/noAbsen | projection sempit | Extension STUDENT_SELECT | Sedang |
| P0-of-P1 | ~14 route guard | False-403 ADMIN/founder | guard GURU-only | isTeacherOrStudent | Sedang |
| P1 | `nilai/*`, `gradebook`, `kelasku/[id]`, `dashboard/social`, `literasi/*`, `hasil-karya/*`, `pengumuman/*`, `tinjau-konstruktif` | Duplikat concern population | inline query | Konsolidasi ke SSOT | Sedang |
| P2 | `group/[id]/claim`, `group/[id]` | Tanpa role check (pre-existing) | fitur lama | Catat; keputusan terpisah | Rendah |
| P2 | bypass ADMIN/founder `penugasan/[id]` | Superuser tersirat | policy lama | Catat; butuh keputusan founder | Rendah |
| P2 | `dokumen-siswa` legacy fallback | duplikat population | fallback | Pertahankan, dokumentasi | Rendah |

## 12. Proposed Migration Order

| Phase | Scope | Detail |
|-------|-------|--------|
| **A** | SSOT Extension | `getTeacherGroups`: STUDENT_SELECT + optional `take`. Backward-compatible. |
| **B** | Guard/auth consistency | 14 route GURU-only → `isTeacherOrStudent`. Tanpa ubah ownership. |
| **C** | Population kelas | `nilai/stats`, `buat-assessment` → hilangkan take:50 (SSOT). `kelasku/[id]` → `getTeacherGroupDetail`. |
| **D** | Population murid | `gradebook`, `tinjau-konstruktif`, `dokumen-siswa` legacy → SSOT helpers. |
| **E** | Analytics/social/literasi | `dashboard/social`, `literasi/stats`, `hasil-karya/leaderboard` → SSOT (per-route audit role:member). |
| **F** | nilai guard & role member | `nilai/*` guard → SSOT; verifikasi `role:"member"` SPECIAL CASE (Phase 7). |
| **G** | WRAPPER route lain | `siswa/[id]`, `pengumuman/*`, `nilai-kategori` dll. |

Setiap phase: route → helper SSOT → ownership check dipertahankan → response contract sama → regression test (TEST 1–8).

## 13. TEST 1–8 Plan

| Test | Assertion | Lokasi |
|------|-----------|--------|
| TEST 1 | Guru melihat hanya murid kelas miliknya | `getTeacherStudents` scoping |
| TEST 2 | Guru A tidak dapat melihat murid Guru B | ownership isolation |
| TEST 3 | ADMIN/founder pakai Guru Experience tanpa false 403 | guard SSOT |
| TEST 4 | Kelas inactive tidak masuk population | `getTeacherGroups` isActive |
| TEST 5 | Duplicate student lintas kelas dihitung sekali | dedupe `getTeacherStudents` |
| TEST 6 | Population analytics tidak terpotong take:50 | nilai/stats + buat-assessment |
| TEST 7 | `role:"member"` legit tidak rusak | SPECIAL CASE tetap |
| TEST 8 | Existing Guru API response contract kompatibel | diff payload sebelum/sesudah |

Tambah SUBTEST bila perlu (mis. `nilai/stats` jumlah kelas tak terbatas, `/api/guru/siswa` membawa noAbsen). Jangan mengubah core TEST 1–8.

## 14. Static Security Check Plan

Grep ulang setelah implementasi di `app/api/guru/**`, `app/api/group/**`, `lib/**`:
1. `db.groupMember.findMany` langsung (tanpa helper) — harus hanya KEEP/SPECIAL CASE yang tersisa.
2. `db.group.findMany`/`findFirst` langsung untuk population — hanya ownership-validasi.
3. Missing `teacherId` ownership pada route yang menulis.
4. `role === "GURU"` guard yang tidak konsisten (harus `isTeacherOrStudent`).
5. `take: 50` sebagai population source — harus 0.
6. `role: "member"` — harus semua terdokumentasi SPECIAL CASE.
7. Helper duplikat (getTeacherStudentsV2, getGuruStudents, dll.) — harus 0.
8. `userId` unscoped — pastikan semua dibatasi membership/ownership.

Output ringkasan: BEFORE | MIGRATED | KEEP | SPECIAL CASE | NEEDS EXTENSION | REMAINING RISK.

## 15. Risks & Non-Goals

**Risks:**
1. Mengubah projection `getTeacherGroups` bisa menambah payload → dampak performa kecil (konsumen besar: game-hub, analytics). Mitigasi: pakai param `take` + tetap `select` minimal untuk helper jalur-hangat.
2. SPECIAL CASE `role:"member"` salah asumsi → hitungan nilai/leaderboard berubah. Mitigasi: verifikasi data `GroupMember.role` aktual di Phase 7 sebelum migrasi.
3. Bypass ownership ADMIN/founder (`penugasan/[id]`) — tidak diubah (bisa mengubah perilaku existing); hanya didokumentasikan.

**Non-Goals (fase ini TIDAK mengerjakan):**
- AI Latihan UI
- konsolidasi detail kelas
- GuruNav
- Pusat Literasi
- Panggung Literasi
- TKA enrichment
- game server
- GameRoom migration
- UI redesign
- Prisma schema changes
- API response redesign
- deletion of legacy routes
- deletion of legacy helpers

## Appendix A — Complete File Inventory

Semua file yang menyentuh `Group`/`GroupMember` di scope guru/group (34 file):
`app/api/group/route.ts`, `app/api/group/join`, `app/api/group/memberships`, `app/api/group/[id]/route.ts`, `app/api/group/[id]/student`, `app/api/group/[id]/claim`, `app/api/guru/siswa/route.ts`, `app/api/guru/siswa/[id]/route.ts`, `app/api/guru/siswa/[id]/nickname-history`, `app/api/guru/kelasku/[id]`, `app/api/guru/gradebook`, `app/api/guru/penugasan/route.ts`, `app/api/guru/penugasan/[id]`, `app/api/guru/penugasan/[id]/nilai-praktik`, `app/api/guru/nilai/route.ts`, `app/api/guru/nilai/stats`, `app/api/guru/nilai/auto-populate`, `app/api/guru/nilai/bulk`, `app/api/guru/nilai/export`, `app/api/guru/nilai/kuis-grade`, `app/api/guru/nilai-kategori/route.ts`, `app/api/guru/nilai-kategori/[id]`, `app/api/guru/pengumuman/route.ts`, `app/api/guru/pengumuman/[id]`, `app/api/guru/game-hub`, `app/api/guru/dashboard/route.ts`, `app/api/guru/dashboard/analytics`, `app/api/guru/dashboard/social`, `app/api/guru/tinjau-konstruktif`, `app/api/guru/dokumen-siswa`, `app/api/guru/literasi/stats`, `app/api/guru/hasil-karya/leaderboard`, `app/api/guru/materi/[id]/kirim`, `app/api/guru/assign-tka`, `app/api/guru/buat-assessment`, `app/api/guru/quiz/[id]/assign`, `app/api/guru/bank-soal/send`, `app/api/guru/latihan/[id]`, `app/api/guru/karya-comment/[commentId]`, `lib/teacher/students.ts`, `lib/simulation/SimulationAnalyticsService.ts`, `lib/gamification/teacher-xp.ts`, `lib/gamification/badge-engine.ts`, `lib/gamification/leaderboard.ts`.

## Appendix B — KEEP/MIGRATE/WRAPPER/SPECIAL CASE/NEEDS SSOT EXTENSION Summary

| Action | Jumlah (route/entry) | Rincian |
|--------|----------------------|---------|
| **KEEP** | 24 | group/route GET, join, memberships, [id]/student, quiz/* (9), assign, materi/kirim, bank-soal/send, penugasan(+[id]), dashboard count, karya-comment, nickname-history, nilai/auto-populate (validasi), nilai/bulk, simulasi/rekap |
| **MIGRATE** | 9 | nilai/stats, buat-assessment, assign-tka, latihan/* (3), nilai-kategori(+[id]), hasil-tka, generated-rpp, rpp, artikel, earnings, leaderboard — guard; nilai/stats + buat-assessment juga take |
| **WRAPPER** | 12 | siswa/[id], kelasku/[id], gradebook, nilai, pengumuman(+[id]), dashboard/social, tinjau-konstruktif, dokumen-siswa, literasi/stats, hasil-karya/leaderboard, assign-tka population |
| **SPECIAL CASE** | 6 | role:"member" (nilai/stats, nilai/export, nilai/auto-populate, literasi/stats, hasil-karya/leaderboard), group/[id], group/[id]/claim |
| **NEEDS SSOT EXTENSION** | 2 | getTeacherGroups (STUDENT_SELECT + optional take) |
