# PHASE 5 STEP 0 — Mobile Navigation Audit & UX Hardening

> Status: **DONE** — audit + implementasi konsolidasi navigasi mobile.
> Founder feedback: "Ketika membuka BahasaCerdas di HP, menu/sidebar tidak konsisten di seluruh panel."

---

## 1. Current Architecture (sebelum STEP 5.0)

BahasaCerdas sudah punya SATU shell terpadu untuk desktop (Unified Shell 5.0–5.2):

- `components/shell/ShellLayout.tsx` — kerangka layout universal (aside sidebar + header + main).
- `components/shell/ShellNavList.tsx` + `nav-config.ts` (STUDENT_NAV) — sidebar student.
- `components/shell/RoleSections.tsx` + `navigation-context.ts` — role-switch context-aware.
- `components/dashboard/GuruNav.tsx` — GURU_NAV (12 grup) + `GuruNavList` + `GuruMobileNav`.
- `components/admin/AdminSidebar.tsx` — nav admin (NAV array).
- `components/dashboard/MuridMobileNav.tsx` — student mobile nav (bar + drawer).
- `app/arena/bottom-nav.tsx` — BottomNav khusus APK (TWA).

Layouts: `/murid/*`, `/arena/*`, `/guru/*`, `/admin/*` semuanya memakai ShellLayout.

## 2. Navigation Inventory

| Area | Desktop Nav | Mobile Nav | Component | Consistent? |
|------|-------------|------------|-----------|-------------|
| `/murid/*` | Sidebar (ShellNavList + RoleSections) | Bottom nav + drawer | MuridMobileNav | ✅ |
| `/arena/*` web | Sidebar (ShellNavList) | **TIDAK ADA** (APK-only) | — | ❌ ROOT CAUSE |
| `/arena/chat` web | Sidebar (ShellNavList) | **TIDAK ADA** | — | ❌ |
| `/guru/*` | Sidebar (GuruNavList) | Bottom nav + drawer | GuruMobileNav | ✅ |
| `/admin/*` | Sidebar (AdminSidebar) | **TIDAK ADA** | — | ❌ |
| `/kompetisi/*` (UKBI/TKA test screen) | Tanpa shell (TestShell sendiri) | Tanpa | — | ⚠️ exception |
| `/game/*` (multiplayer) | Tanpa shell | Tanpa | — | ⚠️ exception |
| `/junior/*` | Layout sendiri (tanpa nav padat) | — | — | ⚠️ exception |
| Publik (`/`, `/marketplace`, `/video-belajar`, `/artikel`, `/loker`, `/kamus`, `/ai-bc`, dll.) | Publik, CTA-driven | Tanpa | — | Out of scope |

## 3. Mobile Inconsistencies

1. **Arena web mobile tidak punya navigasi sama sekali** — `bottomNav={apk && <BottomNav />}`: hanya APK (TWA) yang dapat BottomNav. Di HP browser, halaman Arena (jalur-cerdas, game hub, player, UKBI) kehilangan semua navigasi kecuali tombol Back + link di konten.
2. **Admin tidak punya mobile nav** — founder di HP harus scroll ke bawah halaman admin untuk pindah menu.
3. **Notif duplikat** — MuridMobileNav punya tombol Notif di bar, padahal header global sudah menampilkan NotificationBell (minor, dipertahankan).
4. **Z-index berbeda** — BottomNav APK z-50 vs MuridMobileNav z-40 (minor; tidak bertabrakan karena tidak pernah tampil bersamaan).
5. **Warna active berbeda** — BottomNav APK violet vs GuruMobileNav violet (konsisten sejak Icon System 5.1; APK dipertahankan).

## 4. Root Causes

