# PHASE 2 — STEP 8.4: BC AI DIAGNOSTIC — PEDAGOGICAL QA

**Tanggal**: 18 Agu 2026 · **Status**: BLOCKED (Groq free-tier throttled — 4 dari 100 butir; engine code fixed & verified) · **NO COMMIT/PUSH** (menunggu Founder Review)

---

## 1. Ringkasan Eksekutif

QA pedagogis AI Diagnostic (STEP 8.4) selesai dari sisi infrastruktur: 3 defect kode ditemukan & diperbaiki, runner resume-capable dibangun, 4 butir nyata dihasilkan & di-review manual. **Verdict: BLOCKED** — Groq free-tier key (`gsk_dfRr...`) terkena token-per-minute throttling (~8000 token/menit); mayoritas heavy calls gagal 429 meski retry bertingkat. Tanpa data yang memadai (target ≥50 butir, ≥5 archetype), audit pedagogis lengkap (adaptivity A–F, profil, stress test) tidak bisa diselesaikan.

| Section | Verdict |
|---------|---------|
| Konten butir (4 items manual review) | ✅ PASS — natural, jelas, usia-sesuai, tanpa AI-klise |
| Nilai diagnostik (misconception) | 🟡 PARTIAL — 3/4 items tutup semua opsi salah; 1 item kurang 1 opsi |
| Perilaku adaptif (kasus A–F) | ⏳ TIDAK BISA DIVERIFIKASI — butuh ≥2 sesi lengkap dengan multi-skill |
| Kualitas hasil (profil) | ⏳ TIDAK BISA DIVERIFIKASI — butuh ≥5 butir/sesi untuk stress test |
| Fallback bank | 🟡 HONEST tapi kapasitas terbatas (87 butir) |
| AI failure (10 mode) | ✅ PASS — termasuk 3 defect kode yang diperbaiki hari ini |
| Keamanan | ✅ PASS |
| Biaya | ✅ struktur terukur |
| UX | ✅ PASS (inspeksi kode; responsive + dark) |
| **OVERALL** | **BLOCKED** — engine OK, provider throttled, data tidak cukup |

`npm run score:ai-diagnostic-8-4` → **31 lulus, 8 gagal** (7 gagal = data tidak cukup; 1 gagal = misconception coverage).

---

## 2. Metode

- **Jalur produksi ASLI** (bukan fixture): `nextPlanForSlot` (controller) → `generateAiDiagnosticQuestion` (generator → `callWithFallback` → validator R1–R18 → `shuffleItem`) → semantik jawaban `answerAiDiagnostic` → `computeProfileFromEvidence` + `withUntestedSkills`.
- **5 archetype × 2 sesi (ukuran 10) = 10 sesi, 100 butir** (default `AI_DIAGNOSTIC_DEFAULT_SIZE`).
- **Runner resume-capable**: sesi parsial (0 < items < 10) otomatis dilanjutkan dari slot terakhir; sesi lengkap (items = 10) di-skip.
- **Budget time**: env `QA_MAX_MINUTES=N` — auto-break dengan pesan resume.
- **Pacing**: inter-slot sleep 22 detik; slot-0 retry sleep 25 detik × 6 percobaan; pre-slot-0 sleep 20 detik. Dirancang untuk menjaga token-per-minute bucket Groq di bawah 8000/min.

---

## 3. Korpus Sesi — 4 Butir Nyata dari 10 Sesi

### Ringkasan Eksekusi

| Sesi | Items | AI Calls | Durasi | Status |
|------|-------|----------|--------|--------|
| S1-1 (Pemula) | 0 | 3 | 90s | ❌ 3× retry slot-0 gagal 429 |
| S1-2 (Pemula) | 0 | 1 | 52s | ❌ slot-0 gagal 429 |
| S2-1 (Murid kuat) | **1** | 7 | 385s | ✅ slot-0 READING/EASY berhasil |
| S2-2 (Murid kuat) | 0 | 1 | 52s | ❌ slot-0 gagal 429 |
| S3-1 (Grammar kuat) | **1** | 7 | 405s | ✅ slot-0 READING/EASY berhasil |
| S3-2 (Grammar kuat) | 0 | 1 | 52s | ❌ slot-0 gagal 429 |
| S4-1 (Reading kuat) | **1** | 7 | 385s | ✅ slot-0 READING/EASY berhasil |
| S4-2 (Reading kuat) | 0 | 1 | 52s | ❌ slot-0 gagal 429 |
| S5-1 (Inkonsisten) | **1** | 7 | 385s | ✅ slot-0 READING/EASY berhasil |
| S5-2 (Inkonsisten) | 0 | 1 | 52s | ❌ slot-0 gagal 429 |
| **TOTAL** | **4** | **34** | **~23 min** | **4/100 butir** |

