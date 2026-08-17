# PHASE 7 STEP 0 — Question Bank Quality Audit

Tanggal: 17 Agustus 2026 · Status: **MENUNGGU FOUNDER REVIEW** (NO COMMIT / NO PUSH)
Tipe: **AUDIT + VERIFICATION ONLY** — 0 perubahan kode produksi, 0 write DB, 0 migrasi, 0 seed.

---

## 1. Ringkasan Eksekutif

Audit mendalam seluruh bank soal BahasaCerdas (correctness > validity > pedagogy > consistency >
quantity) terhadap **4.121 soal** dari sumber JSON source-of-truth (DB lokal tidak dapat dibaca —
env di-mask `[SENSITIVE]`, lihat §16).

**Hasil keseluruhan: 2.709 valid (65,7%) / 1.412 invalid (34,3%).**

| Bank | Audited | Valid | % Valid | Verdict |
|------|---------|-------|---------|---------|
| Master (`data/question-bank/master/*.json`) | 1.500 | 185 | 12,3% | 🔴 **RED — rusak sistemik** |
| UKBI (`data/question-bank/ukbi/**`) | 1.279 | 1.210 | 94,6% | 🟡 AMBER (40 soal membaca kritis rusak + 29 soal kaidah) |
| TKA (`data/question-bank/tka/**`) | 255 | 237 | 92,9% | 🟡 AMBER (18 soal) |
| Game/katastra (`lib/game/question-bank.ts` + katastra) | 397 | 372 | 93,7% | 🟡 AMBER (25 soal) |
| Jalur Cerdas (`seed-jalur-*`) | 720 | 705 | 97,9% | 🟢 GREEN (15 soal) |
| **TOTAL** | **4.121** | **2.709** | **65,7%** | 🔴 **RED (keseluruhan)** |

**Temuan paling serius:** bank Master (1.500 soal — dipakai sistem Jalur Cerdas legacy dan
bank soal lama) rusak secara sistemik: ~87,7% soal tidak layak (kunci jawaban salah, konten
templat kosong, duplikat massal, difficulty salah). Dua file Master (teks-*) 0/300 valid.
Bank ini **harus ditarik dari produksi** sampai diregenerasi.

## 2. Cakupan & Metode

- **Metode**: 11 audit paralel per bank (agent), verifikasi deterministik tambahan via harness
  `scripts/test-question-bank-quality-audit.ts` (29 checks, Discovered=29, Executed=29,
  Passed=23, Failed=6). Seluruh temuan disimpan di `/var/folders/.../opencode/qa-*.json`
  (qa-master-a..g, qa-ukbi, qa-tka, qa-game, qa-jalur).
- **Sumber**: file JSON bank (bukan DB) — auditable, deterministic, tanpa runtime.
- **Kategori temuan**: NO_CORRECT (tidak ada opsi benar), BROKEN_CONTENT (konten kosong/
  template), DUPLICATE (salinan identik), WRONG_DIFFICULTY, WRONG_KEY (kunci salah),
  AMBIGUOUS, MULTIPLE_CORRECT, WRONG_METADATA, WRONG_CONTENT, BAD_DISTRACTOR,
  INVALID_LANGUAGE, HUMAN_REVIEW_REQUIRED, MISSING_SAMPLE, COSMETIC.
- **Protected zones**: 0 diff — `prisma/`, `lib/gamification/`, `lib/learning-loop/`,
  `lib/learner-state/`, `lib/diagnostic/`, `lib/adaptive-practice/`, `engines/`,
  `lib/coins.ts`, `lib/award-xp.ts`, `lib/apk.ts` tidak tersentuh.
- **DB**: READ ONLY — 0 write, 0 migrasi, 0 seed.

## 3. Bank Master (1.500 soal, 50 file)

Format: `{kodeSoal, text, options[], correctAnswer (string index), type, difficulty, levelBerpikir, kelas, kompetensi, tema, explanation}`.
Pola cacat sistemik (ditemukan di **semua** 50 file):

