# P1-C Phase 3 — Controlled Backfill `Profile.schoolId`

## 1. Tujuan

Menerapkan **controlled backfill** `Profile.schoolId` (kolom identity baru, nullable)
menggunakan evidence kuat yang dapat diaudit — me-reuse pure matching engine Phase 2.
Prioritas: **data safety > false-positive prevention > auditability > coverage**.
Berhenti total setelah laporan (tanpa commit/push/`--apply` otomatis).

Phase 3 TIDAK menyentuh: `Profile.school` (legacy), fuzzy, AI/LLM, auto-merge School,
auto-create School/SchoolAlias, authorization, API/UI, P1 lain.

## 2. Prinsip (ABSOLUT)

1. **LEGACY DATA IS IMMUTABLE** — `Profile.school` tidak pernah diubah/dihapus/di-rename.
2. **`schoolId` adalah identity layer terpisah** — hanya diisi bila bukti kuat.
3. **Output NULL > salah sekolah** — tidak ada tebakan.
4. **Semua evidence grup aktif dievaluasi** — dilarang `groups[0]`, `take: 1`, `orderBy` lalu
   pilih pertama. Hanya `Group.isActive = true` yang dihitung.
5. **Existing `schoolId` tidak pernah ditimpa** — `ALREADY_CANONICAL` / `CONFLICTING_EVIDENCE`.
6. **Penerapan (apply) HANYA eksplisit** via `--apply`; default read-only.
7. **Concurrency-safe** — update pakai `WHERE id = <id> AND schoolId IS NULL`.
8. **`schoolId` bukan authorization** — tidak pernah dipakai untuk akses/peran.
9. **Tidak ada auto-create/merge School/SchoolAlias, tidak ada fuzzy/AI/LLM.**
10. **Tanpa DB → tidak ada angka yang dikarang** (`DATABASE READ-ONLY UNAVAILABLE`).

## 3. Kasus Keputusan (CASE A–F)

| Case | Kondisi | Keputusan | Confidence | Set? |
|------|---------|-----------|------------|------|
| **A** | `Profile.school` cocok dengan alias terverifikasi unik | `ALIAS_MATCH` | HIGH | ✅ SET |
| **B** | `normalizeSchoolName(Profile.school)` cocok persis dengan `School.normalizedName` unik | `NORMALIZED_EXACT` | HIGH | ✅ SET |
| **C** | `school` null/belum resolve + semua evidence grup aktif konsisten → satu sekolah guru ter-resolve | `GROUP_EVIDENCE_BACKFILL` | MEDIUM | ✅ SET |
| **D** | Konflik/ambiguitas (grup→sekolah beda, duplikat normalizedName, alias tabrakan) | `AMBIGUOUS_*` | AMBIGUOUS | ❌ NULL |
| **E** | `schoolId` sudah terisi (atau bertentangan dengan evidence grup) | `ALREADY_CANONICAL` / `CONFLICTING_EVIDENCE` | ALREADY_CANONICAL | ❌ TIDAK diubah |
| **F** | Tanpa bukti cukup / kontekstual L1 | `UNRESOLVED` / `NO_FALSE_INFERENCE` | UNRESOLVED | ❌ NULL |

Ringkasan: hanya CASE A/B/C yang `safeToApply=true`.

## 4. Hierarki Bukti (diwarisi dari Phase 2)

`L5 EXPLICIT → L4 VERIFIED ALIAS → L3 NORMALIZED EXACT → L2 GROUP → L1 CONTEXTUAL → L0 UNRESOLVED`.
Lihat `docs/P1_C_SCHOOL_IDENTITY_PHASE2.md` §4 untuk detail.

## 5. Backfill Engine (`lib/school/backfill.ts`)

**MURNI (pure)**: tidak mengimpor Prisma, tidak membaca/menulis DB, tidak ada
`create/update/upsert/delete`. Konsumsi (bukan salinan) helper Phase 2:
`matchStudentSchool`, `resolveGroupEvidence`, `findPotentialDuplicateSchools`,
`normalizeSchoolName`.

Keluaran per profil = keputusan yang dapat diaudit:

```ts
interface BackfillDecision {
  profileId: string;
  previousSchoolId: string | null;
  proposedSchoolId: string | null;
  decision: string;          // ALREADY_CANONICAL | NORMALIZED_EXACT | ALIAS_MATCH |
                             // GROUP_EVIDENCE_BACKFILL | AMBIGUOUS_* | CONFLICTING_EVIDENCE | UNRESOLVED ...
  confidence: ConfidenceLevel;
  case: BackfillCase;        // CASE_A .. CASE_F
  source: BackfillSource;    // STUDENT_SCHOOL | GROUP_EVIDENCE | EXPLICIT | NONE
  evidenceLevel: EvidenceLevel;
  safeToApply: boolean;
  conflicting: boolean;
  reason: string;            // penjelasan Bahasa Indonesia
  candidateName: string | null;
  groupEvidenceQuality: GroupEvidenceQuality;
}
```