### Pola Kegagalan

- **Key Groq free-tier** punya dua bucket: `x-ratelimit-remaining-requests` (request/min) dan **token-per-minute** (~8000/min, tidak di-expose header).
- Heavy call (~3500 tokens output) segera mengosongkan token bucket → **429 burst** pada semua model (gpt-oss-120b DAN gpt-oss-20b).
- Pola: 1 heavy call OK → 5–6 retry call dalam ~10s → 429 storm → cooldown rolling 2–5 menit → sesekali OK lagi.
- `gsk_k4tj...` (key lama) = 200 OK untuk probe ringan (8 tokens), tapi 429 untuk heavy calls.

### Analisis Keterbatasan Data

| Kebutuhan Audit | Syarat | Tercapai? |
|-----------------|--------|-----------|
| Adaptivity A–F | ≥2 sesi × 10 butir dengan multi-skill | ❌ (0 sesi lengkap) |
| Profil baseline | ≥5 butir per skill dalam 1 sesi | ❌ (hanya READING, 1/sesi) |
| Stress test 5 soal | ≥1 sesi ≥5 butir | ❌ |
| Coverage archetype | 5 archetype terwakili | ❌ (4/5 — S1 kosong) |
| Skor rubrik manual §5–6 | ≥50 butir | ❌ (4 butir) |

---

## 4. Review Manual 4 Butir Nyata

### Item 1: S2-1 (READING / EASY / Ide Pokok)

| Aspek | Skor | Catatan |
|-------|------|---------|
| Naturalness | 5 | Bahasa alami, konteks kebersihan lingkungan |
| Kejelasan | 5 | Pertanyaan jelas, teks pendek & padat |
| Kesesuaian usia | 5 | Kosakata SD, situasi sehari-hari |
| Kualitas opsi | 5 | 4 opsi berbeda, tidak ada "Semua benar" |
| Distractor | 5 | Opsi salah = detail kegiatan (bukan kategori beda) |
| Nilai diagnostik | 4 | misconceptionMap 3/3 opsi salah ✅ — opsi jawaban benar tidak perlu misconception |
| Ambiguitas | 5 | Tidak ada opsi duplikat |
| Tebakan | 4 | Jawaban (opsi 1) bukan terpanjang |

**Verdict: PASS** — soal ide pokok yang solid. Miskonsepsi menjelaskan mengapa murid salah pilih detail alih-alih ide utama.

### Item 2: S3-1 (READING / EASY / Ide Pokok)

| Aspek | Skor | Catatan |
|-------|------|---------|
| Naturalness | 5 | Teks tentang kegiatan sekolah, konteks pendidikan |
| Kejelasan | 5 | Pertanyaan eksplisit "Apa ide pokok?" |
| Kesesuaian usia | 5 | Cocok untuk siswa SD |
| Kualitas opsi | 5 | 4 opsi relevan dengan topik |
| Distractor | 4 | Opsi "Olahraga lebih penting daripada seni" sedikit janggal secara natural |
| Nilai diagnostik | 4 | 3/3 misconception ada, tapi index mapping salah (lihat §6) |
| Ambiguitas | 5 | Bersih |
| Tebakan | 5 | Jawaban = opsi terpanjang (sedikit bias) |

**Verdict: PASS** — soal solid, sedikit bias tebakan karena jawaban lebih deskriptif.

### Item 3: S4-1 (READING / EASY / Ide Pokok — **model salah jawab**)

