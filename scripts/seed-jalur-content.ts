// @ts-nocheck
import { db } from "../lib/db"

type Soal = { id: number; soal: string; opsi: string[]; jawaban: number; penjelasan: string }
type Konten = { belajar: { tujuan: string[]; materi: { judul: string; isi: string[]; contoh: string[] }[]; rangkuman: string[] }; latihan: Soal[]; praktik: { petunjuk: string; tips: string[]; contoh?: string }; kuis: Soal[] }

const data: Record<string, Konten> = {}

function add(title: string, k: Konten) { data[title] = k }

// Level 1: Pemula
add("Teks Prosedur", {
  belajar: { tujuan: ["Memahami struktur teks prosedur", "Mengidentifikasi kalimat imperatif", "Menyusun teks prosedur"], materi: [
    { judul: "Pengertian", isi: ["Teks prosedur berisi langkah-langkah berurutan untuk melakukan sesuatu.", "Tujuan: membantu pembaca melakukan kegiatan dengan benar.", "Contoh: resep masakan, petunjuk penggunaan alat."], contoh: ["Cara Membuat Nasi Goreng: siapkan bahan, tumis bumbu, masak nasi, sajikan."] },
    { judul: "Struktur & Ciri", isi: ["1) Tujuan, 2) Bahan/Alat, 3) Langkah-langkah, 4) Penutup.", "Ciri bahasa: kalimat imperatif (perintah), ajakan, larangan.", "Kata urutan: pertama, kemudian, lalu, akhirnya."], contoh: ["Imperatif: 'Aduk hingga merata'", "Larangan: 'Jangan terlalu lama memasak'"] },
  ], rangkuman: ["Langkah berurutan.", "Struktur: tujuan-bahan-langkah-penutup.", "Kalimat imperatif dan kata urutan."] },
  latihan: makeSoal([
    ["Teks prosedur bertujuan...", ["Menghibur", "Memberi petunjuk", "Menggambar objek", "Argumen"], 1],
    ["'Masukkan gula' termasuk kalimat...", ["Deklaratif", "Imperatif", "Interogatif", "Eksklamatif"], 1],
    ["Struktur prosedur yang benar...", ["Abstrak-krisis-koda", "Tujuan-bahan-langkah-penutup", "Orientasi-peristiwa-reorientasi", "Pernyataan-argumen-penegasan"], 1],
    ["Kata urutan yang tepat...", ["Sedangkan", "Kemudian", "Akan tetapi", "Meskipun"], 1],
    ["Bagian penutup berisi...", ["Langkah awal", "Hasil akhir/tips", "Daftar alat", "Tujuan"], 1],
  ]),
  praktik: { petunjuk: "Tulislah teks prosedur membuat minuman favoritmu! Struktur: tujuan → bahan → langkah → penutup.", tips: ["Gunakan kata imperatif", "Gunakan kata urutan"], contoh: "Cara Membuat Es Teh Manis\nBahan: teh celup, gula, es batu, air panas.\n1. Masukkan teh ke gelas.\n2. Tuang air panas, diamkan 3 menit.\n3. Angkat teh, masukkan gula, aduk.\n4. Tambahkan es batu. Siap!" },
  kuis: makeSoal([
    ["'Jangan membuka tutup' termasuk...", ["Ajakan", "Larangan", "Perintah", "Saran"], 1],
    ["Kata 'pertama-tama' menunjukkan...", ["Waktu", "Urutan", "Tempat", "Cara"], 1],
    ["Bagian 'Alat dan Bahan' berfungsi...", ["Menjelaskan cara", "Mendaftar kebutuhan", "Menutup", "Memberi saran"], 1],
    ["'Tuangkan sedikit demi sedikit' menunjukkan...", ["Waktu", "Cara", "Tempat", "Alat"], 1],
    ["Bahasa prosedur harus...", ["Berbelit", "Jelas dan lugas", "Bermajas", "Puitis"], 1],
  ]),
})

add("Teks Berita", {
  belajar: { tujuan: ["Memahami unsur 5W+1H", "Mengenal struktur piramida terbalik", "Menyusun teks berita"], materi: [
    { judul: "Apa itu Teks Berita?", isi: ["Teks berita menyampaikan informasi aktual secara faktual dan objektif.", "Unsur 5W+1H: Apa, Siapa, Kapan, Di mana, Mengapa, Bagaimana.", "Berita harus faktual (berdasarkan fakta), aktual (terbaru), objektif (tidak memihak)."], contoh: ["Apa = peristiwa, Siapa = tokoh, Kapan = waktu, Di mana = tempat, Mengapa = penyebab, Bagaimana = proses"] },
    { judul: "Struktur Piramida Terbalik", isi: ["1) Kepala berita (lead): inti informasi — 5W+1H utama.", "2) Tubuh berita: penjelasan detail.", "3) Ekor berita: info tambahan (bisa dihilangkan).", "Informasi terpenting di awal, semakin akhir semakin kurang penting."], contoh: ["Lead: 'Gempa 5,2 SR guncang Garut, Senin pukul 14.30. Tidak ada korban jiwa.'"] },
  ], rangkuman: ["5W+1H: Apa, Siapa, Kapan, Di mana, Mengapa, Bagaimana.", "Piramida terbalik: penting di awal.", "Faktual, aktual, objektif."] },
  latihan: makeSoal([
    ["Unsur 'Apa' dalam berita 'Banjir setinggi 1m merendam 3 kelurahan' adalah...", ["Banjir", "Jakarta", "3 kelurahan", "1 meter"], 0],
    ["Ciri bahasa berita...", ["Mengandung majas", "Objektif dan faktual", "Opini penulis", "Imperatif"], 1],
    ["Piramida terbalik berarti...", ["Info penting di akhir", "Info penting di awal", "Semua sama penting", "Info acak"], 1],
    ["Unsur 'Mengapa' menjelaskan...", ["Penyebab", "Waktu", "Tempat", "Kronologi"], 0],
    ["Yang BUKAN sumber berita baik...", ["Saksi mata", "Dokumen resmi", "Opini pribadi", "Data BPS"], 2],
  ]),
  praktik: { petunjuk: "Buat teks berita tentang peristiwa di sekolah! Gunakan 5W+1H.", tips: ["Lead kuat", "Lugas dan objektif"], contoh: "Lomba Cerdas Cermat Meriahkan Bulan Bahasa\nSMPN 1 Bandung gelar lomba cerdas cermat, Kamis (20/10). Kepala sekolah: 'Kegiatan ini tingkatkan minat siswa pada Bahasa Indonesia.'" },
  kuis: makeSoal([
    ["5W+1H dalam BI: Apa, Siapa, Kapan, Di mana, Mengapa...", ["Berapa", "Bagaimana", "Boleh", "Baru"], 1],
    ["Kata 'kabarnya' dihindari karena...", ["Tidak efisien", "Menunjukkan ketidakpastian", "Terlalu panjang", "Tidak baku"], 1],
    ["Kalimat langsung ditandai...", ["Tanda kurung", "Tanda petik", "Tanda seru", "Tanda tanya"], 1],
    ["Ekor berita berisi info...", ["Paling penting", "Kurang penting", "Paling menarik", "Paling baru"], 1],
    ["Aktual berarti...", ["Berdasarkan fakta", "Terbaru", "Tidak memihak", "Menarik"], 1],
  ]),
})

