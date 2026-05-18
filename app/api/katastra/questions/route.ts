import { NextRequest, NextResponse } from "next/server";

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
    { text: "Kata baku dari 'apotik' adalah...", options: ["Apotik", "Apotek", "Appotek", "Apotik"], correct: 1, type: "kata_baku" },
    { text: "Sinonim kata 'indah' adalah...", options: ["Jelek", "Cantik", "Kotor", "Buru"], correct: 1, type: "sinonim" },
    { text: "'Dia ___ buku di perpustakaan.' Kata yang tepat adalah...", options: ["Membaca", "Membacakan", "Terbaca", "Dibacakan"], correct: 0, type: "kalimat" },
    { text: "Antonim kata 'pagi' adalah...", options: ["Siang", "Sore", "Malam", "Subuh"], correct: 2, type: "antonim" },
    { text: "Kata baku dari 'pebruari' adalah...", options: ["Pebruari", "Februari", "Februari", "Pebruari"], correct: 1, type: "kata_baku" },
    { text: "Kata 'tertinggi' mendapat imbuhan...", options: ["ber-", "me-", "ter-", "pe-"], correct: 2, type: "imbuhan" },
    { text: "Sinonim kata 'cepat' adalah...", options: ["Lambat", "Lecet", "Kencang", "Pelan"], correct: 2, type: "sinonim" },
    { text: "Kalimat yang tepat: 'Ibu ___ nasi di dapur.'", options: ["Masak", "Memasak", "Dimasak", "Ter masak"], correct: 1, type: "kalimat" },
    { text: "Kata baku dari 'resiko' adalah...", options: ["Resiko", "Reski", "Risiko", "Risiko"], correct: 2, type: "kata_baku" },
    { text: "Antonim kata 'panjang' adalah...", options: ["Lebar", "Pendek", "Tinggi", "Dalam"], correct: 1, type: "antonim" },
    { text: "'Mereka sedang ___ bola di lapangan.'", options: ["Bermain", "Dimainkan", "Ter main", "Memainkan"], correct: 0, type: "kalimat" },
    { text: "Sinonim kata 'gemar' adalah...", options: ["Benci", "Suka", "Malas", "Malu"], correct: 1, type: "sinonim" },
    { text: "Kata baku dari 'aktifitas' adalah...", options: ["Aktivitas", "Aktifitas", "Aktipitas", "Activity"], correct: 0, type: "kata_baku" },
    { text: "Antonim kata 'kaya' adalah...", options: ["Miskin", "Harta", "Dermawan", "Mewah"], correct: 0, type: "antonim" },
    { text: "'Budi ___ sepeda setiap hari.'", options: ["Naik", "Menaiki", "Mengendarai", "Dinaiki"], correct: 2, type: "kalimat" },
    { text: "Sinonim 'bernyanyi' adalah...", options: ["Menari", "Bersuara", "Melantun", "Bicara"], correct: 2, type: "sinonim" },
    { text: "Kata baku dari 'tehnik' adalah...", options: ["Tehnik", "Tekhnik", "Teknik", "Tehnik"], correct: 2, type: "kata_baku" },
    { text: "Antonim 'tinggi' adalah...", options: ["Dalam", "Lebar", "Pendek", "Besar"], correct: 2, type: "antonim" },
    { text: "'Kucing itu ___ di atas genteng.'", options: ["Duduk", "Berbaring", "Memanjat", "Berdiri"], correct: 2, type: "kalimat" },
    { text: "Sinonim 'berani' adalah...", options: ["Takutan", "Pemberani", "Penakut", "Lemah"], correct: 1, type: "sinonim" },
    { text: "Kata baku dari 'diagnosa' adalah...", options: ["Diagnosa", "Diagnosis", "Diagnosa", "Dignosa"], correct: 1, type: "kata_baku" },
    { text: "Antonim 'terang' adalah...", options: ["Cerah", "Gelap", "Benderang", "Silau"], correct: 1, type: "antonim" },
    { text: "'Kami ___ upacara setiap hari Senin.'", options: ["Mengikuti", "Diikuti", "Mengikut", "Ikuti"], correct: 0, type: "kalimat" },
    { text: "Huruf kapital digunakan untuk...", options: ["Nama orang", "Kata depan", "Kata sambung", "Partikel"], correct: 0, type: "ejaan" },
    { text: "Kata 'bersih' mendapat imbuhan 'me-' menjadi...", options: ["Membersih", "Membersihkan", "Bersihkan", "Pembersih"], correct: 1, type: "imbuhan" },
    { text: "Sinonim 'gembira' adalah...", options: ["Sedih", "Senang", "Cemas", "Marah"], correct: 1, type: "sinonim" },
  ],
  SMP: [
    { text: "Kalimat efektif: 'Dia adalah siswa yang pandai sekali.' Perbaikannya...", options: ["Dia siswa pandai", "Dia adalah siswa pandai", "Dia siswa yang pandai", "Ia adalah pandai"], correct: 2, type: "kalimat_efektif" },
    { text: "Kata depan 'di' yang tepat terdapat pada kalimat...", options: ["Disekolah", "Di sekolah", "Di sekolah", "di Sekolah"], correct: 1, type: "ejaan" },
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
    { text: "Penulisan kata serapan yang benar: '___'", options: ["Standard", "Standar", "Standaar", "Standard"], correct: 1, type: "kata_baku" },
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

function getLevelForGrade(level: number): keyof typeof QUESTIONS {
  if (level <= 30) return "SD";
  if (level <= 60) return "SMP";
  return "SMA";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const level = parseInt(searchParams.get("level") || "1");
  const count = parseInt(searchParams.get("count") || "15");
  const grade = searchParams.get("grade") as keyof typeof QUESTIONS || getLevelForGrade(level);
  const questionPool = QUESTIONS[grade] || QUESTIONS.SD;
  const selected = shuffleArray(questionPool).slice(0, Math.min(count, questionPool.length));

  return NextResponse.json({ questions: selected, grade, totalPool: questionPool.length });
}
