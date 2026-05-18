import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const UKBI_SD_QUESTIONS = [
  // SEKSI I: MENDENGARKAN (8)
  { seksi: "MENDENGARKAN", text: "Ibu: 'Budi, bangun tidur jangan lupa merapikan tempat tidur ya.' Budi: 'Baik, Bu.' Apa yang harus dilakukan Budi?", passage: "Dialog antara ibu dan Budi tentang kegiatan pagi hari.", type: "PILIHAN_GANDA", options: [{id:"A",text:"Makan pagi"},{id:"B",text:"Merapikan tempat tidur"},{id:"C",text:"Menonton televisi"},{id:"D",text:"Bermain"}], correctAnswer: "B", explanation: "Ibu menyuruh Budi merapikan tempat tidur.", difficulty: "EASY", cognitive: "PEMAHAMAN", domain: "SOSIAL", keywords: ["keluarga","kebersihan"], tingkat: "SD", isVerified: true },
  { seksi: "MENDENGARKAN", text: "Guru: 'Anak-anak, besok kita akan belajar di luar kelas. Bawa buku tulis dan pensil.' Kapan kegiatan belajar di luar kelas?", passage: "Pengumuman guru tentang kegiatan belajar.", type: "PILIHAN_GANDA", options: [{id:"A",text:"Hari ini"},{id:"B",text:"Besok"},{id:"C",text:"Lusa"},{id:"D",text:"Minggu depan"}], correctAnswer: "B", explanation: "Guru mengatakan 'besok kita akan belajar di luar kelas'.", difficulty: "EASY", cognitive: "PEMAHAMAN", domain: "AKADEMIK", keywords: ["sekolah","pengumuman"], tingkat: "SD", isVerified: true },
  { seksi: "MENDENGARKAN", text: "Rina: 'Siti, apa warna buku kesukaanmu?' Siti: 'Aku suka warna biru.' Warna apa yang disukai Siti?", passage: "Percakapan tentang warna kesukaan.", type: "PILIHAN_GANDA", options: [{id:"A",text:"Merah"},{id:"B",text:"Biru"},{id:"C",text:"Hijau"},{id:"D",text:"Kuning"}], correctAnswer: "B", explanation: "Siti berkata 'Aku suka warna biru'.", difficulty: "EASY", cognitive: "MENGINGAT", domain: "SOSIAL", keywords: ["warna","percakapan"], tingkat: "SD", isVerified: true },
  { seksi: "MENDENGARKAN", text: "Ayah mengajak Doni ke perpustakaan. Doni senang sekali karena ia suka membaca. Bagaimana perasaan Doni?", passage: "Cerita tentang kunjungan ke perpustakaan.", type: "PILIHAN_GANDA", options: [{id:"A",text:"Sedih"},{id:"B",text:"Bosan"},{id:"C",text:"Senang"},{id:"D",text:"Marah"}], correctAnswer: "C", explanation: "Doni 'senang sekali' karena suka membaca.", difficulty: "EASY", cognitive: "PEMAHAMAN", domain: "SOSIAL", keywords: ["perasaan","keluarga"], tingkat: "SD", isVerified: true },
  { seksi: "MENDENGARKAN", text: "Bu guru bertanya: 'Siapa yang bisa menyebutkan contoh hewan berkaki empat?' Murid menjawab: 'Kucing, Bu.' Apa yang ditanyakan Bu guru?", passage: "Tanya jawab di kelas tentang hewan.", type: "PILIHAN_GANDA", options: [{id:"A",text:"Hewan berkaki dua"},{id:"B",text:"Hewan berkaki empat"},{id:"C",text:"Hewan bersayap"},{id:"D",text:"Hewan berenang"}], correctAnswer: "B", explanation: "Bu guru menanyakan 'contoh hewan berkaki empat'.", difficulty: "EASY", cognitive: "MENGINGAT", domain: "AKADEMIK", keywords: ["sekolah","tanya jawab"], tingkat: "SD", isVerified: true },
  { seksi: "MENDENGARKAN", text: "Pengumuman: 'Lomba mewarnai akan diadakan hari Sabtu di aula sekolah. Pendaftaran di ruang guru.' Di mana lomba diadakan?", passage: "Pengumuman lomba mewarnai di sekolah.", type: "PILIHAN_GANDA", options: [{id:"A",text:"Ruang kelas"},{id:"B",text:"Lapangan"},{id:"C",text:"Aula sekolah"},{id:"D",text:"Perpustakaan"}], correctAnswer: "C", explanation: "Pengumuman mengatakan 'di aula sekolah'.", difficulty: "EASY", cognitive: "PEMAHAMAN", domain: "AKADEMIK", keywords: ["lomba","informasi"], tingkat: "SD", isVerified: true },
  { seksi: "MENDENGARKAN", text: "Dina bercerita: 'Kemarin aku ke kebun binatang bersama papa. Aku melihat gajah, jerapah, dan harimau.' Hewan apa yang tidak disebut Dina?", passage: "Cerita tentang kunjungan ke kebun binatang.", type: "PILIHAN_GANDA", options: [{id:"A",text:"Gajah"},{id:"B",text:"Jerapah"},{id:"C",text:"Harimau"},{id:"D",text:"Buaya"}], correctAnswer: "D", explanation: "Dina menyebut gajah, jerapah, dan harimau, tidak menyebut buaya.", difficulty: "MEDIUM", cognitive: "ANALISIS", domain: "SOSIAL", keywords: ["hewan","cerita"], tingkat: "SD", isVerified: true },
  { seksi: "MENDENGARKAN", text: "Ibu: 'Cuci tanganmu dulu sebelum makan!' Andi pergi ke wastafel. Apa yang akan dilakukan Andi?", passage: "Perintah ibu sebelum makan.", type: "PILIHAN_GANDA", options: [{id:"A",text:"Langsung makan"},{id:"B",text:"Mencuci tangan"},{id:"C",text:"Bermain"},{id:"D",text:"Tidur"}], correctAnswer: "B", explanation: "Ibu menyuruh cuci tangan, Andi pergi ke wastafel untuk mencuci tangan.", difficulty: "EASY", cognitive: "PEMAHAMAN", domain: "SOSIAL", keywords: ["kebersihan","keluarga"], tingkat: "SD", isVerified: true },
  // MERESPONS_KAIDAH (9)
  { seksi: "MERESPONS_KAIDAH", text: "Kalimat yang menggunakan kata 'sedang' dengan benar adalah?", passage: "", type: "PILIHAN_GANDA", options: [{id:"A",text:"Ayah sedang membaca koran"},{id:"B",text:"Sedang ayah membaca koran"},{id:"C",text:"Ayah sedang membaca"},{id:"D",text:"Membaca ayah koran"}], correctAnswer: "A", explanation: "Penggunaan 'sedang' yang benar adalah sebagai kata bantu diikuti kata kerja.", difficulty: "EASY", cognitive: "PENERAPAN", domain: "AKADEMIK", keywords: ["tata bahasa","kalimat"], tingkat: "SD", isVerified: true },
  { seksi: "MERESPONS_KAIDAH", text: "Penulisan huruf kapital yang tepat adalah?", passage: "", type: "PILIHAN_GANDA", options: [{id:"A",text:"ibu pergi ke pasar"},{id:"B",text:"Ibu pergi ke Pasar"},{id:"C",text:"Ibu pergi ke pasar"},{id:"D",text:"ibu Pergi ke pasar"}], correctAnswer: "C", explanation: "Huruf kapital digunakan di awal kalimat. Nama tempat seperti 'pasar' tidak perlu kapital.", difficulty: "EASY", cognitive: "PENERAPAN", domain: "AKADEMIK", keywords: ["huruf kapital","ejaan"], tingkat: "SD", isVerified: true },
  { seksi: "MERESPONS_KAIDAH", text: "Kata 'berlari' berasal dari kata dasar 'lari' mendapat awalan?", passage: "", type: "PILIHAN_GANDA", options: [{id:"A",text:"me-"},{id:"B",text:"ber-"},{id:"C",text:"ter-"},{id:"D",text:"di-"}], correctAnswer: "B", explanation: "Kata 'berlari' mendapatkan awalan ber-.", difficulty: "MEDIUM", cognitive: "PEMAHAMAN", domain: "AKADEMIK", keywords: ["imbuhan","kata"], tingkat: "SD", isVerified: true },
  { seksi: "MERESPONS_KAIDAH", text: "Penulisan kata ulang yang benar adalah?", passage: "", type: "PILIHAN_GANDA", options: [{id:"A",text:"Buku-buku"},{id:"B",text:"Buku buku"},{id:"C",text:"Buku2"},{id:"D",text:"buku-buku"}], correctAnswer: "A", explanation: "Kata ulang ditulis dengan tanda hubung dan huruf pertama kapital di awal kalimat.", difficulty: "MEDIUM", cognitive: "PENERAPAN", domain: "AKADEMIK", keywords: ["kata ulang","ejaan"], tingkat: "SD", isVerified: true },
  { seksi: "MERESPONS_KAIDAH", text: "Kalimat perintah ditandai dengan tanda baca?", passage: "", type: "PILIHAN_GANDA", options: [{id:"A",text:"Titik (.)"},{id:"B",text:"Koma (,)"},{id:"C",text:"Tanda seru (!)"},{id:"D",text:"Tanda tanya (?)"}], correctAnswer: "C", explanation: "Kalimat perintah diakhiri dengan tanda seru (!).", difficulty: "EASY", cognitive: "MENGINGAT", domain: "AKADEMIK", keywords: ["tanda baca","kalimat"], tingkat: "SD", isVerified: true },
  { seksi: "MERESPONS_KAIDAH", text: "Bentuk yang benar dari kata 'menyapu' adalah?", passage: "", type: "PILIHAN_GANDA", options: [{id:"A",text:"Menyapu"},{id:"B",text:"Nyapu"},{id:"C",text:"Menyampah"},{id:"D",text:"Menyabut"}], correctAnswer: "A", explanation: "Kata dasar 'sapu' + awalan me- menjadi 'menyapu'.", difficulty: "MEDIUM", cognitive: "PENERAPAN", domain: "AKADEMIK", keywords: ["imbuhan","me-"], tingkat: "SD", isVerified: true },
  { seksi: "MERESPONS_KAIDAH", text: "Kalimat berikut yang menggunakan kata depan 'di' dengan benar adalah?", passage: "", type: "PILIHAN_GANDA", options: [{id:"A",text:"Disekolah"},{id:"B",text:"di rumah"},{id:"C",text:"Di rumah"},{id:"D",text:"dirumah"}], correctAnswer: "C", explanation: "Kata depan 'di' ditulis terpisah dari kata yang mengikutinya. Di awal kalimat ditulis kapital.", difficulty: "MEDIUM", cognitive: "PENERAPAN", domain: "AKADEMIK", keywords: ["kata depan","ejaan"], tingkat: "SD", isVerified: true },
  { seksi: "MERESPONS_KAIDAH", text: "Kata yang merupakan sinonim dari 'besar' adalah?", passage: "", type: "PILIHAN_GANDA", options: [{id:"A",text:"Kecil"},{id:"B",text:"Luas"},{id:"C",text:"Berat"},{id:"D",text:"Tinggi"}], correctAnswer: "B", explanation: "Sinonim 'besar' adalah 'luas' (dalam arti ukuran). 'Kecil' adalah antonim.", difficulty: "EASY", cognitive: "MENGINGAT", domain: "AKADEMIK", keywords: ["sinonim","kosa kata"], tingkat: "SD", isVerified: true },
  { seksi: "MERESPONS_KAIDAH", text: "Penulisan kalimat tanya yang benar diakhiri dengan?", passage: "", type: "PILIHAN_GANDA", options: [{id:"A",text:"Tanda seru"},{id:"B",text:"Tanda tanya"},{id:"C",text:"Titik"},{id:"D",text:"Koma"}], correctAnswer: "B", explanation: "Kalimat tanya diakhiri dengan tanda tanya (?).", difficulty: "EASY", cognitive: "MENGINGAT", domain: "AKADEMIK", keywords: ["tanda baca","kalimat tanya"], tingkat: "SD", isVerified: true },
  // MEMBACA (8)
  { seksi: "MEMBACA", text: "Bacalah paragraf berikut!\n'Kucing adalah hewan peliharaan yang lucu. Kucing suka bermain bola kecil. Kucing juga suka tidur di tempat yang hangat.'\nApa yang disukai kucing?", passage: "", type: "PILIHAN_GANDA", options: [{id:"A",text:"Bermain bola dan tidur"},{id:"B",text:"Berenang"},{id:"C",text:"Memanjat pohon"},{id:"D",text:"Makan ikan"}], correctAnswer: "A", explanation: "Teks menyebut kucing suka bermain bola dan tidur di tempat hangat.", difficulty: "EASY", cognitive: "PEMAHAMAN", domain: "AKADEMIK", keywords: ["membaca","hewan"], tingkat: "SD", isVerified: true },
  { seksi: "MEMBACA", text: "Bacalah paragraf berikut!\n'Setiap pagi Rani membantu ibu menyiram tanaman. Tanaman di halaman rumah Rani tumbuh subur dan berbunga indah.'\nApa yang dilakukan Rani setiap pagi?", passage: "", type: "PILIHAN_GANDA", options: [{id:"A",text:"Menyiram tanaman"},{id:"B",text:"Bermain"},{id:"C",text:"Sekolah"},{id:"D",text:"Tidur"}], correctAnswer: "A", explanation: "Teks mengatakan 'Setiap pagi Rani membantu ibu menyiram tanaman'.", difficulty: "EASY", cognitive: "PEMAHAMAN", domain: "SOSIAL", keywords: ["membaca","kebiasaan"], tingkat: "SD", isVerified: true },
  { seksi: "MEMBACA", text: "Bacalah paragraf berikut!\n'Lingkungan sehat penting bagi kita. Kita harus membuang sampah pada tempatnya. Kita juga harus rajin membersihkan rumah.'\nApa yang harus kita lakukan agar lingkungan sehat?", passage: "", type: "PILIHAN_GANDA", options: [{id:"A",text:"Membuang sampah sembarangan"},{id:"B",text:"Membuang sampah pada tempatnya"},{id:"C",text:"Menimbun sampah"},{id:"D",text:"Membakar sampah"}], correctAnswer: "B", explanation: "Teks menyebut 'membuang sampah pada tempatnya'.", difficulty: "EASY", cognitive: "PEMAHAMAN", domain: "SOSIAL", keywords: ["lingkungan","kebersihan"], tingkat: "SD", isVerified: true },
  { seksi: "MEMBACA", text: "Bacalah paragraf berikut!\n'Budi dan Adi bermain sepak bola di lapangan. Tiba-tiba Adi terjatuh. Budi segera menolong Adi berdiri.'\nApa yang dilakukan Budi saat Adi terjatuh?", passage: "", type: "PILIHAN_GANDA", options: [{id:"A",text:"Tertawa"},{id:"B",text:"Menolong Adi"},{id:"C",text:"Pulang"},{id:"D",text:"Pergi"}], correctAnswer: "B", explanation: "Budi segera menolong Adi berdiri.", difficulty: "EASY", cognitive: "PEMAHAMAN", domain: "SOSIAL", keywords: ["persahabatan","tolong menolong"], tingkat: "SD", isVerified: true },
  { seksi: "MEMBACA", text: "Bacalah paragraf berikut!\n'Sekolah Dasar Harapan terletak di desa Sukamaju. Sekolah ini memiliki halaman yang luas dan pohon-pohon yang rindang.'\nDi mana SD Harapan berada?", passage: "", type: "PILIHAN_GANDA", options: [{id:"A",text:"Di kota"},{id:"B",text:"Di desa Sukamaju"},{id:"C",text:"Di gunung"},{id:"D",text:"Di tepi pantai"}], correctAnswer: "B", explanation: "Teks menyebut 'terletak di desa Sukamaju'.", difficulty: "EASY", cognitive: "PEMAHAMAN", domain: "AKADEMIK", keywords: ["membaca","informasi"], tingkat: "SD", isVerified: true },
  { seksi: "MEMBACA", text: "Bacalah paragraf berikut!\n'Pada hari Minggu, keluarga Andi pergi ke pasar. Ibu membeli sayur dan buah. Ayah membeli ikan.'\nApa yang dibeli ibu?", passage: "", type: "PILIHAN_GANDA", options: [{id:"A",text:"Ikan"},{id:"B",text:"Sayur dan buah"},{id:"C",text:"Mainan"},{id:"D",text:"Pakaian"}], correctAnswer: "B", explanation: "Ibu membeli sayur dan buah.", difficulty: "EASY", cognitive: "PEMAHAMAN", domain: "SOSIAL", keywords: ["keluarga","pasar"], tingkat: "SD", isVerified: true },
  { seksi: "MEMBACA", text: "Bacalah paragraf berikut!\n'Gajah adalah hewan terbesar di darat. Gajah memiliki belalai yang panjang. Gajah juga memiliki telinga yang lebar.'\nCiri khas gajah adalah...", passage: "", type: "PILIHAN_GANDA", options: [{id:"A",text:"Belalai panjang"},{id:"B",text:"Bulu tebal"},{id:"C",text:"Cakar tajam"},{id:"D",text:"Sayap lebar"}], correctAnswer: "A", explanation: "Teks menyebut gajah memiliki 'belalai yang panjang'.", difficulty: "EASY", cognitive: "PEMAHAMAN", domain: "AKADEMIK", keywords: ["hewan","ciri-ciri"], tingkat: "SD", isVerified: true },
  { seksi: "MEMBACA", text: "Bacalah paragraf berikut!\n'Sampah plastik berbahaya bagi lingkungan. Kantong plastik sulit diuraikan tanah. Sebaiknya kita menggunakan tas belanja sendiri.'\nApa yang sebaiknya kita gunakan untuk mengurangi sampah plastik?", passage: "", type: "PILIHAN_GANDA", options: [{id:"A",text:"Kantong plastik baru"},{id:"B",text:"Tas belanja sendiri"},{id:"C",text:"Kertas"},{id:"D",text:"Kardus"}], correctAnswer: "B", explanation: "Teks menyarankan 'menggunakan tas belanja sendiri'.", difficulty: "MEDIUM", cognitive: "PENERAPAN", domain: "SOSIAL", keywords: ["lingkungan","plastik"], tingkat: "SD", isVerified: true },
];

