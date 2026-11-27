# BahasaCerdas: Kota Aksara dan Kabut Galat

MVP Roblox untuk lobi **Alun-Alun Aksara** dan distrik pertama **Pasar Ejaan** (EYD V). Semua teks pemain berbahasa Indonesia. Proyek ini memakai [Rojo](https://rojo.space/).

Place yang sudah terbit:

| | |
|---|---|
| Universe | `10778759021` |
| Grup | `741001776` |
| Place lobi (root) | `83804286143888` |

## Yang sudah bisa dimainkan

- Alun-Alun: Pohon Aksara (13 buah, dua pertama menyala dari bintangmu), 6 portal distrik, papan misi, peti 7 hari, peringkat mingguan, toko kosmetik (koin saja), kios kode tautan, dan ucapan Mbak Nara.
- Tiga gerbang tutorial di depan pohon. Jawaban benar memberi confetti, suara, koin, dan rentetan.
- Pasar Ejaan di dalam place yang sama: Lapak Kapital, Gang Tanda Baca, dan mini-boss Raksasa Typo. Mode Santai (tanpa waktu, bintang maks 2) dan Tantangan (waktu, bintang 3).
- Portal utara membawa pemain ke pasar tanpa pindah place. Distrik lain menampilkan **segera hadir**.
- Gerbang lama tetap ada: Benar atau Salah (`94365112072969`), Susun Kata (`137487012250171`), dan NUSANTARA (`135622689114243`).
- Bank lokal 70+ soal EYD V. Kunci jawaban hanya di server. Klien tidak pernah mengirim skor.
- DataStore `PlayerData_v1` dengan kunci sesi, simpan ulang, dan antrean kalau HTTP putus.
- Pemain yang menautkan akun bisa **Setor XP** lewat soal yang diterbitkan situs. Soal pasar tetap dinilai di server game supaya umpan balik langsung.

## Pasar Ejaan belum place terpisah

Open Cloud tidak bisa membuat place baru. Sampai pemilik membuatnya, Pasar Ejaan dibangun di dalam place lobi (sekitar 430 stud di utara) dan portal hanya memindahkan karakter.

File kedua sudah siap diunggah setelah place baru ada:

| Berkas proyek | Hasil `rojo build` | Unggah ke |
|---|---|---|
| `default.project.json` | `build/KotaAksara-Lobby.rbxl` | place root `83804286143888` |
| `places/pasar-ejaan.project.json` | `build/KotaAksara-PasarEjaan.rbxl` | place baru di universe yang sama |

Setelah place baru punya id, isi `PasarPlaceId` di `src/shared/Config.luau`, lalu bangun dan terbitkan ulang lobi. Portal akan memakai `TeleportService`. Berkas pasar sudah punya gerbang kembali ke `83804286143888`.

## Membangun

Dari folder `roblox/`:

```bash
curl -fsSL https://raw.githubusercontent.com/rojo-rbx/rokit/v1.2.0/scripts/install.sh | bash
export PATH="$HOME/.rokit/bin:$PATH"
rokit install --no-trust-check
bash tools/build.sh
```

`rokit.toml` memasang Rojo 7.7.1, Selene, dan StyLua. CI menjalankan lint, cek bank soal, dan mengunggah kedua `.rbxl` sebagai artifact.

## Sinkron di Studio

1. Pasang plugin Rojo.
2. Buka `build/KotaAksara-Lobby.rbxl` (berkas utuh, bukan tambalan di atas lobi lama).
3. Atau, dari folder `roblox/`: `rojo serve` lalu sambungkan plugin ke `localhost:34872`.
4. Tekan Play. Tiga gerbang pertama ada di selatan pohon. Portal **Pasar Ejaan** ada di utara.

Jangan menyambungkan Rojo ke place lama yang masih berisi skrip lobi sebelumnya. Skrip lama (`NaturalWorld` menunggu `Gerbang_rpg`, `QA_MODE` menyala) tidak dipakai lagi.

## Uji cepat

1. Masuk. Mbak Nara menyapa. Lari menembus gerbang yang kalimatnya benar, atau ketuk tombol di kanan bawah.
2. Tiga soal tutorial selesai: +koin, gelar Penjaga Muda. Tombol **Lewati** ada bagi yang sudah tahu.
3. Masuk portal Pasar Ejaan. Pilih Santai atau Tantangan.
4. Naik atap joglo di kiri pasar untuk Kartu Kata tersembunyi.
5. Buka Menu: misi, hadiah 7 hari, toko, album, peringkat, tautan.
6. Teleport Benar/Salah, Susun Kata, dan NUSANTARA hanya jalan di aplikasi Roblox setelah place diterbitkan, bukan di Play Solo.

Di Studio, DataStore sering gagal sampai **Game Settings → Security → Enable Studio Access to API Services** dinyalakan. Kalau gagal, permainan tetap jalan di memori dan memberi tahu pemain.

## Pengaturan yang harus dinyalakan pemilik

Di Creator Dashboard untuk universe `10778759021`:

1. **Security → Allow HTTP Requests**.
2. Secret `BAHASACERDAS_ROBLOX_KEY`, domain terkunci ke `www.bahasacerdas.com`. Nilainya sama dengan `ROBLOX_SERVER_SECRET` di `web.env`. Server membacanya lewat `HttpService:GetSecret`, lalu `AddPrefix("Bearer ")`, plus header `x-roblox-timestamp` (milidetik 13 digit) dan `x-request-id`.
3. Bahasa sumber: Indonesia. Teks soal memakai `AutoLocalize = false`.
4. Access Settings: usia minimum 16, sesuai rencana peluncuran.
5. Untuk uji simpan data dari Studio: Enable Studio Access to API Services.

Tanpa secret atau tanpa HTTP, kota tetap bisa dimainkan. Koin, bintang, kartu, dan misi tersimpan di DataStore. XP situs hanya lewat Setor XP untuk pemain yang sudah menautkan kode. Tidak ada tautan yang bisa diketuk. Teks kios: "Punya kode tautan? Masukkan di sini untuk menyimpan XP-mu."

Kontrak situs: `docs/roblox-integration.md` pada PR web (belum digabung). Lencana `roblox-kota-aksara` dan `roblox-pasar-ejaan` hanya terbuka kalau barisnya sudah ada di tabel Badge.

## Yang sengaja belum ada

- Distrik 2–6, Adu Cepat, raid Si Galat, regu, dan mode kelas.
- Suara dan partikel memakai aset bawaan Roblox (`rbxasset://sounds/...`, `rbxasset://textures/particles/...`), bukan katalog berbayar.
- Cuplikan layar belum dibuat: di mesin ini tidak ada perender Studio tanpa kepala.
- Menerbitkan `.rbxl` lobi menimpa place root. Coba dulu di place uji di universe yang sama kalau belum siap mengganti lobi yang sedang tayang.
