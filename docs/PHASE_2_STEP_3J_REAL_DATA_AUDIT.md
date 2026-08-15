# PHASE 2 STEP 3J — REAL-DATA ADAPTIVE PRACTICE AUDIT

Version: `1.0` · Date: Aug 15, 2026 · Branch: `main` · Status: AUDIT (kode) — REAL DATA UNVERIFIED (DB tidak dapat diakses dari mesin ini)

## TASK 1 — Audit jalur produksi nyata (rantai yang akan diverifikasi)

Rantai yang diverifikasi oleh STEP 3J (bukan produk baru; semua komponen sudah ada dari Step 3B–3I):

```
QUESTION (Soal.kodeSoal BC-*) → METADATA (QuestionMetadata APPOVED)
→ EVIDENCE (LearningEvidence) → LEARNER STATE (getLearnerState)
→ ADAPTIVE SELECTOR (selectAdaptivePractice) → PERSONALIZED PRACTICE (AdaptivePracticeSession)
→ NEW EVIDENCE → UPDATED LEARNER STATE
```

| # | Gate | Sumber kode | Status PADA AUDIT INI |
|---|------|-------------|-----------------------|
| 1 | Metadata hanya valid bila `status=APPROVED` + `skill` terisi + source `BANK_SOAL` | `app/api/player/adaptive-practice/route.ts` + `lib/question-metadata/validation.ts` | ✅ Fixture (test-question-metadata 24/24) |
| 2 | Mapping `questionId` ↔ `Soal.kodeSoal` (1500 kode `BC-*` di bank master) | sel. `db.soal.findMany({ where: { kodeSoal: { in } } })` | ⚠️ Isi DB production UNVERIFIED (env masked `[SENSITIVE]`) |
| 3 | Lemma: `text` + `options` array + `type` ternormalisasi cocok `questionType` | `normalizeSoalType` guard | ✅ Fixture |
| 4 | Selector deterministik (tanpa `Math.random()`, rotationKey server-side) | `lib/adaptive-practice/selector.ts` | ✅ Fixture (test-adaptive-practice 25/25) |
| 5 | Evidence retry-safe via upsert composite unique `userId_source_activityId_questionId` | `lib/learning-loop/evidence.ts` | ✅ Fixture (test-step3c-evidence) |
| 6 | Learner state agregasi murni baca; infra belum ada → 503/guard `P2021/P2022`, bukan crash | `lib/learner-state/service.ts` | ✅ Fixture (test-learner-state 24/24) |
| 7 | Sesi server-owned: IN_PROGRESS/COMPLETED, expiresAt 30 mnt, status guard updateMany | `app/api/player/adaptive-practice/route.ts` | ✅ Fixture |
| 8 | Reward belum di-wiring (XP/koin 0) — keputusan Step 3I “next implementation” | `completeSession` tanpa panggilan award | ✅ Disengaja (E2E mengunci = 0) |

**Batas yang dipertahankan (protected zones, 0 perubahan di STEP 3J):** `prisma/schema.prisma`, seluruh `app/api/*`, `lib/gamification/`, `lib/learning-loop/`, `lib/premium-economy/`, UKBI/TKA, ekosistem Student Home/My Day. STEP 3J hanya menambah: 1 file data (manifest), 4 script CLI (approval/report/check/E2E), package.json (4 script npm), 2 dokumen.

## TASK 2 — Desain approval terkontrol (menjawab larangan mass-approve)

| Aturan | Implementasi |
|--------|--------------|
| HANYA founder/ADMIN boleh approve | `scripts/approve-metadata-review-manifest.ts` memerlukan `--execute --founder-email <email>`; user wajib `isFounder` atau `role=ADMIN` |
| Tidak pernah `approve-all` | Manifest deterministik `data/question-metadata/review-manifest-001.json` = tepat **12 rekor** tetap |
| Hanya `NEEDS_REVIEW` → `APPROVED` | `updateMany({ where: { source, questionId, status: "NEEDS_REVIEW" } })`; rekor status lain ditolak |
| `questionId` tidak pernah diubah | Manifest mengunci `questionId`; drift skill/difficulty/topic vs DB → rekor **ditolak** (bukan dikoreksi) |
| Soal harus nyata ada | `Soal.findUnique({ where: { kodeSoal } })` per rekor; tanpa Soal → ditolak |
| Taxonomy pasca-APPROVED + provenance | Validator `validateQuestionMetadata({ ...row, status: "APPROVED", provenance: "HUMAN_REVIEW" })`; `AI_ASSISTED` tidak bisa auto-approve |
| Batas batch 15 | Manifest validasi `maxRecords: 12`; skrip menolak >15 |
| Audit trail | Append JSONL ke `data/question-metadata/approval-audit-001.jsonl` (email, id, timestamp, affected, questionIds) |
| Mode aman | Dry-run default (0 write); `--sql` mencetak SQL idempotent fallback untuk Supabase SQL Editor; high-risk cambio status dilindungi: `affected === ready.length` wajib, kalau tidak → tidak ada audit ditulis |

