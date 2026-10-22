# Panduan Desain Bahasa Cerdas (standar JUMPA v4)

Berlaku untuk **semua UI Bahasa Cerdas mulai sekarang** — fitur baru dan setiap halaman yang disentuh.
Wajib diikuti oleh tim (termasuk Sugeng) dan alat AI (Grok Build, Claude, Cursor, dll.).

Sumber kebenaran: **token global `app/theme/tokens.css`** dan **primitif `components/ui/*`** (gaya di `app/theme/ui.css`),
yang diturunkan dari JUMPA v4 (`components/jumpa/*`) dan halaman transaksi (`components/billing/*`, PR #144).
Jika panduan ini dan kode berbeda, kode yang menang — lalu perbarui dokumen ini. Audit kondisi awal: [`AUDIT_DESAIN_GLOBAL.md`](AUDIT_DESAIN_GLOBAL.md).

> Singkatnya: gelap & bersih, aksen gradien teal→violet, kedalaman dari bayangan dan garis tipis (bukan blur),
> radius lega, teks Indonesia yang pendek, ringan di HP 360px.

---

## 0. Referensi cepat: token & komponen global

**Aturan:** UI baru dan setiap halaman yang disentuh memakai primitif `components/ui/*` dan token di bawah.
Hex/rgb hanya boleh ada di `app/theme/tokens.css` — `npm run guard:warna` (CI) menolak warna mentah baru.
Lihat semua primitif di `/pratinjau/ui` (lokal, `BC_UI_PREVIEW=1`).

### 0.1 Token (CSS) dan padanan Tailwind

| Kelompok | CSS | Tailwind |
|---|---|---|
| Warna dasar | `--clr-bg`, `--clr-surface`, `--clr-surface-2`, `--clr-border(-strong)`, `--clr-line(-strong)`, `--clr-field` | `bg-bc-bg`, `bg-bc-surface`, `bg-bc-surface-2`, `border-bc-line`, `border-bc-line-strong`, `bg-bc-field` |
| Teks | `--clr-text`, `--clr-text-2`, `--clr-text-3`, `--clr-on-brand` (di atas gradien) | `text-bc-text`, `text-bc-text-2`, `text-bc-text-3`, `text-bc-on-brand` |
| Merek | `--clr-accent(-strong/-soft)` teal, `--clr-info(-soft)` biru, `--clr-violet(-soft)` | `bg-bc-accent`, `text-bc-accent-strong`, `bg-bc-violet-soft`, … (opasitas: `bg-bc-accent/20`) |
| Status | `--clr-success(-soft)`, `--clr-warning(-strong/-soft)`, `--clr-danger(-soft)`, `--clr-info(-soft)` | `text-bc-danger`, `bg-bc-warning-soft`, … |
| Fokus & scrim | `--clr-focus`, `--clr-scrim`, `--bc-ring` | `outline-bc-focus` |
| Gradien | `--bc-grad-brand` (teal→biru→violet), `--bc-grad-murid` (violet di depan), `--bc-grad-premium`, `--bc-grad-danger`, `--bc-grad-surface`, `--bc-grad-tint` | `bg-bc-brand`, `bg-bc-murid`, `bg-bc-premium`, `bg-bc-surface`, `bg-bc-tint` |
| Radius | `--bc-r-xs` 8 · `-sm` 12 · `-icon` 14 · `-ctl` 16 · `-tile` 20 · `-card` 24 · `-hero` 28 · `-pill` 999 | `rounded-bc-xs` … `rounded-bc-hero`, `rounded-full` |
| Bayangan | `--bc-depth` (kartu), `--bc-shadow-1` (halus), `-2` (terangkat), `-3` (modal), `--bc-glow-brand` (hover mouse saja) | `shadow-bc-depth`, `shadow-bc-1..3`, `shadow-bc-glow` |
| Jarak | `--bc-space-1..10` (4, 8, 12, 16, 20, 24, 32, 40 px) | skala bawaan Tailwind (`gap-4`, `p-5`, …) |
| Tipografi | `--bc-fs-hero`, `-h1`, `-h2`, `-h3`, `-body`, `-input` (16), `-small`, `-eyebrow`; `--bc-font-sans` | `text-bc-hero`, `text-bc-h1`, `text-bc-h2`, `text-bc-h3`, `text-bc-body`, `text-bc-small`, `text-bc-eyebrow` |
| Gerak | `--bc-ease`, `--bc-spring`, `--bc-dur-fast/-/-slow` (.12/.18/.32 s; 0 saat reduced-motion) | `ease-bc`, `ease-bc-spring` |
| Lapisan | `--bc-z-sheet` 60, `--bc-z-toast` 70 | — |

Gradien merek: gelap `#34d399 → #93c5fd → #a78bfa` dengan teks `--clr-on-brand` gelap; terang `#047857 → #2563eb → #7c3aed`
dengan teks putih (semua titik ≥ 4.5:1). Token turunan dideklarasikan di `:root` **dan** `.dark`, jadi bagian yang dipaksa gelap
(`class="dark"`, mis. banner JUMPA) ikut benar.

### 0.2 Komponen (`components/ui/*`)

| Komponen | Pakai | Catatan |
|---|---|---|
| `Button` | `variant`: `primary` (gradien, satu per layar) · `murid` · `secondary` · `ghost` · `quiet` · `soft` · `danger` · `premium`; `size`: `sm` 36 · `md` 44 · `lg` 52 · `icon`; `block`, `loading` | `buttonClass({...})` untuk `<Link>`. Varian lama (`default`, `outline`, `destructive`, `link`, `gold`, `success`, `legacy-secondary`, `legacy-ghost`) tetap sama. `type` tidak diberi bawaan |
| `Card` | `variant="surface" \| "flat" \| "tint"`, `accent`, `interactive`, `pad`, `as` | Tanpa `variant` = kartu lama. `cardClass()` untuk elemen lain. Isi: `.ui-card__title`, `.ui-card__desc`, `.ui-icon-box` |
| `Badge` | `tone`: `neutral` · `accent` · `info` · `violet` · `success` · `warning` · `danger` · `premium` · `live` · `brand`; `icon` | `PremiumBadge` (mahkota, label "Premium"/"Pro"), `LiveBadge` ("Berlangsung" + titik). Tanpa `tone` = badge lama |
| `Input`, `Textarea` | `variant="bc"` | 48px, font 16px, fokus teal, `aria-invalid` merah |
| `Select` | select bawaan peramban bergaya | Opsi pendek |
| `Field` | `label`, `hint`, `error`, `hideLabel`; anak = fungsi `(p) => <Input variant="bc" {...p} />` | Menyambung `id`, `aria-describedby`, `aria-invalid`; galat `role="alert"` |
| `Tabs` | `<Tabs variant="bc">` + `TabsList` (`block`) + `TabsTrigger` + `TabsContent` | Segmen pil, bisa digeser di 360px |
| `Modal`, `Sheet` | `<Modal variant="bc" title description actions wide>`; `<Sheet>` = panel samping di laptop | Lembar bawah di HP, Escape menutup, `role="dialog"`, tombol "Tutup", tanpa blur |
| `Alert` | `tone`: `info` · `success` · `warning` · `danger`; `title`, `action` | `role="alert"` untuk galat/peringatan |
| `Toast` | `const { toast } = useToast(); toast({ tone: "success", title: "Tersimpan." })` | Provider sudah di `app/providers.tsx`; offset di atas nav bawah: `--ui-toast-offset` |
| `EmptyState` | `icon`, `title`, `description`, `action`, `card` | Satu kalimat + maks. satu tombol |
| `PageHeader` | `title`, `eyebrow`, `description`, `icon`, `tone` (`brand`/`murid`/`soft`), `actions`, `as` | Judul boleh dua baris; aksi turun bila sempit |
| `Skeleton`, `SkeletonCard` | `className` untuk ukuran, `rounded` | Denyut opasitas (ringan), mati saat reduced-motion |

Kelas CSS bisa dipakai langsung bila komponen tidak cocok: `.ui-btn .ui-btn--primary`, `.ui-card`, `.ui-badge .ui-badge--premium`,
`.ui-input`, `.ui-eyebrow`, `.ui-icon-box`, dll. (`app/theme/ui.css`). `className` Tailwind selalu bisa menimpa primitif.

### 0.3 Migrasi

- Halaman lama: ganti tombol/kartu/badge lokal dengan primitif; ganti `bg-white`/`text-gray-*`/`emerald-*` dengan `bg-bc-surface`/`text-bc-text-*`/`bc-accent`.
- Peran (keputusan CEO 2026-10-19): **guru = biru**, **murid = gradien merek teal→violet**. Untuk aksi utama yang mengikuti audiens pakai token aksen audiens (§1.4): `Button variant="accent"`, `bg-bc-aud-grad`, `text-bc-aud`, `bg-bc-aud-soft`, `Badge tone="aud"`. Di area guru, legacy `emerald-*`/`green-*` (non-status) dipetakan ke `bc-aud`, bukan `bc-success`.
- Token lokal (`--jp-*`, `--bp-*`, salinan `.bc-classroom`) boleh tetap; arahkan ke token global saat area itu disentuh.
- Jangan ubah perilaku/logika saat migrasi tampilan.

---

## 1. Token warna

**Aturan utama: jangan menulis hex di CSS/TSX.** Selalu `var(--clr-*)` (atau `color-mix()` dari token).
`npm run audit:theme-hardcoded` dan test tema akan menandai hex baru.

### 1.1 Token dasar (`app/theme/tokens.css`)

| Token | Terang (`:root`) | Gelap (`.dark`) | Dipakai untuk |
|---|---|---|---|
| `--clr-bg` | `#f4f5f7` | `#0f1117` | Latar halaman; juga warna ikon/teks **di atas** tombol berwarna |
| `--clr-surface` | `#ffffff` | `#171a22` | Kartu, panel |
| `--clr-surface-2` | `#f8f9fb` | `#1d212b` | Kartu terangkat, input, lembar (sheet) |
| `--clr-border` | `#e6e8ee` | `#262b38` | Garis biasa |
| `--clr-border-strong` | `#d4d7e0` | `#333a4b` | Garis tegas |
| `--clr-text` | `#16181d` | `#f1f2f6` | Teks utama |
| `--clr-text-2` | `#5b6270` | `#a6adbb` | Teks sekunder |
| `--clr-text-3` | `#64748b` | `#8b93a1` | Keterangan, label kecil |
| `--clr-accent` | `#059669` | `#34d399` | **Teal merek** — aksi utama, aktif |
| `--clr-accent-strong` | `#047857` | `#10b981` | Ujung gradien tombol utama; teks aksen di mode terang |
| `--clr-accent-soft` | `#ecfdf5` | `#0d2b22` | Latar chip/badge teal |
| `--clr-info` | `#2563eb` | `#93c5fd` | Titik tengah gradien merek, info |
| `--clr-violet` | `#7c3aed` | `#a78bfa` | **Violet merek** — ujung gradien, peran murid |
| `--clr-violet-soft` | `#f5f3ff` | `#1e1835` | Latar badge murid |
| `--clr-warning` | `#d97706` | `#fbbf24` | **Kuning** — angkat tangan, Premium, hitung mundur |
| `--clr-warning-strong` | `#b45309` | `#fbbf24` | Teks kuning di mode terang |
| `--clr-warning-soft` | `#fffbeb` | `#2b220d` | Latar badge Premium |
| `--clr-danger` | `#b91c1c` | `#f87171` | **Merah/coral** — mati, Keluar, error |
| `--clr-danger-soft` | `#fef2f2` | `#2b1517` | Latar badge bahaya |

### 1.2 Token turunan (pola JUMPA, salin namanya bila membuat scope baru)

```css
--jp-line:         color-mix(in srgb, var(--clr-text) 10%, transparent);   /* garis tepi kartu */
--jp-line-strong:  color-mix(in srgb, var(--clr-text) 18%, transparent);   /* garis tombol/input */
--jp-glass-strong: color-mix(in srgb, var(--clr-surface-2) 82%, transparent);
--jp-ease:         cubic-bezier(.22, .8, .24, 1);                           /* gerak standar */
--jp-grad:         linear-gradient(120deg, var(--clr-accent), var(--clr-info) 55%, var(--clr-violet));
```

### 1.3 Peran warna (semantik)

| Peran | Nilai persis (gelap) | Catatan |
|---|---|---|
| **Gradien merek (aktif)** | `linear-gradient(140deg, var(--clr-accent), var(--clr-info) 60%, var(--clr-violet))` → `#34d399 → #93c5fd → #a78bfa` | Tombol aktif, chip ikon, tombol "Gabung". Ikon/teks di atasnya **`var(--clr-bg)`** (gelap). |
| **Tombol utama (CTA)** | `linear-gradient(135deg, var(--clr-accent), var(--clr-accent-strong))` → `#34d399 → #10b981` | Satu per layar. Teks `var(--clr-bg)`. |
| **Coral "mati"** (mik/kamera mati) | ikon `color-mix(in srgb, var(--clr-danger) 82%, var(--clr-text))` ≈ `#f78889`; latar `color-mix(danger 20%, surface-2) → color-mix(danger 12%, surface)`; garis `color-mix(danger 50%, transparent)` | Jelas tapi tidak "alarm". |
| **Kuning tangan** | `linear-gradient(140deg, var(--clr-warning), color-mix(in srgb, var(--clr-warning) 55%, var(--clr-danger)))` → `#fbbf24 → coral` | Hanya untuk angkat tangan / perhatian. Ikon `var(--clr-bg)`. |
| **Merah Keluar** | `linear-gradient(140deg, var(--clr-danger), color-mix(in srgb, var(--clr-danger) 82%, var(--clr-violet)))`; hover `var(--clr-danger)` (`#f87171`) | Satu-satunya tombol merah pekat. Teks `var(--clr-bg)`. |
| **Idle (tint kaca)** | `linear-gradient(160deg, color-mix(accent 13%, surface-2), color-mix(violet 16%, surface))`; garis `color-mix(text 14%, transparent)`; garis sorot `inset 0 1px 0 color-mix(text 9%, transparent)` | **Tanpa** `backdrop-filter`. Hover: 20% / 24%, garis `color-mix(accent 45%, transparent)`. |
| **Premium** | teks `var(--clr-warning)`, latar `var(--clr-warning-soft)`, garis `color-mix(warning 45%, transparent)`; CTA berbingkai `linear-gradient(120deg, warning, accent 60%, violet)` | Kata "Premium" tetap. Jangan ubah harga. |
| **Berlangsung** | teks `var(--clr-danger)`, latar `var(--clr-danger-soft)`, titik berkedip/berdenyut | Status ruang/sesi hidup. |

### 1.4 Aksen per audiens (keputusan CEO 2026-10-19)

Satu nama token, nilainya mengikuti audiens. Didefinisikan di `app/theme/tokens.css` §3.
Scope guru: `.bc-guru-shell` (layout `/guru/*`) atau `[data-audience="guru"]`; selain itu = murid.

| Token | Tailwind | Murid (default) | Guru terang | Guru gelap |
|---|---|---|---|---|
| `--clr-aud` (`--bc-accent`) | `bc-aud` | `var(--clr-violet)` | `#2563eb` | `#60a5fa` |
| `--clr-aud-strong` | `bc-aud-strong` | violet + teks 18% | `#1d4ed8` | `#93c5fd` |
| `--clr-aud-soft` | `bc-aud-soft` | `var(--clr-violet-soft)` | `#eff6ff` | `#10264a` |
| `--clr-on-aud` | `bc-on-aud` | `var(--clr-on-brand)` | `#ffffff` | `#0f1117` |
| `--bc-grad-aud` (`--bc-grad-accent`) | `bg-bc-aud-grad` | `var(--bc-grad-brand)` (teal→biru→violet) | `#1d4ed8 → #2563eb → #4f46e5` | `#38bdf8 → #60a5fa → #818cf8` |
| `--bc-glow-aud` | — | `var(--bc-glow-brand)` | glow biru | glow biru |

Kontras (WCAG AA ≥ 4.5:1): teks putih di gradien guru terang ≥ 5.2:1; teks `#0f1117` di gradien guru gelap ≥ 6.1:1;
`#2563eb` di putih 5.2:1; `#60a5fa` di `#171a22` 6.4:1. Di scope guru `--clr-accent`/`--clr-focus` juga biru
supaya fokus & lapisan kompatibilitas `.bc-guru` konsisten. Hijau tetap hanya untuk status sukses.

Primitif: `.ui-btn--accent`, `.ui-icon-box--accent`, `.ui-icon-box--aud-soft`, `.ui-badge--aud`, `.bc-btn-primary` (kelas).

### 1.5 Primary global (keputusan CEO 2026-10-19)

`primary` (Tailwind `bg-primary`, `text-primary`, shadcn `--primary`) **bukan merah lagi**: teal + gradien merek.

| Token | Tailwind | Terang | Gelap | Guru (terang / gelap) |
|---|---|---|---|---|
| `--clr-primary` | `text-primary`, `border-primary` | `#047857` (putih 5.5:1, di bg 5.1:1) | `#34d399` (9.0:1 di surface) | `#1d4ed8` / `#60a5fa` |
| `--clr-primary-strong` | `primary-dark` (hover) | `#065f46` | `#6ee7b7` | `#1e40af` / `#93c5fd` |
| `--clr-primary-soft` | `primary-light` | `= --clr-accent-soft` | `= --clr-accent-soft` | `= --clr-aud-soft` |
| `--clr-on-primary` | `text-primary-foreground` | `#fff` | `--clr-bg` | `#fff` / `#0f1117` |
| `--bc-grad-primary` | `bg-primary` (otomatis gradien) | `--bc-grad-brand` (#047857→#2563eb→#7c3aed) | #34d399→#93c5fd→#a78bfa | `--bc-grad-aud` |

- Teks di atas `bg-primary` **selalu** `text-primary-foreground` (bukan `text-white` — di gelap gradiennya terang).
- `ring` Tailwind = `--clr-focus`. Meta `theme-color` & manifest: `app/theme/meta-colors.ts` (terang #047857, gelap #0f1117).
- Halaman publik yang belum punya mode gelap (landing, tentang, FAQ, keranjang, video) diberi kelas **`bc-light`** di akarnya
  (dan pembungkus `PageNavbar` bila di luar `<main>`): token terang dipaksa di dalamnya walau `html.dark`.
- **Merah hanya untuk bahaya/galat**: `destructive`, `bc-danger`, Keluar, hapus, pesan error. Merah-merek lama
  (`from-red-600 to-red-700`, `text-red-600` sebagai aksen) → `bg-primary` / `text-primary` saat area disentuh.

---

## 2. Radius, bayangan, jarak, tipografi

### Radius (konsisten — jangan mengarang nilai baru)

| Elemen | Radius |
|---|---|
| Hero / pratinjau besar | `28px`–`30px` |
| Kartu (`--jp-r-card`) | `24px` |
| Tile video, kartu dalam, sheet | `20px`–`22px` |
| Tombol kontrol bulat-kotak | `18px` |
| Input, select (`--jp-r-ctl`) | `16px` |
| Chip ikon 44×44 | `14px` |
| Tombol utama, ghost, chip, badge | `999px` (pil) |

### Bayangan & kedalaman (pengganti abu-abu datar)

```css
--jp-depth: 0 1px 0 color-mix(in srgb, var(--clr-text) 6%, transparent) inset,
            0 14px 32px -22px color-mix(in srgb, var(--clr-bg) 95%, transparent);
```

- Kartu = gradien halus `surface-2 → surface` + garis `--jp-line` + `--jp-depth`.
- Aksen: garis gradien 3px di tepi atas kartu aksi (`::before`, `opacity .85`).
- Glow berwarna (mis. `0 8px 22px -10px color-mix(violet 70%, transparent)`) **hanya** di `@media (hover: hover) and (pointer: fine)`.
- Bingkai gradien tanpa gambar: `background: linear-gradient(surface-2, surface-2) padding-box, var(--jp-grad) border-box; border: 1.5px solid transparent;`

### Jarak

- Skala 4px. Yang dipakai: 4, 6, 8, 10, 12, 14, 16, 18, 20, 24.
- Halaman: `px-4` (16px) di HP, `sm:px-6` (24px), maks `max-w-3xl` (beranda) / `max-w-5xl` (lobby).
- Antar-blok: `gap-4` HP, `sm:gap-5`. Isi kartu: `16–22px`.
- Selalu hormati `env(safe-area-inset-*)` di header/dock.

### Tipografi (font: Inter, `font-sans`)

| Peran | Ukuran / tebal |
|---|---|
| Judul hero | `clamp(28px, 7.4vw, 40px)`, `900`, `letter-spacing -.02em`, `line-height 1.05` |
| Judul halaman | `24–30px`, `800` |
| Judul kartu | `16px`, `700` |
| Isi | `14–16px`, `400–600` (input **min 16px** agar iOS tidak zoom) |
| Keterangan | `12px`, warna `--clr-text-3` |
| Label seksi | `11–12px`, `800`, huruf besar, `letter-spacing .12–.14em`, `--clr-text-3` |
| Badge | `10–11px`, `800`, huruf besar, `letter-spacing .04–.06em` |

---

## 3. Tombol: state & mikro-interaksi

| State | Tampilan |
|---|---|
| Idle | Tint kaca (1.3), garis tipis, garis sorot dalam 1px |
| Hover (mouse) | Tint lebih kuat + garis teal; angkat `translateY(-2px)` |
| Tekan | `scale(.92)` dengan pegas `cubic-bezier(.34, 1.56, .64, 1)`, durasi `.08s` |
| Aktif / on (`data-on="true"`) | Gradien merek, ikon gelap; label di bawahnya berwarna teal |
| Mati (`data-off="true"`) | Coral (1.3); label coral |
| Tangan (`data-tone="hand"`) | Gradien kuning; label kuning |
| Bahaya (`data-variant="leave"`) | Merah Keluar, lebar otomatis dengan teks "Keluar" |
| Fokus keyboard | `outline: 2–3px solid var(--clr-accent); outline-offset: 3px` — **jangan dihapus** |
| Nonaktif | `opacity .55`, tanpa transform |

- Transisi warna `.18s var(--jp-ease)`; transform `.2–.22s` pegas.
- State dikomunikasikan lewat atribut (`data-on`, `data-off`, `aria-pressed`), bukan class acak.
- Ukuran sentuh minimum **44×44px** (kontrol JUMPA `clamp(46px, 12.8vw, 54px)`; CTA `min-height: 56px`; ghost `48px`).
- Tombol ikon wajib punya `aria-label` berbahasa Indonesia **dan** label teks di bawahnya bila di dock.
- `@media (prefers-reduced-motion: reduce)`: matikan transform & denyut.

Jenis tombol:
- **Utama** (`.jumpa-primary`): pil 56px, gradien teal, satu per layar.
- **Ghost** (`.jumpa-ghost`): pil 48px, transparan, garis `--jp-line-strong`.
- **Premium** (`.jumpa-cta-premium`): pil berbingkai gradien kuning→teal→violet, teks kuning.
- **Chip** (`.jumpa-chip`): pil 36px, teal di atas `--clr-accent-soft`.

---

## 4. Komponen

### Kartu
- `.jumpa-card`: radius 24px, gradien `surface-2 → surface`, garis `--jp-line`, `--jp-depth`.
- Kartu aksi: chip ikon 44×44 (gradien per jenis: guru = violet→biru, kelas = merek, murid = kuning→teal) + judul 16px + keterangan 12px satu baris.
- Kartu yang bisa diklik: hover angkat 2px + garis teal (mouse saja).

### Badge
- Pil 10–11px huruf besar. Peran: Guru = teal/`accent-soft`, Murid = violet/`violet-soft`, Pemandu = kuning/`warning-soft`.
- Paket: Gratis = abu, Premium = kuning dengan ikon mahkota (lucide `Crown`).
- Status hidup: "Berlangsung" + titik berdenyut.
- Badge **tidak boleh** menekan nama: nama `min-width: 0; truncate`, badge `flex-shrink: 0`.

### Input & select
- Radius 16px, latar `color-mix(bg 55%, surface)`, garis `--jp-line-strong`, font 16px.
- Fokus: garis `color-mix(accent 70%, transparent)` + cincin `0 0 0 3px color-mix(accent 18%, transparent)`.
- Opsi select **pendek** ("Tanpa komunitas", bukan "Tanpa komunitas (undang manual)").
- Input gabungan (kode + tombol) dalam satu kapsul radius 20px; input `flex: 1 1 5rem; min-width: 0` agar tombol tetap sebaris di 360px.
- Error di bawah input, `role="alert"`, satu kalimat ("Kode tidak dikenali.").

### Empty state
- Kartu terpusat: ikon lucide 26px di kotak 56×56 radius 18px berbingkai gradien → judul 14px tebal → satu kalimat keterangan.
- Contoh: "Belum ada ruang aktif" / "Ruang yang bisa kamu masuki muncul di sini."
- Bila ada aksi berikutnya yang jelas, beri satu tombol (mis. "Salin" pada "Menunggu peserta lain").

### Lembar (sheet) & modal
- Sheet dari bawah di HP, panel samping di laptop. Tombol tutup ikon X dengan `aria-label="Tutup …"`.
- Tombol di dalam modal ditumpuk vertikal (tidak meluap di 360px).

### Avatar
- Inisial di lingkaran gradien (4 nada dari `avatarTone()`); tumpukan maks 4 + "+N".
- Untuk daftar yang dilihat murid: **hanya inisial**, tanpa nama lengkap.

---

## 5. Aturan mobile

1. **Harus berfungsi di 360px** (uji 360, 430, dan 1440). Tidak ada scroll horizontal.
2. **Tidak ada teks terpotong** yang menyembunyikan arti ("Ruan…"). Pendekkan teks, atau izinkan dua baris (`-webkit-line-clamp: 2`). Elipsis hanya untuk data pengguna yang panjang (nama, judul, nama perangkat).
3. **Tanpa blur berat**: `backdrop-filter` dimatikan di `@media (max-width: 767px), (pointer: coarse)`; ganti latar padat `color-mix(surface-2 96%, transparent)`. Tidak ada `filter: blur()` di atas video.
4. **Tanpa gambar besar** untuk dekorasi — pakai gradien CSS dan ikon lucide.
5. **Animasi terbatas**: hanya `transform`/`opacity`; masuk `.32s` (`jumpa-in-up`, geser 12px); stagger maks 50ms per blok; denyut hanya untuk status hidup/bicara. Hover-lift dimatikan di layar sentuh. Hormati `prefers-reduced-motion`.
6. Bayangan glow besar dimatikan di HP (`box-shadow: none` pada CTA).
7. Target sentuh ≥ 44px, jarak antar-target ≥ 8px.
8. Header di layar ≤ 400px: sembunyikan info sekunder (mis. "dari BahasaCerdas", sinyal bagus) sebelum memotong judul.

---

## 6. Aturan teks (copy)

- **Hanya Bahasa Indonesia** di UI: label, tombol, toast, `aria-label`, `title`, `placeholder`, pesan error API yang tampil ke pengguna.
  Pengecualian: nama merek **JUMPA**, **BahasaCerdas**, **KelasKu**, **MGMP**, kata **Premium**, dan "(HD)" sebagai keterangan dalam kurung.
- **Pendek dan tepat**: satu gagasan per kalimat; tombol 1–3 kata berupa kata kerja ("Gabung", "Mulai ruang guru", "Salin").
- **Jangan mengulang informasi** yang sudah tampil di layar yang sama (mis. batas paket cukup sekali).
- Sapaan "kamu", nada ramah dan tenang. Huruf kapital hanya di awal kalimat (kecuali label seksi/badge yang diberi `text-transform`).
- **Tanpa emoji sebagai ikon** — pakai `lucide-react` (`npm run test:no-emoji-icons`).
- Angka & satuan: "30 orang · 45 menit", "17 mnt", "1 jam 5 mnt". Pemisah info: " · ".

### Glosarium (wajib)

| Jangan | Pakai |
|---|---|
| Host | **Pemandu** |
| Co-host | **Wakil pemandu** |
| Live | **Berlangsung** |
| Speaker (perangkat) | **Pengeras suara** |
| HD | **Jernih** (keterangan: "Paling tajam (HD)") |
| Auto | **Otomatis** |
| Low / Data saver | **Hemat Data** |
| Audio only | **Mode audio saja** |
| Noise suppression | **Peredam bising** |
| Settings | **Pengaturan** |
| Leave | **Keluar** |
| Join | **Gabung** |
| Share screen | **Layar** / "Bagikan layar" |
| Raise hand | **Tangan** / "Angkat tangan" |
| More | **Lainnya** |
| Chat | **Obrolan** |
| Participants | **Peserta** |
| Mic / Camera off | **Mik mati** / **Kamera mati** |
| Copy link | **Salin tautan** |
| Free | **Gratis** |
| Trial | "Premium (coba)" |
| Coming soon | **Segera hadir** |
| Not found | **Tidak ditemukan** |
| by BahasaCerdas | **dari BahasaCerdas** |
| Dashboard | **Dasbor** |

Untuk modul JUMPA, `npm run test:jumpa-no-english` (cabang `feat/jumpa-phase3`) memindai kata Inggris umum. Pola yang sama boleh diperluas ke modul lain.

---

## 7. Aksesibilitas (WCAG 2.1 AA)

Batas: **4.5:1** untuk teks normal, **3:1** untuk teks besar (≥ 24px atau ≥ 18.7px tebal) dan ikon/garis UI.

Rasio yang sudah dihitung (mode gelap, yang dipakai JUMPA):

| Pasangan | Rasio | Status |
|---|---|---|
| `--clr-text` di `--clr-bg` | 16.87:1 | AAA |
| `--clr-text` di `--clr-surface` | 15.55:1 | AAA |
| `--clr-text-2` di `--clr-surface` | 7.72:1 | AAA |
| `--clr-text-3` di `--clr-surface` / `surface-2` | 5.62 / 5.20:1 | AA |
| `--clr-accent` di `--clr-surface` | 9.05:1 | AAA |
| `--clr-warning` di `--clr-surface-2` | 9.64:1 | AAA |
| `--clr-violet` di `--clr-surface` | 6.39:1 | AA |
| `--clr-danger` di `--clr-surface` | 6.29:1 | AA |
| Ikon `--clr-bg` di teal / biru / violet (gradien aktif) | 9.82 / 10.46 / 6.93:1 | AA di seluruh gradien |
| Ikon `--clr-bg` di kuning (tangan) | 11.30:1 | AAA |
| Teks `--clr-bg` di merah Keluar | 6.82:1 | AA |
| Ikon coral di latar "mati" | 4.96:1 | AA |
| Teks di tombol idle | 11.13:1 | AAA |

Mode terang — **perhatian**:

| Pasangan | Rasio | Aturan |
|---|---|---|
| `--clr-accent` `#059669` di putih | 3.77:1 | Hanya ikon/teks besar. Teks normal pakai `--clr-accent-strong` `#047857` (5.48:1). |
| Teks putih di `#059669` | ≈3.45:1 | Tombol terang: latar `--clr-accent-strong` + teks putih (5.48:1). |
| `--clr-warning` `#d97706` di putih | 3.19:1 | Teks pakai `--clr-warning-strong` `#b45309` (5.02:1). |
| `--clr-text-3` di putih | 4.76:1 | AA |
| `--clr-danger` di putih | 6.47:1 | AA |
| `--clr-violet` / `--clr-info` di putih | 5.70 / 5.17:1 | AA |

Aturan lain:
- Fokus selalu terlihat (`:focus-visible` outline teal).
- Status tidak hanya lewat warna: ikon berubah (Mic → MicOff) dan label berubah ("Mik mati").
- `aria-pressed` untuk toggle, `aria-expanded`/`aria-haspopup` untuk menu, `role="alert"` untuk error, `role="status"` untuk info.
- Ikon dekoratif `aria-hidden`; elemen visual bermakna (titik "Berlangsung", tumpukan avatar) diberi `role="img"` + `aria-label`.
- Input selalu punya label (boleh `sr-only`).

---

## 8. Lakukan / Jangan

**Lakukan**
- Pakai token `--clr-*` dan pola `color-mix()`; gradien merek untuk aktif.
- Kedalaman lewat gradien halus + garis 1px + `--jp-depth`.
- Satu tombol utama per layar; aksi lain ghost/chip.
- Teks pendek, Indonesia, sesuai glosarium.
- Uji di 360px, 430px, 1440px dan dengan keyboard.
- Ikon dari `lucide-react`, ukuran 16–22px.
- Matikan efek mahal di HP (blur, glow, hover-lift).

**Jangan**
- Menulis hex/rgb langsung, atau warna Tailwind mentah (`bg-gray-800`, `text-red-500`) di komponen baru.
- `backdrop-filter`/`filter: blur()` di HP atau di atas video.
- Emoji sebagai ikon; gambar besar untuk dekorasi.
- Kata Inggris di UI ("Live", "Host", "Settings", "Loading…").
- Mengulang info yang sama dua kali di satu layar.
- Memotong teks penting dengan elipsis; select dengan opsi panjang.
- Merah pekat selain untuk Keluar/hapus; kuning selain untuk tangan/Premium/waktu.
- Animasi `width/height/top/left`, loop animasi yang bukan status hidup.
- Menghapus outline fokus.
- Mengubah harga atau batas paket sebagai bagian dari perubahan tampilan.

---

## 9. Checklist PR (UI)

Salin ke deskripsi PR:

```
- [ ] Tanpa hex/rgb baru; semua warna dari --clr-* / bc-* (guard:warna lulus, audit:theme-hardcoded tidak bertambah)
- [ ] Memakai primitif components/ui (Button, Card, Badge, Field, Modal, …) alih-alih versi lokal
- [ ] Radius, bayangan, jarak sesuai Panduan Desain §2
- [ ] State tombol lengkap: idle, hover, tekan, aktif/mati, fokus, nonaktif
- [ ] Berfungsi di 360px tanpa scroll horizontal & tanpa teks terpotong
- [ ] Tanpa blur berat / gambar besar; animasi hanya transform/opacity; reduced-motion dihormati
- [ ] Semua teks Bahasa Indonesia sesuai glosarium; pendek; tidak mengulang info
- [ ] Tanpa emoji sebagai ikon (test:no-emoji-icons tidak bertambah)
- [ ] Kontras AA (≥ 4.5:1 teks, ≥ 3:1 ikon/teks besar); aria-label & fokus terlihat
- [ ] Screenshot 360 / 430 / 1440 dilampirkan
```
