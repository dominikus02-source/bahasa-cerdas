# Paket persiapan pendaftaran BahasaCerdas

Disiapkan 3 Oktober 2026. Status: BELUM TDPSE, berdasarkan pernyataan pengelola. Dokumen ini berisi draft isian dan bukti yang perlu dipenuhi; bukan tanda daftar atau pernyataan lolos verifikasi.

## Identitas yang sudah tersedia

| Isian | Nilai / bukti |
|---|---|
| Pelaku usaha pada Sertifikat Standar OSS yang diverifikasi | Dominikus Wahyu Heru Cahyadi |
| Nama usaha pada OSS | Teras Kata |
| Referensi internal yang perlu direkonsiliasi | CV Obah Mamah — jangan diperlakukan sebagai pemegang NIB sampai dokumen CV/NIB-nya diverifikasi |
| Nama sistem | BahasaCerdas |
| NIB | 1217000151443 |
| Sertifikat Standar | 12170001514430001 |
| KBLI | 62199 — Aktivitas Pemrograman Komputer Lainnya YTDL |
| Alamat kantor OSS | JL. TUNTANG III NO.7, Bencongan, Kelapa Dua, Kabupaten Tangerang, Banten |
| Lokasi kegiatan OSS | Jalan Klungkung No.13 RT/RW 004/020, Bencongan, Kelapa Dua, Kabupaten Tangerang, Banten 15810 |
| Narahubung | Dominikus Wahyu Heru Cahyadi |
| Email | halo@bahasacerdas.com |
| Domain yang diaudit di repo | www.bahasacerdas.com / bahasacerdas.com |
| Domain tambahan dalam proposal | bahasacerdas.site (BIGT); operasionalnya harus dikonfirmasi dan diaudit tersendiri jika berbeda sistem |
| Nomor TDPSE | Belum ada; jangan isi NIB atau nomor permohonan hak cipta di kolom ini |

Sumber identitas utama: dokumen resmi OSS **PERIZINAN BERUSAHA BERBASIS RISIKO Teras Kata.pdf** yang telah diverifikasi dari arsip internal. Proposal yang menyebut CV Obah Mamah tidak dipakai untuk mengubah identitas pemegang NIB tanpa dokumen CV/NIB yang sah. Lihat **LEGAL_IDENTITY_RECONCILIATION.md**. Hak cipta EC002026106361 disebut masih dalam proses dan berbeda dari izin/pendaftaran PSE.

## Draft gambaran pengoperasian

Platform pendidikan Bahasa Indonesia untuk guru dan murid: akun, kelas, materi/Bank Soal, tugas, latihan/simulasi, progres dan badge, karya pengguna serta interaksi kelas, permainan bersama, alat AI advisory dan transaksi materi/paket. Model usaha: layanan gratis dan berbayar, pembelian materi, subscription/paket, komisi guru sesuai produk yang diaktifkan. Jelaskan fungsi per PLF, bukan hanya menyebut "website pendidikan".

Data yang diproses: identitas akun/kontak dan autentikasi; usia/consent wali; data sekolah/kelas; tugas/jawaban/rekaman/karya; progres/hasil/reward; interaksi/pelaporan; pesanan dan bukti pembayaran/pencairan; log keamanan. Rincian tujuan/dasar/hak/retensi berada di notice serta register pemrosesan. Nomor kartu penuh dan kata sandi bank tidak diperlukan oleh aplikasi.

Lokasi: vercel.json sin1; catatan proyek Supabase Singapura. Region database, Auth, backup, Redis, email dan AI harus ditulis berdasarkan dashboard/kontrak, bukan asumsi dari domain vendor. Daftar processor ada di VENDOR_REGISTER.csv. IP hosting Vercel dinamis: konfirmasi metode pengisian OSS tanpa menebak IP tetap.

## Langkah administrasi pengelola