`summarizeBackfill(decisions, schools)` menghasilkan ringkasan agregat:
`totalProfiles / alreadyCanonical / normalizedExact / aliasMatch / groupEvidence /
ambiguous / conflicting / unresolved / safeToBackfill / requiresReview /
remainingUnresolved / catalogConflicts` + breakdown per-School
(normalized exact / alias / group evidence).

## 6. CLI (`scripts/school-backfill.ts`)

- **Default = READ-ONLY** (`npm run dry-run:school-backfill`): hanya `findMany`.
- **`--apply` eksplisit** (`npm run backfill:school`): menerapkan HANYA keputusan
  `safeToApply` dengan:
  - predicate `WHERE id = <profileId> AND schoolId IS NULL` (concurrency-safe;
    affected rows 0 = sudah terisi proses lain → skip),
  - batch kecil (`APPLY_BATCH_SIZE = 25`),
  - perhitungan affected rows, tanpa `updateMany({})`.
- Tanpa DB → `DATABASE READ-ONLY UNAVAILABLE` + exit 0 (tidak ada statistik dikarang).

## 7. Sumber Data

- `School` (kanonik) + `SchoolAlias` (alias terverifikasi) — Phase 1.
- Murid `User.role = "MURID"` + `Profile.school`/`Profile.schoolId`.
- `GroupMember.group.isActive` + `Group.teacher.profile.school` (sekolah guru
  sebagai bukti grup).

## 8. Keamanan

- `schoolId` TIDAK pernah dipakai untuk authorization (SSOT `lib/teacher/students.ts`).
- Hanya `Profile.schoolId` yang ditulis — `Profile.school` tidak pernah diubah.
- Tidak ada `School.create/update/upsert/delete`, tidak ada `SchoolAlias.create`,
  tidak ada merge/auto-alias/auto-create.
- Update tunggal di CLI: `updateMany({ where: { id, schoolId: null }, data: { schoolId } })`
  di dalam cabang `if (apply)`.

## 9. Skrip & File

| File | Fungsi |
|------|--------|
| `lib/school/backfill.ts` | Engine keputusan backfill (murni, auditable) |
| `scripts/school-backfill.ts` | CLI dry-run / `--apply` (read-only default) |
| `scripts/test-school-backfill.ts` | 93 asersi (TEST 1–20 + extras), tanpa DB |
| `package.json` | +`test:school-backfill`, +`dry-run:school-backfill`, +`backfill:school` |
| `docs/P1_C_SCHOOL_IDENTITY_PHASE3.md` | Dokumen ini |

## 10. Cara Menjalankan

```bash
# Tes (tanpa DB)
npm run test:school-backfill

# Dry-run read-only
npm run dry-run:school-backfill

# Apply — EKSPLISIT, hanya setelah founder meninjau dry-run
npm run backfill:school
```

## 11. Hasil Tes (93/93, tanpa DB)

- TEST 1 — existing schoolId tidak pernah ditimpa (`ALREADY_CANONICAL`)
- TEST 2 — engine murni (tanpa method tulis, tanpa import Prisma; `Profile.school` tak diubah)
- TEST 3 — normalized exact unik → CASE B, HIGH, safe
- TEST 4 — alias unik → CASE A, HIGH, safe
- TEST 5 — group evidence konsisten → CASE C, MEDIUM, safe
- TEST 6 — group evidence konflik → AMBIGUOUS_GROUP_EVIDENCE, NULL
- TEST 7 — grup inactive diabaikan → UNRESOLVED
- TEST 8 — SEMUA grup aktif dievaluasi (3 grup sama → resolve; konflik tak bias)
- TEST 9 — anti first-group bias (tanpa `groups[0]`/`take: 1` di engine & CLI)
- TEST 10 — normalizedName duplikat → AMBIGUOUS_CANONICAL, tidak aman
- TEST 11 — alias tabrakan → AMBIGUOUS_ALIAS, tidak aman
- TEST 12 — tidak ada auto-create/merge School/SchoolAlias (engine & CLI)
- TEST 13 — tidak ada fuzzy/AI/LLM di jalur backfill
- TEST 14 — `schoolId` tidak pernah dipakai authorization (SSOT students.ts)
- TEST 15 — apply concurrency-safe (`WHERE schoolId IS NULL`)
- TEST 16 — dry-run default = zero writes (update hanya di cabang `--apply`)
- TEST 17 — CONFLICTING_EVIDENCE: existing schoolId vs evidence grup beda → tidak di-overwrite
- TEST 18 — konteks multi-sekolah guru: campur ter-resolve + tak ter-resolve
- TEST 19 — NULL / empty / whitespace school + tanpa grup → UNRESOLVED
- TEST 20 — NFC + summary per-school benar

## 12. Verifikasi QA

| Check | Hasil |
|-------|-------|
| `npm run test:school-backfill` | ✅ 93/93 |
| `npm run test:school-identity` | ✅ SEMUA LULUS |
| `npm run test:school-matching` | ✅ 56/56 |
| `npm run test:guru-phase` | ✅ SEMUA LULUS |
| `npm run test:gamification-engine` | ✅ SEMUA LULUS |
| `npm run test:simulation-workflow` | ✅ All passed |
| `npx tsx scripts/test-phase-simulation-workflow.ts` | ✅ All passed |
| `npx prisma validate` | ✅ Valid |
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (backfill.ts, CLI, test) | ✅ 0 violations |
| `npm run build` (dummy env) | ✅ exit 0 (359 routes) |

