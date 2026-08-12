# BC STUDENT HOME 2.0 — Laporan Implementasi (Phase 2B)

> Status: IMPLEMENTED (tanpa commit/push — menunggu approval founder)
> Tanggal: 11 Agustus 2026

## A. Ringkasan

Redesign beranda murid (`/murid/beranda`) menjadi **Student Home 2.0**: satu halaman
dark premium (tema Royal Blue/Gold dari `player-theme.css`, scoped via `.px-theme`)
dengan hierarki visual yang berorientasi aksi: **Profil → Lanjutkan Belajar → AI BC →
Perjalanan Belajar → Arena → Karya → Aksi Cepat → Kabar Kelas**.

Tidak ada API baru, tidak ada schema change, tidak ada mock data — seluruh data
berasal dari API existing (player/session/profile/quests/badges/journey +
murid/dashboard/summary + siswa/karya + siswa/aktif).

## B. Struktur Halaman (8 Section)

| Urutan | Section | Komponen | Sumber Data |
|--------|---------|----------|-------------|
| 1 | Profil (Hero) | `StudentHomeHero` | `/api/player/profile` + `/api/user/me` |
| 2 | Lanjutkan Belajar | `ContinueLearningCard` | `/api/player/session` (nextAction + insight) |
| 3 | AI BC | `AIBCHomeCard` | statis (CTA `/arena/ai`) |
| 4 | Perjalanan Belajar | `LearningJourneySection` | `/api/player/journey?limit=3` + summary.totalTugas |
| 5 | Arena | `ArenaHomeSection` | profile + `/api/player/quests` + badges + summary.leaderboard |
| 6 | Karya Siswa Terbaru | `RecentWorksSection` | `/api/siswa/karya?limit=4` |
| 7 | Aksi Cepat | `QuickActions` | statis (6 aksi) |
| 8 | Kabar Kelas | `SecondaryLearningInfo` | summary (pengumuman/materi) + `/api/siswa/aktif` |

## C. File

### Baru
- `components/student-home/StudentHomeHero.tsx` — avatar + RankChip + title gold, chips (streak/koin/XP minggu), XpProgressBar, kartu Pencapaian (lencana + pencapaian), CTA "Lihat Profil" → `/murid/profile`. Skeleton `.px-skeleton` + error state.
- `components/student-home/ContinueLearningCard.tsx` — nextAction dari sesi (title/description/ctaLabel/ctaHref), fallback ke Jalur Cerdas bila null; baris insight mentor (`Saran mentor`), stats hari ini.
- `components/student-home/AIBCHomeCard.tsx` — gradient royal→violet→emerald, badge bot emerald, CTA "Tanya AI BC" → `/arena/ai`, 4 chip topik cepat.
- `components/student-home/LearningJourneySection.tsx` — 4 item (Jalur Cerdas/Latihan/Simulasi/Tugas) dengan subtitle dinamis "N belum dikerjakan", aktivitas terakhir dari journey.
- `components/student-home/ArenaHomeSection.tsx` — 4 stat (XP minggu/XP season/posisi global/misi), daftar 3 misi harian (getQuestMeta + progress bar + reward koin), preview 4 lencana, CTA Kuis Tempur/Liga/Misi & Peringkat.
- `components/student-home/RecentWorksSection.tsx` — 4 karya terbaru (badge jenis, judul 2-baris, penulis + waktu relatif, likes/komentar, "✦ Pilihan"), CTA "Semua Karya" → `/arena/feed`.
- `components/student-home/QuickActions.tsx` — 6 aksi: Tulis Karya, Jalur Cerdas, Main Game, Simulasi UKBI, Liga Mingguan, Profil Saya.
- `components/student-home/SecondaryLearningInfo.tsx` — pengumuman guru (3), materi dari guru (3, link API `/n/{id}`), baris Kabar Kelas (avatar murid aktif 6 + count), catatan tugas tertunda.
- `scripts/test-student-home.ts` — 36 assertion statis (tanpa DB).

### Diubah
- `app/(dashboard)/murid/beranda/page.tsx` — REWRITE: client component ringkas; import `@/app/arena/player-theme.css`; wrapper `.px-theme`; container `max-w-[1200px]`; merender 8 komponen; **heartbeat dipertahankan** (interval 300s + timeout awal 5s, komentar asli dipertahankan).
- `package.json` — script `test:student-home`.

## D. Keputusan Desain