add("Buku Bergambar & Teks Tanggapan", {
  belajar: { tujuan: ["Membedakan fiksi dan nonfiksi", "Memahami teks tanggapan", "Memberi tanggapan dengan alasan logis"], materi: [
    { judul: "Fiksi dan Nonfiksi", isi: ["Fiksi: cerita rekaan (novel, cerpen, dongeng, komik).", "Nonfiksi: informasi faktual (ensiklopedia, biografi, buku pelajaran).", "Buku bergambar: fiksi/nonfiksi dengan ilustrasi."], contoh: ["Fiksi: 'Petualangan Si Kancil'", "Nonfiksi: 'Ensiklopedia Tubuh Manusia'"] },
    { judul: "Teks Tanggapan", isi: ["Pendapat tentang suatu karya disertai alasan logis.", "Struktur: konteks, deskripsi, penilaian.", "Gunakan bahasa santun dan objektif."], contoh: ["'Buku ini menarik karena alurnya tidak terduga. Ilustrasinya bagus. Namun bahasanya agak sulit untuk anak SD.'"] },
  ], rangkuman: ["Fiksi: imajinasi. Nonfiksi: fakta.", "Tanggapan: pendapat + alasan logis.", "Struktur: konteks, deskripsi, penilaian."] },
  latihan: makeSoal([
    ["Buku cerita rekaan disebut...", ["Nonfiksi", "Fiksi", "Ensiklopedia", "Biografi"], 1],
    ["Contoh nonfiksi...", ["Novel", "Komik", "Ensiklopedia", "Cerpen"], 2],
    ["Tanggapan baik harus disertai...", ["Alasan logis", "Kata puitis", "Gambar", "Tanda tangan"], 0],
    ["Bagian konteks berisi...", ["Penilaian", "Alasan", "Pengantar karya", "Kesimpulan"], 2],
    ["Bahasa dalam tanggapan harus...", ["Kasar", "Santun dan objektif", "Emosional", "Berbelit"], 1],
  ]),
  praktik: { petunjuk: "Pilih buku yang pernah kamu baca. Tulis teks tanggapan: konteks, deskripsi, penilaian!", tips: ["Sebut judul dan penulis", "2 kelebihan + 1 saran"], contoh: "Konteks: Novel 'Laskar Pelangi' karya Andrea Hirata.\nDeskripsi: Cerita perjuangan 10 anak di Belitung.\nPenilaian: Bahasa indah dan inspiratif. Beberapa bagian terlalu panjang. Sangat layak dibaca." },
  kuis: makeSoal([
    ["'Buku ini direkomendasikan untuk usia 10-12 tahun' termasuk...", ["Konteks", "Deskripsi", "Penilaian", "Kesimpulan"], 2],
    ["'Sampul buku berwarna biru' termasuk...", ["Opini", "Deskripsi", "Penilaian", "Kritik"], 1],
    ["Tanggapan terbaik...", ["Buku ini jelek", "Alurnya lambat dan karakter tidak berkembang", "Tidak suka", "Biasa saja"], 1],
    ["Biografi termasuk...", ["Fiksi", "Nonfiksi", "Dongeng", "Novel"], 1],
    ["Pembeda fiksi dan nonfiksi...", ["Tebal buku", "Kebenaran isi", "Sampul", "Harga"], 1],
  ]),
})

add("Surat Pribadi & Resmi", {
  belajar: { tujuan: ["Membedakan surat pribadi dan resmi", "Memahami struktur surat resmi", "Menulis surat pribadi"], materi: [
    { judul: "Surat Pribadi", isi: ["Untuk keperluan pribadi/keluarga.", "Bahasa santai dan akrab.", "Struktur: tanggal, alamat, salam, isi, penutup, nama."], contoh: ["Jakarta, 12 Okt 2024\nUntuk Sahabatku Ara\nApa kabar? Kangen banget!"] },
    { judul: "Surat Resmi", isi: ["Untuk keperluan dinas/formal.", "Bahasa baku, kop surat, nomor, stempel.", "Struktur: kop, nomor, perihal, alamat, salam, isi, penutup, tanda tangan."], contoh: ["Kop: 'SMP NEGERI 1 JAKARTA\nJl. Merdeka No. 10'"] },
  ], rangkuman: ["Pribadi: santai, sederhana.", "Resmi: baku, lengkap, formal.", "Perbedaan utama: bahasa."] },
  latihan: makeSoal([
    ["Perbedaan utama surat pribadi dan resmi...", ["Jenis kertas", "Bahasa", "Panjang", "Amplop"], 1],
    ["Bagian hanya ada di surat resmi...", ["Salam", "Tanggal", "Kop surat", "Nama"], 2],
    ["'Dengan hormat' untuk surat...", ["Pribadi", "Resmi", "Cinta", "Keluarga"], 1],
    ["Sapaan tepat untuk teman...", ["Yth.", "Sahabatku", "Kepada Yth.", "Assalamualaikum"], 1],
    ["Nomor surat ada di surat...", ["Pribadi", "Resmi", "Cinta", "Teman"], 1],
  ]),
  praktik: { petunjuk: "Tulis surat pribadi untuk sahabat di kota lain. Ceritakan kegiatan sekolah sebulan terakhir!", tips: ["Bahasa santai", "Cerita menarik"], contoh: "Bandung, 15 Okt 2024\n\nUntuk sahabatku Rina\n\nHalo! Apa kabar? Aku baru ikut lomba puisi dan dapat juara 2! Senang banget. Guru Bahasa Indonesiaku bilang aku punya bakat menulis.\n\nBalas ya!\n\nSahabatmu,\nDina" },
  kuis: makeSoal([
    ["Fungsi perihal...", ["Isi singkat", "Sapaan", "Nomor", "Tanggal"], 0],
    ["'di Jalan Diponegoro' yang benar...", ["Di jalan Diponegoro", "di Jalan Diponegoro", "Di Jalan Diponegoro", "di jalan Diponegoro"], 2],
    ["Penutup surat pribadi...", ["Hormat saya", "Salam rindu", "Demikian", "Atas perhatian"], 1],
    ["Lampiran berisi...", ["Tujuan", "Dokumen disertakan", "Salam", "Alamat"], 1],
    ["Contoh surat resmi...", ["Surat untuk kakek", "Surat lamaran kerja", "Surat sahabat", "Kartu ultah"], 1],
  ]),
})

