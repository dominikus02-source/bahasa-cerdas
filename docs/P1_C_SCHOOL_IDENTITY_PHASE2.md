# P1-C Phase 2 — School Identity Matching & Evidence Engine

**Status**: COMPLETE (READ-ONLY / DRY-RUN)
**Tanggal**: 2026-08-08
**DATABASE WRITES**: 0

---

## 1. Tujuan

Fase ini membangun mesin pencarian identitas sekolah (school identity **matching**) yang
membaca data murid + grup + sekolah guru yang SUDAH ADA, lalu menghasilkan **kandidat**
sekolah kanonik (School) per murid — TANPA mengubah satu baris pun di database.

Ini adalah langkah sebelum backfill: hasil dry-run menjadi bahan keputusan founder tentang
cara mengisi `Profile.schoolId` (Phase 3) dengan bukti, bukan tebakan.

## 2. Prinsip (ABSOLUT)

1. **READ-ONLY**: tidak ada `create/update/delete/upsert/updateMany/deleteMany` di engine,
   skrip, atau tes. `DATABASE WRITES : 0`.
2. **Candidate-only**: keluaran mesin hanyalah kandidat + tingkat bukti + confidence.
   Tidak ada `Profile.schoolId` yang diisi otomatis.
3. **Tidak membuat data**: tidak ada auto-create `School`, `SchoolAlias`, merge, atau backfill.
4. **Satu helper normalisasi**: hanya `normalizeSchoolName` di `lib/school/normalize.ts`.
5. **TANPA fuzzy**: tidak ada Levenshtein/Jaro-Winkler/cosine/embeddings/AI/LLM/tebakan typo.
6. **school ≠ authorization**: `schoolId` tidak pernah dipakai untuk akses/otentikasi.
7. **DB tidak tersedia → laporan jujur**: dry-run menampilkan `DATABASE READ-ONLY UNAVAILABLE`,
   tidak mengarang statistik.

## 3. Phase 2A — Data Access Audit (READ)

| # | Sumber | Field yang dibaca | Tujuan | Trust | Tersedia |
|---|--------|-------------------|--------|-------|----------|
| 1 | `Profile.school` (murid) | teks mentah | LEVEL 4/3 lookup | LOW | ya |
| 2 | `Profile.schoolId` (murid) | FK eksplisit | LEVEL 5 EXPLICIT | HIGH | ya |
| 3 | `GroupMember` | (grupId, userId) | cakupan grup murid | HIGH | ya |
| 4 | `Group.isActive` | boolean | hanya grup aktif | HIGH | ya |
| 5 | `Group.teacherId` → `User` → `Profile.school` | sekolah guru | LEVEL 2 bukti grup | MEDIUM | ya |
| 6 | `School` | id, canonicalName, normalizedName, isActive | kandidat kanonik | HIGH | ya (butuh migrasi P1-C Phase 1) |
| 7 | `SchoolAlias` | schoolId, normalizedAlias | LEVEL 4 alias | HIGH | ya (butuh migrasi P1-C Phase 1) |

Sumber 6–7 hanya ada bila migrasi `2026-08-08_school_identity.sql` sudah dijalankan di
Supabase SQL Editor. Tanpa migrasi, tabel kosong → semua murid masuk LEVEL 0/1/2.

## 4. Hierarki Bukti (Evidence Levels)

| Level | Nama | Sumber | Decision | Confidence |
|-------|------|--------|----------|------------|
| 5 | EXPLICIT | `Profile.schoolId` terisi | `ALREADY_CANONICAL` | ALREADY_CANONICAL |
| 4 | VERIFIED ALIAS | `SchoolAlias.normalizedAlias` cocok unik | `ALIAS_MATCH` | HIGH_CONFIDENCE |
| 3 | NORMALIZED EXACT | `School.normalizedName` cocok unik | `NORMALIZED_EXACT` | HIGH_CONFIDENCE |
| 2 | CLASS/GROUP | grup aktif → sekolah guru ter-resolve | `CANDIDATE_ONLY` / `GROUP_EVIDENCE_CANDIDATE` | MEDIUM_CONFIDENCE |
| 1 | CONTEXTUAL | grup aktif → sekolah guru TIDAK ter-resolve | `GROUP_EVIDENCE_CANDIDATE` (nama saja) | LOW_CONFIDENCE |
| 0 | UNRESOLVED | tanpa bukti | `UNRESOLVED` | UNRESOLVED |

