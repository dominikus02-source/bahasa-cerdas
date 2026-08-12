# BC STUDENT HOME 2.0 — PLAN (Phase 2B)

## 1. Ringkasan

Redesign `app/(dashboard)/murid/beranda/page.tsx` menjadi **Student Home** — personal
command center premium (dark navy/cosmic, violet, gold) konsisten dengan Player Identity
Hub 2.0. **TANPA API baru, TANPA schema change, TANPA mock data** — semua data dari
API/komponen existing. Tanpa commit/push.

## 2. Audit Existing (5 agent paralel, Aug 11 2026)

### Halaman beranda saat ini (426 baris, client)
- `GET /api/user/me` (hero legacy), `GET /api/siswa/aktif` (12 murid online),
  `GET /api/murid/dashboard/summary` (tugas/pengumuman/materi/leaderboard),
  `GET /api/siswa/karya?featured=true` (pilihan), `GET /api/siswa/karya` (feed + infinite scroll)
- Heartbeat `POST /api/user/heartbeat` tiap 300s + 5s (WAJIB dipertahankan — penanda online)
- Style: light (bg gradient slate/violet), kartu putih, `max-w-3xl mx-auto` ← harus diganti

### Temuan kunci
| Temuan | Dampak |
|---|---|
| `User.xp/level/streak/coins` = legacy; engine resmi di `PlayerProfile` (`/api/player/profile`) | Hero memakai `/api/player/profile` (sumber kebenaran Player Identity), NAMA tetap dari `/api/user/me`. Konflik User.coins vs PlayerProfile.coin **tidak diselesaikan fase ini** (coin ditampilkan dari profile.coin — PlayerProfileView) |
| `NextActionCard`/`MentorCard`/`SkillRadar` drop-in (tailwind murni) | Continue Learning bisa pakai komponen existing + fallback |
| `/api/player/session` = 3-in-1 (nextAction + skills + insights + today) | 1 call untuk Continue + baris mentor |
| Tidak ada API agregat progress Jalur Cerdas | Tidak tampilkan % progress palsu — pakai copy deskriptif + nextAction |
| Karya card inline di 3 tempat (belum ada shared) | Buat kartu kompak lokal di RecentWorksSection (pola kartu "Karya Pilihan" existing) |
| `player-theme.css` (`px-*`) hanya di-import di arena/layout; vars scoped `.px-theme`; `.px-card` dsb class global opt-in | Import CSS di halaman beranda + bungkus `.px-theme` — dark cosmic TANPA refactor layout |
| Dark mode `.dark` TIDAK ada infra | Pakai tema class scoped `px-theme` (pola proven) |
| `getQuestMeta()` di `lib/quest-meta.tsx`; `UserAvatar` di `components/arena/UserAvatar.tsx`; tipe `PlayerProfileView`/`DailyQuestView`/`BadgeView` di `lib/gamification/client-types.ts` | Semua tersedia untuk reuse |
| `BadgeView`/`DailyQuestView` punya progress/target | Arena section: misi + badge preview real |
| Notifikasi: `/api/player/notifications` TANPA unreadCount | Hero tidak memakai unreadCount (NotificationBell sudah di sidebar) |

## 3. Information Architecture Baru

```
StudentHomeShell (px-theme, dark cosmic, max-w-[1200px])
├─ A. StudentHomeHero          — identity snapshot (avatar, nama, rank, level, XP bar, streak, coin, title, badges summary, shortcut profil)
├─ B. ContinueLearningCard     — NEXT ACTION (session.nextAction + today stats + mentor line, fallback Jalur Cerdas)
├─ C. AIBCHomeCard             — AI BC companion (CTA → /arena/ai)
├─ D. LearningJourneySection   — Perjalanan Belajar (4 item: Jalur Cerdas / Latihan / Simulasi / Tugas + aktivitas terakhir)
├─ E. ArenaHomeSection         — ARENA (XP mingguan, misi harian, badge, liga, CTA Masuk Arena + Kuis Tempur + Liga + Misi)
├─ F. RecentWorksSection       — Karya Terbaru (4 karya global + Jelajah Karya → /arena/feed)
├─ G. QuickActions             — Menu Cepat (6: Kelas/Simulasi/Latihan/Karya/Arena/AI BC)
└─ H. SecondaryLearningInfo    — Kabar kelas (pengumuman, materi, murid aktif) — diturunkan, collapse
```

## 4. Mapping Komponen/API Existing → Section Baru

