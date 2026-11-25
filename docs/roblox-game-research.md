# Riset game Roblox BahasaCerdas

Dokumen ini mengubah riset retensi, game edukasi, dan panduan kreator Roblox menjadi aturan desain, lalu menjadi rancangan tiga place: **Benar atau Salah**, **Susun Kata**, dan **NUSANTARA: Kebangkitan Bahasa**.

Disusun untuk pembangunan di atas lobi Alun-Alun Aksara (universe `10778759021`). Audiens peluncuran 16+. Semua teks pemain berbahasa Indonesia. Tidak ada fitur yang bergantung pada chat. Tidak ada tautan ke luar Roblox.

Riset saudaranya, yang sudah disetujui untuk lobi, ada di desain Kota Aksara. Dokumen ini tidak mengulang cerita kabut Si Galat. Ia mengunci cara ketiga game lain terasa seperti permainan, bukan lembar soal.

## 1. Apa yang membuat game Roblox bertahan

### 1.1 Loop, bukan konten

Dokumentasi Roblox membagi core loop menjadi tiga lapis: interaksi menit-ke-menit, aksi yang paling sering diulang, dan mesin progres. Tanpa mesin progres, aksi yang sama terasa dangkal.

Sumber: [Core loops](https://create.roblox.com/docs/production/game-design/core-loops).

Untuk kuis bahasa, lapisannya:

| Lapis | Benar atau Salah | Susun Kata | NUSANTARA |
|---|---|---|---|
| Menit ke menit | Baca papan, lari atau ketuk | Sentuh balok, susun, kunci | Jelajah, bicara, pilih jurus |
| Aksi yang diulang | Putusan benar/salah dalam 5–15 detik | Satu kata atau satu kalimat | Satu misi pendek |
| Mesin progres | Bintang, rentetan, kartu, misi harian | Sama, plus jembatan yang menyala | Wilayah, jurus, Penjaga Makna |

Naavik (Februari 2024) membandingkan dua game edukasi di Roblox. Math Answer or Die, kuis cepat dengan lava yang naik, menahan pemain sekitar 7 menit. Mission: Mars, yang konten kurikulumnya lebih tebal tetapi terasa seperti tugas, sekitar 3 menit. Kunjungan Math Answer or Die jauh lebih besar. Lua Learning menang Bloxy Most Educational Game 2020 karena tutorialnya adalah permainannya.

Sumber: [The Future of Education Games](https://naavik.co/digest/edu-games-future/).

Angka sesi itu masih sejalan dengan pelacak publik pada 2026: sesi Math Answer or Die bertahan di kisaran 7 menit, sementara median game besar di laporan GameAnalytics 2026 sekitar 9,8 menit per sesi, dan median retensi D1 di sampel game besar hanya 10,3% (D7 1,6%, D30 0,5%). Game edukasi tidak boleh berharap pemain "tahan karena pelajarannya". Ia harus menang di loop dan di alasan untuk kembali besok.

Sumber: [Creator Exchange, Math Answer or Die](https://creatorexchange.io/roblox-game/4362911786/math-answer-or-die), [GameAnalytics Roblox Benchmark 2026](https://gameindustrylibrary.com/documents/key-roblox-and-roblox-game-metrics-2026).

### 1.2 Onboarding di bawah 30 detik

Panduan onboarding Roblox mengukur FTUE dari retensi hari pertama dan dari bocoran funnel. Tiga praktik yang disebut eksplisit: ajarkan yang esensial, cepat sampai ke bagian seru, dan tinggalkan tujuan yang membuat pemain ingin kembali. Dokumentasi retensi menyarankan pemain mencapai bagian seru idealnya dalam 5 menit, dengan tutorial singkat, bukan kuliah. Level awal harus cepat terasa, dan hadiah pertama harus nyata.

Sumber: [Onboarding](https://create.roblox.com/docs/production/game-design/onboarding), [Retention](https://create.roblox.com/docs/production/analytics/retention).

Keputusan untuk ketiga game: pemain yang baru masuk sudah memegang soal pertama sebelum detik ke-20. Tidak ada menu kesulitan yang wajib. Mode Santai mulai sendiri. Penjelasan aturan paling banyak satu kalimat dari tokoh, plus gerbang atau balok yang sudah ada di depan kaki. Funnel yang diukur lewat `LogCustomEvent` dari server: `spawn`, `first_answer`, `first_correct`, `round_done`.

### 1.3 Belajar adalah aksinya

Gagal yang dihindari Mission: Mars: layar kuis menempel di dunia yang sebenarnya tidak membutuhkannya. Math Answer or Die dan gerbang lobi Kota Aksara melakukan kebalikannya. Jawaban adalah gerakan.

Karena itu:

- Benar atau Salah tetap bisa dimainkan dengan lari menembus gerbang, bukan hanya tombol.
- Susun Kata menaruh balok di dunia. Ketukan adalah cara yang sama untuk jempol di HP.
- NUSANTARA memakai jurus kata sebagai "serangan" pada kabut makna. Bos tidak punya nyawa angka yang diisi pukulan. Fase bos diisi jawaban.

Ilmu belajar yang sudah dipakai lobi tetap berlaku. Latihan mengingat mengalahkan membaca ulang (Adesope dkk., 2017, g = 0,51). Soal yang salah masuk antrean ulang di sesi berikutnya. Akurasi per keterampilan adalah rata-rata bergerak: di atas kira-kira 0,82 naik ke soal lebih halus, di bawah kira-kira 0,45 kembali ke soal yang lebih jelas.

Sumber: [Adesope, Trevisan, dan Sundararajan, 2017](https://journals.sagepub.com/doi/10.3102/0034654316689306).

### 1.4 Retensi harian tanpa chat

Roblox mengukur D1, D7, dan D30 per kohort tanggal main pertama. Chat bukan syarat. Di Indonesia, aturan usia membatasi chat untuk pemain muda, dan peluncuran kita 16+ tetap tidak boleh menggantungkan misi pada kotak obrolan.

Sumber: [Retention](https://create.roblox.com/docs/production/analytics/retention). Desain lobi sudah mencatat PP Tunas dan filter teks.

Pengganti sosial yang tidak butuh chat:

- Pemain lain terlihat di place yang sama. Rentetan tampil di atas kepala, bukan di chat.
- Papan peringkat mingguan memakai OrderedDataStore yang sama dengan lobi (`WeeklyStars_` + kunci minggu WIB) untuk dua game Kota Aksara. Bintang yang baru didapat di sub-place ikut menaikkan angka minggu itu.
- Misi harian dan peti 7 hari membaca profil yang sama dengan Alun-Alun. Main di Benar atau Salah mengisi "jawab 5 soal dengan benar" dan misi mingguan.
- Streak memakai dua pelindung, batas yang sama dengan lobi. Duolingo menemukan dua streak freeze menambah pemain harian. Freeze ketiga tidak menambah.

Sumber streak: catatan desain Kota Aksara ke wawancara Duolingo, Desember 2024.

NUSANTARA universe terpisah (`10778596245`). DataStore Roblox tidak menyeberang experience. Koin dan bintang di sana adalah simpanan petualangan itu, dengan kode yang sama, bukan saldo lobi. Jembatan web (kode tautan, sesi, lencana) tetap dicoba. Kalau secret atau HTTP tidak ada, permainan jalan di DataStore lokal.

### 1.5 Umpan balik

Pembicaraan desain yang sudah menjadi bahasa umum industri, "Juice It or Lose It" (Martin Jonasson dan Petri Purho, Nordic Game 2012), menunjukkan bahwa permainan yang aturannya sama terasa jauh lebih hidup kalau setiap aksi punya jawaban gambar, gerak, dan suara dalam sepersekian detik. Roblox mengulang prinsip yang sama di halaman retensi: hadiah loop berupa umpan balik, mata uang, barang, dan pencapaian.

Terapan yang kita pakai, semua dari aset bawaan:

- Benar: kilat lembut, percik `sparkles_main.dds`, `electronicpingshort.wav`, papan mengangguk, rentetan naik.
- Salah: kilat koral singkat, `hit.wav`, penjelasan satu kalimat. Tidak ada jatuh ke void dan tidak ada nyawa habis di kuis.
- Selesai ronde: `victory.wav`, bintang, koin yang angkanya tertulis.
- Tombol: `switch.wav`.

Teks penjelasan selalu muncul. Juice tidak menggantikan alasan jawaban.

### 1.6 Adil

- Kunci jawaban tidak pernah dikirim ke klien. Klien menerima pernyataan, atau balok yang sudah diacak.
- Nilai dihitung di server. Klien tidak mengirim skor.
- Jawaban di bawah 0,55 detik ditolak sebagai terlalu cepat.
- Mode Santai tidak punya timer dan bintang maksimum 2. Mode Tantangan yang punya timer dan bintang 3. Pemain memilih, dan Santai selalu ada.
- Warna bukan satu-satunya pembeda. Gerbang dan tombol bertuliskan Benar atau Salah.
- Dialek dan bahasa daerah bukan "jawaban salah". Soal NUSANTARA yang menyentuh ini mengatakan sebaliknya: bahasa daerah sah di rumah dan di komunitasnya. Kaidah baku dipakai untuk tulisan resmi.
- Tidak ada Robux, tidak ada kotak acak, tidak ada bayar untuk menang. Kosmetik lobi tetap dibeli dengan koin di menu yang sama.

### 1.7 HP, jempol, dan mesin lemah

Sekitar tiga perempat sesi Roblox ada di HP (angka yang dikutip Naavik dari Roblox, 2024). Jempol kiri memegang tongkat, jempol kanan dekat tombol lompat. Tombol aksi kita duduk di atas zona itu, tinggi 56 piksel, dua tombol berdampingan, cukup untuk layar 360 piksel. Target sentuh yang lebih kecil dari kira-kira 48 piksel layar sering meleset. World prompt (`ProximityPrompt`, tahan 0 detik, tanpa line of sight) dipakai untuk tokoh, portal, dan prasasti supaya tidak perlu membidik piksel.

Sumber praktik jempol: [Tumblix, mobile-first Roblox](https://tumblixstudios.com/blog/roblox-mobile-first-design). Ukuran target sentuh yang diukur komunitas: [RoClicks, GUI and input](https://roclicks.gg/resources/ui/gui-input-facts).

Performa, dari panduan streaming Roblox:

- `StreamingEnabled`, perilaku model Improved, integritas PauseOutsideLoadedArea, radius minimum 64.
- Radius target place ini 384, bukan default 1024. Peta kita kecil. HP tidak perlu memuat dunia yang tidak kelihatan.
- Dekor `CanTouch`, `CanQuery`, dan `CastShadow` dimatikan. Hanya gerbang, pemicu, dan lantai yang bertumbukan.
- Tidak ada Union, tidak ada mesh berbayar, tidak ada tekstur unduhan. Bahan SmoothPlastic, Wood, Grass, dan sedikit Neon.
- Model gerbang dan portal `ModelStreamingMode.Atomic` kalau enumnya ada, supaya tidak streaming setengah.

Sumber: [Streaming techniques](https://create.roblox.com/docs/en-us/workspace/streaming/techniques.md).

### 1.8 Data yang tidak mengunci pemain

Panduan DataStore Roblox: sedikit store, satu kunci per pemain, salinan di memori, simpan berkala dan saat keluar, `UpdateAsync` kalau beberapa server bisa menulis kunci yang sama, `pcall`, dan jangan menulis setiap jawaban.

Sumber: [Data store best practices](https://create.roblox.com/docs/cloud-services/data-stores/best-practices).

Kita memakai store lobi `PlayerData_v1` dan kunci `u_<userId>` untuk Benar atau Salah dan Susun Kata, dengan bentuk data yang sama (koin, bintang, kartu, misi, streak, kosmetik, antrean web, kunci sesi). Penulisan dibungkus batas waktu 6 detik saat masuk dan 4 detik saat menyimpan. Kalau kunci sesi lobi masih dipegang atau studio menolak API, permainan jalan di memori dan mengatakan itu terus terang. Tidak ada spin tanpa batas.

NUSANTARA memakai `Nusantara_v1` di experience-nya sendiri.

### 1.9 Tampilan 2026 yang bisa dibangun dari part

Game Roblox yang ramai dibaca dari jauh: siluet besar, warna sedikit, cahaya hangat, sudut membulat, hampir tidak ada teks kecil di dunia. "Grow a Garden" dan sejenisnya menang karena dunia terasa bisa ditinggali, bukan karena material realistis.

Palet yang sudah dipakai lobi tetap kanun: krem piring `255,247,232`, tinta `18,24,40`, teal, kunyit, koral, kayu. UI piring krem, sudut 12, garis kayu tipis, teks Gotham atau BuilderSans 15–18, `AutoLocalize = false` pada soal supaya penerjemah otomatis Roblox tidak mengubah ejaan yang sedang diuji.

Sumber terjemahan otomatis: dokumentasi Roblox tentang automatic translations, sudah dirujuk desain lobi.

Tidak ada URL, tidak ada nama domain, di skrip klien maupun modul bersama.

### 1.10 Kurva

Menit pertama tidak bisa kalah: soal paling jelas, tanpa timer, salah hanya memberi penjelasan lalu soal berikutnya. Ronde Santai 8 soal (Benar atau Salah) atau 6 susunan (Susun Kata). Bintang Santai: separuh benar = 1, sekitar 85% = 2. Tantangan menambah waktu dan bintang 3 hanya kalau akurasi dan waktu sama-sama baik. NUSANTARA tidak mengunci wilayah kedua di belakang bos. Jawa dan pesisir Sumatra sama-sama terbuka dari dermaga. Enam wilayah lain terlihat, bertuliskan menyusul, supaya tujuan jangka panjang ada tanpa pura-pura kontennya sudah jadi.

## 2. Aturan desain yang mengikat pembangunan

1. Soal pertama tampil tanpa menu wajib.
2. Jawaban adalah gerak atau ketukan besar, dan keduanya diterima server.
3. Klien tidak menerima kunci, tidak mengirim skor, tidak menaruh alamat web.
4. Salah menjelaskan. Tidak mengurangi nyawa. Tidak melempar pemain ke void.
5. Santai selalu ada. Timer hanya di Tantangan, dan disebut sebelum ronde.
6. Koin, bintang, kartu, misi, streak, dan kosmetik Kota Aksara satu profil dengan lobi.
7. NUSANTARA simpanan sendiri. Tidak ada teleport ke place lobi `83804286143888` karena universe-nya berbeda. Teleport lintas experience tidak kita andalkan.
8. Dua game Kota Aksara punya jalan pulang ke lobi.
9. Bahasa daerah tidak dijadikan musuh. Musuhnya kabut makna: ejaan, kata tidak baku di ranah resmi, kalimat yang subjeknya ganda.
10. Bank soal modul data. Skrip Python di CI menolak id dobel, sebaran timpang, kalimat yang baloknya bentrok, dan jawaban yang tidak cocok dengan balok.
11. HTTP dan secret gagal pelan. Place tetap bisa dimainkan.
12. Teks pemain Bahasa Indonesia, pendek, tanpa emoji.

## 3. Benar atau Salah

Place tujuan: `94365112072969` (universe Kota Aksara).

Berkas: `roblox/places/benar-salah/default.project.json` → `build/BenarAtauSalah.rbxl`.

### Fantasi

Lapangan Putusan. Di ujung ada papan pernyataan. Dua gerbang setinggi rumah: kiri Benar (teal), kanan Salah (koral). Pemain lari menembus gerbang yang sesuai, atau mengetuk tombol yang sama di bawah layar.

### Loop satu ronde

1. Masuk. Tokoh Pak Putusan satu kalimat. Soal pertama sudah di papan dan di kartu atas.
2. Delapan pernyataan. Mode awal Santai.
3. Benar: rentetan, koin, kartu kata kalau kata itu baru.
4. Salah: penjelasan EYD V atau bentuk baku, masuk antrean ulang.
5. Akhir ronde: bintang masuk `stars.bs_santai` atau `stars.bs_tantang`. Bintang baru ikut total lobi, jadi ikut membuka distrik.
6. Papan misi dan peti harian ada di menu yang sama dengan lobi.

### Isi bank

Lebih dari 70 pernyataan, tingkat 1–3, campuran benar dan salah yang tidak timpang. Ranah: huruf kapital, kata depan `di`/`ke` lawan imbuhan, tanda baca, kata ulang, dan bentuk baku yang diajarkan di sekolah (praktik, apotek, risiko, mengubah, memengaruhi, analisis, sistem, izin, silakan, antara … dan …). Setiap butir punya penjelasan sendiri. Glosarium kartu adalah kalimat pengajaran yang ditulis untuk game ini, bukan kutipan kamus.

### Yang sengaja tidak ada

Tidak ada nyawa, tidak ada papan peringkat yang menghukum pemain lambat di mode Santai, tidak ada soal yang hanya bisa dijawab kalau pemain sudah membaca artikel di luar game.

## 4. Susun Kata

Place tujuan: `137487012250171`.

Berkas: `roblox/places/susun-kata/default.project.json` → `build/SusunKata.rbxl`.

### Fantasi

Bengkel Aksara. Balok huruf dan balok kata tersusun di rak. Jembatan batu di depan pemain menyala satu per satu saat urutan dikunci dengan benar. Salah tidak mematahkan jembatan sampai kesempatan ronde itu habis.

### Dua meja

- **Susun Huruf.** Balok satu huruf, diacak. Arti singkat tampil sebagai petunjuk, katanya tidak. Empat sampai sepuluh huruf, huruf Latin kecil, supaya jempol tidak kebanjiran balok.
- **Susun Kalimat.** Balok kata yang sudah termasuk pola SPOK atau kalimat efektif pendek. Urutan yang benar hanya satu karena tidak ada dua balok dengan tulisan yang sama.

Enam susunan per ronde. Tiga kunci yang salah di satu susunan mengungkap jawaban dan dihitung meleset, supaya pemain tidak tersangkut. Mode Tantangan menambah waktu (huruf lebih ketat daripada kalimat).

### Isi bank

Puluhan kata sehari-hari seputar bahasa (aksara, ejaan, paragraf, sinonim, pidato, amanat, dan seterusnya) dengan arti pendek karangan sendiri. Puluhan kalimat yang urutannya diajarkan di sekolah: subjek–predikat–objek–keterangan, bukan teka-teki sastra.

Bintang: `sk_huruf` dan `sk_kalimat`.

## 5. NUSANTARA: Kebangkitan Bahasa

Experience sendiri: universe `10778596245`, root place `135622689114243`.

Berkas: `roblox/places/nusantara/default.project.json` → `build/Nusantara.rbxl`.

Ini irisan vertikal, bukan delapan wilayah jadi. Peta dermaga menunjukkan delapan gapura. Dua bisa dimasuki. Enam bertuliskan menyusul.

### Dermaga Nusantara

Pelabuhan kecil, air teal, perahu dari wedge, batu peta di tengah. Dari sini pemain membaca janji tempat: delapan wilayah, tokoh, misi, jurus, sudut rahasia, Penjaga Makna. Tidak ada paragraf pembuka yang panjang. Gapura Jawa dan gapura Pesisir Sumatra sudah menyala.

### Wilayah 1 — Gapura Jawa

Mbok Leksika berdiri di bawah gapura. Misinya:

1. **Kuis singkat.** Lima pernyataan tentang bahasa persatuan dan ranah baku. Bahasa Jawa disebut sebagai bahasa daerah yang sah, bukan sebagai kesalahan.
2. **Jurus kata.** Kabut kecil melayang ke pemain. Tiga jurus (tiga kata) muncul. Jurus yang tepat menghapus kabut. Yang salah hanya mendorong pemain pelan dan mengulang pilihan yang sama. Empat jurus tersimpan di koleksi.
3. **Sudut rahasia.** Celah di antara batu, prasasti sekali sentuh, kartu dan koin.

Setelah kuis Jawa selesai, jalan ke Penjaga Makna terbuka. Tidak menunggu Sumatra.

### Wilayah 2 — Pesisir Sumatra

Rumah panggung sederhana dan Cik Malaya. Empat pernyataan: bahasa Indonesia tumbuh dari bahasa Melayu, Sumpah Pemuda 28 Oktober 1928 di Jakarta bukan "bahasa diciptakan hari itu", dan dialek bukan kesalahan. Satu prasasti rahasia di balik rumah.

### Penjaga Makna

Arena lingkaran di ujung jalan Jawa. Tiga fase, tanpa batang nyawa:

1. Empat soal pilihan. Setiap benar menaikkan pena cahaya di tengah arena.
2. Empat balok kata disusun menjadi kalimat semboyan, sementara tiga gumpal kabut mengitari arena. Tersentuh gumpal mengosongkan susunan, tidak membunuh.
3. Enam pernyataan cepat. Sekitar 70% dari seluruh fase yang ternilai cukup untuk menang.

Kalau menang: bintang `ns_penjaga`, koin, kalimat penutup yang mengingatkan bahwa penjaga makna bukan musuh bahasa daerah. Pemain kembali ke dermaga dan boleh mengulang.

Simpanan `Nusantara_v1` menyimpan koin, bintang, kartu, misi, streak, dan kemajuan wilayah. Kode tautan web tetap ada di menu. XP situs tidak dikarang dari soal lokal. Soal lokal dinilai di server place. Setor XP akun tetap lewat lobi, tempat soal terbitan situs sudah ada.

## 6. Berkas dan place

| Place | Universe | Place ID tujuan | Proyek Rojo | Hasil bangun |
|---|---|---|---|---|
| Benar atau Salah | `10778759021` | `94365112072969` | `roblox/places/benar-salah/default.project.json` | `build/BenarAtauSalah.rbxl` |
| Susun Kata | `10778759021` | `137487012250171` | `roblox/places/susun-kata/default.project.json` | `build/SusunKata.rbxl` |
| NUSANTARA | `10778596245` | `135622689114243` | `roblox/places/nusantara/default.project.json` | `build/Nusantara.rbxl` |
| Lobi (sudah ada) | `10778759021` | `83804286143888` | `roblox/default.project.json` | `build/KotaAksara-Lobby.rbxl` |

Gerbang lama di lobi sudah memanggil ketiga place ID itu lewat `TeleportService`. Place ini pengganti isi yang diterbitkan ke ID yang sama. Tidak ada publish dari repositori.

## 7. Batas yang diketahui

- Enam wilayah NUSANTARA belum dibangun. Gapuranya ada supaya peta tidak berbohong.
- Tidak ada suara orkestra dan tidak ada mesh katalog. Bentuk dari part.
- XP web untuk soal lokal tidak dikirim, karena endpoint hasil mengharapkan soal terbitan situs. Lencana dicoba saat tonggak tercapai. Kalau kodenya belum ada di tabel Badge, server web menolak dan place tidak macet.
- DataStore studio sering mati sampai API Services dinyalakan. Place memberitahu pemain dan tetap main di memori.
- Cuplikan layar Studio tidak dibuat di mesin ini. Tidak ada perender tanpa kepala.
- Raid Si Galat, Adu Cepat, dan delapan wilayah penuh tetap di luar irisan ini.
