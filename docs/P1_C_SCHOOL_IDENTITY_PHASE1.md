# P1-C Phase 1 — Canonical School Identity Foundation

**Tanggal**: 8 Agustus 2026
**Mode**: ADDITIVE ONLY. Tidak ada perubahan destruktif, tidak ada backfill, tidak ada auto-merge/fuzzy, tidak ada koreksi data massal, tidak ada perubahan agregasi legacy, tidak ada commit/push.
**Migration**: `prisma/migrations/manual/2026-08-08_school_identity.sql` — **WAJIB dijalankan user di Supabase SQL Editor (PRODUCTION dulu, PREVIEW menyusul).**

---

## 1. Objective

Membangun fondasi identitas sekolah kanonik:

```
RAW USER INPUT          +  STRUCTURAL RELATIONSHIP EVIDENCE  +  EXPLICIT CANONICAL MAPPING
         ↓                          ↓                                    ↓
        Profile.school     Teacher → Group → GroupMember → Student      School / SchoolAlias
         ↓                          ↓                                    ↓
                                   ↘           CANONICAL SCHOOL IDENTITY (Profile.schoolId)            ↗
```

Fondasi ini memungkinkan fase berikutnya menyimpulkan sekolah murid dari beberapa sinyal yang dipercaya — TANPA mengubah `Profile.school`. Phase 1 TIDAK otomatis menetapkan identitas ke user mana pun.

## 2. Baseline

Repositori divalidasi ulang terhadap `docs/P1_C_SCHOOL_IDENTITY_AUDIT.md` — TIDAK ada perbedaan material:

| Aspek | Temuan |
|-------|--------|
| Data model | `Profile.school String?` — satu-satunya identitas sekolah (free text) |
| School model | NONE |
| SchoolAlias model | NONE |
| Profile.schoolId | NONE |
| Group → teacher | `Group.teacherId → User` (schema) |
| Group → member | `GroupMember.groupId/userId → Group/User`, `@@unique([groupId,userId])` |
| Sumber sekolah guru/murid | `Profile.school` (register.ts + PATCH /api/user/profile) |
| Agregasi sekolah saat ini | raw string case-sensitive (`===`, `Map.get`, `contains insensitive`) |
| Normalisasi | NONE (hanya HTML-escape di register) |
| DB access | UNAVAILABLE (env masking) |

## 3. Mengapa Profile.school Tidak Cukup

- Satu string bebas yang sama dipakai sebagai *display*, *grouping key agregasi publik*, dan *filter admin* dengan 3 strategi pembandingan berbeda (`===`, raw Map key, `contains insensitive`).
- Setiap variasi penulisan ("SMP Harapan Bangsa" vs "smp harapan bangsa ") berpotensi menjadi bucket terpisah → DUPLICATE IDENTITY RISK.
- Tanpa identitas stabil, rename sekolah merusak seluruh agregasi historis; cabang tidak bisa dibedakan; tidak ada mekanisme merge yang aman.
- Nama sekolah dapat dipalsukan dan dipakai untuk leaderboard gaming (lihat audit §13.1). Phase 1 tidak menyelesaikan ini; ia menyediakan *tempat* identitas yang bisa diverifikasi.

## 4. Arsitektur Kanonik School

### Model `School`

| Field | Tipe | Catatan |
|-------|------|---------|
| `id` | `String @id @default(cuid())` | Konvensi ID proyek |
| `canonicalName` | `String` | Nama resmi yang ditampilkan |
| `normalizedName` | `String` | Representasi deterministik untuk lookup/index |
| `province` | `String?` | Opsional |
| `city` | `String?` | Opsional |
| `isActive` | `Boolean @default(true)` | Nonaktif = bukan hapus |
| `createdAt` / `updatedAt` | `DateTime` | Standar |

Index: `normalizedName`, `city`, `province`.

### Model `SchoolAlias`

| Field | Tipe | Catatan |
|-------|------|---------|
| `id` | `String @id @default(cuid())` | |
| `schoolId` | `String` | FK → `School.id`, `onDelete: Cascade` |
| `alias` | `String` | Variasi nama yang diperbolehkan |
| `normalizedAlias` | `String` | `@@unique` — satu alias normalisasi TIDAK boleh menunjuk >1 sekolah |
| `createdAt` / `updatedAt` | `DateTime` | |

### Model `Profile` (+1 kolom, TIDAK ada yang dihapus)

- `school String?` — **DI-PERTAHANKAN** (nilai mentah user, display backward-compat).
- `schoolId String?` — **BARU, nullable** (identitas kanonik; NULL = belum dipetakan).
- Relasi `schoolRef School? @relation(... onDelete: SetNull)` — menghapus School tidak pernah menghancurkan Profile.

