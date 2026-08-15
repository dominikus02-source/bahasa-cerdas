# PHASE 2 STEP 3I — ADAPTIVE REAL DATA READINESS

Version: `1.0` · Date: Aug 15, 2026 · Branch: `main` · Status: AUDIT

## TASK 4 — Adaptive Real-Data Readiness

### Pintu masuk (kode tervalidasi, `app/api/player/adaptive-practice/route.ts`)
`startSession()` hanya menghasilkan mode `ADAPTIVE` bila SEMUA syarat berikut terpenuhi:

| # | Syarat | Sumber kode | Bukti | Status |
|---|--------|-------------|-------|--------|
| A1 | `questionMetadata` APPROVED + skill, source BANK_SOAL | `findMany({ source, status:"APPROVED", skill:{not:null} })` + `validateQuestionMetadata` guard | test-question-metadata 24/24 | ✅ FIXTURE |
| A2 | Soal `Soal.kodeSoal` match metadata questionId (`BC-*`) | `db.soal.findMany({ where:{kodeSoal:{in}} })` | 1500/1500 punya kodeSoal di bank; isi DB **UNVERIFIED** (DB tak bisa diakses) | ⚠️ DB |
| A3 | Lemma pelengkap: `text`, `options` array, type soal ternormalisasi cocok metadata.questionType | `normalizeSoalType` + guard | `PILIHAN_GANDA/BENAR_SALAH/ISIAN_SINGKAT` konsisten dengan taxonomy | ✅ |
| A4 | Seluler: `selectAdaptivePractice` menemukan kandidat setelah filter | `lib/adaptive-practice/selector.ts` | test-adaptive-practice 25/25 | ✅ FIXTURE |
| A5 | Evidence map (anti-repeat) sudah menjadi input selector | `upsertLearningEvidence` (upsert composite unique → retry-safe) | test-adaptive-simulation 21/21 | ✅ |
| A6 | Learner state tersedia (atau graceful 503 bila tabel belum ada) | `getLearnerState` + guard `P2021/P2022` | test-learner-state 24/24 | ✅ |

### Hasil penilaian REAL DATA (hari ini, data production yang diketahui)
- **Metadata APPROVED: 0** → A1 gagal → `startSession` selalu `fallbackResponse("INSUFFICIENT_METADATA")` → My Day preview = mode FALLBACK (href `/arena/jalur-cerdas`, label "Mulai latihan umum").
- Tidak ada `LearningEvidence`, `AdaptivePracticeSession`, atau `LearnerSkill` di production (0 aktivitas) — wajar karena A1 belum lolos.
- Bila founder set ≥1 metadata APPROVED dengan `kodeSoal` yang ADA di tabel `Soal` production → A1–A4 siap; verifikasi item 5/6 checklist DB diperlukan untuk konfirmasi objek­tif (UNVERIFIED dari repo).

### Rekomendasi (urut prioritas — tanpa menambah fitur)
1. Founder run SQL checklist (`docs/PHASE_2_STEP_3I_PRODUCTION_INTEGRATION.md` §TASK 2) → lapor hasil baris.
2. Founder set 5–10 metadata sample APPROVED yang kode soalnya terbukti ada di `Soal` production.
3. Test end-to-end: murid demo → My Day tersedia "Latihan Personal" → jawab → cek LearningEvidence 1 baris per soal → sesi COMPLETED → preview berikutnya reflek.
4. Baru bicara scaling review batch.

Final: ADAPTIVE REAL DATA = UNVERIFIED (gate fixture PASS; akses DB belum; data nyata kosong).

## TASK 5 — My Day Loop Audit

### Alur terverifikasi (kode)
`home-data.tsx` (GET preview) → `ContinueLearningCard` CTA → `POST start` (sesi IN_PROGRESS, expiresAt 30 menit) → `app/arena/adaptive-practice/[sessionId]/page.tsx` (soal dari `GET ?sessionId=`) → `POST answer` (SESI valid: pemilik, IN_PROGRESS, belum kedaluwarsa, soal ∈ session; nilai benar; catat evidence; tanpa bocor correctAnswer) → `POST complete` (updateMany guard status+expiry → idempoten) → kembali beranda → preview berikutnya membaca evidence (skill state berubah).