| Aspek | Skor | Catatan |
|-------|------|---------|
| Naturalness | 5 | Teks naratif persahabatan yang hangat |
| Kejelasan | 5 | "Ide pokok teks di atas adalah..." jelas |
| Kesesuaian usia | 5 | Teman, bermain, tolong-menolong — topik SD |
| Kualitas opsi | 5 | 4 opsi berbeda, tidak ada yang kategori beda |
| Distractor | 5 | Setiap opsi = aspek spesifik cerita (bukan kategori beda) |
| Nilai diagnostik | 3 | **misconceptionMap hanya 3/3 opsi salah** — opsi 2 ("Kecelakaan yang menimpa Rudi") tidak punya misconception entry → **coverage tidak lengkap** |
| Ambiguitas | 5 | Bersih |
| Tebakan | 4 | Model memilih opsi 1 ("Kegiatan bermain") → miskonsepsi klasik: menganggap kegiatan sebagai ide pokok |

**Verdict: PARTIAL** — soal berkualitas, miskonsepsi tidak menutupi semua opsi salah (1 opsi tanpa entry). Model sendiri terjebak miskonsepsi yang tepat.

### Item 4: S5-1 (READING / EASY / Ide Pokok)

| Aspek | Skor | Catatan |
|-------|------|---------|
| Naturalness | 5 | Teks tentang membaca di perpustakaan, konteks pendidikan |
| Kejelasan | 5 | Implisit (tanpa pertanyaan eksplisit), tapi opsi jelas |
| Kesesuaian usia | 5 | Siswa perpustakaan, topik SD |
| Kualitas opsi | 5 | 4 opsi berbeda |
| Distractor | 4 | "Anak belajar membaca di sekolah" — sedikit beda konteks (sekolah vs perpustakaan) |
| Nilai diagnostik | 4 | 3/3 misconception ada ✅ |
| Ambiguitas | 5 | Bersih |
| Tebakan | 4 | Model benar pilih opsi 1 |

**Verdict: PASS** — soal solid.

### Rangkuman Review Manual

| Metrik | Hasil |
|--------|-------|
| Rata-rata naturalness | 5.00 ✅ |
| Rata-rata kejelasan | 5.00 ✅ |
| Rata-rata usia | 5.00 ✅ |
| Rata-rata opsi | 5.00 ✅ |
| Rata-rata distractor | 4.50 ✅ |
| Rata-rata diagnostik | 3.75 ❌ (<4 ambang) |
| Rata-rata ambiguitas | 5.00 ✅ |
| Rata-rata tebakan | 4.25 ✅ |
| Butir ditolak | 0 (4/4 lolos naturalness/clarity/usia) |
| Misconception coverage | 11/12 opsi salah (91.7% — kurang 1) |

**Temuan kunci**: 4 butir ini semua READING/EASY (slot-0 dari masing-masing sesi). Tidak ada bukti multi-skill, multi-difficulty, atau adaptivity. Kualitas individual baik, tapi **tidak cukup untuk menyimpulkan pedagogis secara keseluruhan**.

---

## 5. Audit Distractor (Manual)

| Butir | Opsi | Pola mencolok | Skor (1–5) | Tindakan |
|-------|------|----------------|------------|----------|
| S2-1 | Menggunakan kantong / Menjaga kebersihan / Menyapu halaman / Mengumpulkan sampah | Distractor = detail kegiatan (kuat) | 5 | OK |
| S3-1 | Olahraga > seni / Ikut semua / Kegiatan membantu / Guru hanya kelas | Distractor = generalisasi berlebihan (cukup) | 4 | OK |
| S4-1 | Persahabatan-tolong / Bermain lapangan / Kecelakaan Rudi / Merawat teman | Distractor = detail spesifik cerita (kuat) | 5 | OK |
| S5-1 | Belajar membaca / Suka membaca / Menulis cerita / Menghabiskan waktu | Distractor = aktivitas terkait (cukup) | 4 | OK |

---

## 6. Nilai Diagnostik (Manual)

| Butir | Misconception menutup semua opsi salah? | Kualitas miskonsepsi |
|-------|----------------------------------------|---------------------|
| S2-1 | ✅ 3/3 (100%) | Baik — menjelaskan *mengapa* murid salah |
| S3-1 | ✅ 3/3 (100%) | Baik — meski index mapping sedikit tidak konsisten |
| S4-1 | ❌ 3/4 (75%) — opsi 2 tanpa entry | Kurang — "Kecelakaan Rudi" butuh entry miskonsepsi |
| S5-1 | ✅ 3/3 (100%) | Baik |

