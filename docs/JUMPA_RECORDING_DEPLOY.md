# JUMPA — rekaman Premium (belum live)

## Keamanan rilis

Rekaman hanya untuk pemandu ruang Premium. Endpoint `GET /api/jumpa/rooms/[code]/recording` memerlukan sesi login dan izin bergabung; hasilnya `eligible`, `available: false`, `recording: false`. Endpoint POST/DELETE menolak semua permintaan dengan 503 sampai alur lengkap siap. Jangan mengubah status `available` hanya karena kredensial S3 tersedia.

## Infrastruktur yang harus disiapkan

1. Jalankan LiveKit Egress terpisah dari LiveKit SFU, dengan Redis dan jaringan media yang sesuai. Jangan menyimpan file MP4 permanen di filesystem kontainer.
2. Sediakan bucket S3 kompatibel yang **privat**, tidak mengizinkan akses anonim atau listing publik; gunakan kredensial terbatas hanya untuk prefix rekaman. Aktifkan enkripsi, kebijakan retensi, dan pembatasan ukuran.
3. Konfigurasi variabel **server-side**: `JUMPA_RECORDING_ENABLED=0`, `JUMPA_RECORDING_S3_ACCESS_KEY`, `JUMPA_RECORDING_S3_SECRET_KEY`, `JUMPA_RECORDING_S3_BUCKET`, `JUMPA_RECORDING_S3_REGION`, `JUMPA_RECORDING_S3_ENDPOINT`. Jangan pakai prefiks `NEXT_PUBLIC_` atau menaruh nilainya dalam Git.
4. Buat tabel rekaman terpisah yang menyimpan `roomId`, `egressId` unik, status, object key, aktor, waktu mulai/selesai, error, dan ukuran berkas. Pastikan satu rekaman aktif per ruang dengan transaksi/constraint.
5. Mulai/hentikan hanya setelah otorisasi pemandu Premium dari server, rate limit, dan pemeriksaan status ruang LIVE. Rekam audit aksi; tolak permintaan bersamaan dan permintaan ulang secara idempoten.
6. Verifikasi webhook Egress dengan tanda tangan, cocokkan `egressId` terhadap DB, dan tandai `READY` hanya setelah berkas benar-benar ada dan dapat diputar. Status gagal tidak boleh dianggap berhasil.
7. Unduhan memakai URL bertanda tangan berumur pendek setelah autentikasi dan otorisasi pemilik/pemandu; jangan kembalikan kredensial atau object key mentah ke browser. Beri notifikasi kepada peserta saat rekaman mulai/berhenti.

## Gerbang QA wajib

- Free dan peserta biasa tidak dapat memulai, menghentikan, melihat daftar, atau mengunduh rekaman privat.
- Premium host dapat memulai, menghentikan, dan mengunduh MP4 yang lolos `ffprobe`, dengan suara dan layar yang sesuai.
- Refresh, koneksi putus, browser ditutup, ruang berakhir, Egress gagal, S3 gagal, dan kapasitas penyimpanan hampir penuh tidak menyebabkan status palsu atau file rusak tanpa pemberitahuan.
- Uji beban media nyata bertahap 20, 50, 100, 150 peserta; pantau CPU, RAM, bandwidth, TURN, latensi, kehilangan paket, dan kualitas rekaman. Jangan menaikkan `JUMPA_MAX_PARTICIPANTS` dari 30 sebelum lulus.
- Uji ulang permission, TypeScript, lint, browser desktop dan HP, serta rollback. Deploy ke staging lebih dulu; produksi hanya setelah bukti QA.
