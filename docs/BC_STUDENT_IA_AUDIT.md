# BC STUDENT IA AUDIT — Student Experience Information Architecture Audit

**Status**: AUDIT ONLY — 0 perubahan kode aplikasi
**Tanggal**: 11 Agustus 2026
**Scope**: Seluruh pengalaman murid BahasaCerdas (dashboard murid, Arena, Arena Player, Liga, Kuis Tempur, Karya, AI BC, gamifikasi, leaderboard, koin/shop, pengaturan)
**Perintah**: `docs/BC_STUDENT_IA_AUDIT.md` — satu-satunya perubahan yang disengaja

---

## 1. Executive Summary

Murid BahasaCerdas saat ini hidup dalam **dua ekosistem paralel yang hanya terhubung satu arah**:

1. **Dasbor Murid** (`/murid/*`) — shell sidebar + mobile nav, fokus tugas kelas & identitas.
2. **Arena** (`/arena/*`) — shell header + bottom nav tersendiri, fokus gamifikasi & kompetisi.

**Arena adalah loop tertutup**: tidak ada satu pun tautan dari dalam `/arena` ke `/murid/*` (kecuali bug empty-state feed → `/guru/kelasku`). Murid hanya bisa masuk Arena dari dasbor; begitu masuk, tidak ada jalan kembali kecuali tombol browser/URL. Android APK sengaja dibuat demikian (tidak boleh keluar scope), tetapi **desktop web tidak** — ini menciptakan pengalaman "berpindah aplikasi".

### Temuan kunci

| # | Temuan | Tingkat |
|---|--------|---------|
| 1 | **3 UI chat AI → 1 endpoint** (`/api/ai/chat`): `/ai-bc` (publik), `/arena/ai` ("AI Cerdik"), `/murid/ai` ("AI Tutor", **orphan**) + persona ke-4 via agent guru `bc-assistant` | Duplikasi |
| 2 | **5 permukaan profil**: `/murid/profile` (terkaya), `/arena/player` (hub aktivitas), `/arena/player/profile` (duplikat ringkasan), `/profile/[id]` (publik peer), `/arena/profile/[id]` (alias in-app) | Duplikasi |
| 3 | **2 halaman toko koin terpisah**: `/murid/toko-koin` vs `/arena/toko-koin` (bukan re-export) | Duplikasi |
| 4 | **2 daftar tugas**: `/murid/tugasku` vs `/arena/tugas` (file terpisah, hampir identik) | Duplikasi |
| 5 | **Simulasi/BIGT/Dokumen/Gabung-Kelas/Kompetisi** dirender 2× (dashboard + remount arena) | Duplikasi (remount) |
| 6 | **~15 route legacy/orphan/stub**: `/murid/game/*`, `/murid/kuis-game`, `/murid/katastra*`, `/murid/kuest-harian`, `/murid/komunitas/daftar`, `/murid/ai`, `/murid/progresku` (hardcoded), `/murid/olimpiade/*` (stub), jalur-cerdas belajar/latihan/kuis/praktik (orphan) | Kebersihan |
| 7 | **Leaderboard ditampilkan di 5+ tempat** dengan query terpisah (league page, LeagueMini, GameHubLeagueTabs, LeaderboardPanel, Ringkasan Kelasku) | Duplikasi data |
| 8 | **Koin dua saldo**: `User.coins` (toko/quest) vs `PlayerProfile.coin` (engine + bonus level-up **hanya** ke PlayerProfile — murid tak bisa belanja koin level-up di toko) | Konflik data aktif |
| 9 | **Streak dua counter**: `User.streak` (login harian) vs `PlayerProfile.streak` (aktivitas) — bisa berbeda nilai | Konflik data |
| 10 | **Layout arena di-cap 896px** (`max-w-lg md:max-w-4xl`) + halaman punya max-w sendiri (`max-w-3xl`, `max-w-lg`) → desktop tampak seperti HP | Responsif |
| 11 | **Dark mode tidak ada**: `darkMode: ["class"]` diset tapi tanpa ThemeProvider, tanpa blok `.dark`, 0 file `dark:` di murid/arena/gamification | Tema |
| 12 | **`/murid/pengaturan` = redirect ke `/murid/profile`** — tidak ada halaman Pengaturan sama sekali | IA |
| 13 | Liga & Kuis Tempur **sudah berperilaku sebagai bagian Arena** (route di bawah `/arena`, engine berbagi) — tidak perlu dipisah | Positif |
| 14 | XP **sudah satu sumber** (`User.xp` SSOT, `PlayerProfile.totalXP` cermin ditulis transaksi sama) — sisa inkonsistensi hanya cache 30s | Positif |

### Rekomendasi inti (verifikasi, bukan eksekusi)

- **BERANDA** → `/murid/beranda` (Learning Home); Arena menjadi **Gamification Home**.
- **PROFIL** → `/murid/profile` sebagai canonical player identity (paling lengkap: identitas+cosmetics+karya+sosial+gamifikasi+editing); `/arena/player` tetap sebagai **hub aktivitas** (quest/leaderboard/reward realtime), bukan profil kedua.
- **ARENA** → hub gamifikasi; **Liga & Kuis Tempur sudah benar di dalamnya** (Arena → Gim → Kuis Tempur, Arena → Liga).
- **AI BC** → companion global: satu UI chat; `/arena/ai` sebagai primary murid; `/ai-bc` publik; `/murid/ai` ditutup.
- **Toko Koin, Tugas, Simulasi, BIGT, Dokumen, Gabung Kelas** → satu canonical home per fitur (dashboard **atau** arena), sisanya redirect/alias.

---

## 2. Current Student Route Map

### 2.1 `/murid/*` (Dasbor Murid — `app/(dashboard)/murid/`)

| Route | File | Tujuan | Status |
|-------|------|--------|--------|
| `/murid/beranda` | `beranda/page.tsx` | Learning Home (feed karya + ringkasan kelas) | **Canonical** |
| `/murid/profile` | `profile/page.tsx` | Player Identity Hub 2.0 | **Canonical** (terkaya) |
| `/murid/ai` | `ai/page.tsx` | Chat "AI Tutor" | **ORPHAN** |
| `/murid/bigt` | `bigt/page.tsx` | Info BIGT | **Canonical** (duplikat arena) |
| `/murid/dokumen-latihan` | `dokumen-latihan/page.tsx` | Hasil latihan UKBI/TKA | **Canonical** (duplikat arena) |
| `/murid/gabung-kelas` | `gabung-kelas/page.tsx` | Gabung kelas via kode | **Canonical** (duplikat arena) |
| `/murid/game` | `game/page.tsx` | Hub game lama (9 kartu) | **LEGACY orphan** |
| `/murid/game/lobby` | `game/lobby/page.tsx` | GameLobby multiplayer | **LEGACY orphan** + gated |
| `/murid/game/play/[code]` | `game/play/page.tsx` | GamePlay | **LEGACY orphan** + gated |
| `/murid/game/susun-kata` | `game/susun-kata/page.tsx` | SusunKata (sama dgn arena) | **LEGACY orphan** |
| `/murid/game/tebak-kata` | `game/tebak-kata/page.tsx` | TebakKata (sama dgn arena) | **LEGACY orphan** |
| `/murid/karya/[id]` | `karya/[id]/page.tsx` | Detail karya | **Canonical** |
| `/murid/karya/tulis` | `karya/tulis/page.tsx` | Tulis karya | **Canonical** |
| `/murid/katastra` | `katastra/page.tsx` | Hub Lari Kata/Duel Kata | **LEGACY** |
| `/murid/katastra/dash` | `katastra/dash/page.tsx` | WordDash (Lari Kata) | **LEGACY** (duplikat `/arena/game/lari-kata`) |
| `/murid/kelasku/[id]` | `kelasku/[id]/page.tsx` | Detail kelas | **Canonical** |
| `/murid/komunitas/daftar` | `komunitas/daftar/page.tsx` | Daftar komunitas | **ORPHAN** |
| `/murid/kuest-harian` | `kuest-harian/page.tsx` | Quest harian lama | **ORPHAN** (digantikan `/arena/misi`) |
| `/murid/kuis-game` | `kuis-game/page.tsx` | Redirect → `/murid/game/lobby` | **LEGACY chain** |
| `/murid/olimpiade/info` | `olimpiade/info/page.tsx` | Info lomba | **STUB** ("dalam pengembangan") |
| `/murid/olimpiade/kalender` | `olimpiade/kalender/page.tsx` | Kalender lomba | **STUB** ("dalam pengembangan") |
| `/murid/pengaturan` | `pengaturan/page.tsx` | **Redirect → `/murid/profile`** | **REDIRECT** |
| `/murid/pengumuman` | `pengumuman/page.tsx` | Papan pengumuman guru | **Canonical** |
| `/murid/progresku` | `progresku/page.tsx` | Kemajuan (data **hardcoded**) | **LEGACY placeholder** |
| `/murid/sertifikat` | `sertifikat/page.tsx` | **Redirect → `/murid/dokumen-latihan`** | **REDIRECT** |
| `/murid/simulasi/ukbi` | `simulasi/ukbi/page.tsx` | Pilih paket UKBI (resolver) | **Canonical** |
| `/murid/simulasi/tka` | `simulasi/tka/page.tsx` | Pilih paket TKA (resolver) | **Canonical** |
| `/murid/tka-guru` | `tka-guru/page.tsx` | **Redirect → `/murid/simulasi/tka`** | **REDIRECT** |
| `/murid/tka-utbk` | `tka-utbk/page.tsx` | **Redirect → `/murid/simulasi/tka`** | **REDIRECT** |
| `/murid/toko-koin` | `toko-koin/page.tsx` | Toko koin (halaman sendiri) | **Canonical** (tapi duplikat arena) |
| `/murid/tugasku` | `tugasku/page.tsx` | Daftar tugas, 3 tab | **Canonical** (duplikat arena) |
| `/murid/tugasku/[id]/take` | `tugasku/[assignId]/take/page.tsx` | Kerjakan kuis | **Canonical** |
| `/murid/tugasku/[id]/result` | `tugasku/[assignId]/result/page.tsx` | Hasil kuis | **Canonical** |
| `/murid/ukbi` | `ukbi/page.tsx` | **Redirect → `/murid/simulasi/ukbi`** | **REDIRECT** |

