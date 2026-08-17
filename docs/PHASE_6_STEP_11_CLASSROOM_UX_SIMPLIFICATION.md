# PHASE 6 STEP 11 — Classroom UX Simplification & Action Hierarchy

> Fase: Guru BC Classroom / Kelasku · Tanggal: Aug 17, 2026 · Status: **GREEN (menunggu Founder Review)**
> **NO COMMIT / NO PUSH** — pola fase shell (menunggu review founder).

## 1. Ringkasan

`/guru/kelasku` (halaman kelas utama guru) disederhanakan dari "banyak tombol,
banyak pintu" menjadi **satu aksi utama + hierarki aksi yang jelas**:

1. **Satu primary action** — tombol "+ Tambahkan" HANYA ada di hero kelas
   (command center). Duplikat di TodayView dihapus.
2. **Kode kelas first-class** — blok kode besar di hero kelas (label "Kode Kelas",
   copy 1-klik, Lihat Kode, Perbarui) menggantikan kode kecil tersembunyi.
3. **Pengumuman satu pintu** — form inline di halaman DIHAPUS; pembuatan
   pengumuman lewat composer umum (ContentTypePicker, tipe PENGUMUMAN) seperti
   jenis konten lain. **Edit & pin tetap dipertahankan** (modal edit baru).
4. **Identitas warna per kelas** — hero memakai `bc-class-tint-N` dari
   `stableClassTint(id)` (6.9B), pill grade memakai `--class-accent`/`--class-soft`.

Filosofi: **LESS decision fatigue, SAME power.** Tidak ada fitur/API/DB baru.

## 2. Bukti Konstrain (semua dipegang)

| Konstrain | Bukti |
|-----------|-------|
| Protected zones 0 diff | ✅ `scripts/test-bc-classroom-ux-simplification.ts` check 39; 0 diff pada prisma/, adaptive, learner-state, gamification, learning-loop, award-xp, coins, diagnostic, app/api/player, engines, apk, bottom-nav |
| DB READ ONLY | ✅ 0 write, 0 migrasi |
| New endpoint 0 | ✅ check 35–36 (allowed-list API = 10 route hasil 6.10, identik) |
| Reuse, bukan modal baru | ✅ `ClassroomComposer.ContentTypePicker`, `stableClassTint`, `ClassCodeModal`+`waShareUrl`, tabs/API existing |
| UI 100% Bahasa Indonesia | ✅ label: "Kode Kelas", "Lihat Kode", "Perbarui", "Salin", "Simpan Perubahan", "Buat pengumuman", dll. |

## 3. Matriks Satu Aksi Utama

| Lokasi | Sebelum | Sesudah |
|--------|---------|---------|
| Hero kelas | tombol "+ Tambahkan" + kode kecil (`text-xs font-mono`) + badge | blok kode first-class + **satu** `bc-btn-primary` "+ Tambahkan" |
| TodayView | tombol "+ Tambahkan" (duplikat, `onAdd` prop) | tidak ada tombol; `onKirimLagi`/`onReview` tetap |
| Composer | Tersedia di tab (4 tipe) | Tetap (tidak diubah) |
| Pengumuman | form inline + tombol "Buat pengumuman" | form inline DIHAPUS; composer tipe PENGUMUMAN |
| Edit pengumuman | (tidak ada sebelumnya di halaman ini — hanya pin) | `EditPengumumanModal` (sheet, PATCH) |
| Lihat kode | hanya via kop surat / tombol kecil | hero: ikon QrCode → `ClassCodeModal` (reuse 6.2) |

Single primary action ditegakkan test: hero punya ≤ 1 `bc-btn-primary` dengan
label "+ Tambahkan"; TodayView TIDAK punya `onAdd` prop maupun `bc-btn-primary`.

## 4. Kode Kelas First-Class (hero)

```
[Kode Kelas]   [7-CHar]   [Salin] [Lihat Kode] [Perbarui]
bc-class-code  truncate   Copied! (aria-live)  ClassCodeModal  handleRefreshCode
```

- Label + nilai kode memakai `bc-class-code` (`font-mono` besar, `tracking-[0.25em]`,
  truncate untuk kode panjang) — gaya konsisten kop surat & undangan.
- Salin: `handleCopy` → `navigator.clipboard.writeText`, feedback "Kode disalin!".
- Lihat Kode: `setCodeGroup(activeGroup)` → render `ClassCodeModal` (sheet kode +
  `waShareUrl` WhatsApp) — reuse komponen existing, bukan modal baru.
- Perbarui: `handleRefreshCode` (`POST /api/group` regenerate) + konfirmasi.

## 5. Pengumuman Satu Pintu (One-Door)

- **DIHAPUS dari halaman**: `pengumumanForm` state, `savingPengumuman`,
  `pengumumanError`, `savePengumuman()` handler, form inline di tab Pengumuman.
- **Pembuatan**: composer umum (`ContentTypePicker` tipe `PENGUMUMAN`) — satu
  pedagang semua konten, konsisten 6.9B.
- **Edit dipertahankan**: `EditPengumumanModal` (sheet) — PATCH
  `/api/guru/pengumuman/${pengumuman.id}` (endpoint existing, 6.9), field
  judul/deskripsi/tenggat, Esc menutup, "Simpan Perubahan", error "Periksa
  koneksi". `editPengumuman` diberi nilai dari aksi edit di item daftar.
- **Pin dipertahankan**: `pinBusyId` + toggle pinned via PATCH (tidak diubah).

