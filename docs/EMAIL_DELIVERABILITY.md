# Pemulihan kata sandi BahasaCerdas

## Diagnosis dan batas verifikasi

Stack terverifikasi: Next.js App Router + Supabase Auth. Endpoint lama memanggil
`resetPasswordForEmail`, meneruskan `error.message` provider ke browser, dan
menolak email yang tidak ditemukan di tabel profil Prisma. Tidak ada SMTP aktif
atau templat recovery di konfigurasi versi repositori. Ini **tidak membuktikan**
SMTP hosted belum disetel: pengaturan Dashboard terpisah dari config.toml.
Akar kegagalan pengiriman produksi harus dikonfirmasi lewat Supabase Auth logs
(dan log provider): kredensial SMTP, domain pengirim, pembatasan built-in mailer,
kuota atau penolakan penerima. Redirect yang salah menyebabkan salah tujuan
setelah klik; bukan bukti penyebab kegagalan SMTP.

Kode sekarang memakai Auth sebagai sumber kebenaran tanpa query profil dan
memberi respons sukses generik untuk email tidak dikenal. Pengiriman gagal tetap
menghasilkan 503 berbahasa Indonesia; detail kode/status hanya di server. Tidak
ada retry pengiriman otomatis. Pembatasan atomik: maksimal 3 percobaan per email
DAN IP per 900 detik, hash SHA-256 pada key Redis; cooldown UI 60 detik. Hosting
harus menimpa header IP klien agar tidak bisa dipalsukan dari internet. Produksi
menolak pengiriman bila Redis tidak tersedia; pengembangan memakai memori lokal.

## Checklist konfigurasi produksi

1. Pilihan sederhana: **Resend melalui custom SMTP Supabase**, tanpa mengganti
   login, registrasi, Google OAuth, atau sistem token Supabase. Tambahkan domain
   `bahasacerdas.com` di Resend dan verifikasi kepemilikannya. Buat API key khusus
   pengiriman dan simpan di secret manager, jangan Git/chat.
2. Tambahkan DNS **persis nilai yang diberikan Resend**: DKIM TXT/CNAME,
   SPF untuk domain/subdomain pengiriman (jangan buat dua SPF pada satu nama),
   MX/return-path untuk bounce bila diminta provider. SPF include provider dan
   nilai DKIM bergantung akun/region; jangan menebak atau menyalin placeholder.
   Jangan mengganti MX mailbox utama hanya untuk pengiriman.
3. Sediakan mailbox/alias yang dipantau `dukungan@bahasacerdas.com` dan
   `dmarc@bahasacerdas.com`. Tambahkan TXT `_dmarc.bahasacerdas.com`:
   `v=DMARC1; p=none; rua=mailto:dmarc@bahasacerdas.com`.
   Setelah semua sumber pengiriman terinventarisasi dan selaras, naikkan ke
   `p=quarantine` lalu `p=reject` berdasarkan laporan, bukan secara otomatis.
4. Supabase Dashboard → Authentication → Email/SMTP: aktifkan custom SMTP.
   Host `smtp.resend.com`, port `465`, user `resend`, password API key Resend,
   sender email `noreply@bahasacerdas.com`, sender name `BahasaCerdas`.
   Sesuaikan batas email per jam dengan kuota aktual provider dan jumlah pengguna.
   Default built-in mailer dibatasi dan tidak cocok untuk pengiriman publik.
5. Authentication → URL Configuration: Site URL `https://bahasacerdas.com`;
   Redirect URLs tambahkan **`https://bahasacerdas.com/reset-password`**.
   Pertahankan URL callback lain untuk Google/login. Recovery memakai implicit
   flow Supabase: verifier mengirim session pada fragment ke reset page. Halaman
   mengimpor session via `setSession` lalu membuang fragment; client SSR bersama
   tetap memakai PKCE untuk login/Google. Recovery bukan
   PKCE yang dibuat tanpa cookie verifier di server. Tautan email utama tetap
   `.ConfirmationURL` Supabase: jangan diganti URL buatan atau shortener.
6. Authentication → Email Templates → Reset Password: subject
   `Atur ulang kata sandi BahasaCerdas Anda`; paste seluruh
   `supabase/templates/recovery.html`. Atur expiry OTP **3600 detik** dan minimum
   interval **60 detik**. Lokal memakai `supabase/config.toml`; commit file itu
   tidak mengubah konfigurasi Auth hosted. Jangan `supabase config push` tanpa
   meninjau seluruh konfigurasi karena dapat menimpa pengaturan lain.
