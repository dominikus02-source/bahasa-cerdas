# BC ARENA WEB 2.0 — Audit & Arsitektur

> Fase: STEP 4 — Arena Web 2.0: Redesign `/arena` dari dasbor berorientasi APK menjadi Web Student Gamification Hub.
> Tanggal: 12 Agustus 2026. Prinsip: **ADDITIVE ONLY** — engine/proteksi APK/auth tidak diubah; web hanya presentasi.

## 1. Arsitektur Saat Ini

`/arena` adalah scope eksklusif Android APK (TWA) sekaligus web. Layout `app/arena/layout.tsx`:

- **Gerbang auth**: `RUTE_TANPA_GERBANG = "/arena/login"` dirender bare (tanpa chrome) supaya APK bisa login tanpa keluar scope; selain itu `getUser()` → redirect `/arena/login`; role non-MURID/GURU/founder → `/guru/beranda`.
- **Mode pratinjau guru**: GURU (non-founder) boleh mengintip arena; tombol dasbor menunjuk `/guru/beranda`.
- **APK detection**: `isApk()` membaca cookie `bc_apk` (diset middleware dari `?src=apk`). Dalam APK: tombol "Dasbor" dan "Logout" disembunyikan (escape hatch keluar scope dianggap buruk); BottomNav 5 tab tetap tampil.
- **Chrome**: header desktop (`hidden md:flex`, nav 6 item) + mobile top bar (`md:hidden`, tanpa nav — hanya logo, Dasbor, HeaderActions, Logout) + `BottomNav` (client, `md:hidden`, 5 tab).
- **Wrapper**: `arena-theme min-h-screen bg-gray-50 pb-20 md:pb-0 dark:bg-slate-950`, `main max-w-lg md:max-w-4xl`.

## 2. Route Map `/arena` (per 12 Agustus 2026)

| Route | Fungsi | Status |
|-------|--------|--------|
| `/arena` | Beranda arena (akan di-redesign) | WEB 2.0 |
| `/arena/login`, `/arena/register` | Auth APK (exempt dari gate) | Proteksi APK |
| `/arena/gabung-kelas` | Gabung kelas lewat kode | Tetap |
| `/arena/misi` | Misi harian + klaim | Tetap |
| `/arena/league` | Liga (harian/mingguan/hall of fame) | Tetap |
| `/arena/game` + `/game/{kuis-tempur,menara,irama-kata,benar-salah,petualangan-kata,kata-play,tebak-kata,susun-kata,lari-kata,adu-cepat,tantang}` | Hub gim + semua gim | Tetap |
| `/arena/jalur-cerdas` + `[unitId]` + `[unitId]/lesson` | Jalur belajar | Tetap |
| `/arena/materi` | Materi | Tetap |
| `/arena/simulasi/{ukbi,tka,bigt,hasil}` | Simulasi & ujian | Tetap |
| `/arena/toko-koin` | Toko hadiah koin | Tetap |
| `/arena/mystery-box` | Kotak misteri | Tetap |
| `/arena/ai` | AI Cerdik (asisten) | Tetap |
| `/arena/feed` + `feed/[id]` | Karya (social) | Tetap (nav global) |
| `/arena/chat` | Obrolan | Tetap (nav global) |
| `/arena/player` + `/{profile,badges,achievements,leaderboard,history,notifications}` | Pusat pemain | Tetap (tanpa nav arena; diakses dari kartu home) |
| `/arena/profile/[id]` | Profil publik murid | Tetap |

## 3. Component Map

- **Shell**: `arena-client.tsx` (ArenaClientWrapper), `bottom-nav.tsx` (BottomNav — APK-oriented), `HeaderActions`, `LogoutButton`, `ActiveBoostBanner`, `SwRegister`.
- **Home saat ini**: `pembelajaran-card.tsx` (PembelajaranCard — tugas+materi), `league-mini.tsx` (LeagueMini — top5 harian/mingguan).
- **Gamification (reusable)**: `components/arena/player/` — `NextActionCard` (client, self-fetch `/api/player/next-action`), `leaderboard-panel.tsx` (client, podium+daftar, tab Global/Sekolah/Kelas × Semua Waktu/Mingguan/Musim, prop `compact`), `badge-grid`, `achievement-grid`, `rank-card`, `xp-progress-bar`, `WeeklyCountdown`, `MentorCard`, `SkillRadar`, `daily-quest-card`, `ui.tsx` (GlassCard dsb — memakai var `--px-*` player-theme). `components/gamification/` — `RankChip`, `RankIcon`, `BadgeIcon`, `PlayerCard`, `RankUpModal`.
- **Engine (protected, read-only)**: `lib/gamification/` (17 file) — `getLeaderboard({scope,period,userId,groupId,province,limit})` (cache 60s, key berperiode), `listUserBadges` → `BadgeView{progress,unlocked}`, `listAchievements` → `AchievementView{progress,completed,claimed}`, `getWeeklyCompetition`, `getLevelProgress`, `rankFromLevel`, `weekKey`; `lib/learning-loop/` (8 file) — `getNextAction`.