1. **Keputusan desain ARENA FINAL CONSOLIDATION** ("APK tetap bernavigasi lewat BottomNav; web = shell tanpa bottom nav") diterapkan terlalu literal: web mobile dibiarkan tanpa nav sama sekali. Ini keputusan masa lalu yang tidak lagi cocok dengan feedback founder.
2. Admin dianggap "desktop-only" sehingga tidak pernah diberi mobile nav.
3. Belum ada class hook bersama (`bc-mobile-nav`) untuk CSS exception (game-fullscreen/owns-bottom-bar) sehingga komponen mobile nav tidak bisa diseragamkan via CSS.

## 5. New Navigation Contract

**SATU platform, SATU navigasi mobile:**

- Desktop: sidebar (`md:`/`lg:` breakpoint, collapsible).
- Mobile: bottom navigation + drawer menu — fixed, safe-area aware, maks 4–5 primary destinations + Menu.
- Komponen yang sama dipakai di semua panel yang sejenis (student: MuridMobileNav dipakai bersama murid + arena web; guru: GuruMobileNav; admin: AdminMobileNav baru — reuse NAV yang sama dengan AdminSidebar, tanpa duplikasi config).
- APK (TWA) tetap memakai BottomNav-nya sendiri (kompatibilitas TWA tidak diubah, 0 diff).
- CSS hook `.bc-mobile-nav` memungkinkan halaman immersive menutup nav secara seragam.

## 6. Desktop Behavior

Tidak berubah: sidebar `shell-aside` (256px ↔ 64px collapse), header sticky global, RoleSections, footer logout. Murid/Guru/Admin/Arena semuanya memakai ShellLayout.

## 7. Mobile Behavior

| Panel | Mobile nav |
|-------|-----------|
| Murid | MuridMobileNav: Beranda / Arena / Karya / Profil + Notif + Menu(drawer) |
| Arena web | MuridMobileNav (SAMA dengan murid — SATU komponen) |
| Arena APK | BottomNav APK (Beranda / Karya / Gim / Obrolan / Pemain) |
| Guru | GuruMobileNav: Beranda / Literasi / Gim / Akun + Menu(drawer GuruNavList) |
| Admin | AdminMobileNav (baru): Ringkasan / Bank Soal / Pengguna / Bayaran + Menu(drawer NAV penuh + Keluar) |

Semua bar: `fixed bottom-0 inset-x-0`, z-40, `safe-area-bottom` (`env(safe-area-inset-bottom)`), ikon+label, active state violet, touch target ≥ 44px, `md:hidden`/`lg:hidden` sesuai panel.

## 8. Student IA (primary, ≤ 5)

Beranda `/murid/beranda` · Arena `/arena` · Karya `/murid/karya` · Profil `/murid/profile` (+ utility: Notif `/arena/notifikasi`, Menu). Sekunder (UKBI, TKA, Jalur Cerdas, Badge, Achievement, Pengaturan, dll.) tersedia via drawer Menu dan sidebar.

## 9. Teacher IA (primary, ≤ 5)

Beranda `/guru/beranda` · Literasi `/guru/feed-karya` · Gim `/guru/game` · Akun `/guru/akun` (+ Menu → GuruNavList lengkap: Alat Ajar, Kelasku, Simulasi & Tes, Alat AI, dll.).

## 10. Feature Exceptions

- **Halaman dengan bottom action bar sendiri** (`.owns-bottom-bar`, mis. `/arena/tugas/[assignId]/kerjakan`): global nav disembunyikan (CSS).
- **Fullscreen game** (`.game-fullscreen`): nav disembunyikan (CSS) — game adalah pengalaman immersive.
- **Test screen UKBI/TKA** (`/kompetisi/*`): tanpa shell (TestShell sendiri) — tidak ada nav, sengaja (fokus tes, timer).
- **Multiplayer game** (`/game/*`): tanpa shell (chrome game sendiri).
- **Arena Junior** (`/junior/*`): layout khusus anak (tombol besar, tanpa nav padat).
- **Chat web mobile**: nav global tampil; chat memakai toolbar internal (toggle daftar kelas) + input di bawah konten yang dilindungi `pb-20` arena root (form/input tidak tertutup).

## 11. Fullscreen Exceptions

