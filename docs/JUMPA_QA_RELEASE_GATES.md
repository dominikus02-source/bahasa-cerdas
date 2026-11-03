# JUMPA — QA independen dan gerbang rilis
Tanggal: 3 November 2026
Status: rencana verifikasi, **bukan** sertifikasi siap produksi.
Pemilik keputusan arsitektur, merge, dan deployment: Mr Domi / tim pengembang.

## Lingkup
- PR #220: foto tampilan PNG, rekaman lokal, indikator rekaman, pemulihan audio.
- Paket Free 45 menit, 30 peserta; Premium 240 menit, batas produk 150 tetapi batas operasional server saat ini 30.
- Jangan menaikkan `JUMPA_MAX_PARTICIPANTS` atau mengubah konfigurasi produksi hanya berdasarkan tes sintetis.

## Gerbang A — keamanan rekaman (P0)
- [ ] Mulai rekam oleh HOST dan COHOST; MEMBER tidak dapat memulai.
- [ ] Browser menolak izin layar: tidak ada indikator rekaman palsu.
- [ ] Semua mikrofon mute: rekaman tetap dapat diputar dan berisi video.
- [ ] Mikrofon rapat tetap bekerja setelah perekaman dihentikan.
- [ ] Hentikan rekaman, unduh dengan klik eksplisit, periksa file dapat didekode dan memiliki durasi.
- [ ] Klik Keluar/Akhiri sebelum unduhan: dialog mencegah kehilangan file.
- [ ] Navigasi browser/tutup tab saat rekaman aktif dan saat file siap: cek apakah hasil rekaman terselamatkan. **Risiko khusus:** callback `onComplete` ketika komponen sudah unmount memanggil `downloadCapture` otomatis tanpa user gesture; unduhan dapat diblokir browser.
- [ ] Uji batas 250 MB, memori browser, file akhir, dan restart perekaman.
- [ ] Uji Chrome/Edge desktop; browser HP tanpa `getDisplayMedia` menampilkan penjelasan, bukan tombol rusak.

## Gerbang B — audio, video, dan sinyal (P0)
- [ ] Join dengan mic/camera ON dan OFF pada Windows, Android, iOS serta Chrome/Edge/Safari yang didukung.
- [ ] Izin perangkat ditolak lalu diizinkan; pergantian kamera/mikrofon; device unplug/replug.
- [ ] Autoplay audio diblokir: tombol Aktifkan suara memulihkan suara.
- [ ] Audio screen share terdengar ketika tile video di luar viewport.
- [ ] HOST mute peserta; peserta mengaktifkan kembali sendiri.
- [ ] Reconnect Wi-Fi ke seluler, kehilangan koneksi singkat, rejoin setelah keluar.
- [ ] Indikator rekaman untuk peserta baru, reconnect, HOST/COHOST dicabut, host disconnect, heartbeat timeout; MEMBER tidak bisa memalsukan indikator.
- [ ] Pada HP 4 tile dan laptop 9 tile, kamera di luar viewport tidak terus diterima; audio tetap diterima.

## Gerbang C — performa & kapasitas (P0/P1)
- [ ] Catat baseline 20 peserta, lalu 30 peserta dengan perangkat/jaringan beragam.
- [ ] Tahap 50, 75, 100, 150 hanya pada staging terisolasi, dengan persetujuan operator dan pemantauan aktif; hentikan bila error meningkat.
- [ ] Ukur join success rate, p50/p95 join+publish, audio/video RTP receive, packet loss, RTT, reconnect, CPU/RAM/network server, TURN relay usage, dan penggunaan browser.
- [ ] Uji host controls, screen share, join/leave churn, perangkat lambat, jaringan seluler.
- [ ] Dokumentasikan perangkat, browser, jaringan, waktu, konfigurasi SFU/TURN, dan hasil setiap percobaan.
- [ ] Jangan menafsirkan 20 koneksi WebRTC sintetis satu PC sebagai bukti 20 perangkat nyata atau 100+ peserta.

## Gerbang D — UI/UX & aksesibilitas (P1)
- [ ] Layout 360, 390, 768, 1280, 1440 px; landscape HP; zoom 200%.
- [ ] Tombol mic, kamera, layar, Lainnya, rekam, keluar, akhiri: label singkat, tidak terpotong, status jelas.
- [ ] Dialog dapat dioperasikan keyboard, fokus kembali, kontras dan area sentuh memadai.
- [ ] Teks batas paket mengikuti batas efektif server; jangan menjanjikan 150 bila operasional masih 30.
- [ ] Semua pesan berbahasa Indonesia, tidak ada klaim rekaman cloud atau tanda tangan blockchain yang tidak didukung.

## Gerbang E — rilis (P0)
- [x] PR #220: CI build dan smoke sukses pada head `8b5593b4eb2a31ff7dd157f57c25145115d4c20e` (pemeriksaan 3 November 2026).
- [ ] Tindak lanjuti temuan QA review PR #220; validasi regresi pada commit terbaru.
- [ ] Mr Domi menyetujui merge; CI pada head terbaru hijau.
- [ ] Deploy melalui prosedur tim, verifikasi health/database/LiveKit/TURN, login, join, mic/camera, rekam, keluar, dan rollback plan.
- [ ] Pantau error setelah rilis; dokumentasikan hasil dan pemilik tindak lanjut.

## Format bukti untuk setiap pengujian
`Tanggal | Commit | Lingkungan | Perangkat/browser | Skenario | Ekspektasi | Aktual | PASS/FAIL | Log/video/screenshot | Penanggung jawab`

## Aturan koordinasi
Dokumen ini dibuat di branch QA terpisah, tidak mengubah kode aplikasi, dan tidak otomatis mengizinkan merge/deploy. Prioritaskan masukan Mr Domi. Temuan P0 ditindaklanjuti melalui PR perbaikan kecil dengan tes regresi.
