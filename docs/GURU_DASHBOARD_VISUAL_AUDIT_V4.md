# Guru Dashboard Visual Audit V4 — Strong Blue Identity

Tanggal audit: 26 September 2026

## Tujuan

Menyatukan identitas visual seluruh menu utama Dasbor Guru BahasaCerdas. Temuan utama dari production adalah banyak legacy gradient hijau/teal yang dipetakan ke blue theme lewat compatibility layer menghasilkan kartu/hero biru pucat menuju putih pada light mode. Dampaknya: hierarchy lemah, brand guru tidak terasa kuat, dan antarhalaman terlihat seperti sistem visual yang berbeda.

## Prinsip visual yang dikunci

1. **Primary teacher surface:** navy → royal blue → electric blue, tanpa fade ke putih.
2. **Content card:** solid surface (putih pada light, navy surface pada dark), bukan gradient putih-biru.
3. **Blue = role identity.** Hijau hanya untuk semantic success, amber untuk warning/reward, red untuk danger, violet untuk badge/content taxonomy bila memang bermakna.
4. **Light/dark memakai hierarchy yang sama.** Dark bukan sekadar inverse; hero lebih dalam, content surface tetap terpisah jelas.
5. **Tidak mengubah capability/data flow.** Perubahan ini visual-only kecuali class/refactor presentasional.

## Audit menu utama

| Menu | Temuan | Treatment V4 |
|---|---|---|
| Beranda | Sudah memakai home V3 dengan hero navy-blue kuat | Dipertahankan; V4 global menjaga card compatibility |
| Pusat Literasi | Hero legacy emerald→teal menjadi washed blue di light mode | Hero diganti explicit `guru-hero-strong`; heading/accent dibirukan |
| Bank Soal | Komponen utama sudah clean; tidak memakai hero white-blue legacy | Tetap; V4 border/surface berlaku global |
| Perangkat Ajar | Header terlalu datar, violet-heavy, tidak punya role identity | Hero baru strong blue, tab aktif biru, cards memakai `guru-surface-card` |
| Materi Ajar | Gradient dipakai untuk semantic file type (PDF/PPT/DOC), bukan role hero | Dipertahankan; tidak dipaksa menjadi blue supaya arti file type tetap terbaca |
| Buku Ajar | Legacy emerald/teal pada icon | Accent diganti teacher blue |
| Media Pembelajaran | Wrapper Video/Artikel; tidak perlu hero gradient baru | Primary controls mengikuti V4/global teacher blue |
| Kelasku | Sudah memakai classroom token system | Teacher token tetap blue; student preview tetap violet |
| Gim | Hero legacy emerald/green/teal menghasilkan pale gradient | Hero explicit strong blue; hero labels memakai token khusus |
| Toko Karya | Banyak gradient emerald soft pada header/card/action | Soft gradient dihapus, CTA/icon jadi blue, saldo card strong hero |
| Penghasilan | Sudah memakai semantic `bg-card`/border system | Dipertahankan |
| Simulasi UKBI | Hero legacy emerald/teal/cyan | Hero strong blue |
| Simulasi TKA | Hero rose/fuchsia memutus teacher identity | Hero strong blue; rose hanya boleh tetap sebagai accent track/content |
| Laporan Simulasi | Active controls emerald/teal | Diganti blue role controls |
| BIGT | Hero guru emerald/teal | Guru hero strong blue; murid tetap violet |
| Alat AI | Header accent emerald/green | Diganti blue |
| AI BC | Bubble/send composer emerald/green | Diganti blue; answer surface tetap neutral |
| Komunitas | Fallback avatar/identity emerald | Diganti blue |
| Kalender/Olimpiade | Sudah dominan blue/neutral | Dipertahankan |
| Profil | Fallback avatar legacy green | Diganti blue |

## Compatibility layer lintas halaman

`app/globals.css` sekarang memiliki **GURU VISUAL SYSTEM V4 — STRONG BLUE** di scope `.bc-guru-shell .bc-guru`.

Guardrail:
- legacy strong gradient dari emerald/green/teal/blue/cyan + white text → strong teacher hero gradient;
- soft gradient seperti blue/sky/cyan/emerald/teal menuju white/blue-50 atau via white → solid content surface;
- legacy soft emerald↔teal cards → solid content surface;
- primary green teacher actions → role blue;
- card border light/dark diseragamkan ke blue-neutral edge;
- murid/admin tidak tersentuh.

## Yang sengaja tidak diseragamkan menjadi biru

Warna yang menyampaikan arti tetap dipertahankan:
- red/rose = danger/error atau domain content tertentu;
- amber/orange = warning/reward;
- violet = badge/content taxonomy;
- file-type preview Materi Ajar = warna tipe dokumen;
- success state yang benar-benar semantic tetap hijau.

Ini mencegah dashboard berubah menjadi satu warna tanpa hierarchy.

## QA target

- Tidak ada lagi hero utama guru yang fade ke putih pada light mode.
- Card informasi tidak memakai gradient putih-biru sebagai surface utama.
- Semua menu utama terasa satu keluarga visual.
- Light mode tetap kontras; dark mode tetap dalam tanpa kehilangan batas card.
- Tidak mengubah API, data, scoring, pembayaran, kelas, konten, atau permission.
