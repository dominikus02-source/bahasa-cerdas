# PHASE 2 — STEP 4B: METADATA ENRICHMENT (PILOT CORPUS ~140 BERTARGET, JURIDIS 75)

> Status: **DELIVERABLES SIAP — approval TIDAK dieksekusi di step ini**
> Tgl: 15 Agustus 2026 · DB: Supabase production (pooler via `.env.db.local`)

---

## 1. Ringkasan

| Metrik | Nilai |
|---|---|
| Target (dok pengarah) | ~140 soal (7 skill × 4 difficulty × min 5) |
| Kandidat manifest (`enrichment-manifest-001.json`) | **75** (15 sel × 5) |
| Sel terisi | 15/28 |
| Sel `INSUFFICIENT_CORPUS` (jujur kosong) | 13: VERY_HARD (5 skill) + LISTENING (4) + SPEAKING (4) |
| Caplokan sumber | Soal berkode (kodeSoal) BANK_SOAL: 1.500 (dari 1.595) |
| Status kandidat | `NEEDS_REVIEW` · Provenance `AI_SUGGESTED` |
| Approval | **BELUM dieksekusi** (desain di §6) |

**Kenapa 75 bukan 140?** Bank tidak mendefinisikan `VERY_HARD` (semua `SULIT/HOTS` dipetakan ke `HARD`), tidak punya soal simakan/audio (LISTENING), dan topik Pidato hanya soal identifikasi materi (bukan tugas berbicara → SPEAKING tidak bisa diisi tanpa fabrikasi). Sel kosong didokumentasikan, tidak dipaksa isi. Ini sesuai prinsip **never fabricate, never force** — dan mencegah metadata palsu meracuni LearnerState (evidence APPROVED hanya boleh dari metadata sah).

## 2. Kontributor Artefak

| File | Peran |
|---|---|
| `scripts/enrichment-candidates-builder.ts` | Bangun kandidat DETERMINISTIK (read-only DB) → manifest JSON |
| `data/question-metadata/enrichment-manifest-001.json` | Manifest 75 record (NEEDS_REVIEW / AI_SUGGESTED) |
| `scripts/check-enrichment-candidates.ts` | QA read-only (17 check: struktur, taksonomi, leakage, DB cross-check) |
| `docs/PHASE_2_STEP_4B_CORPUS_AUDIT.md` | Audit corpus (matrix 7×4, statistik, keputusan kelayakan) |
| `docs/PHASE_2_STEP_4B_METADATA_ENRICHMENT.md` | Dokumen ini — pipeline & desain approval |
| `package.json` | `build:enrichment-manifest`, `build:enrichment-manifest:dry-run`, `check:enrichment-candidates` |

## 3. Pipeline (Phase A–G) dan Status

| Phase | Deliverable | Status |
|---|---|---|
| A. Audit corpus | Matrix 7×4 + statistik + keputusan kelayakan | ✅ DONE (read-only) |
| B. Kandidat deterministik | `enrichment-candidates-builder.ts` + manifest | ✅ Built (75) |
| C. Review tooling (Baca-saja) | Builder dry-run + manifest itu sendiri (questionId, topik, preview, confidence, warnings) | ✅ |
| D. Quality gate | Aturan kualitas di §5 — kandidat LOLOS filtrasi whitelist/taxonomy | ✅ |
| E. Approval | Desain §6 — **TIDAK dieksekusi** (butuh founder) | ⏸ Dipajak founder |
| F. Checker | `check-enrichment-candidates.ts` — ALL PASS | ✅ |
| G. Manifest final | 75 record ditulis ke repo (data/question-metadata/) | ✅ (belum commit/push) |
| H. QA regresi | §7 — semua suite + build | ✅ (Tabel §7) |

## 4. Keputusan Kelayakan (dari audit — lihat CORPUS_AUDIT §5)

