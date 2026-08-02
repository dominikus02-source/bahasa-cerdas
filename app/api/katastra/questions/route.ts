import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { shuffleKatastraQuestion } from "@/lib/game/shuffle-options";

const QUESTIONS = {
  SD: [
    { text: "Kata baku dari 'kepinteran' adalah...", options: ["Kepintaran", "Kepinteran", "Pintar", "Kepandai"], correct: 0, type: "kata_baku" },
    { text: "Sinonim kata 'cerdas' adalah...", options: ["Bodoh", "Pintar", "Malas", "Lemah"], correct: 1, type: "sinonim" },
    { text: "Antonim kata 'rajin' adalah...", options: ["Tekun", "Malas", "Giat", "Sungguh-sungguh"], correct: 1, type: "antonim" },
    { text: "Imbuhan 'me-' pada kata 'menulis' berarti...", options: ["Melakukan", "Menerima", "Memberi", "Menjadi"], correct: 0, type: "imbuhan" },
    { text: "Kata baku dari 'ijasah' adalah...", options: ["Ijasah", "Ijazah", "Ijsah", "Ijaza"], correct: 1, type: "kata_baku" },
    { text: "Sinonim kata 'bahagia' adalah...", options: ["Sedih", "Senang", "Marah", "Cemas"], correct: 1, type: "sinonim" },
    { text: "Antonim kata 'besar' adalah...", options: ["Lebar", "Kecil", "Panjang", "Tinggi"], correct: 1, type: "antonim" },
    { text: "Kata 'berlari' mendapat imbuhan...", options: ["ber-", "me-", "ter-", "di-"], correct: 0, type: "imbuhan" },
    { text: "Kata baku dari 'apotik' adalah...", options: ["Apotik", "Apotek", "Appotek", "Apotiek"], correct: 1, type: "kata_baku" },
    { text: "Sinonim kata 'indah' adalah...", options: ["Jelek", "Cantik", "Kotor", "Buru"], correct: 1, type: "sinonim" },
    { text: "'Dia ___ buku di perpustakaan.' Kata yang tepat adalah...", options: ["Membaca", "Membacakan", "Terbaca", "Dibacakan"], correct: 0, type: "kalimat" },
    { text: "Antonim kata 'pagi' adalah...", options: ["Siang", "Sore", "Malam", "Subuh"], correct: 2, type: "antonim" },
    { text: "Kata baku dari 'pebruari' adalah...", options: ["Pebruari", "Februari", "Febuari", "Pebuari"], correct: 1, type: "kata_baku" },
    { text: "Kata 'tertinggi' mendapat imbuhan...", options: ["ber-", "me-", "ter-", "pe-"], correct: 2, type: "imbuhan" },
    { text: "Sinonim kata 'cepat' adalah...", options: ["Lambat", "Lecet", "Kencang", "Pelan"], correct: 2, type: "sinonim" },
    { text: "Kalimat yang tepat: 'Ibu ___ nasi di dapur.'", options: ["Masak", "Memasak", "Dimasak", "Ter masak"], correct: 1, type: "kalimat" },
    { text: "Kata baku dari 'resiko' adalah...", options: ["Resiko", "Reziko", "Risiko", "Riziko"], correct: 2, type: "kata_baku" },
    { text: "Antonim kata 'panjang' adalah...", options: ["Lebar", "Pendek", "Tinggi", "Dalam"], correct: 1, type: "antonim" },
    { text: "'Mereka sedang ___ bola di lapangan.'", options: ["Bermain", "Dimainkan", "Ter main", "Memainkan"], correct: 0, type: "kalimat" },
    { text: "Sinonim kata 'gemar' adalah...", options: ["Benci", "Suka", "Malas", "Malu"], correct: 1, type: "sinonim" },
    { text: "Kata baku dari 'aktifitas' adalah...", options: ["Aktivitas", "Aktifitas", "Aktipitas", "Activity"], correct: 0, type: "kata_baku" },
    { text: "Antonim kata 'kaya' adalah...", options: ["Miskin", "Harta", "Dermawan", "Mewah"], correct: 0, type: "antonim" },
    { text: "'Budi ___ sepeda setiap hari.'", options: ["Naik", "Menaiki", "Mengendarai", "Dinaiki"], correct: 2, type: "kalimat" },
    { text: "Sinonim 'rajin' adalah...", options: ["Tekun", "Malas", "Lambat", "Lalai"], correct: 0, type: "sinonim" },
    { text: "Kata baku dari 'tehnik' adalah...", options: ["Tehnik", "Tekhnik", "Teknik", "Tehknik"], correct: 2, type: "kata_baku" },
    { text: "Antonim 'tinggi' adalah...", options: ["Dalam", "Lebar", "Pendek", "Besar"], correct: 2, type: "antonim" },
    { text: "'Kucing itu ___ di atas genteng.'", options: ["Duduk", "Berbaring", "Memanjat", "Berdiri"], correct: 2, type: "kalimat" },
    { text: "Sinonim 'berani' adalah...", options: ["Takutan", "Pemberani", "Penakut", "Lemah"], correct: 1, type: "sinonim" },
    { text: "Kata baku dari 'diagnosa' adalah...", options: ["Diagnosa", "Diagnosis", "Diaknosa", "Dignosa"], correct: 1, type: "kata_baku" },
    { text: "Antonim 'terang' adalah...", options: ["Cerah", "Gelap", "Benderang", "Silau"], correct: 1, type: "antonim" },
    { text: "'Kami ___ upacara setiap hari Senin.'", options: ["Mengikuti", "Diikuti", "Mengikut", "Ikuti"], correct: 0, type: "kalimat" },
    { text: "Huruf kapital digunakan untuk...", options: ["Nama orang", "Kata depan", "Kata sambung", "Partikel"], correct: 0, type: "ejaan" },
    { text: "Kata 'bersih' mendapat imbuhan 'me-' menjadi...", options: ["Membersih", "Membersihkan", "Bersihkan", "Pembersih"], correct: 1, type: "imbuhan" },
    { text: "Sinonim 'gembira' adalah...", options: ["Sedih", "Senang", "Cemas", "Marah"], correct: 1, type: "sinonim" },
    { text: "Kata baku dari 'kwalitas' adalah...", options: ["Kwalitas", "Kualitas", "Kualitet", "Kwalitet"], correct: 1, type: "kata_baku" },
    { text: "Antonim 'lembut' adalah...", options: ["Halus", "Kasar", "Lunak", "Empuk"], correct: 1, type: "antonim" },
    { text: "'Ayah ___ koran di teras.'", options: ["Baca", "Membaca", "Terbaca", "Dibaca"], correct: 1, type: "kalimat" },
    { text: "Sinonim 'tampan' adalah...", options: ["Jelek", "Ganteng", "Biasa", "Kecil"], correct: 1, type: "sinonim" },
    { text: "Kata baku dari 'ijin' adalah...", options: ["Ijin", "Izin", "Ijim", "Ijid"], correct: 1, type: "kata_baku" },
    { text: "Antonim 'ramai' adalah...", options: ["Hening", "Bising", "Rame", "Panas"], correct: 0, type: "antonim" },
    { text: "Penulisan 'di' yang benar: 'Buku itu ___ meja.'", options: ["Dimeja", "Di meja", "di meja", "diMeja"], correct: 1, type: "ejaan" },
    { text: "Sinonim 'berlari' adalah...", options: ["Jalan", "Melompat", "Bergegas", "Duduk"], correct: 2, type: "sinonim" },
    { text: "Kata baku dari 'nasehat' adalah...", options: ["Nasehat", "Nasihat", "Nasehad", "Nasihad"], correct: 1, type: "kata_baku" },
    { text: "Antonim 'murah' adalah...", options: ["Hemat", "Mahal", "Mewah", "Cepat"], correct: 1, type: "antonim" },
    { text: "'Ibu ___ sayur di pasar.'", options: ["Beli", "Membeli", "Terbeli", "Dibeli"], correct: 1, type: "kalimat" },
    { text: "Kata ulang yang benar: '___'", options: ["Buku-buku", "Bukubuku", "Buku buku", "buku-buku"], correct: 0, type: "ejaan" },
    { text: "Sinonim 'menangis' adalah...", options: ["Tertawa", "Terisak", "Berteriak", "Bersorak"], correct: 1, type: "sinonim" },
    { text: "Kata baku dari 'subtansi' adalah...", options: ["Subtansi", "Substansi", "Subtans", "Substans"], correct: 1, type: "kata_baku" },
    { text: "Antonim 'tebal' adalah...", options: ["Lebar", "Tipis", "Panjang", "Berat"], correct: 1, type: "antonim" },
    { text: "'Kami ___ sepak bola setiap sore.'", options: ["Main", "Bermain", "Dimain", "Termain"], correct: 1, type: "kalimat" },
    { text: "Huruf kapital dipakai untuk nama...", options: ["Orang", "Kata depan", "Kata sambung", "Partikel"], correct: 0, type: "ejaan" },
    { text: "Sinonim 'bernyanyi' adalah...", options: ["Bersuara", "Melantunkan lagu", "Bertepuk", "Menari"], correct: 1, type: "sinonim" },
    { text: "Kata baku dari 'cinderamata' adalah...", options: ["Cinderamata", "Cenderamata", "Cenderemata", "Cindramata"], correct: 1, type: "kata_baku" },
    { text: "Antonim 'subur' adalah...", options: ["Hijau", "Kering", "Gersang", "Lembab"], correct: 2, type: "antonim" },
    { text: "'Paman ___ mobil baru.'", options: ["Punya", "Memiliki", "Punya punya", "Dimiliki"], correct: 1, type: "kalimat" },
    { text: "Kata 'berenang' mendapat imbuhan...", options: ["me-", "ber-", "ter-", "di-"], correct: 1, type: "imbuhan" },
    { text: "Sinonim 'haus' adalah...", options: ["Lapar", "Dahaga", "Kenyang", "Segar"], correct: 1, type: "sinonim" },
    { text: "Kata baku dari 'foto' adalah...", options: ["Photo", "Foto", "Poto", "Fhoto"], correct: 1, type: "kata_baku" },
    { text: "Antonim 'berani' adalah...", options: ["Pemberani", "Penakut", "Gagah", "Perkasa"], correct: 1, type: "antonim" },
    { text: "'Dia ___ ke sekolah naik bis.'", options: ["Pergi", "Pergikan", "Pergi pergi", "Kepergian"], correct: 0, type: "kalimat" },
    { text: "Kata depan 'ke' yang benar: '___ sekolah'", options: ["Kesekolah", "Ke sekolah", "Ke-sekolah", "ke Sekolah"], correct: 1, type: "ejaan" },
    { text: "Sinonim 'merah' adalah...", options: ["Biru", "Kuning", "Hijau", "Merona"], correct: 3, type: "sinonim" },
    { text: "Kata baku dari 'jaman' adalah...", options: ["Jaman", "Zaman", "Zamman", "Jamman"], correct: 1, type: "kata_baku" },
    { text: "Kata baku dari 'sistim' adalah...", options: ["Sistim", "Sistem", "Sistiem", "Sisttem"], correct: 1, type: "kata_baku" },
    { text: "Kata baku dari 'nomer' adalah...", options: ["Nomer", "Nomor", "Nommer", "Noomor"], correct: 1, type: "kata_baku" },
    { text: "Kata baku dari 'hapal' adalah...", options: ["Hapal", "Hafal", "Haffal", "Happal"], correct: 1, type: "kata_baku" },
    { text: "Kata baku dari 'himbau' adalah...", options: ["Himbau", "Imbau", "Himbaw", "Imbaau"], correct: 1, type: "kata_baku" },
    { text: "Kata baku dari 'cabe' adalah...", options: ["Cabe", "Cabai", "Cabee", "Cabay"], correct: 1, type: "kata_baku" },
    { text: "Sinonim 'pintar' adalah...", options: ["Pandai", "Malas", "Lambat", "Bingung"], correct: 0, type: "sinonim" },
    { text: "Sinonim 'lelah' adalah...", options: ["Letih", "Segar", "Kuat", "Sehat"], correct: 0, type: "sinonim" },
    { text: "Sinonim 'riang' adalah...", options: ["Ceria", "Murung", "Sedih", "Lesu"], correct: 0, type: "sinonim" },
    { text: "Sinonim 'melihat' adalah...", options: ["Memandang", "Mendengar", "Meraba", "Mencium"], correct: 0, type: "sinonim" },
    { text: "Sinonim 'bohong' adalah...", options: ["Dusta", "Jujur", "Benar", "Nyata"], correct: 0, type: "sinonim" },
    { text: "Sinonim 'harum' adalah...", options: ["Wangi", "Busuk", "Apek", "Asam"], correct: 0, type: "sinonim" },
    { text: "Antonim 'datang' adalah...", options: ["Pergi", "Tiba", "Hadir", "Muncul"], correct: 0, type: "antonim" },
    { text: "Antonim 'mudah' adalah...", options: ["Sulit", "Gampang", "Ringan", "Lancar"], correct: 0, type: "antonim" },
    { text: "Antonim 'cepat' adalah...", options: ["Lambat", "Kencang", "Gesit", "Lincah"], correct: 0, type: "antonim" },
    { text: "Antonim 'basah' adalah...", options: ["Kering", "Lembap", "Dingin", "Sejuk"], correct: 0, type: "antonim" },
    { text: "Antonim 'untung' adalah...", options: ["Rugi", "Laba", "Hasil", "Modal"], correct: 0, type: "antonim" },
    { text: "Antonim 'membuka' adalah...", options: ["Menutup", "Melebar", "Membentang", "Mengangkat"], correct: 0, type: "antonim" },
    { text: "Kata dasar dari 'membaca' adalah...", options: ["Baca", "Bacaan", "Pembaca", "Terbaca"], correct: 0, type: "imbuhan" },
    { text: "Kata 'penulis' mendapat imbuhan...", options: ["pe-", "me-", "ber-", "ter-"], correct: 0, type: "imbuhan" },
    { text: "Kata dasar dari 'bermain' adalah...", options: ["Main", "Mainan", "Pemain", "Permainan"], correct: 0, type: "imbuhan" },
    { text: "Kata 'terjatuh' mendapat imbuhan...", options: ["ter-", "di-", "me-", "ber-"], correct: 0, type: "imbuhan" },
    { text: "Imbuhan 'di-' pada kata 'dibaca' menunjukkan kalimat...", options: ["Pasif", "Aktif", "Tanya", "Perintah"], correct: 0, type: "imbuhan" },
    { text: "'Adik ___ susu setiap pagi.'", options: ["Minum", "Meminum", "Diminum", "Terminum"], correct: 1, type: "kalimat" },
    { text: "'Petani ___ padi di sawah.'", options: ["Menanam", "Ditanam", "Tertanam", "Tanaman"], correct: 0, type: "kalimat" },
    { text: "'Burung itu ___ tinggi di langit.'", options: ["Terbang", "Diterbangkan", "Menerbangkan", "Penerbangan"], correct: 0, type: "kalimat" },
    { text: "'Nenek ___ kue untuk kami.'", options: ["Membuat", "Dibuat", "Terbuat", "Buatan"], correct: 0, type: "kalimat" },
    { text: "Penulisan nama orang yang benar adalah...", options: ["budi santoso", "Budi Santoso", "BUDI santoso", "budi Santoso"], correct: 1, type: "ejaan" },
    { text: "Kalimat tanya diakhiri dengan tanda...", options: ["Titik (.)", "Koma (,)", "Tanya (?)", "Seru (!)"], correct: 2, type: "ejaan" },
    { text: "Penulisan nama hari yang benar: 'Kami libur pada hari ___.'", options: ["senin", "Senin", "SENIN", "sEnin"], correct: 1, type: "ejaan" },
    { text: "Antonim 'pagi' adalah...", options: ["Siang", "Sore", "Malam", "Subuh"], correct: 2, type: "antonim" },
  ],
  SMP: [
    { text: "Kalimat efektif: 'Dia adalah siswa yang pandai sekali.' Perbaikannya...", options: ["Dia siswa pandai", "Dia adalah siswa pandai", "Dia siswa yang pandai", "Ia adalah pandai"], correct: 2, type: "kalimat_efektif" },
    { text: "Kata depan 'di' yang tepat terdapat pada kalimat...", options: ["Disekolah", "Di sekolah", "Di-sekolah", "di Sekolah"], correct: 1, type: "ejaan" },
    { text: "'Bagai air di daun talas' adalah peribahasa untuk orang yang...", options: ["Pendiam", "Tidak punya pendirian", "Pemarah", "Pemalas"], correct: 1, type: "peribahasa" },
    { text: "Majas personifikasi terdapat pada kalimat...", options: ["Angin berbisik", "Dia lari kencang", "Buku itu tebal", "Air sungai jernih"], correct: 0, type: "majas" },
    { text: "Kalimat berikut yang baku: 'Saya ___ bahwa dia benar.'", options: ["Percaya", "Mempercayai", "Mempercaya", "Berpercaya"], correct: 1, type: "kata_baku" },
    { text: "Pantun bersajak...", options: ["a-a-a-a", "a-b-a-b", "a-a-b-b", "a-b-b-a"], correct: 1, type: "sastra" },
    { text: "Sinonim kata 'observasi' adalah...", options: ["Pengamatan", "Penelitian", "Percobaan", "Perhitungan"], correct: 0, type: "sinonim" },
    { text: "Kalimat yang menggunakan konjungsi temporal...", options: ["Dia belajar lalu tidur", "Dia pintar tetapi malas", "Dia dan saya berteman", "Dia atau saya"], correct: 0, type: "kalimat" },
    { text: "'Kecil-kecil cabe rawit' artinya...", options: ["Pedas", "Kecil tapi berani", "Cabe kecil", "Anak kecil"], correct: 1, type: "peribahasa" },
    { text: "Penulisan gelar yang benar: 'Bambang, S.Pd.' Fungsinya...", options: ["Tanda titik setelah singkatan", "Tanda koma", "Tanda seru", "Tanpa tanda"], correct: 0, type: "ejaan" },
    { text: "Antonim 'abstrak' adalah...", options: ["Nyata", "Samar", "Sulit", "Mudah"], correct: 0, type: "antonim" },
    { text: "Kalimat pasif dari 'Ayah membaca koran' adalah...", options: ["Koran dibaca Ayah", "Koran membaca Ayah", "Ayah dibaca koran", "Membaca koran Ayah"], correct: 0, type: "kalimat" },
    { text: "Puisi lama yang bersajak a-b-a-b disebut...", options: ["Syair", "Pantun", "Gurindam", "Seloka"], correct: 1, type: "sastra" },
    { text: "Frasa 'meja hijau' berarti...", options: ["Meja berwarna hijau", "Pengadilan", "Ruang sidang", "Meja baru"], correct: 1, type: "majas" },
    { text: "Kata 'berkontribusi' memiliki arti...", options: ["Ikut serta", "Berdebat", "Bekerja", "Bersaing"], correct: 0, type: "kosakata" },
    { text: "Kalimat tunggal adalah kalimat yang terdiri dari...", options: ["Satu subjek + satu predikat", "Dua subjek", "Banyak kata", "Satu kata"], correct: 0, type: "tata_bahasa" },
    { text: "Antonim 'sementara' adalah...", options: ["Sekarang", "Permanen", "Nanti", "Cepat"], correct: 1, type: "antonim" },
    { text: "Kata baku dari 'kreatifitas' adalah...", options: ["Kreativitas", "Kreatifitas", "Kreatipitas", "Kreativ"], correct: 0, type: "kata_baku" },
    { text: "'Sekali merengkuh dayung, dua tiga pulau terlampaui' artinya...", options: ["Hemat tenaga", "Sekali kerja dapat banyak hasil", "Mendayung cepat", "Pulau-pulau indah"], correct: 1, type: "peribahasa" },
    { text: "Majas metafora terdapat pada...", options: ["Raja siang terbit", "Dia berlari kencang", "Bunga desa itu cantik", "Hatinya sekeras batu"], correct: 3, type: "majas" },
    { text: "Konjungsi korelatif yang benar: '___ dia ___ saya akan hadir.'", options: ["Baik...maupun", "Ataupun...dan", "Meski...tetapi", "Jikalau...maka"], correct: 0, type: "tata_bahasa" },
    { text: "Sinonim 'intensif' adalah...", options: ["Ringan", "Mendalam", "Cepat", "Lambat"], correct: 1, type: "sinonim" },
    { text: "Teks eksposisi bertujuan untuk...", options: ["Menghibur", "Membujuk", "Menjelaskan", "Menceritakan"], correct: 2, type: "sastra" },
    { text: "Penulisan kata ulang yang benar: '___'", options: ["Buku-buku", "Bukubuku", "Buku - buku", "buku buku"], correct: 0, type: "ejaan" },
    { text: "Kalimat majemuk setara: 'Dia belajar ___ adiknya tidur.'", options: ["Dan", "Atau", "Sedangkan", "Karena"], correct: 2, type: "kalimat" },
    { text: "Antonim 'mayoritas' adalah...", options: ["Minoritas", "Sebagian", "Semua", "Banyak"], correct: 0, type: "antonim" },
    { text: "'Tak ada gading yang tak retak' artinya...", options: ["Gading mudah retak", "Tidak ada yang sempurna", "Barang rusak", "Hati-hati"], correct: 1, type: "peribahasa" },
    { text: "Sebutan untuk kata depan adalah...", options: ["Konjungsi", "Preposisi", "Artikula", "Interjeksi"], correct: 1, type: "tata_bahasa" },
    { text: "Kata 'perusahaan' mendapat imbuhan...", options: ["per-an", "pe-an", "per-", "pe-"], correct: 0, type: "imbuhan" },
    { text: "Sinonim 'elaborasi' adalah...", options: ["Penyederhanaan", "Penguraian", "Percepatan", "Penundaan"], correct: 1, type: "sinonim" },
    { text: "'Kambing hitam' artinya...", options: ["Hewan berwarna hitam", "Orang yang dipersalahkan", "Kambing kesayangan", "Hewan ternak"], correct: 1, type: "peribahasa" },
    { text: "Teks persuasi bertujuan...", options: ["Menghibur", "Membujuk", "Menjelaskan", "Mendeskripsikan"], correct: 1, type: "sastra" },
    { text: "Antonim 'simpati' adalah...", options: ["Empati", "Apatis", "Peduli", "Kasihan"], correct: 1, type: "antonim" },
    { text: "Kalimat yang menggunakan kata kerja mental...", options: ["Dia menendang bola", "Ibu memasak nasi", "Dia merasakan sakit", "Ayah membaca buku"], correct: 2, type: "kalimat" },
    { text: "Konjungsi yang menyatakan pertentangan...", options: ["Dan", "Atau", "Tetapi", "Karena"], correct: 2, type: "tata_bahasa" },
    { text: "Penulisan 'di' pada 'dimakan' menunjukkan...", options: ["Kata depan tempat", "Awalan kata kerja pasif", "Partikel", "Kata hubung"], correct: 1, type: "ejaan" },
    { text: "'Ringan sama dijinjing, berat sama dipikul' artinya...", options: ["Gotong royong", "Bersama-sama", "Susah senang bersama", "Semua benar"], correct: 2, type: "peribahasa" },
    { text: "Kata 'mengglobal' memiliki arti...", options: ["Lokal", "Mendunia", "Nasional", "Daerah"], correct: 1, type: "kosakata" },
    { text: "Antonim 'kronologis' adalah...", options: ["Urut", "Acak", "Sistematis", "Runtut"], correct: 1, type: "antonim" },
    { text: "Ciri-ciri teks eksplanasi adalah...", options: ["Berisi pendapat", "Menjelaskan proses", "Menghibur pembaca", "Mengajak melakukan"], correct: 1, type: "tata_bahasa" },
    { text: "Sinonim 'akurat' adalah...", options: ["Tepat", "Salah", "Mendekati", "Kira-kira"], correct: 0, type: "sinonim" },
    { text: "'Besar pasak daripada tiang' artinya...", options: ["Tiang besar", "Pengeluaran lebih besar dari pendapatan", "Pasak besar", "Bangunan kokoh"], correct: 1, type: "peribahasa" },
    { text: "Imbuhan 'pe-' pada kata 'pelari' berarti...", options: ["Alat", "Orang yang", "Tempat", "Hasil"], correct: 1, type: "imbuhan" },
    { text: "Kata baku dari 'komplit' adalah...", options: ["Komplit", "Komplet", "Komplek", "Komplen"], correct: 1, type: "kata_baku" },
    { text: "Fungsi tanda koma dalam kalimat...", options: ["Akhir kalimat", "Pemisah unsur perincian", "Tanda tanya", "Tanda seru"], correct: 1, type: "ejaan" },
    { text: "Antonim 'kontemporer' adalah...", options: ["Modern", "Kuno", "Kekinian", "Masa kini"], correct: 1, type: "antonim" },
    { text: "'Air tenang menghanyutkan' artinya...", options: ["Air yang tenang berbahaya", "Orang pendiam biasanya berpengetahuan", "Hati-hati dengan air", "Tidak boleh bermain air"], correct: 1, type: "peribahasa" },
    { text: "Sinonim 'distingsi' adalah...", options: ["Persamaan", "Perbedaan", "Penyatuan", "Percampuran"], correct: 1, type: "sinonim" },
    { text: "Kalimat majemuk bertingkat adalah kalimat yang...", options: ["Terdiri dari satu klausa", "Memiliki anak kalimat", "Tidak memiliki predikat", "Hanya satu subjek"], correct: 1, type: "tata_bahasa" },
    { text: "Kata baku dari 'praktek' adalah...", options: ["Praktek", "Praktik", "Prakteek", "Praktick"], correct: 1, type: "kata_baku" },
    { text: "Kata baku dari 'nafas' adalah...", options: ["Nafas", "Napas", "Naffas", "Nappas"], correct: 1, type: "kata_baku" },
    { text: "Kata baku dari 'obyek' adalah...", options: ["Obyek", "Objek", "Obyec", "Objec"], correct: 1, type: "kata_baku" },
    { text: "Kata baku dari 'silahkan' adalah...", options: ["Silahkan", "Silakan", "Sillakan", "Silaken"], correct: 1, type: "kata_baku" },
    { text: "Kata baku dari 'kwitansi' adalah...", options: ["Kwitansi", "Kuitansi", "Kwitanci", "Kuitanci"], correct: 1, type: "kata_baku" },
    { text: "Sinonim 'signifikan' adalah...", options: ["Berarti", "Kecil", "Samar", "Biasa"], correct: 0, type: "sinonim" },
    { text: "Sinonim 'potensi' adalah...", options: ["Kemampuan", "Kelemahan", "Kegagalan", "Keterbatasan"], correct: 0, type: "sinonim" },
    { text: "Sinonim 'motivasi' adalah...", options: ["Dorongan", "Halangan", "Larangan", "Ancaman"], correct: 0, type: "sinonim" },
    { text: "Sinonim 'efisien' adalah...", options: ["Hemat", "Boros", "Lambat", "Rumit"], correct: 0, type: "sinonim" },
    { text: "Antonim 'optimis' adalah...", options: ["Pesimis", "Yakin", "Percaya", "Semangat"], correct: 0, type: "antonim" },
    { text: "Antonim 'ekspor' adalah...", options: ["Impor", "Kirim", "Jual", "Muat"], correct: 0, type: "antonim" },
    { text: "Antonim 'individual' adalah...", options: ["Kolektif", "Pribadi", "Sendiri", "Tunggal"], correct: 0, type: "antonim" },
    { text: "Antonim 'formal' adalah...", options: ["Nonformal", "Resmi", "Baku", "Teratur"], correct: 0, type: "antonim" },
    { text: "'Berakit-rakit ke hulu, berenang-renang ke tepian' artinya...", options: ["Bersusah dahulu, bersenang kemudian", "Suka berpetualang", "Pandai berenang", "Hidup di sungai"], correct: 0, type: "peribahasa" },
    { text: "'Ada udang di balik batu' artinya...", options: ["Ada maksud tersembunyi", "Pandai mencari udang", "Suka bersembunyi", "Rajin bekerja"], correct: 0, type: "peribahasa" },
    { text: "'Bagai katak dalam tempurung' artinya...", options: ["Berwawasan sempit", "Suka bersembunyi", "Hidup nyaman", "Pandai melompat"], correct: 0, type: "peribahasa" },
    { text: "'Sedia payung sebelum hujan' artinya...", options: ["Bersiap sebelum sesuatu terjadi", "Selalu membawa payung", "Takut kehujanan", "Rajin menabung"], correct: 0, type: "peribahasa" },
    { text: "Majas asosiasi terdapat pada kalimat...", options: ["Wajahnya bagaikan bulan purnama", "Dia sangat pandai", "Ibu memasak nasi", "Kami pergi ke pasar"], correct: 0, type: "majas" },
    { text: "Contoh majas pleonasme adalah...", options: ["Naik ke atas", "Dia membaca buku", "Kami belajar bersama", "Adik bermain bola"], correct: 0, type: "majas" },
    { text: "Majas metonimia terdapat pada kalimat...", options: ["Ayah pergi mengendarai Kijang", "Dia berlari cepat", "Kami makan bersama", "Ibu menyapu halaman"], correct: 0, type: "majas" },
    { text: "Ciri kalimat perintah adalah...", options: ["Diakhiri tanda seru", "Diakhiri tanda tanya", "Berisi pertanyaan", "Berisi berita"], correct: 0, type: "tata_bahasa" },
    { text: "Kata kerja transitif adalah kata kerja yang...", options: ["Memerlukan objek", "Tidak memerlukan objek", "Berdiri sendiri", "Berupa kata sifat"], correct: 0, type: "tata_bahasa" },
    { text: "Kalimat langsung ditandai dengan...", options: ["Tanda petik", "Tanda titik dua saja", "Huruf miring", "Tanda kurung"], correct: 0, type: "tata_bahasa" },
    { text: "Subjek kalimat 'Para siswa mengerjakan ujian' adalah...", options: ["Para siswa", "Mengerjakan", "Ujian", "Para"], correct: 0, type: "tata_bahasa" },
    { text: "Kata 'inovasi' berarti...", options: ["Pembaruan", "Peniruan", "Pengulangan", "Penghapusan"], correct: 0, type: "kosakata" },
    { text: "Kata 'kolaborasi' berarti...", options: ["Kerja sama", "Persaingan", "Perpecahan", "Perlombaan"], correct: 0, type: "kosakata" },
    { text: "Kata 'evaluasi' berarti...", options: ["Penilaian", "Pembukaan", "Penutupan", "Pelaksanaan"], correct: 0, type: "kosakata" },
    { text: "Imbuhan 'ke-an' pada kata 'keindahan' membentuk kata...", options: ["Benda", "Kerja", "Sifat", "Keterangan"], correct: 0, type: "imbuhan" },
    { text: "Imbuhan 'me-kan' pada 'membacakan' berarti melakukan...", options: ["Untuk orang lain", "Sendiri", "Berulang-ulang", "Tanpa sengaja"], correct: 0, type: "imbuhan" },
    { text: "Imbuhan 'pe-an' pada kata 'pendidikan' menyatakan...", options: ["Proses atau hal", "Pelaku", "Alat", "Tempat"], correct: 0, type: "imbuhan" },
    { text: "Kata baku dari 'silakan' adalah...", options: ["Silahkan", "Silakan", "Sillakan", "Silaken"], correct: 1, type: "kata_baku" },
  ],
  SMA: [
    { text: "Bacalah: 'Polusi udara di kota besar semakin mengkhawatirkan. Partikel PM2.5 melampaui ambang batas.' Ide pokok paragraf tersebut adalah...", options: ["Polusi udara mengkhawatirkan", "Partikel PM2.5 berbahaya", "Kota besar tercemar", "Ambang batas polusi"], correct: 0, type: "HOTS" },
    { text: "Majas ironi terdapat pada kalimat...", options: ["Bagus benar rapormu, penuh merah!", "Dia lari secepat kilat", "Hatinya selembut sutra", "Angin berbisik"], correct: 0, type: "majas" },
    { text: "Imbuhan 'memper-' pada kata 'memperbarui' berarti...", options: ["Membuat jadi", "Membuat lebih", "Melakukan", "Menerima"], correct: 1, type: "imbuhan" },
    { text: "Analogi: 'Buku : Membaca = Pensil : ...'", options: ["Menulis", "Menghapus", "Menggambar", "Melukis"], correct: 0, type: "HOTS" },
    { text: "Kalimat resmi yang benar: '___ surat ini, saya sampaikan lamaran pekerjaan.'", options: ["Bersama", "Dengan ini", "Bersama ini", "Melalui"], correct: 2, type: "ejaan" },
    { text: "Teks negosiasi bertujuan...", options: ["Bertengkar", "Mencapai kesepakatan", "Bercerita", "Mendeskripsikan"], correct: 1, type: "sastra" },
    { text: "Antonim 'fluktuatif' adalah...", options: ["Naik turun", "Stabil", "Berubah", "Tidak tetap"], correct: 1, type: "antonim" },
    { text: "Sinonim 'komprehensif' adalah...", options: ["Parsial", "Menyeluruh", "Sebagian", "Cepat"], correct: 1, type: "sinonim" },
    { text: "Ciri kebahasaan teks prosedur adalah banyak menggunakan kata...", options: ["Imperatif", "Interogatif", "Deklaratif", "Eksklamatif"], correct: 0, type: "tata_bahasa" },
    { text: "Kalimat ambiguous (ambigu): 'Mahasiswa baru itu mengikuti OSKM.' Arti lain dari kalimat tersebut...", options: ["Mahasiswa baru saja datang", "Mahasiswa yang baru mengikuti OSKM", "OSKM untuk mahasiswa baru", "Semua benar"], correct: 1, type: "HOTS" },
    { text: "Penulisan kata serapan yang benar: '___'", options: ["Standard", "Standar", "Standaar", "Setandar"], correct: 1, type: "kata_baku" },
    { text: "Majas hiperbola terdapat pada...", options: ["Rambutnya sehitam malam", "Dia menangis tersedu-sedu", "Aku menunggu seribu tahun", "Bunga itu layu"], correct: 2, type: "majas" },
    { text: "Konflik dalam cerita pendek berfungsi untuk...", options: ["Menggambarkan latar", "Membangun ketegangan", "Memperkenalkan tokoh", "Menutup cerita"], correct: 1, type: "sastra" },
    { text: "Kalimat yang menggunakan ejaan yang benar: '___'", options: ["Di karnakan", "Dikarenakan", "Di karenakan", "Di karena kan"], correct: 1, type: "ejaan" },
    { text: "Antonim 'progresif' adalah...", options: ["Modern", "Regresif", "Cepat", "Maju"], correct: 1, type: "antonim" },
    { text: "'Habis manis sepah dibuang' artinya...", options: ["Makan manis lalu buang", "Digunakan lalu ditinggalkan", "Tidak berguna", "Sisa-sisa makanan"], correct: 1, type: "peribahasa" },
    { text: "Bacalah: 'Meskipun hujan deras, ia tetap berangkat sekolah.' Anak kalimat pada kalimat tersebut adalah...", options: ["Meskipun hujan deras", "ia tetap berangkat", "hujan deras", "tetap berangkat sekolah"], correct: 0, type: "tata_bahasa" },
    { text: "Sinonim 'fundamental' adalah...", options: ["Dasar", "Tambahan", "Lanjutan", "Pelengkap"], correct: 0, type: "sinonim" },
    { text: "Kritik sastra bertujuan untuk...", options: ["Menghujat karya", "Menilai dan menganalisis", "Membuat karya baru", "Menjual buku"], correct: 1, type: "sastra" },
    { text: "Kalimat yang tidak efektif: 'Saya adalah seorang siswa yang belajar di SMA Negeri 1.' Perbaikannya...", options: ["Saya adalah siswa SMA Negeri 1", "Saya siswa SMA Negeri 1", "Saya adalah seorang siswa SMA", "Saya seorang siswa"], correct: 1, type: "HOTS" },
    { text: "Partikel '-lah' pada kalimat perintah berfungsi untuk...", options: ["Memperhalus", "Mempertegas", "Melemahkan", "Menambah"], correct: 1, type: "tata_bahasa" },
    { text: "Kata 'dikotomi' berarti...", options: ["Dua bagian yang bertentangan", "Tiga bagian", "Banyak bagian", "Satu kesatuan"], correct: 0, type: "kosakata" },
    { text: "Majas litotes adalah majas yang...", options: ["Melebih-lebihkan", "Mengecilkan kenyataan", "Membandingkan", "Menyindir"], correct: 1, type: "majas" },
    { text: "Dalam proposal penelitian, rumusan masalah berisi...", options: ["Jawaban penelitian", "Pertanyaan penelitian", "Kesimpulan", "Latar belakang"], correct: 1, type: "sastra" },
    { text: "Antonim 'konvensional' adalah...", options: ["Tradisional", "Modern", "Kuno", "Biasa"], correct: 1, type: "antonim" },
    { text: "Kalimat: 'Buku yang dibeli Ayah kemarin sangat bermanfaat.' Frasa 'yang dibeli Ayah' berfungsi sebagai...", options: ["Subjek", "Predikat", "Objek", "Keterangan"], correct: 2, type: "tata_bahasa" },
    { text: "Sinonim 'implisit' adalah...", options: ["Tersirat", "Tersurat", "Jelas", "Nyata"], correct: 0, type: "sinonim" },
    { text: "'Sepandai-pandai tupai melompat, pasti jatuh juga' artinya...", options: ["Tupai pandai melompat", "Orang pandai pasti sukses", "Sepandai apa pun orang pasti bisa salah", "Jangan melompat tinggi"], correct: 2, type: "peribahasa" },
    { text: "Bacalah: 'Sistem pendidikan nasional bertujuan mencerdaskan kehidupan bangsa.' Ide pokok kalimat tersebut adalah...", options: ["Sistem pendidikan", "Mencerdaskan kehidupan", "Tujuan pendidikan nasional", "Kehidupan bangsa"], correct: 2, type: "HOTS" },
    { text: "Kata 'multidisipliner' berarti...", options: ["Satu bidang", "Banyak bidang ilmu", "Tidak disiplin", "Disiplin tinggi"], correct: 1, type: "kosakata" },
    { text: "Majas paradoks terdapat pada kalimat...", options: ["Dia kaya tapi miskin hati", "Angin berbisik lembut", "Dia berlari secepat kilat", "Hatinya sekeras batu"], correct: 0, type: "majas" },
    { text: "Konjungsi yang menyatakan syarat adalah...", options: ["Karena", "Jika", "Tetapi", "Dan"], correct: 1, type: "tata_bahasa" },
    { text: "Sinonim 'abstrak' adalah...", options: ["Nyata", "Maya", "Konkret", "Fisik"], correct: 1, type: "sinonim" },
    { text: "'Bagai pungguk merindukan bulan' artinya...", options: ["Melihat bulan", "Mengharapkan sesuatu yang mustahil", "Pungguk sedih", "Bulan purnama"], correct: 1, type: "peribahasa" },
    { text: "Kalimat berikut yang menggunakan kata serapan yang benar...", options: ["Aktifitas", "Aktivitas", "Aktipitas", "Aktif"], correct: 1, type: "kata_baku" },
    { text: "Teks anekdot bertujuan...", options: ["Menceritakan kisah sedih", "Mengkritik dengan humor", "Menjelaskan prosedur", "Mendeskripsikan benda"], correct: 1, type: "sastra" },
    { text: "Antonim 'sintesis' adalah...", options: ["Analisis", "Paduan", "Gabungan", "Kesatuan"], correct: 0, type: "antonim" },
    { text: "Kalimat: 'Buku yang dipinjam Adi hilang.' Klausa 'yang dipinjam Adi' berfungsi sebagai...", options: ["Subjek", "Predikat", "Objek", "Keterangan"], correct: 2, type: "tata_bahasa" },
    { text: "Sinonim 'krusial' adalah...", options: ["Sepele", "Penting", "Mudah", "Ringan"], correct: 1, type: "sinonim" },
    { text: "Kata 'antropologi' berarti ilmu tentang...", options: ["Bahasa", "Manusia", "Bintang", "Hewan"], correct: 1, type: "kosakata" },
    { text: "'Ada gula ada semut' artinya...", options: ["Gula manis", "Di mana ada kemudahan di situ banyak orang", "Semut suka gula", "Makanan manis"], correct: 1, type: "peribahasa" },
    { text: "Majas sarkasme adalah sindiran yang...", options: ["Halus", "Kasar dan langsung", "Tersembunyi", "Penuh kiasan"], correct: 1, type: "majas" },
    { text: "Penulisan partikel '-pun' yang benar...", options: ["Apa pun", "Apapun", "Apa-pun", "Apa Pun"], correct: 0, type: "ejaan" },
    { text: "Kata benda abstrak adalah kata yang...", options: ["Bisa dilihat", "Tidak bisa diraba", "Berwujud fisik", "Berkaitan dengan alat"], correct: 1, type: "tata_bahasa" },
    { text: "Sinonim 'relevan' adalah...", options: ["Tidak penting", "Bersangkutan", "Berbeda", "Terpisah"], correct: 1, type: "sinonim" },
    { text: "Antonim 'vertikal' adalah...", options: ["Horizontal", "Lurus", "Tegak", "Miring"], correct: 0, type: "antonim" },
    { text: "Frasa nominal ditandai dengan inti berupa...", options: ["Kata kerja", "Kata benda", "Kata sifat", "Kata depan"], correct: 1, type: "tata_bahasa" },
    { text: "'Sambil menyelam minum air' artinya...", options: ["Menyelam sambil minum", "Mengerjakan dua hal sekaligus", "Hemat waktu", "Bermain air"], correct: 1, type: "peribahasa" },
    { text: "Kata 'epistemologi' berarti ilmu tentang...", options: ["Pengetahuan", "Keindahan", "Kebaikan", "Tuhan"], correct: 0, type: "kosakata" },
    { text: "Konjungsi intrakalimat yang menyatakan tujuan...", options: ["Karena", "Agar", "Tetapi", "Atau"], correct: 1, type: "tata_bahasa" },
    { text: "Majas eufemisme digunakan untuk...", options: ["Menyakiti hati", "Menghaluskan kata", "Membesar-besarkan", "Menyindir"], correct: 1, type: "majas" },
    { text: "Sinonim 'kontradiksi' adalah...", options: ["Persamaan", "Pertentangan", "Persetujuan", "Perpaduan"], correct: 1, type: "sinonim" },
    { text: "Kata baku dari 'analisa' adalah...", options: ["Analisa", "Analisis", "Analiza", "Analysa"], correct: 1, type: "kata_baku" },
    { text: "Kata baku dari 'hakekat' adalah...", options: ["Hakekat", "Hakikat", "Hakiekat", "Hakkikat"], correct: 1, type: "kata_baku" },
    { text: "Kata baku dari 'kaedah' adalah...", options: ["Kaedah", "Kaidah", "Kaideh", "Kaeda"], correct: 1, type: "kata_baku" },
    { text: "Kata baku dari 'jadual' adalah...", options: ["Jadual", "Jadwal", "Jadwall", "Jaduwal"], correct: 1, type: "kata_baku" },
    { text: "Sinonim 'ambigu' adalah...", options: ["Jelas", "Taksa", "Tegas", "Lugas"], correct: 1, type: "sinonim" },
    { text: "Sinonim 'esensi' adalah...", options: ["Hiasan", "Inti", "Tambahan", "Lampiran"], correct: 1, type: "sinonim" },
    { text: "Sinonim 'validitas' adalah...", options: ["Kepalsuan", "Kesahihan", "Keraguan", "Kelemahan"], correct: 1, type: "sinonim" },
    { text: "'Hipotesis' dalam penelitian berarti...", options: ["Kesimpulan akhir", "Dugaan sementara", "Data lapangan", "Daftar pustaka"], correct: 1, type: "kosakata" },
    { text: "Sinonim 'koheren' adalah...", options: ["Terpecah", "Padu", "Acak", "Renggang"], correct: 1, type: "sinonim" },
    { text: "Antonim 'eksplisit' adalah...", options: ["Terang-terangan", "Implisit", "Jelas", "Gamblang"], correct: 1, type: "antonim" },
    { text: "Antonim 'heterogen' adalah...", options: ["Beragam", "Homogen", "Campuran", "Majemuk"], correct: 1, type: "antonim" },
    { text: "Antonim 'objektif' adalah...", options: ["Netral", "Subjektif", "Adil", "Faktual"], correct: 1, type: "antonim" },
    { text: "Antonim 'radikal' adalah...", options: ["Ekstrem", "Moderat", "Keras", "Total"], correct: 1, type: "antonim" },
    { text: "Majas sinekdoke pars pro toto terdapat pada kalimat...", options: ["Indonesia menang dalam pertandingan itu", "Sudah lama batang hidungnya tidak tampak", "Dia sangat rajin belajar", "Kami makan di kantin"], correct: 1, type: "majas" },
    { text: "Majas anafora adalah pengulangan kata pada...", options: ["Akhir kalimat", "Awal larik atau kalimat", "Tengah paragraf", "Judul karangan"], correct: 1, type: "majas" },
    { text: "Majas antitesis terdapat pada kalimat...", options: ["Dia pandai sekali", "Tua muda hadir di acara itu", "Angin berbisik lembut", "Kami belajar bersama"], correct: 1, type: "majas" },
    { text: "Cerita kiasan yang seluruh isinya melambangkan hal lain disebut majas...", options: ["Hiperbola", "Alegori", "Ironi", "Litotes"], correct: 1, type: "majas" },
    { text: "'Menepuk air di dulang, terpercik muka sendiri' artinya...", options: ["Rajin membersihkan diri", "Menjelekkan keluarga sendiri berakibat pada diri sendiri", "Suka bermain air", "Bekerja tanpa hasil"], correct: 1, type: "peribahasa" },
    { text: "'Bagai menegakkan benang basah' artinya...", options: ["Pekerjaan mudah", "Melakukan hal yang sia-sia", "Menjemur pakaian", "Bekerja dengan teliti"], correct: 1, type: "peribahasa" },
    { text: "'Karena nila setitik, rusak susu sebelanga' artinya...", options: ["Susu mudah basi", "Kesalahan kecil merusak kebaikan yang banyak", "Harus rajin menabung", "Jangan menyusahkan orang"], correct: 1, type: "peribahasa" },
    { text: "Ciri kalimat efektif adalah...", options: ["Bertele-tele", "Hemat kata dan jelas maknanya", "Banyak pengulangan", "Panjang dan rumit"], correct: 1, type: "tata_bahasa" },
    { text: "Klausa subordinatif adalah klausa yang...", options: ["Berdiri sendiri", "Bergantung pada klausa utama", "Selalu di awal kalimat", "Tidak memiliki predikat"], correct: 1, type: "tata_bahasa" },
    { text: "Frasa verbal memiliki inti berupa kata...", options: ["Benda", "Kerja", "Sifat", "Bilangan"], correct: 1, type: "tata_bahasa" },
    { text: "Kalimat inversi adalah kalimat yang...", options: ["Subjeknya di awal", "Predikatnya mendahului subjek", "Tidak memiliki objek", "Berupa pertanyaan"], correct: 1, type: "tata_bahasa" },
    { text: "Konjungsi konsesif (pertentangan harapan) contohnya...", options: ["Karena", "Meskipun", "Sehingga", "Kemudian"], correct: 1, type: "tata_bahasa" },
    { text: "'Etimologi' adalah ilmu tentang...", options: ["Serangga", "Asal-usul kata", "Bintang", "Batuan"], correct: 1, type: "kosakata" },
    { text: "Kata 'paradigma' berarti...", options: ["Contoh soal", "Kerangka berpikir", "Daftar isi", "Judul buku"], correct: 1, type: "kosakata" },
    { text: "'Retorika' adalah seni...", options: ["Melukis", "Berbicara", "Menari", "Memahat"], correct: 1, type: "kosakata" },
    { text: "Teks editorial berisi...", options: ["Cerita fiksi", "Opini redaksi tentang isu aktual", "Iklan produk", "Data statistik saja"], correct: 1, type: "teks" },
    { text: "Struktur teks argumentasi yang lengkap adalah...", options: ["Orientasi-komplikasi-resolusi", "Tesis-argumen-penegasan ulang", "Abstrak-isi-koda", "Pembuka-isi-lampiran"], correct: 1, type: "teks" },
  ],
};