// Level 2: Terampil
add("Laporan Hasil Observasi", {
  belajar: { tujuan: ["Memahami struktur LHO", "Membedakan deskripsi dan eksposisi", "Menyusun LHO"], materi: [
    { judul: "Pengertian LHO", isi: ["LHO melaporkan hasil pengamatan secara sistematis dan objektif.", "Bersifat universal (berlaku umum).", "Menggunakan istilah ilmiah."], contoh: ["Observasi sawah: ditemukan 12 jenis serangga, 5 tumbuhan air, 3 amfibi."] },
    { judul: "Struktur LHO", isi: ["1) Pernyataan umum: definisi/klasifikasi.", "2) Deskripsi bagian: rincian fisik, fungsi, sifat.", "3) Deskripsi manfaat: kegunaan objek.", "Ciri: kata teknis, kalimat definisi (adalah, merupakan)."], contoh: ["'Kucing (Felis catus) adalah mamalia karnivora.'", "'Kucing memiliki mata yang dapat menyesuaikan dengan cahaya redup.'"] },
  ], rangkuman: ["LHO objektif dan universal.", "Struktur: pernyataan umum, deskripsi bagian, manfaat.", "Istilah ilmiah dan kalimat definisi."] },
  latihan: makeSoal([
    ["LHO bersifat...", ["Subjektif", "Universal", "Imajinatif", "Persuasif"], 1],
    ["'Mawar termasuk genus Rosa' termasuk...", ["Deskripsi manfaat", "Deskripsi bagian", "Pernyataan umum", "Kesimpulan"], 2],
    ["Perbedaan LHO dan deskripsi...", ["LHO umum, deskripsi khusus", "LHO pendek", "Deskripsi tanpa fakta", "LHO hanya ilmiah"], 0],
    ["Kata teknis untuk bunga...", ["Cantik", "Mahkota bunga", "Wangi", "Indah"], 1],
    ["Deskripsi manfaat menjelaskan...", ["Definisi", "Fungsi/kegunaan", "Bentuk fisik", "Warna"], 1],
  ]),
  praktik: { petunjuk: "Amati tanaman/hewan di rumah. Tulis LHO: pernyataan umum, deskripsi bagian, manfaat!", tips: ["Istilah ilmiah", "Detail fisik"], contoh: "Pohon Mangga (Mangifera indica) adalah tanaman buah tropis.\nTinggi 10-40m, daun lonjong 15-35cm. Buah bervariasi.\nManfaat: buah kaya vitamin C, kayu untuk bangunan, daun untuk pakan ternak." },
  kuis: makeSoal([
    ["'Adalah'/'merupakan' dalam LHO berfungsi...", ["Penghubung", "Penanda definisi", "Kata sifat", "Kata kerja"], 1],
    ["LHO berbeda dengan deskripsi karena LHO...", ["Subjektif", "Universal", "Pendek", "Tidak terstruktur"], 1],
    ["Pernyataan umum yang tepat...", ["Pohon itu tinggi", "Pisang (Musa) adalah tanaman herba", "Bunga indah", "Enak"], 1],
    ["Yang BUKAN ciri LHO...", ["Opini penulis", "Istilah teknis", "Objektif", "Sistematis"], 0],
    ["'Berdasarkan pengamatan 3 hari' termasuk...", ["Pernyataan umum", "Metode/hasil", "Deskripsi", "Kesimpulan"], 1],
  ]),
})

add("Iklan Slogan Poster", {
  belajar: { tujuan: ["Memahami iklan, slogan, poster", "Mengenal kalimat persuasif", "Membuat iklan sederhana"], materi: [
    { judul: "Iklan", isi: ["Iklan membujuk khalayak membeli/melakukan sesuatu.", "Komersial (jualan) dan nonkomersial (layanan masyarakat).", "Ciri: kalimat persuasif, imperatif, sugestif."], contoh: ["Komersial: 'Dapatkan TV terbaru harga spesial!'", "Nonkomersial: 'Buanglah sampah pada tempatnya.'"] },
    { judul: "Slogan dan Poster", isi: ["Slogan: kata singkat, mudah diingat.", "Poster: media visual (gambar + teks).", "Slogan efektif: singkat, padat, berima."], contoh: ["Slogan: 'Bhinneka Tunggal Ika', 'Ada Aqua'"] },
  ], rangkuman: ["Iklan membujuk dengan persuasif.", "Slogan: singkat, mudah diingat.", "Poster: visual + teks."] },
  latihan: makeSoal([
    ["'Belilah produk lokal!' termasuk...", ["Berita", "Persuasif", "Tanya", "Seru"], 1],
    ["Contoh slogan baik...", ["Sepatu bagus", "Train Hard Win Easy", "Hari ini hujan", "Makan siang enak"], 1],
    ["Poster 'Ayo Belajar!' termasuk iklan...", ["Komersial", "Nonkomersial", "Barang", "Jasa"], 1],
    ["Pembeda slogan dan poster...", ["Harga", "Media", "Tujuan", "Panjang"], 1],
    ["'Dapatkan', 'Rasakan' termasuk...", ["Kata kerja", "Kata sifat", "Perintah", "Tanya"], 2],
  ]),
  praktik: { petunjuk: "Buat poster kampanye 'Cinta Bahasa Indonesia'! Tulis deskripsi visual + slogan.", tips: ["Slogan 3-7 kata", "Gunakan rima"], contoh: "Poster: Latar biru, anak-anak memegang buku, bendera Indonesia. Slogan: 'Bahasaku, Identitasku!'" },
  kuis: makeSoal([
    ["Iklan nonkomersial bertujuan...", ["Jualan", "Edukasi masyarakat", "Promosi", "Iklan baris"], 1],
    ["'Jangan lupa sarapan!' termasuk...", ["Ajakan", "Larangan", "Perintah", "Saran"], 0],
    ["Ciri slogan efektif...", ["Panjang", "Mudah diingat", "Bertele-tele", "Bahasa asing"], 1],
    ["Poster baik memiliki...", ["Hanya teks", "Gambar dan teks seimbang", "Hanya gambar", "Warna gelap"], 1],
    ["'Rasakan sensasinya!' termasuk...", ["Deklaratif", "Persuasif", "Interogatif", "Eksklamatif"], 1],
  ]),
})

add("Artikel Ilmiah Populer", {
  belajar: { tujuan: ["Memahami struktur artikel populer", "Membedakan fakta dan opini", "Menulis artikel"], materi: [
    { judul: "Apa itu Artikel Populer?", isi: ["Informasi ilmiah dengan bahasa mudah dipahami.", "Dimuat di majalah, koran, blog.", "Berbeda dengan jurnal: lebih santai dan menarik."], contoh: ["Judul: 'Manfaat Daun Kelor untuk Kesehatan'"] },
    { judul: "Struktur & Ciri", isi: ["Judul menarik, lead, isi (fakta + penjelasan), penutup.", "Bahasa populer, fakta objektif, didukung data.", "Bedakan fakta (terbukti) dan opini (pendapat).", "Gunakan analogi untuk memudahkan pemahaman."], contoh: ["Fakta: '60% kematian dunia akibat penyakit tidak menular — WHO'", "Opini: 'Menurut saya pola makan tidak sehat masalah terbesar'"] },
  ], rangkuman: ["Informasi ilmiah bahasa sederhana.", "Fakta vs opini.", "Analogi untuk memudahkan."] },
  latihan: makeSoal([
    ["Perbedaan artikel populer dan jurnal...", ["Panjang", "Bahasa", "Kebenaran", "Penulis"], 1],
    ["Yang termasuk fakta...", ["Saya pikir", "Bumi mengelilingi matahari 365 hari", "Menurut saya", "Mungkin"], 1],
    ["Fungsi lead...", ["Menutup", "Menarik perhatian", "Simpulan", "Saran"], 1],
    ["Analogi berfungsi...", ["Memperpanjang", "Memudahkan pemahaman", "Ilmiah", "Menambah kata"], 1],
    ["'Data Kemkes: stunting turun 3%' termasuk...", ["Opini", "Fakta", "Saran", "Analogi"], 1],
  ]),
  praktik: { petunjuk: "Tulis artikel populer 'Manfaat Membaca' atau 'Pentingnya Olahraga'. Sertakan 1 data riset + 1 analogi!", tips: ["Judul menarik", "Data riset"], contoh: "Judul: 'Sejenak Membaca, Seumur Hidup Berilmu'\nPenelitian Stanford: membaca 30 menit tingkatkan fokus 30%.\nMembaca seperti 'gym untuk otak' — makin sering dilatih, makin kuat." },
  kuis: makeSoal([
    ["'Data BPS: 75% penduduk pakai ponsel' termasuk...", ["Opini", "Fakta", "Hipotesis", "Asumsi"], 1],
    ["Bahasa artikel populer...", ["Rumit", "Mudah dipahami", "Istilah asing", "Bertele-tele"], 1],
    ["Struktur benar...", ["Abstrak-metode-hasil", "Judul-lead-isi-penutup", "Tujuan-bahan-langkah", "Pernyataan-argumen"], 1],
    ["Analogi internet yang tepat...", ["Seperti buku", "Perpustakaan raksasa di mana saja", "Seperti pensil", "Seperti meja"], 1],
    ["Yang BUKAN ciri artikel populer...", ["Data pendukung", "Bahasa ilmiah berat", "Fakta", "Mudah dipahami"], 1],
  ]),
})

