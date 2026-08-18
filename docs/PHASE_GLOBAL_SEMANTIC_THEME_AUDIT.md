# PHASE GLOBAL SEMANTIC THEME AUDIT (STEP 8.2)

**Tanggal**: Aug 18, 2026 · **Status**: AUDIT + IMPLEMENTASI, menunggu Founder Review (pola 8.0/8.1)

## Tujuan
Jadikan seluruh web (Guru Dashboard 79 halaman + Admin Panel 21 halaman + semua shared components) SATU global theme system berbasis semantic tokens — fitur baru cukup `bg-background text-foreground` tanpa styling dark manual. Ini fase audit lengkap yang menyertai implementasi STEP 8.2.

## 1. Temuan Audit

| # | Temuan | Dampak |
|---|--------|--------|
| 1 | **Provider tema sudah tunggal & benar** — `components/theme/theme-provider.tsx` (next-themes, `darkMode: ["class"]`), di-mount sekali di `app/providers.tsx` | TIDAK diubah; hanya 1 sumber kebenaran |
| 2 | **Tailwind campuran**: `border`/`input`/`ring`/`background`/`foreground`/`destructive`/`card`/`popover`/`surface*`/`success`/`warning`/`danger` sudah `hsl(var(...))`, TAPI `primary`/`secondary`/`muted`/`accent` masih hardcoded hex | Utility `bg-primary`, `bg-secondary`, `bg-muted`, `bg-accent` tidak ikut dark → ditokenisasi |
| 3 | **Token light tidak AA**: `--secondary` `240 6% 10%` (hampir hitam, seperti terbalik), `--destructive` `#EF4444` (teks putih = 3.76:1) | Diperbaiki: `--secondary 240 4.8% 95.9%` (light gray), `--destructive 0 73% 41%` (AA) |
| 4 | **Admin light-only**: 88 `bg-white`, 101 `text-slate-900`, 100 `border-slate-200`, 51 `bg-slate-50` di 21 halaman admin | `.bc-admin` compat mirror (identik `.bc-guru`, di-approve 8.0) |
| 5 | **Shared components broken dark**: `ui/input` (`bg-white`), `ui/modal` (`bg-white`), `ui/tabs` (`bg-gray-100`) | Migrasi ke semantic tokens |
| 6 | **Charts hardcoded**: grid `#f1f5f9` nyaris invisible di dark (`AdminCharts`, `AktivitasAnalytics`, `admin/analytics`) | `var(--clr-border)` / `var(--clr-text-3)` |
| 7 | **Badge success/warning kontras buruk di dark**: `bg-emerald-500 text-white` (3.27:1), `bg-amber-500 text-white` (2.15:1) | Primitif GLOBAL `.bc-badge-*` (soft/strong, AA dua mode via token 8.1) |
| 8 | **Guru 76 halaman SUDAH ter-cover** `.bc-guru` compat (8.0/8.1); 4 file game dengan `dark:` eksplisit dibiarkan (legit). Admin ~1.191 `dark:` patch historis DIBIARKAN (debt visual, pembersihan deferred — bukan scope 8.2) | Tidak ada regresi |

## 2. Perubahan

| File | Perubahan |
|------|-----------|
| `app/globals.css` | `:root` light: `--secondary 240 4.8% 95.9%`, `--secondary-foreground 240 5.9% 10%`, `--accent-foreground 240 5.9% 10%`, `--destructive 0 73% 41%`, `--destructive-foreground 0 0% 100%` (AA); + primitif GLOBAL `.bc-badge-{success,warning,danger,info,violet}` (soft/strong `--clr-*`, AA 8.1); + blok `.bc-admin` compat mirror (Bagian 5) |
| `tailwind.config.ts` | `primary`/`secondary`/`muted`/`accent` → `hsl(var(--...))` (mode default + foreground); `primary.light/dark` & gold/zinc brand TETAP |
| `components/ui/input.tsx` | `border-input bg-background text-foreground ring-ring placeholder:text-muted-foreground` |
| `components/ui/modal.tsx` | panel `bg-card text-card-foreground`, tombol X `hover:bg-muted` |
| `components/ui/tabs.tsx` | List `bg-muted text-muted-foreground`; trigger aktif `bg-background text-foreground shadow-sm` |
| `components/ui/badge.tsx` | success/warning → `bc-badge-success/warning`; destructive kini AA via token |
| `components/ui/button.tsx` | variant success → `bg-emerald-700 text-white hover:bg-emerald-600` (5.48:1 AA dua mode) |
| `app/(dashboard)/admin/layout.tsx` | `mainClassName` ditambah `bc-admin` |
| Charts (3 file) | grid `var(--clr-border)`, tick `var(--clr-text-3)`, heatmap border `var(--clr-border)` |
| `scripts/audit-theme-hardcoded.ts` (BARU) | audit kandidat warna hardcoded per zona (READ-ONLY) |
| `scripts/test-guru-dashboard-theme-consistency.ts` | +4 assertion (bc-admin layer, bc-badge, token :root, admin layout wire) |
| `docs/PHASE_GLOBAL_SEMANTIC_THEME_AUDIT.md` (ini) | audit lengkap + matriks verifikasi |
| `package.json` | + `audit:theme-hardcoded` |

## 3. Token Contract (:root light, hasil 8.2)

`--secondary: 240 4.8% 95.9%` · `--secondary-foreground: 240 5.9% 10%` · `--accent-foreground: 240 5.9% 10%` · `--destructive: 0 73% 41%` · `--destructive-foreground: 0 0% 100%`.

