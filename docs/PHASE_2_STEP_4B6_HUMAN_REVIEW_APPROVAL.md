# PHASE 2 STEP 4B.6 — HUMAN REVIEW APPROVAL REPORT (Part P)

> **EXECUTION NOTE (Aug 15, 2026):** script approval ini TIDAK dijalankan oleh
> agent/task ini — HASILNYA ADALAH SETELAH FOUNDER MENGEKSEKUSINYA SENDIRI di
> mesinnya: `--execute --founder-email dominikus.02@gmail.com --batch BATCH-1/2/3`
> → **75/75 record di-APPROVED & materialized ke QuestionMetadata production**
> (status=APPROVED, provenance=HUMAN_REVIEW, reviewedById founder), dalam 3 batch
> × 25 record dalam SATU transaksi masing-masing. Audit JSONL 75 baris tertulis:
> `data/question-metadata/enrichment-approval-audit-001.jsonl`. `npm run report:enrichment-manifest`
> kini menampilkan `REVIEW STATE (audit): APPROVED=75` + reviewer + timestamp.
> Catatan: `reviews.json` (contoh REJECT) tetap ada di root tapi TIDAK dipakai
> karena `--actions` tidak di-pass saat execute → semua kandidat APPROVE.

## 1. Ringkasan

STEP 4B.6 membangun **Controlled Human Review & Approval Gate** untuk 75
kandidat enrichment AI_SUGGESTED (`data/question-metadata/enrichment-manifest-001.json`).
Gate siap pakai oleh founder/associate: approve/reject/correct-then-approve
per record, batch maks 25, transaksional, audit JSONL per record, idempoten,
tanpa approve-all, tanpa akses kunci jawaban.

## 2. Yang Dibuat

| File | Peran |
|------|-------|
| `docs/PHASE_2_STEP_4B6_HUMAN_REVIEW_AUDIT.md` | Audit Part A: current flow 3J, perbedaan desain (materialize vs update), keamanan, rencana, protected zones, target gate |
| `scripts/approve-enrichment-manifest.ts` | Gate approval (BARU). Mode: dry-run default / `--execute` wajib + `--founder-email` + `--batch BATCH-1..3` / `--actions reviews.json` / `--sql` cadangan |
| `scripts/report-enrichment-manifest.ts` | Report 4B.5 diperpanjang Part H: overlay state review (APPROVED/REJECTED/PENDING + reviewer + timestamp + reason) dari `enrichment-approval-audit-001.jsonl` — tetap READ-ONLY tanpa DB |
| `scripts/test-enrichment-approval.ts` | 18 skenario QA Part L (SEMUA LULUS) |
| `scripts/test-enrichment-report.ts` | Ditambah seksi REVIEW STATE + baris `review:` per kandidat (SEMUA LULUS) |
| `data/question-metadata/enrichment-batch-1-review.txt` | Part N: report review deterministik BATCH-1 (25 record) untuk inspeksi founder — tanpa approval |
| `package.json` | + `approve:enrichment-manifest`, `test:enrichment-approval` (4B/4B.5 scripts tetap) |

## 3. Desain Gate (ringkas)

1. **Reviewer identity server-side**: `--founder-email` wajib pada `--execute`;
   user diverifikasi ada dan `isFounder == true` atau `role == "ADMIN"`.
   `reviewedById` = id user DB tersebut. Tidak ada identity dari klien.
2. **3 outcome** (via `--actions file.json` opsional): `APPROVE` (default),
   `REJECT` (+reason), `CORRECT_THEN_APPROVE` (koreksi whitelist 7 field
   kanonikal: skill, subskill, difficulty, questionType, topic, cefr,
   confidence). `questionId`/`source`/teks/kunci jawaban **immutable** —
   field itu di payload koreksi → record di-REJECT.
3. **Batch maks 25**: `BATCH-1`(1–25) / `BATCH-2`(26–50) / `BATCH-3`(51–75).
   Tidak ada approve-all. Batch lain → exit 1.
4. **Transactional**: seluruh batch dalam SATU `$transaction`. Pre-flight:
   Soal.kodeSoal harus ada, QuestionMetadata (source,questionId) belum ada
   (APPROVED → ALREADY_APPROVED idempoten; ada status lain → CONFLICT →
   **rollback seluruh batch, ZERO writes, audit tidak ditulis**). Insert gagal
   (constraint/koneksi) → rollback penuh.
5. **Audit**: 1 baris JSONL per record di
   `data/question-metadata/enrichment-approval-audit-001.jsonl` berisi
   manifestId, batch, action, questionId, performedBy*, timestamp, before,
   after, reason. Tanpa secret — tanpa kunci jawaban.
6. **Manifest tidak pernah diubah**: determinisme batu; state approval hidup
   di audit JSONL + DB.
7. **Jalur cadangan `--sql`**: INSERT idempotent (`ON CONFLICT ... DO NOTHING`)
   untuk Supabase SQL Editor ketika DB tidak tersedia.

## 4. Perbedaan dengan Gate 3J (ditemukan di audit, bukan perubahan)