CSS `app/arena/arena.css`:

```css
.arena-theme:has(.game-fullscreen) .bc-mobile-nav { display: none; }
.arena-theme:has(.owns-bottom-bar) .arena-bottom-nav,
.arena-theme:has(.owns-bottom-bar) .bc-mobile-nav { display: none; }
```

## 12. Safe-Area Strategy

Semua bar memakai `padding-bottom: env(safe-area-inset-bottom, 0px)` (class `.safe-area-bottom` atau inline env). Konten halaman diberi bottom padding: murid `pb-24 md:pb-8`, guru `pb-24 lg:pb-8`, arena `pb-20 md:pb-0`, admin `pb-24 md:pb-8`.

## 13. Route Coverage

| Route | Mobile nav |
|-------|-----------|
| `/murid/*` (beranda, profil, karya, pengaturan, simulasi UKBI/TKA, tugasku, dokumen) | ✅ MuridMobileNav |
| `/arena`, `/arena/jalur-cerdas`, `/arena/game`, `/arena/player/*`, `/arena/misi`, dll. | ✅ MuridMobileNav (baru) |
| `/arena/chat` | ✅ MuridMobileNav (baru; input terlindungi pb-20) |
| `/guru/*` | ✅ GuruMobileNav |
| `/admin/*` | ✅ AdminMobileNav (baru) |
| `/kompetisi/*`, `/game/*`, `/junior/*`, `/arena/login` | ⚠️ exception (dokumentasi §10–11) |

## 14. Components Changed

- `app/arena/layout.tsx` — bottomNav: `{apk ? <BottomNav /> : <MuridMobileNav .../>}` (web mobile dapat student mobile nav).
- `components/dashboard/MuridMobileNav.tsx` — + class `bc-mobile-nav`.
- `components/dashboard/GuruNav.tsx` — + class `bc-mobile-nav` (bar GuruMobileNav).
- `components/admin/AdminMobileNav.tsx` — **BARU** (bar + drawer, reuse `NAV` dari AdminSidebar).
- `components/admin/AdminSidebar.tsx` — `export const NAV`.
- `app/(dashboard)/admin/layout.tsx` — pasang `<AdminMobileNav />` + main `pb-24 md:pb-8` + `px-4 md:px-6`.
- `app/arena/arena.css` — exception rules diperluas ke `.bc-mobile-nav`.
- `scripts/test-mobile-navigation.ts` — **BARU** (20 grup, 48 assertions).
- Test lama diperbarui ke kontrak baru: `test-arena-web.ts`, `test-unified-shell.ts`, `test-unified-header.ts`, `test-arena-chat.ts`.
- `docs/PHASE_5_STEP_0_MOBILE_NAVIGATION_AUDIT.md` — **BARU** (dokumen ini).

## 15. Components Preserved

- `components/shell/*` (ShellLayout, ShellNavList, nav-config, RoleSections, navigation-context, ShellSidebarFooter, icon-tokens) — tidak diubah.
- `components/dashboard/GuruNav.tsx` — GURU_NAV/GuruNavList/drawer tidak diubah (hanya +class).
- `components/admin/AdminSidebar.tsx` — hanya `export const NAV` (satu kata).
- `app/arena/bottom-nav.tsx` — 0 diff (APK).
- `components/shared/BackHome.tsx`, `components/theme/theme-toggle.tsx`, `components/dashboard/NotificationBell.tsx` — tidak diubah.

## 16. Tests

- `scripts/test-mobile-navigation.ts` (BARU, 20 grup / 48 assertions) — ✅ SEMUA LULUS.
- Regression: `test:student-home`, `test:my-day-home`, `test:arena-web`, `test:gamification-engine`, `test:premium-economy`, `test:unified-shell`, `test:unified-header`, `test:student-shell`, `test:icon-system`, `test:arena-chat`, `test:arena-nav-theme`, `test:navigation-context`, `test:student-consolidation` — ✅ SEMUA LULUS.
- `npx tsc --noEmit` — 0 errors · `npm run lint` — 0 violations · `npm run build` — exit 0 · `git diff --check` — bersih.

