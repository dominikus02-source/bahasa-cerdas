# JUMPA Free dan Premium

Keputusan implementasi 3 November 2026. Menggantikan kebijakan kapasitas sama pada JUMPA_UJI_COBA_V2.md; arsitektur media dan batas bukti QA di dokumen itu tetap berlaku.

| Aturan | Free | Premium |
| --- | --- | --- |
| Batas produk peserta | 30 | 150 |
| Durasi maksimum | 45 menit | 240 menit |
| Kamera dan mikrofon | Kendali peserta | Kendali peserta |
| Berbagi layar pada rapat baru | Tersedia | Tersedia |
| Kualitas kamera maksimum | 720p | 720p |
| Rekaman | Tidak tersedia | Khusus Premium, menunggu implementasi dan validasi Egress |

Paket ditentukan otomatis dari langganan BC pembuat ruang (termasuk langganan Premium murid/umum dan uji coba yang masih aktif). Peserta Free dapat bergabung ke ruang Premium. Tidak ada pilihan paket di formulir mulai, paket peserta tidak mencabut izin perangkat. Aturan akses kelas privat, Junior, kunci ruang dan keluarkan peserta tetap berlaku. Tidak ada perubahan harga, pembayaran, atau skema database.

Kapasitas efektif = minimum batas produk dan `JUMPA_MAX_PARTICIPANTS`. Nilai default server tetap 30; contoh 150 hanya boleh dipasang setelah uji media dan kapasitas. API beranda menampilkan batas efektif server, bukan angka promosi 150. Ruang yang sudah ada mempertahankan batas tersimpan. Setelah perubahan paket, ruang akun umum dengan batas berbeda tidak digunakan ulang; akhiri ruang aktif dahulu jika pagar satu ruang aktif berlaku.

Video diterima hanya untuk tile terlihat (laptop 9, HP 4). Kamera pemilik tidak dimatikan ketika tile tersembunyi. Audio tetap aktif. Pemandu dapat membisukan; peserta menyalakan kembali perangkatnya sendiri. Membuka kunci tidak otomatis menyalakan perangkat.

## Validasi dan batas bukti

Tes kebijakan mencakup empat jenis ruang, dua paket, kualitas setara, batas server default, konfigurasi 150, dan Free tetap 30. Tes jadwal memeriksa durasi maksimum sesuai paket. Seluruh 11 suite JUMPA lulus, termasuk perangkat, izin, token, tindakan pemandu, jadwal dan paket. TypeScript, ESLint pada file produksi yang berubah, serta guard warna lulus. Build produksi dijalankan ulang pada sumber akhir. QA browser baru belum berjalan karena executable Chromium tidak tersedia di lingkungan ini; bukti QA browser sebelumnya tetap terbatas pada commit sebelumnya.

Staging `/api/health` melalui PC merespons `status=ok`, `db=up` pada pemeriksaan 3 November 2026. Ini bukan uji kamera/mikrofon atau bukti staging terisolasi. SSH berhasil memakai kunci khusus BahasaCerdas pada PC. Kontainer staging web, LiveKit, Auth, dan Storage aktif; ini belum memverifikasi alur media dan pemisahan endpoint runtime. Checkout staging masih pada `a2977825`, belum memuat patch PR #216. `NEXT_PUBLIC_SUPABASE_URL` tidak terlihat sebagai variabel runtime kontainer; konfigurasi hasil build belum diverifikasi. Produksi belum diubah. Uji media nyata 20 → 50 → 100 → 150 pengguna, isolasi Auth/Storage (#206/#208), dan kapasitas VPS masih harus diverifikasi sebelum rilis. Rekaman memerlukan implementasi Egress/penyimpanan privat; tidak dijanjikan pada kartu paket.

Rollback: kembalikan commit paket; jangan mengubah batas ruang yang sedang berlangsung. Tidak ada migrasi database yang perlu dibatalkan.

## Pengiriman

Commit implementasi tersimpan lokal. Push ke branch PR #216 diblokir peninjauan persetujuan otomatis karena tujuan GitHub dianggap belum terverifikasi dan izin pembaruan branch belum eksplisit. Jangan menganggap perubahan telah masuk PR atau CI terbaru telah berjalan.