1. **Template `"Berikut ini yang termasuk contoh X adalah…"`** — kunci jawaban = nama konsep "X"
   itu sendiri (bukan contoh) → NO_CORRECT. Contoh: `BC-SINONIM-0004`.
2. **`"Jelaskan pengertian X menurut pemahaman Anda."`** — soal ISIAN_SINGKAT yang dijawab token
   tunggal (harusnya constructed response) → BROKEN_CONTENT (149 soal).
3. **Tautologi BENAR_SALAH** — `"X adalah bagian dari materi Bahasa Indonesia"` → kunci "Benar"
   tanpa nilai pedagogis (6 soal opsi salah; sisanya tautologis).
4. **Duplikat massal** — ~18–21 salinan identik per file (249 duplikat, 150 dup-group).
5. **WRONG_DIFFICULTY** — 82 soal ditandai SULIT/HOTS untuk konten trivial (contoh: definisi
   sinonim dasar dengan levelBerpikir 5).

### Per-batch (7 batch × file)

| Batch | File | Audited | Valid | Temuan utama |
|-------|------|---------|-------|--------------|
| a | sinonim, antonim, makna-kata, kata-baku, kata-tidak-baku | 150 | **4** | DUPLICATE 129, WRONG_DIFFICULTY 30, NO_CORRECT 5, BROKEN_CONTENT 10 |
| b | ejaan, puebi, tanda-baca, imbuhan, spok | 150 | 10 | DUPLICATE 118, BROKEN_CONTENT 19, WRONG_METADATA 3 (`BC-SPOK-0003/-0008` BS 4 opsi, `BC-SPOK-0005` ISIAN 4 opsi) |
| c | kalimat, kalimat-efektif, paragraf, ide-pokok, gagasan-utama | 150 | 26 | NO_CORRECT 103, BROKEN_CONTENT 15 |
| d | majas, puisi, pantun, syair, gurindam | 150 | 31 | NO_CORRECT 103, WRONG_DIFFICULTY 30 |
| e | cerpen, novel, fabel, legenda, mitos, hikayat | 180 | 36 | BROKEN_CONTENT 144 (18 dup-group) |
| f | teks-berita, narasi, deskripsi, eksposisi, argumentasi, persuasi, eksplanasi, editorial, ulasan, prosedur | 300 | **0** | NO_CORRECT 210, BROKEN_CONTENT 90 (30 dup-group) |
| g | resensi, iklan, poster, slogan, anekdot, artikel, cerita-inspiratif, drama, pidato, proposal, surat-dinas, surat-pribadi, simpulan | 390 | 78 | BROKEN_CONTENT 312 (39 dup-group) |
| **Total** | | **1.500** | **185** | |

**Rekomendasi**: bank Master tidak boleh dipakai produksi. 4 soal GOLD (§11) dipertahankan;
selebihnya butuh regenerasi penuh (kandidat sudah terdaftar via enrichment pipeline 4B/4B.6).

## 4. Bank UKBI (1.279 soal)

| Seksi | Audited | Temuan |
|-------|---------|--------|
| merespons-kaidah | 389 | 29 soal konkret: WRONG_KEY 2 (sd set-002 Q006; guru set-003 Q028/Q030), NO_CORRECT 1 (sma set-001 Q005), MULTIPLE_CORRECT 12, AMBIGUOUS 3, WRONG_DIFFICULTY 7 (smp set-001 Q037–043), WRONG_CONTENT 3 |
| membaca | 555 | **40 BROKEN_CONTENT kritis**: `sd/membaca/set-002.json` Q001–Q040 — passage kosong di file DAN di passage-map.json → soal tidak dapat dijawab (produksi) |
| mendengarkan | 175 | 175/175 valid (kunci vs audioScript diverifikasi individu; 1 typo kosmetik) |
| menulis | 111 | 45 soal constructed tanpa `sampleExpectedResponse` (opsional — direkomendasikan untuk AI-grading) |
| berbicara | 49 | sama (subset dari 45) |
| **Total** | **1.279** | valid 1.210 (94,6%) |

