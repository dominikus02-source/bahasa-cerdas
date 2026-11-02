# JUMPA — audit dan perbaikan minimum, 2 November 2026

Status: patch awal; belum diuji pada media staging atau 10 perangkat. Bukan bukti produksi bebas lag/kebocoran.
Baseline audit: main 8a8789ecaf2063d0c27b6e3dde8bd50ad64bd079.

## Temuan per file

| File | Bukti / akibat | Perubahan minimum |
|---|---|---|
| `lib/jumpa/tiers.ts` | GURU Premium 25/120 menit; KELAS Premium 50/120; webinar 100/180. UMUM gratis 10/45; UMUM Premium 25 belum diaktifkan. Bukan batas universal LiveKit 25. | Pertahankan tabel paket sampai kapasitas media diuji; jelaskan jenis ruang saat membuat/memilih. |
| `lib/jumpa/service.ts` | Kapasitas disalin ke JumpaRoom saat dibuat. | Perubahan tabel tidak mengubah ruang lama. Jangan menaikkan DB atau kapasitas ruang aktif tanpa validasi. |
| `app/api/jumpa/rooms/[code]/token/route.ts` | Setiap join memanggil listParticipants, memuat konteks/izin, createRoom, profil, transaksi pencatatan. Hitung kapasitas dan koneksi media bukan satu transaksi. | Uji burst; LiveKit maxParticipants tetap pagar akhir. Jangan cache hitungan peserta atau melepas pemeriksaan izin untuk mempercepat. |
| `lib/jumpa/livekit.ts` | Timeout API 4 detik; createRoom dipanggil per token. | Ukur p95 setiap fase dan kegagalan; deduplikasi createRoom hanya bila hasil ukur menunjukkan bottleneck dan tetap aman lintas instance. |
| `components/jumpa/media-prefs.ts` | Default semula kamera/mik nyala. | PATCH: default pengguna baru mati; preferensi tersimpan tetap dihormati. |
| `components/jumpa/JumpaRoomView.tsx` | Satu busy state dapat ditimpa operasi kontrol lain; error mic/kamera ditelan. Tanpa latar pun membuat BackgroundProcessor. | PATCH: kunci ref lintas kontrol; tombol nonaktif selama operasi; galat terlihat; hentikan processor untuk tanpa efek. |
| `components/jumpa/media-controller.tsx` | Ganti kualitas semula unpublish lalu setCameraEnabled(true), berpotensi menghidupkan ulang setelah off; keluar mode audio memulihkan kamera otomatis. Mic mute default SDK mempertahankan capture. | PATCH: restart track yang sama, pertahankan mute; tidak otomatis memulihkan kamera; stopMicTrackOnMute untuk melepas capture saat mute. |
| `components/jumpa/JumpaLobby.tsx` | Aturan paket tersembunyi dalam details; belum ada petunjuk singkat giliran bicara/rekaman. | PATCH: satu bagian Aturan ruang berisi petunjuk dan status rekaman jujur. |
| `lib/jumpa/room-actions.ts` | MUTE_AUDIO/MUTE_VIDEO membisukan track saat itu; bukan larangan publish permanen. Lock ruang membatasi join baru, bukan kamera/mik. | Bedakan Bisukan dari Kunci mikrofon/kamera. Jika hard lock ditambahkan, simpan kebijakan server, cabut publish source, terapkan ulang di token reconnect, dan sediakan aksi buka kunci. Belum diterapkan dalam patch ini. |
| `lib/jumpa/tiers.ts`, `lib/jumpa/token.ts` | recording=false semua paket; recording masih soon; token peserta tanpa roomRecord/recorder. | Jangan mengubah token peserta menjadi recorder. Belum ada rekaman siap pakai. |
| `ops/vps/docker-compose.yml`, `ops/vps/livekit.yaml` | Tidak ada service Egress; media dialokasikan 2 CPU/1536 MiB; default max 50 dan batas 400 track. | Rekaman perlu worker Egress terpisah dan target object storage privat; 100 webinar di tabel bukan bukti kapasitas runtime. Ukur CPU, RAM, jaringan, TURN. |

## Aturan penggunaan yang disarankan