**Dual identity disengaja**:

```
Profile.school  = legacy/raw user-entered value  (display)
Profile.schoolId = canonical identity             (agregasi fase 2+)
```

## 5. SchoolAlias

- Alias bersifat **eksplisit** — dibuat lewat keputusan (bukan auto-generate dari seluruh `Profile.school`).
- `normalizedAlias` UNIQUE di level DB → satu alias ternormalisasi tidak pernah menunjuk ke dua sekolah (aturan §6.2 audit).
- Contoh yang sama-sama bisa menunjuk `SCH_001` setelah keputusan mapping: `SMP HARAPAN BANGSA`, `Smp Harapan Bangsa`, `SMP Harapan Bangsa `.

## 6. Profile.schoolId

- Nullable; semua baris existing tetap `NULL` (TANPA backfill).
- `Profile.school = "SMP HARAPAN BANGSA"` tetap bekerja walaupun `schoolId = null`.
- Tidak pernah menjadi *required*.

## 7. Evidence: Teacher → Group → GroupMember → Student

Struktur yang diperlukan untuk jalur inferensi masa depan **SUDAH ADA dan TIDAK diubah**:

```
User (teacher) ── teacherId ──→ Group ── members ──→ GroupMember ── userId ──→ User (student) ── profile ──→ Profile.schoolId
```

- `Group.teacherId → User` (L1355 schema).
- `GroupMember.groupId → Group`, `userId → User`, `@@unique([groupId,userId])`.
- SSOT `lib/teacher/students.ts` tetap memakai `Group.teacherId` + `GroupMember` untuk ownership — TIDAK melibatkan `schoolId`.

Phase 1 TIDAK menetapkan `schoolId` siapa pun dari relasi ini; ia hanya memastikan arsitektur TIDAK menghalangi inferensi masa depan.

## 8. Pertimbangan Guru Multi-Sekolah

- `User.schoolId` **TIDAK dibuat** — guru boleh mengajar di banyak sekolah.
- `TeacherSchool` **TIDAK dibuat** — tidak ada mekanisme eksplisit saat ini; jalur struktural (`Group → teacher → Profile` / future `Group.schoolId`) sudah cukup dan tidak menduplikasi konsep.
- Model yang tepat (jika nanti diperlukan) adalah relasi eksplisit Teacher↔School ATAU `Group.schoolId`, bukan satu kolom `User.schoolId`.

## 9. Normalisasi

Satu helper deterministik: `lib/school/normalize.ts` → `normalizeSchoolName()`.

```
ALLOW  : trim, kolaps spasi berulang, Unicode NFC, lowercase
DO NOT : hapus tipe (SMP/SMA/Sekolah), hapus lokasi/kota/provinsi, hapus penanda
         cabang, hilangkan tanda baca agresif, singkatan, terjemahan, inferensi,
         fuzzy-match, auto-merge
```

Contoh: `normalizeSchoolName("  SMP   HARAPAN   BANGSA  ")` → `"smp harapan bangsa"`.

Normalisasi **untuk perbandingan/lookup saja** — TIDAK pernah menimpa `Profile.school`, tidak dipakai di write path (register/PATCH tetap menulis nilai mentah).

## 10. Hirarki Evidence (masa depan, TIDAK diimplementasikan Phase 1)

| Level | Sumber | Otomatis? |
|-------|--------|-----------|
| 5 | Assignmen kanonik eksplisit (Admin/Founder) | Manual |
| 4 | Keanggotaan Group yang diasosiasikan ke School | Setelah Group.schoolId ada |
| 3 | Relasi teacher↔school terverifikasi + group milik teacher | Setelah TeacherSchool ada |
| 2 | `Profile.school` cocok dengan `SchoolAlias` terverifikasi | Setelah alias engine |
| 1 | `normalized(Profile.school) == normalized(School.canonicalName)` | Setelah matching |
| 0 | Fuzzy candidate → CANDIDATE (bukan truth) | FUTURE — dilarang |

## 11. Pelestarian Data

- `Profile.school` tidak dihapus/diubah/renamed.
- Tidak ada `UPDATE Profile`, tidak ada backfill, tidak ada auto-merge.
- School canonical hanya dibuat lewat proses eksplisit yang dipercaya (belum ada data).
- `onDelete: SetNull` pada `Profile.schoolId` — penghapusan School (yang tidak dilakukan) tetap menjaga Profile.

## 12. Keamanan Migration

