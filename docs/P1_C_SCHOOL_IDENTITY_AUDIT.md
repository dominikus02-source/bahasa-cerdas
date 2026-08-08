# P1-C SCHOOL IDENTITY & DATA NORMALIZATION AUDIT

**Tanggal**: 8 Agustus 2026
**Mode**: READ-ONLY absolute. Tidak ada file source/schema/API/UI/tests/config yang diubah. Satu-satunya file baru: dokumen ini.

---

## 1. Executive Summary

BahasaCerdas saat ini **TIDAK memiliki model School**, **TIDAK memiliki `schoolId`**, dan **TIDAK memiliki mekanisme canonical school identity**. Identitas sekolah adalah **satu field string bebas** `Profile.school` (nullable), yang diisi lewat free-text input saat registrasi dan dapat diubah kapan saja lewat PATCH `/api/user/profile`.

Akibatnya semua fitur yang bergantung pada agregasi sekolah (`topSchools`/Pusat Literasi, scope "Sekolah Saya", leaderboard SCHOOL, filter admin analytics) melakukan **string equality kasus-sensitif** (`===`) atau **`contains` insensitive** terhadap string mentah. Tidak ada `trim()`, `toLowerCase()`, `normalize()`, atau alias engine di seluruh rantai tulis → baca. Setiap variasi penulisan ("SMP Santa Laurensia" vs "smp santa laurensia") berpotensi menjadi bucket/entitas terpisah.

**Kesimpulan**: risiko *DUPLICATE IDENTITY* dan *aggregation fragmentation* adalah **NYATA dan struktural** (bukan hipotetis) — terbukti dari kode, meskipun frekuensinya di data riil tidak dapat diukur (DB read-only unavailable). Desain canonical School ID + alias wajib dibangun pada fase implementasi, tetapi TIDAK ada schema/helper yang dibuat pada Phase 0 ini.

---

## 2. Current Data Model

### 2.1 Tabel Model | Field | Type | Relation | Nullable | Source | Used By | Risk

| Model | Field | Type | Relation | Nullable | Source | Used By | Risk |
|-------|-------|------|----------|----------|--------|---------|------|
| `Profile` | `school` | `String?` | `Profile.userId → User` (1:1) | Ya | `registerSchema.school` (max 200), `profileUpdateSchema.school`, free-text | feed-karya (Pusat Literasi), hasil-karya leaderboard, `lib/gamification/leaderboard.ts` (scope SCHOOL), admin analytics filter, display (murid beranda, public profile, rapor, arena feed, murid karya detail, guru game, penilaian) | **HIGH — satu-satunya identity sekolah** |
| `Community` | `school` | `String?` | `Community.creatorId → User` | Ya | `POST/PUT /api/komunitas` body `school` | Tersimpan; **TIDAK dipakai untuk filter** di `GET /api/komunitas` (hanya name/description/region/type) | LOW — orphan field |
| `GeneratedRPP` | `schoolInfo` | `Json?` | `GeneratedRPP.uploaderId → User` | Ya | `POST /api/guru/generated-rpp` body `schoolInfo` (denormalized identity dokumen) | Dokumen RPP (kop/identitas) | LOW — dokumen, bukan agregasi |
| `Loker` | `sekolah` | `String` (required) | `Loker.authorId → User` | Tidak | `POST /api/admin/loker` body `sekolah` | Admin loker page display | LOW — lowongan kerja, bukan identitas pengguna |
| `User` | — | — | — | — | — | — | **TIDAK ada field sekolah** |
| `Group` | — | — | — | — | — | — | **TIDAK ada field sekolah** |
| `PlayerProfile` | — | — | — | — | — | — | **TIDAK ada field sekolah** |
| `ArenaJuniorAkun` | — | — | — | — | — | — | **TIDAK ada field sekolah** |

### 2.2 Jawaban Eksplisit

1. **Apakah model School/Institution sudah ada?** **TIDAK.** `grep "model School|model Organization|model Institution|model Sekolah"` → 0 hasil di seluruh repo.
2. **Apakah schoolId sudah ada?** **TIDAK.** Tidak ada kolom `schoolId`/`school_id`/`sekolahId` di schema maupun kode.
3. **Apakah schoolName disimpan lebih dari satu tempat?** **YA, 4 tempat dengan peran berbeda**: `Profile.school` (identity pengguna — SATU-SATUNYA yang dipakai agregasi), `Community.school` (identitas komunitas), `GeneratedRPP.schoolInfo` (identitas dokumen), `Loker.sekolah` (identitas lowongan). Yang 3 terakhir BUKAN source of truth identitas pengguna.
4. **Apakah User dan Profile sama-sama menyimpan identitas sekolah?** **TIDAK.** Hanya `Profile.school`. `User` tidak punya field sekolah. (`/api/user/me` menggabungkan `profile` ke response, sehingga UI menerima `user.school` — tetapi itu spread dari Profile, bukan field User.)
5. **Apakah Group menyimpan school information?** **TIDAK.** `model Group` hanya name/description/grade/tahunAjaran/accessCode/teacherId.
6. **Apakah karya/content menyimpan school information langsung?** **TIDAK.** `StudentKarya` dan `Karya` tidak punya kolom school; mereka membaca lewat `user.profile.school` (JOIN di select).
7. **Apakah ada duplicate source of truth?** **YA — dalam arti konsumen**: semua konsumen membaca `Profile.school`, TETAPI dengan strategi pembandingan berbeda (lihat §6). Tidak ada satu fungsi normalisasi yang menjadi sumber kebenaran.