### 2.2 `/arena/*` (Arena)

| Route | File | Tujuan | Status |
|-------|------|--------|--------|
| `/arena` | `page.tsx` | Arena beranda (hero, quest, jalur, kompetisi, mini-league) | **Canonical** |
| `/arena/ai` | `ai/page.tsx` | Chat "AI Cerdik" | **Canonical** (duplikat AI) |
| `/arena/battle` | `battle/page.tsx` | **Redirect → `/arena/game`** | **REDIRECT** |
| `/arena/chat` | `chat/page.tsx` | Chat kelompok kelas | **Canonical** |
| `/arena/feed` | `feed/page.tsx` | Feed sosial karya | **Canonical** |
| `/arena/feed/[id]` | `feed/[id]/page.tsx` | Detail karya (server) | **Canonical** |
| `/arena/gabung-kelas` | `gabung-kelas/page.tsx` | **Remount** `/murid/gabung-kelas` | **DUPLICATE (remount)** |
| `/arena/game` | `game/page.tsx` | Hub Gim (9 game + league tabs) | **Canonical** |
| `/arena/game/kuis-tempur` | `game/kuis-tempur/page.tsx` | KuisTempurSolo / GameLobby | **Canonical** |
| `/arena/game/menara` | `game/menara/page.tsx` | MenaraCerdas | **Canonical** |
| `/arena/game/irama-kata` | `game/irama-kata/page.tsx` | IramaKata | **Canonical** |
| `/arena/game/benar-salah` | `game/benar-salah/page.tsx` | BenarSalah | **Canonical** |
| `/arena/game/petualangan-kata` | `game/petualangan-kata/page.tsx` | ZelbyDash | **Canonical** |
| `/arena/game/kata-play` | `game/kata-play/page.tsx` | KataPlayGame | **Canonical** |
| `/arena/game/tebak-kata` | `game/tebak-kata/page.tsx` | TebakKata | **Canonical** |
| `/arena/game/susun-kata` | `game/susun-kata/page.tsx` | SusunKata | **Canonical** |
| `/arena/game/lari-kata` | `game/lari-kata/page.tsx` | LariKata (katastra) | **Canonical** |
| `/arena/game/tantang` | `game/tantang/page.tsx` | Duel asinkron 1v1 | **Canonical** |
| `/arena/game/adu-cepat` | `game/adu-cepat/page.tsx` | Matchmaking MP | **Gated** (butuh server) |
| `/arena/jalur-cerdas` | `jalur-cerdas/page.tsx` | Peta 12 level | **Canonical** |
| `/arena/jalur-cerdas/[unitId]` | `jalur-cerdas/[unitId]/page.tsx` | Detail unit | **Canonical** |
| `/arena/jalur-cerdas/[unitId]/lesson` | `.../lesson/page.tsx` | Lesson engine | **Canonical** |
| `/arena/jalur-cerdas/[unitId]/belajar` | `.../belajar/page.tsx` | Baca materi | **LEGACY orphan** |
| `/arena/jalur-cerdas/[unitId]/latihan` | `.../latihan/page.tsx` | Latihan | **LEGACY orphan** |
| `/arena/jalur-cerdas/[unitId]/kuis` | `.../kuis/page.tsx` | Kuis | **LEGACY orphan** |
| `/arena/jalur-cerdas/[unitId]/praktik` | `.../praktik/page.tsx` | Praktik → karya | **LEGACY orphan** |
| `/arena/kompetisi/[paketId]` | `kompetisi/[paketId]/page.tsx` | **Remount** `(dashboard)/kompetisi` | **DUPLICATE (remount)** |
| `/arena/kompetisi/[paketId]/hasil` | `.../hasil/page.tsx` | Hasil tes | **DUPLICATE (remount)** |
| `/arena/kompetisi/[paketId]/device-check` | `.../device-check/page.tsx` | Cek mikrofon | **DUPLICATE (remount)** |
| `/arena/league` | `league/page.tsx` | Liga (harian/mingguan/HOF) | **Canonical** |
| `/arena/login` | `login/page.tsx` | Login scope APK | **Khusus** |
| `/arena/materi` | `materi/page.tsx` | Materi kiriman guru | **Canonical** |
| `/arena/misi` | `misi/page.tsx` | Misi harian | **Canonical** (pengganti kuest-harian) |
| `/arena/mystery-box` | `mystery-box/page.tsx` | Kotak misteri harian | **Canonical** |
| `/arena/notifikasi` | `notifikasi/page.tsx` | Pusat notifikasi | **Canonical** |
| `/arena/player` | `player/page.tsx` | Dashboard pemain | **Canonical** (hub aktivitas) |
| `/arena/player/profile` | `player/profile/page.tsx` | Profil pemain (tabs) | **DUPLICATE summary** |
| `/arena/player/badges` | `player/badges/page.tsx` | Koleksi lencana | **Canonical** |
| `/arena/player/achievements` | `player/achievements/page.tsx` | Pencapaian + klaim | **Canonical** |
| `/arena/player/leaderboard` | `player/leaderboard/page.tsx` | Papan peringkat (scope×period) | **Canonical** (vs league) |
| `/arena/player/history` | `player/history/page.tsx` | Riwayat XP/koin | **Canonical** |
| `/arena/player/notifications` | `player/notifications/page.tsx` | Notifikasi pemain | **Canonical** (duplikat `/arena/notifikasi`) |
| `/arena/profile/[id]` | `profile/[id]/page.tsx` | **Re-export** `(dashboard)/profile/[id]` | **DUPLICATE (alias)** |
| `/arena/register` | `register/page.tsx` | Daftar scope APK | **Khusus** |
| `/arena/simulasi` | `simulasi/page.tsx` | Hub simulasi | **Canonical** |
| `/arena/simulasi/ukbi` | `simulasi/ukbi/page.tsx` | **Remount** | **DUPLICATE (remount)** |
| `/arena/simulasi/tka` | `simulasi/tka/page.tsx` | **Remount** | **DUPLICATE (remount)** |
| `/arena/simulasi/bigt` | `simulasi/bigt/page.tsx` | **Remount** `/murid/bigt` | **DUPLICATE (remount)** |
| `/arena/simulasi/hasil` | `simulasi/hasil/page.tsx` | **Remount** dokumen-latihan | **DUPLICATE (remount)** |
| `/arena/toko-koin` | `toko-koin/page.tsx` | Toko koin (halaman sendiri) | **Canonical** (tapi duplikat murid) |
| `/arena/tugas` | `tugas/page.tsx` | List tugas (3 tab) | **DUPLICATE** `/murid/tugasku` |
| `/arena/tugas/[id]/take` | `tugas/[assignId]/take/page.tsx` | **Remount** take | **DUPLICATE (remount)** |
| `/arena/tugas/[id]/result` | `tugas/[assignId]/result/page.tsx` | **Remount** result | **DUPLICATE (remount)** |
| `/arena/tugas/[id]/kerjakan` | `tugas/[assignId]/kerjakan/page.tsx` | Kerjakan **Penugasan** (unik!) | **Canonical** |
| `/arena/tulis` | `tulis/page.tsx` | Tulis karya | **Canonical** |