1. **Dark theme scoped per halaman** — import CSS di halaman + wrapper `.px-theme` (bukan layout global). Tidak menyentuh `app/(dashboard)/murid/layout.tsx` (murid tetap light di halaman lain).
2. **Tidak ada PlayerProvider** — setiap section fetch data sendiri (independent), sesuai prinsip halaman client existing. Tanpa context global.
3. **No API baru, no mock** — data player/gamifikasi 100% dari `/api/player/*`; angka UI = angka server.
4. **Konflik User.coins vs PlayerProfile.coin tidak diselesaikan** — hero menampilkan `profile.coin` (PlayerProfile), konsisten dengan engine Phase 1.
5. **Heartbeat dipertahankan** — penanda online tetap hidup (300s + 5s saat load), tanpa perubahan perilaku.
6. **Semua fitur lama tetap dapat diakses** — feed penuh di `/arena/feed` (CTA di section Karya), murid aktif/pengumuman/materi/tugas di SecondaryLearningInfo, profil di `/murid/profile`.
7. **getQuestMeta dipakai** (single source quest rendering) — label + icon misi tidak di-hardcode.

## E. QA

| Check | Hasil |
|-------|-------|
| `npm run test:student-home` | ✅ 36/36 |
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint (8 komponen + page + test) | ✅ 0 violations |
| `npm run test:student-consolidation` | ✅ 17/17 |
| `npm run test:premium-economy` | ✅ 63/63 |
| `npm run test:gamification-engine` | ✅ SEMUA LULUS |
| `npm run test:social-hardening` | ✅ 27/27 |
| `npm run test:global-works-discovery` | ✅ 31/31 |
| `npm run build` (dummy env) | ✅ 363 routes, 0 errors |

## F. Visual QA Statis (390 / 768 / 1440)

- **390px (mobile)**: Hero — avatar+nama+chips kolom; Pencapaian + tombol di bawah (flex-col via `lg:`); grid semua section `grid-cols-1`; QuickActions 2 kolom; Kabar Kelas avatar wrap. Tidak ada overflow horizontal (semua truncate/line-clamp).
- **768px (tablet)**: Journey 2 kolom; Arena stats 4 kolom (sm:grid-cols-4); Karya 2 kolom; QuickActions 3 kolom; Kabar Kelas 2 kolom.
- **1440px (desktop)**: Hero 2 kolom (profil kiri 1fr, Pencapaian+CTA `lg:w-[280px]`); Arena `lg:grid-cols-5` (stats 3 + lencana/CTA 2); Karya 4 kolom; QuickActions 6 kolom; container 1200px max.

Semua warna memakai CSS vars `--px-*` (dark navy #0b132b, royal #2b4bff/#0f7bff, gold #ffd24a, text #f3f7ff) — kontras AAA pada teks utama.

## G. Interdiction (dipatuhi)

- ✅ Tidak menyentuh: `prisma/*`, `lib/gamification/*` (engine), `lib/premium*`, `lib/award-xp.ts`, `lib/coins.ts`, `lib/ai-gateway/*`, `lib/billing/*`, `app/api/*` (semua read-only), `app/arena/layout.tsx`, `app/(dashboard)/murid/layout.tsx`, `app/arena/player-theme.css` (read-only), `components/dashboard/MuridMobileNav.tsx`, `next.config.ts`, `vercel.json`.
- ✅ Tanpa schema change, tanpa migration, tanpa API baru.
- ✅ Tanpa commit/push — menunggu approval founder.

## H. Catatan

- **Test failure pra-eksis** (di luar changeset, tidak diperbaiki): `test:bigt-page-runtime` (3 guru) + `test:bahasa-ui` (5 — BigtInfoPage + panel RPP).
- Build lokal memakai dummy env (nilai `[SENSITIVE]` di-mask opencode); `prisma:error` pada output build adalah noise env palsu, build tetap 363/363.
- `/arena/latihan` dan `/arena/materi/[id]` TIDAK ada — tidak dipakai; materi memakai link `/n/{id}` dari API, "Latihan" mengarah `/arena/game` (hub gim).

## I. Remaining (tidak berubah dari sebelum fase ini)

1. TKA UTBK/Guru enrichment 30 → 150
2. Game server revival (VPS mati)
3. GameRoom migration SQL via Supabase dashboard
4. UI game solo: badge-score client vs server masih beda (kosmetik)
5. SQL `2026-08-02_no_absen.sql` & `2026-08-08_school_identity.sql` (Production + Preview)
6. Review founder untuk commit/push fase 2B
