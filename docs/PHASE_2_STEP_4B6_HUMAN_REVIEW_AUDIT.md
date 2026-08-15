# PHASE 2 STEP 4B.6 — HUMAN REVIEW AUDIT (Part A)

> Dokumen audit ini adalah hasil PEMERIKSAAN (Part A) sebelum implementasi
> approval gate enrichment (Part B–K). Belum ada implementasi, belum ada
> approval production, belum ada commit/push.

## 1. Ringkasan

STEP 4B.6 membangun **Controlled Human Review & Approval Gate** untuk 75
kandidat enrichment AI_SUGGESTED (`data/question-metadata/enrichment-manifest-001.json`).
Hanya record yang di-approve founder/admin (status=`APPROVED`,
provenance=`HUMAN_REVIEW`) yang boleh masuk pool adaptive — engine adaptive
tidak berubah dan tidak disentuh fase ini.

## 2. Current Flow (yang diaudit)

### 2.1 Rantai artefak yang ada

| Artefak | Peran |
|---------|-------|
| `scripts/enrichment-candidates-builder.ts` | Deterministik; 75 kandidat dari 1410 soal berkode scorable; `--write` menulis manifest |
| `data/question-metadata/enrichment-manifest-001.json` | 75 records: source=BANK_SOAL, questionId=kodeSoal, expectedSkill, expectedDifficulty, expectedTopic, subskill, questionType, provenance=AI_SUGGESTED, status=NEEDS_REVIEW, confidence, warnings[], evidence{kelas,isHOTS,textLength,textPreview≤90} |
| `scripts/check-enrichment-candidates.ts` | READ-ONLY QA: struktur, taksonomi, sel 15×5, soal ada di Soal, 0 duplikat metadata, tanpa kebocoran jawaban (17/17 PASS) |
| `scripts/report-enrichment-manifest.ts` | READ-ONLY, TANPA DB: laporan review manusia (group SKILL→DIFFICULTY, [01]..[75], teks dari `evidence.textPreview`, anomali, exit 0) |

### 2.2 Infrastruktur approval 3J yang direuse

| File | Peran & pelajaran |
|------|-------------------|
| `scripts/approve-metadata-review-manifest.ts` | Pola: `--dry-run` default (READ-ONLY, DATABASE WRITES=0), `--execute` wajib + `--founder-email` (wajib, diverifikasi server-side: user ada & (`isFounder` ∥ role=ADMIN)), jalur cadangan `--sql`, `$transaction` + `updateMany` concurrency-safe (`WHERE status='NEEDS_REVIEW'`), abort audit bila `affected != ready`, audit append JSONL. **Penting**: modusnya UPDATE record yang SUDAH ADA di DB (30 record 3J di-seed via SQL manual) |
| `data/question-metadata/approval-audit-001.jsonl` | Konvensi audit 3J: 1 baris JSONL per run (manifestId, performedBy*, timestamp, affected, questionIds). 1 baris ada (12 APPROVED, founder dominikus.02@gmail.com) |
| `lib/question-metadata/taxonomy.ts` | SSOT kanonik v1.0: `SKILLS`/`SUBSKILLS` = **object/Record** (bukan array — jangan di-iterate), `DIFFICULTIES`/`QUESTION_TYPES`/`CEFR_LEVELS`/`PROVENANCE`/`CONFIDENCE`/`METADATA_STATUSES` = array; helper `hasSkill`/`hasSubskill`; `METADATA_SOURCES` = JALUR_CERDAS/BANK_SOAL/LATIHAN/GAME (UKBI/TKA tidak boleh) |
| `lib/question-metadata/validation.ts` | `validateQuestionMetadata` — APPROVED wajib HUMAN_REVIEW/EMPIRICAL; AI_ASSISTED tidak boleh APPROVED |
| `prisma/schema.prisma` model `QuestionMetadata` | id, source, questionId, skill?, subskill?, difficulty? (enum Difficulty), level?, topic?, questionType, cefr?, provenance, confidence, status(@default DRAFT — string), taxonomyVersion, metadataVersion, createdById?, reviewedById?, createdAt, updatedAt; `@@unique([source, questionId])`; relation User |
| `scripts/report-metadata-review-manifest.ts` | Laporan 3J: DB-read (opsional; "DATABASE READ-ONLY UNAVAILABLE" exit 0 tanpa DB) |
| `scripts/_env.ts` | `loadScriptEnv()`: `.env.db.local` lebih dulu (menang atas `[SENSITIVE]`), lalu `.env.local` |

