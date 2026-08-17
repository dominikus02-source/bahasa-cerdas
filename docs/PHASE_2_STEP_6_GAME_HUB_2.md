# PHASE 2 · STEP 6 — ARENA GAME HUB 2.0 (Game Launcher BahasaCerdas)

**Tanggal:** Aug 17, 2026 · **Status:** NOT COMMITTED — menunggu Founder Review (pola fase shell)

---

## 1. Misi

Redesign total `/arena/game` dari "dashboard gamifikasi" menjadi **FULL GAME HUB**:

> Ketika murid masuk `/arena/game`, mereka langsung merasa sedang masuk ke pusat permainan BahasaCerdas — game launcher / arcade / App Store game section, BUKAN dashboard statistik.

Prioritas UX: `DISCOVER GAME → PILIH GAME → MAIN`.

## 2. Audit (sebelum coding)

| Area | Temuan |
|---|---|
| Route `/arena/game` | `app/arena/game/page.tsx` (369 baris, server) — memuat 7+ query berat (league mingguan, koin harian, online count, battle terbaru, riwayat) untuk MENAMPILKAN: BattleCard live, 2 banner promo, 2 announcement banner, stats ringkas, liga minggu ini, riwayat 5 main. |
| Game registry | **Tidak ada** — daftar `GAMES` di-hardcode di JSX halaman (10 gim), duplikat dengan daftar guru/murid. |
| Game routes | 12 route nyata ada: `kuis-tempur`, `menara`, `irama-kata`, `benar-salah`, `petualangan-kata`, `kata-play`, `tebak-kata`, `teka-teki-silang`, `susun-kata`, `lari-kata`, `tantang`, `adu-cepat`. |
| API yang dipakai | `getUser()` (ringkas) + `db.*` langsung di halaman (league/koin/battle) + `cache.getOrSet` — semua untuk konten NON-game. |
| Theme | Shell arena theme-aware (`bg-gray-50 dark:bg-slate-950` + gradient, `darkMode: ["class"]`, next-themes). Halaman hub lama hardcode dark (`#16122A`, `text-white`) → **merusak light mode**. |
| Rank/level | `levelFromXp(user.xp)` + `rankFromLevel(level)` (`lib/gamification/`) — pola yang sama dengan shell. |
| Asset | Artwork gim nyata: `/banners/banners-TTS-gim.png` (TTS) — dipakai sebagai hero art. |
| Test konstrain | `test-arena-web` check 10: page.tsx HARUS berisi `game-hub`, tanpa `max-w-lg mx-auto`; `BattleCard.tsx` harus tetap ada; `app/api/` 0 diff (kecuali game/xp yang sudah diizinkan); `bottom-nav.tsx` 0 diff. |

## 3. Keputusan Desain

1. **Game registry tunggal** (`lib/arena/game-registry.ts`, BARU) — `GameDefinition` (id/slug/title/description/category/icon/gradient/accent/href/xp/players/time/multiplayer/soloSaatOffline/badge/featured/artwork) + `GAME_CATEGORIES` (Kata · Literasi · Tantangan · Cepat · Kompetitif) + `featuredGame()`. Angka XP/waktu/pemain disalin persis dari hub lama — **tidak ada angka baru yang mengarang**. Semua 12 gim terdaftar; TTS = featured (`artwork: /banners/banners-TTS-gim.png`).
2. **GameHubClient** (`components/arena/game-hub/GameHubClient.tsx`, BARU, client) — struktur persis misi: Header (GIM + "Mainkan. Belajar. Naik Level." + XP ringkas/rank/avatar → `/arena/player`) → Hero featured (badge GAME BARU, judul, deskripsi, meta XP/waktu/pemain, CTA MAIN SEKARANG, art asli TTS) → Lanjutkan Permainan (localStorage recent, tersembunyi bila kosong) → Baru di Arena → Paling Seru Dimainkan (order registry) → Pilih Permainan (pills kategori + grid 2/3/4 kolom) → Promo slide (Kuis Tempur ↔ TTS, deliverable fase banner sebelumnya) → Quick access (Leaderboard/Profil/Prestasi/Misi).
3. **Lanjutkan Permainan** — `localStorage` (key `arena-gamehub-recent`): tercatat saat klik gim mana pun di hub, perangkat, tanpa API baru. Section hanya muncul bila ada; tidak ada empty-state besar (sesuai misi §9/§23).
4. **Server page ramping** (`app/arena/game/page.tsx`, tulis ulang 40 baris) — HANYA `getUser()` + `levelFromXp` + `rankFromLevel` + `MULTIPLAYER_ENABLED`. **0 query leaderboard/league/badge/prestasi/riwayat** (misi §19).
5. **Light/dark penuh** — semua kartu memakai `bg-white dark:bg-[#16122A]` + `text-slate-900 dark:text-white` + `border-slate-200 dark:border-[rgba(124,58,237,0.2)]`; hero selalu berwarna (gradien violet→blue, teks putih — aman di kedua mode). `.game-hub` di arena.css diubah dari hardcode dark menjadi wrapper tanpa warna paksa + keyframe `gh-badge-pulse` + focus ring + `prefers-reduced-motion`.
6. **Konten non-game DIKELUARKAN dari hub** (tetap ada di route masing-masing): BattleCard live, liga minggu ini, stats ringkas, riwayat, announcement banner. Halaman lain tidak disentuh.
7. **Multiplayer offline** — logika lama dipertahankan: gim multiplayer tanpa mode solo → "Segera Hadir" (CTA non-link, desaturasi) + ditenggelamkan di bawah; Kuis Tempur (soloSaatOffline) tetap LIVE.

## 4. Files

| File | Aksi |
|---|---|
| `lib/arena/game-registry.ts` | BARU — registry 12 gim + kategori + featured/artwork |
| `components/arena/game-hub/GameHubClient.tsx` | BARU — launcher client (hero/kategori/lanjutkan/baru/populer/grid/promo/quick) |
| `app/arena/game/page.tsx` | REWRITE — server ramping (user + level/rank + flag), wrapper `game-hub` |
| `app/arena/arena.css` | `.game-hub` → theme-aware + `gh-badge-pulse` + focus-visible + reduced-motion |

## 5. Verifikasi (semua lulus)

| Check | Hasil |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run test:arena-web` | ✅ 56/56 (termasuk check `game-hub` string + protected zones) |
| ESLint (3 file TS/TSX diubah/baru) | ✅ 0 errors, 0 warnings |
| `test:no-emoji-icons` | ✅ tidak ada regresi — kegagalan = file pra-fase (chat-client, league-tabs, adu-cepat, player-*) |
| `git diff --check` | ✅ bersih |
| Protected zones (app/api, bottom-nav, prisma, gamification) | ✅ 0 diff |
| DB | READ ONLY — 0 write, 0 migrasi |

## 6. Catatan

- **BattleCard.tsx** tidak dihapus (masih ada file-nya) — test-arena-web mensyaratkannya tetap ada; hub tidak lagi menampilkannya.
- **Banner slide** (Kuis Tempur ↔ TTS) yang diminta founder di fase banner dipertahankan di hub sebagai section "Promo" (di bawah grid, sebelum quick links) — deliverable sebelumnya tidak diregress.
- Belum di-commit — menunggu Founder Review (pola fase shell).
