# Respons insiden data pribadi

Pemilik proses: pengelola CV Obah Mamah. Incident commander, petugas PDP, on-call engineer, moderator dan pengganti harus ditetapkan sebelum rilis; email publik halo@bahasacerdas.com. Daftar telepon/vendor escalation disimpan privat di pengelola, bukan repo.

1. Catat waktu diketahui/temuan pertama, sistem, sumber deteksi, nomor insiden dan petugas. Aktifkan respons segera, dengan catatan keputusan serta tenggat hukum. Jangan menyalin password, token, karya sensitif atau konten eksploitasi anak ke log/chat.
2. Batasi akses terdampak, cabut/rotasi kredensial bocor, hentikan job/vendor terdampak dan isolasi storage/endpoint. Pertahankan bukti forensik minimum di ruang akses terbatas; jangan menghapus bukti sembarangan.
3. Petakan jenis/jumlah subjek, anak/wali, data terungkap, periode, negara/vendor, akses pihak luar dan dampak. Periksa grant/RLS/storage/Auth, log vendor dan jejak pembayaran. Catat ketidakpastian dan pembaruan berikutnya.
4. UU PDP Pasal 46 menetapkan pemberitahuan tertulis paling lambat 3×24 jam kepada subjek data dan lembaga untuk kegagalan pelindungan data. Petugas hukum memastikan penerima/kanal otoritas yang berlaku; jangan menunggu analisis final hingga melewati tenggat. Pertimbangkan pemberitahuan publik bila diwajibkan.
5. Isi pemberitahuan: data yang terungkap, kapan/bagaimana terjadi, upaya penanganan/pemulihan, kanal bantuan, tindakan yang relevan bagi pengguna. Untuk anak, gunakan bahasa sederhana dan komunikasi wali yang sesuai. Jangan mengungkap identitas anak/pelapor secara publik.
6. Komunikasi hanya dikirim petugas berwenang. Simpan bukti penyampaian, daftar penerima terlindung dan alasan pengecualian; catat update dan pemulihan.
7. Tutup insiden setelah containment, pemeriksaan akses dan verifikasi pemulihan. Analisis akar masalah, perbaiki kontrol, tinjau DPIA/vendor dan lakukan tabletop berkala. Tenggat 72 jam bukan alasan menunda respons awal.

Template catatan: ID | diketahui pada | commander | sistem | data/subjek | dampak anak | containment | bukti terlindung | deadline pemberitahuan | penerima/kanal | waktu dikirim | perbaikan | verifikasi | penutupan.

Sumber: [UU PDP, Pasal 46](https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/crc32/).