### 2.3 Route lain yang melayani murid

| Route | File | Tujuan | Status |
|-------|------|--------|--------|
| `/junior` | `app/junior/` | Arena Junior (TK–SD, layout sendiri) | **Canonical** (pohon terpisah) |
| `/game/[code]` | `app/game/[code]/page.tsx` | Join game MP via URL | **Gated** |
| `/ai-bc` | `app/ai-bc/page.tsx` | Chat AI BC (publik) | **Canonical** (publik) |
| `/profile/[id]` | `app/(dashboard)/profile/[id]/page.tsx` | Profil publik peer | **Canonical** |
| `/kompetisi/[paketId]` | `app/(dashboard)/kompetisi/[paketId]/page.tsx` | Test screen UKBI/TKA | **Canonical** |
| `/kompetisi/latihan` | `app/(dashboard)/kompetisi/latihan/page.tsx` | List paket legacy | **Legacy** (target "kembali") |
| `app/profile/` | (kosong) | — | **Kosong** |

### 2.4 Redirect yang sudah ada (pola yang sudah ditetapkan)

`/murid/sertifikat` → `/murid/dokumen-latihan` · `/murid/ukbi` → `/murid/simulasi/ukbi` · `/murid/tka-guru` & `/murid/tka-utbk` → `/murid/simulasi/tka` · `/murid/pengaturan` → `/murid/profile` · `/arena/battle` → `/arena/game` · `/murid/kuis-game` → `/murid/game/lobby` · `/arena` → `/junior` (kondisional TK–SD)

---

## 3. Current Navigation Map

### 3.1 Sistem navigasi (7 sistem berbeda)

| # | Sistem | Lokasi | Perangkat | Isi |
|---|--------|--------|-----------|-----|
| 1 | **Sidebar Murid** (inline di `murid/layout.tsx`) | Dashboard murid | Desktop (md+) | Beranda, Profil, Arena, Toko Koin · Kelas: Papan Pengumuman, Gabung Kelas · Simulasi & Ujian: UKBI, TKA, Dokumen, BIGT · Event & Lomba: Info, Kalender · Kemajuan: Kemajuanku + founder links |
| 2 | **MuridMobileNav** (`MuridMobileNav.tsx`) | Dashboard murid | Mobile | Bottom 4: Beranda, Arena, Profil, Kemajuan + Bell (→ `/arena/notifikasi`) + Menu drawer (Menu Utama / Simulasi & Ujian / Event & Progress) |
| 3 | **Arena Header** (`arena/layout.tsx`) | Arena | Desktop + mobile top bar | Logo → `/arena` · nav: Beranda, Karya, Gim, Liga, Obrolan, Pemain · Dasbor Murid (link keluar, **non-APK saja**) · HeaderActions · Logout |
| 4 | **Arena BottomNav** (`bottom-nav.tsx`) | Arena | Mobile | **5 tab: Beranda, Karya, Gim, Obrolan, Pemain — TANPA Liga** |
| 5 | **AIFloatingButton** (`AIFloatingButton.tsx`) | Dashboard murid + guru | Semua | Floating → `/ai-bc`. **TIDAK ada di Arena** |
| 6 | **HeaderActions** (arena) | Arena header | Semua | Bell → `/arena/notifikasi` · Search → `/arena/feed?q=` |
| 7 | **NotificationBell** (dashboard) | Sidebar murid + guru | Semua | Dropdown; "Lihat Semua" → **`/guru/notifikasi` (hardcoded guru — bug untuk murid)** |

GuruNav (`GuruNav.tsx`) murni guru — 0 link ke `/arena` atau `/murid`. Tidak ada kontaminasi lintas peran (kecuali bug NotificationBell).

### 3.2 Peta lintas (jalan masuk/keluar)

```
DASBOR MURID ──(sidebar/mobile: "Arena")──▶ ARENA
ARENA ──▶ /murid/* : TIDAK ADA (loop tertutup)
   └─ satu-satunya link keluar-scope: empty-state feed → /guru/kelasku (BUG)

ARENA ──▶ profil publik lain: /arena/profile/[id] (in-scope)
DASBOR ──▶ profil publik lain: /profile/[id]
```

| Pertanyaan | Jawaban |
|------------|---------|
| Global nav? | Tidak ada yang global. Murid punya 2 shell terpisah (dashboard + arena). |
| Arena-specific nav? | Arena header + bottom nav (navItems). |
| Dashboard-specific nav? | Sidebar murid + MuridMobileNav. |
| Berapa sistem nav? | 7 (2 murid + 3 arena + 2 floating/bell). |
| Murid keluar Arena ke Profil? | Tidak bisa — `Pemain` di dalam Arena (player), `Profil` di dashboard (murid/profile). Dua profil berbeda di dua shell berbeda. |
| Murid keluar Dashboard ke Arena? | Ya — 1 langkah ("Arena" di sidebar/bottom). |
| Duplikat link ke destinasi sama? | Ya — lihat matriks di bawah. |

### 3.3 Duplikasi link/NAV

| Destinasi | Muncul di | Keterangan |
|-----------|-----------|------------|
| Profil (diri) | `Profil` `/murid/profile` (nav murid) vs `Pemain` `/arena/player` (nav arena) | Dua halaman beda fungsi, label ambigu |
| Toko Koin | `/murid/toko-koin` vs `/arena/toko-koin` | **Dua halaman terpisah** (bukan re-export) |
| Pengumuman/Notif | `/murid/pengumuman` (papan kelas) vs `/arena/notifikasi` (aktivitas) vs `/arena/player/notifications` (player) | 3 konsep berbeda; bell dashboard → `/guru/notifikasi` (bug) |
| Leaderboard | `/arena/league` (kompetisi) vs `/arena/player/leaderboard` (papan) | Dua halaman; murid/beranda → player/leaderboard; arena beranda & game hub → league |
| AI | `/ai-bc` (floating) vs `/arena/ai` (quick action) vs `/murid/ai` (orphan) | 3 UI chat → 1 API |
| Simulasi | `/murid/simulasi/*` vs `/arena/simulasi/*` | Remount ganda |
| Tugas | `/murid/tugasku` vs `/arena/tugas` | Dua daftar hampir identik |

---

## 4. Current Student Experience Map

```
MURID LOGIN ──▶ /arena (Arena beranda; TK–SD → /junior)
                 │
                 ├─▶ /murid/beranda (Dasbor Murid: feed + ringkasan kelas)
                 │      └─▶ /murid/profile · /murid/tugasku · /murid/karya · simulasi · toko-koin …
                 │
                 └─ (loop tertutup, tidak bisa kembali ke dasbor)
                      ├─▶ /arena/feed (Karya) · /arena/tulis
                      ├─▶ /arena/game (Gim: 9 game solo) ──▶ /arena/game/kuis-tempur
                      ├─▶ /arena/league · /arena/misi · /arena/mystery-box · /arena/toko-koin
                      ├─▶ /arena/jalur-cerdas ──▶ lesson/belajar/latihan/kuis/praktik
                      ├─▶ /arena/simulasi·/arena/kompetisi (UKBI/TKA) · /arena/chat · /arena/materi
                      └─▶ /arena/player (dashboard pemain)
                             ├─▶ badges · achievements · history · notifications
                             ├─▶ leaderboard · profile (tabs)
```

**Masalah pengalaman**: fitur yang sama punya "home" ganda (tugas, toko, simulasi, profil, quest, AI) — murid tidak tahu mana yang benar; banyak halaman lama masih bisa diakses via URL langsung; shell ganda membuat konteks berubah drastis.

---

## 5. Duplicate Experience Matrix

Data point yang ditampilkan di >1 tempat, dengan sumber/API dan status:

