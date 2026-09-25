# Guru Visual System V5 — Audit Menyeluruh

Tanggal: 2026-09-26

## Sasaran

Audit ini mencakup seluruh destination yang tampil di navigasi Dasbor Guru dan komponen bersama yang dipakai lintas halaman. Fokus utama adalah menghapus pola visual lama yang membuat light mode terlihat pucat/washed-out, khususnya gradient warna yang memudar ke putih, sekaligus membangun identitas Guru yang konsisten: biru–navy, modular, bersih, dan tetap memiliki aksen fungsi.

## Destination yang diaudit

- Beranda
- Pusat Literasi
- Alat Ajar
  - Bank Soal
  - Perangkat Ajar
  - Materi Ajar
  - Buku Ajar
  - Media Pembelajaran
- Kelasku
- Gim
- Toko Karya
- Penghasilan
- Simulasi & Tes
  - Simulasi UKBI
  - Simulasi TKA
  - Laporan Simulasi
  - BIGT
- Alat AI
- AI BC
- Komunitas
- Kalender
- Profil

## Temuan utama

1. Sebagian halaman lama masih memakai emerald/green/teal sebagai identitas utama Guru.
2. Beberapa card memakai gradient dengan `via-white` atau `to-white`, sehingga kehilangan kontras di light mode.
3. Hero antar-menu tidak memiliki bahasa visual yang konsisten.
4. Beberapa CTA/focus ring masih memakai emerald/violet legacy.
5. Card generik belum mempunyai struktur border/elevation yang cukup kuat untuk light mode.
6. Beberapa shared card (misi, leaderboard, next action, trial, command center) masih menggunakan pale gradient legacy.

## Sistem V5

### Hero
Semua hero destination Guru menggunakan keluarga:
- navy gelap sebagai anchor;
- royal blue sebagai primary;
- sky blue sebagai highlight;
- tanpa fade ke putih.

### Surface
Light mode:
- card dasar tetap putih agar bersih;
- border biru tipis;
- shadow biru halus;
- pale gradient ke putih dihapus.

Dark mode:
- surface deep navy;
- border blue-opacity;
- glow/shadow minimal.

### Aksen
- Biru = role identity / navigasi / primary action.
- Hijau = tetap tersedia untuk status success.
- Amber/orange = warning/reward.
- Rose/red = danger.
- Violet = boleh digunakan sebagai aksen kategori, bukan identitas shell utama.

## Implementasi

Perubahan V5 memakai dua lapis:

1. **Global teacher shell hardening** di `app/globals.css`
   - menangkap legacy rounded gradient `to-white` / `via-white`;
   - memperkuat card white surfaces;
   - memigrasikan legacy emerald/teal hero ke blue family;
   - menyelaraskan focus state dan primary teacher controls.

2. **Page/component migration**
   - Pusat Literasi
   - Perangkat Ajar
   - Simulasi UKBI/TKA
   - Bank Soal
   - Gim
   - Buku Ajar
   - Toko Karya
   - Komunitas
   - Profil
   - Materi Ajar
   - Media Pembelajaran
   - Laporan Simulasi
   - Kalender
   - BIGT
   - AI BC
   - Alat AI
   - Mission/Level/Next Action cards
   - Leaderboard
   - Trial cards
   - Teacher Command Center
   - Analytics
   - Komisi primary action

## Guardrail

- Tidak mengubah scoring, kelas, pembayaran, entitlement, atau data flow.
- Tidak mengubah warna semantik success/warning/danger menjadi biru.
- Student shell tetap menggunakan identitasnya sendiri.
- Founder/Admin shell tidak ikut terpengaruh oleh selector V5.