Aturan prioritas: LEVEL 5 > 4 > 3 > 2 > 1 > 0. Begitu satu level menghasilkan kandidat unik,
level di bawahnya tidak dipertimbangkan.

## 5. Model Confidence (transparan & dapat dijelaskan)

| Confidence | Syarat | Bisa dijelaskan? |
|------------|--------|------------------|
| `ALREADY_CANONICAL` | `schoolId` sudah terisi | ya — FK eksplisit |
| `HIGH_CONFIDENCE` | alias unik (L4) ATAU normalizedName unik (L3) | ya — cocok deterministik |
| `MEDIUM_CONFIDENCE` | sekolah guru konsisten (L2), candidate-only | ya — bukti grup |
| `LOW_CONFIDENCE` | hanya nama kontekstual, tidak ter-resolve (L1) | ya — sekolah guru mentah |
| `AMBIGUOUS` | alias/normalizedName/grup >1 | ya — nama konflik dicatat |
| `UNRESOLVED` | tidak ada bukti | ya — level 0 |

Tidak ada confidence "rahasia". Setiap nilai output dapat dijelaskan dari input.

## 6. Kasus Inferensi Grup (A–E)

| Kasus | Kondisi | Hasil |
|-------|---------|-------|
| **A** | semua grup aktif → sekolah guru SAMA | `CANDIDATE_ONLY` / `GROUP_EVIDENCE_CANDIDATE`, MEDIUM |
| **B** | grup aktif → sekolah guru BEDA | `AMBIGUOUS_GROUP_EVIDENCE`, AMBIGUOUS, **NO AUTO MATCH** |
| **C** | `Profile.school` NULL + bukti grup | `CANDIDATE_ONLY`, MEDIUM |
| **D** | `Profile.school` cocok kanonik | `NORMALIZED_EXACT` / `ALIAS_MATCH`, HIGH |
| **E** | `Profile.school` tidak cocok + bukti grup | `GROUP_EVIDENCE_CANDIDATE`, MEDIUM |

## 7. Keputusan (Decision Types)

| Decision | Arti |
|----------|------|
| `ALREADY_CANONICAL` | murid sudah punya `schoolId` (L5) |
| `ALIAS_MATCH` | nama legacy cocok alias terverifikasi (L4) |
| `NORMALIZED_EXACT` | nama legacy cocok nama kanonik (L3) |
| `CANDIDATE_ONLY` | sekolah kosong + bukti grup konsisten (L2, kasus C) |
| `GROUP_EVIDENCE_CANDIDATE` | bukti grup → kandidat (L2/L1, kasus A/E) |
| `AMBIGUOUS_ALIAS` | >1 alias sama (teoretis, DB `@@unique` cegah) |
| `AMBIGUOUS_CANONICAL` | >1 School dengan normalizedName sama |
| `AMBIGUOUS_GROUP_EVIDENCE` | grup menunjuk sekolah berbeda (kasus B) |
| `NO_FALSE_INFERENCE` | guru tanpa sekolah → TIDAK menebak |
| `UNRESOLVED` | level 0 |

## 8. Kualitas Bukti Grup (Group Evidence Quality)

| Quality | Makna |
|---------|-------|
| `SINGLE_GROUP` | satu grup aktif |
| `MULTI_SAME_SCHOOL` | >1 grup aktif → sekolah guru sama (kuat) |
| `MULTI_DIFFERENT_SCHOOL` | >1 grup aktif → sekolah guru beda (konflik) |
| `TEACHER_EMPTY` | semua guru tanpa sekolah → jangan menebak |
| `INACTIVE_ONLY` | hanya grup nonaktif → diabaikan |
| `NO_GROUP` | murid tidak di grup mana pun |

## 9. Deteksi Duplikat School (FLAG_FOR_REVIEW)