| Data | Ditampilkan di (halaman) | Sumber/API | Konflik? | Rekomendasi canonical |
|------|--------------------------|------------|----------|------------------------|
| **XP** | `/murid/layout` sidebar · `/murid/beranda` hero · `/arena` hero · `/arena/game` · `/arena/league` · `/arena/player` · `/murid/profile` · `/profile/[id]` · `/murid/kuest-harian` · `/murid/progresku` (hardcoded) | `User.xp` (SSOT) / `PlayerProfile.totalXP` (cermin) | Cache 30s vs real-time (≤30 dtk selisih sementara) | `User.xp` — PlayerProfile cermin |
| **Level** | Sama seperti XP | `levelFromXp()` dihitung ulang; `User.level` denorm | `User.level` bisa stale | Selalu hitung `levelFromXp(User.xp)` |
| **Rank** | RankChip di layout/beranda/feed/karya/profil · rank-card player · league · profile publik | `rankFromLevel()` computed; `PlayerProfile.currentRank` denorm | Tidak | `rankFromLevel(levelFromXp(User.xp))`; jangan baca `User.league` (USANG) |
| **Koin** | `/murid/toko-koin` · `/murid/beranda` · `/murid/kuest-harian` · `/arena` hero · `/arena/player` | **DUA saldo**: `User.coins` vs `PlayerProfile.coin` | **YA — aktif** (level-up bonus hanya ke PlayerProfile.coin; toko belanja User.coins) | Sinkronkan; `User.coins` SSOT untuk toko/quest |
| **Streak** | `/murid/beranda` · `/murid/layout` · `/arena` · `/arena/player` · `/murid/profile` | **DUA counter**: `User.streak` (login) vs `PlayerProfile.streak` (aktivitas) | **YA — bisa beda** | Satu sumber (`User.streak`) |
| **Karya (count)** | `/murid/profile` · `/arena` ("Total Karya") · profile publik | `StudentKarya` via `/api/siswa/*` + profile-meta | Tidak | `/api/siswa/karya` |
| **Likes** | Detail karya · feed · `/murid/profile` stats | `StudentKaryaLike` (denorm) + `ProfileLike` (like profil — **konsep beda!**) | Hati-hati: 2 jenis "like" | Pisahkan label Like Karya vs Like Profil |
| **Followers/Following** | `/murid/profile` · `/profile/[id]` | `Follow` via `/api/user/profile/[id]/social` | Tidak | API sosial |
| **Badge** | `/murid/profile` (perkembangan) · `/arena/player` · `/arena/player/profile` · `/arena/player/badges` · beranda guru | `badge-engine.listUserBadges()` (1 sumber) | Tidak | `badge-engine` |
| **Achievement** | `/arena/player` · `/arena/player/profile` · `/arena/player/achievements` · `/murid/profile` (XP events) | `achievement-engine` | Tidak | `achievement-engine` |
| **Leaderboard** | `/arena/league` (top 50 + HOF) · LeagueMini (`/arena`) · GameHubLeagueTabs (`/arena/game`) · `/arena/player/leaderboard` · `/murid/beranda` Ringkasan | `getLeaderboard()` + 2 query custom + cache key duplikat | **YA — query duplikat** (3× mingguan, 2× harian) | Satu `getLeaderboard()` + satu cache key |
| **Misi/Quest** | `/arena/misi` (canonical) · `/murid/kuest-harian` (orphan) · daily-quest-card player · `/arena` beranda (mini) | `lib/coins.ts` | Tidak (1 engine) | `/arena/misi` |
| **Jalur Cerdas progress** | `/arena` beranda (card) · `/arena/jalur-cerdas` · unit detail · lesson · `/murid/progresku` (hardcoded) | `UserUnitProgress` | Progresku = fake | `UserUnitProgress` |
| **Koin hari ini** | `/arena` hero · league tab harian · LeagueMini | `CoinTransaction` groupBy | Query duplikat | Satu helper |
| **Premium identity** | `/profile/[id]` chip · `/murid/profile` · berlangganan | `resolveUserAiPlan()` | Tidak | `plan-resolver` (jangan flag mentah) |
| **Cosmetics** | `/murid/profile` · `/profile/[id]` · feed/karya/komentar | `User.equipped*` | Arena player TIDAK merender cosmetics (inkonsistensi visual) | `User.equipped*` |

---

## 6. Profile vs Player Comparison

### 6.1 Lima permukaan profil

| Aspek | `/murid/profile` | `/arena/player` | `/arena/player/profile` | `/profile/[id]` | `/arena/profile/[id]` |
|-------|------------------|-----------------|--------------------------|-----------------|------------------------|
| Identitas | ProfileHero (avatar+frame, warna+badge, nickname, bio, memberNumber, gelar) | PlayerHeader (avatar img, nama — **tanpa cosmetics**) | PlayerCard (avatar, nama, rank title) | ProfileHero peer (cosmetics + chip Guru/Murid·PRO/Free·sekolah) | Alias 100% |
| Gamifikasi | PlayerStatusBar (Level/XP/Koin/Streak/Rank) + XP bar | Chips XP/Koin/Rank + RankCard + StreakCard + WeeklyChampion + LearningFeedback | PlayerCard + badges/achievements | Rank crest + SocialProofStrip (Level/XP/Streak/Karya/Apresiasi) | = |
| Lencana/ach | AchievementShowcase (6) + perkembangan | BadgeGrid (6) + AchievementGrid (4) | **Semua** badge/achievement (tab penuh) | — | — |
| Karya | **FeaturedWorksGallery: filter, hapus, tulis** | — | — | Grid read-only | = |
| Sosial | SocialConnections (followers/following preview, likeNote) | LeaderboardPanel + NotificationCenter | — | **Follow + Like profil** (tombol) | = |
| Editing | **Ya** (PATCH profil, nickname rate-limit, avatar upload, hapus karya) | — | — | — | — |
| Cosmetics | ✅ | ❌ | ❌ | ✅ | ✅ |
| Logout | ✅ (modal) | ✅ (row) | ❌ | ❌ | ❌ |
| Reward realtime (level-up modal, popup) | ❌ | ✅ (PlayerProvider/Overlay) | ❌ | ❌ | ❌ |
| Quest harian | ❌ | ✅ DailyQuestCard | ❌ | ❌ | ❌ |
| Riwayat XP/Koin | ✅ ActivityFeed (XP only, 5) | ✅ Riwayat penuh (link) | ❌ | ❌ | ❌ |
| API utama | `/api/user/me`, `/profile-meta`, `/social`, `/player/*` (4), PATCH profil, nickname, DELETE karya | `/api/player/profile` (polling 20s) + badges/quests/leaderboard/notifications/history | via player-context | `/api/user/profile/[id]` + `/social` + `/follow` + `/like` | = |

### 6.2 Tumpang tindih komponen

- `ProfileHero` — satu-satunya komponen `components/profile/*` yang dipakai 2 halaman (`/murid/profile` isOwn, `/profile/[id]` peer). Semua komponen profil lain hanya di `/murid/profile`.
- `BadgeGrid` / `AchievementGrid` — dipakai dashboard + profile-tabs (API sama).
- Lencana satu sumber: profile-meta memakai `listUserBadges` yang sama — sudah terkonsolidasi.

### 6.3 Rekomendasi (verifikasi kode, belum eksekusi)

- **Canonical profile diri = `/murid/profile`** — satu-satunya yang menggabungkan identitas + cosmetics + karya + sosial + gamifikasi + editing.
- **`/arena/player` = hub aktivitas** (quest, leaderboard, reward realtime, riwayat) — bukan profil kedua.
- **`/arena/player/profile` layak dihapus/di-redirect** ke `/murid/profile` — isinya hampir seluruhnya duplikat ringkasan dashboard.
- **Profil peer (`/profile/[id]` + alias `/arena/profile/[id]`) sudah benar** — profil orang lain tetap terpisah.
- Perintah target menyebut `/arena/player` sebagai canonical — **audit menemukan bukti yang berlawanan**: `/murid/profile` lebih lengkap. Keputusan akhir butuh founder; temuan ini dicatat sebagai penyimpangan dari asumsi awal.

---

## 7. Dashboard vs Arena Comparison

| Aspek | `/murid/beranda` (Learning Home saat ini) | `/arena` (Gamification Home saat ini) |
|-------|-------------------------------------------|----------------------------------------|
| Shell | Sidebar murid + mobile nav + AIFloatingButton | Arena header + bottom nav, **tanpa AI floating** |
| Fokus | Feed karya (infinite scroll), Karya Pilihan, Ringkasan Kelasku (tugas/pengumuman/materi/leaderboard), murid aktif | Hero identitas + XP/koin/streak/rank, NextActionCard, MentorCard, SkillRadar, tugas+materi card, Jalur Cerdas card, Kompetisi Minggu Ini, Simulasi, Aksi Cepat (tulis/AI Cerdik/kotak misteri/gabung kelas), Pemenang Game, LeagueMini, Statistik Kamu, Misi Harian |
| Konten eksklusif belajar | Feed karya, Karya Pilihan | Jalur Cerdas card, NextAction, Mentor |
| Konten eksklusif gamifikasi | Leaderboard mini card | LeagueMini, misi, statistik, kompetisi |
| Konten duplikat | XP/koin/streak di hero (sama dengan arena) | XP/koin/streak (sama dengan beranda) |
| Tugas/materi | Ringkasan → `/murid/tugasku` | Card → `/arena/tugas` (duplikat) |

**Catatan**: sebenarnya tidak ada `/murid/dashboard` — Learning Home murid adalah `/murid/beranda`. `/murid/progresku` (Kemajuanku) adalah placeholder data hardcoded yang seharusnya mati atau menunjuk ke `/arena/player`.

