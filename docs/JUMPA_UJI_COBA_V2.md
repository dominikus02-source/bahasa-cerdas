# JUMPA uji coba V2 — satu pengalaman rapat

Keputusan 2 November 2026: hapus segmentasi Gratis/Premium dan alur panggung dari pengalaman uji coba. Versi ini menggantikan rekomendasi produk pada audit awal `JUMPA_AUDIT_2026_11_02.md`; audit tersebut tetap merupakan catatan kondisi sebelum perubahan.

## Pengalaman pengguna

- Beranda: Gabung ruang atau Mulai ruang baru. Semua akun aktif non-Junior memakai alur yang sama, termasuk murid tanpa kelas. Kode/tautan ruang baru menjadi undangan. Tidak ada direktori rapat publik.
- Semua peserta mengatur kamera/mikrofon sendiri. Pemandu membisukan, mengeluarkan, mengunci akses masuk, atau mengakhiri rapat. Membuka izin tidak menyalakan perangkat dari jarak jauh.
- Tidak ada syarat berlangganan untuk kamera/mikrofon, kapasitas, durasi, atau latar samar. Rapat baru selalu MEETING, termasuk payload lama isWebinar. Semua tautan melewati lobi.
- Kelas privat dan komunitas lama tetap memakai pemeriksaan keanggotaannya. Akun Junior tetap melalui kelas. Ruang rapat terbuka dibedakan lewat metadata policyVersion=2 dan tidak memiliki communityId; ruang lama tidak diam-diam dibuka ke semua pemegang kode.
- Rekaman belum tersedia. Tidak ada tombol yang mengaku sedang merekam tanpa layanan rekaman.

## Video mengikuti layar

`connectOptions.autoSubscribe=false`; penerimaan media diatur `MediaProvider`.

1. `ParticipantTile` mendaftarkan track yang benar-benar terlihat melalui IntersectionObserver.
2. `VisibleTracks` menghitung registrasi tile per track. Satu track boleh ada di fokus dan strip; menutup satu tile tidak memutus tile lainnya.
3. Video kamera di luar halaman/grid/viewport tidak dilanggan. Pergantian halaman memindahkan langganan. Fokus layar bersama menerima satu layar terpilih, termasuk audionya.
4. Mikrofon tetap dilanggan meskipun pembicaranya tidak terlihat. Mode audio saja menghentikan penerimaan kamera; layar bersama tetap boleh ditampilkan.
5. Tab tersembunyi menghentikan penerimaan video dan audio layar bersama; suara mikrofon tetap aktif. Tab terlihat memulihkan hanya tile yang terlihat.
6. AdaptiveStream mengatur resolusi berdasarkan ukuran tile; Dynacast mengurangi lapisan kirim yang tidak dibutuhkan. Kamera peserta tidak dimatikan dari jarak jauh. Jika peserta lain masih menonton, kameranya tetap mengirim untuk mereka.

Grid otomatis: HP 4 tile; laptop 9, perangkat lemah/hemat 4. Strip pembicara menambah paling banyak 6 tile pada laptop, 3–6 pada HP sesuai perangkat/kondisi, terpisah dari grid. Dalam mode pembicara, total video = fokus + strip, bukan grid + strip. Kamera otomatis desktop 540p dan perangkat lemah 360p; kualitas Jernih tersedia hingga 720p untuk semua.

## Kapasitas 100+

Satu batas runtime berlaku bagi semua ruang baru, tanpa pembagian akun:

- `JUMPA_MAX_PARTICIPANTS` di environment web: default 30, rentang konfigurasi 2–500. Rentang parser bukan jaminan kapasitas server.
- Contoh target: 150 setelah hasil uji pada server tujuan lulus. Nilai ini disalin ke DB ruang baru dan LiveKit maxParticipants; UI beranda membaca nilai runtime dari server.
- Durasi maksimum bersama 120 menit. Jadwal boleh memilih durasi lebih pendek.
- Ruang lama tetap mempertahankan kapasitas/durasi tersimpan agar cron dan server media tidak berbeda. Rapat biasa lama yang tidak sesuai kebijakan baru tidak dipakai ulang oleh tombol Mulai.
- Tidak ada migrasi DB atau perubahan server produksi dalam patch ini. Pengguna lama perlu masuk ulang agar token baru memberikan izin media tanpa panggung.

Acuan: https://docs.livekit.io/transport/self-hosting/benchmark/ menjelaskan bahwa beban ditentukan track, pelanggan dan data per pelanggan, serta satu ruang harus muat pada satu node. Angka benchmark 150 penerbit/150 pelanggan memakai mesin 16 core dan tidak dapat dipakai sebagai bukti kapasitas VPS JUMPA 2 CPU/1536 MiB. Menambah node dapat menambah ruang, bukan otomatis membagi beban satu ruang besar. Rekaman Egress harus dipisahkan.

