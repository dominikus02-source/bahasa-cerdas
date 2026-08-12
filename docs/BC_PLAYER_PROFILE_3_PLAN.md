# BC Player Profile 3.0 — Plan (Aug 12, 2026)

Target: polish `/murid/profile` menjadi PLAYER IDENTITY HUB desktop-first.
UI/UX/layout only. TANPA commit/push. TANPA sentuh prisma/*, app/api/*, engine,
arena logic, Kuis Tempur, Liga, BC Shop, next.config.ts, vercel.json.

## Phase 0 — Audit (done)

### Root cause "terasa seperti ponsel"
`app/(dashboard)/murid/profile/page.tsx` line 354:
`<div className="max-w-4xl mx-auto">` — container terkunci 896px di semua
viewport. Semua instance `max-w-` lain wajar (modal max-w-lg/md, bio
max-w-2xl, kisi total ActivityChart max-w-md).

### Inventori `components/profile/` (11 file)
- **Shared** dengan `/profile/[id]` (public peer, re-export `/arena/profile/[id]`):
  `ProfileHero.tsx`, `SocialProofStrip.tsx`. Edit harus additive & backward-compatible.
- **Page-only** (hanya dipakai murid profile): PlayerStatusBar, ProfileMotto,
  PlayerStatsGrid, ActivityFeed, ActivityChart, FeaturedWorksGallery,
  SocialConnections, AchievementShowcase.
- Alias: `/arena/player/profile` = redirect (web → /murid/profile, APK → /arena/player).
  `/arena/profile/[id]` = re-export public page. Tidak disentuh.

### Struktur halaman saat ini (urutan render)
1. ProfileHero (identitas + crest 210px + XP bar + aksi + kartu like + bio)
2. PlayerStatusBar (HUD 6 sel: Level/XP/Koin/Streak/Rank/Lencana)
3. ProfileMotto (bio + bergabung)
4. md:grid-cols-3 — kiri (stats 2x2 + Kebun Kata + Perkembangan Lencana) |
   kanan col-span-2 (ActivityFeed)
5. Pencapaian Terkini (AchievementShowcase max 6) — full width
6. md:grid-cols-3 — gallery col-span-2 | SocialConnections
7. ActivityChart 30 hari — full width
8. Modals (Pengaturan max-w-lg, Riwayat Nama max-w-md) — tetap

### Peta data nyata (sudah benar, jangan diubah)
- social (best-effort): followerCount/followingCount/followers/following/profileLikeCount
- stats: karya (meta.stats.karyaCount), like profil (social.profileLikeCount, fallback user.totalLikes), pengikut, mengikuti
- kebunKata 30 hari, lencana progres + nextBadge, showcaseBadges (best-effort)
- events (xpHistory + karyaList 3), chartDays (journey / fallback karya)
- equippedFrame/equippedNameColor/equippedBadge → UserAvatar/UserName (sudah di-respect)

## Fase UI — Desain target

### Canvas
`max-w-4xl mx-auto` → `mx-auto w-full max-w-[1400px] px-4 md:px-6 lg:px-8`

### Layout ≥1024px — 2 kolom
1. **ProfileHero** full width (komponen tetap, +1 additive row sosial)
2. **PlayerStatusBar** full width (strip HUD di bawah hero)
3. `grid gap-6 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start`
   - **MAIN** (`md:col-span-2 lg:col-span-1`, space-y-6):
     - PlayerStatsGrid — `grid-cols-2 xl:grid-cols-4`
     - ActivityFeed (lebar penuh)
     - ActivityChart (hapus `max-w-md` pada kisi total)
     - FeaturedWorksGallery — dari list ke grid kartu `sm:grid-cols-2 xl:grid-cols-3`
   - **SIDEBAR** (`md:col-span-2 lg:col-span-1`, `lg:sticky lg:top-6 space-y-6`):
     - ProfileMotto
     - Perkembangan Lencana (+ nextBadge) — pindah dari kolom kiri
     - Kebun Kata — pindah dari kolom kiri
     - SocialConnections
4. **Pencapaian Terkini** (AchievementShowcase) full width di bawah grid
5. Modals tidak berubah

### ProfileHero — additive row sosial (shared dengan public page)
Di bawah XP progress, di atas aksi: `Pengikut X · Mengikuti Y` (icon Users/UserRound)
bila `social` ada. Like sudah tampil via kartu likeSummary (own) / tombol Suka (peer).

## Verifikasi
- `npm run test:social-hardening`, `test:student-consolidation`, `test:student-home`,
  `test:premium-economy`, `test:gamification-engine`, `test:global-works-discovery`
- `npx tsc --noEmit`, `npm run build` (dummy env), `git diff --check`
- Visual QA statis 390/768/1024/1280/1440 (tanpa browser)
- Alias profil tidak berubah (redirect / re-export masih utuh)