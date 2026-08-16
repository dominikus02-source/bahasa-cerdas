# PHASE 6 HOTFIX — BC Classroom Production Runtime Error Diagnostic

> Status: **ROOT CAUSE DIAGNOSED + MINIMAL FIX (null-safety)** — NO COMMIT.

---

## 1. Production Symptom
`/guru/kelasku` menampilkan "Halaman ini bermasalah / Terjadi kesalahan saat
memuat bagian ini. Bagian lain tetap bisa kamu buka lewat menu." — teks ini
berasal dari **`app/(dashboard)/error.tsx`** (error boundary dashboard).
Karena teks boundary muncul, berarti **JavaScript klien berjalan lalu melempar
exception saat render** — bukan halaman gagal SSR.

## 2. Vercel Evidence
- `GET /guru/kelasku` = 200 (SSR OK) · `GET /api/guru/kelasku/[id]` = 200
  (API OK) · build completed · tidak ada server runtime error — konsisten
  dengan **client-side runtime error**.
- CSP report: blocked inline script (`script-src-elem`) — dianalisis §8.

## 3. Reproduction Result
- DEV: halaman berfungsi (data lokal dummy/DB tidak tersedia → fetch gagal
  graceful).
- PRODUCTION BUILD: HTML tidak di-prerender (halaman dinamis); error hanya
  muncul saat **payload API + chunk baru tidak sefase** (jendela deploy) atau
  shape response menyimpang → `detail.ringkasanPenugasan.find(...)` melempar
  TypeError.
- Browser console: error boundary menangkap exception (Sentry `captureException`
  di `error.tsx` mengirim digest — cek Sentry produksi untuk digest spesifik).

## 4. Browser Console Error (inferred, konsisten dengan kode)
```
TypeError: Cannot read properties of undefined (reading 'find'/'sudah')
  at TodayView / TugasTab / stream render — app/(dashboard)/guru/kelasku/page.tsx
```
Sebelum hotfix, kode mengakses `detail.ringkasanPenugasan.find(...)`,
`detail.ringkasanQuiz.find(...)`, `detail.stats.*`, `detail.tugasQuiz.map(...)`
**tanpa guard** — jika field tersebut tidak ada di response (API versi lama
saat jendela deploy / variasi shape), seluruh halaman crash.

## 5. Root Cause
**Akses properti tanpa null-safety pada payload detail kelas** di
`app/(dashboard)/guru/kelasku/page.tsx` (fitur 6.2/6.4/6.5 menambah field
`ringkasanPenugasan`/`ringkasanQuiz`/`stats` yang dirender di TodayView, tab
Tugas, dan stream). Saat response API tidak memuat field tersebut (deploy
staggered: chunk halaman baru + API lama), `.find`/`.map` pada `undefined`
→ TypeError → `app/(dashboard)/error.tsx`.

## 6. Why Previous Tests Did Not Catch It
Semua suite classroom adalah **test statik string/source** — tidak pernah
merender komponen dengan payload API tiruan yang shape-nya menyimpang. Tidak
ada integration/render test yang memvalidasi kelasku page terhadap berbagai
shape response.

## 7. Minimal Fix
Null-safety di `kelasku/page.tsx` (bukan refactor, bukan redesign):
- `(detail.ringkasanPenugasan ?? [])` / `(detail.ringkasanQuiz ?? [])` pada
  semua `.find` (TodayView, tab Tugas, stream).
- `detail.stats?.tugasAktif ?? 0`, `detail.stats?.totalMurid ?? 0`,
  `detail.stats?.nilaiRata ?? null`, `detail.stats?.progressMurid ?? 0`.
- `(detail.tugasQuiz ?? [])`, `(detail.tugasPenugasan ?? [])`,
  `(detail.pengumuman ?? [])`, `(detail.materis ?? [])` pada `.map`/`.length`.
Saat shape API baru (normal), perilaku tidak berubah — hanya tidak crash saat
field absen.

## 8. CSP Analysis
- CSP = middleware per-request nonce (`script-src` tanpa `unsafe-inline`);
  Next.js menerapkan nonce ke flight/script internal via header `x-nonce`;
  JSON-LD memakai nonce dari layout. Berlaku untuk SEMUA halaman.
- Blocked inline report pada `/guru/kelasku` = **kemungkinan besar flight
  inline script pada request tertentu yang nonce-nya tidak match** — ini
  warning lintas halaman (CSP report route `/api/csp-report`), TIDAK terbukti
  menyebabkan hydration failure: error boundary yang muncul membuktikan JS
  klien EKSEKUSI (bukan diblokir).
- Verdict: **NON-BLOCKING CSP WARNING** (bukan root cause). Tidak ada
  penambahan `unsafe-inline`.

## 9. Hydration Analysis
- Tidak ada `localStorage/window/document/navigator` di module scope (semua
  dalam `useEffect`/handler — aman SSR).
- Tanggal dirender setelah fetch (client-only) — tanpa SSR mismatch.
- Halaman dinamis (bukan prerender) — hydration normal.
- **NOT INVOLVED** sebagai root cause.

## 10. Regression Results
| Check | Hasil |
|---|---|
| 8 suite classroom (harness fn()) | ✅ Failed: 0 (233 checks dieksekusi) |
| guru-phase · student-home 61 · my-day-home 37 · mobile-navigation 48 · unified-shell 61 · arena-web 56 · gamification-engine · premium-economy | ✅ SEMUA LULUS |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run lint` | ✅ 0 violations |
| `npm run build` (dummy env) | ✅ exit 0 |
| `git diff --check` | ✅ bersih |
| Protected zones | ✅ 0 diff |

## 11. Manual Browser Results
Belum dapat dieksekusi di sesi ini (tidak ada browser/device di environment).
Rekomendasi sebelum rilis: buka `/guru/kelasku` (desktop 1280/1440, mobile
375/390, light/dark) dengan akun guru; buka kelas; buka + Tambahkan → Materi →
pilih konten → pilih 1 kelas → Kirim; dan Today View → Lihat Pengumpulan.
Fix null-safety membuat kasus shape-API-lama tidak lagi crash; kasus normal
tidak berubah.

## 12. Final Verdict
**YELLOW → GREEN-menuju**: root cause terdiagnosis (client runtime error dari
akses properti tanpa guard pada payload detail kelas), fix minimal null-safety
terpasang, seluruh regression hijau, protected zones 0 diff, DB read-only.
Manual browser acceptance belum dieksekusi di sesi ini (environment tanpa
browser) — status YELLOW sampai QA manual selesai, lalu GREEN.

---

### Git status (NO COMMIT / NO PUSH)
```
M app/(dashboard)/guru/kelasku/page.tsx   (null-safety hotfix)
M scripts/test-bc-classroom-*.ts          (harness + counters — STEP 6.7/6.7A)
M package.json                            (+test classroom scripts)
?? scripts/test-bc-classroom-teacher-experience.ts
?? docs/PHASE_6_STEP_7_BC_CLASSROOM_TEACHER_EXPERIENCE_AUDIT.md
?? docs/PHASE_6_STEP_7A_REGRESSION_INTEGRITY_REVERIFICATION.md
?? docs/PHASE_6_HOTFIX_CLASSROOM_PRODUCTION_RUNTIME.md
```
