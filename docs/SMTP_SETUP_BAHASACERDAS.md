# BahasaCerdas — SMTP untuk reset kata sandi

## Supabase Cloud (produksi)

`supabase/config.toml` hanya berlaku saat konfigurasi Supabase CLI/self-hosted diterapkan. **Perubahan file tidak otomatis mengubah SMTP proyek Supabase Cloud.** Pada Supabase Dashboard → Authentication → SMTP Settings, aktifkan Custom SMTP dan isi nilai dari penyedia SMTP:

| Pengaturan | Nilai |
| --- | --- |
| Sender email | `noreply@bahasacerdas.com` (alamat/domain harus diverifikasi di penyedia) |
| Sender name | `BahasaCerdas` |
| SMTP host | Host resmi penyedia SMTP (bukan tebakan) |
| SMTP port | `587` bila penyedia mendukung STARTTLS; jika tidak ikuti dokumentasi penyedia |
| SMTP username | Kredensial penyedia SMTP |
| SMTP password | Rahasia penyedia; jangan commit atau kirim lewat chat |

Pastikan DNS domain memiliki SPF dan DKIM sesuai petunjuk penyedia, serta DMARC yang sesuai. Verifikasi domain di penyedia sebelum mengaktifkan. Di Authentication → URL Configuration, tambahkan `https://bahasacerdas.com/reset-password` pada redirect allowlist (dan host `www` hanya bila benar-benar digunakan). Atur Site URL ke URL produksi yang benar.

Di Authentication → Email Templates → Reset Password, gunakan template `supabase/templates/recovery.html` dan pertahankan variabel Supabase `{{ .ConfirmationURL }}`. Template repository tidak otomatis terpasang ke proyek Cloud.

## Supabase CLI/self-hosted

`supabase/config.toml` membaca `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD` dari environment saat konfigurasi diterapkan. Port saat ini `587`; sesuaikan dengan penyedia bila diperlukan. Jangan memasukkan secret ke `.env` yang di-commit.

## Verifikasi tanpa membocorkan akun

1. Periksa Authentication → Logs pada Supabase untuk error SMTP, rate limit, template atau redirect.
2. Dari `/login`, uji `Lupa kata sandi?` menggunakan akun uji yang Anda miliki; periksa inbox dan spam.
3. Klik tautan dan pastikan `/reset-password` terbuka dengan sesi pemulihan yang valid, lalu ubah password dan login ulang.
4. Uji input tidak valid dan batas permintaan. Pesan ke pengguna harus tetap netral terhadap keberadaan akun.

Jika Supabase Cloud tidak memiliki custom SMTP yang aktif, file `config.toml` ini **tidak** memperbaiki pengiriman produksi sampai dashboard dikonfigurasi.