**Target konsolidasi** (belum dieksekusi):
- `/murid/beranda` = Learning Home sederhana: greeting, AI BC companion, rekomendasi belajar (NextAction), lanjutkan belajar (Jalur Cerdas), tugas, aktivitas penting, ringkasan progress, shortcut seperlunya. **Hapus feed karya 1 kolom** (karya pindah ke KARYA/feed).
- `/arena` = Gamification Home: hero, misi, gim, liga, leaderboard, toko koin, jalur cerdas (progress), tanpa duplikasi statistik beranda.

---

## 8. Liga Architecture

### 8.1 Status: sudah menjadi bagian Arena

- Satu-satunya halaman: `/arena/league` (di bawah pohon `/arena`, styling `arena-page`).
- Masuk **nav arena desktop** (`navItems`: Beranda/Karya/Gim/**Liga**/Obrolan/Pemain) tapi **tidak masuk bottom nav mobile** — di mobile hanya via link in-page.
- **Tidak ada `/liga` di root**, tidak ada `api/liga`. Engine berbagi `PlayerProfile`/`XPTransaction` dengan fitur Arena lain.

### 8.2 Engine

- `getLeaderboard()` — scope GLOBAL/SCHOOL/CLASS/FRIENDS/PROVINCE × period ALL_TIME/WEEKLY/SEASON; `PlayerProfile.weeklyXP` lazy-reset Senin 00:00 WIB; Redis cache 60s.
- `getWeeklyCompetition()` — myRank, above/below, gap, top 10, weekInSeason 1–4, countdown WIB, Hall of Fame (6).
- `podium-rewards.ts` — settlement lazy tanpa cron: mingguan 300/200/100 XP+koin+badge; season 500/350/250 + badge LEGENDARY; idempotent via `LeaderboardPeriodResult`.

### 8.3 Temuan

- **`WeeklySeason` model = DEAD** (0 pemakaian — settlement memakai `LeaderboardPeriodResult`).
- **`/api/siswa/league` = orphan** (0 konsumen).
- **`User.league`/`LeagueType` legacy** — masih dibaca 4 route, tidak pernah ditulis.
- **Leaderboard diduplikasi**: papan mingguan dihitung 3× (league page `getLeaderboard`; beranda & game hub query custom dengan cache key sama), harian 2× (`league:harian:v2:top50` vs `arena:league-mini:daily:v2`).

### 8.4 Target arsitektur (terverifikasi)

```
Arena
 ├── Liga (/arena/league)   ← canonical leaderboard kompetisi
 └── Gim (/arena/game)
      └── Kuis Tempur
```
Liga tidak perlu route baru — cukup: (a) tambah Liga ke bottom nav mobile, (b) konsolidasi query leaderboard ke 1 engine + 1 cache key, (c) hapus komponen duplikat (`GameHubLeagueTabs` → wrapper tipis LeagueMini atau sebaliknya), (d) deprecate `WeeklySeason`/`/api/siswa/league`/`User.league`.

---

## 9. Kuis Tempur Architecture

### 9.1 Status: sudah menjadi game di dalam Arena

- Route: `/arena/game/kuis-tempur` (client, 34 baris). Bila `MULTIPLAYER_ENABLED` (default **OFF** — server VPS mati) → `KuisTempurSolo` (mode solo melawan bot); bila ON → `GameLobby`.
- **Komponen solo `KuisTempurSolo.tsx` (1138 baris)** — canvas 2D murni client ("RIMBA_KATA"), tanpa server pertandingan. Fase: pilih karakter → main (5 menit) → hasil + kirim XP. Bot dari `QUESTION_BANK` (±142 soal kurasi).
- Hub: `/arena/game` — kartu Kuis Tempur = featured hero, badge "Terpopuler", `soloSaatOffline` → tetap dimainkan tanpa server.

### 9.2 Karakter & progression

- 3 maskot: **Zelby / Hazel / Alby** — SSOT `lib/arena-junior/karakter.ts` (aset `public/junior/karakter/*.webp`).
- **Persistence = localStorage** (`bc-karakter`, `bc-kuis-tempur-level` 1–99) — **TIDAK ada di DB**; level ronde hilang lintas perangkat.
- Progresi: `lib/game/kuis-tempur-progression.ts` — `kurvaPemain(level)`, `lawanBot(level)`, 4 arketipe bot (ringan/sedang/berat/penembak).

### 9.3 XP/koin

- `POST /api/game/xp` — skor dihitung **server** (cap RIMBA_KATA=600), XP = floor(skor/10), reference `crypto.randomUUID()` (anti-farming tetap aman), rate limit 20/mnt, kuota harian.
- Pemisahan guru/murid: guru → `awardGuruXp` (flat); murid → `awardXp` + koin 5.
- Menulis `GameResult` + invalidasi cache league.

### 9.4 Kesimpulan

- Kuis Tempur **sudah berperilaku sebagai Arena game** (route di bawah `/arena/game`, XP via engine umum, kartu di hub Gim). Target `Arena → Gim → Kuis Tempur` **terpenuhi tanpa perubahan arsitektur**.
- Gap: persistence karakter/level di localStorage (kandidat migrasi ke DB `PlayerProfile` di fase eksekusi), mode MP ter-gate oleh server mati.
- Legacy yang bisa dibersihkan: `/murid/game/*`, `/murid/kuis-game`, `/murid/katastra*`, `/arena/battle`, `components/game/TTSpage.tsx` (orphan), `components/shared/sidebar.tsx` (tak dipakai), `app/game/[code]` (tombol kembali → `/murid/game` orphan, harus → `/arena/game`).

---

## 10. AI BC Architecture

### 10.1 Empat persona chat, satu API

| UI | Route | API | Audiens | Status |
|----|-------|-----|---------|--------|
| "AI BC" (tema merah, paling lengkap: kategori, mode murid/guru, regenerate, salin) | `/ai-bc` | `POST /api/ai/chat` | **Publik** (halaman tanpa guard; API mewajibkan login → pengunjung publik dapat pesan gagal) | Canonical publik |
| "AI Cerdik" (emerald/violet, paling sederhana) | `/arena/ai` | `POST /api/ai/chat` | Murid/Guru (login) — ditaut dari quick action `/arena` | **Kandidat primary murid** |
| "AI Tutor" (violet, riwayat multi-pesan) | `/murid/ai` | `POST /api/ai/chat` | Murid — **ORPHAN, 0 tautan** | Ditutup/digabung |
| "AI BC Assistant" (agent guru) | `/guru/ai-tools` | `POST /api/ai/agents/run` (agent `bc-assistant`) | Guru (kuota Pro) | Terpisah (guru) |

### 10.2 Temuan

- **3 UI chat murid → 1 endpoint** (`/api/ai/chat`, Groq `gpt-oss-120b` → fallback DeepSeek, rate limit 20/mnt). Persona "AI BC" vs "AI Cerdik" vs "AI Tutor" — identitas ganda.
- `AIFloatingButton` → `/ai-bc` hanya di **dashboard murid+guru**; **Arena tidak punya floating AI** (satu-satunya jalan: quick action di beranda).
- `PendampingBelajar` (Zelby/Hazel/Alby di lesson) = **rule-based, bukan LLM** — tidak bertabrakan dengan chat AI.
- `MentorCard`/`NextActionCard`/`SkillRadar` = learning-loop rule-based (tanpa LLM, tanpa kuota).
- `src/ai/agents/bc-assistant-agent.ts` menyebut "Replaces the current hardcoded implementation in app/api/ai/chat" — duplikasi persona sudah dikenali di sisi agent.

### 10.3 Rekomendasi target

- **AI BC = learning companion global**: hadir di BERANDA (`/murid/beranda`) dan dapat dipanggil kontekstual di area lain — bukan menu utama tersendiri.
- **Satu UI chat bersama** (shared component): `/arena/ai` sebagai primary murid (sudah tertaut, terautentikasi); `/ai-bc` tetap untuk publik/SEO; `/murid/ai` di-redirect.
- **AIFloatingButton murid → `/arena/ai`** (atau konsisten ke satu route), pertimbangkan memasang floating AI di Arena juga.
- Perbaiki teks basi "Ditenagai Google Gemini" (provider aktual Groq/DeepSeek) dan guard publik `/ai-bc`.

---

## 11. Responsive Architecture Findings

### 11.1 Layout induk

| Layout | Main container | Efek desktop |
|--------|---------------|--------------|
| `murid/layout.tsx` | `flex-1 md:ml-64 p-4 md:p-8` — **tanpa max-w** | Halaman bisa lebar; batasan muncul per-halaman |
| `arena/layout.tsx` | `mx-auto max-w-lg md:max-w-4xl px-0 md:px-6` | **Semua halaman arena di-cap 896px di desktop** |