## 4. Duplikasi UI (yang harus dihilangkan dari home arena)

| Section home saat ini | Duplikat dari | Keputusan |
|-----------------------|---------------|-----------|
| PembelajaranCard (tugas+materi) | Beranda murid (Ruang Belajar) | HAPUS dari home |
| Kartu Jalur Cerdas (progress belajar) | Beranda murid (learning journey) | HAPUS |
| Simulasi dan Ujian (4 kartu) | Beranda murid (SimulasiUjianSection) | HAPUS |
| Aksi Cepat: Tulis Karya, Gabung Kelas | Beranda murid (RecentWorks/karya global) | HAPUS |
| Statistik Kamu (karya/tingkat/streak/koin) | Profil murid | GABUNG ke hero (ringkas) |
| LeagueMini (top 5) | Digantikan papan peringkat resmi | GANTI LeaderboardPanel |
| Misi Harian | Tetap (milik arena) | PERTAHANKAN (seksi C) |

## 5. Zone Terproteksi (TIDAK disentuh)

- `prisma/**`, `prisma/migrations/**` — nol perubahan.
- `lib/gamification/**`, `lib/learning-loop/**`, `lib/coins.ts`, `lib/award-xp.ts` — hanya dipanggil.
- Auth: `lib/supabase/server.ts` `getUser()`, gate layout, `RUTE_TANGA_GERBANG`, cookie `bc_apk`, `isApk()` — perilaku tidak diubah.
- Route APK: `/arena/login`, `/arena/register`, semua route `/arena/*` — tidak ada yang dihapus/redirect.
- Premium Economy, Kuis Tempur, Liga mechanics — tidak diubah.
- BottomNav `bottom-nav.tsx` — TIDAK dihapus, hanya digate `{apk && <BottomNav />}` di layout (APK tetap memakainya; web memakai global student nav + subnav arena).

## 6. Arsitektur Web 2.0 yang Direkomendasikan (diterapkan)

1. **Subnav arena** (6 item, desktop header + strip mobile): Arena `/arena` · Misi `/arena/misi` · Liga `/arena/league` · Gim `/arena/game` · Peringkat `/arena/player/leaderboard` · Koleksi `/arena/player/badges`. Menghilangkan Beranda/Karya/Obrolan/Pemain (duplikat global).
2. **Home 8 seksi**: (A) Hero ringkas (avatar, nama, rank, tingkat, XP, koin, progress bar, "Lihat Profil" → `/murid/profile`) · (B) Aksi Berikutnya (`NextActionCard`) · (C) Misi Hari Ini (+`Lihat Semua Misi`) · (D) Liga (kompetisi mingguan + countdown + gap) · (E) Gim — satu kartu Kuis Tempur (`BattleCard`) · (F) Papan Peringkat (`LeaderboardPanel compact` + tab Teman baru) · (G) Pencapaian (lencana kompak + progress) · (H) Koleksi & Hadiah (koin, Toko Koin, achievement) + banner AI BC kontekstual → `/arena/ai`.
3. **Mobile web ≠ APK**: BottomNav hanya untuk APK; web mobile mendapat strip subnav horizontal + tombol "Dasbor" (sudah ada).
4. **Tema**: ikut global light/dark (token semantik + `dark:` variant di semua kartu baru); hero gradient violet dipertahankan (aman di kedua mode); tidak ada warna gelap-only.
5. **Responsive**: `max-w-5xl` (≈1200px) desktop, grid 2 kolom `lg:`, stack di mobile; touch ≥44px (`arena-btn`/`h-11`); tanpa overflow horizontal.

## 7. Risk Assessment

| Risiko | Level | Mitigasi |
|--------|-------|----------|
| Menghapus BottomNav dari web memutus navigasi mobile arena | Rendah | Subnav strip mobile baru + tombol Dasbor (web-only) + global MuridMobileNav punya tautan Arena |
| APK kehilangan navigasi | Tidak ada | BottomNav tetap dirender saat `isApk()` |
| Home kehilangan konteks belajar (tugas/jalur) | Disengaja | Tersedia di Beranda murid global; arena = gamifikasi |
| `listUserBadges` mahal per-request | Sedang | Sama dengan halaman badges existing; acceptable |
| Papan peringkat 4 scope = 4 query | Sedang | `getLeaderboard` cache 60s + `limit 20`; panel client hanya memuat tab aktif |

## 8. Verifikasi

- `npm run test:arena-web` (baru, 20 checks)
- Regresi: `test:student-shell`, `test:student-home`, `test:student-consolidation`, `test:premium-economy`, `test:gamification-engine`, `test:social-hardening`, `test:global-works-discovery`
- `npx tsc --noEmit`, `npm run build` (dummy env), `git diff --check`
- Scope guard: `git diff --name-only` bebas dari `prisma/`, `lib/gamification/`, `lib/learning-loop/`
- Visual QA 390/768/1024/1440
