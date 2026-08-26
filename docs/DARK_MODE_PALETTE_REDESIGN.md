# DARK MODE PALET REDESIGN — ARENA GAME COMPONENTS

## Executive Summary

Seluruh 10 game Arena di `components/game/` telah diredesain dark mode palette-nya dari flat/uniform menjadi **per-game identity** dengan warna aksen unik, gradient treatment, dan colored shadows. Setiap game sekarang punya karakter visual sendiri.

---

## Perubahan Prinsip

### SEBELUM (flat)
- Semua game: `dark:bg-[#16122A]` card, `dark:from-[#0F0D21] dark:to-[#181330]` background
- Shadow: `#161B3A` (hitam navy) untuk semua game
- Hasil: monoton, semua game terasa sama

### SESUDAH (per-game identity)
- Setiap game punya gradient root, card bg, shadow color, dan muted text yang unik
- Main screens dapat gradient treatment (`dark:bg-gradient-to-br`)
- Shadows menggunakan warna aksen game, bukan hitam generik
- Hasil: setiap game punya karakter visual sendiri

---

## Palet Per Game

### 1. TTSpage.tsx — Teka-Teki Silang
**Aksen: Indigo-Purple** (puzzle/focus)

| Elemen | Light | Dark |
|--------|-------|------|
| Root gradient | `#FFF6E0` → `#FFE2C7` | `#0B0A1A` → `#151030` |
| Card bg | `bg-white` | `#1A1535` (gradient → `#221C48`) |
| Active tile | — | `#2D2060` |
| Error bg | `#FFE2E2` | `#4A1825` |
| Shadow | `#161B3A` | `#4338CA` (indigo-600) |
| Muted text | — | `#3D3866` |
| Disabled text | `slate-400` | `#4A4570` |

### 2. TebakKata.tsx
**Aksen: Teal** (guessing game)

| Elemen | Dark |
|--------|------|
| Root gradient | `#071214` → `#0D1F24` |
| Card bg | `#0E2028` (gradient → `#162C34`) |
| Shadow | `#0D9488` (teal-600) |
| Muted text | `#1A4A44` |

### 3. SusunKata.tsx
**Aksen: Amber-Copper** (word building)

| Elemen | Dark |
|--------|------|
| Root gradient | `#12100A` → `#1C1810` |
| Card bg | `#1E1A14` (gradient → `#28241E`) |
| Active tile | `#2E2618` |
| Shadow | `#D97706` (amber-600) |
| Muted text | `#4A3A18` |

### 4. BenarSalah.tsx
**Aksen: Emerald-Jade** (correct/incorrect)

| Elemen | Dark |
|--------|------|
| Root gradient | `#071510` → `#0D2018` |
| Card bg | `#0E2820` (gradient → `#16342C`) |
| Shadow | `#059669` (emerald-600) |
| Muted text | `#1A4A38` |

### 5. LariKata.tsx
**Aksen: Orange-Red** (speed/racing)

| Elemen | Dark |
|--------|------|
| Root gradient | `#150C06` → `#201008` |
| Card bg | `#221810` (gradient → `#2E2218`) |
| Active tile | `#2E2015` |
| Shadow | `#EA580C` (orange-600) |
| Muted text | `#4A2A10` |

### 6. MenaraCerdas.tsx
**Aksen: Gold-Amber** (tower climbing)

| Elemen | Dark |
|--------|------|
| Root gradient | `#141208` → `#1C1A0C` |
| Card bg | `#1E1C14` (gradient → `#282620`) |
| Shadow | `#CA8A04` (yellow-600/gold) |
| Muted text | `#4A4018` |

### 7. KuisTempurSolo.tsx
**Aksen: Crimson-Red** (battle)

| Elemen | Dark |
|--------|------|
| Root gradient | `#150A0A` → `#200E0E` |
| Card bg | `#241218` (gradient → `#301C24`) |
| Active tile | `#2E1A20` |
| Shadow | `#DC2626` (red-600) |
| Muted text | `#4A1820` |

### 8. IramaKata.tsx
**Aksen: Pink-Magenta** (music/rhythm)

| Elemen | Dark |
|--------|------|
| Root gradient | `#140A12` → `#1E0E1A` |
| Card bg | `#221420` (gradient → `#2C1E2A`) |
| Shadow | `#DB2777` (pink-600) |
| Muted text | `#4A1838` |

### 9. ZelbyDash.tsx
**Aksen: Cyan-Teal** (speed/dash)

| Elemen | Dark |
|--------|------|
| Root gradient | `#061214` → `#0A1C20` |
| Card bg | `#0C2228` (gradient → `#142E34`) |
| Shadow | `#0891B2` (cyan-600) |
| Muted text | `#183A44` |

