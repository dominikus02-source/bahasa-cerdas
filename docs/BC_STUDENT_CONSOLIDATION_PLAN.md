# BC STUDENT CONSOLIDATION PLAN — STEP 2 (Information Architecture Consolidation)

**Status**: PLAN COMPLETE — siap implementasi STEP 2A
**Tanggal**: 11 Agustus 2026
**Dasar**: `docs/BC_STUDENT_IA_AUDIT.md` (audit lengkap, 711 baris) + 6 agent mapping paralel (coin, streak, navigation, profile refs, AI BC refs, test sensitivity)
**Mandat**: Merapikan IA murid — satu platform, bukan dua aplikasi. STEP 2 hanya 2A: sidebar nav canonical, profile routing, AI BC redirect, Pengaturan nyata, bug bell. TIDAK: dark mode, mobile redesign, BC Shop, payment, migrasi koin/streak, perubahan schema destruktif.

---

## A. Current IA

```
BAHASACERDAS
├── Student Dashboard (/murid/*)   — shell sidebar + MuridMobileNav (bottom 4 tab)
│     Beranda · Profil · Arena · Toko Koin | Kelas | Simulasi & Ujian | Event & Lomba | Kemajuan
└── Arena (/arena/*)               — shell header + bottom nav 5 tab (loop tertutup, tanpa Liga di mobile)
      Beranda · Karya · Gim · Liga(header only) · Obrolan · Pemain
```

Masalah inti (dari audit):
1. Dua shell dengan konten berulang (tugas, toko, simulasi, profil, quest, AI) — murid tidak tahu mana yang canonical.
2. 5 permukaan profil (3 diri + 2 peer) — `/arena/player/profile` = duplikat dengan 0 konsumen.
3. 3 UI chat AI → 1 API; `/murid/ai` orphan + rusak fungsional.
4. `/murid/pengaturan` = redirect stub; nav masih menampilkan item stub (olimpiade "dalam pengembangan", progresku data hardcoded).
5. Konflik data aktif: koin (2 saldo) & streak (2 counter) — dibiarkan (lihat H & I).
6. NotificationBell "Lihat Semua" → `/guru/notifikasi` (bug: murid diarahkan ke halaman guru).

## B. Target IA

```
BAHASACERDAS
└── Student Experience (satu shell murid + arena sebagai subsystem)
    ├── 1. BERANDA    /murid/beranda        Learning Home
    ├── 2. PROFIL     /murid/profile        Player Identity (canonical)
    ├── 3. ARENA      /arena                Gamification Hub (Gim/Kuis Tempur/Liga/Misi/Badge/Leaderboard/Toko)
    ├── 4. KARYA      /arena/feed           Creative + Social (global discovery)
    ├── 5. OBROLAN    /arena/chat           Komunikasi kelas
    ├── 6. PENGATURAN /murid/pengaturan     Account/Preferences (BARU — halaman nyata)
    └── AI BC         companion global      /arena/ai (murid primary) · /ai-bc (publik) · floating button
```

Prinsip: satu fitur = satu canonical home; profil diri = satu permukaan; Arena internal nav tetap di dalam Arena (sidebar utama TIDAK dijejali submenu Arena); AI BC companion global (floating) + primary route `/arena/ai`.

## C. Route Mapping (STEP 2A)