### 2.3 Fakta DB (4A/4B audit)

- `QuestionMetadata` berisi **30 record** (12 APPROVED via gate 3J + 18 NEEDS_REVIEW dari seed sample) — SEMUANYA ber-questionId yang TIDAK ada di 75 kandidat.
- **0 dari 75 questionId kandidat enrichment punya record QuestionMetadata** (dibuktikan `check-enrichment-candidates.ts` cs. 6: "tidak ada questionId yang sudah ber-metadata").
- Konsekuensi desain: gate 3J (UPDATE record existing) **TIDAK bisa dipakai apa adanya** untuk enrichment — tidak ada record untuk di-UPDATE. Gate 4B.6 harus **materialize** record baru (INSERT) dalam transaksi yang sama dengan approval.

## 3. Perbedaan Desain Kunci (wajib diketahui reviewer)

| Dimensi | Gate 3J (review-manifest) | Gate 4B.6 (enrichment-manifest) |
|---------|---------------------------|----------------------------------|
| Rekor di DB | SUDAH ADA (30 seed) | **BELUM ADA (0)** → materialize |
| Operasi DB | `updateMany` status | `create` (INSERT, upsert-on-conflict dilarang) |
| Sumber kandidat | review-manifest-001.json | enrichment-manifest-001.json |
| Cakupan record | 12 | 75 (batch maks 25) |
| Model keputusan | APPROVE saja | APPROVE / REJECT / CORRECT-THEN-APPROVE |
| Batch | 1 × 12 | 3 × 25 (BATCH-1/2/3) |
| Audit per record | 1 baris rata-rata 12 id | 1 baris JSONL PER RECORD (granular, sebelum/sesudah + reason) |
| Manifest diubah? | Tidak | **Tidak — determinisme batu** (state approval hidup di audit JSONL + DB, bukan di manifest) |

## 4. Perubahan yang Diperlukan (rencana implementasi B–K)

### 4.1 `scripts/approve-enrichment-manifest.ts` (BARU — extender pola 3J)

CLI:
```
npm run approve:enrichment-manifest -- --dry-run                  # default: read-only
npm run approve:enrichment-manifest -- --execute \
     --founder-email <EMAIL> --batch BATCH-1 [--actions reviews.json]
```

- `--batch` = `BATCH-1` (indeks 1..25 manifest, urutan tetap), `BATCH-2` (26..50), `BATCH-3` (51..75). Diluar itu → exit 1. Maks 25 per eksekusi; TIDAK ADA approve-all.
- Tanpa `--execute` → READ-ONLY: validasi per record, cetak ringkasan, `DATABASE WRITES : 0`.
- `--execute` wajib + `--founder-email` (verifikasi server-side: user ditemukan & (isFounder ∥ ADMIN)); jika DB tidak reachable → cetak `--sql` cadangan (idempotent INSERT) + exit 0.
- `--actions <file.json>` opsional, per-record keputusan:
  ```json
  {
    "BC-IDE-POKOK-XXXX": { "action": "REJECT", "reason": "topik salah" },
    "BC-EJAAN-XXXX": {
      "action": "CORRECT_THEN_APPROVE",
      "corrections": { "skill": "GRAMMAR", "subskill": "GRAMMAR_EJAAN", "difficulty": "EASY", "topic": "Ejaan", "questionType": "PILIHAN_GANDA", "cefr": "A2", "confidence": "HIGH" }
    }
  }
  ```
  Tanpa file → semua record batch = APPROVE default. Field koreksi whitelist: `skill`, `subskill`, `difficulty`, `questionType`, `topic`, `cefr`, `confidence`. `questionId`/`source`/teks soal/kunci jawaban TIDAK bisa diubah (kalau ada di payload → abort/REJECT rekor itu).