1. Hanya soal BERKODE (`kodeSoal`) → kontrak `(source, questionId)` aman.
2. Hanya `PILIHAN_GANDA`/`BENAR_SALAH`/`ISIAN_SINGKAT` (auto-score). `ISIAN`/`ESSAY` (20) dikeluarkan.
3. Pemetaan difficulty terbukti: `MUDAH→EASY`, `SEDANG→MEDIUM`, `SULIT→HARD`, `MEDIUM→MEDIUM`, `HARD→HARD`.
4. `VERY_HARD` tidak didefinisikan bank → seluruh sel `INSUFFICIENT` (tidak memetakan SULIT dua-tahap).
5. LISTENING & SPEAKING tidak punya sumber sah di bank → sel kosong jujur.
6. Topik dinormalisasi (casing/spasi) agar whitelist deterministik.
7. Soal yang SUDAH punya `QuestionMetadata` (30, status apa pun: 12 APPROVED + 18 NEEDS_REVIEW) DIEKSKLUSI dari manifest — tidak ada klasifikasi ganda.
8. Pemilihan lintas topik round-robin (diversity), urut `kodeSoal` asc → reproducible: rerun builder → records identik (verified, hanya `generatedAt` beda).

## 5. Aturan Kualitas (Phase D) — dikunci di builder

| Aturan | Implementasi |
|---|---|
| Skill ambigu → TIDAK masuk | Whitelist topik→(skill,subskill) kanonik; topik di luar whitelist dibuang (termasuk Anekdot, Pidato untuk SPEAKING) |
| Difficulty tidak didukung → TIDAK masuk | Bank tidak mendefinisikan VERY_HARD → sel kosong |
| Bentuk soal tidak auto-score → TIDAK masuk | ISIAN/ESSAY dibuang |
| Duplikat klasifikasi → TIDAK masuk | Soal ber-metadata dieksklusi; duplikat questionId di-mustahilkan (assert) |
| Konten tidak cukup → warning | `warnings`: `BOILERPLATE_STEM` (stems generik), `SHORT_TEXT` (<30 char), `DUPLICATE_STEM` (stem sama dalam sel) — informasi REVIEW, bukan blocker |
| Taksonomi kanonik | Semua subskill divalidasi via `hasSubskill()` sebelum ditulis |
| No answer leakage | Manifest hanya: questionId, topic, subskill, type, difficulty, preview ≤90 char — TANPA options/correctAnswer/explanation (diverifikasi checker) |
| Determinisme | Sortir stabil lexicographic + kodeSoal; rerun → identik |

**Confidence (deterministik):** `HIGH` untuk PILIHAN_GANDA dengan text ≥15, `MEDIUM` untuk ISIAN_SINGKAT, `LOW` jika text <15.

## 6. DESAIN APPROVAL — `approve:enrichment-manifest` (TIDAK dieksekusi)

> Desain command approval, mengikuti pola `approve:metadata-manifest` (STEP 3J). **Belum dibuat script-nya** — eksekusi ditunda sampai founder menyetujui review manifest. Ini sengaja: approval = tindakan tulis DB, hanya atas arahan founder.

### Spesifikasi yang akan diimplementasikan (bila founder menyetujui)

| Item | Nilai |
|---|---|
| Script | `scripts/approve-enrichment-manifest.ts` (baru; mengikuti pola `approve-metadata-review-manifest.ts`) |
| Perintah | `npm run approve:enrichment-manifest -- [--dry-run] [--execute] [--founder-email <email>] [--max-batch <N>]` |
| Status sebelum | `NEEDS_REVIEW` saja |
| Status setelah | `APPROVED` · provenance → `HUMAN_REVIEW` (provenanceBefore `AI_SUGGESTED` diperiksa) |
| Otorisasi | Founder/Admin (`isFounder`/ADMIN) + email founder eksplisit (`--founder-email`), DIVERIFIKASI ke tabel User |
| Batch | **maks 50 per eksekusi** (75 kandidat → 2 batch: 50 + 25) |
| Transaksional | `$transaction` per batch; gagal → rollback penuh batch, audit tetap dicatat |
| Idempotent | Record sudah APPROVED di-skip (tidak pernah overwrite) |
| Prasyarat | `requireSoalExists` (questionId ada di Soal), `expectationMustMatch` (skill/difficulty/topic/taxonomy cocok dengan manifest), taksonomi valid |
| Audit | Append `data/question-metadata/approval-audit-002.jsonl` — satu baris JSON per record (userId, questionId, before→after, ts, batchId) |
| Anti-kebocoran | Tidak pernah membaca/menulis `correctAnswer`/`options`; log tidak berisi jawaban |
| Safety | `--execute` HANYA dengan `--founder-email`; tanpa `--execute` = dry-run penuh (rencana dulu, tidak menulis) |

