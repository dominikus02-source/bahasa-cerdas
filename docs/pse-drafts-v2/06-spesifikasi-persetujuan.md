# Spesifikasi Persetujuan Orang Tua/Wali
**Status: SPESIFIKASI REVISI 0.2 — BELUM DIIMPLEMENTASIKAN**  
**Tanggal:** 11 Oktober 2026  
**Perlu tinjauan ahli hukum sebelum dibangun.**

## Dasar yang diperiksa
- UU 27/2022 Pasal 4: data anak = data spesifik.
- UU 27/2022 Pasal 20–21: dasar pemrosesan dan informasi sebelum persetujuan.
- UU 27/2022 Pasal 24: bukti persetujuan.
- UU 27/2022 Pasal 25: persetujuan orang tua/wali untuk data anak.
- PP 17/2025 Pasal 3: info batas usia, verifikasi, pelaporan.
- PP 17/2025 Pasal 9: persetujuan sebelum anak memakai layanan; jalur 17 tahun; penghapusan jika ditolak.

## Bukan satu aturan untuk semua
- Pengguna dewasa: tidak otomatis memakai alur orang tua.
- Anak: alur orang tua/wali.
- Usia mendekati 17: mungkin jalur berbeda menurut Pasal 9 ayat (2).  
Ambang final: **[PERLU KONFIRMASI FOUNDER / AHLI HUKUM]**.

## Alur yang dapat diuji
1. Pendaftaran mengumpulkan tanggal lahir atau konfirmasi usia.
2. Sistem menentukan jalur: dewasa, anak, atau 17+.
3. Jalur anak: tahan akses penuh sampai persetujuan wali tercatat.
4. Catat: identitas wali, waktu, versi teks, status.
5. Setelah tercatat, buka akses.
6. Penolakan/penarikan: tahan akses; tangani penghapusan sesuai keputusan hukum.

## Larangan
Tombol visual saja, bypass oleh anak, bukti hanya di browser.

## Perubahan kode (setelah persetujuan Founder)
Field usia, tabel bukti persetujuan, guard akses, halaman `/kontak`. Tidak mengubah produksi sebelum disetujui.
