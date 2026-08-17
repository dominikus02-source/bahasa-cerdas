# PHASE STEP 7 — ARENA 2.0: Light/Dark Adaptive + Simple Student UX

**Status:** SELESAI — menunggu Founder Review (pola fase; belum di-commit).

## Goal (misi founder)

Redesign & audit seluruh pengalaman Arena (`/arena`, `/arena/game`, `/arena/player`, `/arena/player/leaderboard`, `/arena/player/badges`) menjadi **satu produk utuh** yang sepenuhnya mengikuti Light/Dark Mode BahasaCerdas, ringan, mudah dipahami murid, dengan prinsip **ONE SCREEN = ONE JOB**: Gim = bermain, Profil = perkembangan, Leaderboard = kompetisi, Badge = pencapaian dari Profil.

## Root cause yang ditemukan (audit)

1. **Zona player (`.px-theme`) hardcoded dark navy di kedua mode** — `/arena/player/*` menampilkan navy premium bahkan saat user memilih Light Mode. Inilah akar masalah "Arena tetap gelap di Light Mode".
2. **`/arena` root = dashboard 555 baris** berisi 8 seksi (hero + Kuis Tempur dark zone + Misi/Liga/Gim + kompetisi + leaderboard + reward/badge/prestasi) — melanggar prinsip one-screen-one-job dan memuat banyak query berat per kunjungan.
3. **Tombol kembali global = `← Beranda`** (hardcode ke `/murid/beranda`) — user kehilangan konteks Arena.
4. **`bg-black/20|40|25`, `bg-white/[0.04|0.05]`, `text-rose-300`, `bg-[#0b1330]`** tersebar di komponen player — rusak saat zona menjadi light.

## Keputusan desain

1. **Token tanpa mengubah engine**: zona player memakai CSS vars `--px-*`. Cukup tambah varian `.px-theme-adaptive` (light) + `.dark .px-theme-adaptive` (navy) + token `--px-track` — semua komponen px ikut tanpa edit satu per satu. `PlayerTheme` kini memakai varian ini. `.px-theme` base dan `.px-theme-app` (beranda murid) TIDAK disentuh.
2. **`/arena` = Arena Home**: header (Arena + "Mainkan. Belajar. Naik level." + avatar), hero "Selamat datang kembali, {nama}" dengan SATU CTA **MAIN SEKARANG** → `/arena/game`, quick progress HANYA Level/XP/Rank, menu HANYA 3 (Gim/Profil/Leaderboard). Side-effect `trackDailyStreak` dipertahankan; `SiaranBanner` tetap. Semua fetch berat (quest/kompetisi/badge/prestasi/leaderboard) dihapus dari home — tetap hidup di route masing-masing.
3. **`ArenaBackButton`** (baru): `router.back()` (history) dengan fallback logis per route — `/arena/game/*` → `/arena/game`, `/arena/player/*` → `/arena/player`, `/arena/game` → `/arena`, lain → `/arena`. Label **Kembali**, bukan Beranda. Dipasang di header layout arena menggantikan `BackHome` (APK tetap tanpa tombol — tidak berubah).
4. **Player** = profil sederhana: `PlayerHeader` (avatar/nama/rank/level/XP + progress bar) + 3 nav cards (Leaderboard/Badge/Riwayat) + tautan tersier Prestasi/Notifikasi. DailyQuest/WeeklyChampion/AchievementGrid/BadgeGrid/LeaderboardPanel/NotificationCenter TIDAK lagi dijejalkan ke profil (tetap di route masing-masing).
5. **Leaderboard**: judul "Leaderboard" + subjudul "Lihat posisi kamu dan teman-temanmu.", strip **"Posisi kamu #N · X XP"** untuk pemain di luar podium (dari data existing `isMe`, tanpa API baru).
6. **Badge**: judul "Badge Saya" + subjudul, `showProfile={false}` (tanpa header profil besar), empty state actionable **"Belum ada badge — Mainkan Gim"** → `/arena/game`, kartu locked/unlocked jelas.
7. **Kontras & tema**: `bg-black/*` → token `--px-track`/`--px-glass`; `text-rose-300` → `rose-500 dark:rose-300`; `level-up-modal` kartu `bg-white dark:bg-[#0b1330]` + teks tema-aware.
8. **Tidak menyentuh**: gameplay, XP/koin/rank engine, leaderboard engine, quest/badge/achievement/season system, game APIs/routes, DB (read-only), `bottom-nav.tsx` (APK), `app/api/*`, `prisma/`, `lib/gamification/*`.