### Kualitas alur
| Aspek | Status |
|-------|--------|
| Sesi 30 menit + status guard | ✅ IN_PROGRESS/COMPLETED, 409 bila sudah berakhir |
| Jawaban ulang (retry network) | ✅ idempoten via upsert evidence (unique userId+source+activityId+questionId) |
| Anti-repeat (cooldown `ADAPTIVE_COOLDOWN_DAYS`, `seenAt`) | ✅ di selector; data kosong hari ini |
| Reward | ⚠️ `complete` TIDAK mencairkan XP/koin — lihat TASK 6 |
| Kembali dari sesi | ✅ router.push beranda; preview re-fetch (tanpa cache) |
| Gap UX (non-blocking) | Belum ada resume sesi yang dibatalkan tengah jalan (expires handled 409 + tombol Mulai lagi); estimator `estimatedMinutes` selalu null (belum ada heuristik) |

Final: MY DAY LOOP = GREEN (alur lengkap & aman, fixture PASS; real-data menunggu APPROVED).

## TASK 6 — Reward Loop Audit

| Aspek | Bukti | Status |
|-------|-------|--------|
| Client menentukan XP/koin? | Client hanya kirim `{action, sessionId, questionId, answer}` — server semua | ✅ Aman |
| Double reward pada repeat complete | `updateMany` status guard → count 0 → 409; tidak ada jalur reward kedua | ✅ Aman |
| Evidence authoritative | `upsertLearningEvidence` (update on conflict, `metadata.version` tercatat) | ✅ |
| Reward dicairkan? | `completeSession` TIDAK memanggil `awardXp`/`addCoin`/quest/trackAchievement | ⚠️ Belum ada |

**Kesimpulan:** reward loop AMAN (server-authoritative, idempoten, non-replayable) tetapi **belum terhubung** — sesi adaptive tidak memberi XP/koin. Sesuai keputusan audit Step 3I (tanpa fitur baru), integrasi reward didokumentasikan sebagai **next implementation** setelah real-data PASS:

> Next: di `completeSession` (setelah updateMany sukses) panggil best-effort `awardXp({source:"ARENA", reference: session.id, amount: min(10+banyakBenar×2, 50)})` + `coin`/quest/achievement — reference unik `session.id` menjamin non-replay, konsisten engine gamification (jangan `addXp` lama).

Final: REWARD LOOP = YELLOW (aman, belum rewarding; satu titik wiring yang jelas).

---

## Ringkasan Status 6 Area (Step 3I)
| Area | Status |
|------|--------|
| CODE | ✅ GREEN — push gate PASS (7 commit, semua regresi hijau) |
| DATABASE | ⚠️ UNVERIFIED — butuh checklist SQL founder |
| QUESTION METADATA | 🟡 YELLOW — fondasi solid; coverage 1%; 0 APPROVED |
| ADAPTIVE REAL DATA | ⚠️ UNVERIFIED → praktis RED sampai APPROVED ≥1 + Soal production cocok |
| MY DAY LOOP | ✅ GREEN — alur lengkap, aman; menunggu data |
| REWARD LOOP | 🟡 YELLOW — aman; wiring XP/koin = next implementation |

Keputusan phase: **audit selesai, berhenti di sini — tidak ada komit tambahan selain docs (3 file baru, non-kode).** Founder review: (1) jalankan SQL checklist, (2) set 5–10 APPROVED, (3) putuskan next implementation reward wiring.

## Deliverables
- `docs/PHASE_2_STEP_3I_PRODUCTION_INTEGRATION.md`
- `docs/PHASE_2_STEP_3I_QUESTION_METADATA_READINESS.md`
- `docs/PHASE_2_STEP_3I_ADAPTIVE_REAL_DATA_READINESS.md`