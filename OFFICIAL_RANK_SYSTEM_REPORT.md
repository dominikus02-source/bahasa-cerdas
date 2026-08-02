# OFFICIAL_RANK_SYSTEM_REPORT

**BahasaCerdas — Sistem Rank & Level Resmi (Sprint 6)**
Tanggal: 2 Agustus 2026 · Status: **IMPLEMENTED**

---

## 1. Peta Rank → Level (Sumber Kebenaran)

Sistem 9 rank resmi, **dihitung dari level** (computed, tidak pernah hardcode per user). Level 1–100, dibagi dalam 9 band resmi:

| Rank | Title (Bahasa Indonesia) | Level | Warna Tema |
|------|---------------------------|-------|------------|
| BRONZE | Pemula | 1–9 | `#cd7f32` |
| SILVER | Pelajar | 10–19 | `#c0c0c0` |
| GOLD | Cendekia | 20–29 | `#ffd700` |
| EMERALD | Akademisi | 30–39 | `#2e8b57` |
| RUBY | Ahli Bahasa | 40–49 | `#e0115f` |
| SAPPHIRE | Guru Bahasa | 50–59 | `#0f52ba` |
| DIAMOND | Master Bahasa | 60–69 | `#b9f2ff` |
| MASTER | Grand Master | 70–79 | `#8b00ff` |
| LEGEND | Legend Bahasa | 80–100 | `#ff4500` |

- Implementasi: `lib/gamification/ranks.ts` — `RANK_BANDS`, `RANK_META`, `rankFromLevel()`, `minLevelForRank()`, `nextRankOf()`.
- Nama rank **tidak boleh diubah** (regresi tes memastikan 9 rank + batas band tetap).
- `PlayerProfile.currentRank` hanyalah denormalisasi; nilai sejati selalu dari `rankFromLevel(level)`.

## 2. Peta XP → Level (Kurva Resmi)

Kurva XP progresif resmi (`lib/gamification/levels.ts`):

| Band Level | XP per Level | Total Kumulatif (batas band) |
|-----------|--------------|------------------------------|
| 1–9 | 250 | 0 → 2.250 |
| 10–19 | 450 | 2.250 → 6.750 |
| 20–29 | 675 | 6.750 → 13.500 |
| 30–39 | 900 | 13.500 → 22.500 |
| 40–49 | 1.200 | 22.500 → 34.500 |
| 50–59 | 1.500 | 34.500 → 49.500 |
| 60–69 | 1.800 | 49.500 → 67.500 |
| 70–79 | 2.250 | 67.500 → 90.000 |
| 80–100 | 3.000 | 90.000 → 153.000 |

- API: `xpForLevel()`, `cumulativeXpForLevel()`, `levelFromXp()`, `getLevelProgress()`, `levelAfterXp()` — signature tidak berubah dari engine lama (hanya nilai kurva yang resmi).
- Semua nilai XP per sumber terpusat di `lib/gamification/xp-config.ts` — **15 sumber resmi**:

| Kode | Label | XP |
|------|-------|-----|
| ARENA | Aktivitas Arena | 10 |
| JALUR_CERDAS | Menyelesaikan Unit Jalur Cerdas | 50 |
| UPLOAD_KARYA | Menerbitkan Karya | 20 |
| LIKE | Menerima Like | 2 |
| KOMENTAR | Menerima Komentar | 5 |
| ARTIKEL | Membaca Artikel | 5 |
| PENUGASAN_GURU | Menyelesaikan Tugas Guru | 30 |
| UKBI | Simulasi UKBI Selesai | 30 |
| TKA | Simulasi TKA Selesai | 30 |
| DAILY_QUEST | Misi Harian | 15 |
| WEEKLY_QUEST | Misi Mingguan | 40 |
| ACHIEVEMENT | Klaim Pencapaian | 50 |
| BADGE | Mendapat Badge | 20 |
| CHALLENGE | Menang Challenge | 25 |
| EVENT | Event Spesial | 25 |

## 3. Halaman & Permukaan yang Memakai Rank

| Permukaan | Lokasi | Elemen |
|-----------|--------|--------|
| Arena — dashboard pemain | `/arena/player` | `PlayerHeader` (icon resmi + label + title), `RankCard`, `PlayerCard`, XP bar |
| Arena — profil | `/arena/player/profile` | `RankIcon` resmi di header profil |
| Arena — leaderboard | `/arena/player/leaderboard`, `leaderboard-panel` | Icon resmi per baris + entry `rankLabel/rankTitle/rankColor/rankAsset` |
| Arena — level-up modal | overlay global | Icon resmi besar + reward rank satu per satu |
| Arena — rank-up modal | overlay global | Glow fullscreen + confetti + icon 140px + reward |
| Beranda Arena | `/arena` | CTA "Coba Simulasi UKBI" + profil pemain |
| Murid — feed karya | `/murid/beranda` | `RankChip` di samping nama penulis |
| Murid — detail karya | `/murid/karya/[id]` | `RankChip` di header penulis |
| Murid — komentar | `components/arena/CommentSection` | `RankChip` di tiap komentar |
| Murid — profil | `/murid/profile` | chip rank (menggunakan label resmi) |
| Admin — arena | `/admin/arena` | distribusi rank dari `RANK_META` resmi |
| API | `/api/player/profile`, `/api/player/leaderboard`, `/api/siswa/karya` | payload `rank/rankLabel/rankTitle/rankColor/rankAsset` |

Data rank dikirim server-side (join `playerProfile.currentRank`), tidak pernah dipercaya dari klien.

## 4. Komponen Reusable