`findPotentialDuplicateSchools()` mengelompokkan School berdasar `normalizedName`.
Bila satu normalizedName dipakai >1 School (mis. "SDN Cemara 01" vs "SD NEGERI CEMARA 01"),
keduanya di-flag sebagai **POTENTIAL_DUPLICATE → FLAG_FOR_REVIEW**. Mesin TIDAK pernah
merge otomatis — keputusan penyatuan adalah keputusan founder (Phase 3+).

## 10. Skrip & File

| File | Peran |
|------|-------|
| `lib/school/matching.ts` | Engine murni (tanpa DB): match, resolve grup, summary, deteksi duplikat |
| `scripts/dry-run-school-matching.ts` | CLI READ-ONLY: baca DB → laporan kandidat + duplikat |
| `scripts/test-school-matching.ts` | 56 asersi, TEST 1–14, tanpa DB |
| `package.json` | `test:school-matching`, `dry-run:school-matching` |

## 11. Cara Menjalankan

```bash
# Tes engine (tanpa DB)
npm run test:school-matching

# Dry-run (READ-ONLY). Tanpa DB → "DATABASE READ-ONLY UNAVAILABLE"
npm run dry-run:school-matching
```

Setelah migrasi P1-C Phase 1 jalan di Supabase, dry-run membaca data riil dan
menampilkan distribusi evidence/confidence + potensi duplikat.

## 12. Keamanan

- Engine tidak mengimpor Prisma; tidak ada kode tulis di file Phase 2 (diverifikasi
  `rg "\.(create|update|upsert|delete|deleteMany|updateMany)\("` → 0 hasil).
- `schoolId` tidak pernah dipakai untuk authorization. SSOT `lib/teacher/students.ts`
  tidak membaca `school`/`schoolId` untuk akses (diverifikasi TEST 13).
- Dry-run script hanya `findMany` + `$queryRaw\`SELECT 1\`` (ping), tanpa kode tulis.

## 13. Verifikasi

| Check | Hasil |
|-------|-------|
| `npm run test:school-matching` | ✅ 56/56 (TEST 1–14) |
| `npm run test:school-identity` | ✅ SEMUA LULUS (regresi Phase 1) |
| `npm run test:guru-phase` | ✅ SEMUA LULUS |
| `npm run test:gamification-engine` | ✅ SEMUA LULUS |
| `npm run test:simulation-workflow` | ✅ 65/65 |
| `npx tsx scripts/test-phase-simulation-workflow.ts` | ✅ 65/65 |
| `npx prisma validate` | ✅ Valid |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint` (3 file Phase 2) | ✅ 0 violations |
| `npm run build` (dummy env) | ✅ 359 routes, exit 0 |
| Static security scan (write API) | ✅ 0 hasil |
| `npx tsx scripts/dry-run-school-matching.ts` | ✅ ABORTED jujur (DB env di-mask) |

## 14. Batasan & Catatan

1. **DB tidak dibaca** di lingkungan ini karena env di-mask (`[SENSITIVE]`). Dry-run
   sengaja keluar 0 dengan pesan jujur, bukan data karangan. Jalankan setelah
   `.env.db.local` punya DATABASE_URL asli (lihat `scripts/_env.ts`).
2. **Tabel School/SchoolAlias masih kosong** sampai migrasi P1-C Phase 1 dijalankan di
   Supabase SQL Editor. Tanpa itu, LEVEL 4/3 tidak bisa memproduksi kandidat.
3. `SchoolAlias.normalizedAlias` punya `@@unique` — `AMBIGUOUS_ALIAS` hanya defensif.
4. Sekolah guru adalah field teks (trust MEDIUM) — bukti grup = MEDIUM, bukan HIGH.
5. Fase ini TIDAK memutuskan backfill. Semua keputusan data menunggu review founder.

## 15. Langkah Berikutnya (belum dikerjakan, menunggu approval)

1. Founder meninjau output dry-run (distribusi evidence, potensi duplikat, kualitas grup).
2. Fase 3 (backfill) hanya setelah policy matching disetujui — mis. hanya level 5/4/3
   di-backfill otomatis, level 2 butuh konfirmasi, level 1/0 manual.
3. Opsional: kurasi daftar School kanonik + alias resmi (SD/SMP/SMA) sebagai data master.
