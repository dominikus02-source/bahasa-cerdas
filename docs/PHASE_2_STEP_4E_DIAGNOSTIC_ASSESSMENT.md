# PHASE 2 — STEP 4E: DIAGNOSTIC ASSESSMENT & ADAPTIVE PLACEMENT

**Status**: IMPLEMENTED — not committed (menunggu instruksi founder)
**Tanggal**: 15 Agustus 2026

---

## 1. Ringkasan

Tes Awal ("Kenali Kemampuanmu") yang jujur untuk murid tanpa riwayat belajar:
8–12 butir dari bank metadata APPROVED (5 kemampuan, kesulitan EASY→MEDIUM→HARD),
hasilnya profil baseline per-ability + placement level PROVISIONAL (L1–L12,
band Dasar/Menengah/Tinggi). Muncul di kartu "Aksi Hari Ini" beranda murid
sebagai CTA pertama ("Mulai Tes Awal") sebelum personalisasi latihan.

## 2. Konteks & Masalah Founder

- 5 soal yang sama berulang untuk murid baru (rotasi deterministik + cooldown 14 hari).
- Tidak ada penilaian awal: profil "personalize" dimulai dari NOL tanpa baseline.
- Muara personalisasi menyebut "kemampuanmu" padahal belum ada bukti.
- Ketergantungan berlebihan ke soal PILIHAN_GANDA.

## 3. Definisi (Part B spec)

| Mode | Apa | Kapan |
|------|-----|-------|
| DIAGNOSTIC | Tes awal akses kemampuan (evidence-only) | NO evidence di learner state |
| ADAPTIVE PRACTICE | Latihan personal (award XP, reference sesi) | Ada bukti/sesi berjalan |
| ONGOING ADAPTIVE | Lanjutan sesi yang masih IN_PROGRESS | Sesi belum kedaluwarsa |

Klien TIDAK pernah memilih mode — hanya endpoint yang memutuskan dari learner state.

## 4. Keputusan Reuse (tanpa migrasi)

`AdaptivePracticeSession` + `LearningEvidence` dipakai ulang; identitas sesi
diagnostik = `reasonCode = "DIAGNOSTIC"`. Tidak ada tabel baru, tidak ada
perubahan schema (audit membuktikan reuse aman; 0 diff di `prisma/`).

## 5. Alur Pengguna

1. Murid baru login → beranda "Aksi Hari Ini" menampilkan preview DIAGNOSTIC
   (judul "Kenali Kemampuanmu", CTA "Mulai Tes Awal") karena belum ada evidence.
2. Klik → POST `start` → sesi 10 butir (allowed 8/10/12), tanpa duplikasi,
   tanpa soal yang baru terlihat; jawaban dicocokkan server-side.
3. Selesai → POST `complete` → panel hasil: akurasi keseluruhan, placement band
   L1–L12 (PROVISIONAL), rincian per kemampuan (Kuat/Berkembang/Perlu
   Banyak Latihan/Belum Cukup Bukti).
4. Latihan berikutnya (adaptive) kini punya baseline nyata dan alur kembali ke
   "Aksi Hari Ini".

## 6. Konfigurasi (`lib/diagnostic/config.ts`)

- `DIAGNOSTIC_ALLOWED_SIZES = [8, 10, 12]`, `DIAGNOSTIC_DEFAULT_SIZE = 10`,
  `DIAGNOSTIC_MIN_ITEMS = 8`, `DIAGNOSTIC_SESSION_MINUTES = 30`.
- `DIAGNOSTIC_SKILL_PRIORITY = [READING, GRAMMAR, VOCABULARY, LITERATURE, WRITING]`
  — LISTENING/SPEAKING tidak diikutkan (produksi belum punya aset audio).
- `DIAGNOSTIC_DIFFICULTY_CYCLE` round-robin EASY/MEDIUM/HARD
  (proporsi per 10 butir: 3/4/3), jujur bila sel kosong.
- `DIAGNOSTIC_PLACEMENT_BANDS`: DASAR L1–L4 (0–0.69), MENENGAH L5–L8 (0.70–0.84),
  TINGGI L9–L12 (0.85–1.0).
