# PHASE 2 — STEP 8.4: BC AI DIAGNOSTIC — PEDAGOGICAL QA

**Tanggal**: 18 Agu 2026 · **Status**: PROGRES (data sesi nyata terblokir kuota provider; infrastruktur audit 100% siap & hijau) · **NO COMMIT/PUSH** (menunggu Founder Review)

---

## 1. Ringkasan Eksekutif

QA pedagogis AI Diagnostic (bagian dari STEP 8.4) dibangun sepenuhnya dan dijalankan sejauh mungkin hari ini. **Temuan paling penting bukan di soal—tapi di jalur kegagalan**: saat provider AI padam/kuota habis, sistem TIDAK pernah menampilkan error AI ke murid (generator kini menangkap kegagalan provider → fallback bank → murid lanjut aman). Defect ini ditemukan & diperbaiki hari ini (bagian 15).

| Section | Verdict hari ini |
|---------|------------------|
| Konten butir (naturalness/clarity/usia/dll.) | ⏳ MENUNGGU data nyata (kuota Groq) |
| Nilai diagnostik (misconception) | ⏳ MENUNGGU data nyata |
| Perilaku adaptif (kasus A–F) | ⏳ MENUNGGU data nyata |
| Kualitas hasil (profil 5-soal) | ✅ checker terpasang & hijau (engine kanonik) |
| Fallback bank | 🟡 HONEST tapi kapasitas terbatas (87 butir) |
| AI failure (10 mode) | ✅ PASS — termasuk bukti nyata 429/empty hari ini |
| Keamanan | ✅ PASS |
| Biaya | ✅ struktur terukur; angka nyata menunggu sesi |
| UX | ✅ PASS (inspeksi kode; responsive + dark) |
| **Overall (sementara)** | **PASS WITH CONDITIONS** — syarat: real-session run saat kuota pulih |

`npm run score:ai-diagnostic-8-4` → **20 lulus, 5 gagal** (5 kegagalan = "belum ada data butir nyata" — jujur, bukan defect).

---

## 2. Metode

- **Jalur produksi ASLI** (bukan fixture): `nextPlanForSlot` (controller) → `generateAiDiagnosticQuestion` (generator → `callWithFallback` → validator R1–R16 → `shuffleItem`) → semantik jawaban `answerAiDiagnostic` (kecocokan `correctAnswer` server-side) → `computeProfileFromEvidence` + `withUntestedSkills` (engine kanonik 4E.1, MURNI).
- **5 archetype × 2 sesi (ukuran 10) = 10 sesi, 100 butir** (default `AI_DIAGNOSTIC_DEFAULT_SIZE`):
  - S1 Pemula (EASY 30% / MEDIUM 18% / HARD 8%)
  - S2 Murid kuat (EASY 100% / MEDIUM 95% / HARD 90%)
  - S3 Membaca kuat / Grammar lemah (READING .9 · GRAMMAR .3)
  - S4 Membaca lemah / Grammar kuat (READING .3 · GRAMMAR .9)
  - S5 Inkonsisten (benar pada slot genap)
- Pola jawaban **deterministik seeded** (mulberry32) agar dapat diulang.
- Skor rubrik 1–5 per butir dengan ambang tolak (mission): Naturalness <4 · Kejelasan <4 · Nilai diagnostik <4 · Distractor <3 · Ambiguitas >1 · Tebakan >1.

## 3. Korpus Sesi

**10 sesi dibuat; 0 butir AI nyata** — semua upaya generasi ditolak provider:

```
[AI Provider] call chain failed (openai/gpt-oss-120b): groq/openai/gpt-oss-120b: HTTP 429 | groq/openai/gpt-oss-20b: HTTP 429
[AI Provider] call chain failed (openai/gpt-oss-120b): groq/...: empty response | groq/...: empty response
```

| Check | Hasil |
|-------|-------|
| Sesi tercatat | 10/10 ✅ |
| Sesi dengan butir AI | 0/10 ❌ (kuota Groq free habis — 429 lalu empty response) |
| Butir nyata | 0 (target 100) ❌ |

