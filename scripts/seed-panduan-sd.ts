// @ts-nocheck
import { db } from "../lib/db"

type Soal = { id: number; soal: string; opsi: string[]; jawaban: number; penjelasan: string }
type Konten = {
  belajar: { tujuan: string[]; materi: { judul: string; isi: string[]; contoh: string[]; catatan?: string }[]; rangkuman: string[] }
  latihan: Soal[]
  praktik: { petunjuk: string; tips: string[]; contoh?: string }
  kuis: Soal[]
}
function makeSoal(arr: [string, string[], number, string][]): Soal[] {
  return arr.map(([soal, opsi, jawaban, penjelasan], i) => ({ id: i + 1, soal, opsi, jawaban, penjelasan }))
}

function buatKonten(tujuan: string[], materiJudul: string, materiIsi: string[], latihanArr: [string, string[], number, string][], praktikPetunjuk: string, kuisArr: [string, string[], number, string][]): Konten {
  return {
    belajar: {
      tujuan,
      materi: [{ judul: materiJudul, isi: materiIsi, contoh: [] }],
      rangkuman: materiIsi.filter(l => l.startsWith("R:")).map(l => l.replace("R:", "")),
    },
    latihan: makeSoal(latihanArr),
    praktik: { petunjuk: praktikPetunjuk, tips: [] },
    kuis: makeSoal(kuisArr),
  }
}