---

## 3. School Identity Sources

| Source | Model/Table | Field | Write Path | Read Consumers | Current Normalization | Identity Risk | Proposed Treatment |
|--------|-------------|-------|-----------|----------------|----------------------|---------------|---------------------|
| Profile (user) | `Profile` | `school` | 1) `app/actions/register.ts` (`sanitize(school)` HTML-escape, bukan case/trim); 2) `PATCH /api/user/profile` (raw, tanpa validasi case/trim); 3) murid profile page; 4) guru pengaturan page | Feed karya, Pusat Literasi, hasil-karya leaderboard, gamification leaderboard SCHOOL, admin analytics filter, rapor, public profile, murid beranda, arena feed, guru game, penilaian | **NONE** (hanya HTML-escape `sanitize()` saat register; PATCH tidak) | **HIGH — DUPLICATE IDENTITY RISK** | Canonical `School` + `Profile.schoolId`; `Profile.school` dipertahankan sebagai denormalized display selama migrasi |
| Community | `Community` | `school` | `POST/PUT /api/komunitas` | Tidak ada filter agregasi (field tersimpan, UI edit form mengirim tapi UI create tidak; edit form memuat `school` state namun dikirim via `{...editForm}`) | NONE | LOW | Alias/relasi opsional ke School |
| GeneratedRPP | `GeneratedRPP` | `schoolInfo` | `POST /api/guru/generated-rpp` | Dokumen RPP | NONE | LOW | Tetap JSON (identitas dokumen, bukan agregasi) |
| Loker | `Loker` | `sekolah` | `POST /api/admin/loker` | Admin loker page | NONE | LOW | Tetap free text (lowongan) |

---

## 4. User & Profile Registration Flow

### 4.1 Student Registration Flow (traced sampai DB write)

```
/app/(auth)/register/page.tsx (client)
  → state: school (free text, placeholder "SMP Negeri 2 Bandung", TIDAK required)
  → handleRegister:
    1) POST /api/auth/create-user { email, password, fullName, role }
    2) registerUser(formData)  // Server Action app/actions/register.ts
       ├─ registerSchema.safeParse → school: z.string().max(200).nullable().optional()
       ├─ db.user.create(...)
       └─ db.profile.create({ school: sanitize(school) })
    3) auto-login
/app/(auth)/onboarding/page.tsx → TIDAK mengumpulkan school (hanya POST /api/user/onboarded)
```

### 4.2 Teacher Registration Flow (identical write path)

```
Sama persis — register page placeholder "SMA Negeri 1 Jakarta".
Tidak ada perbedaan mekanisme antara GURU dan MURID.
```

### 4.3 Profile Update (post-registration)

```
Murid: /app/(dashboard)/murid/profile/page.tsx → PATCH /api/user/profile { school }
Guru:  /app/(dashboard)/guru/pengaturan/page.tsx → PATCH /api/user/profile { school }
PATCH /api/user/profile/route.ts: profileData = { bio, school, city, province }; upsert Profile.
```

### 4.4 Jawaban Eksplisit

1. **Apakah sekolah diketik bebas?** **YA** — `<input type="text">` murni, tanpa datalist/autocomplete.
2. **Apakah ada pilihan sekolah?** **TIDAK.** Tidak ada dropdown, tidak ada directory.
3. **Apakah guru dan murid menggunakan mekanisme yang sama?** **YA** — field sama, endpoint sama, validasi sama.
4. **Apakah schoolName dapat diubah setelah registrasi?** **YA, bebas** — lewat PATCH `/api/user/profile` tanpa syarat.
5. **Apakah ada validasi?** Hanya `z.string().max(200)`. TIDAK ada enum, TIDAK ada canonicalization, TIDAK ada required.
6. **Apakah ada canonicalization?** **TIDAK** — `sanitize()` hanya HTML-escape (`&<>"'/`), bukan trim/uppercase/lowercase/normalize. PATCH tidak menerapkan sanitize sama sekali.
7. **Apakah ada existing institution directory?** **TIDAK.** Tidak ada endpoint search sekolah, tidak ada data sekolah master.

---

## 5. School Data Consumers