Data mentah tetap disimpan: `data/qa/ai-diagnostic-8-4/sessions/session-S{1..5}-{1,2}.json` (berisi `items:[]`, `slot0Warnings:[]`, profil null) + `index.json`.

**Catatan penting (bukti failure-mode nyata)**: kegagalan mengikuti pola 429 → (setelah ~1 menit) empty response pada DUA model sekaligus (`gpt-oss-120b` DAN `gpt-oss-20b`) — kuota per-kunci Groq habis total, bukan per-model. Runner diberi retry sesi QA-only (3×) — produksi TIDAK retry, langsung fallback bank (aman, lihat §9–10).

**Aksi yang ditunggu**: jalankan `GROQ_API_KEY=<key> npm run qa:ai-diagnostic-8-4` saat kuota pulih, lalu `npm run score:ai-diagnostic-8-4`.

## 4. Skor Butir (rubrik otomatis)

Checker siap & deterministik (`scripts/score-ai-diagnostic-8-4.ts`, section B):

- `naturalness` — deteksi kata Inggris ≥4 huruf (allowlist teknis), klise "Sebagai AI", ALL CAPS.
- `clarity` — panjang teks 40–400, spasi ganda, tanda kurung seimbang.
- `age` — rata-rata panjang kata ≤9, huruf langka (x/q/z/f).
- `options` — PG tepat 4 opsi unik (case-insensitive).
- `distractor` — variasi panjang opsi (std ≤50% mean), larangan "Semua benar"/"Tidak ada yang benar".
- `diagnosticValue` — misconceptionMap menutup SEMUA opsi salah, tiap nilai ≥25 char, unik.
- `ambiguity` — tanpa teks opsi duplikat.
- `guessability` — jawaban bukan opsi terpanjang/terpendek, posisi jawaban ≤40% per sesi.

Hasil: **⏳ menunggu data** (otomatis ❌ bila korpus kosong — dipertahankan jujur). Ambang tolak dikonfigurasi persis sesuai mission; butir yang lolos validator R1–R16 (regresi `npm run test:ai-diagnostic` 91/91) tetap bisa ditolak rubrik (mis. distractor jelek) — itulah tujuan fase ini.

## 5. Audit Distractor

Metode otomatis (section B `distractor`/`options`/`guessability`) + **tabel review manual** (di bawah; diisi setelah data nyata ada — tiap 100 butir dicetak dari `score.json`):

| Butir | Opsi | Pola mencolok | Skor (1–5) | Tindakan |
|-------|------|----------------|------------|----------|
| *(menunggu data)* | | | | |

Contoh kontra (dari mission — dicegah validator R8/R10/R11 + rubrik): main-idea question dengan opsi "Bermain sepak bola" (kategori mismatch) → distractor ≤3 → tolak.

## 6. Nilai Diagnostik

Rule inti: **setiap jawaban salah harus menelusur ke misconception tertentu, bukan sekadar "tidak tahu"**. Checker memverifikasi per butir: semua index opsi salah memiliki entri `misconceptionMap` dengan penjelasan ≥25 char dan saling berbeda (§4). Perilaku sesi (S3 grammar-wrong dsb.) diverifikasi via kasus adaptif §7. Hasil: **⏳ menunggu data**.

## 7. Perilaku Adaptif (Kasus A–F)

Checker section D — berjalan otomatis atas korpus nyata:

| Kasus | Harapan | Check otomatis |
|-------|---------|----------------|
| A — S2 semua benar | akurasi ≥0.7 & tanpa kategori WEAK | ✅ diimplementasikan |
| B — S3 salah grammar | GRAMMAR bukan STRONG, bukan INSUFFICIENT, memiliki bukti, rekomendasi ≠ HARD | ✅ diimplementasikan |
| C — S5 inkonsisten | confidence ≠ PROFILE_CONFIDENT; ada akurasi 0.2–0.8; placement provisional | ✅ diimplementasikan |
| D — S3 | `weakest === GRAMMAR` | ✅ diimplementasikan |
| E — S4 | `weakest === READING` | ✅ diimplementasikan |
| F — duplikasi | 0 stem duplikat dalam sesi & lintas sesi (checker section C, sudah ✅ pada korpus kosong) | ✅ hijau |