- Migration idempoten (`IF NOT EXISTS` / `DO $$ EXCEPTION`).
- Sebelum: `Profile.school = "SMP HARAPAN BANGSA"`, tanpa kolom `schoolId`.
- Sesudah: `Profile.school = "SMP HARAPAN BANGSA"`, `schoolId = NULL`.
- Tidak ada data identitas yang dihancurkan.

## 13. Batasan Authorization

**School identity BUKAN authorization.** Tidak ada relasi `schoolId` ke model privat (Nilai/Quiz/Submission/GameResult/TestAnswer/StudentKarya). Otorisasi tetap:

```
teacherId / creatorId / group membership / ownership / SSOT (isTeacherOrStudent)
```

`schoolId === X` TIDAK pernah membuka akses ke nilai, kuis, submission, profil murid, data guru, kelas privat, atau dokumen privat.

## 14. Tests

`scripts/test-school-identity.ts` (43 assertions, tanpa DB) — `npm run test:school-identity`.

| # | Test | Hasil |
|---|------|-------|
| 1 | Migration preserves Profile.school | PASS |
| 2 | Profile.schoolId nullable | PASS |
| 3 | Canonical identity independen dari Profile.school | PASS |
| 4 | SchoolAlias milik tepat satu School | PASS |
| 5 | Alias ternormalisasi tidak menunjuk >1 sekolah | PASS |
| 6 | Normalisasi deterministik | PASS |
| 7 | Normalisasi tidak memutasi Profile.school | PASS |
| 8 | Group/GroupMember tetap valid | PASS |
| 9 | School identity tidak bypass authorization | PASS |
| 10 | schoolId=null tidak merusak flow | PASS |
| 11 | Mendukung School → Group → GroupMember → Student | PASS |
| 12 | Guru multi-konteks tanpa schoolId global | PASS |
| 13 | Tidak ada fuzzy matching | PASS |
| 14 | Tidak ada auto-merge sekolah | PASS |

## 15. QA

| Gate | Hasil |
|------|-------|
| `npx prisma validate` | ✅ Valid |
| `npx prisma generate` | ✅ Generated |
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (lib/school/normalize.ts, scripts/test-school-identity.ts) | ✅ 0 violations |
| `npm run test:school-identity` | ✅ SEMUA LULUS |
| `npm run test:guru-phase` | ✅ SEMUA LULUS |
| `npm run test:gamification-engine` | ✅ SEMUA LULUS |
| `npm run test:simulation-workflow` | ✅ 65/65 |
| `npx tsx scripts/test-phase-simulation-workflow.ts` | ✅ 65/65 |
| `npm run build` (dummy env) | ✅ 359 routes, 0 errors |

Klasifikasi kegagalan: TIDAK ADA kegagalan baru/pre-existing/environment.

## 16. Pekerjaan yang Sengaja Ditunda (Phase 2+)

- Fuzzy matching sekolah (candidate ≠ truth).
- AI school matching.
- Koreksi typo otomatis.
- Auto-merge sekolah.
- Mass backfill `schoolId`.
- Import directory sekolah.
- Admin school management UI.
- Workflow verifikasi sekolah + UI confidence/review.
- Migrasi agregasi: hasil-karya leaderboard, gamification SCHOOL scope, admin analytics, "Sekolah Saya", school analytics, school leaderboard, public school statistics.
- Form autocomplete / create-pending dari UI.
- Alias engine otomatis.
- `Group.schoolId`, `TeacherSchool`, `SchoolIdentityEvidence` (keputusan dokumentasi di §7–8).

## 17. Rekomendasi Phase 2

Diajukan **hanya setelah approval founder** (lihat 10 policy questions audit §16):

1. **Akses DB read-only** → query distribusi `Profile.school` (unique count, top 100, null rate, variasi case/whitespace) sebagai baseline data nyata.
2. **Matching batch** (dry-run default): EXACT → NORMALIZED → kandidat manual → review manusia untuk POSSIBLE/UNKNOWN.
3. **Mapping awal** `School` + `SchoolAlias` dari hasil review, `Profile.schoolId` backfill hanya untuk match EXACT/NORMALIZED yang disetujui.
4. **Identity layer** (resolve helper + autocomplete + create-pending) setelah mekanisme guard siapa boleh buat/rename/merge sesuai policy founder.
5. **Migrasi agregasi** satu per satu (hasil-karya → gamification → admin) dengan `GROUP BY schoolId`.
6. Buka **OPTION C** (confidence + review workflow) bila data nyata menunjukkan >5% ambiguous duplicate.