### 11.2 Tabel halaman → max-width → masalah

| Halaman | max-w | Masalah desktop |
|---------|-------|-----------------|
| `/murid/beranda` | `max-w-3xl` (768px) | Feed 1 kolom di area 1184px → kolom teks sangat panjang |
| `/murid/profile` | `max-w-4xl` (896px) | Banyak ruang kosong di layar ≥1920px |
| `/arena` | `max-w-5xl` (1024px) | **Tidak pernah efektif** — layout arena sudah cap 896px |
| `/arena/league` | `max-w-3xl` (768px) | **Dua lapis constrain** (768px di dalam 896px) |
| `/arena/feed`, `/arena/simulasi/*` | `max-w-3xl` | Sama — double-cap |
| `/arena/game` | **tanpa max-w** | Satu-satunya yang memakai penuh 896px — paling sehat |
| `/arena/player` | tanpa max-w (px-4) | Terikat 896px layout; **responsive-nya paling baik** |
| `/murid/progresku` | **tanpa max-w** | Full-width (paling lebar) — kebalikan dari beranda |
| `/murid/tugasku` | `max-w-4xl` | OK |
| `/murid/gabung-kelas` | `max-w-lg` (512px) | Paling "HP-like" di desktop |
| `/arena/game/tantang`, jalur belajar | `max-w-lg` | Sama |

### 11.3 Kesimpulan

- **Pola tidak konsisten**: full-width (progresku) vs 768px (beranda/league) vs 512px (gabung-kelas) tanpa aturan.
- Arena berlapis constrain (layout 896 + halaman 768/512).
- Halaman dengan grid md+ sudah ada: beranda (sm:2/md:2), profile (md:3), progresku (md:4/2), player (md:2), game hub (sm:2). Yang belum: **feed karya (1 kolom)**, **league (1 kolom)**.
- Target: PHONE responsive · TABLET layout teroptimasi · DESKTOP full-width — butuh standar container (mis. `max-w-7xl` halaman + grid md+) alih-alih `max-w-lg/3xl` universal.

---

## 12. Dark/Light Theme Findings

| Item | Temuan |
|------|--------|
| `tailwind.config.ts` | `darkMode: ["class"]` **diset** |
| ThemeProvider | **TIDAK ADA** (grep `ThemeProvider\|next-themes` = 0). `providers.tsx` hanya user + analytics |
| `globals.css` | Vars hsl hanya `:root` (light); **TIDAK ada blok `.dark`**; tidak ada `dark:` di CSS |
| `player-theme.css` | **Dark-only permanen** (Navy `#0b132b`, Royal `#2b4bff`, Gold `#ffd24a`) — tidak adaptif |
| `arena.css` `.game-hub` | Dark-only (`#0E0B1A`) |
| File dengan `dark:` | Hanya 4: `guru/game/page.tsx` (114×), `guru/game/history` (40×), `ComingSoon` (2×), `guru/game/lobby` (1×) — **0 file di murid/arena/gamification** |
| Warna hard-coded | Dominan: `bg-white`, `text-gray-900`, `bg-slate-50`, `border-gray-100` di ratusan file |
| Pengaturan tema | **Tidak ada** — `/murid/pengaturan` redirect ke `/murid/profile` |

**Estimasi usaha**: infra (next-themes + `.dark` vars + toggle) = kecil–sedang (~5–8 file); konversi utility di halaman murid/arena/gamification = **BESAR** (60–100+ file). `player-theme` & `game-hub` yang sengaja dark-only perlu keputusan desain (adaptif vs tetap) sebelum disentuh.

---

## 13. Canonical Data Source Matrix

| Domain | Sumber saat ini | Konsumen | Duplikasi? | Canonical yang direkomendasikan |
|--------|-----------------|----------|------------|---------------------------------|
| Profile (identitas) | `User` + `Profile` via `/api/user/me` | Semua halaman | Tidak | `/api/user/me` |
| XP | `User.xp` (ditulis `awardXp()`); `PlayerProfile.totalXP` cermin (transaksi sama) | `/murid/*`, `/arena` (User.xp); player (totalXP) | **Sudah satu sumber** (sisa: cache 30s vs real-time) | `User.xp` (SSOT) |
| Level | `levelFromXp()` computed; `User.level` denorm | Layout murid dkk. | Denorm bisa stale | Hitung dari XP; jangan baca `User.level` mentah |
| Rank | `rankFromLevel()` computed; `PlayerProfile.currentRank` denorm; `User.league` **USANG** | RankChip, league, player | Tidak | `rankFromLevel(levelFromXp(User.xp))`; jangan baca `User.league` |
| Coin | **DUA**: `User.coins` (`lib/coins.ts`) vs `PlayerProfile.coin` (`coin-engine.ts` + bonus level-up) | Toko/quest (User.coins); player (profile.coin) | **YA — konflik aktif** | `User.coins` SSOT; `addCoin` sinkron ke `User.coins` |
| Streak | **DUA**: `User.streak` (login) vs `PlayerProfile.streak` (aktivitas) | Beranda/layout/arena vs player | **YA — bisa beda** | `User.streak` (sudah ada freeze logic) |
| Karya | `StudentKarya` via `/api/siswa/karya` | Karya, feed, profil | Tidak | `/api/siswa/karya` |
| Likes karya | `StudentKaryaLike` (denorm `likesCount`, `totalLikes`) | Detail/feed/profil | Tidak | Route like |
| Followers/Following | `Follow` via `/api/user/profile/[id]/social` | Profil diri + peer | Tidak | API sosial |
| Like profil | `ProfileLike` (konsep terpisah dari like karya) | `/murid/profile`, `/profile/[id]` | Hati-hati label | Pisahkan di UI |
| Badge | `Badge`+`UserBadge` via `badge-engine` → `/api/player/badges` (+ profile-meta) | Player, murid/profile, guru | Tidak (sudah 1 sumber) | `badge-engine.listUserBadges()` |
| Achievement | `Achievement`+`UserAchievement` via `achievement-engine` | Player | Tidak | `achievement-engine` |
| Leaderboard | `getLeaderboard()` + **query custom duplikat** (league-mini, game-hub) | League, player, beranda | **YA — 3× mingguan, 2× harian** | `getLeaderboard()` + 1 cache key |
| Missions/Quests | `DailyQuest` via `lib/coins.ts` → `/api/player/quests` | `/arena/misi`, player card | Tidak | `lib/coins.ts` |
| Learning progress | `UserUnitProgress` (+`ProgresKompetensi` UKBI/TKA) | Jalur Cerdas, dokumen | Tidak | Route masing-masing |
| AI BC | `POST /api/ai/chat` (tanpa tabel riwayat murid) | 3 UI chat | Tidak (API tunggal; UI ganda) | `/api/ai/chat` |
| Premium | `User` flags → `resolveUserAiPlan()` (`plan-resolver.ts`) | billing, quota, UI | Tidak | `resolveUserAiPlan()` |
| Cosmetics | `StoreItem`+`UserItem`+`User.equipped*` via `/api/siswa/store/*` | Toko, profil, feed, game | `PlayerProfile.frame/title/avatar` = kosmetik rank-up **terpisah** | `User.equipped*` |

**Catatan penting**: `awardXp()` menulis `User.xp` DAN `PlayerProfile.totalXP` dalam satu transaksi — XP tidak lagi dua sumber. `CoinTransaction` adalah tabel audit bersama (riwayat dua sistem tercampur). `PlayerProfile.avatar` = penimpa kosmetik, bukan foto profil.

---

## 14. Recommended Student IA v1

```
MURID
├── 1. BERANDA   /murid/beranda          Learning Home
│      greeting · AI BC companion · rekomendasi belajar (NextAction)
│      lanjutkan belajar (Jalur Cerdas) · tugas · aktivitas penting
│      ringkasan progress · shortcut seperlunya
│
├── 2. PROFIL    /murid/profile          Player Identity (canonical)
│      avatar/nama/level/XP/rank/streak/koin · karya · like/followers/following
│      badge/achievement · statistik · aktivitas · cosmetics · premium
│      (/arena/player tetap sebagai hub aktivitas: quest, leaderboard, reward)
│
├── 3. ARENA     /arena                  Gamification Home
│      Arena overview · Gim (/arena/game ── Kuis Tempur + 8 game solo)
│      Liga (/arena/league) · Leaderboard · Misi · badge/achievement
│      Toko Koin · Jalur Cerdas (progress)
│
├── 4. KARYA     /arena/feed (+/arena/tulis)   Creative + Social Work
│      jelajah karya · like · komentar · karya saya · social discovery
│
├── 5. OBROLAN   /arena/chat             Communication (kelas)
│
├── 6. PENGATURAN /murid/pengaturan      Account/Preferences (BARU — saat ini redirect)
│      tema (Light/Dark/System) · privasi · notifikasi
│
└── 7. AI BC     companion global        Bukan menu utama; hadir di Beranda
       + dapat dipanggil kontekstual (floating/quick action)
```