- Validasi per record (server-side, semua input klien tidak dipercaya):
  1. Record ada di manifest batch dengan status NEEDS_REVIEW & provenance AI_SUGGESTED.
  2. `Soal.kodeSoal` benar-benar ada (required).
  3. `QuestionMetadata (source,questionId)` TIDAK boleh sudah ada: jika ada & APPROVED → `SKIPPED` idempoten (no-op, audit action=ALREADY_APPROVED); jika ada & bukan APPROVED → REJECT rekor (conflict, audit action=CONFLICT).
  4. Field final (manifest ± koreksi) lolos `validateQuestionMetadata` dengan status=APPROVED, provenance=HUMAN_REVIEW; subskill harus valid untuk skill parent.
- **Transactional (per batch)**: `prisma.$transaction` — susunan: validasi penuh → INSERT semua record batch (materialize + approve dalam satu aksi) → bila SATU saja gagal (constraint, validasi, koneksi) → **ROLLBACK seluruh batch, ZERO partial write**, audit TIDAK ditulis.
- Idempotensi: rerun batch yang sudah APPROVED → SKIPPED (tidak menggandakan, tidak crash).
- Larangan transisi: tidak ada jalur APPROVED→REJECTED/REJECTED→APPROVED (record yang sudah APPROVED tidak pernah di-REJECT; REJECT hanya untuk record NEEDS_REVIEW yang belum pernah di-approve).
- Tidak pernah membaca/menulis `correctAnswer`/`options` (anti-leakage).

### 4.2 Audit (Part G)

- File: `data/question-metadata/enrichment-approval-audit-001.jsonl` (BARU — terpisah dari `approval-audit-001.jsonl` 3J agar riwayat gate berbeda tidak bercampur).
- 1 baris JSONL PER RECORD:
  ```json
  {"manifestId":"enrichment-manifest-001","batch":"BATCH-1","action":"APPROVED|REJECTED|ALREADY_APPROVED|CONFLICT","questionId":"BC-...","performedByEmail":"...","performedById":"...","timestamp":"...","before":{...manifest record...},"after":{...final fields...}|null,"reason":"..."}|null}
  ```
- DILARANG: password, DATABASE_URL, kredensial, kunci jawaban, options.
- Hanya ditulis SETELAH transaksi batch berhasil (komit) — konsisten dengan 3J (abort audit bila affected mismatch).

### 4.3 Report diperpanjang (Part H — edit `scripts/report-enrichment-manifest.ts`)

- Tetap READ-ONLY & TANPA DB (pola 4B.5 dipertahankan; hash manifest tetap proof).
- Sumber state approval = **audit JSONL** (lokal): overlay per record → kolom `status review` (dari manifest: NEEDS_REVIEW/AI_SUGGESTED; dari audit: APPROVED/REJECTED + reviewer (email) + timestamp + reason untuk kecocokan questionId+batch).
- Format baru per kandidat:
  ```
  [NN] questionId skill subskill difficulty questionType topic cefr confidence provenance status(review) reviewer timestamp(reason)
  ```
- Ringkasan tambahan: APPROVED/REJECTED/PENDING counts per skill & difficulty.
- Garansi tetap: 0 insert/update/delete/approve; manifest & audit-file TIDAK diubah oleh report (hash-before==hash-after di test).

### 4.4 Test (Part L — `scripts/test-enrichment-approval.ts` BARU)

18 kasus (detail di §6) + rerun suite regresi.

### 4.5 npm scripts (package.json)

```
"approve:enrichment-manifest": "npx tsx scripts/approve-enrichment-manifest.ts",
"test:enrichment-approval": "npx tsx scripts/test-enrichment-approval.ts"
```

## 5. Keamanan & Batasan (hard rules fase ini)

1. Reviewer identity SELALU dari server session serupa 3J: email founder/admin diverifikasi DB saat `--execute`; `reviewedById` = id user DB tsb. Tidak ada userId/reviewedById dari klien.
2. `source`, `questionId`, `provenance`, `status` akhir TIDAK pernah diterima dari klien — semuanya diturunkan dari manifest + koreksi whitelist + transisi yang diizinkan.
3. Soal harus benar-benar ada di `Soal.kodeSoal` sebelum materialize.
4. Batch maks 25; tidak ada approve-all; tidak ada mode yang meng-approve SELURUH manifest.
5. Rollback penuh bila satu record batch gagal; tanpa partial write.
6. Tidak ada akses kunci jawaban di seluruh rangkaian (approve/report/test).
7. Manifest TIDAK pernah diubah oleh approval (determinisme dipertahankan; state approval tersimpan DI AUDIT JSONL + DB).
8. Engine adaptive, reward, produk social/payment, gamification — **DI LUAR SCOPE**; tidak ada bidang `isAdaptiveReady`/produk baru.
9. Tidak ada fabrikasi: VERY_HARD/LISTENING/SPEAKING tetap kosong (13 sel INSUFFICIENT dicatat, bukan diisi).

