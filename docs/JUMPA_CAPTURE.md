# Foto tampilan dan rekaman lokal JUMPA

Menu Lainnya menyediakan Foto tampilan untuk menyimpan area video yang terlihat sebagai PNG. Kamera yang tidak terlihat tidak diambil. Foto dibuat dan diunduh di perangkat, tanpa upload ke server.

Pemandu dan wakil pemandu dapat memilih Rekam di perangkat. Konfirmasi menjelaskan layar/tab yang dipilih dan suara rapat yang direkam. Browser tetap meminta pengguna memilih layar. Format dipilih dari kemampuan MediaRecorder (WebM atau MP4). File tidak disimpan di server dan fitur tidak mengklaim layanan rekaman cloud/Egress.

Rekaman tersedia pada Free dan Premium di browser yang mendukung getDisplayMedia, MediaRecorder dan AudioContext. Pada browser HP yang tidak mendukung, tombol dinonaktifkan dengan penjelasan untuk memakai browser laptop. Hingga 250 MB per rekaman; saat batas tercapai perekaman dihentikan dan tombol Unduh rekaman ditampilkan. Batas ini mencegah akumulasi tanpa batas di memori browser. Untuk sesi panjang pengguna dapat memulai file berikutnya. Menutup tab saat merekam menampilkan konfirmasi browser; pilih batal dan simpan rekaman dahulu.

Suara berasal dari track mikrofon dan audio layar di ruang, termasuk mikrofon pemandu jika aktif. Capture layar tidak mengambil audio sistem kedua kalinya. Perubahan track/izin bisukan selama rapat memperbarui mixer. Perekaman dihentikan saat izin pemandu dicabut atau komponen ruang ditutup. Tombol keluar/akhiri oleh perekam meminta rekaman disimpan dahulu. Unduhan memakai klik eksplisit agar tidak diblokir sebagai unduhan otomatis oleh browser. Hanya track display/destination milik recorder yang dihentikan; track rapat tidak dihentikan.

Indikator rekaman disiarkan melalui kanal data LiveKit dengan pengirim terverifikasi dari metadata server HOST/COHOST. Pesan peserta biasa, pesan rusak dan pesan terlalu besar ditolak. Pengumuman diulang untuk peserta baru; indikator berakhir ketika pengirim keluar atau heartbeat kedaluwarsa. Ini pemberitahuan rekaman lokal, bukan pencegahan perekaman dari aplikasi lain. Saat recorder aktif, video tile terlihat tetap diterima meski tab tidak aktif agar gambar rekaman tidak sengaja terjeda oleh kebijakan hemat data.

Perbaikan audio: tombol Aktifkan suara tersedia ketika pemutaran otomatis browser terblokir. Suara rapat dan audio berbagi layar tidak lagi mengikuti visibilitas tile, sementara penerimaan kamera tetap dibatasi tampilan.

Validasi: test kebijakan media dan sinyal rekaman ditambah. Fixture browser menggunakan komponen JUMPA asli, transport rapat simulasi, captureStream, AudioContext dan MediaRecorder browser nyata untuk memverifikasi unduhan PNG dan berkas video yang dapat didekode. Fixture ini bukan uji media banyak peserta atau pengujian pemilih layar OS/perangkat fisik. Bukti hasil akhir dicatat dalam PR.

## Bukti pengujian 3 November 2026

Chrome PC: ruang 360/768/1280 dan beranda 360/1280 diperiksa. PNG berhasil diekspor; WebM hasil MediaRecorder nyata berhasil didekode dengan dimensi 320×180. Mikrofon rapat tetap hidup setelah recorder berhenti. Pengujian semua peserta dibisukan dan perlindungan keluar sebelum mengunduh ditambahkan ke fixture. Pemilih layar OS tetap harus dipilih pengguna, bukan dipaksa oleh aplikasi.

Staging LiveKit: dua pengujian ulang 20 sesi WebRTC sintetis lulus. Masing-masing menerbitkan kamera/mikrofon resolusi rendah; setiap sesi menerima 19 mikrofon dan 3–4 kamera, memiliki paket RTP dan frame video yang didekode. On/off mic dan kamera lulus pada semua sesi; satu sesi berhasil keluar/gabung ulang. P95 koneksi plus publikasi sekitar 6,9–7,2 detik. Ini satu PC/jaringan dan media sintetis, bukan 20 perangkat fisik atau bukti kapasitas 100+. Percobaan pertama sempat kehilangan sebagian koneksi; penyebab pastinya belum terisolasi, sehingga hasil ulangan tidak boleh menjadi klaim stabil tanpa batas. Kapasitas produksi tetap konservatif 30.

Uji transport dapat diulang dengan scripts/e2e/jumpa-transport.cjs memakai token staging singkat yang dibatasi pada ruang qa-jumpa-media-*; jangan memakai token produksi atau menyimpan token ke repository.