1. Cocokkan akta, NIB, KBLI dan izin usaha yang relevan dengan model layanan. Lengkapi alamat korespondensi, penanggung jawab dan kuasa bila digunakan.
2. Masuk OSS dengan akun badan usaha; pilih PB-UMKU/Pendaftaran PSE Lingkup Privat. Gunakan panduan resmi terbaru dan gambaran pengoperasian di atas.
3. Lengkapi fungsi sistem, model bisnis, domain, data pribadi, lokasi pemrosesan/penyimpanan, serta pernyataan keamanan/PDP setelah bukti implementasi benar-benar tersedia.
4. Konfirmasi permohonan sesuai OSS, unduh TDPSE jika terbit, cocokkan daftar publik Komdigi dan simpan nomor/dokumen. Jangan tampilkan logo/nomor sebelum terbit.
5. Siapkan penilaian mandiri pelindungan anak per produk, layanan dan fitur; TDPSE tidak menggantikan proses PP TUNAS.

## Gate sebelum menyatakan siap operasional / mengajukan pernyataan kepatuhan

- [ ] Alamat/legal identity sesuai akta dan NIB/KBLI yang relevan.
- [ ] Migrasi privasi dan RLS diterapkan setelah backup serta uji staging; aplikasi baru dan schema dirilis bersama. Tidak dilakukan pada produksi dalam pekerjaan lokal ini.
- [ ] Snapshot metadata awal menunjukkan 19 tabel bergantung grant tanpa RLS. Pastikan migrasi private-api-boundary menutup akses langsung, termasuk jawaban Main Bersama dan tabel agent; bukti uji role anon/authenticated wajib.
- [ ] Kebijakan lama untuk User/Profile/StudentKarya/storage diperiksa hingga ekspresi policy: RLS=true sendiri belum membuktikan aman.
- [ ] Data anak/rekaman/hasil assessment lama di bucket publik dipetakan dan dipindahkan secara terkontrol ke bucket privat; jangan menutup seluruh dokumen berbayar/gambar sekaligus hingga akses sah diperbaiki.
- [ ] Wali reviewer ditunjuk; email consent, kewenangan wali serta usia anak diverifikasi proporsional dan bukti hanya referensi, bukan KTP publik.
- [ ] Riwayat AI/provider/transfer telah dievaluasi dalam DPIA dan kontrak pemrosesan; larangan pelatihan model umum serta retensi vendor dikonfirmasi.
- [ ] Penilaian mandiri PP TUNAS per PLF selesai dengan evidensi; hanya kemudian CHILD_LOW_RISK_APPROVAL dan evidence ref dapat diaktifkan sesuai hasil yang benar. Env tidak boleh menjadi pengganti bukti hukum.
- [ ] Mekanisme consent kelas tamu/Main Bersama diselesaikan sebelum membuka untuk anak; nama samaran tidak menghapus kewajiban pelindungan data.
- [ ] Jadwal retensi aktif, purge diverifikasi, backup retention dan uji pemulihan + replay deletion selesai.
- [ ] Moderator on-call, pengelolaan hak subjek data dan jalur breach teruji; kanal halo@bahasacerdas.com aktif dan dapat menerima permintaan.
- [ ] Penanggung jawab PDP/DPO dievaluasi berdasarkan kewajiban hukum dan skala/pemrosesan aktual, termasuk perkembangan putusan terkait Pasal 53.

Sumber: [panduan resmi PSE/OSS](https://pse.komdigi.go.id/pertanyaan-umum), [UU PDP](https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/crc32/), [PP 17/2025](https://peraturan.bpk.go.id/Details/316698/pp-no-17-tahun-2025), [Permenkomdigi 9/2026](https://jdih.komdigi.go.id/produk_hukum/katalog/1007). [Komdigi, evaluasi September 2026](https://portal.komdigi.go.id/kanal-publik/berita-kini/10541) mengumumkan kesempatan menyelesaikan self-assessment sampai 31 Desember 2026; lakukan segera dan cek instruksi portal saat pengajuan.