| Feature | Route/File | Query | School Source | Aggregation Key | Normalization | Risk |
|---------|-----------|-------|---------------|-----------------|---------------|------|
| Pusat Literasi — Sekolah Paling Aktif | `app/api/guru/hasil-karya/leaderboard/route.ts` | `db.studentKarya.findMany(... profile: { select: { school } })` | `Profile.school` | `schoolMap.get(school)` — **raw string, case-sensitive** (line 145-153) | NONE | **HIGH — DUPLICATE IDENTITY RISK** |
| Pusat Literasi — Guru Penggerak | sama | `teacherStatMap` key `school ?? "__none__"` (line 171-179) | `Profile.school` | **raw string** | NONE | **HIGH** |
| Pusat Literasi — scope "Sekolah Saya" | sama | `rows.filter(r => r.user.profile?.school === myProfile.school)` (line 97) | `Profile.school` | **exact `===`, case-sensitive** | NONE | **HIGH** |
| Pusat Literasi — Top Creator | sama | `best.user.profile?.school` display | `Profile.school` | display only | NONE | LOW |
| Pusat Literasi feed | `app/(dashboard)/guru/feed-karya/page.tsx` | fetch `/api/guru/hasil-karya/leaderboard?scope=`; display `karya.user.profile.school` | `Profile.school` | display; `.split(" ").slice(0,2)` truncate | NONE | LOW (display) |
| Game leaderboard (arena player) | `lib/gamification/leaderboard.ts` (line 79-88) | `db.profile.findMany({ where: { school: { not: null } } })` → `profiles.filter(p => p.school === mine.school)` | `Profile.school` | **exact `===`, case-sensitive**; full table scan in-memory | NONE | **HIGH** |
| Player leaderboard API | `app/api/player/leaderboard/route.ts` | `scope=SCHOOL` → getLeaderboard | `Profile.school` | exact `===` | NONE | **HIGH** |
| Admin analytics filter | `app/api/admin/analytics/dashboard/route.ts` (line 100) | `profileFilters.school = { contains: school, mode: "insensitive" }` | `Profile.school` | **contains insensitive** (partial, substring) | client-side `trim()` saja | MEDIUM (filter bebas tidak agregasi) |
| Admin analytics page | `app/(dashboard)/admin/analytics/page.tsx` | fetch dashboard dengan param `school` | `Profile.school` | trim saat kirim | trim | MEDIUM |
| Student analytics — beranda | `app/(dashboard)/murid/beranda/page.tsx` | `/api/user/me` (profile spread) | `Profile.school` | display only | NONE | LOW |
| Public profile | `app/(dashboard)/profile/[id]/page.tsx` | `GET /api/user/profile/[id]` | `Profile.school` | display only | NONE | LOW |
| Arena feed | `app/arena/feed/page.tsx` | `/api/siswa/karya` → `k.user.profile?.school` | `Profile.school` | display only | NONE | LOW |
| Murid karya detail | `app/(dashboard)/murid/karya/[id]/page.tsx` | `/api/siswa/karya/[id]` → `user.profile?.school` | `Profile.school` | display only | NONE | LOW |
| Rapor | `app/(dashboard)/guru/penilaian/rapor/page.tsx` | `siswa.profile?.school` display | `Profile.school` | display only | NONE | LOW |
| Penilaian | `app/(dashboard)/guru/penilaian/page.tsx` | type only (bukan display) | `Profile.school` | — | NONE | LOW |
| Guru game page | `app/(dashboard)/guru/game/page.tsx` | type only (bukan display) | `Profile.school` | — | NONE | LOW |
| Game hub | `app/api/guru/game-hub/route.ts` | `profile: { select: { school: true } }` (dipakai?) — display | `Profile.school` | display | NONE | LOW |
| Komunitas | `app/(dashboard)/guru/komunitas/page.tsx` | create form TIDAK memuat school; edit form state ada tapi UI tidak punya input school | `Community.school` | — | NONE | LOW |
| Community API | `app/api/komunitas/[id]/route.ts` | PUT menerima `school` | `Community.school` | — | NONE | LOW |

### 5.1 Fitur yang TIDAK mengonsumsi school (diverifikasi)
- Guru beranda (`/guru/beranda`) — 0 penggunaan school.
- Guru game leaderboard (`/guru/game/leaderboard`, `/api/guru/leaderboard`) — 0.
- Admin users page + `/api/admin/users` — 0.
- Admin feature-usage, ai-analytics — 0.
- Backup/restore scripts — 0.
- ArenaJunior — 0.
- Penilaian gradebook — 0 (hanya penilaian rapor display).
- `Community.school` TIDAK dipakai di `GET /api/komunitas` (filter hanya name/description/type/region).

---

## 6. Leaderboard & Analytics Forensics

### 6.1 Aggregation Inventory

