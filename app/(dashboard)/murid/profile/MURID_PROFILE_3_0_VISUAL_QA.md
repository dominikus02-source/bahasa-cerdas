# MURID PROFILE 3.0 — VISUAL QA

> Fase: STEP AUDIT + IMPLEMENTASI MURID PROFILE 3.0 (Student Identity + Progress Hub)
> Tanggal: 19 Agustus 2026 · Status: **IMPLEMENTASI SELESAI — SEMUA GATE HIJAU** · Belum di-commit (menunggu Founder Review)

---

## STATUS

| Item | Status |
|------|--------|
| Audit STEP 2 | ✅ Selesai & dilaporkan (11 isu whitespace/hierarchy, 2 redundansi data) |
| Layout baru (`max-w-5xl`) | ✅ Diterapkan |
| Section Perkembanganmu (SkillRadar + Jalur Cerdas) | ✅ Diterapkan |
| Pencapaian Terkini ke atas grid | ✅ Diterapkan |
| Hero ringkas (social/likeSummary null, chip "Bergabung") | ✅ Diterapkan |
| ProfileMotto dihapus dari render | ✅ Diterapkan |
| API/DB baru | ❌ **0 API baru, 0 kolom baru, 0 migrasi** |
| Build (dummy env) | ✅ Compiled successfully in 48s |
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (2 file) | ✅ 0 violations |
| `git diff --check` | ✅ bersih |

## CONTENT WIDTH

Sebelum: `max-w-[1400px]` — kartu statistik meler tidak proporsional, baris aktivitas teregang.
Sesudah: `max-w-5xl` (1024px) — rasio konten premium mirip feed sosial, tidak ada grid 3-col yang tenggelam.

## WHITESPACE

- Bio duplikat dihapus (ProfileMotto tidak lagi dirender) — bio hanya sekali di hero.
- Statistik sosial duplikat dihapus — hero tidak lagi menampilkan Pengikut/Mengikuti/Total Like; angka satu sumber di `PlayerStatsGrid` (+ kartu Suka di profil publik tetap berfungsi).
- Jarak antar-section diperketat (`mb-6` seragam), section baru Perkembanganmu menyempil di antara status bar dan pencapaian.

## HERO

- Rank crest, XP bar animasi + `role="progressbar"`, streak, chip gelar & member number dipertahankan.
- Tambah **chip "Bergabung {bulan} {tahun}"** (icon `CalendarDays`, format `id-ID`) — menggantikan info bergabung yang hilang bersama Pebble.
- Prop `social={null}` dan `likeSummary={null}` — tanpa kerusakan wiring like (tombol Suka tetap di hero profil publik, W3 social-hardening tetap hijau).

## XP

- `PlayerStatusBar` utuh (Level/XP/Koin/Streak/Rank + strip lencana mini `max 5`) — tanpa nilai hardcode, langsung dari `/api/user/me` + player rank.

## STATS

- `PlayerStatsGrid` tetap satu sumber: **Karya** (`meta.stats.karyaCount ?? karyaList.length`), **Like** (`social.profileLikeCount`, fallback legacy `user.totalLikes`), **Pengikut/Mengikuti** (`social.followerCount/followingCount`) — test-profile-social-stats 13/13.

## SKILL

- `SkillRadar` (dari `/arena/player`, reuse beranda) dibungkus `bc-card-premium rounded-2xl` + `h-full`.
- Data dari `/api/player/skills` (getSkillProfile, best-effort) — loading/failed state internal komponen.
- Import `@/app/arena/player-theme.css` di halaman (token `--px-*`; pola sama dengan beranda murid).

## JALUR

- Card "Jalur Cerdas": 5 aktivitas journey terakhir (`journey.slice(0, 5)`, fetch `limit=100` existing) sebagai baris bullet+time relatif (`waktuLaluLite`), link "Buka →", CTA gradient violet "Lanjutkan Belajar" → `/arena/jalur-cerdas`.
- Empty state jujur: "Mulai belajar di Jalur Cerdas agar langkah belajarmu tercatat di sini."

## ACHIEVEMENT

- Section "Pencapaian Terkini" naik ke atas grid (sebelum Aktivitas) dengan `AchievementShowcase max={6}` + fetch `/api/player/badges` (W5 social-hardening tidak berubah).
- Empty state asli dipertahankan (bukan teks karangan).
- Link "Lihat Semua →" → `/arena/player/badges`.

## ACTIVITY

- Aktivitas Terbaru (`ActivityFeed`, `allHref=/arena/player/history?tab=xp`) + Aktivitas 30 Hari (`ActivityChart` WIB, total karya/aktivitas) — tetap di kolom main, tidak berubah.

## KARYA

