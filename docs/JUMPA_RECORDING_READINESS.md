# JUMPA — Kesiapan Perekaman Webinar

Status: BELUM DIAKTIFKAN. Dokumen ini menetapkan rancangan dan gerbang sebelum perekaman dapat digunakan. Tidak ada perekaman produksi yang dinyalakan oleh perubahan ini.

## Kondisi saat ini

- Paket Premium masih menyatakan `features.recording: false`.
- Server JUMPA memakai LiveKit Server `v1.13.10`.
- Susunan VPS saat ini belum memuat layanan LiveKit Egress.
- Belum ada konfigurasi penyimpanan objek khusus rekaman, kebijakan retensi, maupun alur pemutaran rekaman.
- Karena itu, mengaktifkan tombol atau mengubah nilai fitur menjadi `true` saat ini akan menghasilkan janji produk yang belum dapat dipenuhi.

## Rancangan aman

1. **Layanan Egress terpisah** — tambahkan kontainer Egress dengan versi yang kompatibel dengan LiveKit Server, konfigurasi Redis yang sama, dan API key/secret melalui berkas lingkungan rahasia. Jangan menjalankan Egress di proses web.
2. **Penyimpanan objek privat** — gunakan penyedia S3-compatible dengan bucket privat. Kredensial hanya tersedia pada kontainer Egress dan layanan server yang membutuhkan akses. Jangan menyimpan berkas rekaman di filesystem kontainer yang sementara.
3. **Kontrol server** — endpoint mulai/berhenti rekaman hanya untuk HOST guru pada webinar yang masih aktif dan memiliki hak Premium. Validasi ulang peran, kepemilikan ruang, status, dan paket di server; jangan percaya parameter klien.
4. **Siklus hidup** — simpan identitas rekaman dan status transisi secara idempoten. Tangani webhook selesai/gagal, percobaan ulang terbatas, ruang berakhir, dan penghentian yang diminta host.
5. **Privasi** — tampilkan pemberitahuan sebelum rekaman dimulai, indikator rekaman yang jelas bagi seluruh peserta, serta kebijakan retensi dan penghapusan. Jangan merekam diam-diam.
6. **Pemutaran** — berikan akses melalui URL bertanda tangan berumur pendek setelah pemeriksaan hak akses. Jangan pernah membuat bucket atau objek rekaman publik.
7. **Biaya dan kapasitas** — ukur durasi, ukuran berkas, lalu lintas keluar, dan biaya penyimpanan. Tetapkan kuota dan batas durasi sebelum membuka fitur.

## Gerbang sebelum implementasi runtime

- [ ] Penyedia dan wilayah penyimpanan objek diputuskan.
- [ ] Bucket privat dan aturan retensi/penghapusan disiapkan.
- [ ] Redis Egress tersedia dan terisolasi.
- [ ] Versi Egress dipastikan kompatibel dengan LiveKit Server `v1.13.10`.
- [ ] Kredensial disimpan di pengelola rahasia/berkas lingkungan dengan izin minimum.
- [ ] Uji staging: mulai, berhenti, gagal, webhook duplikat, ruang berakhir, dan pemutaran.
- [ ] Uji akses: murid/peserta tidak dapat memulai atau melihat rekaman ruang lain.
- [ ] Persetujuan/pemberitahuan rekaman dan kebijakan retensi ditinjau.
- [ ] Pengukuran biaya dan kapasitas disetujui.

## Keputusan rilis

Tetap `recording: false` dan jangan tampilkan klaim rekaman tersedia sampai semua gerbang di atas lulus di staging. Perubahan ini tidak menambah layanan Egress, tidak mengubah infrastruktur VPS, dan tidak mengaktifkan rekaman produksi.