## Files

| File | Aksi |
|------|------|
| `app/arena/page.tsx` | REWRITE → Arena Home (header/hero/quick progress/menu 3) |
| `app/arena/layout.tsx` | Header: `BackHome` → `ArenaBackButton` (label Kembali, history + fallback) |
| `components/arena/ArenaBackButton.tsx` | BARU — back router history + fallback logis per route |
| `app/arena/player-theme.css` | +`.px-theme-adaptive` (light) & `.dark .px-theme-adaptive` (navy), `--px-track`, lb-* adaptive, px-card/btn/chip/skeleton light |
| `components/arena/player/player-theme.tsx` | Pakai `px-theme px-theme-adaptive` |
| `components/arena/player/player-dashboard.tsx` | REWRITE → header profil + 3 nav cards + tautan tersier |
| `components/arena/player/page-shell.tsx` | +prop `showProfile` (default true; badges=false) |
| `components/arena/player/leaderboard-panel.tsx` | +strip "Posisi kamu", error color tema-aware |
| `components/arena/player/badge-grid.tsx` | +empty state CTA Mainkan Gim; kartu token `--px-glass` |
| `components/arena/player/level-up-modal.tsx` | Light/dark variant (kartu putih di light, navy di dark) |
| `components/arena/player/player-header.tsx` | Kontras streak (orange-600 light / orange-300 dark) |
| `components/arena/player/{achievement-grid,badge-grid,daily-quest-card,history-tabs,profile-tabs,streak-card,learning-feedback,notification-center,xp-history-timeline,coin-history-timeline}.tsx` | Token `--px-track`/`--px-glass`, error color tema-aware |
| `app/arena/player/leaderboard/page.tsx` | Judul "Leaderboard" + subjudul baru |
| `app/arena/player/badges/page.tsx` | Judul "Badge Saya" + subjudul baru + `showProfile={false}` |
| `app/arena/player/page.tsx` | Hapus prop `avatar` redundan (PlayerHeader pakai profile.avatar) |
| `scripts/test-arena-web.ts` | UPDATE + 15 asersi baru (69 → 71 checks) |
| `docs/PHASE_2_STEP_7_ARENA_2.md` | Laporan ini |

## Verifikasi (semua lulus)

| Check | Hasil |
|-------|-------|
| `npm run test:arena-web` | ✅ 71/71 (tema adaptive, back button, home sederhana, badge/leaderboard baru, protected zones 0 diff) |
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (13 file diubah) | ✅ 0 errors (3 warning `<img>` pra-fase) |
| `test:no-emoji-icons` | ✅ 0 kegagalan |
| `git diff --check` | ✅ bersih |
| Protected zones (prisma/, gamification, learning-loop, engines, apk, coins, award-xp, app/api, bottom-nav) | ✅ 0 diff |
| DB | READ ONLY — 0 write, 0 migrasi |

## Remaining

1. Commit/push setelah Founder Review
2. TKA UTBK/Guru enrichment 30 → 150
3. Game server revival (VPS mati)
4. GameRoom migration SQL via Supabase dashboard
5. UI game solo: badge-score client vs server masih beda (kosmetik)
6. SQL `2026-08-02_no_absen.sql` & `2026-08-08_school_identity.sql` (Production + Preview)