| Aggregation | Route/File | Sumber Data | Field Sekolah | Normalization | Grouping Key | Case-Sensitive | Whitespace-Sensitive | Alias-Aware | Duplicate Bucket Mungkin |
|-------------|-----------|-------------|---------------|---------------|--------------|----------------|----------------------|-------------|--------------------------|
| Top 10 Sekolah Paling Aktif | `hasil-karya/leaderboard` L145-153 | `StudentKarya` + `user.profile.school` | `Profile.school` | NONE | raw string via `Map.get(school)` | **YA** | **YA** | **TIDAK** | **YA → DUPLICATE IDENTITY RISK** |
| Top 10 Guru Penggerak | `hasil-karya/leaderboard` L171-179 | sama | `Profile.school` | NONE | `school ?? "__none__"` | **YA** | **YA** | **TIDAK** | **YA** |
| Scope "Sekolah Saya" | `hasil-karya/leaderboard` L97 | sama | `Profile.school` | NONE | `===` | **YA** | **YA** | **TIDAK** | **YA** (user beda case tidak tampil) |
| Scope SCHOOL leaderboard pemain | `lib/gamification/leaderboard.ts` L87 | `Profile` full scan | `Profile.school` | NONE | `===` | **YA** | **YA** | **TIDAK** | **YA** |
| Admin analytics | `admin/analytics/dashboard` L100 | `Profile` | `Profile.school` | trim (client) | `contains insensitive` | TIDAK | Sebagian (contains) | **TIDAK** | Substring bisa over-match (false positive merge) |

### 6.2 Kesimpulan Forensik

- **Tiga strategi pembandingan berbeda** dipakai untuk field yang sama: `===` (2 tempat), `contains insensitive` (1 tempat), raw Map key (2 tempat). Ini **inkonsisten secara desain**.
- Untuk `===` dan raw Map key: "SMP Santa Laurensia" dan "smp santa laurensia" → **DUPLICATE IDENTITY RISK (buckets terpisah)**.
- Untuk `contains insensitive`: "SMPN 1" akan match "SMPN 12" — risiko **false-positive merge** (over-grouping).
- Tidak ada satu pun agregasi yang `trim()` sebelum grouping. `Map.get("  SMP Santa Laurensia ")` ≠ `Map.get("SMP Santa Laurensia")`.
- **Semua agregasi dilakukan in-memory di JS** (bukan SQL `GROUP BY`) — sekolah kosong di-render sebagai `"Tanpa Sekolah"` / `"__none__"` / `"Siswa BahasaCerdas"` di berbagai tempat (label tidak konsisten).

---

## 7. Current Normalization Behavior

### 7.1 Inventory

| Fungsi | Lokasi | Dipakai untuk school? |
|--------|--------|------------------------|
| `sanitize()` (HTML-escape `&<>"'/`) | `lib/validations.ts:108` | **YA** (hanya di register action; PATCH tidak) — bukan normalisasi case/whitespace |
| `sanitizeTeks()` (NFC + control chars) | `lib/validations.ts:87` | TIDAK |
| `.normalize("NFD")` | `lib/arena-junior/akun.ts:50` | TIDAK (slug nama) |
| `.trim()` | `admin/analytics/page.tsx:319` (client, filter) | Parsial — hanya saat mengirim filter |
| `.trim()` | `rpp-form.tsx:125` (`schoolName.trim()`) | TIDAK (form RPP AI, bukan Profile.school) |
| slugify | `app/api/guru/artikel/route.ts` | TIDAK (artikel) |

### 7.2 Penilaian

Normalisasi saat ini:
- **Hanya kosmetik** pada titik tertentu (`sanitize` HTML-escape; `trim` pada filter admin saja).
- **TIDAK pernah dipakai sebagai grouping key** — agregasi memakai raw string.
- **TIDAK dipakai sebagai identity**.
- **Risiko collision**: TIDAK ada collision dari normalisasi (karena tidak ada normalisasi); justru risiko sebaliknya — **tanpa normalisasi**, variasi penulisan menghasilkan split.

### 7.3 Safe vs Unsafe Normalization (rekomendasi konsep, TIDAK diimplementasikan)

**Safe** (hanya mengurangi variasi format, tidak mengubah makna):
- `trim()` seluruh whitespace tepi.
- Kolaps spasi ganda/ganda-dalam → satu spasi.
- Unicode normalization NFC (menggabungkan aksen kompatibel) — sudah dipakai `sanitizeTeks`.
- Normalisasi huruf non-ASCII yang ambigu (mis. `İ` → `I`), tetap per-case dan diverifikasi.

**Potentially unsafe** (JANGAN diterapkan otomatis tanpa review):
- Menghapus kata tipe ("SMP", "Sekolah", "Madrasah", "SMK") — karena "SMP X" vs "X" bisa beda arti.
- Menghapus lokasi ("Alam Sutera", "Jakarta") — "SMP Santa Laurensia" ≠ "SMP Santa Laurensia Alam Sutera".
- Menghapus kata umum ("Negeri", "Swasta", "N", "1") — "SMPN 1" vs "SMPN 2" hanya beda satu digit.
- Fuzzy matching agresif (Levenshtein < 2, substring sembarang).
- Auto-merge tanpa human review.

---

## 8. Duplicate Identity Risks

### 8.1 Mekanisme Terbukti (dari kode, bukan data)