add("Resensi", {
  belajar: { tujuan: ["Memahami struktur resensi", "Mengidentifikasi unsur intrinsik", "Menulis resensi"], materi: [
    { judul: "Pengertian Resensi", isi: ["Ulasan/penilaian terhadap karya (buku, film).", "Tujuan: memberi gambaran dan menilai kualitas.", "Bersifat objektif dengan alasan logis."], contoh: ["Resensi novel 'Laskar Pelangi'"] },
    { judul: "Struktur Resensi", isi: ["1) Identitas: judul, penulis, penerbit.", "2) Sinopsis: ringkasan singkat.", "3) Analisis unsur intrinsik: tema, alur, tokoh.", "4) Kelebihan & kekurangan.", "5) Penutup: kesimpulan dan rekomendasi.", "Denotasi (makna sebenarnya) vs konotasi (kiasan)."], contoh: ["Tema 'Perjuangan pendidikan', Alur campuran, Tokoh Ikal, Latar Belitung 1970-an"] },
  ], rangkuman: ["Ulasan kritis terhadap karya.", "Struktur: identitas-sinopsis-analisis-penilaian-penutup.", "Objektif dengan alasan logis."] },
  latihan: makeSoal([
    ["Resensi adalah...", ["Ringkasan", "Ulasan kritis", "Daftar isi", "Sinopsis"], 1],
    ["Identitas karya berisi...", ["Sinopsis", "Data buku", "Analisis", "Kesimpulan"], 1],
    ["'Alurnya menegangkan' termasuk...", ["Sinopsis", "Analisis", "Identitas", "Penutup"], 1],
    ["'Rumah' dalam 'rumah tampak angker' bermakna...", ["Denotasi", "Konotasi", "Sinonim", "Antonim"], 1],
    ["Resensi baik bersifat...", ["Subjektif", "Objektif + logis", "Emosional", "Berlebihan"], 1],
  ]),
  praktik: { petunjuk: "Tulis resensi novel/film favorit! Struktur: identitas, sinopsis, analisis, kelebihan+kekurangan, rekomendasi.", tips: ["Jangan spoiler", "2 kelebihan + 1 kekurangan"], contoh: "Identitas: 'Negeri 5 Menara' — A. Fuadi — Gramedia — 2009\nSinopsis: Enam santri bertemu di Pondok Madani, bertekad raih mimpi.\nAnalisis: Tema persahabatan dan perjuangan. Alur maju. Tokoh unik.\nKelebihan: Bahasa mengalir, inspiratif.\nKekurangan: Beberapa bagian panjang." },
  kuis: makeSoal([
    ["Unsur intrinsik cerpen...", ["Tema-alur-tokoh-latar-sudut pandang-amanat", "Sampul-harga-tebal", "Pengarang-penerbit", "Sinopsis-resensi"], 0],
    ["'Bunga desa' konotasi berarti...", ["Bunga di desa", "Gadis tercantik", "Tanaman hias", "Tumbuhan liar"], 1],
    ["Sinopsis berfungsi...", ["Menilai", "Gambaran isi cerita", "Harga", "Kritik"], 1],
    ["'Kelebihan novel ini alurnya tidak terduga' termasuk...", ["Sinopsis", "Identitas", "Penilaian", "Penutup"], 2],
    ["Denotasi adalah...", ["Makna kiasan", "Makna sebenarnya", "Makna ganda", "Kiasan tetap"], 1],
  ]),
})

add("Puisi", {
  belajar: { tujuan: ["Memahami unsur pembangun puisi", "Mengenal jenis majas", "Menulis puisi"], materi: [
    { judul: "Unsur Puisi", isi: ["Puisi: ungkapan perasaan melalui bahasa padat.", "Unsur fisik: diksi, imaji, kata konkret, rima, tipografi.", "Unsur batin: tema, perasaan, nada, amanat."], contoh: ["Imaji visual: 'Laut biru membentang luas'", "Imaji auditif: 'Gemuruh ombak berderai'"] },
    { judul: "Majas", isi: ["Metafora: perbandingan langsung. 'Kau matahariku'", "Simile: bagai, laksana, seperti. 'Wajahmu bagai rembulan'", "Personifikasi: benda mati hidup. 'Angin berbisik'", "Hiperbola: berlebihan. 'Menunggu seribu tahun'", "Repetisi: pengulangan."], contoh: ["Metafora: 'Dia bintang kelas' (bintang = terpintar)"] },
  ], rangkuman: ["Puisi: bahasa padat dan indah.", "Unsur fisik: diksi, imaji, rima.", "Majas: metafora, simile, personifikasi, hiperbola."] },
  latihan: makeSoal([
    ["'Wajahmu laksana rembulan' majas...", ["Metafora", "Simile", "Personifikasi", "Hiperbola"], 1],
    ["Imaji auditif berkaitan...", ["Penglihatan", "Pendengaran", "Penciuman", "Peraba"], 1],
    ["'Menunggu dari subuh ke magrib' termasuk...", ["Metafora", "Simile", "Hiperbola", "Personifikasi"], 2],
    ["Pilihan kata dalam puisi disebut...", ["Rima", "Diksi", "Imaji", "Tipografi"], 1],
    ["Puisi alam menggunakan diksi...", ["Teknis", "Alamiah dan indah", "Ilmiah", "Asing"], 1],
  ]),
  praktik: { petunjuk: "Buat puisi 2 bait tema 'Cita-citaku'. Gunakan minimal 2 majas!", tips: ["Tentukan perasaan", "Pilih kata indah", "Perhatikan rima"], contoh: "Cita-citaku\n\nAku ingin terbang tinggi bagai elang\nMenembus awan, mengejar bintang\nTak ada lelah dalam langkah\nMeski rintangan menghadang\n\nIlmu adalah jembatan menuju mimpi\nSetiap halaman yang kubaca\nAdalah sayap mengantarku pergi\nKe masa depan yang kunanti" },
  kuis: makeSoal([
    ["'Hidup adalah perjalanan' majas...", ["Simile", "Metafora", "Personifikasi", "Hiperbola"], 1],
    ["Rima a-b-a-b terdapat pada...", ["Pantun", "Gurindam", "Syair", "Puisi kontemporer"], 0],
    ["'Daun melambai padaku' majas...", ["Metafora", "Simile", "Personifikasi", "Hiperbola"], 2],
    ["Tipografi berkaitan...", ["Pilihan kata", "Bentuk/penataan baris", "Persajakan", "Tema"], 1],
    ["Puisi Sapardi terkenal dengan gaya...", ["Rumit", "Sederhana sarat makna", "Penuh asing", "Formal"], 1],
  ]),
})