### 10. GameLobby.tsx
**Aksen: Deep Indigo** (hub)

| Elemen | Dark |
|--------|------|
| Root gradient | `#0D0C1A` → `#161430` |
| Card bg | `#1A1535` (gradient → `#1E1A38`) |
| Elevated card | `#221E42` (gradient → `#2C2650`) |
| Shadow | `#4338CA` (indigo-600) |
| Muted text | `#9090BE` |
| Light text | `#C4C1E8` |

---

## Prinsip Desain yang Diterapkan

### 1. Elevation with Color
Card/panel menggunakan gradient (`dark:bg-gradient-to-br`) bukan flat solid color. Setiap layer (background → card → tile aktif) punya progresi warna yang jelas.

### 2. Per-Game Identity
Setiap game punya shadow color yang unik:
- TTSpage → indigo `#4338CA`
- TebakKata → teal `#0D9488`
- SusunKata → amber `#D97706`
- BenarSalah → emerald `#059669`
- LariKata → orange `#EA580C`
- MenaraCerdas → gold `#CA8A04`
- KuisTempurSolo → red `#DC2626`
- IramaKata → pink `#DB2777`
- ZelbyDash → cyan `#0891B2`

### 3. No Pure Black
Tidak ada `#000000` yang digunakan. Semua background memiliki "temperature" — ungu/biru/hijau/merah tua sesuai tema game.

### 4. Warm Muted Text
`dark:text-slate-600` diganti dengan warm muted text yang sesuai palet game (misal `#3D3866` untuk TTSpage, `#1A4A44` untuk TebakKata).

### 5. Gradient on Main Screens
Main game screens menggunakan `dark:bg-gradient-to-br` untuk kesan depth dan premium.

---

## File yang Diubah

| File | Perubahan |
|------|-----------|
| `components/game/TTSpage.tsx` | +106/-53 — root gradient, 32 card bg, shadow, muted text |
| `components/game/TebakKata.tsx` | +56/-28 — root gradient, 13 card bg, shadow, muted text |
| `components/game/SusunKata.tsx` | +60/-30 — root gradient, 14 card bg, 1 active tile, shadow |
| `components/game/BenarSalah.tsx` | +46/-23 — root gradient, 8 card bg, shadow, muted text |
| `components/game/GameLobby.tsx` | +16/-8 — root gradient, 3 card bg, 1 elevated, shadow, text |
| `components/game/LariKata.tsx` | +46/-23 — root gradient, 8 card bg, 1 active tile, shadow |
| `components/game/MenaraCerdas.tsx` | +44/-22 — root gradient, 6 card bg, shadow, muted text |
| `components/game/KuisTempurSolo.tsx` | +56/-28 — root gradient, 14 card bg, 1 active tile, shadow |
| `components/game/IramaKata.tsx` | +58/-29 — root gradient, 12 card bg, shadow, muted text |
| `components/game/ZelbyDash.tsx` | +36/-18 — root gradient, 8 card bg, shadow, muted text |

**Total: 10 files, 262 insertions, 262 deletions**

---

## TypeScript Check

✅ `npx tsc --noEmit` — **0 errors**

---

## Apa yang TIDAK Diubah

- Logic gameplay — tidak ada perubahan
- Struktur komponen — tidak ada perubahan
- Fitur — tidak ada perubahan
- Warna status (benar/salah/warning) — tetap vibrant di dark mode
- Warna aksen gameplay (timer, combo, streak) — tetap cerah
- Canvas rendering (KuisTempurSolo, IramaKata, ZelbyDash) — tidak diubah

---

## Rekomendasi untuk Review

1. **Visual review** — Jalankan dev server dan toggle dark mode di setiap game untuk melihat perbedaan visual secara langsung
2. **Canvas games** — KuisTempurSolo, IramaKata, ZelbyDash menggunakan canvas API untuk gameplay. Warna canvas tidak diubah (sudah self-contained gelap). Review apakah canvas colors perlu penyesuaian.
3. **Gradient treatment** — Gradient pada main screens sudah ditambahkan. Review apakah gradient-nya terlalu subtle atau perlu lebih pronounced.

---

## Catatan Khusus

1. **GameLobby** — Tidak punya screen class prefix (seperti `tts-screen`), jadi gradient treatment tidak ditambahkan ke main screen. Hanya card backgrounds yang di-upgrade.
2. **Canvas games** — Gameplay rendering menggunakan canvas API dengan `fillStyle`/`strokeStyle`. Warna-warna ini TIDAK diubah karena sudah self-contained. Hanya UI DOM di sekitarnya yang di-upgrade.
3. **Status colors** — Warna benar (hijau), salah (merah), warning (kuning/orange) TIDAK diubah karena sudah vibrant di dark mode.