Catatan desain: kesulitan per slot mengikuti `aiDiagnosticDifficultyForIndex` (3 EASY · 4 MEDIUM · 3 HARD) — "naik kesulitan" (kasus A) dijamin oleh kontrak slot, bukan kebetulan; "verifikasi bertarget" (kasus B) muncul dr evidence summary per skill yang dikirim ke prompt + profil hasil.

## 8. Kualitas Hasil (Profil)

- Checker section E — **stress 5 soal** vs engine kanonik: profil dari 5 butir pertama sesi → `confidence` harus PROVISIONAL (bukan PROFILE_CONFIDENT — butuh ≥5 bukti per skill & akurasi ≥0.7), `placement.provisional === true`, TIDAK ada skill dengan ≥5 bukti (tanpa klaim mastery), insight tanpa kata "mahir/mastery". Checker terpasang; eksekusi menunggu data.
- Semantik dikonfirmasi dari source `lib/diagnostic/profile.ts`: `categoryFor` 1/1 benar → STRONG TAPI `confidenceFor` tetap PROVISIONAL (1<5) dan placement selalu `provisional:true` → UI menampilkan bendera "Sementara" (regresi 4E.1 36/36 dan 8.3 91/91 hijau).
- **Tidak ada klaim "kamu lemah"** pada skill tanpa bukti (`withUntestedSkills` → INSUFFICIENT_EVIDENCE/"Belum terukur") — monyet di §4E.1/4E.2.

## 9. Audit Fallback Bank

Data aktual (Supabase, approved metadata BANK_SOAL = 87 butir):

| Aspek | Temuan |
|-------|--------|
| Jumlah kandidat | 87 (approved + human review 4B.6) |
| Sel EASY/MEDIUM/HARD × 5 skill | 5–6 kandidat/sel (candidate-pool ✅) |
| LISTENING / SPEAKING | 0 — jujur (tanpa aset audio) |
| VERY_HARD | tidak didefinisikan bank — sel kosong (jujur) |
| Unik per sesi | sesi ≤7 butir tanpa pengulangan; sesi 10→berpotensi ulang soal |
| Tag | difficulty-tagged + misconception-tagged (metadata) |

**Verdict: 🟡 HONEST, kapasitas terbatas — BUKAN blocker.** Fallback hanya aktif saat AI gagal (jarang; hari ini terbukti berjalan benar). Karena pool kecil (87), sesi diagnostik penuh-fallback 10 butir dapat mengulang soal untuk murid dengan banyak sesi. **Rekomendasi**: tetap dampak kecil (murid, paling ekstrem, melihat ulang ≤3 soal dari bank kurasi); tidak menaikkan verdict ke "NOT PRODUCTION READY" SELAMA fallback jarang terpicu; pantau rasio fallback di produksi (usage-logger / observability) — bila >5% sesi → pertimbangkan penambahan kandidat atau penguncian generasi ulang.

`npm run check:candidate-pool` ✅ · `npm run check:diagnostic-pool` ✅ (keduanya hijau, read-only).

## 10. Uji Kegagalan AI (10 Mode) — **PASS**

| # | Mode | Checker (statis) | Bukti hari ini |
|---|------|------------------|----------------|
| 1 | Timeout | generator `try/catch` + retry | — |
| 2 | Malformed JSON | parse throw tertangkap → retry | — |
| 3 | Provider error | catch → `{item:null}` → fallback | ✅ 429 nyata |
| 4 | Empty response | retry ("output kosong") | ✅ empty-response nyata |
| 5 | Opsi tidak valid | validator R8 tolak | — |
| 6 | Soal duplikat | R15 avoidStems tolak | — |
| 7 | Jawaban ambigu | R14 (jawaban di stem) tolak | — |
| 8 | Tanpa misconception | R11 tolak | — |
| 9 | Tanpa jawaban benar | R9 tolak | — |
| 10 | Rate limit | provider 429 → catch → fallback bank | ✅ 429 nyata |