**Rata-rata coverage**: 91.7% (target ≥95%). Satu opsi tanpa entry miskonsepsi = defect kecil yang seharusnya ditangkap validator (tapi validator hanya cek minimal 3 entry, bukan full coverage — lihat Defect #3 di §15).

---

## 7. Perilaku Adaptif (Kasus A–F) — TIDAK BISA DIVERIFIKASI

Dengan hanya 4 butir (semua READING/EASY, 1/sesi):
- Kasus A (S2 semua benar): ❌ tidak ada cukup data
- Kasus B (S3 grammar salah): ❌ tidak ada butir GRAMMAR
- Kasus C (S5 inkonsisten): ❌ tidak ada cukup data
- Kasus D/E (weakest skill): ❌ hanya 1 skill terwakili
- Kasus F (duplikasi): ✅ 0 duplikat (terverifikasi otomatis)

---

## 8. Kualitas Hasil (Profil) — TIDAK BISA DIVERIFIKASI

- Checker section E membutuhkan ≥5 butir per sesi untuk stress test. Tidak ada sesi yang memenuhi.
- Engine kanonik (4E.1) tetap hijau via unit test: 36/36 `test:diagnostic-4e1`.

---

## 9. Audit Fallback Bank — TETAP HONEST

Data aktual: 87 butir approved (BANK_SOAL, 4B.6), 5–6 kandidat/sel, LISTENING/SPEAKING = 0. Verdict: 🟡 HONEST, kapasitas terbatas. Bukan blocker.

---

## 10. Uji Kegagalan AI (10 Mode) — **PASS**

| # | Mode | Status | Bukti hari ini |
|---|------|--------|----------------|
| 1 | Timeout | ✅ generator try/catch + retry | — |
| 2 | Malformed JSON | ✅ parse throw → retry | — |
| 3 | Provider error | ✅ catch → {item:null} → fallback | ✅ 429 nyata |
| 4 | Empty response | ✅ retry ("output kosong") | ✅ empty-response nyata |
| 5 | Opsi tidak valid | ✅ validator R8 tolak | — |
| 6 | Soal duplikat | ✅ R15 avoidStems tolak | — |
| 7 | Jawaban ambigu | ✅ R14 jawaban di stem tolak | — |
| 8 | Tanpa misconception | ✅ R11 tolak | — |
| 9 | Tanpa jawaban benar | ✅ R9 tolak | — |
| 10 | Rate limit | ✅ provider 429 → catch → fallback | ✅ 429 nyata |

---

## 11–13. Keamanan / Biaya / UX — TIDAK BERUBAH

Semua PASS (lihat versi sebelumnya).

---

## 14. Skor Akhir

| Dimensi | Skor |
|---------|------|
| Konten (4 butir manual) | ✅ PASS (5.00/5.00/5.00/5.00) |
| Kualitas opsi/distractor | ✅ PASS (4.50) |
| Nilai diagnostik (misconception) | 🟡 PARTIAL (3.75 — 1 item kurang coverage) |
| Perilaku adaptif (A–F) | ⏳ TIDAK BISA DIVERIFIKASI |
| Kualitas hasil/profil | ⏳ TIDAK BISA DIVERIFIKASI |
| UX | ✅ PASS |
| Keamanan | ✅ PASS |
| Fallback | 🟡 HONEST-limitasi |
| Biaya | ✅ struktur terukur |
| AI failure resilience | ✅ PASS (3 defect diperbaiki; bukti nyata) |
| **OVERALL** | **BLOCKED** — engine OK, provider throttled |

---

## 15. Defect Ditemukan & Diperbaiki (3 defect kode + 1 runner bug)

| # | Defect | Akibat | Fix | Verifikasi |
|---|--------|--------|-----|-----------|
| 1 | `callWithFallback` throw saat semua provider gagal | Route 500 — murid lihat "Gagal memproses tes awal" | `generator.ts`: try/catch → retry → null → fallback bank | `test:ai-diagnostic` 91/91 |
| 2 | **Prompt schema tidak mencantumkan `skill` & `difficulty`** sebagai top-level fields, padahal `validator.ts` mewajibkan (R3/R5) | Slot-0 generasi selalu ditolak validator → semua sesi kosong | `prompts.ts`: tambah `"skill": "READING", "difficulty": "EASY"` ke schema JSON + aturan no.16–18 (renumber); total aturan 16→18 | 4 butir berhasil dihasilkan setelah fix |
| 3 | **Counter harness salah**: `answeredCount = targetSize - order.length` (selalu 10 saat `order` kosong) | Sesi berhenti di 1 butir karena checker kira sudah 10 | `qa-ai-diagnostic-8-4.ts`: `answeredCount = slot + 1` | Semua sesi yang berhasil kini punya 1 butir dengan counter benar |
| 4 | **Groq 429 burst tanpa backoff internal**: generator retry langsung tanpa jeda → 5 call burst dalam ~10s → token bucket habis | Heavy calls tidak pernah berhasil dalam batch | `generator.ts`: backoff `3000 * (attempt + 1)` ms antar percobaan | Sesi isolasi berhasil dengan pacing |
| 5 | **Generator MAX_RETRIES terlalu rendah (2)** | Hanya 2 percobaan sebelum give-up, tidak cukup untuk window throttling | `config.ts`: 2→4 | Lebih banyak percobaan = lebih tinggi peluang window OK |
| 6 | **Runner tidak resume-capable** | Sesi parsial (mis. 3 butir dari 10) harus mulai dari 0 lagi | `qa-ai-diagnostic-8-4.ts`: `runOneSession(archetypeKey, seed, resume?)` + `stateFromRecord()` | Resume dari slot yang tersisa, skip sesi lengkap |

---

## 16. Regresi Penuh — HIJAU

| Suite | Hasil |
|-------|-------|
| `test:ai-diagnostic` | 91/91 ✅ |
| `test:diagnostic-4e1` | 36/36 ✅ |
| `test:diagnostic-assessment` | 48/48 ✅ |
| `test:diagnostic-personalization` | 32/32 ✅ |
| `test:adaptive-practice` | 25/25 ✅ |
| `test:adaptive-reward-hardening` | 41/41 ✅ |
| `test:learner-state` | 24/24 ✅ |
| `npx tsc --noEmit` | 0 errors ✅ |
| `npm run lint` | 0 violations ✅ |
| `npm run build` (dummy env) | exit 0 ✅ |
| `git diff --check` | bersih ✅ |

---

## Remaining (penentu verdict final)

1. **Re-run saat Groq free-tier pulih** (bisa berjam-jam/hari karena token bucket rolling): `GROQ_API_KEY=<key> npx tsx scripts/qa-ai-diagnostic-8-4.ts` — resume otomatis dari 4 butir yang sudah ada.
2. **Atau**: pakai provider berbayar (DEEPSEEK_API_KEY / GEMINI_API_KEY sudah tersedia di generator chain) — tapi founder instruksikan GROQ only.
3. Begitu ada ≥50 butir: `npm run score:ai-diagnostic-8-4` → review manual §5–6 → tentukan verdict (PASS/BLOCKED/NEEDS REVISION).
4. Commit/push STEP 8.4 (+ 8.3, 7.5, 4E series) bila disetujui Founder.

---

## File Berubah (NO COMMIT)

- `lib/diagnostic-ai/prompts.ts` (M) — schema + aturan 16–18 (skill/difficulty wajib)
- `lib/diagnostic-ai/config.ts` (M) — MAX_RETRIES 2→4
- `lib/diagnostic-ai/generator.ts` (M) — backoff retry internal + provider failure catch
- `scripts/qa-ai-diagnostic-8-4.ts` (M) — resume-capable runner, counter fix, pacing, QA_DEBUG, budget time
- `scripts/score-ai-diagnostic-8-4.ts` (existing) — unchanged
- `scripts/test-ai-diagnostic.ts` (M) — +6 asersi failure resilience
- `package.json` (M) — qa scripts
- `data/qa/ai-diagnostic-8-4/` — 4 butir nyata + score (10 sesi JSON)
