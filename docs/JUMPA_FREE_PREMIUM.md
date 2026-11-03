# JUMPA Free dan Premium

| Aturan | Free | Premium |
| --- | --- | --- |
| Batas produk peserta | 30 | 150 |
| Durasi maksimum | 45 menit | 240 menit |
| Kamera dan mikrofon | Kendali peserta | Kendali peserta |
| Berbagi layar pada rapat baru | Tersedia | Tersedia |
| Kualitas kamera maksimum | 720p | 720p |
| Foto tampilan | PNG lokal | PNG lokal |
| Rekaman | Lokal, browser yang mendukung | Lokal, browser yang mendukung |

Kapasitas efektif = minimum batas produk dan JUMPA_MAX_PARTICIPANTS. Default server tetap 30; angka 150 bukan bukti load test. Beranda menampilkan batas efektif. Paket berasal dari langganan BC pembuat; peserta Free dapat bergabung ke ruang Premium. Tidak ada perubahan pembayaran pada fitur ini. Ruang lama mempertahankan batas tersimpan; buat ruang baru untuk kebijakan baru.

Kelas privat, Junior, kunci ruang dan keluarkan peserta tetap diperiksa server. Semua peserta yang diizinkan masuk mendapat kamera/mikrofon. Pemandu bisa membisukan; peserta menyalakan kembali sendiri. Membuka kunci tidak otomatis menyalakan perangkat.

Video mengikuti tampilan (laptop 9, HP 4). Audio rapat termasuk suara berbagi layar tetap diterima. Browser yang memblokir autoplay mendapat tombol Aktifkan suara.

Menu Lainnya menyediakan Foto tampilan. Pemandu/wakil pemandu dapat merekam layar pilihan pengguna dan audio rapat pada browser yang mendukung. Rekaman hingga 250 MB ditawarkan lewat tombol Unduh rekaman. Tidak ada penyimpanan rekaman di server/cloud. Dukungan HP mengikuti kemampuan browser; rincian: JUMPA_CAPTURE.md.

PR #216 sudah dirilis dengan health ok/db up, uji autentikasi, pembuatan ruang, token HOST/MEMBER dan akhir ruang. Fitur foto/rekaman dan pemulihan audio ditambahkan lewat PR lanjutan; status pengujian terbaru tercantum pada PR tersebut dan JUMPA_CAPTURE.md. Dua uji ulang 20 sesi WebRTC sintetis pada staging lulus; percobaan awal sempat tidak stabil. Ini bukan bukti 20 perangkat fisik, berbagai jaringan, atau kapasitas 100+. Batas produksi tetap 30 hingga validasi lanjutan.