**Mengapa CLI founder-only dan bukan endpoint admin:** pola admin existing (`app/api/admin/question-metadata/route.ts`) adalah editor-only untuk CRUD; approval review paket kecil sekali waktu lebih aman sebagai operasi CLI eksplisit dengan audit file. Tidak ada endpoint publik baru (0 perubahan di `app/api/`).

## TASK 3 — Kontrol kualitas pendukung (read-only)

| Script | Fungsi | Menulis? |
|--------|--------|----------|
| `scripts/report-metadata-review-manifest.ts` | Laporan per rekor (soal.id, skill, subskill, difficulty, topic, type, cefr, status, mapping) + teks soal 110 char untuk cek mata manusia; exit 1 bila ada mismatch | ❌ read-only |
| `scripts/check-adaptive-candidate-pool.ts` | Matriks kandidat per skill × difficulty (ZERO/<1–4 INSUFFICIENT/≥5 HEALTHY), mengingatkan selector tidak menduplikasi soal demi mengisi sesi | ❌ read-only |
| `scripts/test-step3j-real-data.ts` | E2E rantai nyata (fase ZERO/A/B/C/D, keamanan statis, cleanup bukti baseline) | ✔ user uji deterministik, dibersihkan + baseline dibuktikan |

## TASK 4 — Keamanan (E2E mengunci)

1. Route adaptive tidak pernah membaca `body.userId`/`body.skillDelta`/`body.xp`/`body.coin`/`body.correctAnswer` (user dari sesi, scoring server-side dari tabel `Soal`).
2. Payload sesi tidak mengandung `correctAnswer`/`jawaban`.
3. Nilai kebenaran dari server (`Soal.correctAnswer`), bukan klien.
4. User uji `e2e.adaptive@bahasacerdas.local` (supabaseId `e2e-adaptive-test-user`, MURID) — deterministik, tidak menyentuh data user lain; cleanup membandingkan TOTAL `LearningEvidence` global kembali ke baseline (bukan sekadar “dihapus”).

## TASK 5 — Env & status jujur

- `.env.local` berisi 24 placeholder `[SENSITIVE]` (opencode me-mask); kredensial nyata ada di `.env.db.local` yang dimuat lewat `loadScriptEnv()` (dotenv tidak menimpa var yang sudah ada). KONEKSI DB di mesin saat ini: tidak tersedia.
- Semua script 3J: bila DB tak ada → cetak `UNVERIFIED`, exit 0 (tanpa mengarang angka). E2E memerlukan prasyarat 12 rekor APPROVED (bila belum → exit 1 dengan instruksi jelas, bukan hasil palsu).
- **Status keseluruhan saat ini: KODE GREEN (fixture), REAL DATA UNVERIFIED** — eksekusi E2E dan approval menunggu founder menjalankan di lingkungan dengan `.env.db.local` nyata, sesuai Part H/J.

## Deliverable Part A–F

- Part A: dokumen ini.
- Part B: `data/question-metadata/review-manifest-001.json` + `scripts/approve-metadata-review-manifest.ts`.
- Part C: `scripts/report-metadata-review-manifest.ts`.
- Part D+E: `scripts/test-step3j-real-data.ts`.
- Part F: `scripts/check-adaptive-candidate-pool.ts`.
- Part G: `docs/PHASE_2_STEP_3J_REAL_DATA_VERIFICATION.md` (hasil eksekusi).
- Part H: regresi + status (lihat dokumen verifikasi).