const levels = [
  // === KELAS I SEMESTER 1 ===
  {
    level: 13, grade: "I", semester: 1, title: "Kelas I Semester 1", description: "Bunyi dan huruf, membaca permulaan, menulis permulaan, kosa kata",
    bab: [
      ["Bab 1: Bunyi dan Huruf", "3.1/4.1", "HURUF", ["Mengenal bunyi huruf", "Membedakan bunyi", "Melafalkan huruf"], "Mengenal Bunyi Huruf", ["Huruf adalah lambang bunyi.", "Ada 26 huruf: A sampai Z.", "Setiap huruf punya bunyi berbeda.", "R:Ada 26 huruf A-Z dengan bunyi berbeda."], [["Huruf A berbunyi...", ["Be", "A", "Ce"], 1, ""], ["Jumlah huruf dalam alfabet...", ["20", "26", "30"], 1, ""]], "Sebutkan 5 huruf vokal dengan bunyinya.", [["Huruf B dibaca...", ["A", "Be", "Ce"], 1, ""], ["Yang termasuk huruf vokal...", ["A, I, U", "B, C, D", "K, L, M"], 0, ""]]],
      ["Bab 2: Membaca Permulaan", "3.2/4.2", "MEMBACA", ["Membaca suku kata", "Membaca kata", "Membaca kalimat"], "Belajar Membaca", ["Suku kata: gabungan huruf.", "ba-bi-bu-be-bo: suku kata.", "Gabung suku jadi kata: ba+ju = baju.", "R:Membaca: suku kata → kata → kalimat."], [["ba + ju = ...", ["baju", "baja", "biji"], 0, ""], ["ka + ki = ...", ["kaki", "kakek", "kaku"], 0, ""]], "Baca kalimat: Ini ibu Budi.", [["Gabungan ma + ta = ...", ["mata", "mati", "madu"], 0, ""], ["Bu + ku = ...", ["buku", "buka", "bumi"], 0, ""]]],
      ["Bab 3: Menulis Permulaan", "3.3/4.3", "MENULIS", ["Menulis huruf", "Menulis kata", "Menulis kalimat"], "Belajar Menulis", ["Cara memegang pensil yang benar.", "Tebalkan garis putus-putus.", "Tiru tulisan guru.", "R:Menulis: tebalkan → tiru → tulis sendiri."], [["Pegang pensil dengan...", ["Kiri", "Kan", "Kiri/Kanan"], 2, ""], ["Duduk menulis harus...", ["Tiduran", "Tegak", "Miring"], 1, ""]], "Tulis namamu sendiri dengan rapi.", [["Tulisan pertama diajari dengan...", ["Huruf sambung", "Huruf cetak", "Huruf kapital"], 1, ""], ["Sebelum menulis sebaiknya...", ["Makan", "Menggambar garis", "Berlari"], 1, ""]]],
      ["Bab 4: Kosa Kata", "3.4/4.4", "KOSAKATA", ["Memahami arti kata", "Menggunakan kata", "Bercerita dengan kata"], "Kata dan Maknanya", ["Kata benda: nama orang, hewan, benda.", "Kata kerja: kegiatan (makan, tidur, lari).", "Kata sifat: besar, kecil, panjang.", "R:Kata: benda, kerja, sifat."], [["'Meja' termasuk kata...", ["Benda", "Kerja", "Sifat"], 0, ""], ["'Berlari' termasuk kata...", ["Benda", "Kerja", "Sifat"], 1, ""]], "Sebutkan 3 kata benda di kelasmu.", [["'Cantik' termasuk kata...", ["Benda", "Kerja", "Sifat"], 2, ""], ["'Ibu' termasuk kata...", ["Benda", "Kerja", "Sifat"], 0, ""]]],
    ],
  },
  // === KELAS I SEMESTER 2 ===
  {
    level: 14, grade: "I", semester: 2, title: "Kelas I Semester 2", description: "Kalimat sederhana, membaca cerita, menulis cerita, puisi anak",
    bab: [
      ["Bab 1: Kalimat Sederhana", "3.5/4.5", "KALIMAT", ["Menyusun kalimat", "Mengenal SP", "Menulis kalimat"], "Kalimat Sederhana", ["Kalimat: gabungan kata yang utuh.", "Subjek + Predikat: Ibu memasak.", "Awali dengan huruf kapital, akhiri titik.", "R:Kalimat: SP, kapital, titik."], [["Kalimat 'Adik tidur' terdiri dari...", ["SP", "SPO", "K"], 0, ""], ["Awali kalimat dengan huruf...", ["Kecil", "Kapital", "Tebal"], 1, ""]], "Buat 2 kalimat tentang keluargamu.", [["Tanda akhir kalimat berita...", ["Tanya", "Titik", "Seru"], 1, ""], ["'Ayah membaca' kalimat...", ["Tanya", "Berita", "Seru"], 1, ""]]],
      ["Bab 2: Membaca Cerita", "3.6/4.6", "CERITA", ["Memahami cerita", "Menjawab pertanyaan", "Menceritakan ulang"], "Membaca Dongeng", ["Dongeng: cerita khayal anak-anak.", "Tokoh: orang atau hewan.", "Pesan moral: nasihat baik.", "R:Dongeng: cerita khayal dengan pesan."], [["Dongeng termasuk cerita...", ["Nyata", "Khayal", "Sejarah"], 1, ""], ["Tokoh dalam dongeng bisa...", ["Hewan bicara", "Batu", "Angka"], 0, ""]], "Ceritakan ulang dongeng Kancil dan Buaya.", [["Pesan moral adalah...", ["Judul", "Nasihat baik", "Tokoh"], 1, ""], ["Kancil dalam dongeng dikenal...", ["Malas", "Cerdik", "Kuat"], 1, ""]]],
      ["Bab 3: Menulis Cerita", "3.7/4.7", "CERITA", ["Menulis cerita", "Urutan cerita", "Mengembangka ide"], "Menulis Cerita Sederhana", ["Awal: pengenalan tokoh.", "Tengah: kejadian.", "Akhir: penyelesaian.", "R:Cerita: awal, tengah, akhir."], [["Bagian awal cerita berisi...", ["Pengenalan", "Masalah", "Selesai"], 0, ""], ["Akhir cerita disebut...", ["Pembuka", "Penutup", "Isi"], 1, ""]], "Tulis cerita 3 kalimat tentang liburan.", [["Cerita yang baik harus...", ["Berurutan", "Acak", "Pendek"], 0, ""]]],
      ["Bab 4: Puisi Anak", "3.8/4.8", "PUISI", ["Mengenal puisi", "Membaca puisi", "Menulis puisi"], "Puisi untuk Anak", ["Puisi: ungkapan perasaan dengan kata indah.", "Rima: bunyi yang sama di akhir.", "Puisi anak sederhana dan pendek.", "R:Puisi: ungkapan perasaan dengan rima."], [["Puisi biasanya menggunakan kata...", ["Indah", "Kasar", "Panjang"], 0, ""], ["Bunyi sama di akhir baris disebut...", ["Kata", "Rima", "Judul"], 1, ""]], "Buat puisi 4 baris tentang ibuku.", [["Puisi anak bertema...", ["Cinta", "Lingkungan", "Sehari-hari"], 2, ""]]],
    ],
  },
  // === KELAS II SEMESTER 1 ===
  {
    level: 15, grade: "II", semester: 1, title: "Kelas II Semester 1", description: "Membaca pemahaman, menulis kalimat, dongeng, pengumuman",
    bab: [
      ["Bab 1: Membaca Pemahaman", "3.1/4.1", "MEMBACA", ["Memahami bacaan", "Menemukan informasi", "Menjawab pertanyaan"], "Membaca dan Memahami", ["Baca dalam hati, pahami isinya.", "Cari tokoh, tempat, kejadian.", "Tanya: apa, siapa, di mana, kapan.", "R:Membaca: pahami tokoh, tempat, kejadian."], [["Sebelum membaca sebaiknya...", ["Bernyanyi", "Tenang dan fokus", "Berlari"], 1, ""], ["'Siapa' menanyakan...", ["Tempat", "Orang", "Waktu"], 1, ""]], "Baca teks 'Kebun Binatang', jawab 3 pertanyaan.", [["'Di mana' menanyakan...", ["Orang", "Tempat", "Cara"], 1, ""]]],
      ["Bab 2: Menulis Kalimat", "3.2/4.2", "MENULIS", ["Menulis SPO", "Mengembangka kalimat", "Menulis paragraf"], "Kalimat Lengkap", ["SPO: Subjek, Predikat, Objek.", "Adik memakan kue.", "Ibu mencuci piring.", "R:Kalimat SPO: S+P+O."], [["'Ayah' dalam kalimat sebagai...", ["Predikat", "Subjek", "Objek"], 1, ""], ["'memasak' adalah...", ["Subjek", "Predikat", "Objek"], 1, ""]], "Buat 2 kalimat SPO tentang kegiatan sekolah.", [["Objek dalam 'Kakak membaca buku'...", ["Buku", "Kakak", "Membaca"], 0, ""]]],
      ["Bab 3: Dongeng", "3.3/4.3", "DONGENG", ["Memahami dongeng", "Tokoh dan watak", "Pesan moral"], "Mengenal Dongeng", ["Dongeng: cerita rakyat turun-temurun.", "Tokoh: protagonis (baik), antagonis (jahat).", "Watak: sifat tokoh.", "R:Dongeng: cerita rakyat, tokoh baik-jahat."], [["Tokoh baik disebut...", ["Antagonis", "Protagonis", "Figuran"], 1, ""], ["Kancil bersifat...", ["Cerdik", "Malas", "Sombong"], 0, ""]], "Ceritakan dongeng Bawang Merah Bawang Putih.", [["Amanat adalah...", ["Judul", "Pesan dalam cerita", "Tokoh"], 1, ""]]],
      ["Bab 4: Pengumuman", "3.4/4.4", "PENGUMUMAN", ["Memahami pengumuman", "Unsur pengumuman", "Menulis pengumuman"], "Apa Itu Pengumuman?", ["Pengumuman: informasi untuk umum.", "Unsur: judul, isi, waktu, tempat, penanggung jawab.", "Bahasa: singkat, jelas, lengkap.", "R:Pengumuman: judul, isi, waktu, tempat."], [["Pengumuman berisi...", ["Cerita", "Informasi", "Puisi"], 1, ""], ["Batas waktu termasuk...", ["Judul", "Isi", "Penutup"], 1, ""]], "Buat pengumuman lomba mewarnai.", [["Penanggung jawab di...", ["Awal", "Akhir", "Tengah"], 1, ""]]],
    ],
  },
  // === KELAS II SEMESTER 2 ===
  {
    level: 16, grade: "II", semester: 2, title: "Kelas II Semester 2", description: "Puisi anak, pantun anak, cerita rakyat, laporan sederhana",
    bab: [
      ["Bab 1: Puisi Anak", "3.5/4.5", "PUISI", ["Mengenal puisi", "Membaca ekspresif", "Menulis puisi"], "Membaca Puisi", ["Ekspresi: raut wajah sesuai isi.", "Intonasi: naik turun suara.", "Lafal: ucapkan kata dengan jelas.", "R:Puisi: ekspresi, intonasi, lafal."], [["Membaca puisi harus...", ["Tertawa", "Ekspresif", "Diam"], 1, ""], ["Intonasi adalah...", ["Gerak", "Naik turun suara", "Lafal"], 1, ""]], "Baca puisi 'Ibu' dengan ekspresi.", [["Puisi anak bertema...", ["Dewasa", "Cinta dan alam", "Politik"], 1, ""], ["'Indah' termasuk kata...", ["Benda", "Sifat", "Kerja"], 1, ""]]],
      ["Bab 2: Pantun Anak", "3.6/4.6", "PANTUN", ["Mengenal pantun", "Ciri pantun", "Membuat pantun"], "Pantun Anak", ["Pantun: 4 baris, a-b-a-b.", "Baris 1-2 sampiran, 3-4 isi.", "Pantun anak berisi nasihat.", "R:Pantun: 4 baris, a-b-a-b."], [["Sajak pantun adalah...", ["a-a-a-a", "a-b-a-b", "a-b-b-a"], 1, ""], ["Isi pantun di baris...", ["1-2", "3-4", "2-3"], 1, ""]], "Buat pantun tentang rajin belajar.", [["Sampiran adalah...", ["Isi", "Hiasan", "Judul"], 1, ""], ["Pantun anak bersifat...", ["Nasihat", "Sedih", "Marah"], 0, ""]]],
      ["Bab 3: Cerita Rakyat", "3.7/4.7", "CERITA_RAKYAT", ["Memahami cerita rakyat", "Nilai budaya", "Menceritakan ulang"], "Cerita Rakyat Daerah", ["Cerita rakyat dari berbagai daerah.", "Legenda: asal-usul tempat.", "Fabel: cerita hewan.", "R:Cerita rakyat: legenda dan fabel."], [["Malin Kundang dari...", ["Jawa", "Sumatera Barat", "Bali"], 1, ""], ["Fabel adalah cerita tentang...", ["Manusia", "Hewan", "Dewa"], 1, ""]], "Ceritakan ulang legenda daerahmu.", [["Keong Emas dari...", ["Jawa Timur", "Jawa Barat", "Jawa Tengah"], 1, ""]]],
      ["Bab 4: Laporan Sederhana", "3.8/4.8", "LAPORAN", ["Mengamati", "Mencatat", "Melaporkan"], "Laporan Hasil Pengamatan", ["Amati benda di sekitarmu.", "Catat: nama, ciri, warna, bentuk.", "Sampaikan dengan kalimat runtut.", "R:Laporan: amati, catat, sampaikan."], [["Sebelum melapor harus...", ["Menggambar", "Mengamati", "Berlari"], 1, ""], ["Laporan disampaikan...", ["Bernyanyi", "Runtut", "Cepat"], 1, ""]], "Amati tanaman di halaman, buat laporan lisan.", [["Isi laporan:...", ["Pendapat", "Hasil pengamatan", "Cerita"], 1, ""]]],
    ],
  },
  // === KELAS III SEMESTER 1 ===
  {
    level: 17, grade: "III", semester: 1, title: "Kelas III Semester 1", description: "Teks deskripsi, petunjuk, dongeng, laporan, puisi",
    bab: [
      ["Bab 1: Teks Deskripsi", "3.1/4.1", "DESKRIPSI", ["Memahami deskripsi", "Ciri objek", "Menulis deskripsi"], "Mendeskripsikan Benda", ["Deskripsi: gambaran benda secara rinci.", "Ciri: warna, bentuk, ukuran, rasa.", "Gunakan kata sifat: besar, kecil, indah.", "R:Deskripsi: gambaran dengan kata sifat."], [["Kata 'bulat' termasuk...", ["Benda", "Kerja", "Sifat"], 2, ""], ["Teks deskripsi membuat pembaca...", ["Menangis", "Membayangkan", "Tertawa"], 1, ""]], "Deskripsikan boneka atau mainan kesayanganmu.", [["Objek deskripsi bisa...", ["Benda", "Perasaan", "Angka"], 0, ""]]],
      ["Bab 2: Teks Petunjuk", "3.2/4.2", "PETUNJUK", ["Memahami petunjuk", "Urutan langkah", "Melakukan petunjuk"], "Petunjuk Melakukan Sesuatu", ["Petunjuk: langkah berurutan.", "Kata: pertama, kedua, ketiga.", "Gunakan kalimat perintah.", "R:Petunjuk: langkah berurutan."], [["Petunjuk diawali kata...", ["Pertama", "Akhir", "Mungkin"], 0, ""], ["Kalimat perintah diakhiri...", ["Titik", "Tanya", "Seru/titik"], 2, ""]], "Tulis petunjuk cara menanam biji kacang.", [["Tujuan petunjuk...", ["Menghibur", "Memandu", "Menceritakan"], 1, ""]]],
      ["Bab 3: Dongeng", "3.3/4.3", "DONGENG", ["Memahami dongeng", "Struktur", "Menulis dongeng"], "Struktur Dongeng", ["Awal: situasi awal.", "Konflik: masalah muncul.", "Penyelesaian: masalah selesai.", "R:Dongeng: awal, konflik, penyelesaian."], [["Bagian masalah disebut...", ["Awal", "Konflik", "Akhir"], 1, ""], ["Penyelesaian ada di...", ["Awal", "Tengah", "Akhir"], 2, ""]], "Tulis dongeng pendek 4-5 kalimat.", [["Tokoh dongeng bisa...", ["Hewan", "Batu", "Air"], 0, ""]]],
      ["Bab 4: Laporan", "3.4/4.4", "LAPORAN", ["Mengamati", "Mencatat data", "Menulis laporan"], "Menulis Laporan", ["Judul: sesuai kegiatan.", "Isi: apa, di mana, hasil.", "Penutup: kesimpulan.", "R:Laporan: judul, isi, penutup."], [["Judul laporan harus...", ["Panjang", "Sesuai kegiatan", "Indah"], 1, ""], ["Kesimpulan di bagian...", ["Awal", "Tengah", "Akhir"], 2, ""]], "Buat laporan cara membuat jus jeruk.", [["Laporan disusun secara...", ["Acak", "Sistematis", "Bebas"], 1, ""]]],
      ["Bab 5: Puisi", "3.5/4.5", "PUISI", ["Unsur puisi", "Majas sederhana", "Menulis puisi"], "Unsur Puisi", ["Diksi: pilihan kata yang tepat.", "Rima: bunyi akhir baris.", "Majas: personifikasi (benda seperti manusia).", "R:Puisi: diksi, rima, majas."], [["'Angin menari' termasuk majas...", ["Personifikasi", "Metafora", "Hiperbola"], 0, ""], ["Bunyi akhir sama disebut...", ["Diksi", "Rima", "Majas"], 1, ""]], "Tulis puisi 4 baris tentang lingkungan.", [["Diksi artinya...", ["Pilihan kata", "Bunyi", "Majas"], 0, ""]]],
    ],
  },
  // === KELAS III SEMESTER 2 ===
  {
    level: 18, grade: "III", semester: 2, title: "Kelas III Semester 2", description: "Surat pribadi, wawancara, cerita fantasi, iklan, pantun",
    bab: [
      ["Bab 1: Surat Pribadi", "3.6/4.6", "SURAT", ["Mengenal surat", "Bagian surat", "Menulis surat"], "Surat untuk Sahabat", ["Surat pribadi: untuk teman/keluarga.", "Bagian: tanggal, salam, isi, penutup.", "Bahasa santai dan akrab.", "R:Surat pribadi: santai, akrab."], [["Pembuka surat pribadi...", ["Yth.", "Untuk sahabatku", "Kepada"], 1, ""], ["Penutup surat pribadi...", ["Hormat saya", "Sahabatmu", "Wassalam"], 1, ""]], "Tulis surat untuk teman yang pindah kota.", [["Bahasa surat pribadi...", ["Resmi", "Santai", "Ilmiah"], 1, ""]]],
      ["Bab 2: Wawancara", "3.7/4.7", "WAWANCARA", ["Memahami wawancara", "Menyusun pertanyaan", "Melakukan wawancara"], "Apa Itu Wawancara?", ["Wawancara: tanya jawab dengan narasumber.", "Siapkan daftar pertanyaan.", "Catat jawaban narasumber.", "R:Wawancara: tanya jawab dengan narasumber."], [["Orang yang diwawancarai disebut...", ["Wartawan", "Narasumber", "Penonton"], 1, ""], ["Pertanyaan harus...", ["Panjang", "Jelas dan tertib", "Sulit"], 1, ""]], "Wawancarai teman tentang hobinya.", [["Hal pertama wawancara...", ["Perkenalan", "Langsung tanya", "Pulang"], 0, ""]]],
      ["Bab 3: Cerita Fantasi", "3.8/4.8", "FANTASI", ["Memahami fantasi", "Unsur keajaiban", "Menulis fantasi"], "Cerita Khayal", ["Cerita fantasi: penuh imajinasi.", "Tokoh: peri, naga, penyihir.", "Latar: istana, negeri dongeng.", "R:Fantasi: imajinasi, tokoh ajaib."], [["Cerita fantasi bersifat...", ["Nyata", "Khayal", "Sejarah"], 1, ""], ["Contoh tokoh fantasi...", ["Kancil", "Peri", "Budi"], 1, ""]], "Tulis cerita 4 kalimat tentang negeri awan.", [["Latar fantasi biasanya...", ["Sekolah", "Negeri dongeng", "Pasar"], 1, ""]]],
      ["Bab 4: Iklan", "3.9/4.9", "IKLAN", ["Mengenal iklan", "Bahasa iklan", "Membuat iklan"], "Apa Itu Iklan?", ["Iklan: ajakan membeli/menggunakan.", "Bahasa: menarik dan persuasif.", "Gambar: mendukung pesan.", "R:Iklan: ajakan dengan kata dan gambar."], [["Iklan bertujuan...", ["Menghibur", "Mengajak", "Mendidik"], 1, ""], ["Kata 'Ayo' termasuk...", ["Ajakan", "Larangan", "Berita"], 0, ""]], "Buat iklan tentang pensil buatanmu.", [["Gambar dalam iklan...", ["Hiasan", "Mendukung pesan", "Utama"], 1, ""]]],
      ["Bab 5: Pantun", "3.10/4.10", "PANTUN", ["Ciri pantun", "Jenis pantun", "Membuat pantun"], "Pantun Nasihat", ["Pantun: a-b-a-b, 4 baris.", "Sampiran: baris 1-2.", "Isi: baris 3-4, berisi nasihat.", "R:Pantun nasihat: a-b-a-b, berisi nasihat."], [["Baris sampiran berfungsi...", ["Isi", "Pengantar", "Penutup"], 1, ""], ["Pantun jenaka bertujuan...", ["Menghibur", "Nasihat", "Mendidik"], 0, ""]], "Buat pantun nasihat tentang kebersihan.", [["Pantun terdiri dari...", ["2 baris", "4 baris", "6 baris"], 1, ""]]],
    ],
  },
  // === KELAS IV SEMESTER 1 ===
  {
    level: 19, grade: "IV", semester: 1, title: "Kelas IV Semester 1", description: "Teks narasi, prosedur, laporan pengamatan, puisi, pantun",
    bab: [
      ["Bab 1: Teks Narasi", "3.1/4.1", "NARASI", ["Memahami narasi", "Alur cerita", "Menulis narasi"], "Teks Narasi", ["Narasi: cerita berdasarkan urutan waktu.", "Alur: awal, tengah, akhir.", "Tujuan: menghibur dan mengajar.", "R:Narasi: cerita berurutan (awal-tengah-akhir)."], [["Teks narasi bersifat...", ["Menghibur", "Memandu", "Melapor"], 0, ""], ["Urutan cerita disebut...", ["Tema", "Alur", "Tokoh"], 1, ""]], "Tulis narasi pengalaman liburan yang tak terlupakan.", [["Akhir narasi disebut...", ["Pembuka", "Resolusi", "Konflik"], 1, ""]]],
      ["Bab 2: Teks Prosedur", "3.2/4.2", "PROSEDUR", ["Memahami prosedur", "Langkah", "Menulis prosedur"], "Cara Membuat Sesuatu", ["Tujuan: hasil yang ingin dicapai.", "Bahan: apa yang diperlukan.", "Langkah: urutan cara membuat.", "R:Prosedur: tujuan, bahan, langkah."], [["Kata 'pertama' menunjukkan...", ["Akhir", "Urutan", "Sebab"], 1, ""], ["'Aduk hingga rata' kalimat...", ["Berita", "Perintah", "Tanya"], 1, ""]], "Tulis prosedur membuat layang-layang sederhana.", [["Prosedur harus dilakukan secara...", ["Acak", "Berurutan", "Cepat"], 1, ""]]],
      ["Bab 3: Laporan Pengamatan", "3.3/4.3", "LAPORAN", ["Mengamati", "Mencatat hasil", "Menyusun laporan"], "Laporan Pengamatan", ["Objek: tumbuhan, hewan, benda.", "Aspek: warna, bentuk, ukuran, jumlah.", "Data: hasil pengamatan langsung.", "R:Laporan: objek, aspek, data."], [["Bagian pengamatan mencantumkan...", ["Pendapat", "Data", "Cerita"], 1, ""], ["'Daun berwarna hijau' termasuk...", ["Opini", "Data", "Saran"], 1, ""]], "Amati pertumbuhan biji kacang 3 hari, buat laporan.", [["Alat yang perlu disiapkan...", ["Buku tulis", "Pensil", "Semua benar"], 2, ""]]],
      ["Bab 4: Puisi", "3.4/4.4", "PUISI", ["Menganalisis puisi", "Makna puisi", "Menulis puisi"], "Makna dalam Puisi", ["Tema: pokok pikiran puisi.", "Amanat: pesan yang disampaikan.", "Rasa: perasaan penyair.", "R:Puisi: tema, amanat, rasa."], [["Pokok pikiran puisi disebut...", ["Tema", "Amanat", "Rima"], 0, ""], ["Pesan puisi disebut...", ["Tema", "Amanat", "Diksi"], 1, ""]], "Tulis puisi 4 baris dengan tema persahabatan.", [["Perasaan penyair disebut...", ["Amanat", "Rasa", "Nada"], 1, ""]]],
      ["Bab 5: Pantun", "3.5/4.5", "PANTUN", ["Jenis pantun", "Nilai pantun", "Mencipta pantun"], "Jenis-Jenis Pantun", ["Pantun nasihat: pesan moral.", "Pantun jenaka: lucu.", "Pantun teka-teki: berisi tebakan.", "R:Pantun: nasihat, jenaka, teka-teki."], [["Pantun teka-teki berisi...", ["Nasihat", "Tebakan", "Cinta"], 1, ""], ["Pantun jenaka bertujuan...", ["Menghibur", "Mendidik", "Menyindir"], 0, ""]], "Buat 2 pantun: nasihat dan jenaka.", [["'Kalau ada jarum patah' termasuk...", ["Isi", "Sampiran", "Judul"], 1, ""]]],
    ],
  },
  // === KELAS IV SEMESTER 2 ===
  {
    level: 20, grade: "IV", semester: 2, title: "Kelas IV Semester 2", description: "Gagasan pokok, teks eksplanasi, cerita fiksi, surat resmi, pengumuman",
    bab: [
      ["Bab 1: Gagasan Pokok", "3.6/4.6", "GAGASAN", ["Menemukan gagasan", "Paragraf", "Meringkas"], "Gagasan Utama", ["Gagasan pokok: ide utama paragraf.", "Kalimat utama: berisi gagasan pokok.", "Kalimat penjelas: mendukung.", "R:Gagasan pokok: ide utama dalam paragraf."], [["Ide utama paragraf disebut...", ["Gagasan pokok", "Kesimpulan", "Judul"], 0, ""], ["Kalimat utama biasanya di...", ["Akhir", "Awal/tengah", "Acak"], 1, ""]], "Temukan gagasan pokok dari bacaan 'Hutan Bakau'.", [["Kalimat penjelas berfungsi...", ["Utama", "Mendukung", "Penutup"], 1, ""]]],
      ["Bab 2: Teks Eksplanasi", "3.7/4.7", "EKSPLANASI", ["Memahami eksplanasi", "Sebab-akibat", "Menulis eksplanasi"], "Menjelaskan Fenomena", ["Eksplanasi: menjelaskan proses.", "Sebab: penyebab kejadian.", "Akibat: hasil dari sebab.", "R:Eksplanasi: sebab dan akibat."], [["Teks eksplanasi menjawab...", ["Apa", "Mengapa", "Siapa"], 1, ""], ["'Hujan asam' akibat dari...", ["Polusi", "Panas", "Angin"], 0, ""]], "Jelaskan proses terjadinya banjir.", [["Interpretasi berisi...", ["Data", "Kesimpulan", "Alat"], 1, ""]]],
      ["Bab 3: Cerita Fiksi", "3.8/4.8", "FIKSI", ["Unsur fiksi", "Perbedaan fiksi/nonfiksi", "Apresiasi"], "Fiksi dan Nonfiksi", ["Fiksi: cerita khayal (novel, dongeng).", "Nonfiksi: berdasarkan fakta (buku pelajaran).", "R:Fiksi khayal, nonfiksi fakta."], [["Buku cerita termasuk...", ["Fiksi", "Nonfiksi", "Keduanya"], 0, ""], ["Ensiklopedia termasuk...", ["Fiksi", "Nonfiksi", "Dongeng"], 1, ""]], "Tulis perbedaan buku cerita dan buku pelajaran.", [["Tokoh dalam fiksi bisa...", ["Nyata", "Khayalan", "Keduanya"], 1, ""]]],
      ["Bab 4: Surat Resmi", "3.9/4.9", "SURAT", ["Struktur surat resmi", "Bahasa resmi", "Menulis surat resmi"], "Surat Izin Sekolah", ["Surat resmi: keperluan formal.", "Kop surat, tanggal, perihal.", "Bahasa baku dan sopan.", "R:Surat resmi: formal, bahasa baku."], [["Surat izin termasuk...", ["Pribadi", "Resmi", "Niaga"], 1, ""], ["Perihal berisi...", ["Salam", "Topik surat", "Tanggal"], 1, ""]], "Tulis surat izin tidak masuk sekolah.", [["Bahasa surat resmi...", ["Santai", "Baku", "Daerah"], 1, ""]]],
      ["Bab 5: Pengumuman", "3.10/4.10", "PENGUMUMAN", ["Unsur pengumuman", "Bahasa efektif", "Menulis pengumuman"], "Menulis Pengumuman", ["Pembaca sasaran: siapa yang dituju.", "Isi: apa, kapan, di mana.", "Penutup: kontak penanggung jawab.", "R:Pengumuman: sasaran, isi, kontak."], [["Pengumuman harus...", ["Panjang", "Jelas dan singkat", "Indah"], 1, ""], ["Kontak penanggung jawab di...", ["Awal", "Akhir", "Judul"], 1, ""]], "Buat pengumuman lomba baca puisi 17 Agustus.", [["Pembaca sasaran perlu...", ["Ditentukan", "Diabaikan", "Dihafal"], 0, ""]]],
    ],
  },
  // === KELAS V SEMESTER 1 ===
  {
    level: 21, grade: "V", semester: 1, title: "Kelas V Semester 1", description: "Teks eksplanasi, iklan, cerpen, laporan, puisi",
    bab: [
      ["Bab 1: Teks Eksplanasi", "3.1/4.1", "EKSPLANASI", ["Struktur eksplanasi", "Kebahasaan", "Menulis eksplanasi"], "Menulis Teks Eksplanasi", ["Pernyataan umum: pengantar.", "Deretan penjelas: sebab-akibat.", "Interpretasi: kesimpulan.", "R:Eksplanasi: pernyataan umum → penjelas → interpretasi."], [["Bagian awal eksplanasi...", ["Interpretasi", "Pernyataan umum", "Simpulan"], 1, ""], ["Deretan penjelas berisi...", ["Judul", "Sebab-akibat", "Saran"], 1, ""]], "Tulis eksplanasi daur hidup kupu-kupu.", [["Konjungsi kausal contoh...", ["Dan", "Akibatnya", "Lalu"], 1, ""]]],
      ["Bab 2: Iklan", "3.2/4.2", "IKLAN", ["Menganalisis iklan", "Unsur iklan", "Membuat iklan"], "Iklan Elektronik", ["Iklan: di TV, radio, internet.", "Audio: suara dan musik.", "Visual: gambar bergerak.", "R:Iklan elektronik: TV, radio, internet."], [["Iklan di TV termasuk...", ["Cetak", "Elektronik", "Baliho"], 1, ""], ["Iklan radio mengandalkan...", ["Gambar", "Suara", "Teks"], 1, ""]], "Buat naskah iklan 30 detik tentang sabun.", [["Slogan dalam iklan harus...", ["Panjang", "Mudah diingat", "Sulit"], 1, ""]]],
      ["Bab 3: Cerpen", "3.3/4.3", "CERPEN", ["Unsur cerpen", "Konflik", "Menulis cerpen"], "Mengenal Cerpen", ["Cerpen: cerita pendek.", "Unsur intrinsik: tema, tokoh, alur, latar.", "Konflik: masalah dalam cerita.", "R:Cerpen: tema, tokoh, alur, latar, konflik."], [["Alur adalah...", ["Tokoh", "Jalan cerita", "Tempat"], 1, ""], ["Tema cerita adalah...", ["Pesan", "Pokok cerita", "Tokoh"], 1, ""]], "Tulis cerpen 3 paragraf tentang persahabatan.", [["Latar meliputi...", ["Tema", "Tempat/waktu", "Tokoh"], 1, ""]]],
      ["Bab 4: Laporan", "3.4/4.4", "LAPORAN", ["Data dan informasi", "Kesimpulan", "Presentasi laporan"], "Presentasi Laporan", ["Data: fakta bukan opini.", "Kesimpulan: ringkasan hasil.", "Presentasi: sampaikan dengan percaya diri.", "R:Laporan: data, kesimpulan, presentasi."], [["Data yang benar bersifat...", ["Faktual", "Opini", "Khayal"], 0, ""], ["Saat presentasi suara harus...", ["Pelan", "Jelas", "Cepat"], 1, ""]], "Presentasi laporan pengamatan di depan kelas.", [["Kesimpulan berisi...", ["Pengantar", "Inti hasil", "Alat"], 1, ""]]],
      ["Bab 5: Puisi", "3.5/4.5", "PUISI", ["Majas dalam puisi", "Citraan", "Menulis puisi"], "Majas dan Citraan", ["Metafora: perbandingan langsung.", "Hiperbola: berlebihan.", "Citraan: penglihatan, pendengaran.", "R:Majas: metafora, hiperbola. Citraan: penglihatan, pendengaran."], [["'Rambutnya ombak' majas...", ["Metafora", "Hiperbola", "Personifikasi"], 0, ""], ["'Aku teriak sekeras langit' majas...", ["Metafora", "Hiperbola", "Personifikasi"], 1, ""]], "Tulis puisi dengan majas metafora dan hiperbola.", [["Citraan pendengaran berkaitan...", ["Suara", "Warna", "Rasa"], 0, ""]]],
    ],
  },
  // === KELAS V SEMESTER 2 ===
  {
    level: 22, grade: "V", semester: 2, title: "Kelas V Semester 2", description: "Pidato, tanggapan, wawancara, resensi, pantun",
    bab: [
      ["Bab 1: Pidato", "3.6/4.6", "PIDATO", ["Struktur pidato", "Bahasa pidato", "Berpidato"], "Berpidato yang Baik", ["Pembukaan: salam, syukur.", "Isi: pesan yang disampaikan.", "Penutup: kesimpulan, salam.", "R:Pidato: pembukaan, isi, penutup."], [["Salam pembuka pidato...", ["Assalamualaikum", "Selesai", "Terima kasih"], 0, ""], ["Isi pidato berisi...", ["Pesan", "Salam", "Identitas"], 0, ""]], "Buat teks pidato tentang kebersihan kelas.", [["Saat pidato pandangan ke...", ["Bawah", "Audiens", "Samping"], 1, ""]]],
      ["Bab 2: Teks Tanggapan", "3.7/4.7", "TANGGAPAN", ["Memberi tanggapan", "Kritik membangun", "Menulis tanggapan"], "Tanggapan yang Santun", ["Tanggapan: pendapat tentang sesuatu.", "Kritik: saran perbaikan.", "Pujian: apresiasi yang baik.", "R:Tanggapan: kritik dan pujian dengan alasan."], [["Tanggapan harus disertai...", ["Alasan", "Emosi", "Teriak"], 0, ""], ["'Bagus, tapi perlu diperbaiki' termasuk...", ["Pujian", "Kritik", "Hinaan"], 1, ""]], "Beri tanggapan tentang taman yang kotor.", [["Kritik disampaikan dengan...", ["Kasar", "Santun", "Marah"], 1, ""]]],
      ["Bab 3: Wawancara", "3.8/4.8", "WAWANCARA", ["Laporan wawancara", "Kesimpulan", "Mempresentasikan"], "Laporan Hasil Wawancara", ["Catat: nama, jawaban narasumber.", "Kesimpulan: inti wawancara.", "Sajikan dalam laporan tertulis.", "R:Laporan wawancara: catat, simpulkan, sajikan."], [["Hasil wawancara disajikan...", ["Lisan", "Tertulis", "Keduanya"], 2, ""], ["Kesimpulan wawancara berisi...", ["Semua jawaban", "Inti jawaban", "Pertanyaan"], 1, ""]], "Laporkan hasil wawancara tentang cita-cita.", [["Hal penting wawancara...", ["Makan", "Catat jawaban", "Berdebat"], 1, ""]]],
      ["Bab 4: Resensi", "3.9/4.9", "RESENSI", ["Mengenal resensi", "Unsur resensi", "Menulis resensi"], "Meresensi Buku", ["Resensi: ulasan buku.", "Unsur: identitas, sinopsis, penilaian.", "Bahasa: kritis dan objektif.", "R:Resensi: identitas, sinopsis, penilaian."], [["Identitas buku berisi...", ["Harga", "Judul, pengarang", "Sampul"], 1, ""], ["Sinopsis adalah...", ["Ringkasan cerita", "Penilaian", "Kritik"], 0, ""]], "Tulis resensi buku cerita favoritmu.", [["Penilaian dalam resensi...", ["Subjektif", "Objektif", "Emosional"], 1, ""]]],
      ["Bab 5: Pantun", "3.10/4.10", "PANTUN", ["Menganalisis pantun", "Nilai pantun", "Mencipta pantun"], "Nilai dalam Pantun", ["Nilai moral: pesan baik.", "Nilai sosial: hubungan manusia.", "Nilai budaya: kearifan lokal.", "R:Pantun: nilai moral, sosial, budaya."], [["'Rajin pangkal pandai' nilai...", ["Moral", "Budaya", "Sosial"], 0, ""], ["Pantun melayu kaya...", ["Nilai budaya", "Angka", "Sains"], 0, ""]], "Ciptakan 2 pantun: nasihat dan persahabatan.", [["Nilai sosial dalam pantun...", ["Individu", "Hubungan manusia", "Agama"], 1, ""]]],
    ],
  },
  // === KELAS VI SEMESTER 1 ===
  {
    level: 23, grade: "VI", semester: 1, title: "Kelas VI Semester 1", description: "Surat resmi, teks tanggapan, teks diskusi, pidato, cerpen",
    bab: [
      ["Bab 1: Surat Resmi", "3.1/4.1", "SURAT", ["Struktur", "Kebahasaan", "Menulis surat resmi"], "Surat Resmi Lengkap", ["Kop surat, nomor, lampiran, perihal.", "Alamat, salam, isi, penutup, tanda tangan.", "Bahasa formal dan efektif.", "R:Surat resmi: kop, nomor, alamat, isi, ttd."], [["Nomor surat berisi...", ["Tanggal", "Kode dan urutan", "Nama"], 1, ""], ["Lampiran menunjukkan...", ["Isi", "Dokumen tambahan", "Alamat"], 1, ""]], "Tulis surat undangan resmi untuk pertemuan OSIS.", [["Tanda tangan di...", ["Awal", "Akhir", "Judul"], 1, ""]]],
      ["Bab 2: Teks Tanggapan", "3.2/4.2", "TANGGAPAN", ["Tanggapan kritis", "Evaluasi", "Menulis tanggapan"], "Tanggapan dengan Argumen", ["Konteks: latar belakang isu.", "Deskripsi: gambaran objek.", "Penilaian: kritik/pujian beralasan.", "R:Tanggapan: konteks, deskripsi, penilaian."], [["Penilaian harus disertai...", ["Alasan logis", "Emosi", "Hinaan"], 0, ""], ["Konteks berisi...", ["Penilaian", "Latar isu", "Saran"], 1, ""]], "Tanggapi isu sampah di sekolah dengan argumen.", [["Tanggapan baik bersifat...", ["Subjektif", "Membangun", "Marah"], 1, ""]]],
      ["Bab 3: Teks Diskusi", "3.3/4.3", "DISKUSI", ["Memahami diskusi", "Pro dan kontra", "Menulis diskusi"], "Berdiskusi dengan Baik", ["Isu: topik yang dibahas.", "Argumen pendukung (pro).", "Argumen penentang (kontra).", "R:Diskusi: isu, pro, kontra."], [["Diskusi menyajikan...", ["Satu sisi", "Dua sisi", "Sama"], 1, ""], ["Kesimpulan diskusi...", ["Memihak", "Seimbang", "Acak"], 1, ""]], "Tulis diskusi tentang seragam sekolah.", [["Saat berdiskusi harus...", ["Teriak", "Bergiliran", "Diam"], 1, ""]]],
      ["Bab 4: Pidato", "3.4/4.4", "PIDATO", ["Pidato persuasif", "Argumen", "Kaidah kebahasaan"], "Pidato Persuasif", ["Ajakan dengan argumen kuat.", "Kata: mari, ayo, marilah.", "Struktur: pembukaan, argumen, ajakan, penutup.", "R:Pidato persuasif: ajakan dengan argumen."], [["Kata persuasif contoh...", ["Mungkin", "Ayo", "Tidak"], 1, ""], ["Tujuan pidato persuasif...", ["Menghibur", "Mengajak", "Melapor"], 1, ""]], "Buat pidato persuasif tentang donasi bencana.", [["Argumen dalam pidato...", ["Data", "Opini tanpa data", "Cerita"], 0, ""]]],
      ["Bab 5: Cerpen", "3.5/4.5", "CERPEN", ["Alur maju mundur", "Sudut pandang", "Menulis cerpen"], "Teknik Menulis Cerpen", ["Alur: maju, mundur, campuran.", "Sudut pandang: orang pertama (aku), ketiga (dia).", "Gaya bahasa: majas dan diksi.", "R:Cerpen: alur, sudut pandang, gaya bahasa."], [["'Aku berjalan' sudut pandang...", ["Pertama", "Ketiga", "Kedua"], 0, ""], ["Alur mundur disebut...", ["Flashback", "Maju", "Campuran"], 0, ""]], "Tulis cerpen 2 paragraf dengan alur flashback.", [["Amanat cerpen adalah...", ["Judul", "Pesan moral", "Tokoh"], 1, ""]]],
    ],
  },
  // === KELAS VI SEMESTER 2 ===
  {
    level: 24, grade: "VI", semester: 2, title: "Kelas VI Semester 2", description: "Resensi, laporan bacaan, teks eksplanasi, puisi, surat dinas",
    bab: [
      ["Bab 1: Resensi", "3.6/4.6", "RESENSI", ["Unsur resensi", "Penilaian", "Menulis resensi"], "Meresensi Buku Fiksi", ["Identitas: judul, pengarang, penerbit.", "Orientasi: pengantar.", "Analisis: kelebihan dan kekurangan.", "R:Resensi: identitas, orientasi, analisis."], [["Unsur wajib resensi...", ["Identitas buku", "Harga", "Tebal"], 0, ""], ["Analisis berisi...", ["Ringkasan", "Penilaian", "Biodata"], 1, ""]], "Tulis resensi novel anak yang pernah dibaca.", [["Resensi bersifat...", ["Subjektif", "Objektif", "Promosi"], 1, ""]]],
      ["Bab 2: Laporan Bacaan", "3.7/4.7", "LAPORAN", ["Membaca intensif", "Meringkas", "Menulis laporan"], "Laporan Buku", ["Judul buku, pengarang.", "Ringkasan isi: 3-5 kalimat.", "Pendapat: suka/tidak dan alasan.", "R:Laporan bacaan: identitas, ringkasan, pendapat."], [["Ringkasan berisi...", ["Semua kata", "Inti cerita", "Sampul"], 1, ""], ["Pendapat pribadi di...", ["Awal", "Akhir", "Tengah"], 1, ""]], "Buat laporan buku bacaan non-fiksi.", [["Laporan bacaan berbeda resensi...", ["Tanpa analisis", "Lebih panjang", "Sama"], 0, ""]]],
      ["Bab 3: Teks Eksplanasi", "3.8/4.8", "EKSPLANASI", ["Fenomena sosial", "Kausal", "Menulis eksplanasi"], "Eksplanasi Fenomena Sosial", ["Fenomena sosial: kemacetan, banjir.", "Rantai sebab-akibat.", "Data pendukung: fakta.", "R:Eksplanasi sosial: sebab-akibat fenomena."], [["Kemacetan termasuk fenomena...", ["Alam", "Sosial", "Kimia"], 1, ""], ["Rantai kausal artinya...", ["Satu sebab", "Berantai", "Acak"], 1, ""]], "Tulis eksplanasi tentang kemacetan di kota besar.", [["Data dalam eksplanasi...", ["Opini", "Fakta", "Cerita"], 1, ""]]],
      ["Bab 4: Puisi", "3.9/4.9", "PUISI", ["Membandingkan puisi", "Kritik", "Menulis esai"], "Perbandingan Puisi", ["Bandingkan dua puisi.", "Aspek: tema, diksi, rima, majas.", "Kritik: kelebihan dan kekurangan.", "R:Perbandingan: tema, diksi, rima, majas."], [["'Aku Ingin' dan 'Doa' tema...", ["Cinta", "Religius", "Alam"], 1, ""], ["Perbandingan puisi termasuk...", ["Kritik sastra", "Resensi", "Laporan"], 0, ""]], "Bandingkan dua puisi anak karya Chairil Anwar.", [["Esai sastra membahas...", ["Harga buku", "Karya sastra", "Pengarang"], 1, ""]]],
      ["Bab 5: Surat Dinas", "3.10/4.10", "SURAT", ["Struktur", "Kebahasaan", "Menulis surat dinas"], "Surat Dinas dan Notula", ["Surat dinas: antarinstansi.", "Notula: catatan rapat.", "Bahasa baku, sistematis.", "R:Surat dinas: antarinstansi, notula: catatan rapat."], [["Notula berisi...", ["Undangan", "Hasil rapat", "Tagihan"], 1, ""], ["Bagian tidak wajib surat dinas...", ["Cop surat", "Nomor", "Stiker"], 2, ""]], "Buat surat dinas undangan rapat kelulusan.", [["Notula ditulis saat...", ["Rapat", "Belajar", "Olahraga"], 0, ""]]],
    ],
  },
]

