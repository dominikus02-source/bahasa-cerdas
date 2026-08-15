# PHASE 2 STEP 3H — MY DAY PERSONALIZATION

Version: `1.0` · Date: Aug 15, 2026 · Branch: `main`

## Goal
Evidence-based personalized practice yang jujur dan dapat diaudit: My Day di Beranda murid memilihkan satu aksi latihan dari bukti pembelajaran (`LearningEvidence` + `LearnerSkillState`), murid menjalankan sesi latihan personal, dan hasilnya kembali memperbarui bukti — tanpa mengubah UKBI/TKA, Premium billing, reward engine, atau LLM.

## Apa yang Berubah (Step 3H)

### Backend
| File | Perubahan |
|------|-----------|
| `lib/adaptive-practice/selector.ts` | `selectAdaptivePractice` mengembalikan `actionTitle` & `confidence` deterministik per reason code |
| `lib/adaptive-practice/types.ts` | Tipe payload diperluas: `actionTitle`, `ctaLabel`, `confidence`, `sessionSize` |
| `app/api/player/adaptive-practice/route.ts` | Tambah `GET ?mode=preview` (read-only My Day) dan `GET ?sessionId=` (snapshot sesi tanpa jawaban); `startSession(..., mode, userName)` dua mode; answer/complete dipagari pemilik sesi |

### Frontend (Student Home)
| File | Perubahan |
|------|-----------|
| `components/student-home/home-data.tsx` | Konteks tunggal: `myDay` (preview), `myDayLoading`, `myDayFailed`, `refreshMyDay`, `premium` |
| `components/student-home/ContinueLearningCard.tsx` | Rewrite: satu CTA dominan "Mulai Latihan Hari Ini/Perkuat …", mode FALLBACK jujur ↔ rute nyata, melempar `mentor` + `focusText` ke MentorCard, POST `start` |
| `components/arena/player/MentorCard.tsx` | Data My Day opsional (tanpa fetch kedua, tanpa engine rekomendasi sendiri) |
| `components/arena/player/SkillRadar.tsx` | Progress-only: props `skills/loading/failed` dari My Day, tanpa fetch, tanpa CTA |
| `components/student-home/PremiumValueCard.tsx` | Memakai konteks `premium` dari home-data |
| `app/(dashboard)/murid/beranda/page.tsx` | Hierarki: HERO → AKSI (+mentor) → SKILL+MOTIVASI+PREMIUM → PINTAS → RUANG → SIMULASI → KARYA |

### Halaman Sesi Latihan (baru)
`app/arena/adaptive-practice/[sessionId]/page.tsx` — fetch snapshot `GET ?sessionId=`, tampilkan soal tanpa answer key, kirim jawaban (`action: "answer"`), selesaikan sesi (`action: "complete"`), kembali ke Beranda (My Day ter-refresh otomatis).

### Kontrak & Audit
- `docs/PHASE_2_STEP_3H_MY_DAY_CONTRACT.md` — canonical response, deterministic titles, start contract.
- `docs/PHASE_2_STEP_3H_MY_DAY_PERSONALIZATION_AUDIT.md` — audit arsitektur sebelum implementasi.

## Keputusan Desain
1. **Jujur secaradefault**: mode `FALLBACK` (data belum cukup) menampilkan "Mulai Latihan Hari Ini" + tautan `/arena/jalur-cerdas`, tidak mengklaim adaptive.
2. **Server-authoritative**: client hanya mengirim `action` + `size`; skill/difficulty/question/user seluruhnya dari server (`getUser()`).
3. **Tanpa kebocoran jawaban**: snapshot sesi dan halaman latihan tidak memuat `correctAnswer`/`jawaban`; answer diverifikasi server-side.
4. **Satu konteks**: preview, premium, dan profil dibaca sekali di `home-data`; komponen tidak fetch duplikat.
5. **Deterministik**: `actionTitle`/`confidence` dari reason code — tidak ada `Math.random`.

## Verifikasi
| Check | Hasil |
|-------|-------|
| `test:my-day-personalization` (BARU) | ✅ 25/25 |
| `test:my-day-home` | ✅ 37/37 |
| `test:student-home` | ✅ 61/61 |
| `test:student-shell` / `student-consolidation` | ✅ 34/34 · ✅ 19/19 |
| `test:adaptive-simulation` / `adaptive-practice` | ✅ 21/21 · ✅ 25/25 |
| `test:learner-state` / `step3b-foundation` / `step3c-evidence` | ✅ 24/24 · ✅ 28/28 · ✅ 29/29 |
| `test:question-metadata` / `validate:question-metadata` | ✅ 24/24 · ✅ |
| `test:premium-production` / `premium-economy` | ✅ 24/24 · ✅ 63/63 |
| `test:gamification-engine` / `simulation-workflow` | ✅ SEMUA LULUS · ✅ All passed |
| `test:arena-web` / `arena-chat` / `arena-nav-theme` | ✅ ALL PASSED |
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (file diubah/baru) | ✅ 0 violations |
| `npm run build` (dummy env) | ✅ (lihat catatan build) |
| `git diff --check` | ✅ bersih |

## Catatan
- Prodak disebut **evidence-based personalized practice** (bukan "AI adaptive learning").
- Adaptive v1 hanya sumber `BANK_SOAL`; metadata `QuestionMetadata.status = APPROVED`; skill/difficulty tetap nullable.
- Migration `prisma/migrations/manual/*.sql` Phase 2 belum diterapkan ke production (jalankan di Supabase SQL Editor) — API adaptive menangani ketiadaan tabel dengan fallback yang aman.
- Belum di-push (pola fase: komit lokal, founder review).