Sebelum 100+: uji 20 → 50 → 100 → 150 pengguna pada staging terisolasi. Sertakan kamera semua aktif tetapi langganan terlihat dibatasi, audio banyak pembicara, satu layar bersama, pergantian halaman, tab tersembunyi, reconnect, Android/iOS, TCP/TURN, dan uji beberapa ruang sekaligus. Ukur CPU/RAM/bandwidth, RTT, jitter, packet loss, waktu gabung p95, serta keberhasilan off/on kamera/mik. Template node saat ini membatasi 400 track secara agregat; hitung audio/video/layar dan semua ruang sebelum mengubahnya.

## Penyebab dan perbaikan media

- Token webinar lama memberikan daftar sumber publish kosong untuk peserta yang belum diberi panggung. Token V2 selalu memberi kamera/mik sesuai akses ruang, tanpa stageApproved. ALLOW_STAGE/REMOVE_STAGE dari UI lama ditolak agar tidak mencabut lagi izin media.
- Pilihan perangkat tersimpan bisa sudah hilang. Lobi dan kontrol mencoba perangkat bawaan hanya untuk NotFound/Overconstrained; penolakan izin browser tidak diulang diam-diam.
- Operasi per perangkat memiliki kunci sendiri. Dialog berbagi layar tidak membekukan tombol mikrofon. Pesan galat membedakan izin, perangkat hilang, dan perangkat dipakai aplikasi lain.
- Patch awal mempertahankan mute saat perubahan kualitas dan tidak menghidupkan kamera otomatis saat keluar mode audio. Mikrofon mute melepas capture; tanpa efek tidak membuat pemroses latar.

## Verifikasi dan batas bukti

Tes lokal mencakup batas seragam lintas paket/jenis, akses kelas privat, non-Junior, pemandu/peserta, lock/remove, 20 grant kamera/mik, fallback perangkat, dan 150 publikasi dengan hanya 9/4 langganan video terlihat. Ini simulasi kebijakan, bukan load test media WebRTC.

SSR beranda diuji untuk input dan konsistensi render. Pemeriksaan browser visual belum dapat dijalankan: Chromium tidak tersedia dan unduhan browser gagal di lingkungan pemeriksaan. Integrasi staging, 20/150 koneksi media nyata, serta reproduksi error uji pengguna belum dilakukan. #206/#208 masih memerlukan validasi isolasi runtime. PR tetap draft sampai bukti tersebut tersedia.

Hasil akhir lokal: `npm run build` lulus; TypeScript lulus; ESLint tanpa error (dua peringatan img yang sudah ada pada pengaturan). Sebelas suite JUMPA lulus: 844 pemeriksaan pada sembilan suite bernomor, pemeriksaan bahasa, serta suite kebijakan media/visibilitas. Sesi LiveKit terintegrasi pada suite token dilewati karena endpoint pengujian tidak diisi.

## Pemeriksaan teks dan tata letak

Beranda memakai dua tindakan jelas; lobi menampilkan judul, perangkat, batas ruang dan Gabung. Label webinar serta klaim "hanya anggota terdaftar" dihapus dari lobi. Pengaturan menyebut Batas ruang; Latar samar diletakkan bersama pilihan latar, tanpa badge Premium atau tombol terkunci. Pesan laporan dan salin tautan dipersingkat. Ruang penuh menyebut kapasitas, bukan paket. Menu Grid/Pembicara memakai label pendek. Tidak ada klaim kestabilan atau kualitas yang belum diuji.

Kontrol kamera/mik tetap terpisah; menu ponsel dapat digulir dengan tinggi maksimum, panel menjadi lembar bawah di HP dan panel samping di laptop. Struktur lama yang mengatur safe-area, target sentuh, dan teks terpotong pada judul tetap dipakai. Pemeriksaan visual, keyboard/fokus, dan perangkat nyata tetap menjadi gerbang penerimaan, bukan dinyatakan lulus melalui pembacaan kode saja.

Rollback: gunakan commit sebelum V2 untuk membangun ulang web pada lingkungan yang sama, lalu pulihkan nilai batas peserta di environment. Tidak ada migrasi DB yang perlu dibatalkan. Kapasitas ruang yang sudah tersimpan tidak berubah otomatis ketika kode atau environment dipulihkan; tutup ruang uji tersebut dan buat ulang bila perlu. Jangan mengganti kode server media saat rapat aktif.

## Kontrol pemandu

Pemandu rapat baru dapat membisukan mikrofon lewat tombol langsung di baris peserta; server tetap memeriksa peran dan sasaran. Peserta biasa tidak mendapat tindakan tersebut. Membisukan tidak memberi pemandu izin menyalakan mikrofon peserta dari jauh.

Tombol Akhiri berada di dock pada HP/laptop. Satu konfirmasi mengakhiri ruang untuk semua; Keluar sendiri tersedia di menu Lainnya. Peserta biasa melihat Keluar. Dialog tetap terbuka jika server menolak/gagal, menampilkan status sibuk, mencegah kirim ulang lewat tombol, dan menahan fokus selama permintaan berjalan. Tombol memakai primitif global; dock memakai token warna, radius dan bayangan global.