**Metadata sistemik**: 244 soal membawa nilai band typo — `SEMENJAK` (199) / `SANGATUNGGUL` (45)
vs kanonik `SEMENJANA` / `SANGAT_UNGGUL` (guru files). Tidak memengaruhi kunci, tapi merusak
pemfilteran/filter band di pemilihan paket. 0 ID duplikat, 0 kunci hilang.

## 5. Bank TKA (255 soal)

- Valid 237 (92,9%).
- **WRONG_DIFFICULTY 17**: `difficulty=4` di luar spesifikasi 1–3 (EASY/MEDIUM/HARD) — 15 di
  `sma/baca/set-001` (Q005, Q010, Q015, Q020, Q025, …), 2 di `smp`.
- **INVALID_LANGUAGE 1**: `BC-TKA-SD-BACA-SET001-Q014` — typo "Langgsung".
- 0 duplikat, 0 kunci hilang.

## 6. Bank Game/katastra (397 soal)

- Valid 372 (93,7%).
- **MULTIPLE_CORRECT 7**: katastra-40 ("di/di meja" — dua opsi sah), katastra-85, -97, -26,
  -177; **AMBIGUOUS 9**: game-0 ("Apoteker" juga kata baku), game-65 ("menyetir"/"menjalankan"
  keduanya sah untuk mobil); **BAD_DISTRACTOR 2**: game-122 bocor kunci di opsi;
  **INVALID_LANGUAGE 3**; **HUMAN_REVIEW_REQUIRED 4** (game-98 "sinonim malas → pemalas" dll).
- 28 dup-group (katastra-11 = katastra-92; katastra-40 case-only duplicate).

## 7. Bank Jalur Cerdas (720 soal)

- Valid 705 (97,9%) — bank terbaik.
- **WRONG_KEY 2**: `hk2` (kapitalisasi nama hari — kunci "Salah" kontradiksi dengan penjelasan
  sendiri), `ke3` (pola S-P-O — kunci index 3, penjelasan menyebut index 0).
- **BROKEN_CONTENT 2**: `kd1` (4 opsi identik "di"), `ho2`.
- **AMBIGUOUS 5**: `u55f` ("34 provinsi" — Indonesia kini 38), dll; **MULTIPLE_CORRECT 1**
  (`u05h`); **WRONG_CONTENT 1** (`u55f`); **DUPLICATE 2**.

## 8. Harness `test:question-bank-quality-audit`

`scripts/test-question-bank-quality-audit.ts` — harness deterministik console (check()),
29 checks berjalan (executed) = 29 discovered, **23 pass / 6 fail**. 6 kegagalan = temuan nyata
(yang justru mengkonfirmasi audit):
1. correctAnswer di luar jangkauan opsi
2. BENAR_SALAH tidak selalu `[Benar, Salah]` (6 soal)
3. duplikat persis (text+opsi+jawaban) — 150 grup
4. ISIAN_SINGKAT "Jelaskan…" memakai opsi tunggal — 149 soal
5. stem diulang lebih dari sekali — 150 grup
6. explanation template kosong ("…jawaban yang tepat…") — 1.186 soal

Registrasi: `"test:question-bank-quality-audit": "npx tsx scripts/test-question-bank-quality-audit.ts"`
(baru ditambahkan ke `package.json`; jalankan: `npm run test:question-bank-quality-audit`).

## 9. Statistik Agregat (11 batch)

