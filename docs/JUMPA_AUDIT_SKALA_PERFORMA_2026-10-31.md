# Audit Skala, Alur, dan Performa JUMPA

Tanggal: 31 Oktober 2026  
Cabang: `feat/jumpa-webinar-interactive-v1`  
Status: audit kode selesai sebagian; uji beban media nyata belum dijalankan.

## Ringkasan

JUMPA sudah memiliki fondasi optimasi klien: simulcast, dynacast, adaptive stream, grid berhalaman, mode hemat data/audio saja, pemantauan kualitas koneksi, dan pemuatan ruang LiveKit secara lazy.

Perbaikan pada cabang ini:
- Daftar ruang membawa mode rapat/webinar sehingga label ruang tidak rancu.
- Mode otomatis kini menurunkan kualitas video yang dikirim saat koneksi memburuk, bukan hanya menurunkan kualitas video yang diterima.
- Pemeriksaan regresi ditambah untuk mode rapat/webinar dan penurunan bitrate video keluar.

## Temuan penting

### P0 — Kapasitas media 200 peserta belum terbukti

Konfigurasi LiveKit yang ada:
- Kontainer LiveKit dibatasi 2 CPU dan RAM 1.5 GiB.
- Batas kasar `limit.num_tracks` adalah 400.
- Webinar pada aplikasi mengizinkan hingga 200 peserta.
- Setiap peserta dapat menerbitkan kamera dan mikrofon. Dengan 200 peserta, jumlah track masuk berpotensi mendekati 400 sebelum berbagi layar atau kebutuhan tambahan.
- LiveKit berjalan sebagai satu layanan pada stack VPS yang juga menjalankan web, Redis, Caddy, dan layanan lain.

Kesimpulan: angka 200 adalah batas produk, bukan hasil pengujian kapasitas. Jangan mempromosikan 200 peserta dengan kamera aktif bersamaan sebelum uji beban dan pengukuran CPU, RAM, bandwidth, packet loss, RTT, dan kualitas audio/video selesai.

### P0 — Pola interaksi webinar harus menghindari semua kamera aktif bersamaan

Untuk webinar 200 orang yang tetap interaktif, pola yang lebih aman:
- Semua peserta dapat melihat, mendengar pemandu, memakai obrolan, dan mengangkat tangan.
- Kamera dan mikrofon peserta dimulai dalam keadaan mati.
- Peserta meminta giliran bicara; pemandu menyetujui untuk naik ke panggung.
- Hanya pemandu, wakil pemandu, dan peserta yang sedang mendapat giliran yang menerbitkan kamera/mikrofon.
- Peserta lain tetap dapat berinteraksi melalui obrolan dan antrean angkat tangan.

Ini mempertahankan interaktivitas, tetapi mencegah 200 aliran kamera dan audio menjadi pola bawaan. Perlu implementasi izin panggung di server, bukan sekadar menyembunyikan tombol di UI.

### P1 — Kualitas video keluar sebelumnya belum ikut turun

Sebelumnya, status koneksi buruk hanya memengaruhi kebijakan video yang diterima. Kamera lokal masih dapat mengirim kualitas otomatis normal. Cabang ini menambahkan penurunan kamera keluar ke profil hemat data ketika koneksi memburuk dan pemulihan saat koneksi stabil.

### P1 — Jaringan sekolah dan TURN

- ICE/UDP dan ICE/TCP tersedia.
- TURN/TLS tidak aktif secara bawaan.
- Jaringan sekolah yang membatasi UDP dapat memerlukan TURN/TLS.
- Perlu uji dari jaringan sekolah, hotspot seluler, dan Wi-Fi rumah sebelum peluncuran luas.

### P1 — Konfigurasi satu node

Beban media harus dipisahkan dari aplikasi web dan basis data bila targetnya webinar besar. Rekomendasi arsitektur: LiveKit pada node media khusus, web/API tetap di node aplikasi, serta metrik dan alarm terpisah. Ukuran node final harus ditentukan dari hasil benchmark, bukan perkiraan semata.

## Alur pengguna yang perlu lulus uji

1. Guru membuka JUMPA dan memilih **Rapat biasa** atau **Webinar interaktif**.
2. Guru melihat kuota, kapasitas, durasi, dan jenis ruang sebelum membuatnya.
3. Ruang dibuat; kode dan tautan dapat disalin/dibagikan dengan satu tindakan.
4. Peserta membuka tautan, masuk ke akun BC, lalu masuk ke lobi.
5. Lobi menampilkan nama acara, status ruang, pemeriksaan kamera/mikrofon, pilihan audio saja, dan tombol masuk yang jelas.
6. Peserta masuk dengan kamera/mikrofon mati secara bawaan untuk webinar besar.
7. Pemandu mengelola peserta, antrean bicara, obrolan, dan berbagi layar.
8. Jika koneksi buruk, JUMPA menurunkan kualitas kamera keluar/masuk dan menawarkan audio saja.
9. Saat terputus, peserta mendapat tombol sambung kembali dan status yang mudah dipahami.
10. Pemandu mengakhiri sesi; ringkasan dan kehadiran ditampilkan sesuai izin.

