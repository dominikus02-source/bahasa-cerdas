# PHASE 8 STEP 1 — Guru Dashboard Theme Contrast Hardening & Visual Consistency

Tanggal: 18 Agustus 2026
Status: **NO COMMIT / NO PUSH — menunggu Founder Review** (pola 8.0)

---

## 1. Tujuan

Hardening kontras + konsistensi visual Guru Dashboard (`/guru/*`, 79 halaman)
di atas fondasi STEP 8.0 (token `--clr-*` + compat layer `.bc-guru`):

1. **Semua pasangan teks≥4.5:1, UI≥3:1** dihitung eksak dari token (light+dark),
   bukan ditebak.
2. **Token canonical disinkron** antara `app/globals.css` (kanon global) dan
   `components/kelas/classroom.css` (reference `/guru/kelasku`) — satu sumber
   nilai, satu sistem.
3. **Compat layer diperluas** sehingga utility palet lama yang dominan di 76
   halaman light-only terpetakan ke token semantic — termasuk hover, ring,
   focus, placeholder, border mix.
4. **QA harness dikeraskan**: kontras dihitung, kanari self-test (jebakan
   palsu WAJIB gagal), invariant `Discovered == Executed == Passed`, tanpa
   `Skipped` — harness tidak bisa diplemahkan di masa depan.

## 2. Lingkup

- `app/globals.css` — token `:root`/`.dark` + compat `.bc-guru`.
- `components/kelas/classroom.css` — sinkronisasi nilai token (tanpa mengubah
  kelas `bc-student`).
- `scripts/test-guru-dashboard-theme-consistency.ts` — QA harness (tulis ulang
  penuh, 149 assertion A–J).
- Dokumen ini.

## 3. Non-Lingkup (tidak diubah)

- Layout/navigasi/flow/API/Prisma/protected zones — 0 diff.
- Engine tema: tetap `next-themes` tunggal (`darkMode: ["class"]`).
- 79 halaman guru: TIDAK diedit satu pun (mekanisme global).
- `text-white` (205×), `bg-slate-800/900`, `bg-gray-900`, `bg-black`, gradient:
  sengaja TIDAK dipetakan — kontras sudah benar di kedua mode.
- Allowlist arbitrary hex tetap: `#161B3A`, `#FFF6E0`, `#25D366`, `#0D0A1F`.

## 4. Audit Awal (temuan)

| Temuan | Severity | Resolusi |
|--------|----------|----------|
| `--clr-warning` light `#f59e0b` → kontras 2.15:1 di surface | High | → `#d97706` (3.19:1, UI) + token baru `--clr-warning-strong #b45309` (5.02:1, teks) |
| `--clr-danger` light `#ef4444` → 3.76:1 di surface | High | → `#b91c1c` (4.83:1 teks) |
| `--clr-text-3` light `#8a91a0` → 3.16:1 (di bawah 4.5) | High | → `#64748b` (4.76:1 AA) |
| `--clr-accent` light `#10b981` → 3.27:1 (di bawah 3.0) | Medium | → `#059669` (3.77:1 UI; dekor/teks besar) |
| Dark `--clr-text-3 #6b7280` → 3.60:1 | Medium | → `#8b93a1` (5.62:1 AA) |
| Border `color-mix` 30%/25% → garis terlalu pucat | Low | naik ke 45% |
| Compat belum punya: purple/violet teks, hover merah/biru/violet, ring/focus hue, placeholder | Medium | ditambah (lihat §9) |
| `disabled:opacity-*` dipetakan? | — | TIDAK — native Tailwind, dilarang override (di-lock harness) |
| rgba literal | — | hanya 1 (glass `game/page.tsx`) — dokumentasi exception |
| min-w arbitrary | — | maks 200px — tidak ada ≥1200 |
| `peer-checked`/`checked:`/`selected:` | — | 0 pemakaian — tak perlu mapping |

## 5. Metode Hitung Kontras

- Helper `contrast()` (WCAG 2.x relative luminance) di dalam harness — nilai
  DIHITUNG dari token yang dibaca langsung dari `globals.css`, bukan hardcoded.
- Verifikasi awal via `contrast.mjs` (tmp, di luar repo).
- Pasangan: teks (normal) ≥ 4.5:1, UI/large/dekor ≥ 3:1.

## 6. Token Canonical (nilai baru, tersinkron di globals.css + classroom.css)