| Existing | Path | → Section | Catatan |
|---|---|---|---|
| `PlayerProfileView` + `GET /api/player/profile` | `lib/gamification/client-types.ts`, `app/api/player/profile` | Hero | rank/level/XP/coin/streak/title/badges summary dalam 1 call |
| `GET /api/user/me` | `app/api/user/me` | Hero | NAMA (displayName/fullName) + avatar 160px |
| `XpProgressBar` | `components/arena/player/xp-progress-bar.tsx` | Hero | butuh `px-*` vars (tersedia via wrapper) |
| `RankIcon` / `RankChip` | `components/gamification/` | Hero, Karya | rank string enum |
| `UserAvatar` | `components/arena/UserAvatar.tsx` | Hero, Karya, Secondary | default export, props `{size, avatar, initials, ...}` |
| `GET /api/player/session` | `app/api/player/session` | Continue | `{nextAction, insights, skills, today:{activities,xp,coin}}` |
| `GET /api/player/next-action` | `app/api/player/next-action` | Continue | fallback terpisah bila null |
| `/arena/ai` (canonical) + `POST /api/ai/chat` | `app/arena/ai` | AI BC | CTA saja, tanpa chat engine baru |
| `GET /api/murid/dashboard/summary` | `app/api/murid/dashboard/summary` | Learning (tugas), Arena (liga), Secondary | `tugas/totalTugas/pengumuman/materi/leaderboard` |
| `GET /api/player/journey?limit=3` | `app/api/player/journey` | Learning | baris "Aktivitas terakhir" |
| `GET /api/player/quests` + `getQuestMeta` | `app/api/player/quests`, `lib/quest-meta.tsx` | Arena | misi harian 3 item + progress |
| `GET /api/player/badges` | `app/api/player/badges` | Arena | preview 4 badge + summary |
| `GET /api/siswa/karya?limit=4` | `app/api/siswa/karya` | Karya | global default murid; shape sudah ada rank |
| `/arena/feed`, `/arena/league`, `/arena/game/kuis-tempur`, `/arena/player`, `/arena/jalur-cerdas`, `/murid/tugasku`, `/murid/simulasi/ukbi`, `/murid/pengumuman` | — | CTA semua section | route existing, tidak diubah |
| `GET /api/siswa/aktif` | `app/api/siswa/aktif` | Secondary | "N murid aktif" strip (fitur lama dipertahankan, prioritas turun) |
| `POST /api/user/heartbeat` | `app/api/user/heartbeat` | Page (global) | dipertahankan persis (300s + 5s) |

## 5. Keputusan Desain

1. **Tema**: bungkus halaman dengan `.px-theme` + import `player-theme.css` DI HALAMAN
   (bukan layout) → dark cosmic scoped, zero impact halaman lain. Container `rounded-[28px]`,
   `max-w-[1200px]`, bg cosmic dari CSS vars.
2. **TIDAK** menambah `PlayerProvider` (butuh layout murid — di luar scope); hero fetch
   `/api/player/profile` langsung.
3. **No mock stats**: streak/XP/coin dari `profile.*`; tugas count dari summary; quest dari
   quests API. Copy statis HANYA untuk label/deskripsi.
4. **Konflik coin tidak diselesaikan**: tampilkan `profile.coin` (PlayerProfileView — yang
   tampil di arena player). Tidak mengubah engine apa pun.
5. **Hierarki visual**: PRIMARY (hero, continue, AI BC) → SECONDARY (learning, arena, karya) →
   SUPPORTING (quick actions, kabar kelas collapse).
6. **Aksesibilitas**: focus-visible ring, aria-label pada icon-button, alt text, kontras
   (teks px-text/px-text-dim di atas navy), `prefers-reduced-motion` tidak ditambah animasi baru.
7. **Performance**: tiap section self-fetch paralel (browser parallel, cache Redis API
   existing); tanpa polling baru; tanpa waterfall.

## 6. Files

| File | Aksi |
|---|---|
| `docs/BC_STUDENT_HOME_2_PLAN.md` | BARU (ini) |
| `components/student-home/StudentHomeHero.tsx` | BARU |
| `components/student-home/ContinueLearningCard.tsx` | BARU |
| `components/student-home/AIBCHomeCard.tsx` | BARU |
| `components/student-home/LearningJourneySection.tsx` | BARU |
| `components/student-home/ArenaHomeSection.tsx` | BARU |
| `components/student-home/RecentWorksSection.tsx` | BARU |
| `components/student-home/QuickActions.tsx` | BARU |
| `components/student-home/SecondaryLearningInfo.tsx` | BARU |
| `app/(dashboard)/murid/beranda/page.tsx` | REWRITE (shell + heartbeat) |
| `scripts/test-student-home.ts` | BARU (12 assertions statis) |
| `package.json` | + `test:student-home` |

## 7. Testing & QA

- `npm run test:student-home` (12 assertion: canonical routes, no mock, AI BC visible,
  Arena visible, Karya visible, Continue visible, profile canonical, no duplicate sidebar,
  no max-w-lg root, no hardcoded XP/coins/streak)
- Regression: `test:student-consolidation`, `test:premium-economy`, `test:gamification-engine`,
  `test:social-hardening`, `test:global-works-discovery`, `npx tsc --noEmit`, `npm run build`
- Visual QA: 390/768/1440 (statis, tanpa browser di env ini)

## 8. Interdiction (tidak boleh disentuh)

`prisma/*`, `lib/premium-economy/*`, `lib/premium.ts`, `lib/gamification/*` (engine),
`lib/award-xp.ts`, `lib/coins.ts`, `lib/ai-gateway/*`, `lib/billing/*`, `app/api/ai/chat`,
`app/api/game/*`, `app/api/katastra/*`, `components/game/KuisTempurSolo.tsx`,
`app/arena/kompetisi/*`, `app/(dashboard)/kompetisi/*`, `lib/apk.ts`, `lib/arena-scope.ts`,
`app/arena/layout.tsx`, `app/(dashboard)/murid/layout.tsx`, `next.config.ts`, `vercel.json`.