## Matriks uji beban yang wajib dijalankan pada lingkungan uji

| Tahap | Peserta | Skenario | Kriteria awal |
|---|---:|---|---|
| A | 10 | Masuk, kamera/mikrofon, obrolan | Tidak ada kegagalan kritis |
| B | 25 | Rapat biasa, berbagi layar, pergantian pembicara | Audio stabil, reconnect berhasil |
| C | 50 | Webinar, kamera pemandu, peserta audio/chat | Tidak ada lonjakan error atau CPU mentok |
| D | 100 | Webinar, peserta masuk bertahap, obrolan dan angkat tangan | Tidak ada kegagalan massal |
| E | 200 | Webinar dengan model panggung, kamera aktif terbatas | Hanya lulus jika metrik media dan pengalaman pengguna memenuhi target |

Target pengukuran yang disarankan:
- API join p95 di bawah 2 detik setelah sesi siap.
- Audio tidak putus berulang; packet loss dan jitter dicatat per peserta.
- Reconnect otomatis berhasil setelah gangguan jaringan sementara.
- CPU LiveKit tidak menetap di atas 80%; RAM memiliki headroom minimal 25%.
- Tidak ada peserta yang melebihi batas kapasitas; tidak ada token atau izin admin bocor.
- Uji browser Android kelas menengah, iPhone, dan laptop.
- Uji jaringan lambat, jitter, packet loss, pindah Wi-Fi ke seluler, dan UDP diblokir.

Angka target di atas adalah gerbang penerimaan yang diusulkan, bukan hasil pengukuran yang sudah diperoleh.

### Implementasi awal panggung webinar (cabang fitur)

Pada 31 Oktober 2026, cabang fitur menambahkan pengamanan publikasi media berikut:
- Token peserta biasa pada ruang `WEBINAR` diterbitkan tanpa izin publikasi kamera/mikrofon.
- Kamera dan mikrofon peserta biasa tidak dimulai saat masuk.
- Pemandu utama dapat menaikkan peserta biasa ke panggung atau menurunkannya melalui panel peserta.
- Aksi panggung melewati endpoint moderasi yang memeriksa peran pemandu di server; klien tidak memiliki kunci admin LiveKit.
- Izin panggung diberikan/dicabut langsung melalui `updateParticipant` LiveKit. Jika pembaruan izin gagal, API mengembalikan kegagalan dan tidak menyatakan tindakan berhasil.
- Izin panggung bersifat sementara pada sesi LiveKit; peserta yang masuk ulang kembali tanpa izin publikasi sampai disetujui lagi.

Batas implementasi tahap ini:
- Belum ada penyimpanan status panggung lintas sesi/reconnect.
- Belum ada antrean permintaan panggung yang tersimpan di server; antrean angkat tangan yang sudah ada menjadi sarana permintaan.
- Persetujuan panggung saat ini hanya memberi kamera dan mikrofon, bukan berbagi layar.
- Perubahan masih di cabang fitur dan belum diterapkan ke produksi.

## Batas validasi saat ini

- Pemeriksaan kode dan regresi berjalan melalui GitHub Actions.
- Uji beban 10/25/50/100/200 peserta belum dijalankan.
- Tidak ada perangkat VPS yang terhubung ke sesi ini untuk menjalankan inspeksi langsung atau uji media nyata.
- Endpoint kesehatan produksi belum dapat diverifikasi melalui jalur pemeriksaan yang tersedia.
- Jangan menggabungkan atau menerapkan perubahan ke produksi sampai CI lulus dan uji integrasi LiveKit pada lingkungan uji selesai.

## Keputusan operasional

1. Pertahankan JUMPA rapat biasa tanpa mengubah perilaku lama.
2. Perlakukan webinar 200 peserta sebagai target yang masih harus dibuktikan.
3. Terapkan model panggung untuk webinar besar sebelum mengaktifkan kamera bebas untuk semua peserta.
4. Jalankan benchmark bertahap pada lingkungan uji dan simpan metrik mentah.
5. Pisahkan LiveKit ke node media khusus bila benchmark node saat ini tidak memenuhi target.