| Dimensi | 3J (review-manifest) | 4B.6 (enrichment-manifest) |
|---------|----------------------|----------------------------|
| Rekor di DB | SUDAH ADA (30 seed SQL) | BELUM ADA → materialize (INSERT) |
| Operasi | `updateMany` status | `create` dalam transaksi |
| Model keputusan | APPROVE saja | APPROVE / REJECT / CORRECT_THEN_APPROVE |
| Batch | 1 × 12 | 3 × 25 |
| Audit | 1 baris ringkasan | 1 baris PER RECORD (granular) |
| Manifest | tidak diubah | tidak diubah |

Alasan: 75 kandidat enrichment belum pernah di-materialize ke QuestionMetadata
(0 record, dibuktikan `check-enrichment-candidates.ts`). Gate 4B.6 karenanya
melakukan materialize+approve atomik (INSERT dengan status akhir APPROVED +
provenance HUMAN_REVIEW + reviewedById) — setara secara kontrak dengan 3J,
namun tanpa fase seed manual.

## 5. Verifikasi (semua jalur QA)

| Check | Hasil |
|-------|-------|
| `npm run test:enrichment-approval` | ✅ SEMUA LULUS (18 skenario) |
| `npm run test:enrichment-report` | ✅ SEMUA LULUS (seksi REVIEW STATE + overlay) |
| `npm run check:enrichment-candidates` | ✅ SEMUA CHECK PASS (17/17) |
| `npm run test:question-metadata` | ✅ 24/24 |
| `npm run test:learner-state` | ✅ 24/24 |
| `npm run test:adaptive-practice` | ✅ 25/25 |
| `npm run test:adaptive-simulation` | ✅ 21/21 |
| `npm run test:step3b-foundation` | ✅ 28/28 |
| `npm run test:step3c-evidence` | ✅ 29/29 |
| `npm run test:my-day-home` | ✅ 37/37 |
| `npm run test:student-home` | ✅ 61/61 |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint` (4 file diubah/baru) | ✅ 0 violations |
| `npm run build` (dummy env) | ✅ Compiled successfully |
| `git diff --check` | ✅ bersih |
| Dry-run BATCH-1/2/3 | ✅ 25 record per batch, 0 konflik, DATABASE WRITES 0 |
| `--batch` invalid / `--execute` tanpa email | ✅ exit 1 (ditolak) |

## 6. Gate Akhir

| Gate | Target | Status |
|------|--------|--------|
| HUMAN REVIEW CONTRACT | GREEN | ✅ (APPROVED+HUMAN_REVIEW saja yang adaptive-ready) |
| APPROVAL SECURITY | GREEN | ✅ (founder/admin server-side, immutability, tanpa klien) |
| TRANSACTION SAFETY | GREEN | ✅ ($transaction, rollback penuh, ZERO partial write) |
| AUDITABILITY | GREEN | ✅ (JSONL per record, before/after, tanpa secret) |
| REPORT READ-ONLY | GREEN | ✅ (hash manifest & audit tidak berubah) |
| METADATA COVERAGE | **YELLOW** | ⚠️ (tetap YELLOW — 13 sel INSUFFICIENT belum diisi, jangan pernah GREEN) |
| ADAPTIVE READINESS | GREEN | ✅ (gate materiil: engine siap dikonsumsi saat APPROVED ada) |

## 7. Cara Pakai oleh Founder

```bash
# 1. Inspeksi kandidat (read-only, tanpa DB)
npm run report:enrichment-manifest

# 2. Inspeksi rencana batch (dry-run, tanpa menulis)
npm run approve:enrichment-manifest -- --batch BATCH-1

# 3. Keputusan per-record (opsional) — mis. REJECT 2 soal, koreksi 1 soal
cat > reviews.json <<'EOF'
{
  "BC-IDE-POKOK-0002": { "action": "REJECT", "reason": "duplikat topik dengan …" },
  "BC-EJAAN-XXXX": { "action": "CORRECT_THEN_APPROVE", "corrections": { "difficulty": "MEDIUM", "cefr": "A2" } }
}
EOF

# 4. Approval EKSPLISIT (hanya batch ini, maks 25)
npm run approve:enrichment-manifest -- --execute --founder-email anda@email.com --batch BATCH-1 --actions reviews.json

# 5. Ulangi untuk BATCH-2 (26–50) dan BATCH-3 (51–75); lalu report untuk verifikasi overlay
npm run report:enrichment-manifest
```

## 8. Protected Zones & Non-Changes

- 0 diff di: `prisma/`, `app/api/`, `lib/gamification/`, `lib/learning-loop/`,
  `engines/`, `lib/coins.ts`, `lib/award-xp.ts`, artefak 3J, manifest
  enrichment (dibaca saja), produk UI/social/payment.
- Tidak ada produk baru, reward, premium, API route baru untuk engine.
- Tidak ada satu pun `--execute` dijalankan — DB produksi TIDAK disentuh
  oleh fase ini.

## 9. Sisa Pekerjaan (tidak berubah)

1. Founder mereview `data/question-metadata/enrichment-batch-1-review.txt`
   lalu, bila setuju, jalankan `--execute` per batch (petunjuk §7).
2. TKA UTBK/Guru enrichment 30 → 150
3. Game server revival (VPS mati)
4. GameRoom migration SQL via Supabase dashboard
5. UI game solo: badge-score client vs server masih beda (kosmetik)
6. SQL `2026-08-02_no_absen.sql` & `2026-08-08_school_identity.sql` (Production + Preview)