- `FeaturedWorksGallery` tetap dengan `titleHref="/murid/karya"` dan `tulisHref="/murid/karya/tulis"` (test-karya-consolidation 40/40) — tombol hapus/filter/publish utuh.

## GRID & SIDEBAR

- Grid desktop: `lg:grid-cols-[minmax(0,1fr)_320px]` (sidebar 320px, turun dari 360px), `lg:items-start`, sidebar `lg:sticky lg:top-6`.
- Sidebar (urutan): **Kebun Kata** (naik ke atas, plus chip streak 🔥) → **Komunitas** (`SocialConnections` + weekly XP + likeNote; fallback card state) → **Lencana** (`BadgeShowcasePanel`, maks 9 + expand).

## RESPONSIVE

- Mobile: satu kolom (grid `md:grid-cols-2` → main 2-col, sidebar 2-col di bawah); tablet 2 kolom; desktop 2 kolom + sticky sidebar. Tidak ada lebar hardcoded minimum.

## ACCESSIBILITY

- `aria-label="Perkembanganmu"` pada section baru; waktu relatif memakai `<time>`; ikon dekoratif `aria-hidden`; XP bar `role="progressbar"` (existing).
- Kontras: memakai `bc-card-premium` + `ring-slate-900/10` + dark variant (token `--clr-*` sudah sinkron dengan sistem tema 8.x; test-theme-consistency (73/76) — 5 kegagalan **pra-eksis** di luar changeset (arena/page.tsx + GameHubClient surface, diagnostic/adaptive typography) — identik sebelum & sesudah perubahan (verifikasi `git stash`).

## PERFORMANCE

- Satu tambahan API per mount (`/api/player/skills`) — data kecil (7 skill), best-effort `try/fail` di `load()`; rendering ringan (2 kartu baru). Tidak ada waterfall baru (berjalan paralel dalam `Promise.all` existing).

## NEW API

Tidak ada — reuse: `/api/player/skills`, `/api/player/journey?limit=100`, `/api/player/badges`, `/api/player/profile`, `/api/murid/profile-meta`, `/api/user/me`, `/api/user/profile/{id}/social`, `/api/siswa/user/karya`.

## NEW DB

Tidak ada — 0 migrasi, 0 model/kolom.

## FILES CHANGED

| File | Perubahan |
|------|-----------|
| `app/(dashboard)/murid/profile/page.tsx` | Layout 3.0: max-w-5xl, Perkembanganmu (SkillRadar+Jalur), Pencapaian di atas, grid 320px, sidebar urut baru, hero props null, import player-theme.css, state `skills`, `jalurEntries`, `waktuLaluLite()`, ProfileMotto dihapus |
| `components/profile/ProfileHero.tsx` | + `CalendarDays` import, prop `joinedAt?: string \| null`, chip "Bergabung {bulan} {tahun}" |

## REGRESSION

| Suite | Hasil | Catatan |
|-------|-------|---------|
| `test-profile-social-stats` | ✅ 13/13 | #9–13 tidak berubah |
| `test-social-hardening` | ✅ 27/27 | W3/W5 tetap hijau |
| `test-karya-consolidation` | ✅ 40/40 | termasuk P9 titleHref/tulisHref |
| `test-my-day-home` | ✅ 37/37 | |
| `test-student-home` | ✅ 69/69 | |
| `test-student-shell` | ✅ 33/34 | 1 gagal pra-eksis (ThemeProvider di providers.tsx — baseline stash) |
| `test-unified-shell` | ✅ 60/61 | 1 gagal pra-eksis (baseline stash) |
| `test-theme-consistency` | ✅ 73/76 | 5 gagal pra-eksis di luar changeset (arena/GameHub surface + diagnostic/adaptive typography — baseline stash) |
| `npx tsc --noEmit` | ✅ 0 errors | |
| `npx eslint` (2 file) | ✅ 0 violations | |
| `npm run build` (dummy env) | ✅ Compiled in 48s | |

## RECOMMENDATION

1. **Commit & push** (setelah review founder): `feat: murid profile 3.0 — identity + progress hub (kompak, 0 API baru)` — stage HANYA `app/(dashboard)/murid/profile/page.tsx` + `components/profile/ProfileHero.tsx` (jangan `app/.DS_Store`, `.freebuff/`).
2. **Visual QA browser** disarankan di lingkungan dengan env asli (production/staging) untuk: perubahan warna card Jalur Cerdas, posisi chip Bergabung pada username panjang, dan dark mode section Perkembanganmu — semua invariant (kode) sudah lolos.
3. Lanjut backlog: TKA UTBK/Guru enrichment 30→150, game server revival, GameRoom SQL, UI game solo badge-score.