7. Hosting web: set `APP_URL=https://bahasacerdas.com`, Supabase public URL dan
   anon/publishable key, `UPSTASH_REDIS_REST_URL` dan
   `UPSTASH_REDIS_REST_TOKEN`. Variabel SMTP di `.env.example` adalah referensi
   konfigurasi **Dashboard**, bukan pipeline pengiriman web. Tidak perlu service
   role untuk endpoint ini. Redis yang sama harus digunakan semua instance.
8. **Batas native SMTP Supabase:** pengaturan templat HTML tidak menyediakan
   field Reply-To arbitrer atau input plain-text terpisah. `EMAIL_REPLY_TO` dan
   `SUPPORT_EMAIL` hanya mendokumentasikan target mailbox; tidak otomatis mengubah
   header atau Go template. Bila alamat bantuan berbeda, perbarui kedua templat.
   Plain text ada di `supabase/templates/recovery.txt`, tetapi tidak diklaim aktif
   hanya karena file tersedia. Periksa MIME email nyata. Bila plain-text atau
   Reply-To tidak sesuai, gunakan Send Email Hook terverifikasi untuk memanggil
   provider dengan `html`, `text`, `reply_to`; jangan membuat token alternatif.
   Hook tersebut belum diimplementasikan di perubahan ini. Provider harus membuat
   Message-ID yang valid. Jangan menambahkan List-Unsubscribe/promosi ke recovery.

## Pemeriksaan dan penerimaan

- `npm run email:preview`: menulis HTML dan teks contoh ke direktori sementara;
  tidak mengirim email dan tidak memakai token nyata. Brand diambil dari token
  terang `app/theme/tokens.css`; inline hex diperlukan untuk klien email yang
  tidak mendukung CSS variables. CSS dark-mode hanya peningkatan opsional.
- `npm run test:password-recovery`: validasi email, respons unknown-email,
  kegagalan/429 provider, batas per email/IP dan konkurensi lokal, template.
  Expiry, single-use dan invalidasi token dikelola Supabase, perlu uji integrasi.
- `npm run lint`, `npm run typecheck`, `npm run build`.
- Dengan akun uji yang Anda kuasai: minta reset dari /login; banner sukses harus
  berwarna status sukses, tombol terkunci 60 detik. Email tidak dikenal mendapat
  pesan sukses sama. Permintaan keempat dalam 15 menit mendapat 429 + Retry-After.
- Uji Gmail, Outlook, Yahoo dan akun sekolah Google Workspace yang Anda kuasai.
  Pastikan From `BahasaCerdas <noreply@bahasacerdas.com>`, CTA dan fallback sama,
  tampilan ponsel/Outlook rapi. Link Supabase bukan domain brand dan tidak boleh
  disamarkan menjadi URL brand yang berbeda; SiteURL/footer tetap domain brand.
- Klik tautan di peramban baru, set kata sandi ≥8 karakter, konfirmasi cocok,
  lihat pesan sukses /login dan masuk dengan sandi baru. Uji session lain setelah
  signOut global: refresh token dicabut; access token dapat berlaku sampai expiry.
- Buka ulang tautan yang sudah dipakai dan tautan kedaluwarsa: harus muncul
  permintaan tautan baru. Uji pula fragment error Supabase. Jangan mengganti sandi
  akun pengguna lain untuk pengujian. Jangan menyimpan link/token nyata di Git/log.
- Gmail → Show original: SPF=PASS, DKIM=PASS, DMARC=PASS, periksa alignment domain,
  Return-Path dan multipart/alternative berisi text/plain serta text/html. Ulangi
  dengan mailbox uji mail-tester.com; jangan unggah email pengguna asli. Nonaktifkan
  click tracking provider pada link auth supaya token tidak dibuka scanner/tracker.
- Inbox placement tidak bisa dijamin lewat kode atau DNS; hasil juga bergantung
  reputasi domain/IP, kebijakan sekolah, filter penerima dan laporan spam. Catat
  hasil nyata per provider sebelum mengklaim pengiriman end-to-end selesai.

Referensi: https://supabase.com/docs/guides/auth/auth-smtp,
https://supabase.com/docs/guides/auth/auth-email-templates,
https://supabase.com/docs/guides/auth/passwords.
