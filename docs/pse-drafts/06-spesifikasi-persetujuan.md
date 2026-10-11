# Spesifikasi Persetujuan Orang Tua/Wali
**Status: SPESIFIKASI — BELUM DIIMPLEMENTASIKAN**  
**Versi:** 0.1 — 11 Oktober 2026

## Dasar hukum
- UU 27/2022 Pasal 4: data anak adalah data pribadi spesifik.
- UU 27/2022 Pasal 25: pemrosesan data anak wajib mendapat persetujuan orang tua/wali.
- PP 17/2025: tata kelola SE dalam pelindungan anak (info batas usia, verifikasi, pelaporan).

## Kapan diperlukan
Persetujuan diperlukan sebelum pemrosesan data anak.  
**[PERLU KONFIRMASI AHLI HUKUM / FOUNDER]**: ambang usia dan apakah semua murid atau hanya di bawah usia tertentu.

## Alur (yang dapat diuji)
1. Pendaftaran murid mengumpulkan tanggal lahir atau konfirmasi usia.
2. Jika di bawah ambang, sistem menahan akses penuh.
3. Orang tua/wali menerima tautan atau mengisi persetujuan.
4. Sistem mencatat: siapa, kapan, versi pemberitahuan, status.
5. Setelah tercatat, akses dibuka.
6. Penarikan: akses fitur yang memproses data ditutup; permintaan penghapusan ditangani.

## Yang tidak boleh
- Tombol persetujuan yang hanya visual dan tidak tercatat.
- Anak dapat melewati penahanan akses.
- Menyimpan bukti hanya di browser.

## Perubahan kode minimal (setelah persetujuan)
- Field usia / tanggal lahir pada pendaftaran.
- Tabel atau field bukti persetujuan (versi, waktu, identitas wali).
- Guard akses di middleware atau layout murid.
- Halaman `/kontak` publik.
- Tidak mengubah produksi sebelum disetujui.