| Raw Value A | Raw Value B | Why They Look Similar | Confidence | Auto-Merge? | Human Review? |
|-------------|-------------|----------------------|------------|-------------|---------------|
| `SMP Santa Laurensia` | `smp santa laurensia` | Case variance (no `toLowerCase` in aggregation) | EXAMPLE ONLY — DB unavailable | **TIDAK** | **YA** |
| `SMP Santa Laurensia` | `SMP Santa Laurensia ` | Trailing/leading whitespace (no `trim` in aggregation) | EXAMPLE ONLY | **TIDAK** | **YA** |
| `SMP Santa Laurensia` | `SMP SANTA LAURENSIA` | Case + spacing variance | EXAMPLE ONLY | **TIDAK** | **YA** |
| `Santa Laurensia` | `SMP Santa Laurensia` | Abbreviation of type prefix | EXAMPLE ONLY | **TIDAK** (tidak boleh auto-merge) | **YA** |
| `SMP Santa Laurensia` | `SMP Santa Laurensia Alam Sutera` | Same base name, different campus | EXAMPLE ONLY | **TIDAK** (bisa beda entitas) | **YA — kandidat cabang** |
| `SMPN 1 Jakarta` | `SMP Negeri 1 Jakarta` | Abbreviation expansion | EXAMPLE ONLY | **TIDAK** (perlu aturan) | **YA** |

> Catatan: Semua contoh di atas bertanda **EXAMPLE ONLY** — database read-only TIDAK tersedia (lihat §9), sehingga tidak ada bukti klaster data riil yang diukur. Contoh dibangun dari pola yang *terbukti berpotensi terpecah* berdasarkan kode agregasi (§6).

### 8.2 Klasifikasi (definisi yang diusulkan)

- **EXACT DUPLICATE** — byte-identik setelah `trim()`. Aman di-merge.
- **NORMALIZATION DUPLICATE** — identik setelah `trim()+toLowerCase()+NFC`. Perlu verifikasi manusia.
- **POSSIBLE DUPLICATE** — kemiripan tinggi tapi ada kata tambahan/berbeda. Perlu review.
- **UNKNOWN** — tidak ada bukti. Jangan di-merge.

---

## 9. Real Data Findings

**DATABASE READ-ONLY UNAVAILABLE.**

- `.env.local` berisi nilai `[SENSITIVE]` untuk `DATABASE_URL` dan `DIRECT_URL` (mekanisme masking environment opencode — didokumentasikan di AGENTS.md). Tidak ada kredensial riil yang dapat digunakan untuk koneksi read-only.
- `backups/current/` kosong (tidak ada dump lokal yang bisa dianalisis secara read-only).
- Shell environment tidak memiliki `DATABASE_URL`/`DIRECT_URL` yang ter-export.

Karena itu: **tidak ada angka unik sekolah, distribusi case/whitespace, jumlah null, atau kandidat klaster yang dilaporkan.** Tidak ada angka yang dibuat-buat. Query agregasi riil (total unique school strings, top 100, case/whitespace/punctuation variations, null rate) menjadi langkah pertama yang WAJIB pada fase implementasi sebelum desain final.

---

## 10. Identity Ownership

### 10.1 Siapa yang Bisa Apa (rekomendasi — TIDAK diimplementasikan)

| Pertanyaan | Temuan saat ini | Rekomendasi |
|------------|-----------------|-------------|
| Siapa yang boleh membuat School baru? | Siapa pun (free text saat register/update) | Founder/ADMIN (manual) atau Guru dengan review; batch import oleh admin |
| Siapa yang boleh memilih School? | Tidak ada pilihan | Semua user saat registrasi/onboarding (dari canonical directory) |
| Siapa yang boleh mengubah School? | Siapa pun (PATCH bebas) | Founder/ADMIN + reviewer; perubahan nama → alias + history |
| Apakah siswa boleh mengubah sekolah sendiri? | YA (PATCH bebas) | Mungkin YA dengan batas (mis. sekali per semester) + log; atau TIDAK tanpa verifikasi guru |
| Apakah guru boleh membuat sekolah baru? | YA (implisit, free text) | YA dengan review (workflow) |
| Bagaimana menangani typo? | Tidak ada mekanisme | Kandidat alias → UI "Maksud Anda: X?" |
| Bagaimana menangani sekolah yang pindah nama? | Tidak ada | Rename → simpan nama lama sebagai alias |
| Bagaimana menangani cabang sekolah? | Tidak ada | Setiap cabang = School ID terpisah (keputusan founder §Policy 8) |
| Bagaimana menangani sekolah tanpa data lengkap? | Tidak ada | School minimal (canonicalName + kota) boleh dibuat; data lengkap opsional |

---

## 11. Canonical School Identity Options

### OPTION A — Tetap schoolName + normalization
Menerapkan `trim()+toLowerCase()+NFC` di titik tulis dan di setiap agregasi.

