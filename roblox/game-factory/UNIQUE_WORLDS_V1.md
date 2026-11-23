# BahasaCerdas Roblox — 13 Dunia Unik v1

Status: source diterapkan di branch pengembangan; belum Play Solo untuk revisi ini dan belum publik.

Setiap proyek memiliki UniqueWorlds.lua yang dihubungkan ke WorldKit.lua. Peta pulau dasar dipertahankan untuk gameplay, tetapi landmark, palet, dan siluet dunia dibedakan.

| Game | Dunia | Landmark utama |
|---|---|---|
| Benar atau Salah | Aula Putusan Aksara | Dua gerbang keputusan, podium hijau dan koral |
| Susun Kata | Bengkel Huruf | Konveyor, balok huruf, roda mesin |
| Tebak Kata | Perpustakaan Rahasia | Rak melingkar dan kristal petunjuk |
| Menara Cerdas | Menara Pengetahuan | Menara bertingkat dan mahkota |
| Irama Kata | Panggung Festival Bahasa | Empat jalur ritme dan speaker |
| Petualangan Kata | Hutan Kata Nusantara | Pepohonan dan tiga zona kata |
| Bermain Kata | Taman Permainan Aksara | Empat panggung mode dan lampion |
| Teka-Teki Silang | Kuil Kisi Aksara | Kisi dekoratif 9 × 9 dan pilar |
| Lari Kata | Lintasan Bahasa Cepat | Trek dan finis |
| Kuis Tempur | Arena Duel Cerdas | Dua podium dan perisai aksara |
| Tantang Teman | Plaza Tantangan | Meja dan bangku tantangan |
| Adu Cepat | Stasiun Kilat | Rel cepat dan jam menara |
| Pendekar Suryakerta | Kerajaan Aksara Nusantara | Pendopo dan menara kerajaan |

## Perlindungan gameplay
Perubahan ini hanya pada lingkungan 3D; tidak mengubah jumlah ronde, soal, jawaban, skor, akses premium, PlaceId, ataupun teleport. Bangunan dekoratif (misalnya kisi dan jumlah lantai menara) bukan perubahan level permainan. Arena yang sebelumnya preview tetap preview.

## Pemeriksaan wajib sebelum rilis
1. Jalankan python roblox/game-factory/qa_unique_worlds.py untuk integritas sumber.
2. Rebuild semua file .rbxl dengan Rojo dari source terbaru; build terdahulu tidak otomatis terbarui.
3. Play Solo pada lima game prioritas; periksa landmark, kamera, spawn, dan log [BC UniqueWorld].
4. Periksa jalur permainan dan UI tidak tertutup properti, lalu ambil screenshot aktual.
5. Uji Device Emulator, dua pemain, dan FPS pada perangkat fisik kelas menengah.
6. Publikasikan hanya place yang lulus QA menggunakan PlaceId resmi. Jangan ubah NUSANTARA publik.

Kendala saat perubahan: koneksi Remote Desktop Commander terputus. Karena itu build dan Play Solo untuk revisi unik ini BELUM terverifikasi.
