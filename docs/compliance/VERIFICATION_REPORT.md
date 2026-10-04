# Laporan verifikasi — 3 Oktober 2026
Status: perubahan lokal; belum commit, push, deploy atau migrasi produksi. TDPSE belum terdaftar.

## Hasil pemeriksaan
- Integrasi privasi pada route nyata + PostgreSQL lokal: PASS. Batas umur Jakarta, DOB tidak dapat diubah mandiri, default anak privat, CSRF, email wali terverifikasi, token tidak dapat dipakai ulang/oleh wali lain, persetujuan ditinjau independen, pencabutan/versi, bukti kelas, akses file/IDOR, laporan anonim, otorisasi admin, ledger tidak dapat diubah, tombstone, retry vendor dan nilai AI menunggu manusia.
- Keamanan penghapusan akun: PASS untuk reautentikasi password/OTP/OAuth/MFA, owner mismatch, CSRF, batas transaksi dan urutan pencabutan/cleanup.
- Migrasi PostgreSQL lokal dan uji RLS: PASS. Role browser uji tidak melihat User/ConsentEvent; ledger menolak update. Schema storage Supabase dimodelkan lokal; pengujian Supabase staging sesungguhnya masih wajib.
- Bank Soal delivery guard: 20/20 PASS. Main Bersama session engine: 58/58 PASS. Scope token CSS: 5/5 PASS. Kredensial reconnect terikat peserta dan sesi.
- Browser mobile: laporan anonim berhasil diterima dan memiliki nomor; halaman pemberitahuan anak terbaca; pengaturan privasi tanpa sesi menolak penyimpanan. Screenshot disertakan. Uji consent/admin beridentitas menggunakan fixture lokal, bukan akun produksi.
- TypeScript aplikasi dan game server: PASS pada pemeriksaan tersendiri. Build produksi snapshot terakhir (`npm run build -- --webpack`), dengan database lokal dan endpoint vendor produksi dinonaktifkan: PASS, exit 0; kompilasi 70 detik, TypeScript 2,1 menit, 468 halaman terbangun. Artefak route terkompilasi memuat pemeriksaan email wali terbaru.
- Lint script proyek dan pemeriksaan terarah perubahan: PASS. ESLint seluruh repo eksplisit: 49 error di file lama yang tidak diubah, termasuk conditional hooks pada game, tautan panel hasil, parser script audit lama dan penamaan useSupportedQuestions.
- Main Bersama routing: 14 PASS, 2 FAIL; contracts: 46 PASS, 1 FAIL. Kegagalan ekspektasi sumber pada file lama yang tidak diubah.
- Main Bersama scoring database lokal terisolasi: 38 PASS, 2 FAIL; race submit/close: 51 PASS, 1 FAIL. Fixture avatar diperbarui ke katalog yang valid. Assertion progres/facts/cache lama masih gagal pada service yang tidak diubah; perlu peninjauan terpisah, tidak disembunyikan dengan melonggarkan assertion.
- Audit tema: dua temuan blocking lama pada ArticleCoverLightbox; konsistensi tema guru 170/173 PASS. Dua masalah warna lama dan batas protected-zone yang dipicu perubahan API/schema yang diminta. Desain tidak dirombak untuk membuat uji sumber lolos.
- git diff --check: PASS.

## Batas penerapan
Belum diuji end-to-end dengan Supabase Auth/Storage/Realtime staging asli. Migrasi file publik lama, bukti umur proporsional (deklarasi DOB dewasa masih dapat disalahgunakan), kontrak/region/transfer vendor, pemulihan backup, bukti DPIA/PLF nyata, retensi vendor dan kesiapan petugas merupakan syarat rilis. AI dan layanan anak memakai gerbang bukti kesiapan, bukan status risiko yang diklaim tanpa evaluasi.

## Insiden isolasi pengujian lokal
Rangkaian perintah uji Main Bersama sempat tidak berhenti setelah menemukan database lokal lama bernama mbtest. Uji berikutnya membersihkan tabel Main Bersama uji pada database lokal tersebut lalu gagal karena schema usang. Produksi tidak tersentuh. Isi fixture lama sebelum pembersihan tidak diketahui dan belum dipulihkan. Pengujian berikutnya memakai PostgreSQL baru milik tugas di port 55439, hanya dengan data sintetis. Guard kini menyamakan DATABASE_URL, DATABASE_URL_POOLED dan DIRECT_URL dengan URL uji yang tervalidasi. Tidak ada klaim bahwa database lokal lama tetap utuh.