| Kategori | Jumlah |
|----------|--------|
| BROKEN_CONTENT | 607 |
| NO_CORRECT | 421 |
| DUPLICATE | 249 |
| WRONG_DIFFICULTY | 82 (+1 UKBI) |
| AMBIGUOUS | 15 (+3 UKBI) |
| MULTIPLE_CORRECT | 8 (+3 UKBI) |
| WRONG_METADATA | 7 (+1 UKBI: 244 soal band) |
| INVALID_LANGUAGE | 4 |
| HUMAN_REVIEW_REQUIRED | 4 |
| BAD_DISTRACTOR | 2 |
| WRONG_KEY | 2 (+2 UKBI) |
| WRONG_CONTENT | 1 (+3 UKBI) |
| MISSING_SAMPLE | 0 (+2 UKBI: 45 soal) |
| COSMETIC/BORDERLINE | 0 (+2 UKBI) |
| **Total issue-record** | **1.421** |

## 10. Prioritas Perbaikan (rekomendasi — TIDAK dieksekusi sesi ini)

| P | Item | Effort |
|---|------|--------|
| P0 | Tarik bank Master dari produksi (Jalur Cerdas legacy / bank soal lama) — 1.500 soal tidak layak | kecil |
| P0 | Perbaiki `ukbi/sd/membaca/set-002.json` Q001–Q040 (passage hilang — soal tidak bisa dijawab) | sedang |
| P1 | Perbaiki 29 soal kaidah UKBI (WRONG_KEY/NO_CORRECT/MULTIPLE_CORRECT) | kecil |
| P1 | Perbaiki 17 soal TKA difficulty=4 + 1 typo | kecil |
| P1 | Perbaiki 15 soal Jalur (2 WRONG_KEY, kd1, u55f) | kecil |
| P1 | Perbaiki 25 soal game/katastra (multi-correct, ambigous, distractor bocor) | sedang |
| P2 | Normalisasi 244 band typo UKBI (SEMENJAK/SANGATUNGGUL) | kecil |
| P2 | Tambah `sampleExpectedResponse` untuk 45 soal constructed UKBI | sedang |
| P3 | Regenerasi penuh bank Master (regenerate pipeline, bukan patch) | besar |

## 11. GOLD Subset (diverifikasi sahih — siap produksi)

| Bank | Soal |
|------|------|
| Master | `BC-SINONIM-0001`, `BC-SINONIM-0002`, `BC-ANTONIM-0001`, `BC-ANTONIM-0002` (4 — satu-satunya validIds yang dipersist agent) |
| UKBI | 1.210 (94,6%) — setelah P0/P1/P2 |
| TKA | 237 (92,9%) — setelah P1 |
| Game/katastra | 372 (93,7%) — setelah P1 |
| Jalur | 705 (97,9%) — setelah P1 |

## 12. HUMAN_REVIEW_REQUIRED Queue

- game-98 ("sinonim malas → pemalas" — derivasi nomina), game-129, game-154, game-177 (4 soal
  — butuh keputusan manusia: pertahankan/ubah/regenerasi).
- 15 soal AMBIGUOUS lintas bank (game-0, game-65; UKBI SMP set-002 Q004, SMA set-002 Q034,
  GURU set-002 Q034; jalur u55f dkk) — keputusan editorial.
- 12 soal MULTIPLE_CORRECT UKBI kaidah (SMA/GURU set-002/003) — pilih kunci atau reword opsi.

## 13. Hal Positif yang Terverifikasi

- **0 ID duplikat, 0 kunci hilang, 0 rubric hilang** di seluruh bank UKBI (1.279).
- Mendengarkan UKBI 175/175 kunci-vs-script benar.
- TKA: 0 duplikat, 0 kunci hilang; Jalur: 0 jawaban bocor (test:jalur-leakage tetap hijau).
- Katastra: tidak ada soal rusak JSON; semua tipe konsisten.
- Bank TKA & Jalur memakai format yang benar (bukan template Master).

## 14. Keamanan & Integritas

- Tidak ada `correctAnswer`/`jawaban` yang bocor: seluruh payload audit internal (qa-*.json)
  menyimpan reason tanpa kunci penuh (WRONG_KEY dicatat "not leak-safe to print key here").