## 17. Visual QA

Manual check yang direkomendasikan (375/390/414/768/1024/1280px):
- [ ] Bottom nav tampil di murid/arena/guru/admin pada ≤768px
- [ ] Bottom nav hilang di desktop ≥1024px
- [ ] Konten tidak tertutup (pb-24/pb-20)
- [ ] CTA/input chat tidak tertutup
- [ ] Horizontal overflow = 0
- [ ] Active state benar per route
- [ ] Route switching tidak menghilangkan nav
- [ ] Game fullscreen & halaman kerjakan menutup nav

## 18. Protected Zones

0 diff: `prisma/`, `app/api/`, `lib/gamification/`, `lib/learning-loop/`, `engines/`, `lib/apk.ts`, `lib/coins.ts`, `lib/award-xp.ts`, UKBI/TKA scoring, LearningEvidence/QuestionMetadata/LearnerState, Adaptive Practice & reward, Diagnostic, XP/Coin, Leaderboard, auth (middleware/proxy tidak diubah).

## 19. Performance Considerations

- MuridMobileNav (dipakai di arena) melakukan fetch `/api/notifikasi?unread=true` + interval 60s — sama seperti halaman murid; tidak ada fetch tambahan baru untuk arena (perilaku identik dengan halaman murid, tanpa polling ganda).
- Navigasi config static: STUDENT_NAV/GURU_NAV/NAV adalah array konstan; tidak ada DB read untuk render menu.
- Tidak ada library baru; semua ikon lucide-react (sudah terpakai).

## 20. Known Limitations

1. **Notif duplikat** di MuridMobileNav (bar) vs header bell — sengaja dipertahankan (test-student-shell mengunci 6 href di MuridMobileNav).
2. **Arena APK vs web mobile punya nav berbeda** (BottomNav APK 5-item vs MuridMobileNav 4+2) — disengaja (TWA compat; test mengunci 0 diff bottom-nav).
3. **Admin drawer** tidak memuat kartu user/bell (bell hanya di sidebar desktop) — konsisten dengan GuruMobileNav.
4. Visual QA pada perangkat nyata (iPhone safe area) belum dieksekusi di sesi ini — perlu manual pass.

## 21. Future Migration Plan

1. **Writing Experience** (STEP berikutnya): `/karya/write` dst. — focused editor mode, exit/back tetap via BackHome; nav state tidak hilang; hindari drawer broken (ikuti pola game-fullscreen exception bila editor immersive).
2. **Hapus Notif dari bar murid** bila header bell dianggap cukup (perlu approval founder + update test-student-shell).
3. **Test screen UKBI/TKA** boleh mendapat "exit to hasil" yang lebih jelas (fitur tersendiri, bukan nav).
4. **Dark mode penuh** untuk 77 halaman guru + 21 halaman admin (shell sudah dark; isi halaman masih light-only).
5. Visual QA formal pada device matrix (375–1280px) sebelum rilis.

---

### Verification (STEP 5.0)

| Check | Hasil |
|-------|-------|
| `npm run test:mobile-navigation` (BARU) | ✅ 48/48 |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run lint` | ✅ 0 violations |
| `npm run build` (dummy env) | ✅ exit 0 |
| `git diff --check` | ✅ bersih |
| `test:student-home` / `test:my-day-home` | ✅ lulus |
| `test:arena-web` / `test:arena-chat` / `test:arena-nav-theme` | ✅ lulus |
| `test:unified-shell` / `test:unified-header` / `test:student-shell` / `test:icon-system` / `test:navigation-context` / `test:student-consolidation` | ✅ lulus |
| `test:gamification-engine` / `test:premium-economy` | ✅ lulus |
| Protected zones | ✅ 0 diff |
| Commit/push | ⛔ TIDAK (menunggu Founder Review) |