Nilai AA (dihitung WCAG relative luminance terhadap teks):
- `--secondary-foreground` (hampir-hitam #16181d) di atas `--secondary` (light gray #f4f5f9) ≈ 15:1 ✅
- `--destructive` (#b91c1c) + `--destructive-foreground` (#fff) = 4.83:1 ✅ (normal text AA)
- Token `--clr-*` canonical dari 8.0/8.1 TIDAK diubah; harness jejak nilai tetap.

## 4. `.bc-admin` Compatibility Block (Bagian 5 globals.css)

Mapping identik `.bc-guru`, grup ringkas ~90 baris:

- **bg**: `bg-white` (+opacity 90–5), `bg-slate-50/100/200/300` (+gray)
- **hue soft**: emerald/violet/red/amber/blue soft (50) → `--clr-{*}-soft`
- **hue solid**: 400–700 → `--clr-accent/danger/warning/violet/info` (+strong)
- **text**: `text-slate/gray 900–300` → `--clr-text/text-2/text-3`; `text-emerald/violet/red/amber/blue 400–700` → hue tokens
- **border**: `border-slate/gray 100–300` → `--clr-border` (45% color-mix); hue 100–600 → hue tokens
- **divide**: `divide-slate-*` → `--clr-border`
- **hover**: `hover:bg-slate-100/50` → surface-2/soft; hue hover → mix(hue 88%, text)
- **ring/focus**: `ring-*` & `focus:ring-*` (red→danger, emerald→accent-strong, violet→violet, amber→warning-strong, blue→info); `focus:border-*` serupa
- **placeholder**: `placeholder:text-gray/slate-400/500` → `--clr-text-3`
- **`:focus-visible`** → outline 2px `--clr-accent-strong` (terlihat di light+dark)

TIDAK ada definisi token duplikat — semua selector `.bc-admin` memakai token Bagian 1 (sumber kebenaran) yang sama dengan `.bc-guru`.

## 5. Badge Primitives (GLOBAL, tanpa scope)

`.bc-badge-success` · `.bc-badge-warning` · `.bc-badge-danger` · `.bc-badge-info` · `.bc-badge-violet` — semua: `background: var(--clr-{*}-soft)`, `color: var(--clr-{*}-strong|danger|info|violet)`, `border: 1px solid color-mix(hue 35%, transparent)`. Kontras diverifikasi 8.1: success 5.21 / warning 4.84 / danger 4.41 (UI) / info 4.75 / violet ~5.0.

## 6. Verifikasi

| Check | Hasil |
|-------|-------|
| Provider tema tunggal (`providers.tsx` + `theme-provider`, tanpa import kedua) | ✅ |
| `darkMode: ["class"]`, tanpa `media` | ✅ |
| `bg-primary`/`bg-secondary`/`bg-muted`/`bg-accent` kini `hsl(var(--...))` | ✅ (grep config) |
| ui/input·modal·tabs·badge·button memakai semantic tokens | ✅ |
| admin layout wire `.bc-admin` | ✅ (harness assertion) |
| Charts grid/tick memakai `--clr-*` | ✅ (grep) |
| `npm run test:guru-dashboard-theme-consistency` | ✅ 153/153 |
| `npm run audit:theme-hardcoded` | ✅ READ-ONLY, kandidat per zona |
| `npx tsc --noEmit` | ✅ 0 errors |
| ESLint | ✅ 0 violations |
| `npm run build` (dummy env) | ✅ Compiled, 0 error |
| `git diff --check` | ✅ bersih |
| Protected zones (prisma/ app/api/ lib/gamification/ lib/learning-loop/ engines/ lib/apk.ts bottom-nav) | ✅ 0 diff |

## 7. Risiko & Catatan

1. **Themes Rules diberlakukan** — lihat `AGENTS.md` -> "THEME RULE (wajib untuk fitur baru)" (10 poin): satu provider, satu token set, `.bc-badge-*` untuk status, dagger dark manual dilarang untuk patch, charts pakai `var(--clr-*)`.
2. **Dark debt historis tetap**: ~1.191 `dark:` patch admin + 1.606 `dark:*` guru dibiarkan (debt visual; pembersihan deferred). Compat menormalkan utilitas light-palette runtime; `dark:` eksplisit di file game adalah legit.
3. **Guru dark partial**: shell (aside/header/main wrapper) sudah dark di 8.0; isi 79 halaman light-only dinormalkan `.bc-guru` (8.0/8.1); admin kini lewat `.bc-admin`.
4. **Browser QA Light+Dark** tetap butuh staging (env lokal dummy tidak render app terautentikasi).
5. **Known light kontras** (nilai diwarisi 8.1, butuh keputusan founder): accent dekor 2.54:1, warning 2.15:1, warning-on-soft 2.07:1 — dipakai untuk elemen UI dekor/badge, bukan teks konten.

## 8. Manifes File

Diubah: `app/globals.css`, `tailwind.config.ts`, `components/ui/{input,modal,tabs,badge,button}.tsx`, `app/(dashboard)/admin/layout.tsx`, `app/(dashboard)/admin/analytics/page.tsx`, `components/admin/AdminCharts.tsx`, `components/guru/AktivitasAnalytics.tsx`, `scripts/test-guru-dashboard-theme-consistency.ts`, `package.json`, `AGENTS.md`.
Baru: `scripts/audit-theme-hardcoded.ts`, `docs/PHASE_GLOBAL_SEMANTIC_THEME_AUDIT.md`.