- Harness tidak menyentuh DB; READ ONLY penuh.

## 15. Catatan Riset / Metodologi

- Batas keandalan: audit berbasis konten JSON statis — tidak ada simulasi user/koreksi parser
  runtime; validitas pedagogis ditentukan per-aturan eksplisit (bukan preferensi model).
- Kategori `valid` = tidak ada temuan pada 13 kategori; soal dengan temuan minor (cosmetic,
  border-line) TETAP dihitung valid bila kunci sahih.

## 16. Keterbatasan Lingkungan

- `DATABASE_URL` lokal = `[SENSITIVE]` (di-mask opencode) → PrismaClient tidak bisa konek.
  Audit berbasis file JSON source-of-truth (deterministik, auditable). Untuk korelasi DB
  (mis. berapa soal sudah ter-seed) dibutuhkan SQL langsung via Supabase SQL Editor.
- `scripts/.tmp-extract.ts` (diagnostic sementara dari sesi audit) dihapus — repo bersih.

## 17. Protected Zones

0 diff: `prisma/`, `lib/gamification/`, `lib/learning-loop/`, `lib/learner-state/`,
`lib/diagnostic/`, `lib/adaptive-practice/`, `engines/`, `lib/coins.ts`, `lib/award-xp.ts`,
`lib/apk.ts`, `app/arena/bottom-nav.tsx`, seluruh `app/api/`.

## 18. Files

| File | Aksi |
|------|------|
| `package.json` | +`test:question-bank-quality-audit` (satu-satunya modifikasi repo) |
| `scripts/test-question-bank-quality-audit.ts` | BARU — harness 29 checks |
| `docs/PHASE_7_STEP_0_QUESTION_BANK_QUALITY_AUDIT.md` | BARU — laporan ini |
| `data/question-bank/**`, `lib/game/question-bank.ts`, `scripts/seed-jalur-*` | TIDAK diubah (audit-only) |

## 19. Verifikasi

| Check | Hasil |
|-------|-------|
| Harness audit (Discover=Exec) | ✅ Discovered 29 = Executed 29 |
| Harness pass | ✅ 23 pass / 6 fail (fail = temuan nyata, bukan harness error) |
| `node -e JSON.parse(package.json)` | ✅ valid |
| `npx tsc --noEmit` | ✅ 0 errors (tidak ada perubahan TS sesi ini) |
| `git status` | ✅ hanya package.json + 2 file baru (test + doc) |
| `git diff --check` | ✅ bersih |
| Protected zones | ✅ 0 diff |
| DB / migration / seed | 0 write / 0 migrasi / 0 seed |

## 20. Verdict

| Field | Value |
|-------|-------|
| **Verdict** | 🔴 **RED** (keseluruhan) — bank Master tidak produksi-ready; UKBI/TKA/Game/Jalur mendekati siap |
| **Severity** | P0: bank Master 1.500 soal (87,7% invalid) + 40 soal membaca UKBI SD tidak bisa dijawab |
| **Confidence** | HIGH (audit deterministik berbasis file source-of-truth + harness 29 checks) |
| **Evidence** | qa-*.json (11 batch, 1.421 issue-record); harness 23/29 pass (6 fail = temuan) |
| **DB impact** | NONE — read-only, 0 write, 0 migrasi |
| **Next action** | Founder review: (1) setujui P0 tarik Master + perbaiki UKBI SD membaca set-002; (2) perbaiki kandidat per-bank; (3) eksekusi di fase berikutnya |

---

### Remaining (tidak berubah dari sesi sebelumnya)
1. **TKA UTBK/Guru enrichment 30 → 150**
2. **Game server revival (VPS mati)**
3. **GameRoom migration SQL via Supabase dashboard**
4. **UI game solo: badge-score client vs server masih beda (kosmetik)**
5. **SQL `2026-08-02_no_absen.sql` & `2026-08-08_school_identity.sql` (Production + Preview)**