1. Sebelum masuk: tampilkan judul, jumlah/batas peserta, durasi, pratinjau dan satu tombol Gabung. Pengguna baru mulai tanpa kamera/mik; pilihan terlihat jelas sebelum masuk.
2. Peserta mengaktifkan kamera/mik sendiri. Pemandu boleh membisukan, mengeluarkan, dan mengunci akses masuk. Jangan mengaktifkan perangkat peserta dari jarak jauh.
3. Saat tidak berbicara, mikrofon mati; gunakan angkat tangan. Webinar tetap audiens tanpa publish sampai diberi panggung. Pemberian izin tidak otomatis menyalakan perangkat.
4. Kontrol utama: mikrofon, kamera, angkat tangan, keluar. Obrolan/peserta di header; berbagi layar dan pengaturan lanjutan tidak menambah kepadatan layar HP.
5. Tampilkan status sesungguhnya dari SDK; tombol off berarti tidak mengirim media. Bedakan perangkat ditolak, dibisukan, dikunci pemandu, dan terputus.
6. Rekaman saat ini belum tersedia. Sebelum diaktifkan: hanya pemandu berwenang, pemberitahuan sebelum/saat rekam termasuk peserta terlambat, persetujuan yang dapat dibuktikan, indikator tetap, akses privat, masa simpan dan hapus jelas.

Acuan resmi yang dibaca:
- Zoom meminta persetujuan sebelum host dapat unmute: https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0065350
- Zoom waiting room mengatur siapa yang masuk: https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0059359
- Google Meet audio/video lock mencegah peserta menyalakan perangkat sampai dibuka: https://support.google.com/meet/answer/11274707?hl=en
- Rekaman Meet tergantung hak host/admin: https://support.google.com/meet/answer/9308681?hl=en

## Rekaman: implementasi minimum yang masih diperlukan

Backend start/stop/status yang memverifikasi host dan ruang; Egress room-composite dengan identitas job idempoten; status mulai/merekam/menyimpan/siap/gagal berdasarkan hasil worker, bukan klik UI; callback tervalidasi; metadata DB dan pemilik; object storage privat khusus environment; URL baca bertanda tangan setelah pemeriksaan akses; retensi/penghapusan; penanganan gagal dan kuota. Tidak cukup mengubah recording=true.

Issue #206 dan #208 masih open saat dibaca: bukti runtime dalam #206 bertanggal 1 November, bukan inspeksi VPS baru. Auth staging belum lengkap, Redis lokal belum terintegrasi lewat adapter Upstash, Auth/Storage memakai URL bersama. Ini penghambat validasi staging; bukan bukti penyebab langsung batas 25.
- https://github.com/dominikus02-source/bahasa-cerdas/issues/206
- https://github.com/dominikus02-source/bahasa-cerdas/issues/208

## Gerbang penerimaan sebelum rilis

- Staging Auth/Storage terisolasi sesuai #206/#208; tanpa koneksi ke data produksi.
- 10 akun unik join lewat barrier dalam 1 detik, ulang 3 kali; kemudian 25/26 untuk GURU Premium, 50/51 untuk KELAS. Catat sukses/gagal, token p50/p95, waktu media pertama, ICE/TURN, CPU/RAM, outbound, packet loss, RTT, jitter dan fps. Jangan menganggap uji token sebagai uji video.
- Uji Android Chrome dan Safari/iOS, minimal satu perangkat lemah; kamera/mik off/on berulang sambil kualitas berubah, mode audio dan pergantian perangkat. Rekam bukti: peserta lain tidak menerima audio/video setelah off; indikator capture padam saat mute sesuai kemampuan browser.
- Uji dua tab identitas sama, reconnect, izin browser ditolak, perangkat dicabut, host mute, remove, akhir ruang dan webinar stage revoke/rejoin.
- Uji 360px dan keyboard: kontrol muat, fokus terlihat, label status terbaca; screenshot QA masih diperlukan.
- Jika rekaman dibangun: izin, persetujuan, late join, start/stop berulang, worker mati, storage gagal, akses lintas pengguna dan retensi wajib diuji.

Patch ini mengurangi pekerjaan capture/processor dan menutup beberapa jalur balapan kontrol. Akar lag burst dan semua klaim kebocoran tetap memerlukan reproduksi di runtime; belum dinyatakan selesai.

## Verifikasi patch

- TypeScript (`tsc --noEmit`): lulus.
- ESLint empat file komponen yang berubah: lulus.
- Paket/media: 108 lulus; alur: 170 lulus; token: 36 lulus; izin: 105 lulus; moderasi host: 110 lulus; pemeriksaan bahasa UI: lulus.
- Runner memakai `node --import tsx`; CLI `tsx` tidak dapat membuka IPC pipe di lingkungan pemeriksaan ini.
- Integrasi LiveKit dilewati karena `JUMPA_TEST_LIVEKIT_URL` tidak diisi. Tidak ada uji staging/browser/10 media user; semua hitungan di atas adalah pemeriksaan lokal, bukan load test.