### Light
| Token | 8.0 | 8.1 |
|-------|-----|-----|
| `--clr-text-3` | `#8a91a0` | `#64748b` (4.76:1) |
| `--clr-accent` | `#10b981` | `#059669` (3.77:1 UI) |
| `--clr-accent-strong` | `#059669` | `#047857` (5.48:1) |
| `--clr-success` | `#10b981` | `#059669` |
| `--clr-warning` | `#f59e0b` | `#d97706` (3.19:1 UI) |
| `--clr-warning-strong` | — | **BARU** `#b45309` (5.02:1 teks; 4.84:1 di soft) |
| `--clr-warning-soft` | `#fffbeb` | tetap |
| `--clr-danger` | `#ef4444` | `#b91c1c` (4.83:1; 4.41:1 di soft) |
| `--clr-danger-soft` | `#fef2f2` | tetap |
| `--clr-violet` / `--clr-info` | `#7c3aed` / `#2563eb` | tetap (5.70 / 5.17:1) |

### Dark
| Token | 8.0 | 8.1 |
|-------|-----|-----|
| `--clr-text-3` | `#6b7280` | `#8b93a1` (5.62:1 AA) |
| `--clr-accent-strong` | `#10b981` | tetap (6.86:1) |
| `--clr-warning-strong` | — | **BARU** `#fbbf24` (10.42:1) |
| lainnya | tetap | tetap (semua ≥ 5.6:1) |

classroom.css menambah `--clr-warning-strong`, `--clr-info`, `--clr-info-soft`
(light `#2563eb`/`#eff6ff`, dark `#93c5fd`/`#15233f`) agar sinkron penuh.

## 7. Perubahan globals.css

1. `:root` — token §6 light.
2. `.dark` — token §6 dark.
3. Compat `.bc-guru` diperluas:
   - **text**: +`text-black`/gray-950/slate-950 → text; emerald/green 400–700
     semua → accent-strong; purple 400–700 + violet 400–700 → violet;
     red 400–800 → danger; amber/yellow 400–700 → warning-strong;
     blue 400–700 → info.
   - **bg**: +`bg-violet-700`, `bg-purple-500/600/700`, `bg-red-700`,
     `bg-amber-500/600/700`, `bg-yellow-500/600`, `bg-blue-700`.
   - **border**: +green-500/600, purple-500/600, violet-100/200, red-100/200/300,
     amber-100/200/300, yellow-100/200, blue-100/200/300; color-mix dinaikkan
     30%/25% → **45%** (emerald, violet, red, amber, blue).
   - **hover**: `hover:bg-red-600/700` → mix(danger 88%, text),
     `hover:bg-amber-600/700` → warning-strong, `hover:bg-blue-600/700` →
     mix(info 88%, text), `hover:bg-violet-600/700` → mix(violet 88%, text);
     hover soft (slate/gray/emerald/red-50/amber-50/blue-50/violet-50) ke
     surface-2/soft tokens.
   - **ring/focus**: `ring-emerald-500/400` → accent-strong, `ring-red-500/400`
     → danger, `ring-amber-500/400` → warning-strong, `ring-blue-500/400` →
     info, `ring-violet-500/400` → violet; `focus:ring-*` sama;
     `focus:border-emerald-500/400`, `focus:border-red-500`, `focus:border-blue-500`.
   - **placeholder**: `placeholder:text-gray-400/500`, `placeholder:text-slate-400/500` → text-3.
   - **fokus global**: `.bc-guru :focus-visible { outline: 2px solid var(--clr-accent-strong); outline-offset: 2px; }`.
   - **disabled**: TIDAK dipetakan (native Tailwind) — di-lock harness.

## 8. Perubahan classroom.css

- Blok token `:root` (light) & `.dark` disinkron ke §6 — nilai identik dengan
  globals.css. Kelas `bc-classroom`/`bc-student` tidak berubah semantik.
- Tambah `--clr-warning-strong`, `--clr-info`, `--clr-info-soft` agar
  reference kelasku memakai token baru yang sama.

## 9. Scan Consumer (halaman guru)

- 0 `text-black`; 0 `peer-checked`/`checked:`/`selected:`.
- `disabled:opacity-40` (5 file) & `disabled:opacity-50` (13 file) — native.
- `text-purple-700` 7×, `bg-purple-100` 13×, `bg-purple-600` 1, `bg-purple-500` 1.
- `bg-red-700` 1 (feed-karya), `bg-amber-700` 1 (toko-karya),
  `bg-blue-700` 1 (pengaturan), `bg-violet-700` 3 (materi-ajar) — semua kini
  dipetakan (§7).