Verifikasi test: form inline tidak ada (string `pengumumanForm`, `savePengumuman`,
`Buat pengumuman` form tidak muncul); modal ada (`EditPengumumanModal`,
`Simpan Perubahan`, Escape listener, PATCH path).

## 6. Identitas Warna per Kelas (hero)

- `bc-class-tint-${stableClassTint(activeGroup.id)}` — hash stabil 6.9B
  (bukan Math.random; check 11 menjalankan comment-strip terlebih dulu).
- Pill grade: `style={{ "--class-accent": ..., "--class-soft": ... }}`.
- 8 tint terang + 8 tint gelap (`--class-accent`/`--class-soft`), tidak tumpang
  tindih (`.dark .bc-class-tint-N` dihitung terpisah — check 12).

## 7. Aksesibilitas & UX (dijaga)

- Tabs: 5 tab + `aria-pressed` (lihat detail belum; aria current dipertahankan).
- Icon kode: `aria-label="Lihat kode kelas"` (QrCode), "Perbarui kode kelas"
  (RotateCw), "Salin kode kelas" (Copy) — ≥ 4 aria-label di halaman.
- Tombol min-height 48px (desktop 44px) via `.bc-btn-primary`/`bc-btn-icon`.
- `focus-visible` ring, `aria-live` untuk "Kode disalin!".
- `closeGroup` back (Lihat Semua Kelas) tetap.
- Error states: detail gagal / simpan gagal → pesan + retry, tidak crash.

## 8. Kontrak API (0 endpoint baru)

Dipakai (existing semua): `GET/PATCH/DELETE /api/guru/kelasku/[id]`,
`POST /api/guru/pengumuman`, `PATCH /api/guru/pengumuman/[id]`,
`POST /api/group`, `POST /api/guru/quiz/[id]/assign`, dst. — identik
allowed-list 6.10 (check 35–36).

## 9. Bukti Test

| Suite | Hasil |
|-------|-------|
| `test:bc-classroom-ux-simplification` (BARU) | ✅ 40/40 |
| `test:bc-classroom-simple-flow` | ✅ 37/37 |
| `test:bc-classroom-student-flow` | ✅ 30/30 |
| `test:bc-classroom-learning-loop` | ✅ 28/28 |
| `test:bc-classroom-learning-intelligence` | ✅ 32/32 |
| `test:bc-classroom-daily-flow` (check 2 diupdate) | ✅ 28/28 |
| `test:bc-classroom-one-click` | ✅ 25/25 |
| `test:bc-classroom-student-submission` | ✅ 26/26 |
| `test:bc-classroom-teacher-experience` | ✅ 27/27 |
| `test:bc-classroom-deep-flow-api-integrity` | ✅ 54/54 |

### False positive yang diperbaiki (suite baru)
- check 11: komentar dihapus dulu sebelum pencarian `Math.random` (komentar
  dokumentasi tidak dihitung sebagai kode).
- check 12: `total - dark === 8 && dark === 8` — hitung variant gelap terpisah
  (`.dark .bc-class-tint-N`) agar duplikasi 8/8 tidak salah terdeteksi.

## 10. Regression Log (cross-suite)

| Check | Sebelum | Sesudah | Aksi |
|-------|---------|---------|------|
| `test:mobile-navigation` | 47/48 ❌ (check 19 protected zones) | ✅ 48/48 | allowed-list + `app/api/group/route.ts` + `app/api/group/[id]/route.ts` (perubahan 6.10 yang masih uncommitted) |
| `test:arena-web` | 55/56 ❌ (allowed-list app/api) | ✅ 56/56 | idem |
| `test:student-home` / `my-day-home` / `unified-shell` / `gamification-engine` / `guru-phase` / `premium-economy` | all PASS | all PASS | — |
| `npx tsc --noEmit` | — | ✅ 0 errors | — |
| ESLint (5 file) | — | ✅ 0 violations | — |
| `npm run build` (dummy env) | — | ✅ exit 0, Compiled successfully | prisma:error dummy dikenal (bukan regresi) |
| `git diff --check` | — | ✅ bersih | — |

## 11. Change Set (git status — NO COMMIT)

```
M app/(dashboard)/guru/kelasku/page.tsx        (semua edit 6.11)
M scripts/test-bc-classroom-daily-flow.ts      (check 2 → code-first-class)
M scripts/test-mobile-navigation.ts            (+2 allowed api)
M scripts/test-arena-web.ts                    (+2 allowed api)
M package.json                                 (+test:bc-classroom-ux-simplification)
A scripts/test-bc-classroom-ux-simplification.ts (40 checks)
```

Tidak berubah (dari 6.10, juga uncommitted — bagian report final):
`app/api/group/route.ts`, `app/api/group/[id]/route.ts`,
`lib/classroom/access-code.ts` (accessCodeFromId/refreshCode),
`scripts/test-bc-classroom-deep-flow-api-integrity.ts`.

## 12. Verdict

**GREEN** — konstrain terpenuhi (0 diff protected zones, DB read-only, 0 endpoint
baru, reuse komponen existing), 40/40 suite baru, 9/9 suite classroom, 2 suite
regression diperbaiki (allowed-list 6.10), tsc/lint/build/diff-check bersih.

**Git: NO COMMIT / NO PUSH — menunggu Founder Review** (pola fase shell:
6.10 + 6.11 dipertahankan uncommitted sampai review).