| Dimensi | Penilaian |
|---------|-----------|
| Pros | Tanpa migration; cepat; tanpa model baru |
| Cons | Case/whitespace resolved, tapi "SMP Santa Laurensia" vs "Santa Laurensia" tetap split; `contains` di admin tetap over-match; tidak ada identity stabil; rename sekolah merusak semua agregasi historis; cabang tidak bisa dibedakan; tidak ada cara merge |
| Migration risk | RENDAH (tidak ada schema change) |
| Data integrity | LEMAH — tidak ada identitas kanonik |
| UX | Perbaikan kecil; tidak ada autocomplete directory |
| Scalability | Agregasi tetap raw string; index tidak ada |
| Analytics reliability | RENDAH — klaster tetap fragment |
| Implementation complexity | RENDAH (function + wire ke semua agregasi) |

### OPTION B — School canonical ID + alias table
`School(id, canonicalName, city, province)` + `SchoolAlias(id, schoolId, alias)`; `Profile.schoolId → School`; `Profile.school` dipertahankan sebagai denormalized display; `SchoolAlias` menampung variasi.

| Dimensi | Penilaian |
|---------|-----------|
| Pros | Identity stabil; agregasi memakai `schoolId` (case-insensitive, alias-aware); rename sekolah = alias + update canonical; cabang = ID berbeda; directory untuk autocomplete; index mudah |
| Cons | Migration butuh backfill `schoolId` dari `Profile.school` (perlu matching batch); UI form berubah; waktu |
| Migration risk | MEDIUM — backfill + default (null schoolId) |
| Data integrity | KUAT — satu canonical per sekolah |
| UX | Autocomplete + "Maksud Anda?" |
| Scalability | Index `Profile.schoolId`; agregasi `GROUP BY schoolId` |
| Analytics reliability | TINGGI — satu bucket per sekolah |
| Implementation complexity | MEDIUM — model + backfill + form + agregasi ulang |

### OPTION C — School canonical ID + alias + confidence matching + review workflow
OPTION B + `SchoolAlias.confidence`, `SchoolMergeRequest`, review admin, history.

| Dimensi | Penilaian |
|---------|-----------|
| Pros | Semua keunggulan B + penanganan ambigu eksplisit; audit; batch merge |
| Cons | Kompleksitas tertinggi; butuh admin UI + queue; overkill bila volume sekolah kecil |
| Migration risk | MEDIUM-HIGH |
| Data integrity | SANGAT KUAT |
| UX | Terbaik (progressive: match → confirm → merge) |
| Scalability | Terbaik untuk skala besar |
| Analytics reliability | TINGGI + dapat diaudit |
| Implementation complexity | TINGGI |

### RECOMMENDED OPTION: **OPTION B** (School canonical ID + alias), dengan fase:
- **Fase 1 (data)**: audit distribusi `Profile.school` riil (setelah DB access tersedia) → build initial `School` + `SchoolAlias` via script matching (EXACT → NORMALIZATION → manual review untuk POSSIBLE).
- **Fase 2 (identity)**: `Profile.schoolId` nullable + form autocomplete + fallback "buat baru (review)".
- **Fase 3 (agregasi)**: ganti semua `===`/`contains`/raw Map key dengan `GROUP BY schoolId`; `Profile.school` jadi display-only denormalized.
- OPTION C dibuka bila ditemukan >5% ambiguous duplicates di data riil.

---

## 12. Migration Impact

| Area | Dampak | Severity | Catatan |
|------|--------|----------|---------|
| `Profile` | +`schoolId String?` FK → School | MEDIUM | Add-only; `school` dipertahankan |
| `User` | Tidak berubah | LOW | — |
| `Group` | Tidak berubah (opsional +schoolId di masa depan) | LOW | — |
| `StudentKarya`/`Karya` | Tidak berubah (baca via profile) | LOW | — |
| Leaderboard Pusat Literasi | Ganti raw string key → `schoolId` | **HIGH** | hasil-karya leaderboard L145-179 |
| Gamification leaderboard SCHOOL | Ganti `===` scan → `GROUP BY schoolId` | **HIGH** | lib/gamification/leaderboard.ts |
| Player leaderboard API | scope SCHOOL membaca via schoolId | MEDIUM | /api/player/leaderboard |
| Admin analytics | Filter `contains` → bisa tetap free-text filter pada `Profile.school` atau canonical name | MEDIUM | — |
| Feed/display (murid beranda, arena feed, rapor, public profile, guru game, game-hub, penilaian) | Baca `Profile.school` display — tetap bekerja (denormalized) | LOW | Tidak wajib ubah sekarang |
| Community | `Community.school` bebas — opsional relasi | LOW | — |
| Search | Tidak ada search sekolah | LOW | — |
| Dashboard guru | Tidak konsumsi school (diverifikasi) | LOW | — |
| Reporting/export | Tidak ada export by school saat ini | LOW | — |
| Admin (users) | Tidak konsumsi school | LOW | — |

### Kategori Severity
- **HIGH**: leaderboard/aggregation consumers (3 titik kode) — harus diganti saat implementasi agar satu identity.
- **MEDIUM**: Profile schema + backfill; admin analytics filter; player leaderboard.
- **LOW**: semua display-only.

---

## 13. Risk Matrix

