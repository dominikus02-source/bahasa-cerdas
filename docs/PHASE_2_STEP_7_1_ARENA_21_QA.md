# ARENA 2.1 — STUDENT UX & VISUAL QA

**Status:** SELESAI — TIDAK di-commit (menunggu Founder Review).

## Routes audited

- `/arena`
- `/arena/game`
- `/arena/player`
- `/arena/player/leaderboard`
- `/arena/player/badges`

Komponen yang diaudit: `GameHubClient`, `lib/arena/game-registry.ts`, `ArenaBackButton`, layout arena, `player-theme.css`, `player-dashboard`, `leaderboard-panel`, `badge-grid`, `page-shell`, `player-header`, `level-up-modal`.

## Problems found

**CRITICAL:**
- (tidak ada)

**HIGH:**
- Banner **RANK BC** (`/banners/rank-bc-banner.webp`, tautan ke `/arena/player`) hilang dari Game Hub sejak redesign 2.0 — murid tidak lagi melihat apa yang harus dicapai. → disematkan kembali.

**MEDIUM:**
- CTA hero `/arena` tertulis `Main Sekarang` sedangkan Game Hub memakai `MAIN SEKARANG` → diseragamkan `MAIN SEKARANG`.
- Subtext header tidak konsisten casing: `Naik level.` (home) vs `Naik Level.` (hub) → diseragamkan `Naik Level.`.
- Label quick access Game Hub `Prestasi` menunjuk route badge — terminologi tidak konsisten (aturan §30 pakai `Badge`) → diganti `Badge` / "Koleksi pencapaianmu".

**LOW:**
- `dark:bg-[#16122A]` di kartu Game Hub — surface gelap SEMANTIK (hanya aktif di dark mode; light mode tetap kartu putih). Aman di Light Mode; dipertahankan demi konsistensi internal hub.
- Quick progress home `grid-cols-3` di 375px padat, tetapi touch target tetap ≥44px; tidak ada overflow.
- Pills leaderboard (3 periode + 4 scope) di mobile memakai `flex-wrap` — tanpa scroll horizontal, teks terbaca.

## Changes

1. `components/arena/game-hub/GameHubClient.tsx` — section promo jadi `grid grid-cols-1 sm:grid-cols-2`: kiri = banner **RANK BC** (→ `/arena/player`, alt "naikkan peringkatmu", hover zoom), kanan = slideshow Kuis Tempur ↔ Teka-Teki Silang (tidak hilang).
2. `app/arena/page.tsx` — CTA hero → `MAIN SEKARANG`; subtext → `Naik Level.`.
3. `components/arena/game-hub/GameHubClient.tsx` — quick access `Prestasi`/`Koleksi badge` → `Badge`/`Koleksi pencapaianmu`.
4. `scripts/test-arena-web.ts` — +5 asersi (banner RANK BC ada + link benar; slide promo tetap; copy konsisten; label `Badge`; **dead-link check** semua href registry → route nyata).

## Removed

- Tidak ada yang dihapus (fase polish — prinsip "hapus yang tidak membantu", audit menemukan tidak ada elemen yang perlu dibuang di 5 route).

## Moved

- Tidak ada yang dipindah (informasi sudah di tempatnya: XP/rank di Profil, ranking di Leaderboard, badge di Badge, promo/rank di Game Hub).

## Theme fixes

- Tidak diperlukan perubahan: fase 2.0 sudah adaptive. Diverifikasi ulang — semua surface gelap yang tersisa hanya `dark:` variant (light mode 100% terang), kontras teks aman (slate-500 di light, `#7C7A9E` di dark), tanpa residual `bg-black`/`bg-[#0b...` di light.

## Navigation fixes

- Back button (dari 2.0): `router.back()` + fallback logis, label `Kembali` — diverifikasi direct-URL aman (`/arena/player`, `/arena/player/leaderboard`, `/arena/player/badges`, `/arena/game`): tidak pernah mengarah ke `/` atau dashboard.
- Tidak ada navigasi kedua yang duplikat; mobile tetap memakai `MuridMobileNav` global.

## Mobile fixes

- Diverifikasi 375/390/430/768px: leaderboard rows compact (rank/avatar/nama/XP) tanpa scroll horizontal; badge grid 3 kolom; game grid 2 kolom; pills kategori scroll horizontal dengan touch target ≥44px; tanpa overflow.

## Performance fixes

- Banner RANK BC = aset statis `public/` (bukan fetch baru); registry gim statis (0 request tambahan); tidak ada fetch leaderboard/badge/prestasi di halaman yang tidak membutuhkannya.

## Verification

- test:arena-web: **76/76** (sebelumnya 71; +5 asersi 2.1)
- TypeScript: **0 errors**
- ESLint: **0 errors**
- git diff --check: **bersih**
- no-emoji: **0 kegagalan**

## Protected zones

- `prisma/`, `lib/gamification/`, `lib/learning-loop/`, `engines/`, `lib/apk.ts`, `lib/xp.ts`, `lib/coins.ts`, `lib/award-xp.ts`, `app/api/`, `app/arena/bottom-nav.tsx` → **0 diff**. DB read-only, 0 migrasi.

## Final verdict

**PASS** — Arena 2.1 selesai: RANK BC kembali di Game Hub, copy konsisten, semua CTA tunggal & jelas, dead-link 0, tema light/dark paritas, back aman dari direct URL. Belum di-commit — menunggu review founder.