const TKA_SD_QUESTIONS = [
  // LITERASI_MEMBACA (10)
  { kompetensi: "LITERASI_MEMBACA", subKompetensi: "Menemukan Informasi", text: "Bacalah teks berikut!\n\n'Kura-kura adalah hewan yang hidup di air dan di darat. Kura-kura memiliki tempurung keras di punggungnya yang berfungsi sebagai pelindung diri.'\nDi mana kura-kura bisa hidup?", type: "PILIHAN_GANDA", options: [{id:"A",text:"Di air saja"},{id:"B",text:"Di darat saja"},{id:"C",text:"Di air dan di darat"},{id:"D",text:"Di pohon"}], correctAnswer: "C", explanation: "Teks menyebut kura-kura hidup 'di air dan di darat'.", difficulty: "EASY", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "LITERASI_MEMBACA", subKompetensi: "Menyimpulkan Isi", text: "Bacalah teks berikut!\n\n'Setiap pagi, Sari sarapan sebelum berangkat sekolah. Ibu selalu menyiapkan nasi dan sayur. Sari makan dengan lahap. Setelah itu, ia pamit dan berangkat ke sekolah.'\nKegiatan Sari setelah sarapan adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Bermain"},{id:"B",text:"Pamit dan berangkat sekolah"},{id:"C",text:"Menonton TV"},{id:"D",text:"Tidur lagi"}], correctAnswer: "B", explanation: "Setelah sarapan, Sari 'pamit dan berangkat ke sekolah'.", difficulty: "EASY", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "LITERASI_MEMBACA", subKompetensi: "Menentukan Ide Pokok", text: "Bacalah paragraf berikut!\n\n'Ayam berkokok di pagi hari. Ayam juga bertelur. Ayam memiliki jengger di kepala. Ayam termasuk hewan unggas.'\nIde pokok paragraf tersebut adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Ayam berkokok"},{id:"B",text:"Ciri-ciri ayam"},{id:"C",text:"Ayam bertelur"},{id:"D",text:"Ayam unggas"}], correctAnswer: "B", explanation: "Paragraf menjelaskan beberapa hal tentang ayam (berkokok, bertelur, berjengger).", difficulty: "MEDIUM", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "LITERASI_MEMBACA", subKompetensi: "Menemukan Informasi", text: "Bacalah teks berikut!\n\n'Indonesia adalah negara kepulauan. Indonesia memiliki ribuan pulau. Pulau-pulau besar di Indonesia adalah Jawa, Sumatera, Kalimantan, Sulawesi, dan Papua.'\nBerapa jumlah pulau besar yang disebut dalam teks?", type: "PILIHAN_GANDA", options: [{id:"A",text:"Tiga"},{id:"B",text:"Empat"},{id:"C",text:"Lima"},{id:"D",text:"Enam"}], correctAnswer: "C", explanation: "Teks menyebut lima pulau besar: Jawa, Sumatera, Kalimantan, Sulawesi, Papua.", difficulty: "MEDIUM", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "LITERASI_MEMBACA", subKompetensi: "Kata Tanya", text: "Bacalah teks berikut!\n\n'Rino memelihara ikan cupang di akuarium. Setiap hari ia memberi makan ikan itu. Ia juga mengganti air akuarium seminggu sekali.'\nKata tanya yang tepat untuk menanyakan cara Rino merawat ikan adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Apa"},{id:"B",text:"Siapa"},{id:"C",text:"Bagaimana"},{id:"D",text:"Kapan"}], correctAnswer: "C", explanation: "Kata tanya 'bagaimana' digunakan untuk menanyakan cara atau proses.", difficulty: "MEDIUM", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "LITERASI_MEMBACA", subKompetensi: "Menemukan Informasi", text: "Bacalah teks berikut!\n\n'Buah mangga mengandung vitamin C yang tinggi. Vitamin C baik untuk kesehatan kulit dan daya tahan tubuh.'\nBuah mangga baik untuk...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Kesehatan mata"},{id:"B",text:"Kesehatan kulit dan daya tahan tubuh"},{id:"C",text:"Kekuatan tulang"},{id:"D",text:"Pertumbuhan rambut"}], correctAnswer: "B", explanation: "Teks menyebut vitamin C baik untuk 'kesehatan kulit dan daya tahan tubuh'.", difficulty: "EASY", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "LITERASI_MEMBACA", subKompetensi: "Kata Penghubung", text: "Bacalah teks berikut!\n\n'Adi ingin membeli buku cerita, ... ia tidak membawa uang.'\nKata penghubung yang tepat untuk melengkapi kalimat tersebut adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"dan"},{id:"B",text:"atau"},{id:"C",text:"tetapi"},{id:"D",text:"karena"}], correctAnswer: "C", explanation: "Kata 'tetapi' menunjukkan hubungan pertentangan antara keinginan dan kenyataan.", difficulty: "MEDIUM", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "LITERASI_MEMBACA", subKompetensi: "Menyimpulkan", text: "Bacalah teks berikut!\n\n'Sampah di sungai menyebabkan banjir. Banyak warga membuang sampah sembarangan. Akibatnya, saat hujan deras, air sungai meluap.'\nApa penyebab banjir menurut teks?", type: "PILIHAN_GANDA", options: [{id:"A",text:"Hujan deras"},{id:"B",text:"Sampah di sungai"},{id:"C",text:"Air laut pasang"},{id:"D",text:"Pohon tumbang"}], correctAnswer: "B", explanation: "Teks menyebut 'sampah di sungai menyebabkan banjir'.", difficulty: "MEDIUM", weight: 1.5, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "LITERASI_MEMBACA", subKompetensi: "Informasi Tersurat", text: "Bacalah teks berikut!\n\n'Upacara bendera dilaksanakan setiap hari Senin. Semua siswa wajib mengenakan seragam putih merah. Upacara dimulai pukul 07.00.'\nKapan upacara bendera dilaksanakan?", type: "PILIHAN_GANDA", options: [{id:"A",text:"Setiap hari"},{id:"B",text:"Setiap hari Senin"},{id:"C",text:"Setiap hari Jumat"},{id:"D",text:"Setiap awal bulan"}], correctAnswer: "B", explanation: "Teks menyebut 'setiap hari Senin'.", difficulty: "EASY", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "LITERASI_MEMBACA", subKompetensi: "Kesimpulan", text: "Bacalah teks berikut!\n\n'Bermain layang-layang menyenangkan. Namun, kita harus hati-hati karena benang layang-layang dapat melukai orang lain. Carilah tempat yang aman dan jauh dari kabel listrik.'\nKesimpulan yang tepat adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Layang-layang berbahaya"},{id:"B",text:"Bermain layang-layang harus di tempat aman"},{id:"C",text:"Layang-layang dilarang"},{id:"D",text:"Bermain layang-layang mahal"}], correctAnswer: "B", explanation: "Teks menekankan pentingnya keamanan saat bermain layang-layang.", difficulty: "MEDIUM", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  // TATA_BAHASA (8)
  { kompetensi: "TATA_BAHASA", subKompetensi: "Kata Baku", text: "Kata baku yang tepat untuk 'karena' adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Karna"},{id:"B",text:"Karena"},{id:"C",text:"Kerna"},{id:"D",text:"Kareno"}], correctAnswer: "B", explanation: "Penulisan kata baku yang benar adalah 'karena'.", difficulty: "EASY", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "TATA_BAHASA", subKompetensi: "Kalimat Efektif", text: "Kalimat berikut yang merupakan kalimat efektif adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Adik sedang tidur di kamar"},{id:"B",text:"Adik yang sedang tidur di kamar"},{id:"C",text:"Adik tidur di kamar adalah"},{id:"D",text:"Di kamar adik tidur"}], correctAnswer: "A", explanation: "Kalimat efektif memiliki subjek (adik), predikat (tidur), dan keterangan (di kamar) yang jelas.", difficulty: "MEDIUM", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "TATA_BAHASA", subKompetensi: "Subjek Predikat", text: "Subjek dalam kalimat 'Ayah sedang membaca koran' adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"membaca"},{id:"B",text:"koran"},{id:"C",text:"Ayah"},{id:"D",text:"sedang"}], correctAnswer: "C", explanation: "Subjek kalimat adalah 'Ayah' (orang yang melakukan kegiatan).", difficulty: "EASY", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "TATA_BAHASA", subKompetensi: "Kata Tanya", text: "Kata tanya untuk menanyakan waktu adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Apa"},{id:"B",text:"Siapa"},{id:"C",text:"Kapan"},{id:"D",text:"Di mana"}], correctAnswer: "C", explanation: "Kata tanya 'kapan' digunakan untuk menanyakan waktu.", difficulty: "EASY", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "TATA_BAHASA", subKompetensi: "Kata Sifat", text: "Kata sifat terdapat dalam kalimat...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Budi pergi ke sekolah"},{id:"B",text:"Bunga mawar itu sangat indah"},{id:"C",text:"Ibu memasak nasi"},{id:"D",text:"Ayah membaca buku"}], correctAnswer: "B", explanation: "Kata 'indah' adalah kata sifat yang menerangkan bunga mawar.", difficulty: "EASY", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "TATA_BAHASA", subKompetensi: "Kata Kerja", text: "Kata kerja dalam kalimat 'Kakak menulis surat' adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Kakak"},{id:"B",text:"Menulis"},{id:"C",text:"Surat"},{id:"D",text:"Menulis surat"}], correctAnswer: "B", explanation: "Kata 'menulis' adalah kata kerja (verb) yang menunjukkan kegiatan.", difficulty: "EASY", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "TATA_BAHASA", subKompetensi: "Antonim", text: "Antonim dari kata 'tinggi' adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Besar"},{id:"B",text:"Panjang"},{id:"C",text:"Pendek"},{id:"D",text:"Lebar"}], correctAnswer: "C", explanation: "Antonim (lawan kata) dari 'tinggi' adalah 'pendek'.", difficulty: "EASY", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "TATA_BAHASA", subKompetensi: "Tanda Baca", text: "Tanda baca yang tepat di akhir kalimat 'Ayo kita pergi bermain' adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Titik (.)"},{id:"B",text:"Tanda seru (!)"},{id:"C",text:"Tanda tanya (?)"},{id:"D",text:"Koma (,)"}], correctAnswer: "B", explanation: "Kalimat ajakan 'Ayo' menggunakan tanda seru(!) di akhir kalimat.", difficulty: "EASY", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  // SASTRA (7)
  { kompetensi: "SASTRA", subKompetensi: "Puisi Anak", text: "Bacalah puisi berikut!\n\n'Bulan sabit di malam hari\nCahayanya indah menari\nBintang-bintang bertaburan\nMenghias gelapnya malam'\n\nPuisi tersebut bertema tentang...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Matahari"},{id:"B",text:"Bulan dan bintang"},{id:"C",text:"Pelangi"},{id:"D",text:"Awan"}], correctAnswer: "B", explanation: "Puisi bercerita tentang bulan sabit dan bintang-bintang di malam hari.", difficulty: "EASY", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "SASTRA", subKompetensi: "Dongeng", text: "Dalam dongeng 'Kancil dan Buaya', Kancil menipu buaya untuk menyeberangi sungai. Watak Kancil adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Jujur"},{id:"B",text:"Cerdik"},{id:"C",text:"Pemarah"},{id:"D",text:"Malas"}], correctAnswer: "B", explanation: "Kancil terkenal dengan kecerdikannya dalam cerita rakyat.", difficulty: "EASY", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "SASTRA", subKompetensi: "Amanat Cerita", text: "Dalam dongeng 'Semut dan Belalang', semut rajin mengumpulkan makanan sedangkan belalang malas. Akhirnya semut memiliki cukup makanan saat musim dingin. Amanat dari cerita tersebut adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Malas itu baik"},{id:"B",text:"Rajin berhemat dan bekerja keras"},{id:"C",text:"Semut lebih pintar"},{id:"D",text:"Belalang itu nakal"}], correctAnswer: "B", explanation: "Cerita mengajarkan pentingnya rajin bekerja keras dan berhemat.", difficulty: "MEDIUM", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "SASTRA", subKompetensi: "Tokoh", text: "Tokoh antagonis dalam cerita 'Bawang Merah dan Bawang Putih' adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Bawang Putih"},{id:"B",text:"Bawang Merah"},{id:"C",text:"Ibu Peri"},{id:"D",text:"Ayah"}], correctAnswer: "B", explanation: "Bawang Merah digambarkan sebagai tokoh yang jahat atau antagonis.", difficulty: "MEDIUM", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "SASTRA", subKompetensi: "Rima", text: "Bacalah pantun berikut!\n\n'Pergi ke pasar membeli kain\nJangan lupa membeli benang\n...\nJadilah anak yang berjuang'\n\nBaris yang tepat untuk melengkapi pantun tersebut adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Rajin belajar di malam hari"},{id:"B",text:"Kalau ingin menjadi orang"},{id:"C",text:"Jangan suka membuang waktu"},{id:"D",text:"Belajar keras setiap hari"}], correctAnswer: "C", explanation: "Pantun memiliki rima akhir a-b-a-b. Baris 'Jangan suka membuang waktu' memiliki rima '-u-ang' yang sesuai.", difficulty: "MEDIUM", weight: 1.5, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "SASTRA", subKompetensi: "Latar Cerita", text: "Dalam cerita 'Kancil Mencuri Timun', latar tempat cerita tersebut adalah...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Sekolah"},{id:"B",text:"Kebun timun"},{id:"C",text:"Laut"},{id:"D",text:"Gunung"}], correctAnswer: "B", explanation: "Cerita Kancil Mencuri Timun berlatar di kebun timun.", difficulty: "EASY", weight: 1.0, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
  { kompetensi: "SASTRA", subKompetensi: "Peribahasa", text: "Peribahasa 'Bagai air di daun talas' berarti...", type: "PILIHAN_GANDA", options: [{id:"A",text:"Orang yang tidak punya pendirian tetap"},{id:"B",text:"Orang yang sangat kaya"},{id:"C",text:"Orang yang pemalu"},{id:"D",text:"Orang yang rajin"}], correctAnswer: "A", explanation: "Peribahasa 'bagai air di daun talas' menggambarkan orang yang tidak punya pendirian tetap.", difficulty: "HARD", weight: 1.5, year: 2026, source: "TKA SD 2026", tingkat: "SD", isVerified: true },
];