add("Pidato", {
  belajar: { tujuan: ["Memahami struktur pidato", "Teknik bicara di depan umum", "Menyusun naskah pidato"], materi: [
    { judul: "Pengertian Pidato", isi: ["Penyampaian gagasan secara lisan di depan umum.", "Tujuan: informatif, persuasif, rekreatif.", "Pidato baik: jelas, terstruktur, sesuai audiens."], contoh: ["Pidato perpisahan: terima kasih, kenangan, harapan."] },
    { judul: "Struktur Pidato", isi: ["1) Salam pembuka.", "2) Pendahuluan: syukur, sapaan hormat.", "3) Isi: inti pidato sistematis.", "4) Penutup: simpulan, harapan, maaf.", "5) Salam penutup.", "Tips: intonasi, kontak mata, gestur, kecepatan bicara."], contoh: ["'Assalamualaikum, Selamat pagi Bapak/Ibu guru dan teman-teman.'"] },
  ], rangkuman: ["Pidato: gagasan lisan di depan umum.", "Struktur: salam-pendahuluan-isi-penutup-salam.", "Intonasi, kontak mata, gestur."] },
  latihan: makeSoal([
    ["Tujuan persuasif...", ["Memberi info", "Membujuk", "Menghibur", "Melapor"], 1],
    ["Inti pidato ada di bagian...", ["Salam", "Pendahuluan", "Isi", "Penutup"], 2],
    ["Bukan teknik bicara baik...", ["Kontak mata", "Monoton", "Gestur", "Kecepatan tepat"], 1],
    ["'Hadirin yang saya hormati' bagian...", ["Salam", "Sapaan hormat", "Isi", "Penutup"], 1],
    ["Pidato cerita lucu bertujuan...", ["Informatif", "Persuasif", "Rekreatif", "Edukatif"], 2],
  ]),
  praktik: { petunjuk: "Tulis naskah pidato Hari Sumpah Pemuda! Struktur lengkap.", tips: ["Sapaan hangat", "Kutipan/pantun menarik", "Ajak di akhir"], contoh: "Assalamualaikum\nSelamat pagi Bapak/Ibu guru dan teman-teman.\n\nMarilah kita panjatkan puji syukur karena hari ini kita berkumpul memperingati Sumpah Pemuda.\n\nTeman-teman, Sumpah Pemuda bukan sekedar sejarah. Ini panggilan untuk bersatu. Mari buktikan pemuda Indonesia cerdas dan bangga berbahasa Indonesia.\n\nSelamat Hari Sumpah Pemuda. Bersatu kita teguh!\n\nWassalamualaikum." },
  kuis: makeSoal([
    ["Intonasi tepat berarti...", ["Bicara cepat", "Naik turun nada sesuai konteks", "Suara keras", "Suara pelan"], 1],
    ["Penutup pidato yang tepat...", ["Sekian dulu", "Mohon maaf atas kekurangan", "Selesai", "Terima kasih, bubar"], 1],
    ["'Pertama-tama, Kedua' menunjukkan...", ["Terstruktur", "Tidak teratur", "Monoton", "Tidak jelas"], 0],
    ["Sikap baik saat pidato...", ["Baca terus teks", "Percaya diri dan santai", "Lihat ke atas", "Kaku"], 1],
    ["Pidato informatif bertujuan...", ["Menghibur", "Memberi pengetahuan", "Membujuk", "Mengkritik"], 1],
  ]),
})

// Level 3: Mahir
add("Teks Rekon", {
  belajar: { tujuan: ["Memahami teks rekon", "Membedakan fakta, asumsi, opini", "Menulis teks rekon"], materi: [
    { judul: "Pengertian Teks Rekon", isi: ["Menyeritakan pengalaman masa lalu secara kronologis.", "Tujuan: menginformasikan atau menghibur.", "Jenis: personal, faktual, imajinatif."], contoh: ["'Liburan ke Pantai Kuta' — pengalaman pribadi"] },
    { judul: "Struktur & Ciri", isi: ["1) Orientasi: siapa, di mana, kapan.", "2) Urutan peristiwa: kronologis.", "3) Reorientasi: kesimpulan/komentar.", "Kata kerja lampau, konjungsi temporal (kemudian, lalu).", "Fakta (terbukti) vs asumsi (dugaan) vs opini (pendapat)."], contoh: ["Fakta: 'Tiket masuk Rp10.000'", "Asumsi: 'Sepertinya akan ramai'", "Opini: 'Pantai terindah di Bali'"] },
  ], rangkuman: ["Cerita masa lalu.", "Orientasi-urutan-reorientasi.", "Kata kerja lampau.", "Fakta vs asumsi vs opini."] },
  latihan: makeSoal([
    ["Teks rekon menceritakan...", ["Masa depan", "Masa lalu", "Prosedur", "Argumen"], 1],
    ["Struktur rekon...", ["Umum-bagian-manfaat", "Orientasi-urutan-reorientasi", "Tujuan-bahan-langkah", "Abstrak-krisis-koda"], 1],
    ["'Akhirnya' termasuk konjungsi...", ["Pertentangan", "Temporal", "Sebab", "Perbandingan"], 1],
    ["'Sepertinya hujan' termasuk...", ["Fakta", "Asumsi", "Opini", "Kenyataan"], 1],
    ["Orientasi berisi...", ["Urutan kejadian", "Pengantar (siapa, kapan, di mana)", "Komentar", "Kesimpulan"], 1],
  ]),
  praktik: { petunjuk: "Tulis teks rekon tentang pengalaman berkesan seminggu terakhir! Orientasi-urutan-reorientasi.", tips: ["Pilih pengalaman nyata", "Kronologis"], contoh: "Orientasi: Sabtu lalu aku dan teman ikut lomba cerdas cermat.\nUrutan: Pertama, babak penyisihan. Kami lolos ke semifinal. Di final, skor kejar-mengejar. Akhirnya kami juara pertama!\nReorientasi: Kami belajar bahwa kerja sama tim adalah kunci." },
  kuis: makeSoal([
    ["'Setelah itu' termasuk konjungsi...", ["Sebab", "Temporal", "Pertentangan", "Tujuan"], 1],
    ["Perbedaan rekon dan narasi...", ["Rekon faktual, narasi bisa fiktif", "Rekon panjang", "Narasi tanpa alur", "Rekon hanya liburan"], 0],
    ["'Data BMKG: suhu 35°C' adalah...", ["Asumsi", "Opini", "Fakta", "Dugaan"], 2],
    ["Reorientasi berisi...", ["Urutan", "Komentar penulis", "Latar", "Konflik"], 1],
    ["Kata kerja lampau...", ["Berkunjung", "Berkunjunglah", "Mengunjungi", "Kunjungan"], 0],
  ]),
})