| Route | Aksi STEP 2A | Setelah |
|-------|--------------|---------|
| `/murid/beranda` | Tetap (canonical Learning Home) | Tanpa perubahan |
| `/murid/profile` | Tetap (canonical identity — 5 konsumen + 2 test scripts) | Tanpa perubahan |
| `/arena/player` | Tetap (hub aktivitas: quest/leaderboard/reward realtime) | Tanpa perubahan |
| `/arena/player/profile` | **Redirect conditional**: APK → `/arena/player` (in-scope); web → `/murid/profile` (canonical) | 0 konsumen link, 0 test — aman |
| `/profile/[id]` | Tetap (profil publik peer, tanpa auth-gate) | Tanpa perubahan |
| `/arena/profile/[id]` | Tetap (alias re-export APK — JANGAN redirect ke `/murid`) | Tanpa perubahan |
| `/murid/ai` | **Redirect → `/arena/ai`** (orphan, 0 tautan, 0 test, rusak fungsional `data.message`) | Aman |
| `/arena/ai` | Tetap (canonical AI murid — 1 konsumen aktif: quick action arena) | Tanpa perubahan |
| `/ai-bc` | Tetap (canonical publik — sitemap + proxy publicPaths + test bahasa-ui) | Tanpa perubahan |
| `/murid/pengaturan` | **Halaman nyata** (dari redirect stub) — akun/profil, notifikasi, tema (fondasi), keamanan | Baru |
| `/arena/feed`, `/arena/chat`, `/arena/game`, `/arena/league`, `/arena/game/kuis-tempur`, `/arena/toko-koin`, `/arena/misi`, `/arena/notifikasi` | Tetap (tidak disentuh; beberapa jadi target nav) | Tanpa perubahan |
| `/murid/toko-koin` | Route tetap (deep-link OK); nav kini menunjuk `/arena/toko-koin` (satu entry point) | Redirect formal ditunda (Fase B berikutnya) |
| `/murid/tugasku`, `/murid/simulasi/*`, `/murid/bigt`, `/murid/dokumen-latihan`, `/murid/gabung-kelas`, `/murid/kompetisi/*`, `/murid/kuest-harian`, `/murid/katastra*`, `/murid/game/*`, `/murid/progresku`, `/murid/olimpiade/*`, jalur-cerdas orphan | **TIDAK disentuh STEP 2A** — halaman tetap, hanya beberapa entri nav dibersihkan; redirect satu-home + pembersihan orphan = fase berikutnya | Tanpa perubahan |

## D. Navigation Mapping

### D.1 Sidebar desktop (`app/(dashboard)/murid/layout.tsx`) — SEBELUM → SESUDAH

| Grup | Sebelum | Sesudah |
|------|---------|---------|
| Menu Utama | Beranda · Profil · Arena · Toko Koin | **Beranda · Profil · Arena · Karya · Obrolan · Pengaturan** (6 item target) |
| Kelas | Papan Pengumuman · Gabung Kelas | Papan Pengumuman · Gabung Kelas (tetap) |
| Simulasi & Ujian | Simulasi UKBI · TKA · Dokumen Hasil Latihan · BIGT | **TETAP PERSIS** (26 assertion test bergantung literal ini) |
| Event & Lomba | Info Lomba · Kalender (stub "dalam pengembangan") | **DIHAPUS dari nav** (halaman tetap ada) |
| Kemajuan | Kemajuanku (data hardcoded) | **DIHAPUS dari nav** (data nyata di `/arena/player`; halaman tetap ada) |
| Toko Koin | (di Menu Utama, → `/murid/toko-koin`) | Pindah → **grup "Lainnya" → `/arena/toko-koin`** (satu entry point, in-scope APK) |
| Founder | Dasbor Guru · Panel Admin | Tetap |

### D.2 MuridMobileNav — SEBELUM → SESUDAH

- **PRIMARY bottom nav (4 tab)**: Beranda · Arena · Profil · Kemajuan → **Beranda · Arena · Karya · Profil** (Kemajuan diganti Karya; Bell + Menu tetap).
- **Drawer Menu Utama**: tambah **Karya (`/arena/feed`) · Obrolan (`/arena/chat`) · Pengaturan (`/murid/pengaturan`)**; Toko Koin → `/arena/toko-koin` (grup "Lainnya").
- **Grup Simulasi & Ujian**: TETAP PERSIS (test-required).
- **Grup Event & Progress**: Info Lomba · Kalender · Kemajuanku → **DIHAPUS** (stub/hardcoded; halaman tetap).
- Format href tetap double-quote (`href: "..."`) — kompatibel helper `hasHref` test.

### D.3 Arena nav — TIDAK DIUBAH STEP 2A
Header 6 item (Beranda/Karya/Gim/Liga/Obrolan/Pemain) + bottom nav 5 tab. Liga ke bottom nav = Fase B (tercatat di audit §15.2).

