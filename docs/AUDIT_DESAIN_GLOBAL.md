# Audit Desain Global BahasaCerdas

Tanggal: 19 Oktober 2026 (WIB) · Basis: `main` @ `d47d1a6` (setelah PR #144)
Tujuan: satu bahasa desain untuk seluruh aplikasi (standar JUMPA v4 + halaman transaksi PR #144).
Rujukan: [`PANDUAN_DESAIN_BC.md`](PANDUAN_DESAIN_BC.md) · token: `app/theme/tokens.css` · primitif: `components/ui/*` + `app/theme/ui.css`.

---

## 1. Ringkasan

| Temuan | Dampak | Tindak lanjut |
|---|---|---|
| **7 sistem token paralel** (shadcn HSL, `--clr-*`, salinan `.bc-classroom`, guru biru `.bc-guru-shell`/`--guru-*`, `--jp-*`, `--bp-*`, `--px-*` arena) | Tiap fitur tampak berbeda; perubahan warna harus diulang di banyak tempat | Fase A: `app/theme/tokens.css` jadi satu-satunya sumber. Token lokal tetap jalan, dimigrasi per area |
| **`--primary` shadcn = merah** (`0 73% 41%` ≈ `#B91C1C`), dipakai **312×** (`bg-primary`, `text-primary`, `ring`, `Button` bawaan, fokus global, `themeColor`) | Tombol bawaan & fokus berwarna merah, bertentangan dengan merek teal→violet | **Keputusan CEO** (§6). Fase A tidak mengubahnya |
| **Guru = biru** (`.bc-guru-shell` mengganti `--clr-accent` → `#2563eb`, hero navy, ±250 baris override) | Guru tidak memakai gradien merek teal→violet yang disetujui | **Keputusan CEO** (§6) |
| **Font Inter tidak pernah dimuat** (hanya dideklarasikan di Tailwind); `font-display` = Georgia | Tampil memakai font sistem (Roboto/SF/Segoe) — tidak konsisten antar-perangkat | **Keputusan CEO** (§6) |
| Primitif `components/ui` = shadcn mentah (Button h-9 radius 8px merah, Card radius 12px) dan **dipakai sedikit** (Button 48 file, Card 36, Modal 7, Tabs 6) | Hampir setiap halaman membuat tombol/kartu/modal sendiri | Fase A: primitif baru di tempat yang sama, API lama tetap |
| Modal ad hoc: `fixed inset-0` **134×** di 77 file; skeleton ad hoc (`animate-pulse`) di 49 file; toast lokal di 4 file; tanpa Select, EmptyState, PageHeader, Skeleton bersama | Perilaku & aksesibilitas modal berbeda-beda (Escape, fokus, label tutup) | Fase A: `Modal`/`Sheet` (bc), `Toast`, `EmptyState`, `PageHeader`, `Skeleton`, `Select`, `Field` |
| `backdrop-blur` **174×** di 84 file | Berat di HP murah (panduan melarang blur berat di HP) | Fase B: ganti latar padat saat migrasi tiap area |
| Radius acak: `rounded-xl` 1462, `rounded-2xl` 932, `rounded-lg` 660, `rounded-3xl` 112 + 12 nilai arbitrer (`[26px]`, `[2rem]`, …) | Kartu/tombol tidak seragam | Skala radius token (`rounded-bc-*`) |
| `bg-gradient-to-*` **624×** dengan palet bebas | Gradien tiap fitur berbeda | `bg-bc-brand` / `--bc-grad-*` |

Kondisi uji di `main` sebelum pekerjaan ini (sudah gagal, bukan disebabkan fase ini):
`audit:theme-hardcoded` BLOCKING 2 · `test:no-emoji-icons` 2 gagal · `test:guru-dashboard-theme-consistency` 171/173 ·
`test:unified-header` 42/48 · `test:theme-consistency` gagal · `audit:bahasa-ui` 19.121 temuan (memindai kode juga, banyak positif palsu).

---

## 2. Inventaris token yang ada

| # | Sistem | Lokasi | Isi | Status |
|---|---|---|---|---|
| 1 | shadcn HSL | `app/globals.css` `@layer base` | `--background`, `--primary` (merah), `--secondary`, `--muted`, `--border`, `--radius 0.75rem`, `--success/warning/danger` | Lama. Tetap, dipetakan Tailwind (`bg-primary`, …) |
| 2 | **`--clr-*` kanonik** | dipindah ke **`app/theme/tokens.css`** | bg, surface, surface-2, border, text 1–3, accent (teal), violet, info, warning, danger + soft/strong | **Sumber kebenaran**. Nilai tidak berubah |
| 3 | Salinan `.bc-classroom` | `components/kelas/classroom.css` | `--clr-*` identik + `--shadow-card/--shadow-sheet`; varian murid violet | Duplikat — hapus saat migrasi Kelas |
| 4 | Guru biru | `app/globals.css` (Guru V3/V4) | override `--clr-accent` biru, `--guru-navy/blue/cyan`, `--guru-hero-gradient`, `.guru-hero-strong` (hex mentah) | Bertentangan dengan arah merek — keputusan CEO |
| 5 | JUMPA | `components/jumpa/jumpa.css` | `--jp-line`, `--jp-glass`, `--jp-ease`, `--jp-grad`, `--jp-depth` | Sudah 100% token. Jadi acuan primitif |
| 6 | Transaksi | `components/billing/billing.css` | `--bp-line`, `--bp-grad`, `--bp-depth`, `.bp-card/.bp-badge/.bp-btn` | Sudah 100% token. Jadi acuan primitif |
| 7 | Arena | `app/arena/player-theme.css`, `arena.css` | `--px-*` (64 var) + 83 hex | Tema gim terpisah |
| 8 | Tailwind | `tailwind.config.ts` | `gold-*`, `zinc` override, font Inter/Georgia/Elegant Bloom/Newscrash, `primary.light/dark` hex | Ditambah token `bc-*` (fase A) |
| 9 | Kartu profil | `app/globals.css` `.bc-card-premium`, `.bc-hero-card` | gradien hex mentah terang/gelap | Migrasi di area Profil |
| 10 | Lapisan kompatibilitas | `.bc-guru …`, `.bc-admin …` di `globals.css` | ±600 baris memetakan `bg-white`, `text-gray-*`, `emerald-*` ke token saat gelap | Jaring pengaman; dikecilkan setelah migrasi |

---

## 3. Komponen ganda

| Jenis | Versi yang ada |
|---|---|
| Tombol | `components/ui/button` (shadcn), `.bc-btn-primary/.bc-btn-secondary` (classroom, 23×), `.jumpa-primary/.jumpa-ghost` (41×), `.bp-btn` (9×), ratusan `<button className="bg-… rounded-…">` lokal, `ArenaBackButton`, `GameBackButton` |
| Kartu | `components/ui/card` (36 file), `.bc-card` (49×), `.jumpa-card` (20×), `.bp-card` (23×), `.guru-surface-card`, `.bc-card-premium`, `.glass` (31×), `.card-hover` (18×), 29 komponen `*Card.tsx` khusus fitur |
| Badge | `components/ui/badge`, `.bp-badge` (20×), `.bc-badge-success/warning`, `.badge-premium(-red)` (0×, mati), `SidebarPremiumBadge`, `TeamBadge` |
| Input | `components/ui/input` (9 file), `.bc-input` (19×), `CouponInput`, input lokal di hampir semua form |
| Modal/Sheet | `components/ui/modal` (7 file), `.bc-sheet` (20×), `ShareSheet`, `RankUpModal`, `ShareKelasModal`, `SubmitConfirmModal`, `EndSessionDialog`, + 134 `fixed inset-0` lokal |
| Toast/Alert | `KaryaRewardToast`, `PaymentHealthAlert`, `.bc-error-banner/.bc-success-banner`, state `setToast` lokal (4 file) |
| Empty state | `.bc-empty` (9×), `EmptyStates.tsx` (arena), teks kosong lokal |
| Tabs | `components/ui/tabs` (6 file), `EvaluasiSimulasiTabs`, chip filter lokal |

---

## 4. Warna mentah per fitur

Hitungan baris kode (`.ts/.tsx/.css`). *Hex* = `#rrggbb`/`#rgb`; *Arbitrer* = `bg-[#…]`/`text-[rgb…]`; *Tailwind mentah* = `bg-emerald-500`, `text-slate-700`, …; *Token* = `var(--clr-*)`.

| Area | File | Hex | Arbitrer | Tailwind mentah | `dark:` | Token | Emoji |
|---|---|---|---|---|---|---|---|
| Guru (`/guru/*`, `components/guru`) | 147 | 70 | 48 | 5.685 | 551 | 195 | 55 |
| Murid (`/murid/*`, beranda, karya) | 65 | 80 | 80 | 2.181 | 966 | 59 | 7 |
| Literasi (artikel, karya, katastra, feed karya) | 12 | 0 | 0 | 1.028 | 239 | 0 | 3 |
| Kelas / KelasKu | 7 | 104 | 1 | 11 | 0 | 376 | 5 |
| Gim / Arena / Kuis Tempur | 282 | 1.844 | 887 | 5.451 | 2.372 | 0 | 165 |
| Main Bersama | 61 | 1.076 | 0 | 22 | 1 | 0 | 21 |
| Marketplace / toko karya | 10 | 0 | 0 | 313 | 3 | 0 | 0 |
| Profil | 17 | 24 | 11 | 909 | 449 | 0 | 1 |
| JUMPA | 37 | 0 | 0 | 0 | 0 | 355 | 0 |
| Billing / transaksi (PR #144) | 11 | 0 | 0 | 0 | 0 | 140 | 0 |
| Admin | 43 | 51 | 0 | 4.393 | 1.978 | 27 | 18 |
| Shell / navigasi | 16 | 1 | 0 | 235 | 109 | 0 | 0 |
| Kompetensi (UKBI/TKA) | 15 | 49 | 34 | 618 | 3 | 0 | 8 |
| AI BC / AI Cerdik | 16 | 0 | 0 | 138 | 66 | 9 | 0 |
| Auth | 8 | 12 | 4 | 578 | 237 | 0 | 1 |
| Landing / publik | 32 | 6 | 0 | 371 | 1 | 0 | 0 |

File dengan hex terbanyak: `components/game/game-env.css` (252), `main-bersama/teacher/question-authoring.css` (117), `main-bersama/main-bersama.css` (115), `game/TTSpage.tsx` (103), `main-bersama/teacher/room-client.tsx` (95), `app/arena/player-theme.css` (83).

Catatan:
- **JUMPA dan transaksi sudah bersih** (0 hex, semua token) — keduanya acuan.
- **Gim/Arena & Main Bersama** memakai warna untuk dunia permainan (kanvas Phaser, karakter). Hanya kerangka UI (header, tombol, kartu menu) yang dimigrasi; warna dunia gim tetap.
- Area **Guru** dan **Admin** sebagian besar "terselamatkan" lapisan kompatibilitas saat gelap, tetapi tampilannya tetap berbeda dengan arah baru.
- Shell murid: sidebar `from-violet-600 to-purple-600` + `backdrop-blur-xl`; guru: biru navy. Navigasi = prioritas Fase B.

---

## 5. Yang dikerjakan di Fase A (fondasi)

1. `app/theme/tokens.css` — satu-satunya file berisi hex. `--clr-*` (dipindah apa adanya) + token baru: `--clr-line(-strong)`, `--clr-field`, `--clr-on-brand`, `--clr-focus`, `--clr-scrim`, `--clr-success-soft`; gradien `--bc-grad-brand/murid/premium/danger/surface/tint`; radius `--bc-r-*`; bayangan `--bc-depth`, `--bc-shadow-1..3`, `--bc-glow-brand`, `--bc-ring`; jarak `--bc-space-*`; tipografi `--bc-fs-*`; gerak `--bc-ease`, `--bc-spring`, `--bc-dur-*`; lapisan `--bc-z-*`. Terang + gelap.
2. Tailwind: `bg-bc-surface`, `text-bc-text-2`, `border-bc-line`, `bg-bc-accent/20`, `bg-bc-brand`, `rounded-bc-card`, `shadow-bc-depth`, `text-bc-h1`, `ease-bc`, …
3. Primitif `components/ui/*` (gaya di `app/theme/ui.css`, kelas `.ui-*`): Button, Card, Badge (+ `PremiumBadge`, `LiveBadge`), Input, Select, Textarea, Field, Tabs, Modal/Sheet, Alert, Toast (`ToastProvider` di `app/providers.tsx`), EmptyState, PageHeader, Skeleton. **API lama tetap** (varian lama tampil sama persis).
4. Guard CI `npm run guard:warna`: menolak hex/rgb **baru** di luar `tokens.css`.
5. Galeri `/pratinjau/ui` (hanya `BC_UI_PREVIEW=1`, 404 di produksi).
6. Bukti tanpa regresi: 32 tangkapan layar halaman transaksi sebelum/sesudah **identik piksel**.

## 6. Keputusan untuk CEO

1. **Warna utama (`--primary`) merah → teal merek?** Rekomendasi: ya — ubah `--primary` ke teal (`--clr-accent-strong`) agar 312 pemakaian lama (tombol bawaan, fokus, cincin) ikut merek; merah tinggal untuk bahaya. Perubahan satu baris, efeknya luas — lakukan sebagai PR tersendiri dengan tangkapan layar.
2. **Identitas guru biru** (Guru V3/V4) **vs gradien merek teal→violet**. Rekomendasi: guru memakai gradien merek (teal di depan), murid gradien murid (violet di depan) — sesuai JUMPA v4 & halaman transaksi. Menghapus ±250 baris override biru.
3. **Font**: Inter tidak dimuat. Pilihan: (a) muat Inter lewat `next/font` (±30 KB, rapi & konsisten), (b) tetap font sistem (0 KB), (c) Manrope (sudah ada di repo untuk Main Bersama). Rekomendasi: (a) Inter, judul juga Inter (hapus Georgia).
4. **`themeColor` peramban** masih merah `#B91C1C` — ikut keputusan 1.
