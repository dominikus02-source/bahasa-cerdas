# Diagram sistem dan aliran data BahasaCerdas
Draf 3 Oktober 2026; cocokkan lokasi dan konfigurasi aktual sebelum isian OSS.

```mermaid
flowchart TD
 U[Pengguna dewasa / anak / wali / guru] -->|HTTPS, pilihan privasi| A[Next.js di Vercel: fungsi sin1 Singapura]
 A -->|Identitas, verifikasi email, sesi| S[Supabase Auth]
 A -->|Akses server berotorisasi| D[PostgreSQL / Prisma]
 A -->|Unggahan dan URL sementara berotorisasi| F[Supabase Storage privat]
 A -->|Cache opsional, tanpa otorisasi dari cache| R[Upstash Redis]
 A -->|Transaksi pengguna yang diizinkan| P[Midtrans]
 P -->|Webhook signature tervalidasi| A
 A -->|Opt-in dan vendor disetujui, minimisasi data| AI[Vendor AI aktif: saran penilaian]
 AI --> H[Guru / peninjau manusia menentukan nilai akhir]
 A --> M[Antrean laporan / tinjauan wali / audit consent]
 A --> X[Tombstone akun / pembersihan / retry penghapusan vendor]
 G[Game server Socket.IO] -->|Token dan consent diperiksa ke aplikasi| A
 B[Backup dan ekspor operasional] -.-> D
```

## Batas kepercayaan dan lokasi
Browser tidak menerima kredensial Prisma atau service-role. Migrasi membatasi akses SQL browser, dengan pengecualian notifikasi milik pengguna. Main Bersama memakai API aplikasi dan broadcast pemicu pemuatan ulang; akses data tetap diperiksa oleh server. Game server wajib memiliki origin dan tujuan aplikasi yang benar.

Region Vercel sin1 terlihat pada konfigurasi repo; ini tidak membuktikan lokasi semua layanan, log, CDN atau backup. Region Supabase, Upstash, game server, backup serta pemrosesan AI harus dilengkapi dari dashboard dan kontrak. Persetujuan pengguna tidak menggantikan analisis dasar transfer lintas negara.

Storage lama masih memiliki bucket publik pada audit metadata. Diagram privat menunjukkan sasaran setelah migrasi, bukan keadaan produksi saat ini. Inventaris referensi, perubahan URL, pencabutan objek asli dan cache, serta pengujian akses wajib diselesaikan sebelum melabeli migrasi selesai.

## Data dan tujuan
Akun/usia/wali: autentikasi dan perlindungan anak. Kelas/jawaban/progres: pembelajaran dan penilaian. Karya/rekaman: audiens yang diizinkan. Pembayaran: transaksi serta pembukuan minimum. Laporan/consent/audit: keselamatan, pembuktian dan hak data. AI: bantuan opsional dengan penilaian manusia. Analitik: opt-in dewasa, dimatikan untuk anak. Seluruh aliran mengikuti batas retensi, akses petugas, dan tinjauan vendor dalam register.