### D.4 Lainnya
- `AIFloatingButton` → `/ai-bc`: **TIDAK DIUBAH** (companion global; mount murid + guru layout; tidak di Arena). Audit menyarankan konsistensi ke `/arena/ai` di fase AI berikutnya.
- `NotificationBell` "Lihat Semua": **`/guru/notifikasi` → `/arena/notifikasi`** (perbaikan bug; satu-satunya mount produksi = murid layout).
- Test scripts yang membaca nav (`test-bigt-menu`, `test-simulation-workflow`, `test-phase-simulation-workflow`, `test-bigt-page-runtime`, `test-bahasa-indonesia-ui`): SEMUA item Simulasi + "Dasbor Murid" dipertahankan → assertion tetap hijau tanpa edit test.

## E. Profile Consolidation

- **Canonical diri**: `/murid/profile` (identitas + cosmetics + karya + sosial + gamifikasi + editing; 5 konsumen nav/aksi; diuji `test-profile-social-stats` #9–13 & `test-social-hardening` W5 — halaman TIDAK diubah).
- **Hub aktivitas**: `/arena/player` (quest/leaderboard/reward realtime; 4 konsumen) — tetap, bukan profil kedua.
- **Duplikat**: `/arena/player/profile` → redirect **conditional**: `isApk()` → `/arena/player` (in-scope, isi hampir identik: PlayerCard+badge+achievement), web → `/murid/profile` (canonical). 0 konsumen link + 0 test → aman. `ProfileTabs` komponen tetap di repo (tidak dihapus — additive).
- **Peer**: `/profile/[id]` (8 konsumen dasbor) + `/arena/profile/[id]` (4 konsumen arena, alias APK wajib) — TIDAK disentuh.
- **UX rule**: dari `/arena`, klik Profil/Pemain → tetap di dalam Arena (hub); dari dash murid → canonical. Tidak ada "dua identity system".

## F. Arena Consolidation

- Arena sudah menjadi subsystem yang benar: Liga (`/arena/league`) & Kuis Tempur (`/arena/game/kuis-tempur`) berada di dalam pohon `/arena` dan memakai engine bersama — TIDAK diubah.
- Nav murid kini menunjuk ke dalam Arena untuk: Karya (`/arena/feed`), Obrolan (`/arena/chat`), Arena (`/arena`), Toko Koin (`/arena/toko-koin`) — konsisten `lib/arena-scope.ts` (komponen di `/arena` menaut ke `/arena`).
- Fase berikutnya (bukan STEP 2): Liga di bottom nav mobile, konsolidasi query leaderboard (3× mingguan → 1 engine + 1 cache key), deprecate `WeeklySeason`/`/api/siswa/league`/`User.league`.

## G. AI BC Placement

| Route | Peran | Aksi |
|-------|-------|------|
| `/arena/ai` ("AI Cerdik") | **Canonical murid** (auth arena, APK-safe, 1 konsumen quick action) | Tetap |
| `/ai-bc` | Canonical publik/SEO (paling lengkap: kategori, mode, regenerate, salin; sitemap + proxy publicPaths + test `test-bahasa-indonesia-ui`) | Tetap; teks "Ditenagai Google Gemini" basi → fase AI |
| `/murid/ai` ("AI Tutor") | Orphan + rusak (baca `data.message`, API kirim `data.reply`) | **Redirect → `/arena/ai`** |
| `AIFloatingButton` | Companion global → `/ai-bc` (mount murid+guru layout) | Tetap |
| `/api/ai/chat` | API tunggal (tidak ada API AI kedua) | Tetap |

Catatan: paritas fitur `/ai-bc` (kategori/mode/regenerate/salin) vs `/arena/ai` (4 quick action, markdown) — upgrade `/arena/ai` ke shared chat component = fase AI berikutnya, di luar STEP 2. API tetap `/api/ai/chat`.

## H. Coin Data Flow (COIN DATA FLOW AUDIT — summary)

**Hasil agent mapping (8 penulis + ~14 pembaca `User.coins`; 5 penulis + ~9 pembaca `PlayerProfile.coin`; TIDAK ADA sinkronisasi):**

| Aspek | `User.coins` | `PlayerProfile.coin` |
|-------|--------------|----------------------|
| Penulis | 8 (lib/coins.ts ×5 + jalur-cerdas :81-84, mystery-box :58-61, penugasan :70-73) | 5 (coin-engine add/deduct, award-xp LEVEL_UP :174-187, podium-rewards :213,:229, rank-up, achievement) |
| Pembaca/UI | ~14 (toko-koin 2×, beranda, arena hero, misi, profile, kuest-harian, league, junior, KuisTempurSolo) | ~9 (player dashboard/header/card/popup, badge engine, admin) |
| Audit trail | CoinTransaction (reason polos) — **gap: penugasan tanpa ledger** | CoinTransaction (`BCA_*` prefix, idempotent `(reason, reference)`) |
| Kandidat SSOT | — | Lebih sehat struktural (100% lewat helper + ledger) |

**KEPUTUSAN (STOP condition):** Konsolidasi **TIDAK aman sekarang** — tanpa migrasi/backfill saldo pasti divergen; toko koin membelanjakan `User.coins` sedangkan engine arena mengelola `PlayerProfile.coin`; `awardXp` level-up sudah menulis PlayerProfile.coin untuk semua murid. **TIDAK ada perubahan schema, TIDAK ada migrasi, TIDAK ada penghapusan field di STEP 2.** Kotak-kotak future (setelah persetujuan founder): (a) tambal gap audit penugasan, (b) backfill `User.coins → PlayerProfile.coin`, (c) alihkan `lib/coins.ts` + 3 route langsung ke `addCoin/deductCoin`, (d) alihkan UI ke `/api/player/profile`, (e) hapus `User.coins`. BC SHOP (fase berikutnya) WAJIB satu currency source — keputusan SSOT diambil setelah langkah (a)–(e) disetujui.

## I. Streak Data Flow (STREAK DATA FLOW AUDIT — summary)

**Hasil agent mapping (3 penulis + ±16 pembaca `User.streak`; 1 penulis + ±7 pembaca `PlayerProfile.streak`; TIDAK ADA sinkronisasi; satu-satunya titik temu = `badge-engine.ts:109` `Math.max`):**

| Aspek | `User.streak` | `PlayerProfile.streak` |
|-------|---------------|------------------------|
| Penulis | 3 (trackDailyStreak lib/coins.ts:420 — freeze + koin DAILY_LOGIN; katastra/submit :53-78; seed) | 1 (bumpDailyStreak lib/gamification/player.ts:126 — batas WIB, TANPA freeze) |
| Pemicu | 7 alur murid (arena page/misi, quest, karya/like/comment, katastra) | 1 (GET /api/player/profile polling 20s) |
| UI | ±18 (sidebar murid+guru, beranda, arena hero, profile, kuest-harian, katastra, profil publik, data siswa, dll.) | 3 (player header/dashboard/streak-card) + admin |
| Kandidat SSOT | — | Lebih sehat (1 penulis, batas WIB, sudah kanonik di admin analytics) — TAPI ekonomi freeze & koin terikat ke `User.streak` |

**KEPUTUSAN (STOP condition):** Konsolidasi **TIDAK aman sekarang** — freeze economy (`STREAK_FREEZE` + koin DAILY_LOGIN) hanya ada di `User.streak`; badge engine bergantung KEDUA field (`Math.max` jaring pengaman); tidak ada backfill PlayerProfile.streak untuk ~1340 murid. **TIDAK ada perubahan schema/migrasi/hapus field di STEP 2.** Jalur aman future: dual-write → backfill `GREATEST(...)` → pindah freeze+koin ke engine PlayerProfile → cutover UI → hapus `Math.max` setelah backfill terverifikasi.

## J. Responsive Strategy (STEP 2: TIDAK refactor; hanya catatan)

- Temuan: layout arena cap `max-w-lg md:max-w-4xl` (896px) + cap per-halaman (768px/512px); beranda max-w-3xl; feed 1 kolom; progresku full-width (inkonsisten).
- Target (fase terpisah): MOBILE full-width · TABLET adaptive · DESKTOP full layout + multi-column. Standar container `max-w-7xl` + grid md+, hapus cap 896/768/512.
- STEP 2 TIDAK menyentuh layout container mana pun — hanya nav + routing.

## K. Theme Strategy (STEP 2: TIDAK migrasi; hanya fondasi)

- Temuan: `darkMode: ["class"]` diset; TIDAK ada ThemeProvider/next-themes; tidak ada blok `.dark`; `player-theme.css` + `.game-hub` dark-only permanen; 0 file `dark:` di murid/arena/gamification; bg-white hardcoded ratusan file.
- Halaman `/murid/pengaturan` baru: menyiapkan section **Tampilan** (indikator "Terang" + info "Mode Gelap segera hadir") TANPA toggle berfungsi (tidak ada ThemeProvider) — fondasi saja, tidak ada color replacement global.
- Fase tema (terakhir): ThemeProvider canonical → `.dark` vars → toggle Light/Dark/System → konversi per halaman.

## L. Premium Readiness

- `lib/ai-gateway/plan-resolver.ts` (`resolveUserAiPlan`), entitlement engine, PremiumUsage, simulation limits, founder precedence, Subscription — **TIDAK disentuh** (test:premium-economy wajib hijau).
- STEP 2 tidak menyentuh billing/checkout; arsitektur baru (nav + profil canonical + pengaturan) tidak mengubah plan apa pun.
- BC SHOP (fase berikutnya): satu currency source (lihat H), item = cosmetics/access/convenience/analytics SAJA — dilarang pay-to-win (+damage/+HP/+XP multiplier/+leaderboard boost).

## M. Risk Matrix

| # | Risiko | Level | Mitigasi STEP 2 |
|---|--------|-------|-----------------|
| 1 | Test nav sensitif (26+ assertion: BIGT/Simulasi/Dasbor Murid di layout+mobile nav) | Tinggi | Item Simulasi & Ujian dipertahankan PERSIS di kedua file; "Dasbor Murid" dipertahankan; format href double-quote |
| 2 | APK scope (`/arena/*`): redirect keluar scope melempar ke browser tab | Tinggi | `/arena/player/profile` redirect conditional (`isApk()` → `/arena/player`); `/arena/profile/[id]` TIDAK disentuh; semua nav baru yang menunjuk ke `/arena/*` aman in-scope |
| 3 | Koin/streak dua saldo | Tinggi | STOP — tanpa perubahan schema/migrasi; didokumentasikan (H & I) |
| 4 | Nav menunjuk `/arena/*` dari sidebar murid mengubah konteks shell | Sedang | Disengaja per target IA (Karya/Obrolan/Arena/Toko = subsystem arena); `lib/arena-scope.ts` sudah menangani back-navigation |
| 5 | Pengaturan halaman baru tanpa backend settings | Rendah | Hanya render dari API existing (`/api/user/me`) + link + LogoutButton; tidak ada API baru |
| 6 | `test-bahasa-indonesia-ui` pre-existing 5 failures | Info | Pra-eksis (BigtInfoPage + RPP panel) — di luar changeset, tidak diperbaiki di STEP 2 |
| 7 | AIFloatingButton tetap → `/ai-bc` (bukan `/arena/ai`) | Rendah | Disengaja: companion global tidak diubah di STEP 2; konsistensi di fase AI |
| 8 | Feed beranda (1 kolom) belum dipindah ke Learning Home penuh | Sedang | Fase D (audit §21) — STEP 2 hanya nav/routing, bukan rewrite konten beranda |

## N. Files Affected (STEP 2A)

| File | Aksi |
|------|------|
| `app/(dashboard)/murid/layout.tsx` | Sidebar: 6 item Menu Utama (Karya/Obrolan/Pengaturan baru), hapus Event & Lomba + Kemajuan, Toko Koin → grup Lainnya `/arena/toko-koin` |
| `components/dashboard/MuridMobileNav.tsx` | PRIMARY: Kemajuan→Karya; drawer: Menu Utama 6 item, grup Lainnya, hapus Event & Progress |
| `app/(dashboard)/murid/pengaturan/page.tsx` | Redirect stub → halaman nyata (server, `getUser`, /api/user/me, link, LogoutButton) |
| `app/arena/player/profile/page.tsx` | Redirect conditional (`isApk()` → `/arena/player`; web → `/murid/profile`) |
| `app/(dashboard)/murid/ai/page.tsx` | Redirect → `/arena/ai` |
| `components/dashboard/NotificationBell.tsx` | "Lihat Semua" `/guru/notifikasi` → `/arena/notifikasi` |
| `scripts/test-student-consolidation.ts` | BARU — 13 assertion (statis, tanpa DB) |
| `package.json` | +`test:student-consolidation` |
| `docs/BC_STUDENT_CONSOLIDATION_PLAN.md` | BARU — dokumen ini |

## O. Files Explicitly NOT to Touch (STEP 2)

| File/Area | Alasan |
|-----------|--------|
| `lib/gamification/` (seluruh engine: levels, ranks, xp-engine, coin-engine, badge-engine, achievement-engine, leaderboard, season, motivation, podium-rewards, rank-up, rank-rewards, player, xp-config, xp-guard, client-types, source-labels) | Logika gamifikasi/XP/leaderboard |
| `lib/award-xp.ts` · `lib/coins.ts` · `lib/ai-gateway/*` · `lib/billing/limits.ts` | XP/koin/quest legacy + premium economy |
| `prisma/schema.prisma` + semua migration | Perintah melarang perubahan schema |
| `app/api/game/xp/route.ts` · `app/api/katastra/submit/route.ts` · `lib/game/kuis-tempur-progression.ts` · `lib/game/question-bank.ts` · `components/game/KuisTempurSolo.tsx` | Kuis Tempur & XP game |
| `app/arena/kompetisi/*` · `app/(dashboard)/kompetisi/*` · `app/api/kompetensi/*` · `lib/simulation/*` | Test screen UKBI/TKA + evaluasi |
| `app/arena/login` · `app/arena/register` · `app/arena/profile/[id]` · `lib/apk.ts` · `lib/arena-scope.ts` | Scope APK |
| `app/api/ai/chat/route.ts` · `src/ai/` · `app/ai-bc/*` · `app/arena/ai/page.tsx` · `components/shared/AIFloatingButton.tsx` | AI flow (hanya /murid/ai yang di-redirect, tidak dihapus) |
| `app/(dashboard)/murid/profile/page.tsx` · `/profile/[id]/page.tsx` · `components/profile/*` | Canonical profile + peer — diuji 2 test scripts |
| `app/(dashboard)/murid/beranda/page.tsx` · `app/arena/page.tsx` | Konten beranda/arena (fase D) |
| `app/arena/feed/*` · `app/api/siswa/karya/*` | Global works discovery — diuji test:global-works-discovery |
| `app/(dashboard)/murid/toko-koin` · `/arena/toko-koin` · `/api/siswa/store/*` | Toko (keputusan satu-home = fase berikutnya) |
| `next.config.ts` · `vercel.json` · `lib/supabase/*` · `lib/db.ts` · `lib/redis.ts` | Infrastruktur |
| `GuruNav.tsx` · `app/(dashboard)/guru/*` · `components/dashboard/GuruSidebar.tsx` (legacy, dibaca test) | Peran guru — tidak ada perubahan |

---

## Keputusan yang ditangguhkan (butuh founder)

1. **SSOT koin** — kandidat `PlayerProfile.coin` + `CoinTransaction` (audit H); eksekusi butuh persetujuan + backfill.
2. **SSOT streak** — kandidat `PlayerProfile.streak` (audit I); eksekusi butuh dual-write + backfill + pemindahan freeze.
3. **Satu-home toko/tugas/simulasi/bigt/dokumen/gabung-kelas** — nav sudah menunjuk entry point tunggal (toko → arena); redirect formal + pembersihan orphan = fase berikutnya.
4. **`/arena/player/profile` tujuan web final** — STEP 2 memakai redirect conditional (APK-safe); jika founder ingin selalu `/murid/profile` tanpa cabang APK, tinggal hapus cabang `isApk()`.

## Urutan eksekusi STEP 2A

1. Nav sidebar + mobile (D.1–D.2) → 2. Redirect `/arena/player/profile` → 3. Redirect `/murid/ai` → 4. Halaman `/murid/pengaturan` → 5. Fix NotificationBell → 6. `test-student-consolidation` + package script → 7. QA: 4 test suite utama + test nav + tsc + build → 8. Report (tanpa commit/push).