add("Teks Eksplanasi", {
  belajar: { tujuan: ["Memahami teks eksplanasi", "Mengenal konjungsi kausal", "Menjelaskan fenomena"], materi: [
    { judul: "Pengertian", isi: ["Menjelaskan proses fenomena alam, sosial, budaya.", "Tujuan: menjawab mengapa dan bagaimana.", "Contoh: hujan asam, kemacetan, tradisi."], contoh: ["Alam: 'Proses Terjadinya Hujan'", "Sosial: 'Penyebab Kemacetan Jakarta'"] },
    { judul: "Struktur & Ciri", isi: ["1) Pernyataan umum: gambaran fenomena.", "2) Deretan penjelas: sebab-akibat.", "3) Interpretasi: simpulan.", "Konjungsi kausal (sebab, akibatnya), istilah ilmiah, kalimat pasif."], contoh: ["Kausal: 'Banjir karena hujan deras'", "Pasif: 'Air dialirkan melalui sungai'"] },
  ], rangkuman: ["Menjelaskan proses fenomena.", "Pernyataan umum-deretan penjelas-interpretasi.", "Konjungsi kausal, kalimat pasif."] },
  latihan: makeSoal([
    ["Eksplanasi menjelaskan...", ["Cara membuat", "Proses fenomena", "Objek", "Argumen"], 1],
    ["'Gunung meletus karena tekanan magma' konjungsi...", ["Temporal", "Kausal", "Pertentangan", "Perbandingan"], 1],
    ["Struktur eksplanasi...", ["Orientasi-urutan-reorientasi", "Umum-penjelas-interpretasi", "Tujuan-bahan-langkah", "Abstrak-krisis"], 1],
    ["Contoh fenomena sosial...", ["Gempa", "Kemacetan", "Pelangi", "Fotosintesis"], 1],
    ["Interpretasi berisi...", ["Proses", "Kesimpulan penulis", "Definisi", "Data"], 1],
  ]),
  praktik: { petunjuk: "Tulis eksplanasi tentang 'Proses Terjadinya Hujan'! Struktur lengkap dengan konjungsi kausal.", tips: ["Definisi fenomena", "Sebab-akibat logis", "Istilah ilmiah"], contoh: "Pernyataan umum: Hujan adalah jatuhnya air dari atmosfer ke bumi.\nDeretan penjelas: Evaporasi (penguapan air laut oleh matahari) → kondensasi (uap jadi awan) → presipitasi (jatuh sebagai hujan).\nInterpretasi: Siklus hujan penting bagi kehidupan." },
  kuis: makeSoal([
    ["Konjungsi kausal...", ["Kemudian", "Akibatnya", "Lalu", "Setelah itu"], 1],
    ["Perbedaan eksplanasi dan prosedur...", ["Eksplanasi 'mengapa', prosedur 'bagaimana'", "Eksplanasi singkat", "Prosedur ilmiah", "Sama"], 0],
    ["'Air dialirkan' termasuk...", ["Aktif", "Pasif", "Imperatif", "Interogatif"], 1],
    ["Eksplanasi budaya bisa menjelaskan...", ["Cara menari", "Asal-usul tradisi", "Langkah memasak", "Cara buat kerajinan"], 1],
    ["'Udara panas menguapkan air' kalimat...", ["Aktif", "Pasif", "Tanya", "Perintah"], 0],
  ]),
})

add("Teks Laporan", {
  belajar: { tujuan: ["Memahami teks laporan", "Menganalisis poster/infografik", "Menyusun laporan"], materi: [
    { judul: "Teks Laporan", isi: ["Informasi faktual sistematis berdasarkan pengamatan.", "Bersifat umum/universal.", "Laporan vs deskripsi: umum vs khusus."], contoh: ["Laporan: 'Kucing punya 32 otot di telinga' (semua kucing)", "Deskripsi: 'Kucingku Miko berbulu oranye' (khusus)"] },
    { judul: "Poster dan Infografik", isi: ["Media visual (teks + gambar + data).", "Analisis: tujuan, info utama, visual, target.", "Infografik baik: data akurat, visual menarik, mudah dipahami."], contoh: ["Poster COVID: cuci tangan, pakai masker, jaga jarak."] },
  ], rangkuman: ["Laporan faktual universal.", "Beda dengan deskripsi (umum vs khusus).", "Poster/infografik: media visual informatif."] },
  latihan: makeSoal([
    ["Teks laporan bersifat...", ["Subjektif", "Universal", "Imajinatif", "Persuasif"], 1],
    ["Infografik baik harus...", ["Penuh teks", "Data akurat + visual menarik", "Hanya gambar", "Tanpa data"], 1],
    ["Perbedaan laporan dan deskripsi...", ["Laporan umum, deskripsi khusus", "Laporan panjang", "Deskripsi objektif", "Sama"], 0],
    ["Poster baik memiliki...", ["Teks panjang", "Info singkat + pesan jelas", "Hanya gambar", "Warna monoton"], 1],
    ["'Data BMKG: curah hujan naik 15%' bersifat...", ["Opini", "Faktual", "Asumsi", "Imajinasi"], 1],
  ]),
  praktik: { petunjuk: "Buat laporan 'Kebiasaan Membaca di Kelasku'. Amati, catat, sajikan!", tips: ["Data sendiri", "Sistematis"], contoh: "Laporan Membaca Kelas 9A\nSiswa: 32 orang.\n- 20 siswa baca 1-2 buku/bulan\n- 8 siswa baca 3-5 buku/bulan\n- 4 siswa baca >5 buku/bulan\nKesimpulan: Minat baca cukup baik, perlu ditingkatkan." },
  kuis: makeSoal([
    ["'Setiap kucing punya kumis peraba' termasuk...", ["Deskripsi khusus", "Laporan umum", "Opini", "Imajinasi"], 1],
    ["Infografik berbeda poster karena...", ["Lebih banyak data", "Hanya iklan", "Tanpa gambar", "Pendek"], 0],
    ["Analisis poster berarti...", ["Menghafal", "Memahami tujuan, pesan, target", "Meniru", "Menggambar"], 1],
    ["Bukan elemen poster...", ["Judul", "Kalimat panjang detail", "Gambar", "Pesan jelas"], 1],
    ["Laporan ditulis dengan bahasa...", ["Indah", "Objektif dan jelas", "Bertele-tele", "Subjektif"], 1],
  ]),
})

add("Teks Argumentasi", {
  belajar: { tujuan: ["Memahami teks argumentasi", "Mengenal kalimat pengandaian", "Menyusun argumen logis"], materi: [
    { judul: "Pengertian", isi: ["Meyakinkan pembaca dengan argumen logis dan bukti.", "Tujuan: memengaruhi pendapat/sikap.", "Topik: isu kontroversial/debatable."], contoh: ["Tesis: 'Ujian nasional perlu diadakan kembali karena meningkatkan standar.'"] },
    { judul: "Struktur & Ciri", isi: ["1) Tesis: posisi penulis.", "2) Deretan argumen: alasan + bukti.", "3) Penegasan ulang: simpulan.", "Konjungsi argumentatif (sebab, oleh karena itu).", "Kalimat pengandaian (jika... maka).", "Argumen baik: logis, data/fakta, relevan."], contoh: ["Pengandaian: 'Jika UN dihapus, standar kelulusan bervariasi'", "Data: '80% guru setuju UN diadakan kembali'"] },
  ], rangkuman: ["Meyakinkan dengan argumen logis.", "Tesis-argumen-penegasan ulang.", "Data/fakta sebagai bukti.", "Kalimat pengandaian."] },
  latihan: makeSoal([
    ["Tujuan argumentasi...", ["Menghibur", "Meyakinkan", "Menceritakan", "Menggambar"], 1],
    ["'Jika... maka' termasuk...", ["Temporal", "Pengandaian", "Imperatif", "Majas"], 1],
    ["Tesis adalah...", ["Argumen", "Posisi penulis", "Simpulan", "Data"], 1],
    ["Argumen kuat...", ["Saya bilang", "Data: 70% siswa setuju karena tingkatkan prestasi", "Mungkin", "Terserah"], 1],
    ["'Dengan demikian' ada di bagian...", ["Pendahuluan", "Argumen", "Penegasan ulang", "Isi"], 2],
  ]),
  praktik: { petunjuk: "Tulis argumentasi 'Haruskah ponsel dilarang di sekolah?' Tentukan posisi, beri 3 argumen logis!", tips: ["Tesis jelas", "Argumen + alasan", "Konjungsi argumentatif"], contoh: "Tesis: Ponsel sebaiknya diatur, bukan dilarang.\nArgumen 1: Ponsel alat belajar efektif (kamus, internet).\nArgumen 2: Teknologi adalah kecakapan hidup penting.\nArgumen 3: Larangan total sulit diterapkan.\nKesimpulan: Aturan yang jelas lebih baik daripada larangan total." },
  kuis: makeSoal([
    ["'Oleh karena itu' menandai...", ["Tesis", "Argumen", "Penegasan ulang", "Pendahuluan"], 2],
    ["Argumen baik bersifat...", ["Emosional", "Logis + bukti", "Subjektif", "Pendek"], 1],
    ["'Seandainya semua sadar pendidikan' termasuk...", ["Tesis", "Argumen", "Pengandaian", "Kesimpulan"], 2],
    ["Pembeda argumentasi dan eksposisi...", ["Argumentasi meyakinkan, eksposisi menjelaskan", "Argumentasi pendek", "Eksposisi tanpa struktur", "Sama"], 0],
    ["Contoh tesis jelas...", ["Saya tidak suka", "UN perlu diadakan untuk jaga standar kualitas", "Mungkin", "Terserah"], 1],
  ]),
})