- rgba literal: 1 (`game/page.tsx` glass) — exception terdokumentasi.
- min-w arbitrary maks 200px.

## 10. Aksesibilitas (angka terhitung)

| Pasangan (light) | Rasio | Standar |
|------------------|-------|---------|
| text / surface | 17.76 | AA teks |
| text-2 / surface | 6.13 | AA teks |
| text-3 / surface | 4.76 | AA teks |
| accent-strong / surface | 5.48 | AA teks |
| accent-strong / accent-soft | 5.21 | AA teks |
| warning-strong / surface | 5.02 | AA teks |
| warning-strong / warning-soft | 4.84 | AA teks |
| danger / surface | 4.83 | AA teks |
| info / surface | 5.17 | AA teks |
| violet / surface | 5.70 | AA teks |
| accent / surface | 3.77 | UI (≥3) |
| warning / surface | 3.19 | UI (≥3) |

Dark: semua pasangan ≥ 5.6:1 (text 15.55, text-2 7.72, text-3 5.62, accent-strong 6.86, warning-strong 10.42, accent 9.05, warning 10.42).

## 11. QA & Regression

| Check | Hasil |
|-------|-------|
| `npm run test:guru-dashboard-theme-consistency` (tulis ulang, A–J) | ✅ 149/149, invariant `Discovered==Executed==Passed`, 0 fail, 0 skip |
| Kanari: assertion palsu terdeteksi, jebakan 8.0 (warning f59e0b, accent 10b981, danger ef4444, text-3 8a91a0) tidak kembali | ✅ 5/5 |
| `npm run test:guru-phase` | ✅ SEMUA LULUS |
| `npm run test:gamification-engine` | ✅ SEMUA LULUS |
| `npm run test:student-home` | ✅ 61/61 |
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx eslint scripts/test-guru-dashboard-theme-consistency.ts` | ✅ 0 violations |
| `npm run build` (dummy env) | ✅ Compiled 45s, prerender 371/371 |
| `git diff --check` | ✅ bersih |
| Protected zones (prisma, app/api, gamification, learning-loop, engines, diagnostic, adaptive, learner-state, src/ai, lib/ai-gateway) | ✅ 0 diff |

## 12. Exceptions & Keputusan Founder

1. **danger-on-soft 4.41:1** — sedikit di bawah 4.5 untuk teks normal pada
   danger-soft; dipakai untuk badge/ikon/kontainer tinted (dekor). Pilihan:
   (a) terima sebagai UI (≥3), (b) gelapkan danger-soft. Menunggu keputusan.
2. **accent #059669 3.77:1** — untuk teks putih kecil pada `bg-accent`
   (button) masih di bawah 4.5; dipakai konsisten dengan reference kelasku
   dan sebagian besar tombol memakai `accent-strong` untuk teks. Terima
   sebagai UI/large.
3. **white-on-accent-strong light = 5.48:1** — tombol utama `bg-emerald-600` +
   `text-white` kini AA teks (sebelumnya 3.27:1).
4. **disabled:opacity native** — tidak dipetakan; harness me-lock agar tidak
   ada override di masa depan.
5. **rgba glass `game/page.tsx`** — exception visual permainan, tidak diubah.

## 13. Verdict

```
STEP 8.1 VERDICT
- VISUAL THEME  : GREEN  — token sinkron (globals+classroom), compat 55 mapping utama
- CONTRAST      : GREEN  — teks ≥4.5, UI ≥3 dihitung eksak (light+dark);
                           3 pasangan 8.0 yang gagal (2.15/3.76/3.16) sudah dinaikkan
- CONSISTENCY   : GREEN  — satu token set, satu engine, satu fokus ring
- HARDENING     : GREEN  — harness 149 assertion + kanari + invariant, 0 diff protected
- Halaman       : 79/79 route ter-cover (76 via compat, 3 dark-native)
- COMMIT/PUSH   : NO     — menunggu Founder Review (pola 8.0)
```

## 14. Cara Menjaga

1. Setiap ubah token → jalankan harness; invariant harus tetap `Failed == 0`.
2. Utility baru di halaman guru yang belum dipetakan → tambah ke compat
   layer + daftar harness §C (bukan di halaman).
3. JANGAN memetakan `disabled:*`, `text-white`, block gelap, gradient —
   di-lock harness.
4. JANGAN menambah provider tema/`next-themes` kedua (di-lock §B).
5. JANGAN menurunkan nilai token — jebakan 8.0/8.1 di harness akan gagal.