| Komponen | File | Fungsi |
|----------|------|--------|
| `RankIcon` | `components/gamification/RankIcon.tsx` | Icon resmi via `next/image` + `getRankAsset()`. Props: `rank, size, glow, priority, className`. Lazy + cache otomatis. |
| `RankChip` | `components/gamification/RankChip.tsx` | Chip ringkas: icon + label + title. Props: `rank, size, showTitle, compact`. |
| `PlayerCard` | `components/gamification/PlayerCard.tsx` | Kartu penuh: Avatar, Rank Icon, Rank Name, Title, Level, XP, Progress Bar, Koin, Badge, Pencapaian (Framer Motion). |
| `RankUpModal` | `components/gamification/RankUpModal.tsx` | Modal fullscreen: glow warna rank, confetti, icon besar, reward muncul satu per satu. |
| `useRankSound` | `components/gamification/use-rank-sound.ts` | Hook suara placeholder (WebAudio arpeggio) — API stabil untuk aset audio resmi nanti. |
| Rank registry | `lib/gamification/rank-assets.ts` | `RankAssets` map + `getRankAsset()` + `RANK_ORDER` + `RANK_ICON_NATIVE_SIZE=1000`. **Satu-satunya tempat path asset.** |

### Wiring
- `PlayerProvider` (player-context): deteksi rank-up saat polling profil → set `rankUp` event + auto-redeem reward via `POST /api/player/rank-up/redeem`.
- `PlayerOverlay`: render `RankUpModal` + `LevelUpModal` + `RewardPopupQueue` (mount sekali di layout Arena).

## 5. Reward per Rank (Konfigurasi)

| Rank | Koin | Badge | Title | Frame | Mystery Box |
|------|------|-------|-------|-------|-------------|
| BRONZE | 0 | rank-bronze "Perunggu" | Pemula | frame-rank-bronze | – |
| SILVER | 50 | rank-silver "Perak" | Pelajar | frame-rank-silver | – |
| GOLD | 100 | rank-gold "Emas" | Cendekia | frame-rank-gold | +50 koin |
| EMERALD | 150 | rank-emerald "Zamrud" | Akademisi | frame-rank-emerald | – |
| RUBY | 200 | rank-ruby "Rubi" | Ahli Bahasa | frame-rank-ruby | +80 koin |
| SAPPHIRE | 250 | rank-sapphire "Safir" | Guru Bahasa | frame-rank-sapphire | – |
| DIAMOND | 300 | rank-diamond "Berlian" | Master Bahasa | frame-rank-diamond | +120 koin |
| MASTER | 400 | rank-master "Master" | Grand Master | frame-rank-master | +150 koin |
| LEGEND | 500 | rank-legend "Legenda" | Legend Bahasa | frame-rank-legend | +200 koin |

- Sumber kebenaran: `lib/gamification/rank-rewards.ts`.
- Pencairan: `lib/gamification/rank-up.ts` → `grantRankUpRewards(userId)` — **idempotent** (retroaktif untuk semua rank yang sudah dicapai; koin via `addCoin("RANK_UP", "rank-up-<RANK>")` unik; badge `createMany skipDuplicates`; title/frame hanya di-set bila user belum mengatur sendiri).
- Endpoint redeem: `POST /api/player/rank-up/redeem` (role-gated, aman dipanggil berulang).

## 6. Screenshot & Tampilan

*(Belum ada tangkapan layar — UI divisualkan sebagai berikut:)*

- **RankUpModal**: overlay `#0b132b` 90% blur → radial glow warna rank di belakang → confetti 120 partikel → kartu tengah dengan icon rank 140px (glow drop-shadow warna rank) → teks "Rank Baru!" + label + title → daftar reward (Badge → Koin → Title → Frame → Mystery Box) muncul berurutan tiap 350ms dengan spring animation → tombol "Lanjut bertualang".
- **RankChip di feed**: icon rank 16px bulat + label warna rank — tampil di samping nama penulis karya & komentar.
- **PlayerCard**: gradasi royal blue → koin gold di kanan atas → XP bar animasi linear-gradien warna rank → badge/pencapaian di bawah.

## 7. Rekomendasi Lanjutan

1. **Aset audio resmi**: ganti `useRankSound` placeholder dengan file MP3 resmi (rank-up fanfare) — API sudah siap, tinggal isi.
2. **Frame/border visual**: `frame-rank-*` dan `border-rank-*` belum dirender di UI — pasang di `UserAvatar`/profil murid (toko koin) agar reward frame/border terlihat.
3. **Surfaces lain**: pasang `RankChip` di daftar murid di kelas (`/murid/kelasku/[id]`), rapor guru, dan Hall of Fame bila ada.
4. **Leaderboard entry**: `rankTitle`/`rankAsset` sudah di payload — optimalkan UI `leaderboard-panel` untuk menampilkan title.
5. **Deteksi rank-up ganda**: polling 20 detik bisa melewatkan 2 rank sekaligus (mis. level 9→12) — modal menampilkan rank akhir; reward retroaktif tetap cair semua (idempotent).
6. **Test produksi**: setelah deploy, jalankan `npm run test:gamification-engine` + audit rank via `/admin/arena`.

---

### Verifikasi (2 Agustus 2026)

| Check | Hasil |
|-------|-------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run test:gamification-engine` | ✅ SEMUA LULUS (75+ assertions, termasuk 9 asset resmi, kurva resmi, rank-up idempotent, XP_CONFIG 15 sumber) |
| `npm run build` | ✅ 337 routes, 0 errors |
| ESLint (file baru/diubah) | ✅ 0 errors (3 warning `<img>` bawaan arena) |
| Asset `public/Rank BC/` | ✅ 9 WebP 512×512, emblem tanpa teks label — 316 KB (dari 4,9 MB PNG 1000×1000). Sumber asli diarsipkan di luar repo. |