**Jaminan murid**: murid TIDAK PERNAH melihat "AI Error"/"Provider Error"/"JSON Error" (checker section F ✅ — string tidak ada di route/UI; 500 generic hanya untuk error infra non-AI). Saat provider padam: sesi lanjut memakai bank (start & answer), atau `GENERATION_UNAVAILABLE` → `canCompleteHonestly` → sesi selesai jujur.

**DEFECT DITEMUKAN & DIPERBAIKI hari ini** (bagian 15): sebelumnya `callWithFallback` throw `ProviderChainFailedError` → 500 "Gagal memproses tes awal" pada pemadaman provider. Kini generator menangkap → retry → null → fallback. Regresi: `test:ai-diagnostic` 91/91 (+6 asersi baru).

## 11. Audit Keamanan — **PASS**

- `scripts/score-ai-diagnostic-8-4.ts` section G: scan sentinel key di `data/question-metadata`, `data/question-bank`, `prisma`, `lib/diagnostic-ai`, `lib/diagnostic`, `lib/learner-state`, `app/api/player/diagnostic`, `app/arena/diagnostic`, `components/student-home`, `scripts` (dua file uji yang sengaja memuat sentinel sebagai target scan dikecualikan) → **0 bocor**; `data/qa` juga bersih ✅.
- Regresi `test:ai-diagnostic` §10: sentinel tidak muncul di source diagnostic mana pun ✅.
- Data terang di korpus QA (soal/opsi/jawaban/contoh misconception) hanyalah artefak QA internal; UI murid tetap memakai `toPublicQuestion` (tanpa jawaban/misconception/explanation) — check §2(regresi hijau).

## 12. Audit Biaya

| Aspek | Angka |
|-------|-------|
| Model | `openai/gpt-oss-120b` (Groq) — cadangan `gpt-oss-20b` |
| Max tokens | 2400 · temp 0.3 · timeout 40s · max 3 attempt/butir |
| AI call per sesi (normal) | ≤10 (1/butir); worst-case ≤16 (retry) — checker section H ✅ |
| Token per panggilan | **tidak di-surfacing** facade `generateAiDiagnosticQuestion` (hanya provider+warnings) — limitasi pencatatan; proyeksi dari maxTokens |
| Peristiwa nyata hari ini | 429 & empty repsonse → call berhenti cepat (0.6s/sesi) — biaya nol saat kuota habis, fallback bank gratis |

Verdict: **struktur terukur**; angka token nyata akan dicatat pada re-run (opsional: tambahkan `usage` ke `GenerationOutcome` — perubahan kecil di `generator.ts`, additive-only; ditunda agar tidak menggeser fokus QA).

## 13. Audit UX — **PASS** (inspeksi kode)

Alur: `/murid/beranda` → Aksi Hari Ini → "Kenali Kemampuanmu" (DIAGNOSTIC preview) → POST start → `/arena/diagnostic/{sessionId}` → soal → jawab → umpan balik → butir berikut → hasil (profil) → "Aksi Berikutnya" (4E.2 personalization).

| Aspek | Temuan |
|-------|--------|
| Responsif | `max-w-2xl px-5` + `sm:`/`md:` breakpoints (375/768/desktop) ✅ |
| Dark mode | 53 penggunaan `dark:` di halaman sesi + 4 di ContinueLearningCard ✅ |
| Satu CTA utama | tombol jawaban besar + "Lanjut/Simpan" tunggal ✅ (4E.1/4E.2, regresi hijau) |
| State A–D | Kenali Kemampuanmu / Profil Siap / Latihan Personal / BC Masih Mengenali — semua server-derived ✅ |
| Refresh/resume | GET `?sessionId=` IN_PROGRESS → lanjut butir saat ini ✅ |
| Abandoned | 30 menit expiry; rate limit start 5/30mnt ✅ |
| Tanpa info error AI | §10 — bukan jalur keras ✅ |

