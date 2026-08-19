# PHASE GURU BERANDA DARK MODE 2.0

**Aug 19, 2026** — Task: buat `/guru/beranda` + komponen turunannya dark-ready premium (light+dark intentional) dengan canonical `--clr-*` + scope `.bc-guru`. **NO COMMIT / NO PUSH — menunggu Founder Review.**

## Ringkasan

Beranda guru adalah halaman dengan pemanfaatan warna paling padat (gradien solid, icon chip, shadow & ring berwarna, banyak hue). Setelah fase 8.0/8.1 (compat dasar + kontras AA), audit menemukan beranda belum dark-clean: 0 `dark:` variants, tapi banyak utility warna di luar cakupan Bagian 3; di dark mode mereka jatuh ke Tailwind light palette (sangat terang) → kontras rusak.

Solusi: perluasan compat layer **Bagian 3b** di `app/globals.css` (scope `.bc-guru` saja) — murni CSS, **0 perubahan logika/JSX** di 16 file target kecuali 1 fix visual banner.

## Audit (sebelum)

- **16 file scope** (beranda page + 15 komponen guru/misi/banner) — inventaris presisi via `rg -o`: 115 text-*, 35 bg-gradient-to-{r,br} (27 br), 32 shadow-* color, ring-* berwarna, icon chip `bg-{emerald,violet,amber,sky,teal,orange,indigo}-500/90` (iconBg dari `lib/guru/misi-guru.ts` baris 30–84 & `lib/guru/next-action.ts` baris 63–103, diteruskan komponen baris 135).
- **Cakupan Bagian 3 (8.0/8.1)**: bg-white/*, bg-slate/emerald/violet/purple/amber/yellow/blue/red 50–700, text-{gray,slate,emerald,violet,amber,blue,red}-400..700, border dasar, ring solid, placeholder — **OK**.
- **Gap Bagian 3b**: opacity soft-tint (`bg-emerald-50/60|/70`, `bg-violet-50/40|/50`, `bg-white/40` …), hue rose/orange/sky/teal/indigo, `*-800/900` text, `*-300` border, gradien `from/via/to` (27+ kombinasi), shadow berwarna (`--tw-shadow-color`), hover variants, icon chip `*-500/90`, dan **dark-override label putih di atas gradien solid** (mekanisme identik P0 fix 8.2.1).
- **BannerSlideshow**: kartu fallback memakai gradien navy inline (`from-slate-900 to-slate-800` — sengaja tidak dipetakan, gelap di kedua mode) + `text-slate-300` → di light mode ter-mapping jadi abu → **diganti `text-white/70`** (satu-satunya edit JSX).

## Perubahan

| File | Perubahan |
|------|-----------|
| `app/globals.css` | **Bagian 3b** (+190 baris, di antara P0 fix 8.2.1 dan Bagian 4): opacity soft-tint; hue tambahan (rose→danger, orange→warning, sky→info, teal→accent, green-100, emerald-400, amber-400); icon chip `*-500/90` → token solid; text (`*-800/900`→strong, `*-300`→mix, `*/80`→mix); border (`*-50`→border, `*-300`→mix); hover (bg/border/text/from); ring & focus soft; shadow warna (`--tw-shadow-color`, 13 rule); **semua** gradien from/via/to soft↔solid (cascade: from reset → via → to; `--tw-gradient-to: transparent` dinormalisasi); dark-override `.dark .bc-guru :is(.from-*, .to-*).text-white` → `color-mix(token 55%, var(--clr-bg))` + chip `*-500/90` + `bg-rose-600/700.text-white`. |
| `components/public/BannerSlideshow.tsx` | Fallback card desc: `text-slate-300` → `text-white/70` (latar navy inline tetap gelap dua mode). |
| `scripts/test-guru-beranda-theme.ts` | BARU — 111 assertions (A: coverage 100% utility scope; B: 0 `dark:`; C: 0 hex arbitrary baru; D: 60+ mapping positif; E: protected zones 0 diff). |
| `package.json` | + `test:guru-beranda-theme` |
| `docs/PHASE_GURU_BERANDA_DARK_MODE_2.md` | Ini. |

## Token mapping (canonical)

- emerald/green/teal → `--clr-accent` / `--clr-accent-strong` / `--clr-accent-soft`
- violet/purple/indigo → `--clr-violet` / `--clr-violet-soft`
- amber/orange/yellow → `--clr-warning` / `--clr-warning-strong` / `--clr-warning-soft`
- rose/red → `--clr-danger` / `--clr-danger-soft`
- sky/cyan/blue → `--clr-info` / `--clr-info-soft`
- gray/slate/stone → `--clr-surface*`, `--clr-border*`, `--clr-text*`
- Dark override: hue solid + `text-white` → `color-mix(token 55%, var(--clr-bg))` (55% = kontras label putih ≥ 4.5:1 terhadap bg gelap).

## Aksesibilitas

Semua pasangan teks dari token sudah AA (harness 8.1 mengunci nilai). Dark baru: label putih di atas gradien = 55% hue terhadap `--clr-bg` (#0b132b ≈ 4.9:1). Warna decoration (chip 25–45% mix) adalah non-teks — tidak dihitung.

## Responsive & mobile

Murni CSS compat — tidak ada perubahan layout/klas. Mobile GIM dst. tidak terpengaruh (scope `.bc-guru`). Banner autoplay/dots tidak diubah.

## Verifikasi

| Check | Hasil |
|-------|-------|
| `npm run test:guru-beranda-theme` | ✅ 111/111 |
| `npx tsc --noEmit` | lihat tabel bawah |
| ESLint (file diubah) | lihat tabel bawah |
| `git diff --check` | lihat tabel bawah |
| `npm run build` (dummy env) | lihat tabel bawah |
| Protected zones (prisma/, app/api/, lib/gamification/, lib/learning-loop/, engines/) | ✅ 0 diff |

## Regression

- Light mode: semua mapping hanya menggantikan warna dengan nilai token light yang ≈ identik (`--clr-accent #059669` vs `emerald-600 #059669`, dst.); gamification-engine/student/murid/arena tidak terpengaruh (scope `.bc-guru`).
- 1 penyesuaian sadar: BannerSlideshow fallback desc abu → putih/70.

## Remaining (tidak berubah)

1. Commit/push fase ini bila disetujui founder (globals.css + BannerSlideshow + test + docs + AGENTS.md)
2. LANJUT 8.4.1 saat kuota/reset (`QA_MAX_MINUTES=110 npx tsx scripts/qa-ai-diagnostic-8-4-1.ts --sessions 10`)
3. TKA UTBK/Guru enrichment 30 → 150
4. Game server revival (VPS mati)
5. GameRoom migration SQL via Supabase dashboard
6. UI game solo: badge-score client vs server masih beda (kosmetik)
7. SQL `2026-08-02_no_absen.sql` & `2026-08-08_school_identity.sql` (Production + Preview)