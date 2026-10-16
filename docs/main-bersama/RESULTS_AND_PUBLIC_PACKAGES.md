# Main Bersama: hasil kelas dan akses paket

Setelah permainan berakhir, panel **Simpan & bagikan hasil** menyediakan:

- Pilihan kelas aktif milik guru. Nilai disimpan ke kategori Main Bersama di Buku Nilai. Kelas dapat dipilih setelah permainan, termasuk sesi yang awalnya tanpa kelas.
- Pembaruan hasil sesi yang sama tanpa menggandakan nilai. Bobot kategori yang sudah diatur guru tetap dipertahankan.
- Nilai hanya untuk akun yang menjadi anggota kelas tujuan dan sudah memperoleh kesempatan menjawab. Siswa terlambat bergabung dinilai dari soal yang diikutinya. Peserta tamu tetap tersedia dalam CSV.
- Draf email/WhatsApp, salin pesan, dan CSV. Ringkasan pesan tidak menyertakan identitas siswa secara default; guru dapat mengaktifkan rinciannya dan memeriksa pratinjau sebelum mengirim. Aplikasi tidak mengirim pesan secara otomatis.

Pada **Pilih paket soal**, tab **Paket saya** menyediakan pengaturan Privat/Publik untuk paket lama maupun baru. Paket baru tetap privat secara default. Tab **Publik dari guru** menyediakan pencarian dan pemilihan paket publik untuk pratinjau/permainan. Hanya pemilik yang dapat mengubah akses. Menjadikan paket privat kembali menolak penggunaan oleh guru lain untuk permainan baru; snapshot sesi yang sudah dibuat tetap utuh.

Implementasi memakai SoalSet.isPublic, Group/GroupMember, NilaiKategori/Nilai, dan data sesi Main Bersama yang sudah ada. Tidak ada migrasi database.

## Verifikasi

```sh
npm run test:main-bersama-results-sharing
TEST_DATABASE_URL='postgresql://user@localhost:5432/mbtest' npm run test:main-bersama-results-db
npm run build
```

Tes database wajib memakai database lokal `mbtest`. Guard menolak URL produksi. Cakupan: kepemilikan sesi/kelas, fase ringkasan/selesai, siswa terlambat bergabung, anggota kelas, identitas lama, penyimpanan serentak tanpa duplikasi, bobot kategori, penelusuran/pemakaian paket publik, serta pencabutan akses publik.