async function main() {
  console.log("=== Seeding SD-level questions ===");

  // Seed UKBI SD questions
  let ukbiAdded = 0;
  for (const q of UKBI_SD_QUESTIONS) {
    const exists = await prisma.uKBIQuestion.findFirst({
      where: { text: q.text, tingkat: "SD" },
    });
    if (!exists) {
      await prisma.uKBIQuestion.create({ data: q as any });
      ukbiAdded++;
    }
  }
  console.log(`UKBI SD: ${ukbiAdded} questions added`);

  // Seed TKA SD questions
  let tkaAdded = 0;
  for (const q of TKA_SD_QUESTIONS) {
    const exists = await prisma.tKAQuestion.findFirst({
      where: { text: q.text, tingkat: "SD" },
    });
    if (!exists) {
      await prisma.tKAQuestion.create({ data: q as any });
      tkaAdded++;
    }
  }
  console.log(`TKA SD: ${tkaAdded} questions added`);

  // Seed SD packages
  const existing = await prisma.paketKompetensi.count({
    where: { type: { in: ["UKBI_SD", "UKBI_LATIHAN_SD", "TKA_SD"] } },
  });

  if (existing === 0) {
    // UKBI SD Simulasi
    await prisma.paketKompetensi.create({
      data: {
        title: "Simulasi UKBI - SD",
        description: "Simulasi UKBI untuk siswa SD. Mengukur kemahiran berbahasa Indonesia dasar.",
        type: "UKBI_SD",
        mode: "SIMULASI",
        duration: 45,
        passingScore: 400,
        passingGrade: "SEMENJANA",
        totalQuestions: 15,
        isActive: true,
        isPremium: false,
        attemptLimit: -1,
        sections: [
          { name: "Mendengarkan", seksi: "MENDENGARKAN", timeLimit: 15, count: 5 },
          { name: "Merespons Kaidah", seksi: "MERESPONS_KAIDAH", timeLimit: 15, count: 5 },
          { name: "Membaca", seksi: "MEMBACA", timeLimit: 15, count: 5 },
        ],
      },
    });

    // UKBI SD Latihan
    await prisma.paketKompetensi.create({
      data: {
        title: "Latihan UKBI - Membaca SD",
        description: "Latihan membaca pemahaman untuk siswa SD.",
        type: "UKBI_LATIHAN_SD",
        mode: "LATIHAN",
        duration: 20,
        passingScore: 0,
        passingGrade: "-",
        totalQuestions: 8,
        isActive: true,
        isPremium: false,
        attemptLimit: -1,
        sections: [
          { name: "Membaca", seksi: "MEMBACA", timeLimit: 20, count: 8 },
        ],
      },
    });

    // TKA SD Simulasi
    await prisma.paketKompetensi.create({
      data: {
        title: "Simulasi TKA - SD",
        description: "Tes Kompetensi Akademik untuk SD. Meliputi Literasi, Tata Bahasa, dan Sastra.",
        type: "TKA_SD",
        mode: "SIMULASI",
        duration: 60,
        passingScore: 65,
        passingGrade: "B",
        totalQuestions: 20,
        isActive: true,
        isPremium: false,
        attemptLimit: -1,
        sections: [
          { name: "Literasi Membaca", kompetensi: "LITERASI_MEMBACA", timeLimit: 25, count: 8 },
          { name: "Tata Bahasa", kompetensi: "TATA_BAHASA", timeLimit: 20, count: 6 },
          { name: "Sastra", kompetensi: "SASTRA", timeLimit: 15, count: 6 },
        ],
      },
    });

    console.log("✅ SD packages created");
  } else {
    console.log(" SD packages already exist, skipping...");
  }

  console.log("\nDone!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