## 13. Static Security

- `rg "schoolId" app lib scripts` → hanya teks assertion/console (TIDAK ada pemakaian
  authorization).
- `rg "\.(create|update|upsert|delete|deleteMany|updateMany)\(" lib/school scripts/...`
  → satu-satunya tulis: `db.profile.updateMany` (CLI, cabang `--apply`, predicate
  `schoolId: null`). NONE untuk delete/deleteMany/upsert School / update Profile.school.

## 14. Batasan & Catatan

1. **DB production TIDAK tersedia** di lingkungan kerja ini — `.env.local` berisi
   `DATABASE_URL` placeholder `[SENSITIVE]`. Semua unit/static test tetap jalan;
   dry-run CLI menampilkan `DATABASE READ-ONLY UNAVAILABLE`.
2. **`--apply` TIDAK dijalankan otomatis** — wajib menunggu approval founder atas
   policy (CASE A/B/C) sebelum `npm run backfill:school`.
3. Tabel `School`/`SchoolAlias` kosong sampai migrasi `2026-08-08_school_identity.sql`
   dijalankan di Supabase SQL Editor — sampai itu, semua resolusi = GROUP/UNRESOLVED.
4. **Tidak ada `--apply` otomatis, tidak ada commit/push** dalam fase ini.

## 15. Status DB Saat Ini

```
DATABASE READ-ONLY UNAVAILABLE
Alasan : nilai DATABASE_URL adalah placeholder '[SENSITIVE]' (env di-mask).
(Tidak ada statistik yang dihasilkan — data tidak dibaca.)
P1-C PHASE 3 DRY-RUN : ABORTED (DB tidak tersedia)
```

Tidak ada angka dry-run aktual yang dihasilkan sesi ini (DB tidak bisa dibaca).
Begitu akses DB tersedia, jalankan `npm run dry-run:school-backfill` lalu tinjau
`SAFE TO BACKFILL / REQUIRES REVIEW / REMAINING UNRESOLVED` sebelum apply.

## 16. File yang Berubah (Phase 3)

- `lib/school/backfill.ts` (baru)
- `scripts/school-backfill.ts` (baru)
- `scripts/test-school-backfill.ts` (baru)
- `package.json` (+3 script)
- `docs/P1_C_SCHOOL_IDENTITY_PHASE3.md` (ini)
- `AGENTS.md` (status fase ini)

## 17. Keputusan Desain

1. **Engine murni terpisah dari CLI** — logika keputusan bisa diuji tanpa DB dan
   dipakai ulang di fase lain; DB I/O hanya di CLI.
2. **Reuse Phase 2, bukan duplikasi** — `decideBackfill` memanggil
   `matchStudentSchool`/`resolveGroupEvidence` (satu-satunya sumber hierarki bukti).
3. **`safeToApply` sebagai satu pintu** — CLI hanya memproses keputusan
   `safeToApply && proposedSchoolId`; semua sisanya hanya dilaporkan.
4. **Update predicate `schoolId IS NULL`** — idempotent & concurrency-safe; affected
   rows 0 berarti sudah terisi oleh proses lain.
5. **`CONFLICTING_EVIDENCE` dihitung terpisah** dari `ALREADY_CANONICAL` — guru bisa
   melihat kapan evidence grup bertentangan dengan schoolId existing (untuk review).

## 18. Risiko & Mitigasi

| Risiko | Mitigasi |
|--------|----------|
| Salah sekolah di CASE C (grup) | Hanya MEDIUM; `--apply` eksplisit; report per-school; ambiguitas → NULL |
| Group evidence bias grup pertama | Semua grup aktif dievaluasi (Set atas semua resolve) |
| Overwrite schoolId proses lain | Predicate `WHERE schoolId IS NULL` |
| Duplikat katalog School | `AMBIGUOUS_CANONICAL` + `catalogConflicts` flag review |
| Typo guru → sekolah keliru | Tidak ada fuzzy; tak ter-resolve → NULL |

## 19. Batas Fase (JANGAN dikerjakan di sini)

Fuzzy/AI/LLM, koreksi typo, rewrite `Profile.school`, merge School, auto-alias,
admin UI, autocomplete, impor direktori, leaderboard/analitik/"Sekolah Saya" migration,
`Group.schoolId`, `TeacherSchool`, `SchoolIdentityEvidence`, UI confidence/review,
redesign authorization, P1-D, P1-E.

## 20. Status

- Phase 3 engine + CLI + tes + dokumentasi: **SELESAI**.
- `DATABASE WRITES : 0` (dry-run; `--apply` tidak dijalankan — menunggu approval).
- QA gates: SEMUA LULUS (lihat §12).
- STOP. Tanpa commit/push; tanpa Phase 4; `Profile.school` tidak diubah.