Prinsip: satu fitur = satu canonical home; profil diri satu permukaan; summary cards boleh, detail page satu.

---

## 15. Proposed Navigation

### 15.1 Dasbor Murid (sidebar desktop + mobile)

| Grup | Item | Route |
|------|------|-------|
| Utama | Beranda · Arena · Karya · Obrolan | `/murid/beranda` · `/arena` · `/arena/feed` · `/arena/chat` |
| Belajar | Jalur Cerdas · Tugasku | `/arena/jalur-cerdas` · `/murid/tugasku` |
| Simulasi | UKBI · TKA · Dokumen Hasil Latihan | `/murid/simulasi/ukbi` · `/tka` · `/murid/dokumen-latihan` |
| Lainnya | Profil · Pengaturan · Toko Koin | `/murid/profile` · `/murid/pengaturan` (baru) · `/murid/toko-koin` |

### 15.2 Arena (header desktop + bottom nav mobile)

| Tab | Route |
|-----|-------|
| Beranda · Karya · Gim · Liga · Obrolan · Pemain | `/arena` · `/arena/feed` · `/arena/game` · `/arena/league` · `/arena/chat` · `/arena/player` |

**Catatan**: Bottom nav mobile saat ini **tanpa Liga** — tambahkan Liga agar konsisten dengan header desktop (6 tab atau pertukaran). Arena perlu satu pintu keluar yang jelas ke Dasbor Murid (non-APK): tombol "Dasbor Murid" sudah ada di header — pertahankan, dan perbaiki link bug feed → `/guru/kelasku`.

### 15.3 AI BC

- Beranda murid: kartu/kotak AI BC (companion) + AIFloatingButton → `/arena/ai` (konsisten).
- Arena: pertahankan quick action + tambahkan floating AI di Arena (opsional).

---

## 16. Proposed Route Consolidation

### 16.1 Canonic yang dipertahankan

| Fitur | Canonical | Alias/remount yang harus jadi redirect |
|-------|-----------|----------------------------------------|
| Learning Home | `/murid/beranda` | — |
| Profil diri | `/murid/profile` | `/arena/player/profile` → redirect |
| Hub aktivitas pemain | `/arena/player` | — |
| Karya (feed) | `/arena/feed` (+ `/arena/tulis`) | `/murid/beranda` feed 1 kolom dihapus; `/murid/karya/[id]` tetap (link dari beranda) |
| Gim | `/arena/game/*` | `/murid/game/*`, `/murid/kuis-game`, `/murid/katastra*` → redirect |
| Liga | `/arena/league` | — (tambah bottom nav) |
| Leaderboard | `/arena/player/leaderboard` (scope×period) vs `/arena/league` (kompetisi) — dua fungsi berbeda, pertahankan keduanya | — |
| Misi | `/arena/misi` | `/murid/kuest-harian` → redirect |
| Tugas | `/murid/tugasku` (dashboard) **atau** `/arena/tugas` (arena) — **pilih satu** | Satunya → redirect |
| Simulasi | `/murid/simulasi/*` **atau** `/arena/simulasi/*` — pilih satu | Satunya → redirect |
| Test screen | `(dashboard)/kompetisi/[paketId]` | `/arena/kompetisi/*` remount — evaluasi: pertahankan (APK) atau redirect |
| Toko Koin | `/murid/toko-koin` **atau** `/arena/toko-koin` — pilih satu (saran: gabungkan fitur kedua halaman menjadi satu) | Satunya → redirect |
| Chat AI | `/arena/ai` (murid) + `/ai-bc` (publik) | `/murid/ai` → redirect |
| Profil publik | `(dashboard)/profile/[id]` | `/arena/profile/[id]` pertahankan (alias APK) |
| BIGT | `/murid/bigt` **atau** `/arena/simulasi/bigt` — pilih satu | Satunya → redirect |
| Dokumen | `/murid/dokumen-latihan` **atau** `/arena/simulasi/hasil` — pilih satu | Satunya → redirect |
| Gabung Kelas | `/murid/gabung-kelas` **atau** `/arena/gabung-kelas` — pilih satu | Satunya → redirect |

### 16.2 Hapus / repurpose

| Route | Aksi |
|-------|------|
| `/murid/progresku` (hardcoded) | Hapus dari nav; data ada di `/arena/player` — hapus atau jadikan wrapper ringkas |
| `/murid/olimpiade/info` + `/kalender` (stub) | Isi atau hapus dari nav (saat ini "dalam pengembangan") |
| `/murid/komunitas/daftar` (orphan) | Wire ke nav KARYA/Komunitas atau hapus |
| `/arena/jalur-cerdas/[unitId]/{belajar,latihan,kuis,praktik}` (orphan) | Hapus atau arsip — lesson engine sudah menggantikan |
| `/murid/pengaturan` | **Jadikan halaman nyata** (Pengaturan: tema/privasi/notifikasi) |
| `/kompetisi/latihan` (legacy list) | Evaluasi (target "kembali" dari hasil tes) |
| `app/profile/` (kosong) | Bersihkan |

---

## 17. Legacy Route Compatibility Strategy

- **Redirect, bukan hapus**: semua route lama yang masih mungkin di-bookmark/diindex → `redirect()` permanen ke canonical (pola sudah ada: `/murid/ukbi` → `/murid/simulasi/ukbi`, `/murid/sertifikat` → `/murid/dokumen-latihan`, `/arena/battle` → `/arena/game`).
- **Pertahankan alias APK**: `/arena/profile/[id]`, `/arena/kompetisi/*`, `/arena/login`+`/arena/register` — halaman yang harus tetap in-scope `/arena` untuk Android APK. Jangan pernah redirect alias ini ke `/murid/*` (akan melempar murid ke tab browser).
- **`lib/arena-scope.ts`**: `useKompetisiHref()` / `useBerandaHref()` / `useTugasHref()` menentukan pohon navigasi berdasarkan path — konsisten, pertahankan.
- **Sitemap/SEO**: audit tautan di `app/sitemap.ts`, `lib/supabase/proxy.ts` (daftar halaman publik) saat route berubah.
- **Test scripts**: `test-bigt-menu`, `test-simulation-workflow`, `test-phase-simulation-workflow`, `test-bahasa-ui`, `test-dokumen-latihan-sanitization` membaca string/route tertentu — **update test bersamaan**, bukan setelah.
- **Dua fase**: fase 1 tambah redirect + update nav; fase 2 (opsional) hapus file legacy setelah masa transisi.

---

## 18. Risks

| # | Risiko | Level | Mitigasi |
|---|--------|-------|----------|
| 1 | **Koin dua saldo**: `PlayerProfile.coin` menerima bonus level-up yang tidak bisa dibelanjakan di toko (`User.coins`) | High | Sinkronkan `addCoin` ke `User.coins` dalam 1 transaksi sebelum/bersamaan konsolidasi IA |
| 2 | **Streak dua counter** bisa menampilkan nilai berbeda | Medium | Tetapkan satu sumber (`User.streak`) |
| 3 | **APK scope**: redirect alias `/arena/*` ke `/murid/*` akan melempar murid ke browser tab | High | Jangan sentuh `/arena/profile/[id]`, `/arena/kompetisi/*`, `/arena/login`, `/arena/register`; pakai `lib/arena-scope.ts` |
| 4 | **Test scripts sensitif** terhadap string/route (sanitization scan, menu tests) | Medium | Update test bersamaan; jangan hapus file yang dibaca test tanpa update |
| 5 | **`/murid/beranda` saat ini = feed sosial**; mengubahnya menjadi Learning Home menghapus pintu utama karya | Medium | Pastikan `/arena/feed` + nav KARYA siap sebelum feed beranda dihapus |
| 6 | **NotificationBell hardcoded `/guru/notifikasi`** untuk murid | Low (bug) | Perbaiki saat fase UI |
| 7 | **Leaderboard query duplikat** (3× mingguan) bisa memberi angka berbeda antar halaman | Medium | Konsolidasi ke `getLeaderboard()` + 1 cache key |
| 8 | **Dark mode refactor besar** (60–100+ file) — risiko regresi visual | Medium | Kerjakan terakhir, bertahap per halaman |
| 9 | **`/murid/ai` orphan** — menghapusnya aman, tapi pastikan `/arena/ai` sudah paritas fitur | Low | Sebelum redirect |
| 10 | **Karya: 2 jenis "like"** (karya vs profil) — label membingungkan | Low | Pisahkan label di UI |

