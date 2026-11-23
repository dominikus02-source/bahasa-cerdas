# KOTA AKSARA LANGIT — NATURAL WORLD v2 (kandidat)

**Status:** source siap direview di GitHub. **Belum dibuild atau diuji di Roblox Studio**, karena PC/Roblox Studio belum tersedia untuk QA saat penyusunan tahap ini. Ini bukan game publik baru dan tidak mengubah NUSANTARA yang sedang publik.

## Arah artistik
Pulau langit tetap menjadi dunia fantasi edukatif BahasaCerdas, tetapi dengan **palet alam** dan hierarki visual yang lebih nyaman:
- **Warna alam:** hijau sage, hijau hutan, kayu hangat, batu pasir, gading, biru langit pucat, air hijau-biru.
- **Merek:** BC violet sebagai aksen pada karakter AKSI, pintu kategori dan signage, tidak digunakan sebagai cat seluruh tanah/gedung.
- **Penanda pendidikan:** Buku melayang dan menara pena adalah landmark; tidak menutupi pintu, kamera, atau jalur menuju permainan.
- **Gaya:** rounded, chunky, stylized low-poly; material Grass, Slate, WoodPlanks, Concrete, SmoothPlastic; efek cahaya hemat.
- **Pengalaman:** dunia mudah dibaca tanpa kabut tebal, glare, atau saturasi berlebihan. Tidak menciptakan hadiah/ekonomi fiktif.

## Apa yang berubah dalam kode
| Komponen | Pelaksanaan |
|---|---|
| Palet | `src/ReplicatedStorage/NaturalTheme.lua` sebagai satu sumber warna, kategori dan parameter efek |
| Lingkungan | `NaturalWorld.server.lua`: menata ulang warna pulau, 13 gerbang, rumah baca, perpustakaan, menara, batu, awan dan buku |
| Taman | 13 kantong taman di **antara** 13 jalur radial; setiap kantong memiliki pohon, batu, bunga dan bangku |
| Kedalaman | 7 pulau kecil di horizon supaya dunia terasa luas tanpa mengisi jalur utama |
| Cahaya | siang hangat, Atmosphere halus, Bloom yang sangat ringan, saturasi lebih natural |
| Maskot | AKSI memakai ungu lavender, mawar lembut dan emas hangat |
| NUSANTARA | gerbang khusus berubah menjadi batu/kayu dengan portal kaca air lembut; TeleportService/PlaceId tidak diubah |
| HUD | kartu navy-ke-hijau gelap, teks gading, tombol aksen alami, pesan sambutan lebih ringan, pengaturan Efek Normal/Hemat |
| Performa | pada mode hemat, Bloom/ColorCorrection lokal bisa dimatikan dan animasi dekoratif lokal dijeda |
| Keandalan | marker `BCLobbyReady` dan `KotaDecorReady` mencegah recolor mendahului konstruksi map |

## Riset teknis
Prinsip rancangan diambil dari sumber **resmi Roblox Creator Hub**:
- Performance design: https://create.roblox.com/docs/performance-optimization/design
- Global lighting and atmosphere: https://create.roblox.com/docs/environment
- Post-processing: https://create.roblox.com/docs/environment/post-processing-effects
- UI/UX multi-platform: https://create.roblox.com/docs/production/game-design/ui-ux-design
- Roblox first-time user experience: https://create.roblox.com/docs/production/game-design/design-for-roblox

Roblox menyarankan pengujian pada perangkat mobile acuan yang benar-benar digunakan, bukan menganggap Studio Emulator sebagai bukti FPS/komsumsi memori. **Target 60 FPS, minimal 30 FPS belum diuji**.

## Manual QA wajib saat PC aktif
1. `rojo build roblox/bc-lobby/default.project.json -o KotaAksara-Natural-v2.rbxl`.
2. Roblox Studio Play Solo: tidak ada error atau infinite yield; verifikasi marker siap, 13 pintu, perpustakaan, AKSI, taman dan gerbang NUSANTARA.
3. Lihat kamera awal dan gerakan kembali ke karakter. Periksa apakah pusat plaza tidak tertutup tanaman atau tanda.
4. Jalan menuju **ketiga belas** gerbang. Tidak boleh ada pohon, bangku, atau bangunan yang menutup jalur.
5. Uji NUSANTARA/Benar atau Salah info panel dan tombol; teleport lintas place diuji dari aplikasi Roblox, **bukan** dari Play Solo.
6. Uji pada 360×800, 390×844, 768×1024 dan 1366×768 di Device Emulator. Ukuran tombol dan teks harus tetap nyaman dibaca.
7. Bandingkan Efek Normal vs Hemat. Pastikan Bloom nonaktif dan animasi berhenti hanya pada klien penguji.
8. Uji dua klien Local Server, jaringan lambat, respawn, dan tidak adanya error dari AKSI.
9. Ukur FPS/render calls/memori di HP fisik kelas menengah dan laptop rendah. Jangan menyatakan 30/60 FPS PASS berdasarkan hasil Rojo saja.
10. Screenshot asli kamera aerial dan jalan kaki harus disimpan sebelum PR di-merge.

## Batasan
- Belum ada build maupun screenshot terbaru dari revisi Natural World.
- Music/SFX masih menunggu aset dengan hak penggunaan yang jelas dan asset ID Roblox.
- Pintu 13 game belum semuanya playable; beberapa memang placeholder.
- Tidak mengubah status akses publik, usia, database atau mengeluarkan Robux.
- Tidak melakukan konversi otomatis game HTML baru pada revisi visual ini.

## QA otomatis yang bisa berjalan tanpa Studio
`python3 roblox/bc-lobby/qa/check_natural_world.py` memeriksa referensi konfigurasi dan wiring statis, **bukan** parser Luau atau pengujian runtime. Workflow `.github/workflows/roblox-lobby-natural-qa.yml` menjalankan pemeriksaan ini pada branch proyek.