| # | Risk | Probabilitas | Dampak | Severitas | Bukti Kode |
|---|------|--------------|--------|-----------|------------|
| 1 | School buckets terpecah karena case/whitespace variance | TINGGI | TINGGI | **HIGH** | `Map.get(school)` raw (hasil-karya L147); `===` (leaderboard L87, L97) |
| 2 | "Sekolah Saya" (scope=school) kosong karena beda case antara guru & murid | TINGGI | TINGGI | **HIGH** | `profile?.school === myProfile.school` L97 |
| 3 | False-positive over-merge pada filter admin (`contains`) | TINGGI | RENDAH | MEDIUM | `contains insensitive` dashboard L100 |
| 4 | Tidak ada identity stabil → rename sekolah merusak histori | TINGGI | TINGGI | **HIGH** | Tidak ada School model |
| 5 | Data integrity: schoolName dapat dipalsukan | TINGGI | TINGGI | **HIGH** | Free text, tanpa verifikasi, tanpa whitelist |
| 6 | Leaderboard dapat dimanipulasi variasi nama (dipakai untuk "naikkan" sekolah) | TINGGI | TINGGI | **HIGH** | Agregasi key raw string |
| 7 | `Community.school` orphan (tersimpan tidak dipakai) | SEDANG | RENDAH | LOW | GET komunitas tanpa filter school |

### 13.1 SECURITY / DATA INTEGRITY CHECK (wajib dari spec)

| Pertanyaan | Temuan | Klasifikasi |
|------------|--------|-------------|
| Apakah schoolName dapat dipalsukan? | **YA** — free text, tanpa whitelist/verifikasi, PATCH bebas | **HIGH** |
| Apakah user dapat memasukkan nama sekolah milik sekolah lain? | **YA** — tanpa kendali; bisa "bergabung" ke bucket sekolah mana pun | **HIGH** |
| Apakah schoolName digunakan untuk authorization? | **TIDAK** — tidak pernah jadi security boundary | LOW |
| Apakah schoolName dipakai sebagai security boundary? | **TIDAK** | LOW |
| Apakah perubahan schoolName memengaruhi ownership? | **TIDAK** — ownership pakai `uploaderId`/`creatorId`/`teacherId`, bukan school | LOW |
| Apakah leaderboard dapat dimanipulasi dengan variasi nama? | **YA** — mengetik nama sekolah populer membuat karya masuk bucket sekolah itu; variasi case memecah bucket | **HIGH** |
| Apakah user dapat membuat school identity palsu? | **YA** — mengetik string baru = "sekolah baru" | **HIGH** |

> **CRITICAL DATA INTEGRITY RISK**: Identitas sekolah saat ini **tidak terverifikasi dan sepenuhnya user-controlled**, sekaligus menjadi **grouping key agregasi publik** (Sekolah Paling Aktif, Guru Penggerak). Kombinasi ini memungkinkan **leaderboard gaming** dan **identity spoofing**. Ini adalah temuan security paling penting dari audit ini.

---

## 14. Recommended Architecture

```
School                         Profile
├── id (cuid)                  ├── schoolId → School (nullable, FK)
├── canonicalName              ├── school (String?, denormalized display — DI-PERTAHANKAN
├── city                       │     selama migrasi, jadi semua display lama tetap bekerja)
├── province
├── region
├── status (VERIFIED/PENDING)
└── SchoolAlias[]
    ├── id
    ├── schoolId → School
    ├── alias (variant: "SMP SANTA LAURENSIA", "Santa Laurensia", "smp santa laurensia ")
    ├── source (REGISTRATION / IMPORT / SUGGESTION)
    └── confidence (EXACT / NORMALIZED / FUZZY / MANUAL)
```

- `School.canonicalName` = satu nama resmi yang ditampilkan di leaderboard/analytics.
- `SchoolAlias.alias` = semua variasi yang pernah ditulis user → resolusi via `WHERE lower(alias)=lower(:input)` setelah normalize.
- Agregasi baru memakai `GROUP BY profile.schoolId` (bukan string).
- `Profile.school` tetap ditulis untuk backward-compat (display), di-set = canonicalName saat resolve.

---

## 15. Recommended Matching Strategy

Urutan resolusi saat user mengetik sekolah (input raw → School):
1. **NORMALIZE**: `trim()` → kolaps spasi → NFC → `toLowerCase()` (SAFE only — §7.3).
2. **EXACT**: cari `SchoolAlias.alias` normalized == input normalized → match.
3. **NORMALIZED MATCH**: canonicalName normalized == input normalized → match.
4. **CANDIDATES**: LIKE pada alias/canonicalName (≤ N hasil) → UI "Maksud Anda?".
5. **CREATE-PENDING**: tidak ada match → buat `School` status `PENDING` + `SchoolAlias` dari input; founder/admin review → approve/merge/rename.

**Threshold confidence** (usulan, butuh keputusan founder §Policy 6):
- EXACT (setelah normalize) → auto-match 100%.
- NORMALIZED (case/whitespace) → auto-match 100% (dengan catatan §7.3 safe).
- FUZZY (Levenshtein ≤ 2 pada nama normal, tanpa kata tipe) → kandidat, review.
- STRUKTUR (nama sama + lokasi beda) → kandidat CABANG, review (bisa beda ID).