---

## 19. Files likely to change in future phases (STEP 2+)

### Navigasi & layout
- `app/(dashboard)/murid/layout.tsx` — sidebar inline (grup ulang, tambah Pengaturan, hapus stub)
- `components/dashboard/MuridMobileNav.tsx` — bottom nav + drawer
- `app/arena/layout.tsx` — header nav (link keluar yang jelas, non-APK)
- `app/arena/bottom-nav.tsx` — tambah Liga
- `components/arena/HeaderActions.tsx` (mungkin: tambah koin/XP chip)
- `components/dashboard/NotificationBell.tsx` — fix hardcode `/guru/notifikasi`
- `components/shared/AIFloatingButton.tsx` — target href konsisten

### Profil
- `app/arena/player/profile/page.tsx` — redirect ke `/murid/profile`
- `components/arena/player/profile-tabs.tsx` — hapus/dipertahankan sesuai keputusan
- `app/(dashboard)/murid/profile/page.tsx` — tambah ringkasan quest + leaderboard (opsional)
- `components/arena/player/player-dashboard.tsx` — bila perlu tambah link profil

### Konsolidasi route (redirect)
- `/murid/kuest-harian` · `/murid/komunitas/daftar` · `/murid/ai` · `/murid/progresku` · `/murid/katastra*` · `/murid/game/*` · `/murid/kuis-game` · jalur-cerdas orphan (`belajar/latihan/kuis/praktik`)
- Keputusan satu-home: `/murid/toko-koin` vs `/arena/toko-koin`; `/murid/tugasku` vs `/arena/tugas`; `/murid/simulasi/*` vs `/arena/simulasi/*`; `/murid/bigt` vs `/arena/simulasi/bigt`; `/murid/dokumen-latihan` vs `/arena/simulasi/hasil`; `/murid/gabung-kelas` vs `/arena/gabung-kelas`

### Liga & leaderboard
- `app/arena/league/league-tabs.tsx` · `app/arena/league-mini.tsx` · `app/arena/game/page.tsx` (GameHubLeagueTabs) — konsolidasi query/cache key
- `app/api/arena/competition/route.ts` · `lib/gamification/motivation.ts` (opsional: 1 helper)
- Deprecate: `WeeklySeason` (schema), `/api/siswa/league`, `User.league`

### AI
- `app/(dashboard)/murid/ai/page.tsx` — redirect/hapus
- `app/arena/ai/page.tsx` — upgrade ke shared chat component (paritas fitur `/ai-bc`)
- `app/ai-bc/page.tsx` — fix guard publik + teks provider

### Pengaturan (baru)
- `app/(dashboard)/murid/pengaturan/page.tsx` — halaman nyata (ganti redirect)

### Responsif & tema
- `app/arena/layout.tsx` (max-w) · `app/arena/league/page.tsx` · `app/arena/feed/page.tsx` · `app/(dashboard)/murid/beranda/page.tsx` (feed 2 kolom) — standar container
- `tailwind.config.ts` + `app/globals.css` + `app/providers.tsx` + `app/layout.tsx` — ThemeProvider + `.dark`
- File murid/arena/gamification — konversi `dark:` (fase besar)

### Test scripts
- `scripts/test-bigt-menu.ts` · `test-simulation-workflow.ts` · `test-phase-simulation-workflow.ts` · `test-bahasa-indonesia-ui.ts` · `test-dokumen-latihan-sanitization.ts`

---

## 20. Files that MUST NOT be changed in the consolidation

| File/Area | Alasan |
|-----------|--------|
| `lib/gamification/` (engine: levels, ranks, xp-engine, coin-engine, badge-engine, achievement-engine, leaderboard, season, motivation, podium-rewards, rank-up, rank-rewards, player, xp-config, xp-guard) | Logika gamifikasi/XP/leaderboard — perintah audit melarang perubahan |
| `lib/award-xp.ts` | Pintu XP tunggal — jangan diubah |
| `lib/coins.ts` | Quest/koin legacy — jangan diubah |
| `prisma/schema.prisma` + semua migration | Perintah audit melarang perubahan schema |
| `lib/ai-gateway/plan-resolver.ts` + `lib/billing/limits.ts` | Premium economy — jangan diubah |
| `lib/supabase/*`, `lib/db.ts`, `lib/redis.ts` | Infrastruktur data |
| `app/api/game/xp/route.ts`, `app/api/katastra/submit/route.ts` | XP game — jangan diubah |
| `lib/game/kuis-tempur-progression.ts`, `lib/game/question-bank.ts`, `components/game/KuisTempurSolo.tsx` | Kuis Tempur — jangan diubah |
| `app/arena/kompetisi/*`, `app/(dashboard)/kompetisi/*` | Test screen UKBI/TKA — jangan diubah |
| `app/arena/login`, `app/arena/register`, `app/arena/profile/[id]` | Alias APK — jangan redirect ke luar `/arena` |
| `lib/arena-scope.ts` | Mekanisme scope navigasi APK |
| `next.config.ts`, `vercel.json` | Konfigurasi build/deploy |

---

## 21. Recommended implementation sequence

Fase berikutnya (masing-masing berhenti pada QA + build hijau; **bukan bagian audit ini**):

1. **Fase A — Data hygiene (pra-UI)**: sinkronkan koin (`addCoin` → `User.coins`) dan streak (satu sumber). Risiko rendah, memperbaiki dua konflik aktif.
2. **Fase B — Nav & shell**: tambah Liga di bottom nav mobile; fix NotificationBell (`/guru/notifikasi` → route murid); fix empty-state feed → `/guru/kelasku`; putuskan satu-home per fitur duplikat (toko/tugas/simulasi/bigt/dokumen/gabung-kelas) + pasang redirect.
3. **Fase C — Profil**: redirect `/arena/player/profile` → `/murid/profile`; tambah ringkasan quest/leaderboard di `/murid/profile`; pertahankan `/arena/player` sebagai hub aktivitas.
4. **Fase D — Beranda & Arena**: kurangi `/murid/beranda` jadi Learning Home (pindah feed → `/arena/feed`); rapikan `/arena` (hapus duplikasi statistik); buat `/murid/pengaturan` nyata.
5. **Fase E — AI BC**: satu shared chat component; `/arena/ai` primary; `/murid/ai` redirect; AIFloatingButton konsisten; fix guard `/ai-bc`.
6. **Fase F — Kebersihan legacy**: redirect/orphans (kuest-harian, komunitas, katastra, game lama, progresku, jalur orphan, olimpiade stub); update test scripts bersamaan; deprecate `WeeklySeason`/`/api/siswa/league`/`User.league`.
7. **Fase G — Liga/leaderboard konsolidasi**: satu engine + satu cache key; `GameHubLeagueTabs` → wrapper.
8. **Fase H — Responsif**: standar container (hapus cap 896/768), feed 2 kolom di md+.
9. **Fase I — Tema**: ThemeProvider + `.dark` vars + toggle Light/Dark/System; konversi bertahap per halaman (terakhir, risiko besar).

Setiap fase: `npx tsc --noEmit` → test terkait → `npm run build` → verifikasi APK scope → deploy.

---

## Lampiran A — Ringkasan verifikasi audit

| Metrik | Nilai |
|--------|-------|
| Route murid diinventarisasi | ~115 (40+ `/murid/*`, 65+ `/arena/*`, 10 lain) |
| Sistem navigasi ditemukan | 7 |
| Halaman dengan data point gamifikasi ganda | ~12 (XP/koin/streak/rank/badge/leaderboard) |
| Route duplikat (remount/alias) | ~14 |
| Route legacy/orphan/stub | ~15 |
| Redirect existing | 8 |
| Konflik data aktif | 2 (koin, streak) |
| Dead code ditemukan | `WeeklySeason`, `/api/siswa/league`, `User.league`, `TTSpage.tsx`, `components/shared/sidebar.tsx`, `app/profile/` (kosong) |
| Bug UX ditemukan | NotificationBell → `/guru/notifikasi` (hardcoded guru), empty-state feed → `/guru/kelasku`, `/ai-bc` publik vs API login, teks "Ditenagai Gemini" basi |

## Lampiran B — Agent/alat yang dipakai

Audit ini dilakukan dengan 8 agent eksplorasi paralel (read-only) + verifikasi langsung: route inventory, nav map, duplicate matrix, profil vs player, dashboard vs arena, Liga, Kuis Tempur, AI BC, responsif, tema, canonical data source, dan inventory halaman sisa. Semua temuan diverifikasi dari file sumber.
