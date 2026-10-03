# Kota Cahaya: audit alur, podium, dan notifikasi murid

Tanggal: 2 Oktober 2026.

## Perubahan

- Kota Cahaya tetap merupakan misi bersama kelas. Podium siswa memberikan penghargaan berdasarkan jumlah jawaban benar yang menyumbang energi, bukan kecepatan menjawab. Skor sama berbagi peringkat (1, 2, 2, 4); semua siswa pada tiga peringkat teratas ditampilkan, termasuk seri dan sesi satu siswa.
- Hasil akhir pada layar guru, kelas, dan projector memiliki podium. Layar kelas/projector membuka podium dahulu dan menyediakan tombol untuk melihat kota yang dibangun. Avatar, nama, dan kontribusi tetap terbaca; hasil tanpa peserta mempunyai empty state.
- Data penghargaan projector hanya muncul saat summary/ended. Payload terbatas pada nama tampilan, avatar katalog, jumlah kontribusi, dan peringkat. Tidak memuat playerId, userId, teacherId, token, atau jawaban individual.
- Area kota hasil akhir diturunkan dari progres asli melalui `milestonesForProgress`, bukan persentase yang dibulatkan. Contoh: 99.999% tidak menyalakan pusat kota sebelum threshold 100% benar-benar tercapai.
- Notifikasi jawaban tersimpan menggunakan komponen tersendiri dengan ikon berukuran tetap, judul dan pesan pada baris berbeda, serta teks yang bisa membungkus. Kartu hasil jawaban juga memakai kolom `minmax(0, 1fr)` dan memindahkan nomor soal pada layar sempit.

## Verifikasi

- `scripts/test-main-bersama-game-engine.ts`: 58 pemeriksaan lulus.
- `scripts/test-main-bersama-kota-motion.ts`: 78 pemeriksaan lulus.
- `scripts/test-main-bersama-vertical-slice.ts`: 40 pemeriksaan lulus pada PostgreSQL lokal khusus `mbtest`, mencakup lifecycle, scoring, target saat start, hasil misi, podium, dan recovery setelah cache dibuang. Fixture avatar lama diperbarui untuk mengikuti katalog avatar yang sekarang wajib saat join.
- `scripts/test-main-bersama-kota-summary.ts`: regression perilaku asli: lifecycle, submit/close berulang tidak menggandakan energi, podium publik tanpa identifier privat, hasil seri, satu siswa, semua jawaban salah, hasil setelah sesi ditutup, serta threshold presisi.
- Pratinjau browser merender komponen produksi dengan data sintetis: projector 1366×768, perpindahan podium/kota, notifikasi murid portrait 320×640 dan landscape 667×375. Judul dan pesan tidak berpotongan; tidak ada overflow horizontal pada kedua ukuran HP.
- Tidak ada sesi atau database production yang dimutasi untuk pengujian.

## Batas audit

Kota Cahaya mempertahankan alur bersama yang dipandu guru: mulai → menjawab → tutup jawaban → pembahasan → soal berikutnya/hasil akhir → tutup sesi. Mekanisme Jelajah Kata otomatis per regu dan susunan avatar yang telah disetujui tidak diubah. Pengujian browser menggunakan pratinjau komponen dengan fixture; perangkat fisik murid dan projector sekolah belum diuji langsung.