function shuffleArray(arr: any[]) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Tier = keyof typeof QUESTIONS;

// Campuran tingkat kesulitan per level pemain (level global = XP / 500 + 1).
// Makin tinggi level murid, makin besar porsi soal SMP lalu SMA — permainan
// terasa naik kelas, bukan mengulang soal yang sama terus.
function getTierMix(level: number): Record<Tier, number> {
  if (level <= 3) return { SD: 1, SMP: 0, SMA: 0 };
  if (level <= 6) return { SD: 0.7, SMP: 0.3, SMA: 0 };
  if (level <= 9) return { SD: 0.4, SMP: 0.5, SMA: 0.1 };
  if (level <= 13) return { SD: 0.15, SMP: 0.55, SMA: 0.3 };
  return { SD: 0, SMP: 0.3, SMA: 0.7 };
}

function buildMixedQuestions(level: number, count: number) {
  const mix = getTierMix(level);
  const tiers = Object.keys(mix) as Tier[];
  const picked: Array<(typeof QUESTIONS.SD)[number] & { tier: Tier }> = [];

  for (const t of tiers) {
    const n = Math.round(count * mix[t]);
    if (n <= 0) continue;
    picked.push(...shuffleArray([...QUESTIONS[t]]).slice(0, n).map((q) => ({ ...q, tier: t })));
  }

  // Pembulatan bisa menyisakan kekurangan — isi dari gabungan semua tier.
  if (picked.length < count) {
    const have = new Set(picked.map((q) => q.text));
    const rest = shuffleArray(
      tiers.flatMap((t) => QUESTIONS[t].map((q) => ({ ...q, tier: t })))
    ).filter((q) => !have.has(q.text));
    picked.push(...rest.slice(0, count - picked.length));
  }

  return shuffleArray(picked)
    .slice(0, count)
    .map((q) => shuffleKatastraQuestion(q));
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const count = parseInt(searchParams.get("count") || "15");
    const explicitGrade = searchParams.get("grade") as Tier | null;

    // Level diambil server-side dari XP murid — klien tidak perlu (dan tidak
    // bisa) memilih sendiri. Query param `level` hanya fallback saat tanpa sesi.
    let level = parseInt(searchParams.get("level") || "1");
    const user = await getUser().catch(() => null);
    if (user) {
      const dbUser = await db.user.findUnique({ where: { id: user.id }, select: { level: true } });
      if (dbUser?.level) level = dbUser.level;
    }

  if (explicitGrade && QUESTIONS[explicitGrade]) {
    const pool = QUESTIONS[explicitGrade];
    const selected = shuffleArray([...pool])
      .slice(0, Math.min(count, pool.length))
      .map((q) => shuffleKatastraQuestion(q));
    return NextResponse.json({ questions: selected, grade: explicitGrade, playerLevel: level, totalPool: pool.length });
  }

    const questions = buildMixedQuestions(level, count);
    const mix = getTierMix(level);
    const grade = (Object.keys(mix) as Tier[]).reduce((a, b) => (mix[a] >= mix[b] ? a : b));
    return NextResponse.json({
      questions,
      grade,
      playerLevel: level,
      totalPool: QUESTIONS.SD.length + QUESTIONS.SMP.length + QUESTIONS.SMA.length,
    });
  } catch (error) {
    console.error("GET /api/katastra/questions error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