// Level 4: Juara
add("Kosakata & Istilah", {
  belajar: { tujuan: ["Memperkaya kosakata", "Memahami istilah serapan", "Menggunakan kamus"], materi: [
    { judul: "Memperkaya Kosakata", isi: ["Kosakata = perbendaharaan kata.", "Cara: baca, catat, praktikkan.", "Kata serapan: dari Arab, Sanskerta, Belanda, Inggris."], contoh: ["Belanda: kantor (kantoor), gordyn", "Arab: adil, ilmu, makna"] },
    { judul: "Istilah dan Padanannya", isi: ["Istilah: kata untuk konsep bidang ilmu.", "Padanan: brainstorming → curah pendapat.", "Gunakan padanan Indonesia jika ada."], contoh: ["Update → Pemutakhiran", "Download → Unduh", "Upload → Unggah", "Feedback → Umpan balik"] },
  ], rangkuman: ["Perkaya kosakata dengan membaca.", "Kata serapan dari berbagai bahasa.", "Gunakan padanan Indonesia."] },
  latihan: makeSoal([
    ["Padanan 'efektif'...", ["Berhasil guna", "Cepat", "Pintar", "Baik"], 0],
    ["'Unggah' padanan...", ["Download", "Upload", "Update", "Install"], 1],
    ["Kata baku 'izin'...", ["Ijin", "Izin", "Idzin", "Izinkah"], 1],
    ["'Karier' bentuk baku...", ["Karir", "Karier", "Carier", "Kareer"], 1],
    ["Serapan Belanda 'rekening'...", ["Hitungan", "Tabungan", "Cek", "Buku"], 1],
  ]),
  praktik: { petunjuk: "Baca artikel, catat 5 kata baru. Tulis arti dan buat kalimat!", tips: ["Gunakan KBBI", "Kata benar-benar baru"], contoh: "1. Ambigu: 'Pernyataannya ambigu.'\n2. Elaborasi: 'Peneliti melakukan elaborasi data.'\n3. Fondasi: 'Pendidikan fondasi bangsa.'\n4. Implikasi: 'Kebijakan ini punya implikasi luas.'\n5. Sinkronisasi: 'Perlu sinkronisasi kurikulum.'" },
  kuis: makeSoal([
    ["'Curah pendapat' padanan...", ["Brainstorming", "Meeting", "Presentasi", "Diskusi"], 0],
    ["Kata baku benar...", ["Tehnik", "Teknik", "Tehnik (baku)", "Tekhnik"], 1],
    ["'Praktik' dari bahasa...", ["Arab", "Belanda", "Inggris", "Sanskerta"], 1],
    ["Tidak baku dari 'nasihat'...", ["Nasehat", "Naschat", "Nasihat (baku)", "Nasehah"], 0],
    ["Manfaat kosakata kaya...", ["Bicara cepat", "Ekspresi gagasan tepat", "Populer", "Nilai naik"], 1],
  ]),
})

add("Wacana Akademik", {
  belajar: { tujuan: ["Memahami wacana akademik", "Mengidentifikasi gagasan utama", "Membaca kritis"], materi: [
    { judul: "Apa itu Wacana Akademik?", isi: ["Teks ilmiah formal untuk pendidikan/penelitian.", "Ciri: formal, objektif, sistematis, istilah teknis, referensi.", "Jenis: jurnal, makalah, skripsi, tesis."], contoh: ["'Pengaruh Media Sosial terhadap Prestasi Belajar'"] },
    { judul: "Membaca Kritis", isi: ["1) Identifikasi topik dan tujuan.", "2) Temukan gagasan utama (di awal/akhir paragraf).", "3) Identifikasi gagasan pendukung.", "4) Evaluasi: logis? data valid? simpulan sesuai?"], contoh: ["Utama: 'Media sosial dampak negatif konsentrasi'", "Pendukung: 'Penelitian UI: siswa aktif medsos >3jam/hari turun nilai 15%'"] },
  ], rangkuman: ["Teks ilmiah formal.", "Gagasan utama di awal/akhir paragraf.", "Baca kritis: evaluasi argumen."] },
  latihan: makeSoal([
    ["Ciri wacana akademik...", ["Santai", "Formal dan sistematis", "Penuh gambar", "Pendek"], 1],
    ["Gagasan utama biasanya di...", ["Tengah", "Awal/akhir paragraf", "Acak", "Tidak ada"], 1],
    ["Bukan wacana akademik...", ["Jurnal", "Skripsi", "Novel", "Makalah"], 2],
    ["Evaluasi argumen berarti...", ["Terima semua", "Nilai logika dan validitas", "Abaikan", "Hafal"], 1],
    ["Kalimat objektif...", ["Menurut saya", "Berdasarkan data penelitian", "Saya pikir", "Sepertinya"], 1],
  ]),
  praktik: { petunjuk: "Baca paragraf ini, temukan gagasan utama + 2 pendukung + evaluasi:\n'Pendidikan karakter harus prioritas. Data Kemendikbud: 1.500 kasus bullying 2024. Penelitian Harvard: siswa dengan pendidikan karakter punya prestasi 20% lebih tinggi.'", tips: ["Baca dua kali", "Tandai kalimat utama"], contoh: "Utama: 'Pendidikan karakter harus prioritas.'\nPendukung: 1) 1.500 kasus bullying. 2) Prestasi 20% lebih tinggi.\nEvaluasi: Argumen kuat, data dari sumber kredibel, spesifik." },
  kuis: makeSoal([
    ["Wacana akademik menggunakan bahasa...", ["Santai", "Formal", "Puitis", "Gaul"], 1],
    ["'Dengan demikian' kalimat...", ["Pembuka", "Kesimpulan", "Argumen", "Tesis"], 1],
    ["Fungsi referensi...", ["Perpanjang", "Landasan ilmiah", "Tambah halaman", "Pintar"], 1],
    ["'70% siswa setuju' termasuk...", ["Opini", "Fakta", "Asumsi", "Dugaan"], 1],
    ["Membaca kritis adalah...", ["Cepat", "Membaca + evaluasi", "Ulang-ulang", "Keras"], 1],
  ]),
})