**Alur eksekusi yang disarankan (menunggu arahan founder):**
1. Founder review `data/question-metadata/enrichment-manifest-001.json` (75 record; preview teks + confidence + warnings per record).
2. Founder menjalankan batch 1: `npm run approve:enrichment-manifest -- --execute --founder-email <email> --max-batch 50`.
3. Founder menjalankan batch 2 (sisa 25).
4. Verifikasi: `check:candidate-pool` dan `audit:step4a-schema` — coverage matrix bertambah.

## 7. Verifikasi (Phase H)

| Check | Hasil |
|---|---|
| `npm run build:enrichment-manifest:dry-run` | ✅ 75 kandidat, 15 sel, 13 INSUFFICIENT |
| `npm run build:enrichment-manifest` + rerun | ✅ deterministik (records identik; hanya generatedAt beda) |
| `npm run check:enrichment-candidates` | ✅ **17/17 PASS** (termasuk DB cross-check: 75/75 kodeSoal ada, 0 sudah ber-metadata) |
| Leakage | ✅ 0 (options/correctAnswer/jawaban tak ada di manifest) |
| `npm run test:question-metadata` | ✅ 24/24 |
| `npm run test:learner-state` | ✅ 24/24 |
| `npm run test:adaptive-practice` | ✅ 25/25 |
| `npm run test:step3c-evidence` | ✅ 29/29 |
| `npm run audit:step4a-schema` | ✅ GREEN/GREEN/YELLOW/GREEN (REGREEN — belum berubah) |
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (3 file baru) | ✅ 0 violations |
| `npm run build` (dummy env) | ✅ Compiled, exit 0 |
| `git diff --check` | ✅ bersih |

## 8. Gate Akhir

| Gate | Status |
|---|---|
| METADATA CORPUS | 🟡 YELLOW — 75 kandidat AI_SUGGESTED siap review; 13 sel jujur INSUFFICIENT (target ~140 belum penuh) |
| QUALITY | 🟢 GREEN — taksonomi valid, no leakage, deterministik, warnings transparan |
| PRODUCTION SAFETY | 🟢 GREEN — read-only audit; approval belum dieksekusi; tidak ada tulis DB |
| ADAPTIVE READINESS | 🟢 GREEN — korpus ini (bila APPROVED) akan mengaktifkan sel EASY/MEDIUM/HARD untuk 5 skill |

## 9. Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| 13 sel kosong (VERY_HARD/LISTENING/SPEAKING) | Didokumentasikan; enrichment masa depan (bank audio + constructed response) mengisi |
| Konten bank dominan boilerplate | `warnings` per record; founder dapat REJECTED per record saat approval |
| 95 soal AI tanpa kode | Tidak bisa jadi kandidat karena kontrak `(source, questionId)`; dokumentasikan agar tidak hilang |
| Snapshot DB berubah antar rerun | Builder deterministik, tapi konten DB bisa berubah → manifest harus di-regenerate hanya saat kontrak audit kembali |
| Approval keliru | Batch ≤50, dry-run default, audit JSONL, founder email eksplisit, idempotent |

## 10. Next Steps (menunggu arahan founder)

1. **Founder review manifest** (75 record) — lalu arahkan untuk menjalankan approval (2 batch, `--execute`).
2. Setelah APPROVED: `check:candidate-pool` + `audit:step4a-schema` menunjukkan coverage hijau untuk 15 sel.
3. Enrichment lanjutan: bank audio (LISTENING), constructed response (SPEAKING), level VERY_HARD (fitur HOTS tertinggi).
4. **Belum ada commit/push** — 4B menunggu instruksi, mengikuti pola 3J/4A.