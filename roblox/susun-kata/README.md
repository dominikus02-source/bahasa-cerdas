# Susun Kata Roblox — kandidat pengembangan (belum dipublikasikan)

Sumber aturan: `components/game/SusunKata.tsx` pada branch main. Bank kata: **173 kata dan makna**, langsung dari array `SCRAMBLE_WORDS` dalam komponen. Data tersimpan hanya di `ServerScriptService/WordBank.lua`.

## Implementasi
- 12 tingkat asli, setiap tingkat mempunyai jumlah ronde, batas panjang kata, dan waktu masing-masing.
- Tiga nyawa, acak huruf, mengetuk untuk menyusun, kesempatan mencoba ulang ketika salah.
- Skor server: `150 + ceil(sisa_detik)*5 + streak*15` sesuai komponen web, bintang per rerata poin 60/170/260, XP maksimal 60.
- Server menetapkan kata jawaban, urutan huruf, nonce per ronde, waktu, nyawa, dan skor. Klien hanya mengirim indeks huruf; indeks ganda, kadaluwarsa, dan di luar ronde ditolak.
- Progres lokal Roblox disimpan melalui DataStore (bukan akun web BC); di Studio yang belum mengizinkan API, DataStore mungkin tidak tersedia.
- Tempat permainan 3D sederhana sebagai fondasi; UI ramah PC/HP. Musik belum ditambahkan agar tidak menggunakan aset tanpa izin.

## Langkah uji
1. Build: `rojo build default.project.json -o SusunKata-QA.rbxl`.
2. Buka di Roblox Studio lalu Play Solo; pilih tingkat 1, selesaikan 6 kata.
3. Uji jawaban benar, salah, habis waktu, kehilangan 3 nyawa, combo, bintang, dan tombol kembali.
4. Uji Local Server 2 pemain untuk memastikan ronde/penilaian terisolasi.
5. Uji Device Emulator untuk ponsel sempit serta landscape.
6. Teleport kembali baru dapat diuji melalui aplikasi Roblox setelah place resmi diterbitkan.

**Belum siap publik:** place Roblox dan PlaceId Susun Kata belum ada; gerbang lobby tidak boleh diberi PlaceId yang ditebak. QA Studio, uji mobile, dan akses usia belum lulus. Tidak ada penggunaan Robux.

## QA perbaikan Benar atau Salah
Pada branch QA yang sama: karakter simbol UI yang rusak dipulihkan, serta tombol keyboard WASD (A/D) tidak lagi mengirim jawaban tanpa sengaja; input jawaban memakai arah kiri/kanan atau B/S.