add("Kaidah Bahasa Lanjutan", {
  belajar: { tujuan: ["Memahami konjungsi", "Menguasai kohesi dan koherensi", "Tanda baca"], materi: [
    { judul: "Konjungsi", isi: ["Koordinatif: setara (dan, atau, tetapi).", "Subordinatif: tidak setara (karena, sehingga, jika).", "Korelatif: berpasangan (baik... maupun, semakin... semakin)."], contoh: ["Koordinatif: 'Dia pintar dan rajin.'", "Subordinatif: 'Rajin sehingga nilainya bagus.'", "Korelatif: 'Semakin sering, semakin mahir.'"] },
    { judul: "Kohesi dan Koherensi", isi: ["Kohesi: keterkaitan gramatikal (kata ganti, konjungsi).", "Koherensi: keterkaitan makna/logis.", "Teks baik: kohesif dan koheren."], contoh: ["Kohesi: 'Andi beli buku. Buku itu tebal.' (ulang 'buku')"] },
  ], rangkuman: ["Konjungsi: koordinatif, subordinatif, korelatif.", "Kohesi: bentuk terhubung.", "Koherensi: makna logis."] },
  latihan: makeSoal([
    ["'Tetapi' termasuk konjungsi...", ["Koordinatif", "Subordinatif", "Korelatif", "Temporal"], 0],
    ["'Semakin... semakin' konjungsi...", ["Koordinatif", "Subordinatif", "Korelatif", "Temporal"], 2],
    ["Kohesi ditandai...", ["Topik sama", "Kata ganti/rujukan", "Tanda baca", "Panjang"], 1],
    ["Koherensi berarti...", ["Tidak berhubungan", "Mengalir logis", "Acak", "Panjang"], 1],
    ["'Ia beli komputer. Komputer itu untuk belajar' menunjukkan...", ["Koherensi", "Kohesi", "Konjungsi", "Tata bahasa"], 1],
  ]),
  praktik: { petunjuk: "Perbaiki paragraf ini agar kohesif dan koheren:\n'Andi pergi ke perpustakaan. Andi meminjam buku. Buku itu tentang sejarah. Andi suka sejarah.'", tips: ["Gunakan kata ganti", "Gabung kalimat pendek", "Urutan logis"], contoh: "Perbaikan: 'Andi pergi ke perpustakaan untuk meminjam buku tentang sejarah karena ia sangat menyukai sejarah.'" },
  kuis: makeSoal([
    ["'Tidak hanya... tetapi juga' konjungsi...", ["Koordinatif", "Subordinatif", "Korelatif", "Temporal"], 2],
    ["Perbedaan kohesi dan koherensi...", ["Kohesi bentuk, koherensi makna", "Sama", "Koherensi bentuk", "Tak ada beda"], 0],
    ["'Dia belajar keras karena ingin lulus' konjungsi...", ["dan", "tetapi", "karena", "atau"], 2],
    ["Teks koheren berarti...", ["Panjang", "Mudah dipahami dan logis", "Pendek", "Indah"], 1],
    ["'diletakkan' vs 'di meja' — 'di' sebagai...", ["Awalan vs kata depan", "Sama", "Kata depan vs awalan", "Keduanya awalan"], 0],
  ]),
})

add("Menulis Esai", {
  belajar: { tujuan: ["Memahami struktur esai", "Mengembangkan gagasan", "Menulis esai pendek"], materi: [
    { judul: "Apa itu Esai?", isi: ["Tulisan prosa yang mengungkapkan pandangan penulis.", "Lebih personal dan reflektif daripada artikel ilmiah.", "Esai baik: sudut pandang jelas, terstruktur, argumentatif."], contoh: ["'Kembali ke Alam: Refleksi tentang Kehidupan Modern'"] },
    { judul: "Struktur Esai", isi: ["1) Pendahuluan: hook, latar, tesis.", "2) Tubuh: 2-4 paragraf (argumen + bukti).", "3) Penutup: simpulan, ajakan.", "Transisi: selain itu, di sisi lain, oleh karena itu."], contoh: ["Hook: 'Pernahkah kamu merasa hidup terlalu bergantung pada ponsel?'"] },
  ], rangkuman: ["Tulisan personal argumentatif.", "Pendahuluan-tubuh-penutup.", "Hook menarik, transisi."] },
  latihan: makeSoal([
    ["Esai berbeda dengan artikel ilmiah karena...", ["Lebih personal", "Panjang", "Data riset", "Tidak subjektif"], 0],
    ["Hook ada di bagian...", ["Tubuh", "Pendahuluan", "Penutup", "Kesimpulan"], 1],
    ["Tesis adalah...", ["Simpulan", "Gagasan utama diargumenkan", "Daftar pustaka", "Judul"], 1],
    ["'Selain itu' termasuk...", ["Pertentangan", "Transisi", "Waktu", "Penutup"], 1],
    ["Penutup esai berisi...", ["Argumen baru", "Simpulan + tesis", "Data baru", "Gambar"], 1],
  ]),
  praktik: { petunjuk: "Tulis esai 3-4 paragraf 'Dampak Media Sosial terhadap Remaja'. Hook + tesis, 2 argumen, penutup!", tips: ["Pertanyaan reflektif", "1 argumen + 1 contoh per paragraf"], contoh: "Pendahuluan:\nPernahkah gelisah jika sehari tanpa Instagram? Media sosial berdampak positif dan negatif.\n\nTubuh:\nPositif: memudahkan koneksi dan akses informasi.\nNegatif: mengganggu konsentrasi belajar.\n\nPenutup:\nKita perlu bijak menggunakan media sosial." },
  kuis: makeSoal([
    ["Esai bersifat...", ["Objektif murni", "Personal dan reflektif", "Ilmiah", "Formal"], 1],
    ["Fungsi hook...", ["Menutup", "Menarik perhatian", "Menilai", "Menyimpulkan"], 1],
    ["Transisi 'di sisi lain'...", ["Menambah", "Pertentangan", "Waktu", "Simpulan"], 1],
    ["Bagian tubuh esai berisi...", ["Hook", "Argumen + bukti", "Simpulan", "Daftar pustaka"], 1],
    ["'Oleh karena itu' di bagian...", ["Pendahuluan", "Tubuh", "Penutup", "Hook"], 2],
  ]),
})

function makeSoal(arr: [string, string[], number][]): Soal[] {
  return arr.map(([soal, opsi, jawaban], id) => ({
    id: id + 1, soal, opsi: opsi as string[], jawaban, penjelasan: `Jawaban: ${(opsi as string[])[jawaban]}`
  }))
}

async function seedContent() {
  for (const [title, konten] of Object.entries(data)) {
    const unit = await db.learningUnit.findFirst({ where: { title } })
    if (unit) {
      await db.learningUnit.update({
        where: { id: unit.id },
        data: { content: JSON.stringify(konten) },
      })
      console.log(`✅ Konten terisi: ${title}`)
    } else {
      console.log(`⚠️ Unit tidak ditemukan: ${title}`)
    }
  }
  console.log("\n🎉 Selesai mengisi konten!")
}

seedContent().catch(e => { console.error(e); process.exit(1) })