## 14. Skor Akhir

| Dimensi | Skor (belum final) |
|---------|--------------------|
| Konten (naturalness/clarity/usia/kebenaran/kognitif) | ⏳ PENDING (data) |
| Kualitas opsi/distractor | ⏳ PENDING (data) |
| Nilai diagnostik (misconception) | ⏳ PENDING (data) |
| Perilaku adaptif (A–F) | ⏳ PENDING (data) — checker siap |
| UX | ✅ PASS |
| Keamanan | ✅ PASS |
| Fallback | 🟡 HONEST-limitasi (bukan NOT PRODUCTION READY) |
| Biaya | ✅ struktur; angka nyata PENDING |
| AI failure resilience | ✅ PASS (defect diperbaiki; bukti nyata) |
| **OVERALL (sementara)** | **PASS WITH CONDITIONS** — syarat eksekusi real-session (§3) & review manual §5–6 |

## 15. Defect Ditemukan & Diperbaiki (minimal, additive)

| Defect | Akibat | Fix | Verifikasi |
|--------|--------|-----|-----------|
| `callWithFallback` throw saat semua provider gagal → `generateAiDiagnosticQuestion` → `startAiDiagnostic`/`answerAiDiagnostic` → route 500 | Murid lihat "Gagal memproses tes awal" saat AI padam — melanggar §10 mission | `generator.ts`: try/catch di sekitar `callWithFallback` (attempt gagal → retry; habis → `{item:null}`) → jalur fallback bank/`GENERATION_UNAVAILABLE` dll. yang sudah ada | `test:ai-diagnostic` 91/91 (6 asersi baru: catch provider, non-throw di body, terminal `{item:null}`, tanpa string error AI di route/UI) |

**File berubah/baru (NO COMMIT)**:
- `lib/diagnostic-ai/generator.ts` (M) — catch provider failure (minimal).
- `scripts/qa-ai-diagnostic-8-4.ts` (NEW) — runner sesi nyata (produksi path), retry sesi QA-only.
- `scripts/score-ai-diagnostic-8-4.ts` (NEW) — analyzer rubrik/kasus/stress/keamanan/biaya; menulis `data/qa/ai-diagnostic-8-4/score.json`.
- `scripts/test-ai-diagnostic.ts` (M) — +6 asersi §4/§9 (failure resilience).
- `package.json` (M) — `qa:ai-diagnostic-8-4`, `qa:ai-diagnostic-8-4:dry-run`, `score:ai-diagnostic-8-4`.
- `data/qa/ai-diagnostic-8-4/` (NEW) — korpus sesi (10 file) + index + score.

**Regresi penuh hijau**: `test:ai-diagnostic` 91/91 · `test:diagnostic-4e1` 36/36 · `test:diagnostic-assessment` 48/48 · `test:diagnostic-personalization` 32/32 · `adaptive-practice` 25/25 · `adaptive-simulation` 21/21 · `adaptive-reward-hardening` 41/41 · `my-day-home` 37/37 · `student-home` 61/61 · `arena-web` 56/56 · `tsc` 0 error · `lint` 0 violation · `build` (dummy env) 371/371 halaman, exit 0 · `git diff --check` bersih.

## Remaining (penentu verdict final)
1. **Re-run real sessions** saat kuota Groq pulih: `GROQ_API_KEY=<key> npm run qa:ai-diagnostic-8-4` → `npm run score:ai-diagnostic-8-4` → isi tabel manual §5–6 → umumkan verdict final.
2. Commit/push STEP 8.4 (+ 8.3, 7.5, 4E series) bila disetujui Founder.
3. (Opsional, additive) surface `usage` tokens di `GenerationOutcome` untuk pencatatan biaya presisi.