**TIDAK dibuat pada Phase 0** — semua ini konsep saja.

---

## 16. Policy Questions Requiring Founder Approval

1. Apakah BahasaCerdas akan menggunakan **canonical School ID** sebagai identity utama (OPTION B/C), atau cukup normalisasi (OPTION A)?
2. Apakah **siswa boleh mengganti sekolah sendiri**? Jika ya, dengan batasan apa (frekuensi, verifikasi guru, log)?
3. Apakah **guru boleh membuat School baru**? Langsung VERIFIED, atau butuh review founder/admin?
4. Siapa yang boleh **merge dua School**? (diusulkan: founder/ADMIN saja)
5. Apakah **alias boleh dibuat otomatis** dari setiap input user, atau hanya dari hasil review?
6. Berapa **threshold confidence untuk auto-match**? (diusulkan: EXACT/NORMALIZED auto; FUZZY review)
7. Apa yang dilakukan terhadap **ambiguous match**? (diusulkan: kandidat + "Maksud Anda?", atau auto PENDING)
8. Apakah **sekolah berbeda cabang** harus memiliki **School ID berbeda**? (mis. "Santa Laurensia" vs "Santa Laurensia Alam Sutera")
9. Apakah **nama sekolah lama** disimpan sebagai **alias** saat rename? (diusulkan: YA)
10. Apakah **data legacy `Profile.school`** dipertahankan selama masa migrasi? (diusulkan: YA, sebagai denormalized display)

---

## 17. P1-C Implementation Scope Proposal

**Fase 0 (INI) — selesai**: audit read-only, dokumen ini.

**Fase 1 — Data Baseline** (butuh DB access):
- Query read-only distribusi `Profile.school`: unique count, top 100, null rate, case/whitespace/punctuation variance.
- Bangun cluster kandidat: EXACT / NORMALIZATION / POSSIBLE / UNKNOWN.
- Hitung persentase ambiguous → pilih OPTION B vs C.

**Fase 2 — Schema & Seed**:
- Prisma `School` + `SchoolAlias` (add-only).
- Migration manual SQL idempotent.
- Seed script matching (dry-run default) → `Profile.schoolId` backfill.

**Fase 3 — Identity Layer**:
- `Profile.schoolId` nullable; resolve helper (normalize → alias lookup → create-pending).
- Form autocomplete; fallback create-pending.
- Guard: siapa boleh create/rename/merge sesuai policy founder.

**Fase 4 — Aggregation Rewire**:
- hasil-karya leaderboard → `GROUP BY schoolId`; scope "Sekolah Saya" → `schoolId` equality.
- gamification leaderboard SCHOOL → `schoolId` lookup (hapus full scan in-memory).
- admin analytics filter → canonicalName `contains` (opsional).
- `Profile.school` display tetap (denormalized).

**Fase 5 — QA**:
- Update/expand test scripts (guru-phase, gamification-engine, simulation-workflow).
- Build; leakage/permission tests tetap hijau.

---

## 18. OUT OF SCOPE

TIDAK termasuk (dan TIDAK dilakukan pada fase implementasi tanpa approval terpisah):
- Pembuatan School model/schema/migration/helper/API/UI pada Phase 0.
- Database write apa pun (insert/update/delete/migration).
- AI school matcher, fuzzy matcher otomatis, auto-correction, alias engine otomatis.
- Normalisasi string pada data existing (perbaikan data).
- Perubahan `Community.school`, `GeneratedRPP.schoolInfo`, `Loker.sekolah` (di luar identity pengguna).
- Game server revival, TKA enrichment, GameRoom migration, P1-B follow-ups, dan seluruh backlog lain yang sudah tercatat di AGENTS.md.
- Commit/push apa pun pada Phase 0.

---

## Lampiran — Bukti Kunci

| Claim | Bukti |
|-------|-------|
| Tidak ada School model | `rg "model School" prisma scripts` → 0 |
| Tidak ada schoolId | `rg -ni "school.?id" prisma/schema.prisma` → 0 |
| School hanya di Profile | `Profile.school String?` (schema L323); `Community.school` (L113); `GeneratedRPP.schoolInfo` (L731); `Loker.sekolah` (L1153) |
| Free text tanpa autocomplete | `register/page.tsx` L266-272 `<input type="text">` |
| PATCH tanpa normalize | `app/api/user/profile/route.ts` L62 `profileData = { bio, school, city, province }` |
| Agregasi raw case-sensitive | `hasil-karya/leaderboard` L147 `schoolMap.get(school)`; L97 `===` |
| Leaderboard gamification SCHOOL `===` | `lib/gamification/leaderboard.ts` L87 |
| Admin filter `contains insensitive` | `admin/analytics/dashboard` L100 |
| Komunitas school orphan | `GET /api/komunitas` tanpa filter school (L14-22) |
| DB read-only unavailable | `.env.local` → `DATABASE_URL="[SENSITIVE]"` |