- `DIAGNOSTIC_PROFILE_THRESHOLDS`: STRONG ≥ 0.8, DEVELOPING ≥ 0.6.

## 7. Selector (`lib/diagnostic/selector.ts` — PURE)

- Pool terbatas → null bila < 8 butir (fallback jujur; API → 503
  DIAGNOSTIC_UNAVAILABLE, tanpa fabrikasi).
- Anti-duplikat questionId; anti-pengulangan soal yang baru terlihat
  (novelty: unseen > yang sudah 14+ hari).
- Spread skill + kesulitan deterministik (tie-break id) — input sama,
  hasil sama.

## 8. Profil & Placement (`lib/diagnostic/profile.ts` — PURE)

- `INSUFFICIENT_EVIDENCE` ≠ `WEAK`: akurasi tak terhitung → "Belum Cukup
  Bukti", bukan "lemah" (Part I).
- Placement SELALU `provisional: true` karena satu sesi tidak cukup untuk
  level final (Part J); copy UI menyebut "sementara".

## 9. API (`/api/player/diagnostic`) — server-authoritative

- `GET ?mode=preview` — NO evidence → actionType DIAGNOSTIC ("Kenali
  Kemampuanmu"/"Mulai Tes Awal"); ada evidence → GENERAL_LEARNING; pool tak
  cukup → 503 (home jatuh ke adaptive preview, tanpa bertingkah).
- `GET ?sessionId=` — payload read-only (tanpa answer key; soal diseleksi
  tanpa `correctAnswer`).
- `POST` dengan action `start` (rate-limited), `answer`, `complete`.
- Semua akses sesi: `where: { id: sessionId, userId }`; sesi non-DIAGNOSTIC
  ditolak 403; kedaluwarsa → 409; jawaban dicocokkan ke
  `Soal.correctAnswer` server-side; evidence via `upsertLearningEvidence`
  (composite unique → idempoten).

## 10. Rate Limit

`rateLimitRoute(req, { maxRequests: 5, windowSeconds: 1800, identifier: "bca-diagnostic-start" })`
hanya pada action `start` (sesi-scoped, bukan IP), pola konvensi 4D.

## 11. Part N — Tanpa Reward

Diagnostik = evidence-only: TIDAK ada `awardXp`, `addCoin`, `awardCoins`.
Tidak ada sumber XP baru; murid yang mengulang tes tidak mengumpulkan apa pun.

## 12. UI

- `app/arena/diagnostic/[sessionId]/page.tsx` — alur sesi + panel hasil
  (akurasi, band L1–L12 + bendera PROVISIONAL, rincian per kemampuan,
  CTA Jalur Cerdas/Arena).
- `ContinueLearningCard.tsx` — branch DIAGNOSTIC: eyebrow "Kenali
  Kemampuanmu", CTA "Mulai Tes Awal" → POST start → `/arena/diagnostic/{id}`;
  branch ADAPTIVE tidak berubah ("Aksi Hari Ini").
- `home-data.tsx` — union `actionType` + "DIAGNOSTIC"; preview diagnostic
  di-fetch hanya di sini (konstrain test-my-day-home check 16).

## 13. Copy

Seluruh label Bahasa Indonesia; kalimat jujur ("Tes singkat ini memetakan
kemampuanmu dulu — tanpa nilai benar-salah yang merugikan", "hasil ini
bersifat sementara").

## 14. Part R — Audit Pool Nyata (read-only, 15 Aug 2026)

```
approved metadata : 87   (semua BANK_SOAL, status APPROVED)
matching Soal     : 87   (0 yatim) | unique question : 87 | duplikat: 0
tipe soal         : PILIHAN_GANDA 79, BENAR_SALAH 4, ISIAN_SINGKAT 4, CONSTRUCTED 0
Sel sehat (≥8)    : 0 per skill×diff (5–6 kandidat/sel) — cukup lintas-sel
ZERO              : LISTENING & SPEAKING (semua diff), VERY_HARD (bank tak mendefinisikan)
Kesimpulan        : pool HONEST (87 ≥ 8) — sesi 10 butir tanpa duplikasi BISA
```

## 15. Check & Verifikasi

- `test:diagnostic-assessment` — 34/34 ✓ (baru)
- `test:my-day-home` 37/37, `test:adaptive-practice` 25/25,
  `test:adaptive-reward-hardening` 41/41 (4D tetap GREEN), `test:learner-state` 24/24 ✓
- `npx tsc --noEmit` 0 error; lint 0 violation; build dummy env 368 routes;
  `git diff --check` bersih (lihat lembar verifikasi lengkap di akhir sesi).

## 16. Protected Zones (0 diff)

`prisma/`, `lib/gamification/`, `lib/learning-loop/` engine inti,
`lib/award-xp.ts`, `lib/coins.ts`, `app/api/player/adaptive-practice/route.ts`
(4D), leaderboard, UKBI/TKA, Jalur Cerdas, Premium — TIDAK disentuh.

## 17. Keputusan Ditunda/Ditolak (jujur)

| Perihal | Status |
|---------|--------|
| LISTENING/SPEAKING diagnostik | DITOLAK — 0 aset audio produksi; laporan Part R mencatat ZERO |
| VERY_HARD | DITOLAK — bank tidak mendefinisikan level itu (jangan dipaksa) |
| Soal CONSTRUCTED | DITOLAK — butuh grading terpisah; di luar lingkup tes awal |
| Reward koin diagnostik | DITOLAK — konsisten keputusan founder (deferred 4D) |
| Migrasi schema | TIDAK DIPERLUKAN — reuse terbukti aman (audit) |

## 18. Konvensi yang Dipertahankan

- 4D reward flow utuh: 2 call `await awardXp(` di adaptive route, gate
  coverage, rate limit `ADAPTIVE_START_RATE_LIMIT` — test 4D 41/41 GREEN.
- Preview fetch ≤ 1 tempat (home-data.tsx) — konstrain check 16.
- Error handling best-effort; kategori Bahasa Indonesia penuh.

## 19. Limitasi & Risiko

- Sesi 10 butir lintas-sel: per-skill hanya 5–6 butir → placement adalah
  pestimasi kasar (makanya PROVISIONAL).
- Pool 87 kandidat; sesi-sesi berikutnya untuk siswa yang sama akan mulai
  menyentuh soal yang pernah terlihat (cooldown 14 hari) — baru relevan
  setelah ≥ ~8 sesi per user.
- 503 DIAGNOSTIC_UNAVAILABLE saat pool/metadata tidak siap — UX jatuh ke
  adaptive preview (aman, jujur).
- Belum ada duplicate-session guard: user bisa membuka >1 sesi diagnostik
  IN_PROGRESS (jawaban masuk evidence yang sama; tanpa reward, tidak
  berbahaya; di luar lingkup).

## 20. Cara Menambah/Menjaga

- Tambah soal: dokumen metadata APPROVED lewat pipeline 4B (script approve) —
  selector membaca otomatis; `check:diagnostic-pool` memverifikasi.
- Ubah aturan: edit `lib/diagnostic/config.ts` + `selector.ts` (pure) saja;
  jalankan ulang `test:diagnostic-assessment`.

## 21. Files

- BARU: `lib/diagnostic/{config,selector,profile,types}.ts`,
  `app/api/player/diagnostic/route.ts`,
  `app/arena/diagnostic/[sessionId]/page.tsx`,
  `scripts/test-diagnostic-assessment.ts`, `scripts/check-diagnostic-pool.ts`
- DIUBAH: `components/student-home/home-data.tsx` (union + preview),
  `components/student-home/ContinueLearningCard.tsx` (branch),
  `package.json` (2 script)

## 22. Perintah

```
npm run test:diagnostic-assessment   # 34 check (statis)
npm run check:diagnostic-pool        # Part R (read-only; tanpa DB → exit 0)
```

## 23. Status & Langkah Berikut

- Status: IMPLEMENTED, belum di-commit/push (menunggu instruksi founder;
  pola fase-fase shell 4.x–5.x).
- Langkah berikut usulan: (1) founder review; (2) commit `feat:` + push bila
  disetujui; (3) enrichment metadata (LISTENING + lebih banyak BENAR_SALAH/
  ISIAN_SINGKAT per sel) untuk variasi sesi lebih lama; (4) duplicate-session
  guard bila diinginkan.