async function seed() {
  console.log("Seeding Buku Panduan Guru SD (Kelas I-VI)...")

  for (const lvl of levels) {
    const { bab: babData, grade, semester, ...levelRest } = lvl
    const created = await db.learningLevel.create({
      data: {
        ...levelRest,
        type: "PANDUAN",
        color: "from-emerald-500 to-teal-600",
        order: lvl.level,
        xpReward: 1000,
        coinReward: 200,
      },
    })
    console.log(`Level ${levelRest.title}: ${babData.length} bab`)

    for (let i = 0; i < babData.length; i++) {
      const [title, kd, topik, tujuan, materiJudul, materiIsi, latihanArr, praktikPetunjuk, kuisArr] = babData[i]
      const content: Konten = buatKonten(tujuan, materiJudul, materiIsi, latihanArr, praktikPetunjuk, kuisArr)
      const unitOrder = i + 1
      await db.learningUnit.create({
        data: {
          levelId: created.id,
          title,
          kd,
          topik,
          grade,
          semester,
          order: unitOrder,
          content: JSON.stringify(content),
          xpReward: 60,
          coinReward: 15,
          isActive: true,
        },
      })
      console.log(`  ${title}`)
    }
  }

  console.log("\nSeeding selesai! 12 level SD dengan " + levels.reduce((sum, l) => sum + l.bab.length, 0) + " bab.")
}

seed().catch(e => { console.error(e); process.exit(1) })