## 6. Rencana Test (18 kasus Part L) — `scripts/test-enrichment-approval.ts`

1. Script ada; shebang; possible flags; default dry-run.
2. Dry-run tanpa DB/execute → DATABASE WRITES: 0, exit 0, manifest hash tidak berubah.
3. `--execute` tanpa `--founder-email` → error & exit 1.
4. `--founder-email` user non-founder/non-ADMIN → approval ditolak (exit 1).
5. Record batch 25: source=BANK_SOAL, status NEEDS_REVIEW, provenance AI_SUGGESTED, confidence valid.
6. `--batch` invalid (BATCH-4/9) → exit 1; `BATCH-1..3` diterima (3×25 = 75).
7. Semua questionId batch ada di manifest & unik.
8. Setiap record: corrections whitelist hanya 7 field kanonikal; questionId di payload koreksi → REJECT rekor.
9. Field koreksi invalid taxonomy (skill/subskill mismatch, difficulty bukan enum, questionType bukan enum, cefr di luar A1..C2, confidence di luar HIGH/MEDIUM/LOW) → REJECT rekor.
10. Record tidak bisa menembus dengan status/provenance dari klien (selalu diturunkan server: APPROVED + HUMAN_REVIEW).
11. `--actions` file tidak ada → default APPROVE untuk seluruh batch (bukan approve-all — batas 25 tetap).
12. Transaksi: kegagalan satu record (mis. soal tidak ada) → seluruh batch rollback, audit tidak ditulis (logic test; DB opsional).
13. Idempoten: record yang sudah APPROVED (simulasi via audit ALREADY_APPROVED) → SKIPPED, tanpa double-insert.
14. Audit JSONL: 1 baris per record; memuat manifestId/batch/questionId/action/performedBy*/timestamp/before/after; TIDAK memuat password/DATABASE_URL/correctAnswer/options/jawaban.
15. Report: per record menampilkan status review APPROVED/REJECTED + reviewer + timestamp (+reason bila ada) dari overlay audit; masih READ-ONLY (hash audit + manifest sebelum==sesudah).
16. Report: 75 record tetap; PENDING = belum ada baris audit untuk batch tsb.
17. Gate kontrak: hanya APPROVED + HUMAN_REVIEW yang boleh "adaptive-ready" (periksa filter di file engine konsumen — pola `status === "APPROVED"`); YELLOW (bukan GREEN) untuk METADATA COVERAGE.
18. Protected zones: 0 diff di prisma/, lib/gamification/, lib/learning-loop/, engines/, app/api/, product UI.

## 7. Protected Zones (TIDAK BOLEH DIUBAH fase ini)

- `prisma/schema.prisma` (+ migration)
- `lib/gamification/*`, `lib/learning-loop/*`, `lib/adaptive/*` (bila ada), `lib/coins.ts`, `lib/award-xp.ts`
- `app/api/*` (kecuali read-only report yang TIDAK ada)
- Engine adaptive & candidate pool consumer — hanya DIBAWA status yang sama
- File 3J (`approve-metadata-review-manifest.ts`, review-manifest-001, approval-audit-001.jsonl) — hanya dibaca
- Manifest enrichment — hanya dibaca oleh semua alat baru

## 8. Verifikasi Akhir (target)

| Gate | Target |
|------|--------|
| HUMAN REVIEW CONTRACT | GREEN |
| APPROVAL SECURITY | GREEN |
| TRANSACTION SAFETY | GREEN |
| AUDITABILITY | GREEN |
| REPORT READ-ONLY | GREEN |
| METADATA COVERAGE | **YELLOW** (jangan pernah GREEN) |
| ADAPTIVE READINESS | GREEN |
| tsc / lint / build / diff check | 0 error |

Status implementasi: **BELUM DIMULAI** — dokumen ini adalah hasil audit.