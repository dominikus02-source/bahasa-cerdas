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

const data: Record<string, Konten> = {}

function add(title: string, k: Konten) { data[title] = k }

// ═══════════════════════════════════════════════════
// LEVEL 1: EYD & Dasar Kebahasaan
// ═══════════════════════════════════════════════════

add("Ejaan yang Disempurnakan (EYD)", {
  belajar: {
    tujuan: ["Memahami pengertian dan pentingnya EYD", "Menguasai aturan penulisan huruf dan ejaan", "Menerapkan EYD dalam tulisan sehari-hari"],
    materi: [
      { judul: "Apa itu EYD?", isi: [
        "EYD (Ejaan yang Disempurnakan) adalah pedoman resmi ejaan bahasa Indonesia yang ditetapkan pemerintah.",
        "EYD mengatur penulisan huruf, kata, tanda baca, dan unsur serapan.",
        "Tujuan EYD: menyeragamkan penulisan agar komunikasi tertulis jelas dan baku.",
        "EYD V terbaru mulai berlaku 2022 menggantikan PUEBI."
      ], contoh: ["Baku: 'aktivitas' (bukan aktifitas)", "Baku: 'jadwal' (bukan jadual)", "Baku: 'karier' (bukan karir)"], catatan: "Selalu gunakan KBBI daring untuk memeriksa bentuk baku suatu kata." },
      { judul: "Penulisan Huruf", isi: [
        "Huruf kapital dipakai di awal kalimat, nama orang, nama tempat, judul, dan sapaan.",
        "Huruf miring dipakai untuk menulis judul buku, kata bahasa asing, dan istilah ilmiah.",
        "Huruf tebal dipakai untuk menegaskan bagian tertentu.",
        "Contoh: 'Buku Negera Kertagama ditulis oleh Mpu Prapanca.'"
      ], contoh: ["Kapital: 'Hari ini aku ke Danau Toba.'", "Miring: 'Istilah upload berasal dari bahasa Inggris.'"] },
      { judul: "Penulisan Kata", isi: [
        "Kata ulang: anak-anak, buku-buku, berlari-lari.",
        "Kata depan di, ke, dari: dipisah jika menunjukkan tempat (di rumah, ke pasar).",
        "Awalan di- sebagai kata kerja: digabung (dimakan, ditulis).",
        "Partikel -lah, -kah, -tah: digabung (bacalah, apakah, siapatah)."
      ], contoh: ["Benar: 'di sekolah' (tempat)", "Benar: 'dimasak' (kata kerja pasif)", "Salah: 'dirumah', 'di beli'"] },
      { judul: "Unsur Serapan", isi: [
        "Unsur serapan dari bahasa asing disesuaikan ejaannya.",
        "Aturan umum: c → k (aktif, klasik), ph → f (fase, fosfor), th → t (teori, metode).",
        "Contoh: system → sistem, technique → teknik, international → internasional."
      ], contoh: ["Inggris → Indonesia:", "science → sains", "psychology → psikologi", "quality → kualitas", "rhythm → ritme"] },
    ],
    rangkuman: ["EYD adalah pedoman ejaan resmi bahasa Indonesia.", "Aturan: huruf kapital, penulisan kata, tanda baca, serapan.", "Gunakan KBBI untuk cek bentuk baku."]
  },
  latihan: makeSoal([
    ["Penulisan yang sesuai EYD...", ["Aktifitas", "Aktivitas", "Aktipitas", "Aktif"], 1, "Bentuk baku: aktivitas, bukan aktifitas."],
    ["'di' sebagai kata depan ditulis...", ["Digabung", "Dipisah", "Dihubung", "Dimiringkan"], 1, "'di' tempat: dipisah. 'dimakan': digabung (awalan)."],
    ["Penulisan judul yang benar...", ["negara Kesatuan RI", "Negara Kesatuan RI", "Negara kesatuan RI", "negara kesatuan RI"], 1, "Judul: huruf kapital di awal setiap kata utama."],
    ["Bentuk baku 'system' adalah...", ["Sistem", "Sistim", "Sistem (tetap)", "Sisteme"], 0, "System → sistem (c→k, e→e)."],
    ["Kata ulang yang benar...", ["Anak-anak", "Anakanak", "Anak anak", "Anak-anak (tanpa spasi)"], 0, "Kata ulang ditulis dengan tanda hubung."],
    ["Penulisan partikel 'lah' yang benar...", ["La h", "Lah (terpisah)", "Lah (digabung)", "la h"], 2, "Partikel -lah, -kah, -tah digabung dengan kata dasarnya."],
    ["Bentuk baku 'theori' adalah...", ["Teori", "Theory", "Tehori", "Theori"], 0, "Th → t: theory → teori."],
    ["Penulisan huruf miring untuk...", ["Judul buku", "Nama orang", "Nama kota", "Awalan"], 0, "Huruf miring untuk judul buku, kata asing, istilah ilmiah."],
    ["'di beli' penulisan yang benar...", ["Di beli", "dibeli", "di-beli", "d i beli"], 1, "'beli' kata kerja → awalan di- digabung: dibeli."],
    ["Bentuk baku 'kwalitas' adalah...", ["Kualitas", "Kwalitas", "Kwalitet", "Kualitet"], 0, "Kw → ku: quality → kualitas."],
  ]),
  praktik: {
    petunjuk: "Temukan 5 kesalahan ejaan dalam paragraf berikut, lalu tulis ulang dengan ejaan yang benar:\n\n'saya dan teman2 pergi ke curug Cilember. kami berangkat jam 7 pagi dari jakarta. di sana kami bermain air dan foto2. aktifitas ini sangat menyenangkan. kami pulang jam 4 sore.'",
    tips: ["Perhatikan huruf kapital", "Perhatikan penulisan 'di'", "Ganti angka dengan kata", "Ganti 'aktifitas' dengan bentuk baku", "Nama kota pakai kapital"],
    contoh: "Saya dan teman-teman pergi ke Curug Cilember. Kami berangkat jam 7 pagi dari Jakarta. Di sana kami bermain air dan foto-foto. Aktivitas ini sangat menyenangkan. Kami pulang jam 4 sore."
  },
  kuis: makeSoal([
    ["EYD kepanjangan dari...", ["Ejaan yang Disempurnakan", "Ejaan Yang Disepakati", "Ejaan Untuk Dasar", "Ejaan Yuridis"], 0, "EYD = Ejaan yang Disempurnakan"],
    ["'Phone' dalam EYD menjadi...", ["Pon", "Fon", "Phon", "Fone"], 1, "Ph → f: phone → fon"],
    ["Penulisan 'di' pada 'dimaksud'...", ["Dipisah", "Digabung", "Bisa dua-duanya", "Pakai spasi"], 1, "'dimaksud' kata kerja pasif, ditulis serangkai."],
    ["Penulisan yang SALAH...", ["Karier", "Karir", "Kreativitas", "Frekuensi"], 1, "Bentuk baku: karier, bukan karir."],
    ["'Ke' pada 'ke rumah'...", ["Digabung", "Dipisah", "Dimiringkan", "Dihubung"], 1, "ke tempat: dipisah."],
    ["Bentuk baku 'dipersilahkan'...", ["Tetap", "Dipersilakan", "Dipersonilakan", "Dipresilakan"], 1, "Bentuk baku: dipersilakan."],
    ["Penulisan angka dalam kalimat formal...", ["2 orang", "Dua orang", "II orang", "Ke-2 orang"], 1, "Angka ditulis dengan huruf di awal kalimat."],
    ["Penulisan gelar yang benar...", ["S. Pd", "S.Pd.", "S.pd", "s.pd"], 1, "Gelar: singkatan dengan titik, S.Pd."],
    ["Partikel 'per' yang benar...", ["Per orang", "perorang", "Per-orang", "per Orang"], 0, "'per' yang berarti 'setiap' ditulis terpisah."],
    ["Bentuk baku 'jadual'...", ["Jadual", "Jadwal", "Jadwal (tetap)", "Jadual (tetap)"], 1, "Bentuk baku: jadwal."],
  ]),
})

add("Huruf Kapital & Tanda Baca", {
  belajar: {
    tujuan: ["Menguasai penggunaan huruf kapital", "Memahami fungsi tanda baca", "Menerapkan tanda baca dalam tulisan"],
    materi: [
      { judul: "Huruf Kapital", isi: [
        "Awal kalimat: 'Hari ini cuaca cerah.'",
        "Nama orang: 'Andi', 'Kartini', 'Ki Hajar Dewantara.'",
        "Nama tempat: 'Pulau Bali', 'Gunung Merapi', 'Jalan Sudirman.'",
        "Nama bangsa, bahasa, tahun: 'Bangsa Indonesia', 'bahasa Inggris', 'tahun Hijriah.'",
        "Judul: 'Novel Laskar Pelangi' (kata utama kapital).",
        "Sapaan: 'Surat Bapak sudah saya terima.'"
      ], contoh: ["Benar: 'Hari Kemerdekaan 17 Agustus'", "Benar: 'Suku Sunda terkenal dengan budayanya'"], catatan: "Nama bangsa/negara pakai kapital, tapi kata 'indonesia' sebagai kata sifat TIDAK kapital (mis: 'keindonesiaan')." },
      { judul: "Tanda Titik (.)", isi: [
        "Akhir kalimat pernyataan.",
        "Di belakang singkatan: dll., dsb., s.d.",
        "Pemisah angka ribuan: 1.000.000.",
        "TIDAK dipakai di akhir judul dan subjudul."
      ], contoh: ["'Saya suka membaca buku.'", "'Lomba diadakan pada 17 Agustus 2024.'"] },
      { judul: "Tanda Koma (,) dan Tanda Lainnya", isi: [
        "Koma: pemisah unsur dalam perincian (apel, jeruk, mangga).",
        "Koma: sebelum ' tetapi, melainkan, sedangkan'.",
        "Tanda seru (!): kalimat perintah dan seruan.",
        "Tanda tanya (?): kalimat tanya.",
        "Tanda petik (\"...\"): kutipan langsung.",
        "Tanda titik dua (:): sebelum perincian atau setelah kata 'berikut'/'sebagai berikut'."
      ], contoh: ["Koma: 'Dia pintar, rajin, dan baik hati.'", "Seru: 'Aduh, sakit sekali!'", "Petik: Ibu berkata, \"Belajarlah yang giat.\""] },
    ],
    rangkuman: ["Huruf kapital: nama, awal kalimat, judul, sapaan.", "Titik: akhir kalimat, singkatan, ribuan.", "Koma: perincian, sebelum kata penghubung.", "Tanda lain sesuai fungsinya."]
  },
  latihan: makeSoal([
    ["Penulisan kapital yang benar...", ["Pulau jawa", "Pulau Jawa", "pulau Jawa", "pulau jawa"], 1, "Nama tempat: 'Pulau' dan 'Jawa' pakai kapital."],
    ["Tanda baca untuk kalimat perintah...", ["Titik", "Tanda tanya", "Tanda seru", "Koma"], 2, "Kalimat perintah pakai tanda seru (!)."],
    ["Penulisan yang tepat...", ['Dia berkata, "Ayo belajar"', "Dia berkata: Ayo belajar", 'Dia berkata " Ayo belajar "', "Dia berkata, Ayo belajar"], 0, "Kutipan langsung pakai tanda petik setelah koma."],
    ["Tanda titik pada 'dll' yang benar...", ["d l l", "dll", "dll.", "d,l,l"], 2, "Singkatan 'dll' diberi titik di akhir."],
    ["'Meskipun hujan namun ia tetap berangkat' tanda koma setelah...", ["hujan", "namun", "tetap", "berangkat"], 0, "Koma sebelum kata 'namun'."],
    ["Penulisan judul yang benar...", ["Perjalanan ke Timur", "Perjalanan ke timur", "perjalanan ke Timur", "perjalanan ke timur"], 0, "Judul: kata utama kapital."],
    ["Fungsi titik dua pada 'Bahan: tepung, telur, gula'...", ["Akhir kalimat", "Sebelum perincian", "Tanda jadi", "Pemisah kata"], 1, "Titik dua sebelum perincian."],
    ["Penulisan yang benar...", ["Jam 12:30 WIB", "Jam 12.30 WIB", "Jam 12;30 WIB", "Jam 12-30 WIB"], 0, "Tanda titik untuk pemisah jam, menit, detik di Indonesia."],
    ["'Bapak' pada kalimat 'Surat Bapak sudah sampai'...", ["Kapital", "Kecil", "Miring", "Tebal"], 0, "Kata sapaan 'Bapak' ditulis dengan huruf kapital."],
    ["Tanda kurung digunakan untuk...", ["Kalimat perintah", "Keterangan tambahan", "Akhir kalimat", "Kutipan"], 1, "Tanda kurung untuk keterangan tambahan atau penjelasan."],
  ]),
  praktik: {
    petunjuk: "Salin paragraf berikut, lalu tambahkan huruf kapital dan tanda baca yang tepat:\n\n'pada hari minggu aku dan keluarga pergi ke pantai anyer kami membawa bekal nasi goreng buah buahan dan minuman ibu berkata ayo mandi di pantai kami bermain ombak sampai sore hari'",
    tips: ["Kapital di awal kalimat", "Kapital di nama hari dan tempat", "Koma sebelum 'dan' jika perincian lebih dari 3", "Tanda petik untuk kutipan langsung", "Titik di akhir kalimat"],
    contoh: "Pada hari Minggu, aku dan keluarga pergi ke Pantai Anyer. Kami membawa bekal: nasi goreng, buah-buahan, dan minuman. Ibu berkata, \"Ayo mandi di pantai!\" Kami bermain ombak sampai sore hari."
  },
  kuis: makeSoal([
    ["Penulisan yang benar...", ["di Jalan Merdeka", "Di Jalan Merdeka", "di jalan merdeka", "Di jalan merdeka"], 1, "'Di' sebagai kata depan tempat ditulis terpisah, 'Jalan' kapital karena nama jalan."],
    ["Tanda baca untuk kata seru...", [".", "?", "!", ","], 2, "Tanda seru (!) untuk ungkapan seruan."],
    ["'Satu dua tiga' penulisan benar...", ["Satu, dua, tiga", "Satu dua tiga", "Satu, dua, dan tiga", "Satu dua, tiga"], 0, "Perincian dipisah koma."],
    ["Penulisan singkatan 'atas nama'...", ["a/n", "a n", "a/n.", "an"], 0, "'a/n' adalah singkatan 'atas nama'."],
    ["Tanda tanya diletakkan di...", ["Awal kalimat", "Akhir kalimat tanya", "Tengah kalimat", "Sebelum kata tanya"], 1, "Tanda tanya di akhir kalimat tanya."],
    ["'Wah indah sekali' tanda bacanya...", [".", "?", "!", ","], 2, "Ungkapan kekaguman pakai tanda seru."],
    ["Penulisan tahun yang benar...", ["tahun 2024", "tahun 2024.", "Tahun 2024", "Tahun 2024."], 2, "'Tahun' di awal kalimat pakai kapital."],
    ["Koma dipakai sebelum kata...", ["dan", "tetapi", "atau", "serta"], 1, "Koma sebelum 'tetapi', 'melainkan', 'sedangkan'."],
    ["Penulisan 'Al-quran' yang benar...", ["Al-Quran", "Alquran", "Al-quran", "al-Quran"], 0, "Huruf pertama setelah 'Al-' kapital: Al-Quran."],
    ["Tanda kurung siku [...] untuk...", ["Kutipan", "Koreksi dalam kutipan", "Perincian", "Singkatan"], 1, "Kurung siku untuk koreksi atau tambahan dalam kutipan."],
  ]),
})

add("Kata Baku & Kalimat Efektif", {
  belajar: {
    tujuan: ["Membedakan kata baku dan tidak baku", "Memahami ciri kalimat efektif", "Menyusun kalimat efektif dalam tulisan"],
    materi: [
      { judul: "Kata Baku & Tidak Baku", isi: [
        "Kata baku: kata yang sesuai dengan kaidah bahasa Indonesia (KBBI).",
        "Kata tidak baku: kata yang menyimpang dari kaidah resmi.",
        "Kata baku digunakan dalam situasi formal (surat, artikel, pidato).",
        "Kata tidak baku boleh dalam situasi santai (chat, media sosial, cerita)."
      ], contoh: ["Baku → Tidak Baku:", "aktivitas → aktifitas", "apotek → apotik", "bus → bis", "cendekiawan → cendikiawan", "detail → detil", "ekstra → extra", "favorit → favorit (tetap)", "gizi → gisi"] },
      { judul: "Ciri Kalimat Efektif", isi: [
        "1. Kesepadanan: subjek + predikat jelas. 'Adik bermain.'",
        "2. Keparalelan: bentuk sama dalam perincian. 'Dia membaca, menulis, dan berhitung.' (bukan 'membaca, menulis, dan hitung')",
        "3. Kehematan: tidak boros kata. 'Para siswa-siswa' → 'Para siswa' atau 'siswa-siswa'.",
        "4. Kecermatan: tidak ambigu. 'Ibu membeli buku cerita anak baru' → 'Ibu membeli buku cerita anak yang baru' atau 'Ibu membeli buku cerita baru untuk anak'.",
        "5. Kepaduan: logis dan runtut."
      ], contoh: ["Tidak efektif: 'Bagi semua siswa-siswa harap berkumpul.'", "Efektif: 'Semua siswa harap berkumpul.'"] },
    ],
    rangkuman: ["Kata baku sesuai KBBI, digunakan formal.", "Kalimat efektif: padan, paralel, hemat, cermat, padu.", "Hindari pemborosan kata dan makna ganda."]
  },
  latihan: makeSoal([
    ["Kata baku dari 'apotik'...", ["Apotik (tetap)", "Apotek", "Apotek (baku)", "Apotik"], 2, "Baku: apotek."],
    ["Kalimat tidak efektif...", ["Adik bermain bola di halaman.", "Para siswa-siswa berkumpul di aula.", "Ibu memasak di dapur.", "Ayah membaca koran."], 1, "'Para' sudah berarti banyak, tidak perlu 'siswa-siswa'."],
    ["Kata baku dari 'cendikiawan'...", ["Cendikiawan", "Cendekiawan", "Cendikia (baku)", "Cendikia"], 1, "Baku: cendekiawan."],
    ["'Membaca, menulis, dan berhitung' termasuk ciri...", ["Kehematan", "Keparalelan", "Kepaduan", "Kecermatan"], 1, "Bentuk imbuhan di- semua: meN- (membaca, menulis) belum paralel dengan ber- (berhitung). Seharusnya: membaca, menulis, menghitung."],
    ["Kata baku dari 'detil'...", ["Detil (tetap)", "Detail", "Detil (baku)", "Detail (baku)"], 3, "Baku: detail."],
    ["Kalimat ambigu...", ["Dia pergi ke sekolah.", "Ibu membeli buku cerita anak baru.", "Ayah bekerja di kantor.", "Kami makan siang bersama."], 1, "Ambigu: buku cerita anak baru? buku baru untuk anak?"],
    ["Kata baku dari 'isap'...", ["Isap (baku)", "Hisap", "Hisap (baku)", "Isap"], 1, "Baku: hisap."],
    ["'Bagi semua hadirin harap berdiri.' Perbaikan...", ["Semua hadirin berdiri.", "Bagi hadirin berdiri.", "Untuk hadirin berdiri.", "Hadirin dimohon berdiri."], 3, "Lebih efektif dan sopan."],
    ["Kata baku dari 'izin'...", ["Ijin", "Izin (baku)", "Idzin", "Izin"], 1, "Baku: izin."],
    ["'Karena dia sakit, maka ia tidak masuk.' Perbaikan...", ["Karena sakit, ia tidak masuk.", "Dia sakit maka tidak masuk.", "Karena dia sakit, ia tidak masuk.", "Sakit, maka tidak masuk."], 0, "Hemat: 'karena' dan 'maka' tidak perlu bersama."],
  ]),
  praktik: {
    petunjuk: "Perbaikilah 5 kesalahan dalam paragraf berikut (kata tidak baku + kalimat tidak efektif):\n\n'Para siswa-siswi diwajibkan untuk membawa buku-buku cetak dan juga alat tulis menulis. Aktifitas belajar mengajar akan dimulai tepat pada jam 7 pagi. Bagi yang telat datang akan dikenakan sangsi berupa bersih-bersih kelas. Demikianlah pengumuman ini kami sampaikan, atas perhatiannya kami ucapkan terima kasih.'",
    tips: ["Hilangkan 'para' jika sudah jamak", "Ganti 'aktifitas' → aktivitas", "Ganti 'sangsi' → sanksi", "Hilangkan 'dan juga' → cukup 'dan'", "Hilangkan pemborosan 'buku-buku cetak' cukup 'buku cetak'"],
    contoh: "Siswa diwajibkan membawa buku cetak dan alat tulis. Aktivitas belajar mengajar dimulai pukul 7 pagi. Yang terlambat akan dikenai sanksi berupa membersihkan kelas. Demikian pengumuman ini. Atas perhatiannya, kami ucapkan terima kasih."
  },
  kuis: makeSoal([
    ["Kata baku 'nasehat'...", ["Nasihat (baku)", "Nasehat (baku)", "Naschat", "Nasehah"], 0, "Baku: nasihat."],
    ["Kalimat efektif ditandai...", ["Kata banyak", "Subjek-predikat jelas", "Bertele-tele", "Kata ulang semua"], 1, "Kalimat efektif: subjek + predikat jelas."],
    ["'Buku-buku' termasuk kata...", ["Baku (benar)", "Tidak baku", "Baku hanya untuk formal", "Tidak efektif"], 0, "Kata ulang 'buku-buku' baku untuk menyatakan jamak."],
    ["Kata baku 'kreatifitas'...", ["Kreatifitas (baku)", "Kreativitas", "Kreatipitas", "Kreatif"], 1, "Baku: kreativitas (dari kreatif + -itas)."],
    ["'Hadirilah acara ini!' Subjek kalimat...", ["Acara", "Hadirilah", "Kamu (implisit)", "Ini"], 2, "Kalimat perintah subjeknya 'kamu' tersirat."],
    ["Kata baku 'kwitansi'...", ["Kwitansi (baku)", "Kuitansi", "Kwitansi (tidak baku)", "Kuitansi (baku)"], 1, "Baku: kuitansi. Kw → ku."],
    ["' sangat amat besar' perbaikan...", ["Sangat besar", "Amat sangat besar", "Sangat amat", "Amat besar sekali"], 0, "Hemat: 'sangat' atau 'amat', tidak perlu keduanya."],
    ["Kata baku 'hakekat'...", ["Hakekat (baku)", "Hakikat", "Hakikat (baku)", "Hakekat"], 2, "Baku: hakikat."],
    ["'Dia baca buku di perpustakaan.' Perbaikan...", ["Dia membaca buku di perpustakaan.", "Dia baca buku.", "Baca buku di perpustakaan.", "Dibaca buku di perpustakaan."], 0, "Kalimat efektif perlu predikat berimbuhan 'me-'."],
    ["Kata baku 'ijasah'...", ["Ijasah (baku)", "Ijazah", "Ijazah (baku)", "Ijasah"], 2, "Baku: ijazah."],
  ]),
})

add("Imbuhan & Bentukan Kata", {
  belajar: {
    tujuan: ["Memahami jenis imbuhan (prefiks, sufiks, infiks, konfiks)", "Menguasai penggunaan imbuhan meN-, ber-, peN-, ke-an", "Membedakan makna kata berimbuhan"],
    materi: [
      { judul: "Jenis Imbuhan", isi: [
        "Prefiks (awalan): meN-, ber-, peN-, ter-, di-, ke-, se-.",
        "Sufiks (akhiran): -an, -kan, -i, -nya, -wan, -wati.",
        "Konfiks (gabungan): peN-an, per-an, ke-an, ber-an, se-nya.",
        "Infiks (sisipan): -el-, -em-, -er- (gemetar, sinambung, seruling)."
      ], contoh: ["meN- + tari → menari", "ber- + main → bermain", "peN- + tulis → penulis", "ke-an + indah → keindahan"] },
      { judul: "Makna Imbuhan meN-", isi: [
        "Melakukan aksi: 'Dia menulis surat.'",
        "Menyatakan proses: 'Air mendidih.'",
        "Menyatakan menjadi: 'Es mencair.'",
        "Aturan: me- (l,r,w,y), mem- (b,f,p), men- (d,t,c,j,z), meng- (a,i,u,e,o,g,h,k), meny- (s)."
      ], contoh: ["me- + lompat → melompat", "mem- + buka → membuka", "men- + dengar → mendengar", "meng- + ambil → mengambil", "meny- + sapu → menyapu"] },
      { judul: "Makna Imbuhan Ber-an, ke-an, peN-an", isi: [
        "ber-an: saling (bersalaman), banyak (bertaburan).",
        "ke-an: keadaan (kebahagiaan), terlalu (kebesaran).",
        "peN-an: proses (pendaftaran), tempat (pemberhentian).",
        "Perhatikan bentuk: pen- + tulis → penulis, pen- + dengar → pendengar."
      ], contoh: ["ber-an: 'Mereka bersalaman.'", "ke-an: 'Kebersihan lingkungan penting.'", "peN-an: 'Pendidikan adalah hak semua.'"] },
    ],
    rangkuman: ["Prefiks: meN-, ber-, peN-, ter-, di-, ke-", "Sufiks: -an, -kan, -i", "Konfiks: peN-an, ke-an, per-an", "Aturan meN-: menyesuaikan huruf awal kata dasar."]
  },
  latihan: makeSoal([
    ["meN- + tulis → ...", ["Menulis", "Nulis", "Menulisi", "Tertulis"], 0, "meN- + tulis → menulis (me + t luluh)."],
    ["ber- + renang → ...", ["Berenang", "Berrenang", "Renang", "Berenangan"], 0, "ber- + renang → berenang."],
    ["Imbuhan ke-an pada 'kebersihan' berarti...", ["Saling", "Keadaan", "Tempat", "Alat"], 1, "ke-an = keadaan."],
    ["peN- + dengar → ...", ["Pendengar", "Pendengar (benar)", "Penengar", "Pengdengar"], 1, "peN- + dengar → pendengar (d tidak luluh)."],
    ["'Memperbaiki' mengandung konfiks...", ["meN- + per + baik + -i", "meN- + per- + baik + -i", "mem- + perbaiki", "memper- + baik + -i"], 1, "Konfiks meN-per-i + kata dasar 'baik'."],
    ["'Menyapu' berasal dari...", ["meN- + s + sapu", "meny- + sapu", "meN- + sapu", "meN- + nyapu"], 2, "meN- + sapu → menyapu (s luluh)."],
    ["Makna 'bersalaman'...", ["Melakukan", "Saling", "Banyak", "Keadaan"], 1, "ber-an = saling (saling salam)."],
    ["'Membaca' berasal dari meN- + ...", ["Baca", "Membaca", "Pembaca", "Bacaan"], 0, "meN- + baca → membaca."],
    ["Imbuhan peN-an pada 'pelatihan' berarti...", ["Alat", "Proses", "Hasil", "Tempat"], 1, "peN-an = proses pelatihan."],
    ["'Terbawa' menggunakan awalan...", ["meN-", "ter-", "ber-", "di-"], 1, "ter- = awalan, 'terbawa' (tidak sengaja)."],
  ]),
  praktik: {
    petunjuk: "Bentuklah kata berimbuhan dari kata dasar berikut, lalu buat kalimat: 1) sikat, 2) ajar, 3) tari, 4) gigit, 5) suci. Minimal 3 kata berimbuhan berbeda per kata dasar.",
    tips: ["Gunakan berbagai jenis imbuhan", "Perhatikan huruf luluh", "Cek makna setelah diimbuhi"],
    contoh: "sikat → menyikat (Aku menyikat gigi tiap pagi), sikatlah (Sikatlah gigimu), tersikat (Gigi sudah tersikat bersih)"
  },
  kuis: makeSoal([
    ["'Menggoreng' berasal dari...", ["meN- + goreng", "meng- + goreng", "meN- + gorengan", "meN-per- + goreng"], 0, "g → meng-, meN- + goreng → menggoreng."],
    ["'Pelajar' berasal dari peN- + ...", ["Pelajar", "Belajar", "Ajar", "Pembelajar"], 1, "peN- + ajar → pelajar (a luluh jadi e, belajar + peN-)."],
    ["Awalan 'di-' bermakna...", ["Melakukan", "Pasif/dikenai", "Banyak", "Saling"], 1, "di- = pasif, 'dimakan' (dikenai tindakan)."],
    ["'Bermain' bermakna...", ["Melakukan aksi main", "Saling main", "Alat main", "Tempat main"], 0, "ber- = melakukan aktivitas."],
    ["Imbuhan '-wan' pada 'karyawan' berarti...", ["Alat", "Orang yang", "Sifat", "Tempat"], 1, "-wan = orang yang bergerak di bidang."],
    ["'Mendaki' meN- + ...", ["Daki", "Daki (baku)", "Pendaki", "Dakian"], 0, "meN- + daki → mendaki."],
    ["'Keindahan' termasuk jenis imbuhan...", ["Prefiks", "Sufiks", "Konfiks", "Infiks"], 2, "ke-an = konfiks."],
    ["'Tersenyum' berasal dari ter- + ...", ["Senyum", "Tersenyum", "Senyuman", "Senyumlah"], 0, "ter- + senyum → tersenyum."],
    ["Makna 'berjatuhan'...", ["Jatuh satu", "Jatuh banyak", "Akan jatuh", "Sudah jatuh"], 1, "ber-an = banyak/berulang."],
    ["'Mengoperasikan' berasal dari...", ["meN- + operasi + kan", "meN- + oprasi + -kan", "meN- + operasi", "meN-per- + operasi"], 0, "meN- + operasi (dasar) + kan → mengoperasikan."],
  ]),
})

add("Diksi & Makna Kata", {
  belajar: {
    tujuan: ["Memahami diksi (pilihan kata)", "Membedakan makna denotasi dan konotasi", "Menggunakan kata tepat sesuai konteks"],
    materi: [
      { judul: "Apa itu Diksi?", isi: [
        "Diksi adalah pilihan kata yang tepat dan sesuai untuk mengungkapkan gagasan.",
        "Diksi baik: tepat makna, sesuai konteks, efektif, dan indah.",
        "Pertimbangan diksi: siapa pembaca, situasi formal/santai, tujuan tulisan."
      ], contoh: ["Tepat: 'meninggal dunia' (formal) vs 'meninggal' / 'wafat'", "Tepat: 'menghemat' vs 'mengirit' (serapan dari irit)"], catatan: "Hindari kata 'yang mana' jika tidak perlu. 'Buku yang mana aku beli' → 'Buku yang aku beli'." },
      { judul: "Denotasi & Konotasi", isi: [
        "Denotasi: makna sebenarnya, apa adanya, sesuai kamus.",
        "Konotasi: makna kiasan, mengandung nilai rasa (positif/negatif).",
        "Contoh: 'bunga' denotasi = kembang; konotasi = gadis cantik.",
        "Makna konotasi bisa positif (putri = anak perempuan) atau negatif (ular = pengkhianat)."
      ], contoh: ["Denotasi: 'Rambutnya panjang' (makna sebenarnya)", "Konotasi: 'Dia bintang kelas' (bintang = terpintar)", "Denotasi: 'Kambing itu makan rumput.'", "Konotasi: 'Dia kambing hitam.' (kambing hitam = tertuduh)"] },
      { judul: "Sinonim & Antonim", isi: [
        "Sinonim: kata yang memiliki makna mirip/sama (besar = raya, pintar = cerdas).",
        "Antonim: kata yang berlawanan makna (besar ≠ kecil, panjang ≠ pendek).",
        "Sinonim tidak selalu bisa saling menggantikan (contoh: 'besar' dan 'raya' — 'Jalan Raya' bukan 'Jalan Besar').",
        "Polisemi: satu kata banyak makna (kepala: bagian tubuh, pemimpin, bagian organisasi)."
      ], contoh: ["Sinonim: 'cerdas', 'pintar', 'pandai', 'brilian'", "Antonim: 'kaya' × 'miskin', 'rajin' × 'malas'", "Polisemi 'tahun': 'tahun 2024' (waktu), 'tahun ajaran' (periode)"] },
    ],
    rangkuman: ["Diksi: pilihan kata tepat sesuai konteks.", "Denotasi: makna sebenarnya. Konotasi: makna kiasan.", "Sinonim: makna mirip. Antonim: makna berlawanan.", "Polisemi: satu kata banyak makna."]
  },
  latihan: makeSoal([
    ["'Bunga desa' bermakna konotasi...", ["Bunga di desa", "Gadis cantik di desa", "Tanaman hias", "Tumbuhan liar"], 1, "'Bunga desa' konotasi = gadis tercantik di desa."],
    ["Sinonim 'pintar'...", ["Bodoh", "Cerdas", "Malas", "Cepat"], 1, "Sinonim pintar = cerdas, pandai."],
    ["Antonim 'rajin'...", ["Tekun", "Malas", "Giat", "Sungguh-sungguh"], 1, "Antonim rajin = malas."],
    ["Kalimat denotasi...", ["Dia bintang kelas.", "Rambutnya panjang.", "Hatinya berbatu.", "Dia kutu buku."], 1, "'Rambutnya panjang' makna sebenarnya."],
    ["Polisemi kata 'kepala'...", ["Hanya bagian tubuh", "Bagian tubuh dan pemimpin", "Hanya pemimpin", "Hanya organisasi"], 1, "Kepala = bagian tubuh, pemimpin, bagian organisasi."],
    ["Kata tepat formal: 'meninggal'...", ["Mati", "Meninggal dunia", "Pulang", "Pergi"], 1, "Formal: 'meninggal dunia'."],
    ["Konotasi negatif 'serigala'...", ["Hewan hutan", "Orang buas/kejam", "Binatang buas", "Hewan karnivora"], 1, "Serigala konotasi = buas, kejam."],
    ["Sinonim 'indah'...", ["Jelek", "Elok", "Bodoh", "Kecil"], 1, "Sinonim indah = elok, cantik, permai."],
    ["'Jalan' dalam 'jalan keluar' bermakna...", ["Aspal", "Solusi", "Trotoar", "Rute"], 1, "'Jalan keluar' makna kiasan = solusi."],
    ["Antonim 'luas'...", ["Lebar", "Sempit", "Panjang", "Besar"], 1, "Antonim luas = sempit."],
  ]),
  praktik: {
    petunjuk: "Buat 5 kalimat dengan kata 'tangan'. Masing-masing dengan makna berbeda: 2 denotasi, 2 konotasi, 1 polisemi.",
    tips: ["Denotasi: anggota tubuh", "Konotasi: bantuan (tangan kanan), kekuasaan (tangan besi)", "Polisemi: 'tangan' dalam konteks berbeda"],
    contoh: "Denotasi 1: 'Tanganku sakit karena menulis.'\nDenotasi 2: 'Dia mencuci tangan sebelum makan.'\nKonotasi 1: 'Dia adalah tangan kanan pak direktur.' (asisten)\nKonotasi 2: 'Tangan besi pemerintah.' (keras/otoriter)\nPolisemi: 'Panjang tangan' artinya suka mencuri."
  },
  kuis: makeSoal([
    ["'Kambing hitam' bermakna...", ["Kambing warna hitam", "Orang yang dipersalahkan", "Hewan ternak", "Binatang kurban"], 1, "Kambing hitam = orang yang dipersalahkan."],
    ["Sinonim 'cerdik'...", ["Bodoh", "Pandai", "Licik (negatif)", "Baik"], 2, "Cerdik = licik (makna negatif dari cerdas)."],
    ["Denotasi 'mawar'...", ["Gadis cantik", "Bunga mawar (tanaman)", "Cinta", "Keindahan"], 1, "Denotasi: jenis bunga."],
    ["'Kakak' termasuk antonim dari...", ["Kakak", "Adik", "Ibu", "Ayah"], 1, "Antonim kakak = adik."],
    ["Kata 'mata' dalam 'mata air' bermakna...", ["Indra penglihatan", "Sumber air", "Air terjun", "Danau"], 1, "'Mata air' = sumber air."],
    ["Antonim 'maju'...", ["Mundur", "Cepat", "Depan", "Lanjut"], 0, "Antonim maju = mundur."],
    ["'Rumah' dalam 'rumah tampak angker' bermakna...", ["Denotasi (tempat tinggal)", "Konotasi (tempat menyeramkan)", "Polisemi", "Sinonim"], 0, "'Rumah' di sini = bangunan tempat tinggal, makna sebenarnya."],
    ["Sinonim 'berani'...", ["Takut", "Gagah", "Penakut", "Loyo"], 1, "Sinonim berani = gagah, perkasa."],
    ["Kata 'buah' dalam 'buah hati' bermakna...", ["Buah-buahan", "Anak (kesayangan)", "Apel", "Mangga"], 1, "'Buah hati' = anak."],
    ["Diksi yang tepat: 'Rasanya... sekali.' (sangat enak)...", ["Mantap", "Enak banget", "Menggiurkan", "Nikmat"], 3, "Pilihan tepat untuk formal: 'nikmat'. 'Enak banget' tidak baku."],
  ]),
})

// ═══════════════════════════════════════════════════
// LEVEL 2: Kalimat & Paragraf
// ═══════════════════════════════════════════════════

add("Kalimat Tunggal & Majemuk", {
  belajar: {
    tujuan: ["Membedakan kalimat tunggal dan majemuk", "Mengenal jenis kalimat majemuk", "Menyusun kalimat majemuk setara dan bertingkat"],
    materi: [
      { judul: "Kalimat Tunggal", isi: [
        "Kalimat tunggal terdiri dari satu klausa (satu subjek + satu predikat).",
        "Struktur minimal: S-P (Adik tidur).",
        "Bisa diperluas dengan objek, pelengkap, keterangan."
      ], contoh: ["S-P: 'Adik tidur.'", "S-P-O: 'Ibu memasak nasi.'", "S-P-O-K: 'Ayah membaca koran di teras.'"] },
      { judul: "Kalimat Majemuk Setara", isi: [
        "Gabungan dua kalimat tunggal atau lebih yang setara/sederajat.",
        "Kata hubung: dan, serta, lagi pula (penambahan); atau (pilihan); tetapi, namun, sedangkan (pertentangan).",
        "Pola: [kalimat 1] + konjungsi + [kalimat 2]."
      ], contoh: ["Penambahan: 'Ayah membaca koran dan ibu memasak.'", "Pilihan: 'Kamu mau teh atau kopi?'", "Pertentangan: 'Dia pandai tetapi malas.'"] },
      { judul: "Kalimat Majemuk Bertingkat", isi: [
        "Gabungan klausa yang tidak setara (induk + anak kalimat).",
        "Kata hubung: karena, sebab (sebab); sehingga, akibatnya (akibat); jika, apabila (syarat); meskipun, walau (konsesif); bahwa (penjelas).",
        "Anak kalimat dapat menduduki fungsi S, P, O, K dalam induk kalimat."
      ], contoh: ["Sebab: 'Dia tidak masuk karena sakit.'", "Syarat: 'Jika belajar, kamu naik kelas.'", "Konsesif: 'Meskipun hujan, ia tetap berangkat.'"] },
    ],
    rangkuman: ["Tunggal: satu klausa (S-P).", "Majemuk setara: klausa setara (dan, atau, tetapi).", "Majemuk bertingkat: induk + anak (karena, jika, meskipun)."]
  },
  latihan: makeSoal([
    ["'Ibu memasak di dapur' termasuk...", ["Kalimat tunggal", "Majemuk setara", "Majemuk bertingkat", "Kalimat kompleks"], 0, "Satu S (Ibu) + satu P (memasak) + K (di dapur)."],
    ["'Dia pintar tetapi sombong' konjungsi...", ["Penambahan", "Pertentangan", "Pilihan", "Sebab"], 1, "'Tetapi' menyatakan pertentangan."],
    ["'Jika rajin, kamu sukses' termasuk...", ["Tunggal", "Setara", "Bertingkat", "Langsung"], 2, "'Jika' = konjungsi syarat, majemuk bertingkat."],
    ["Konjungsi 'sehingga' pada kalimat...", ["Setara penambahan", "Setara pertentangan", "Bertingkat akibat", "Bertingkat syarat"], 2, "'Sehingga' menyatakan akibat."],
    ["'Dia menulis dan menggambar' termasuk...", ["Tunggal", "Setara penambahan", "Bertingkat", "Setara pilihan"], 1, "'Dan' = penambahan, dua predikat setara."],
    ["Anak kalimat dalam 'Aku tahu bahwa dia benar'...", ["Aku tahu", "Bahwa dia benar", "Dia benar", "Aku tahu bahwa"], 1, "'Bahwa dia benar' = anak kalimat sebagai objek."],
    ["'Karena sakit, dia tidak masuk.' Induk kalimat...", ["Karena sakit", "Dia tidak masuk", "Sakit", "Tidak masuk"], 1, "Induk = 'dia tidak masuk', anak = 'karena sakit'."],
    ["Kalimat tunggal yang benar...", ["Ayah pergi ke kantor dan ibu ke pasar.", "Ayah pergi ke kantor.", "Ayah pergi ke kantor karena bekerja.", "Ayah pergi ke kantor lalu ibu ke pasar."], 1, "Hanya satu S-P: Ayah pergi ke kantor."],
    ["'Kami belajar di kelas.' Pola kalimat...", ["S-P-K", "S-P-O", "S-P-O-K", "S-P"], 0, "S=Kami, P=belajar, K=di kelas."],
    ["'Meskipun capek, ia tetap olahraga.' Konjungsi...", ["Sebab", "Akibat", "Konsesif", "Syarat"], 2, "'Meskipun' = konjungsi konsesif (pertentangan harapan)."],
  ]),
  praktik: {
    petunjuk: "Buat 3 kalimat dari situasi 'pagi hari di rumah': 1 kalimat tunggal, 1 majemuk setara, 1 majemuk bertingkat.",
    tips: ["Tunggal: satu kegiatan", "Setara: dua kegiatan dengan dan/tetapi/atau", "Bertingkat: sebab-akibat, syarat-hasil"],
    contoh: "Tunggal: 'Ayah minum kopi di teras.'\nSetara: 'Ayah minum kopi dan ibu membaca koran.'\nBertingkat: 'Karena cuaca cerah, kami berjalan kaki ke sekolah.'"
  },
  kuis: makeSoal([
    ["'Kami belajar karena ada ujian' termasuk...", ["Tunggal", "Setara", "Bertingkat", "Tanya"], 2, "'Karena' = konjungsi sebab, majemuk bertingkat."],
    ["Konjungsi 'atau' menyatakan...", ["Penambahan", "Pertentangan", "Pilihan", "Akibat"], 2, "'Atau' = pilihan."],
    ["Jumlah klausa dalam 'Ibu memasak, Ayah membaca, Kakak menulis'...", ["1", "2", "3", "4"], 2, "Tiga klausa: Ibu memasak, Ayah membaca, Kakak menulis."],
    ["'Dia pergi ke toko lalu membeli buku' termasuk...", ["Tunggal dengan perluasan", "Setara", "Bertingkat", "Rapat"], 1, "'Lalu' = konjungsi urutan, makna setara."],
    ["Anak kalimat dalam 'Jika hujan, kita diam di rumah'...", ["Jika hujan", "Kita diam di rumah", "Hujan", "Diam"], 0, "'Jika hujan' = anak kalimat (syarat)."],
    ["Kalimat majemuk bertingkat hubungan tujuan...", ["Agar", "Karena", "Meskipun", "Dan"], 0, "'Agar' = konjungsi tujuan, 'belajar agar pintar'."],
    ["'Buku itu baru.' Pola...", ["S-P", "S-P-O", "S-P-Pel", "S-P-K"], 0, "S=buku itu, P=baru (kata sifat sebagai predikat)."],
    ["'Dia tidak hanya pintar tetapi juga rendah hati' konjungsi...", ["Penambahan + pertentangan", "Setara penegas", "Bertingkat", "Tunggal"], 1, "'Tidak hanya... tetapi juga' = konjungsi setara penegas."],
    ["Konjungsi 'padahal' termasuk...", ["Setara pertentangan", "Bertingkat konsesif", "Setara penambahan", "Bertingkat sebab"], 0, "'Padahal' = pertentangan (setara)."],
    ["'Saya membaca buku yang dibeli ibu' termasuk...", ["Tunggal", "Setara", "Bertingkat (perluasan S)", "Bertingkat (perluasan O)"], 2, "'Yang dibeli ibu' perluasan subjek 'buku'."],
  ]),
})

add("Paragraf & Gagasan Utama", {
  belajar: {
    tujuan: ["Memahami pengertian dan syarat paragraf", "Menemukan gagasan utama dalam paragraf", "Membedakan paragraf deduktif, induktif, campuran"],
    materi: [
      { judul: "Apa itu Paragraf?", isi: [
        "Paragraf adalah kumpulan kalimat yang membentuk satu gagasan utuh.",
        "Syarat paragraf baik: kesatuan (satu gagasan), koherensi (padu), pengembangan (lengkap).",
        "Panjang ideal: 3-7 kalimat (tidak terlalu pendek atau panjang)."
      ], contoh: ["Satu gagasan: paragraf tentang 'manfaat membaca' — semua kalimat mendukung topik itu."] },
      { judul: "Gagasan Utama & Kalimat Utama", isi: [
        "Gagasan utama: inti/ide pokok paragraf.",
        "Kalimat utama: kalimat yang mengandung gagasan utama.",
        "Gagasan pendukung: kalimat penjelas yang mengembangkan gagasan utama.",
        "Letak kalimat utama: di awal (deduktif), di akhir (induktif), di awal dan akhir (campuran)."
      ], contoh: ["Deduktif (utama di awal): 'Membaca banyak manfaat. Pertama, menambah ilmu. Kedua, melatih fokus. Ketiga, mengurangi stres.'", "Induktif (utama di akhir): 'Menambah ilmu, melatih fokus, mengurangi stres. Itulah manfaat membaca.'"] },
      { judul: "Pola Pengembangan Paragraf", isi: [
        "Deduktif: kalimat utama di awal → diikuti penjelasan (umum → khusus).",
        "Induktif: penjelasan/konkret di awal → kalimat utama di akhir (khusus → umum).",
        "Campuran: kalimat utama di awal dan ditegaskan kembali di akhir.",
        "Deskriptif: menggambarkan objek secara detail (khusus → khusus)."
      ], contoh: ["Deduktif: 'Olahraga penting bagi kesehatan. Olahraga melancarkan peredaran darah. Juga memperkuat otot dan tulang. Selain itu mengurangi stres.'", "Induktif: 'Olahraga melancarkan darah. Memperkuat otot. Mengurangi stres. Jelas, olahraga penting bagi kesehatan.'"] },
    ],
    rangkuman: ["Paragraf: kumpulan kalimat satu gagasan.", "Gagasan utama = inti paragraf.", "Letak kalimat utama menentukan jenis paragraf.", "Deduktif: umum→khusus. Induktif: khusus→umum."]
  },
  latihan: makeSoal([
    ["Gagasan utama paragraf deduktif terletak di...", ["Awal", "Akhir", "Tengah", "Awal dan akhir"], 0, "Deduktif: gagasan utama di awal paragraf."],
    ["'Olahraga penting bagi kesehatan.' Kalimat ini adalah...", ["Kalimat penjelas", "Kalimat utama", "Gagasan pendukung", "Kesimpulan"], 1, "Kalimat yang mengandung gagasan utama."],
    ["Paragraf induktif gagasan utama di...", ["Awal", "Akhir", "Tengah", "Setiap kalimat"], 1, "Induktif: gagasan utama di akhir paragraf."],
    ["Syarat paragraf baik kecuali...", ["Kesatuan", "Koherensi", "Panjang minimal 10 kalimat", "Pengembangan lengkap"], 2, "Tidak ada syarat panjang minimal."],
    ["'Pertama, kedua, ketiga' termasuk...", ["Kalimat utama", "Penanda urutan penjelas", "Gagasan utama", "Kata hubung sebab"], 1, "Penanda urutan untuk kalimat penjelas."],
    ["Kalimat penjelas berfungsi...", ["Menjadi inti", "Mengembangkan gagasan utama", "Menutup paragraf", "Mengganti utama"], 1, "Kalimat penjelas mengembangkan gagasan utama."],
    ["'Dengan demikian' biasanya di paragraf...", ["Deduktif", "Induktif (simpulan)", "Deskriptif", "Campuran"], 1, "'Dengan demikian' menandai simpulan di akhir paragraf."],
    ["Jenis paragraf yang menggambarkan sesuatu...", ["Deduktif", "Induktif", "Deskriptif", "Campuran"], 2, "Deskriptif = menggambarkan objek secara detail."],
    ["Paragraf campuran berarti...", ["Utama hanya di tengah", "Utama di awal + ditegaskan di akhir", "Tidak ada utama", "Semua kalimat utama"], 1, "Campuran: utama di awal dan ditegaskan di akhir."],
    ["'Belajar adalah kunci kesuksesan. Dengan belajar, kita mendapat ilmu. Belajar juga melatih disiplin. Maka, belajarlah dengan sungguh-sungguh.' Paragraf ini...", ["Deduktif", "Induktif", "Campuran", "Deskriptif"], 0, "Utama di awal: 'Belajar adalah kunci kesuksesan.'"],
  ]),
  praktik: {
    petunjuk: "Buat dua paragraf pendek tentang 'Manfaat Membaca': pertama deduktif, kedua induktif. Masing-masing 3-5 kalimat.",
    tips: ["Deduktif: tulis manfaat umum di awal, lalu rinci", "Induktif: tulis rincian dulu, simpulan manfaat di akhir"],
    contoh: "Deduktif:\n'Membaca buku punya banyak manfaat. Pertama, membaca menambah wawasan dan pengetahuan. Kedua, membaca melatih otak untuk fokus dan berpikir kritis. Ketiga, membaca mengurangi stres dan membuat rileks.'\n\nInduktif:\n'Membaca menambah wawasan. Membaca melatih fokus. Membaca mengurangi stres. Jelas, membaca punya banyak manfaat bagi siapa saja.'"
  },
  kuis: makeSoal([
    ["Paragraf baik harus memiliki...", ["Kesatuan ide", "Kata asing", "Banyak kalimat", "Majas"], 0, "Syarat utama: satu gagasan utuh (kesatuan)."],
    ["'Jadi, menjaga kesehatan sangat penting.' Kalimat ini kemungkinan di paragraf...", ["Deduktif (awal)", "Induktif (akhir)", "Deskriptif (tengah)", "Campuran (tengah)"], 1, "'Jadi' menandai simpulan di akhir."],
    ["Gagasan pendukung disebut juga...", ["Kalimat utama", "Kalimat penjelas", "Topik", "Judul"], 1, "Kalimat penjelas = gagasan pendukung."],
    ["Koherensi berarti...", ["Banyak kata", "Hubungan antarkalimat padu", "Panjang", "Indah"], 1, "Koherensi = kepaduan hubungan antarkalimat."],
    ["'Di samping itu' termasuk...", ["Kalimat utama", "Penanda tambahan penjelas", "Simpulan", "Topik"], 1, "'Di samping itu' = penanda tambahan untuk kalimat penjelas."],
    ["Tidak termasuk pola paragraf...", ["Deduktif", "Induktif", "Reduktif", "Campuran"], 2, "Tidak ada pola 'reduktif'."],
    ["Paragraf narasi menceritakan...", ["Argumen", "Peristiwa/kisah", "Objek", "Prosedur"], 1, "Narasi = menceritakan peristiwa."],
    ["'Intinya' termasuk penanda...", ["Urutan", "Penambahan", "Simpulan", "Sebab"], 2, "'Intinya' = simpulan/kesimpulan."],
    ["Ide pokok disebut juga...", ["Gagasan utama", "Kalimat penjelas", "Topik kalimat", "Rangkuman"], 0, "Ide pokok = gagasan utama."],
    ["'Pertama-tama' termasuk penanda...", ["Simpulan", "Urutan", "Pertentangan", "Sebab"], 1, "'Pertama-tama' = penanda urutan."],
  ]),
})

add("Kohesi & Koherensi", {
  belajar: {
    tujuan: ["Memahami kohesi (kepaduan bentuk)", "Memahami koherensi (kepaduan makna)", "Menggunakan kata penghubung antarkalimat"],
    materi: [
      { judul: "Kohesi dalam Paragraf", isi: [
        "Kohesi: kepaduan antarkalimat secara bentuk/kebahasaan.",
        "Alat kohesi: konjungsi, kata ganti (pronomina), pengulangan (repetisi), substitusi, elipsis.",
        "Pronomina: 'Andi pandai. Dia rajin belajar.' (dia = Andi).",
        "Repetisi: kata kunci diulang agar paragraf padu.",
        "Elipsis: penghilangan unsur yang sudah disebut. 'Saya suka kopi. [Saya] minum setiap pagi.'"
      ], contoh: ["Kohesi dengan pronomina: 'Rina membeli buku. Buku itu sangat mahal.'", "Kohesi dengan repetisi: 'Belajar adalah kewajiban. Belajar membuka pintu ilmu.'"] },
      { judul: "Koherensi dan Konjungsi", isi: [
        "Koherensi: hubungan makna yang logis antarkalimat.",
        "Konjungsi antarkalimat: oleh karena itu, selain itu, dengan demikian, sementara itu.",
        "Konjungsi intrakalimat: karena, sehingga, tetapi, dan, atau, meskipun.",
        "Koherensi baik: pembaca mudah mengikuti alur pikiran penulis."
      ], contoh: ["'Dia rajin belajar. Oleh karena itu, nilainya bagus.' (sebab-akibat)", "'Dia pandai. Namun, dia malas.' (pertentangan)", "'Pertama, siapkan alat. Kedua, campur bahan.' (urutan)"] },
    ],
    rangkuman: ["Kohesi: paduan bentuk (pronomina, repetisi, elipsis).", "Koherensi: paduan makna logis (konjungsi yang tepat).", "Gunakan konjungsi untuk menunjukkan hubungan ide."]
  },
  latihan: makeSoal([
    ["'Ani pandai. Dia rajin.' Kata 'dia' sebagai alat...", ["Repetisi", "Pronomina", "Elipsis", "Konjungsi"], 1, "'Dia' kata ganti (pronomina) untuk Ani."],
    ["Koherensi berkaitan dengan...", ["Bentuk kata", "Hubungan makna logis", "Ejaan", "Tanda baca"], 1, "Koherensi = kepaduan makna yang logis."],
    ["'Dia sakit. Oleh karena itu, tidak masuk.' Konjungsi menunjukkan...", ["Urutan", "Sebab-akibat", "Penambahan", "Pertentangan"], 1, "'Oleh karena itu' = sebab-akibat."],
    ["Elipsis adalah...", ["Pengulangan kata", "Penghilangan unsur", "Kata ganti", "Kata hubung"], 1, "Elipsis = penghilangan unsur yang sudah disebut."],
    ["Konjungsi intrakalimat 'sehingga' menunjukkan...", ["Penambahan", "Akibat", "Pertentangan", "Pilihan"], 1, "'Sehingga' = akibat/hasil."],
    ["Repetisi berfungsi...", ["Mengganti kata", "Mengulang kata kunci", "Menghilangkan kata", "Menyingkat"], 1, "Repetisi = pengulangan untuk kepaduan."],
    ["'Selain itu' termasuk konjungsi...", ["Antarkalimat penambahan", "Intrakalimat sebab", "Antarkalimat akibat", "Intrakalimat penambahan"], 0, "'Selain itu' = konjungsi antarkalimat, menambah informasi."],
    ["Kata ganti 'nya' pada 'Bukunya tebal' termasuk...", ["Pronomina posesif", "Pronomina persona", "Pronomina penunjuk", "Repetisi"], 0, "'-nya' di sini = pronomina posesif (kepunyaan)."],
    ["'Dengan demikian, penting belajar.' Konjungsi ini...", ["Penambahan", "Simpulan", "Urutan", "Sebab"], 1, "'Dengan demikian' = simpulan/kesimpulan."],
    ["'Saya suka kopi. [Saya] minum setiap pagi.' Termasuk...", ["Repetisi", "Elipsis", "Pronomina", "Konjungsi"], 1, "Unsur 'Saya' dihilangkan (elipsis)."],
  ]),
  praktik: {
    petunjuk: "Perbaiki paragraf berikut agar kohesif dan koheren dengan menambahkan pronomina, repetisi, dan konjungsi:\n\n'Budi anak rajin. Budi selalu belajar. Nilai Budi bagus. Budi disayang guru. Budi menjadi contoh.'",
    tips: ["Ganti nama 'Budi' dengan 'Dia' di kalimat kedua", "Tambahkan konjungsi sebab-akibat", "Gunakan 'sehingga' atau 'oleh karena itu'", "Kurangi pengulangan berlebihan"],
    contoh: "Budi anak yang rajin. Dia selalu belajar setiap hari. Karena rajin, nilainya bagus. Oleh karena itu, Budi disayang guru dan menjadi contoh bagi teman-temannya."
  },
  kuis: makeSoal([
    ["Kohesi tanpa koherensi menghasilkan...", ["Tulisan indah", "Tulisan padu bentuk tapi tidak nyambung maknanya", "Tulisan sempurna", "Paragraf ideal"], 1, "Bentuk padu tapi makna tidak logis."],
    ["'Sementara itu' termasuk konjungsi...", ["Antarkalimat pertentangan/waktu", "Intrakalimat", "Sebab", "Urutan"], 0, "'Sementara itu' = konjungsi antarkalimat."],
    ["'Ia' dan '-nya' termasuk...", ["Konjungsi", "Pronomina", "Repetisi", "Elipsis"], 1, "Pronomina = kata ganti (ia, -nya, dia)."],
    ["Alat kohesi yang mengulang kata kunci...", ["Pronomina", "Repetisi", "Elipsis", "Konjungsi"], 1, "Repetisi = pengulangan kata."],
    ["'Namun' dan 'akan tetapi' termasuk konjungsi...", ["Penambahan", "Pertentangan", "Sebab", "Akibat"], 1, "'Namun' = pertentangan."],
    ["'Buku itu milik siapa? Milik Andi.' Termasuk...", ["Repetisi", "Elipsis", "Pronomina", "Konjungsi"], 1, "'Milik' dihilangkan pada jawaban (elipsis)."],
    ["Konjungsi 'selain itu' fungsinya...", ["Menentang", "Menambah informasi", "Menyimpulkan", "Menyatakan urutan"], 1, "'Selain itu' = menambah informasi."],
    ["Koherensi baik membuat pembaca...", ["Bingung", "Mudah mengikuti alur", "Menebak-nebak", "Berhenti baca"], 1, "Koherensi baik = alur pikir mudah diikuti."],
    ["'Pertama... Kedua... Ketiga...' menunjukkan koherensi...", ["Sebab-akibat", "Urutan", "Penambahan", "Pertentangan"], 1, "Urutan = organisasi ide secara bertahap."],
    ["'Akhirnya' menandai...", ["Awal paragraf", "Penutup/kesimpulan", "Pertentangan", "Penambahan"], 1, "'Akhirnya' = penutup urutan cerita."],
  ]),
})

add("Fakta, Opini, Asumsi", {
  belajar: {
    tujuan: ["Membedakan fakta, opini, dan asumsi", "Mengidentifikasi fakta dalam teks", "Menyampaikan opini dengan data pendukung"],
    materi: [
      { judul: "Fakta", isi: [
        "Fakta: informasi yang dapat dibuktikan kebenarannya.",
        "Ciri: data angka, tanggal, peristiwa nyata, dapat diverifikasi.",
        "Contoh: 'Jumlah penduduk Indonesia 278 juta jiwa (Data BPS).'",
        "Kata kunci: berdasarkan data, menurut riset, pada tahun, tercatat."
      ], contoh: ["'Gempa Lombok 2018 berkekuatan 7,0 SR.'", "'Harga beras naik 5% bulan ini.'", "'UNESCO menetapkan wayang sebagai warisan budaya.'"] },
      { judul: "Opini", isi: [
        "Opini: pendapat, pandangan, penilaian pribadi (belum tentu benar untuk semua).",
        "Ciri: kata subjektif (menurut saya, sebaiknya, mungkin, seharusnya).",
        "Opini yang baik didukung fakta dan data.",
        "Perbedaan: fakta = objektif, opini = subjektif."
      ], contoh: ["'Menurut saya, pendidikan adalah prioritas.'", "'Film ini sangat menghibur.'", "'Sebaiknya pemerintah menurunkan harga BBM.'"] },
      { judul: "Asumsi", isi: [
        "Asumsi: dugaan/anggapan yang belum terbukti kebenarannya.",
        "Ciri: kata seperti 'sepertinya', 'agaknya', 'barangkali', 'mungkin'.",
        "Asumsi bisa menjadi hipotesis yang perlu diuji.",
        "Dalam argumentasi, asumsi harus didukung bukti agar menjadi argumen kuat."
      ], contoh: ["'Sepertinya hujan akan turun.'", "'Barangkali dia tidak datang karena macet.'", "'Agaknya harga akan naik tahun depan.'", "Asumsi vs fakta: 'Harga naik 10% (fakta)' vs 'Harga akan naik (asumsi)'."] },
    ],
    rangkuman: ["Fakta: dapat dibuktikan (data, tanggal, peristiwa).", "Opini: pendapat pribadi (subjektif).", "Asumsi: dugaan belum terbukti.", "Opini kuat = didukung fakta."]
  },
  latihan: makeSoal([
    ["'Harga minyak dunia US$80/barel' termasuk...", ["Fakta", "Opini", "Asumsi", "Saran"], 0, "Harga terdokumentasi, bisa dicek."],
    ["'Sebaiknya kita belajar lebih giat' termasuk...", ["Fakta", "Opini", "Asumsi", "Perintah"], 1, "'Sebaiknya' = saran/opini."],
    ["'Barangkali dia sakit' termasuk...", ["Fakta", "Opini", "Asumsi", "Perintah"], 2, "'Barangkali' = dugaan belum terbukti."],
    ["Kata kunci fakta...", ["Sepertinya", "Berdasarkan data", "Menurut saya", "Mungkin"], 1, "'Berdasarkan data' menandai fakta."],
    ["'Menurut riset WHO, 60% orang kurang olahraga' termasuk...", ["Fakta", "Opini penulis", "Asumsi", "Dugaan"], 0, "Ada sumber riset WHO."],
    ["Opini baik didukung...", ["Perasaan", "Fakta/data", "Tebakan", "Khayalan"], 1, "Opini kuat = ada data pendukung."],
    ["'Sepertinya akan turun hujan' termasuk...", ["Fakta", "Opini", "Asumsi", "Kesimpulan"], 2, "'Sepertinya' = dugaan (asumsi)."],
    ["Fakta bersifat...", ["Subjektif", "Objektif", "Relatif", "Tergantung orang"], 1, "Fakta objektif, bisa diverifikasi."],
    ["'Menurut saya' menandai...", ["Fakta", "Opini", "Asumsi", "Data"], 1, "'Menurut saya' = opini pribadi."],
    ["Semua asumsi...", ["Pasti benar", "Belum terbukti", "Salah semua", "Sudah divalidasi"], 1, "Asumsi = dugaan yang belum terbukti."],
  ]),
  praktik: {
    petunjuk: "Baca paragraf berikut. Kelompokkan kalimat ke dalam Fakta (F), Opini (O), atau Asumsi (A):\n\n'1) Jumlah pengguna internet Indonesia 215 juta jiwa tahun 2023. 2) Menurut saya, internet sangat bermanfaat untuk pendidikan. 3) Sepertinya angka ini akan naik tahun depan. 4) Data We Are Social: rata-rata orang Indonesia online 7 jam per hari. 5) Sayangnya, banyak yang menyalahgunakan internet untuk hal negatif.'",
    tips: ["Cari data dan angka → F", "Cari 'menurut saya' → O", "Cari 'sepertinya'/'barangkali' → A"],
    contoh: "1) F (data jumlah 215 juta, tahun 2023)\n2) O ('menurut saya')\n3) A ('sepertinya' - dugaan)\n4) F (sumber data We Are Social)\n5) O (penilaian subjektif 'sayangnya')"
  },
  kuis: makeSoal([
    ["'Indonesia merdeka 17 Agustus 1945' adalah...", ["Fakta", "Opini", "Asumsi", "Legenda"], 0, "Peristiwa sejarah terdokumentasi."],
    ["'Saya rasa belajar itu penting' adalah...", ["Fakta", "Opini", "Asumsi", "Data"], 1, "'Saya rasa' = opini pribadi."],
    ["'Mungkin dia akan datang' adalah...", ["Fakta", "Opini", "Asumsi", "Pasti"], 2, "'Mungkin' = ketidakpastian."],
    ["Ciri asumsi...", ["Data", "Sumber riset", "Kata 'sepertinya'", "Angka"], 2, "'Sepertinya' = penanda asumsi."],
    ["Perbedaan fakta dan opini terletak pada...", ["Panjang", "Kebenaran terverifikasi", "Jumlah kata", "Struktur"], 1, "Fakta = terverifikasi, opini = tidak."],
    ["'Menurut survei Kompas' termasuk...", ["Fakta", "Opini", "Asumsi", "Prediksi"], 0, "Ada sumber survei."],
    ["Opini 'Pendidikan harus gratis' didukung fakta...", ["Negara maju gratis sekolah", "'Saya setuju'", "'Sepertinya'", "'Mungkin'"], 0, "Fakta negara maju mendukung opini."],
    ["'Agaknya harga akan turun' → asumsi karena...", ["Ada data", "Kata 'agaknya' dugaan", "Sudah pasti", "Berdasarkan riset"], 1, "'Agaknya' = dugaan."],
    ["Fakta dalam iklan...", ["'Rasanya paling enak'", "'Kandungan vitamin C 50mg'", "'Pasti kamu suka'", "'Sangat berkhasiat'"], 1, "'Kandungan vitamin C 50mg' terukur/faktual."],
    ["Kesimpulan 'berdasarkan data' dari...", ["Opini", "Asumsi", "Fakta", "Prediksi"], 2, "Fakta = berdasarkan data."],
  ]),
})

// ═══════════════════════════════════════════════════
// LEVEL 3: Teks & Genre Tulisan
// ═══════════════════════════════════════════════════

// Reused from existing seed-jalur-content.ts with adaptations
add("Teks Deskripsi", {
  belajar: { tujuan: ["Memahami pengertian teks deskripsi", "Mengidentifikasi ciri-ciri teks deskripsi", "Menyusun teks deskripsi sederhana"],
    materi: [
      { judul: "Apa itu Teks Deskripsi?", isi: ["Teks deskripsi menggambarkan objek secara terperinci sehingga pembaca seolah melihat, mendengar, atau merasakan sendiri.", "Tujuannya membuat pembaca memiliki gambaran jelas tentang sesuatu yang dideskripsikan.", "Ciri: kata konkret, kalimat perincian, majas personifikasi."], contoh: ["'Pantai Parangtritis memiliki hamparan pasir hitam yang lembut. Ombaknya bergulung-gulung memecah di karang-karang besar.'"], catatan: "Gunakan panca indera sebagai panduan." },
      { judul: "Struktur Teks Deskripsi", isi: ["1) Identifikasi: pengenalan objek yang akan dideskripsikan.", "2) Deskripsi bagian: gambaran detail objek (bentuk, warna, ukuran, suasana).", "3) Simpulan: kesan umum tentang objek.", "Kalimat perincian: 'ada...', 'yaitu...', 'seperti...'"], contoh: ["Identifikasi: 'Pantai Kuta adalah salah satu pantai terkenal di Bali.'", "Deskripsi: 'Pasir putihnya lembut. Ombak bergulung sedang. Matahari terbenam di ufuk barat.'"] },
    ], rangkuman: ["Menggambarkan objek secara detail.", "Struktur: identifikasi, deskripsi bagian, simpulan.", "Kata konkret, kalimat perincian, majas."] },
  latihan: makeSoal([
    ["Teks deskripsi bertujuan untuk...", ["Menceritakan kisah fiktif", "Menggambarkan objek secara detail", "Menyampaikan argumen", "Memberikan petunjuk"], 1, "Teks deskripsi menggambarkan objek."],
    ["Kata konkret terdapat pada...", ["Kebahagiaan", "Meja kayu jati", "Keindahan", "Cinta"], 1, "'Meja kayu jati' bisa dilihat dan diraba = konkret."],
    ["Yang BUKAN ciri teks deskripsi...", ["Mengandung majas", "Kata konkret", "Berisi argumen", "Kalimat perincian"], 2, "Argumen adalah ciri teks argumentasi."],
    ["'Aroma kopi tercium dari dapur' termasuk deskripsi...", ["Visual", "Auditif", "Penciuman", "Peraba"], 2, "'Aroma' berkaitan dengan indera penciuman."],
    ["Struktur teks deskripsi...", ["Orientasi-urutan-reorientasi", "Identifikasi-deskripsi-simpulan", "Tujuan-bahan-langkah", "Tesis-argumen-penegasan"], 1, "Struktur deskripsi: identifikasi, deskripsi bagian, simpulan."],
  ]),
  praktik: { petunjuk: "Pilihlah satu tempat favoritmu. Tulislah teks deskripsi 3-5 kalimat menggunakan kata konkret dan kalimat perincian!", tips: ["Gunakan 3 dari 5 panca indera", "Mulai dengan kalimat pembuka menarik"], contoh: "Kelasku memiliki dinding bercat putih bersih. Di sudut kanan terdapat rak buku berisi puluhan novel. Jendela besar menghadap taman yang hijau." },
  kuis: makeSoal([
    ["'Aroma kopi tercium dari dapur' — indera...", ["Penglihatan", "Pendengaran", "Penciuman", "Peraba"], 2, "Aroma = penciuman."],
    ["'Di sudut ruangan' menggunakan kata depan...", ["Di", "Ke", "Dari", "Pada"], 0, "'Di' menunjukkan tempat."],
    ["Yang BUKAN panca indera...", ["Penglihatan", "Pendengaran", "Perasaan", "Penciuman"], 2, "'Perasaan' bukan indera fisik."],
    ["Kalimat perincian yang tepat...", ["Rumah itu besar", "Rumah memiliki 3 kamar tidur, 2 kamar mandi, halaman luas", "Rumah itu bagus", "Rumah mahal"], 1, "Memberikan rincian spesifik."],
    ["Deskripsi visual berkaitan dengan...", ["Pendengaran", "Penglihatan", "Penciuman", "Peraba"], 1, "Visual = penglihatan."],
  ]),
})

// Teks Narasi
add("Teks Narasi & Cerita", {
  belajar: { tujuan: ["Memahami pengertian teks narasi", "Mengenal unsur-unsur cerita", "Menyusun teks narasi sederhana"],
    materi: [
      { judul: "Apa itu Narasi?", isi: ["Narasi adalah teks yang menceritakan peristiwa atau kisah secara kronologis.", "Tujuan: menghibur dan menyampaikan pesan/amanat.", "Cerita fantasi: narasi dengan unsur magis dan imajinasi.", "Teks rekon: narasi pengalaman masa lalu."], contoh: ["Narasi: 'Pada suatu hari, Andi pergi memancing. Tiba-tiba kailnya ditarik ikan besar...'"] },
      { judul: "Unsur Intrinsik Cerita", isi: ["Tema: gagasan dasar cerita.", "Alur (plot): urutan peristiwa (awal → tengah → akhir).", "Tokoh: protagonis (baik), antagonis (jahat), tritagonis (penengah).", "Latar: tempat, waktu, suasana.", "Sudut pandang: orang pertama (aku), orang ketiga (dia).", "Amanat: pesan moral."], contoh: ["Tema: 'Persahabatan'", "Alur: maju (kronologis)", "Tokoh: Andi (protagonis), Rudi (antagonis)", "Latar: sekolah, siang hari"] },
      { judul: "Perbedaan Narasi, Deskripsi, Rekon", isi: ["Narasi: fokus pada rangkaian peristiwa/kisah.", "Deskripsi: fokus pada gambaran objek.", "Rekon: narasi berdasarkan pengalaman nyata penulis.", "Struktur narasi: orientasi → komplikasi → resolusi → koda."], contoh: ["Orientasi: 'Pada liburan lalu, aku dan keluarga pergi ke Jogja.'", "Komplikasi: 'Tiba-tiba ban mobil meletus di jalan.'", "Resolusi: 'Untung ada bengkel tidak jauh dari sana.'"] },
    ], rangkuman: ["Narasi: cerita kronologis.", "Unsur: tema, alur, tokoh, latar, sudut pandang, amanat.", "Struktur: orientasi, komplikasi, resolusi, koda."] },
  latihan: makeSoal([
    ["Tujuan teks narasi...", ["Mendeskripsikan", "Menghibur", "Memberi petunjuk", "Argumen"], 1, "Narasi menghibur dan menyampaikan pesan."],
    ["'Pada zaman dahulu' termasuk bagian...", ["Orientasi", "Komplikasi", "Resolusi", "Koda"], 0, "Orientasi = pengantar cerita."],
    ["Tokoh jahat disebut...", ["Protagonis", "Antagonis", "Tritagonis", "Figuran"], 1, "Antagonis = tokoh jahat/berlawanan."],
    ["Cerita 'Kancil dan Buaya' termasuk...", ["Deskripsi", "Narasi fabel", "Prosedur", "Argumentasi"], 1, "Fabel = cerita binatang, jenis narasi."],
    ["Alur cerita dibagi menjadi...", ["Awal-akhir", "Awal-tengah-akhir (orientasi, komplikasi, resolusi)", "Babak 1-5", "Pendahuluan-isi"], 1, "Alur = orientasi, komplikasi, resolusi."],
    ["'Aku' sebagai sudut pandang...", ["Orang ketiga", "Orang pertama", "Orang kedua", "Serba tahu"], 1, "'Aku' = sudut pandang orang pertama."],
    ["Amanat adalah...", ["Tema cerita", "Pesan moral", "Latar", "Tokoh"], 1, "Amanat = pesan moral cerita."],
    ["'Ia' sebagai sudut pandang...", ["Orang pertama", "Orang ketiga", "Orang kedua", "Aktif"], 1, "'Ia'/'Dia' = sudut pandang orang ketiga."],
    ["Latar mencakup...", ["Tema dan alur", "Tempat, waktu, suasana", "Tokoh dan penokohan", "Amanat"], 1, "Latar = tempat, waktu, suasana."],
    ["Cerita fantasi memiliki tokoh dengan...", ["Kekuatan biasa", "Kekuatan supranatural", "Pekerjaan tetap", "Sifat datar"], 1, "Tokoh fantasi punya kekuatan magis."],
  ]),
  praktik: { petunjuk: "Tulis cerita pendek (3-5 paragraf) tentang pengalaman tak terlupakan! Gunakan struktur: orientasi, komplikasi, resolusi.", tips: ["Pilih pengalaman nyata", "Gunakan sudut pandang orang pertama", "Tambahkan dialog"], contoh: "Orientasi: Liburan lalu, aku diajak ayah naik gunung.\nKomplikasi: Di tengah perjalanan, kakiku terkilir. Aku hampir menyerah.\nResolusi: Ayah menyemangatiku. Akhirnya kami berhasil sampai puncak. Aku belajar bahwa pantang menyerah itu penting." },
  kuis: makeSoal([
    ["Fabel adalah cerita...", ["Sejarah", "Binatang", "Fantasi", "Misteri"], 1, "Fabel = cerita binatang berperilaku manusia."],
    ["Bagian 'koda' berisi...", ["Awal cerita", "Amanat/kesimpulan", "Masalah", "Masalah selesai"], 1, "Koda = amanat di akhir cerita."],
    ["Perbedaan rekon dan narasi...", ["Rekon faktual, narasi bisa fiktif", "Rekon panjang", "Narasi pendek", "Sama saja"], 0, "Rekon = pengalaman nyata, narasi = bisa imajinasi."],
    ["'Tiba-tiba' menandai bagian...", ["Orientasi", "Komplikasi", "Resolusi", "Koda"], 1, "'Tiba-tiba' = awal masalah/komplikasi."],
    ["Penokohan watak tokoh...", ["Tema cerita", "Sifat/karakter tokoh", "Latar", "Alur"], 1, "Penokohan = penggambaran watak."],
  ]),
})

// Teks Prosedur
add("Teks Prosedur", {
  belajar: { tujuan: ["Memahami struktur teks prosedur", "Mengidentifikasi kalimat imperatif", "Menyusun teks prosedur"], materi: [
    { judul: "Pengertian", isi: ["Teks prosedur berisi langkah-langkah berurutan untuk melakukan sesuatu.", "Tujuan: membantu pembaca melakukan kegiatan dengan benar.", "Contoh: resep masakan, petunjuk penggunaan alat."], contoh: ["Cara Membuat Nasi Goreng: siapkan bahan, tumis bumbu, masak nasi, sajikan."] },
    { judul: "Struktur & Ciri", isi: ["1) Tujuan, 2) Bahan/Alat, 3) Langkah-langkah, 4) Penutup.", "Ciri bahasa: kalimat imperatif (perintah), ajakan, larangan.", "Kata urutan: pertama, kemudian, lalu, akhirnya."], contoh: ["Imperatif: 'Aduk hingga merata'", "Larangan: 'Jangan terlalu lama memasak'"] },
  ], rangkuman: ["Langkah berurutan.", "Struktur: tujuan-bahan-langkah-penutup.", "Kalimat imperatif dan kata urutan."] },
  latihan: makeSoal([
    ["Teks prosedur bertujuan...", ["Menghibur", "Memberi petunjuk", "Menggambar objek", "Argumen"], 1, "Prosedur = petunjuk melakukan sesuatu."],
    ["'Masukkan gula' termasuk kalimat...", ["Deklaratif", "Imperatif", "Interogatif", "Eksklamatif"], 1, "'Masukkan' = perintah/imperatif."],
    ["Struktur prosedur yang benar...", ["Abstrak-krisis-koda", "Tujuan-bahan-langkah-penutup", "Orientasi-peristiwa-reorientasi", "Pernyataan-argumen-penegasan"], 1, "Prosedur: tujuan, bahan, langkah, penutup."],
    ["Kata urutan yang tepat...", ["Sedangkan", "Kemudian", "Akan tetapi", "Meskipun"], 1, "'Kemudian' = urutan waktu/langkah."],
    ["Bagian penutup berisi...", ["Langkah awal", "Hasil akhir/tips", "Daftar alat", "Tujuan"], 1, "Penutup = hasil akhir atau tips."],
  ]),
  praktik: { petunjuk: "Tulislah teks prosedur membuat minuman favoritmu! Struktur: tujuan → bahan → langkah → penutup.", tips: ["Gunakan kata imperatif", "Gunakan kata urutan"], contoh: "Cara Membuat Es Teh Manis\nBahan: teh celup, gula, es batu, air panas.\n1. Masukkan teh ke gelas.\n2. Tuang air panas, diamkan 3 menit.\n3. Angkat teh, masukkan gula, aduk.\n4. Tambahkan es batu. Siap!" },
  kuis: makeSoal([
    ["'Jangan membuka tutup' termasuk...", ["Ajakan", "Larangan", "Perintah", "Saran"], 1, "'Jangan' = larangan."],
    ["Kata 'pertama-tama' menunjukkan...", ["Waktu", "Urutan", "Tempat", "Cara"], 1, "'Pertama-tama' = urutan."],
    ["Bagian 'Alat dan Bahan' berfungsi...", ["Menjelaskan cara", "Mendaftar kebutuhan", "Menutup", "Memberi saran"], 1, "Alat & bahan = daftar kebutuhan."],
    ["'Tuangkan sedikit demi sedikit' menunjukkan...", ["Waktu", "Cara", "Tempat", "Alat"], 1, "'Sedikit demi sedikit' = cara."],
    ["Bahasa prosedur harus...", ["Berbelit", "Jelas dan lugas", "Bermajas", "Puitis"], 1, "Prosedur = jelas, lugas, mudah diikuti."],
  ]),
})

// Teks Eksplanasi
add("Teks Eksplanasi", {
  belajar: { tujuan: ["Memahami teks eksplanasi", "Mengenal konjungsi kausal", "Menjelaskan fenomena"], materi: [
    { judul: "Pengertian", isi: ["Menjelaskan proses fenomena alam, sosial, budaya.", "Tujuan: menjawab mengapa dan bagaimana.", "Contoh: hujan asam, kemacetan, tradisi."], contoh: ["Alam: 'Proses Terjadinya Hujan'", "Sosial: 'Penyebab Kemacetan Jakarta'"] },
    { judul: "Struktur & Ciri", isi: ["1) Pernyataan umum: gambaran fenomena.", "2) Deretan penjelas: sebab-akibat.", "3) Interpretasi: simpulan.", "Konjungsi kausal (sebab, akibatnya), istilah ilmiah, kalimat pasif."], contoh: ["Kausal: 'Banjir karena hujan deras'", "Pasif: 'Air dialirkan melalui sungai'"] },
  ], rangkuman: ["Menjelaskan proses fenomena.", "Pernyataan umum-deretan penjelas-interpretasi.", "Konjungsi kausal, kalimat pasif."] },
  latihan: makeSoal([
    ["Eksplanasi menjelaskan...", ["Cara membuat", "Proses fenomena", "Objek", "Argumen"], 1, "Eksplanasi = menjelaskan proses fenomena."],
    ["'Gunung meletus karena tekanan magma' konjungsi...", ["Temporal", "Kausal", "Pertentangan", "Perbandingan"], 1, "'Karena' = konjungsi kausal."],
    ["Struktur eksplanasi...", ["Orientasi-urutan-reorientasi", "Umum-penjelas-interpretasi", "Tujuan-bahan-langkah", "Abstrak-krisis"], 1, "Eksplanasi: pernyataan umum, penjelas, interpretasi."],
    ["Contoh fenomena sosial...", ["Gempa", "Kemacetan", "Pelangi", "Fotosintesis"], 1, "Kemacetan = fenomena sosial."],
    ["Interpretasi berisi...", ["Proses", "Kesimpulan penulis", "Definisi", "Data"], 1, "Interpretasi = simpulan/kesimpulan."],
  ]),
  praktik: { petunjuk: "Tulis eksplanasi tentang 'Proses Terjadinya Hujan'! Struktur lengkap dengan konjungsi kausal.", tips: ["Definisi fenomena", "Sebab-akibat logis", "Istilah ilmiah"], contoh: "Pernyataan umum: Hujan adalah jatuhnya air dari atmosfer ke bumi.\nDeretan penjelas: Evaporasi (penguapan air laut oleh matahari) → kondensasi (uap jadi awan) → presipitasi (jatuh sebagai hujan).\nInterpretasi: Siklus hujan penting bagi kehidupan." },
  kuis: makeSoal([
    ["Konjungsi kausal...", ["Kemudian", "Akibatnya", "Lalu", "Setelah itu"], 1, "'Akibatnya' = kausal."],
    ["Perbedaan eksplanasi dan prosedur...", ["Eksplanasi 'mengapa', prosedur 'bagaimana'", "Eksplanasi singkat", "Prosedur ilmiah", "Sama"], 0, "Eksplanasi = alasan, prosedur = cara."],
    ["'Air dialirkan' termasuk...", ["Aktif", "Pasif", "Imperatif", "Interogatif"], 1, "Kalimat pasif: 'air dialirkan'."],
    ["Eksplanasi budaya bisa menjelaskan...", ["Cara menari", "Asal-usul tradisi", "Langkah memasak", "Cara buat kerajinan"], 1, "Eksplanasi budaya = asal-usul tradisi."],
    ["'Udara panas menguapkan air' kalimat...", ["Aktif", "Pasif", "Tanya", "Perintah"], 0, "Kalimat aktif: 'udara panas menguapkan'."],
  ]),
})

// Teks Argumentasi & Persuasi
add("Teks Argumentasi & Persuasi", {
  belajar: { tujuan: ["Memahami teks argumentasi", "Mengenal teks persuasi dan iklan", "Menyusun argumen logis"], materi: [
    { judul: "Argumentasi", isi: ["Meyakinkan pembaca dengan argumen logis dan bukti.", "Tujuan: memengaruhi pendapat/sikap.", "Topik: isu kontroversial/debatable.", "Struktur: tesis → argumen + bukti → penegasan ulang."], contoh: ["Tesis: 'UN perlu diadakan untuk menjaga standar pendidikan nasional.'", "Data: '80% guru setuju UN diadakan kembali (Survey Kemendikbud)'"] },
    { judul: "Persuasi dan Iklan", isi: ["Persuasi: membujuk pembaca melakukan sesuatu.", "Ciri: kalimat ajakan, imperatif, sugestif.", "Iklan komersial (jualan) vs nonkomersial (layanan masyarakat).", "Slogan: kata singkat mudah diingat.", "Poster: media visual dengan teks persuasif."], contoh: ["Ajakan: 'Ayo beli produk lokal!'", "Slogan: 'Bhinneka Tunggal Ika'", "Iklan nonkomersial: 'Buanglah sampah pada tempatnya'"] },
    { judul: "Kalimat Pengandaian", isi: ["Digunakan dalam argumentasi untuk menunjukkan akibat logis.", "Pola: 'Jika... maka...'", "'Seandainya... pasti...'", "'Andai kata... tentu...'"], contoh: ["'Jika UN dihapus, standar pendidikan antar daerah bisa berbeda jauh.'", "'Seandainya semua anak dapat pendidikan layak, masa depan bangsa lebih cerah.'"] },
  ], rangkuman: ["Argumentasi: meyakinkan dengan argumen + bukti.", "Persuasi: membujuk dengan ajakan.", "Iklan: media persuasi komersial/nonkomersial.", "Kalimat pengandaian: 'jika... maka...'"] },
  latihan: makeSoal([
    ["Tujuan argumentasi...", ["Menghibur", "Meyakinkan", "Menceritakan", "Menggambar"], 1, "Argumentasi = meyakinkan."],
    ["Tesis adalah...", ["Argumen pendukung", "Posisi/pendapat penulis", "Simpulan", "Data"], 1, "Tesis = posisi penulis."],
    ["'Ayo beli produk lokal!' termasuk...", ["Argumentasi", "Persuasi", "Narasi", "Deskripsi"], 1, "'Ayo' = ajakan persuasif."],
    ["Ciri slogan baik...", ["Panjang", "Mudah diingat", "Bertele-tele", "Bahasa asing"], 1, "Slogan efektif = singkat, mudah diingat."],
    ["'Jika... maka' termasuk...", ["Temporal", "Pengandaian", "Imperatif", "Majas"], 1, "'Jika... maka' = kalimat pengandaian."],
    ["Argumen kuat harus didukung...", ["Perasaan", "Data/fakta", "Tebakan", "Opini"], 1, "Argumen kuat = data/fakta."],
    ["Iklan nonkomersial bertujuan...", ["Jualan", "Edukasi masyarakat", "Promosi", "Iklan baris"], 1, "Iklan nonkomersial = edukasi/ajakan sosial."],
    ["'Dengan demikian' ada di bagian...", ["Tesis", "Argumen", "Penegasan ulang", "Isi"], 2, "'Dengan demikian' = penegasan ulang/kesimpulan."],
    ["Perbedaan argumentasi dan persuasi...", ["Sama saja", "Argumen logis+bukti, persuasi ajakan", "Argumen pendek", "Persuasi panjang"], 1, "Argumentasi = logis+bukti. Persuasi = ajakan."],
    ["'Oleh karena itu' menandai...", ["Tesis", "Argumen", "Simpulan/penegasan", "Pendahuluan"], 2, "'Oleh karena itu' = kesimpulan."],
  ]),
  praktik: { petunjuk: "Tulis argumentasi tentang 'Haruskah ponsel dilarang di sekolah?' dengan struktur: tesis → 3 argumen + bukti → penegasan ulang.", tips: ["Pilih posisi yang jelas (setuju/tidak)", "Setiap argumen punya alasan logis", "Gunakan data atau contoh nyata"], contoh: "Tesis: Ponsel sebaiknya diatur, bukan dilarang di sekolah.\nArgumen 1: Ponsel alat belajar (kamus, kalkulator, akses info).\nArgumen 2: Melarang ponsel tidak realistis di era digital.\nArgumen 3: Aturan pemakaian lebih efektif daripada larangan total.\nPenegasan: Maka dari itu, aturan jelas lebih baik daripada larangan total." },
  kuis: makeSoal([
    ["'Buanglah sampah pada tempatnya' termasuk...", ["Argumentasi", "Persuasi nonkomersial", "Narasi", "Eksplanasi"], 1, "Ajakan kebersihan = persuasi nonkomersial."],
    ["'Dapatkan', 'Rasakan', 'Nikmati' dalam iklan termasuk...", ["Kata kerja biasa", "Kata perintah/imperatif", "Kata sifat", "Kata tanya"], 1, "Kata perintah → membujuk bertindak."],
    ["Argumen baik bersifat...", ["Emosional", "Logis + bukti", "Subjektif", "Pendek"], 1, "Argumen = logis + bukti."],
    ["Poster baik memiliki...", ["Teks panjang", "Gambar dan teks seimbang", "Hanya gambar", "Warna gelap"], 1, "Poster = visual + teks seimbang."],
    ["'Seandainya semua sadar pendidikan' termasuk...", ["Tesis", "Argumen", "Pengandaian", "Kesimpulan"], 2, "'Seandainya' = pengandaian."],
  ]),
})

// ═══════════════════════════════════════════════════
// LEVEL 4: Kreatif & Publikasi
// ═══════════════════════════════════════════════════

add("Puisi & Pantun", {
  belajar: { tujuan: ["Memahami unsur pembangun puisi", "Mengenal jenis majas", "Menulis puisi dan pantun"],
    materi: [
      { judul: "Unsur Puisi", isi: ["Puisi: ungkapan perasaan melalui bahasa padat dan indah.", "Unsur fisik: diksi, imaji, kata konkret, rima, tipografi.", "Unsur batin: tema, perasaan, nada, amanat."], contoh: ["Imaji visual: 'Laut biru membentang luas'", "Imaji auditif: 'Gemuruh ombak berderai'"] },
      { judul: "Jenis Majas", isi: ["Metafora: perbandingan langsung tanpa kata pembanding. 'Kau matahariku.'", "Simile: perbandingan dengan kata bagai, laksana, seperti.", "Personifikasi: benda mati seolah hidup. 'Angin berbisik.'", "Hiperbola: berlebihan. 'Menunggu seribu tahun.'", "Repetisi: pengulangan untuk penekanan."], contoh: ["Metafora: 'Dia bintang kelas'", "Simile: 'Wajahmu bagai rembulan'", "Personifikasi: 'Daun melambai padaku'"] },
      { judul: "Pantun", isi: ["Pantun: puisi lama 4 baris, bersajak a-b-a-b.", "Baris 1-2: sampiran (pengantar), baris 3-4: isi.", "Setiap baris 8-12 suku kata.", "Jenis: pantun nasihat, jenaka, teka-teki, percintaan."], contoh: ["Pergi ke pasar membeli duku\nJangan lupa membeli salak\nSahabat sejati sejak kecil selalu\nSaling membantu tanpa pamrih walau berat"] },
    ], rangkuman: ["Puisi: ungkapan perasaan melalui bahasa indah.", "Majas: metafora, simile, personifikasi, hiperbola.", "Pantun: 4 baris a-b-a-b, sampiran dan isi."] },
  latihan: makeSoal([
    ["'Wajahmu laksana rembulan' majas...", ["Metafora", "Simile", "Personifikasi", "Hiperbola"], 1, "'Laksana' = kata pembanding simile."],
    ["Imaji auditif berkaitan dengan...", ["Penglihatan", "Pendengaran", "Penciuman", "Peraba"], 1, "Auditif = pendengaran."],
    ["'Menunggu dari subuh ke magrib' termasuk...", ["Metafora", "Simile", "Hiperbola", "Personifikasi"], 2, "Berlebihan = hiperbola."],
    ["Pantun bersajak...", ["a-a-a-a", "a-b-a-b", "a-b-b-a", "a-a-b-b"], 1, "Pantun = a-b-a-b."],
    ["Baris 1-2 pantun disebut...", ["Isi", "Sampiran", "Amanat", "Larik"], 1, "Baris 1-2 = sampiran, 3-4 = isi."],
  ]),
  praktik: { petunjuk: "Buat sebuah puisi 2 bait tema 'Cita-citaku' dan sebuah pantun tema 'Pendidikan'. Puisi gunakan minimal 2 majas, pantun perhatikan rima.", tips: ["Puisi: tentukan perasaan dulu", "Pantun: buat isi dulu, lalu sampiran yang rimanya cocok"], contoh: "Puisi:\nAku ingin terbang tinggi bagai elang\nMenembus awan mengejar bintang\nIlmu adalah jembatan menuju mimpi\nSetiap halaman yang kubaca\nAdalah sayap mengantarku pergi\n\nPantun:\nPergi ke ladang membawa pacul\nJangan lupa membawa benih\nRajin belajar setiap saat\nIlmu berguna di kemudian hari" },
  kuis: makeSoal([
    ["'Hidup adalah perjalanan' majas...", ["Simile", "Metafora", "Personifikasi", "Hiperbola"], 1, "Perbandingan langsung = metafora."],
    ["'Daun melambai padaku' majas...", ["Metafora", "Simile", "Personifikasi", "Hiperbola"], 2, "Daun seolah melambai = personifikasi."],
    ["Pilihan kata dalam puisi disebut...", ["Rima", "Diksi", "Imaji", "Tipografi"], 1, "Diksi = pilihan kata."],
    ["Tipografi berkaitan dengan...", ["Pilihan kata", "Bentuk/penataan baris", "Persajakan", "Tema"], 1, "Tipografi = tata wajah puisi."],
    ["Gurindam terdiri dari... baris", ["2", "3", "4", "5"], 0, "Gurindam = 2 baris per bait."],
  ]),
})

add("Cerita Pendek", {
  belajar: { tujuan: ["Memahami pengertian dan ciri cerpen", "Mengenal alur dan konflik dalam cerpen", "Menulis cerpen sederhana"],
    materi: [
      { judul: "Apa itu Cerpen?", isi: ["Cerpen (cerita pendek): prosa naratif fiktif yang selesai dibaca sekali duduk.", "Ciri: kurang dari 10.000 kata, fokus pada satu peristiwa, jumlah tokoh terbatas.", "Unsur intrinsik: tema, alur, tokoh, latar, sudut pandang, gaya bahasa, amanat."], contoh: ["Cerpen terkenal: 'Robohnya Surau Kami' (A.A. Navis)", "'Senyum Karyamin' (Ahmad Tohari)"] },
      { judul: "Alur dan Konflik", isi: ["Alur maju: cerita bergerak maju kronologis.", "Alur mundur (flashback): cerita kembali ke masa lalu.", "Alur campuran: maju dan mundur.", "Konflik: masalah dalam cerita (internal: batin tokoh, eksternal: antar tokoh, dengan alam, dengan masyarakat).", "Klimaks: puncak konflik, bagian paling menegangkan."], contoh: ["Alur maju: pengenalan → masalah → klimaks → penyelesaian", "Konflik internal: 'Dia bimbang antara kuliah atau bekerja.'"] },
    ], rangkuman: ["Cerpen: prosa fiktif sekali duduk.", "Unsur: tema, alur, tokoh, latar, sudut pandang.", "Alur: maju, mundur, campuran.", "Konflik: internal dan eksternal."] },
  latihan: makeSoal([
    ["Cerpen adalah...", ["Cerita panjang", "Prosa fiktif sekali duduk", "Puisi", "Drama"], 1, "Cerpen = cerita pendek sekali duduk."],
    ["'Bimbang memilih' termasuk konflik...", ["Internal", "Eksternal", "Alam", "Sosial"], 0, "Konflik batin = internal."],
    ["Bagian paling menegangkan disebut...", ["Orientasi", "Klimaks", "Resolusi", "Koda"], 1, "Klimaks = puncak konflik."],
    ["Alur flashback disebut juga...", ["Alur maju", "Alur mundur", "Alur campuran", "Alur datar"], 1, "Flashback = alur mundur."],
    ["Tokoh utama dalam cerpen disebut...", ["Protagonis", "Antagonis", "Tritagonis", "Figuran"], 0, "Protagonis = tokoh utama."],
  ]),
  praktik: { petunjuk: "Tulis cerpen pendek (3-5 paragraf) tentang 'Persahabatan'. Gunakan alur maju, konflik sederhana, dan amanat.", tips: ["Tentukan tokoh dan konflik dulu", "Gunakan dialog", "Akhiri dengan amanat"], contoh: "Rina dan Dita sahabat sejak SD. Suatu hari, Dita dapat beasiswa dan pindah ke kota lain.\nAwalnya mereka masih rajin berkirim surat. Tapi lama-lama jarang. Rina sedih.\nSaat liburan, Dita pulang. Mereka bertemu lagi. Ternyata persahabatan sejati tak lekang jarak.\nAmanat: Sahabat sejati tetap dekat walau terpisah jarak." },
  kuis: makeSoal([
    ["Cerpen fokus pada...", ["Banyak peristiwa", "Satu peristiwa utama", "Sepanjang hidup tokoh", "Sejarah panjang"], 1, "Cerpen fokus satu peristiwa."],
    ["'Dia berteriak melawan ombak' konflik...", ["Internal", "Eksternal (alam)", "Sosial", "Batin"], 1, "Melawan alam = eksternal."],
    ["Resolusi adalah...", ["Puncak konflik", "Penyelesaian masalah", "Pengenalan tokoh", "Penutup"], 1, "Resolusi = penyelesaian."],
    ["Pengenalan tokoh ada di bagian...", ["Orientasi", "Komplikasi", "Klimaks", "Koda"], 0, "Orientasi = pengenalan awal."],
    ["Sudut pandang 'aku' = ...", ["Orang ketiga", "Orang pertama", "Serba tahu", "Orang kedua"], 1, "'Aku' = orang pertama."],
  ]),
})

add("Artikel Populer", {
  belajar: { tujuan: ["Memahami struktur artikel populer", "Membedakan fakta dan opini dalam artikel", "Menulis artikel populer"],
    materi: [
      { judul: "Apa itu Artikel Populer?", isi: ["Artikel populer: informasi ilmiah dengan bahasa mudah dipahami masyarakat.", "Dimuat di majalah, koran, blog, media online.", "Berbeda dengan jurnal ilmiah: lebih santai, tetap faktual.", "Topik: kesehatan, pendidikan, teknologi, gaya hidup."], contoh: ["Judul: 'Manfaat Daun Kelor untuk Kesehatan'", "Judul: 'Tips Belajar Efektif di Era Digital'"] },
      { judul: "Struktur & Gaya Penulisan", isi: ["1) Judul menarik (menimbulkan rasa ingin tahu).", "2) Lead: paragraf pembuka yang memikat.", "3) Isi: fakta + penjelasan + contoh + analogi.", "4) Penutup: kesimpulan dan ajakan.", "Gaya: bahasa populer, analogi untuk memudahkan, data pendukung.", "Bedakan fakta (data terbukti) dan opini (pendapat penulis)."], contoh: ["Lead: 'Tahukah kamu, membaca 30 menit sehari bisa meningkatkan fokus hingga 30%?'", "Analogi: 'Membaca itu seperti gym untuk otak — semakin sering dilatih, semakin kuat.'"] },
    ], rangkuman: ["Informasi ilmiah bahasa populer.", "Judul → lead → isi (fakta+analogi) → penutup.", "Fakta vs opini.", "Analogi memudahkan pemahaman."] },
  latihan: makeSoal([
    ["Perbedaan artikel populer dan jurnal...", ["Panjang", "Bahasa (populer vs ilmiah)", "Kebenaran", "Penulis"], 1, "Artikel populer = bahasa mudah dipahami."],
    ["Yang termasuk fakta dalam artikel...", ["Saya pikir", "Data Kemkes: stunting turun 3%", "Menurut saya", "Mungkin"], 1, "Fakta = data/sumber jelas."],
    ["Fungsi lead...", ["Menutup artikel", "Menarik perhatian pembaca", "Simpulan", "Saran"], 1, "Lead = paragraf pembuka memikat."],
    ["Analogi berfungsi...", ["Memperpanjang", "Memudahkan pemahaman", "Ilmiah", "Menambah kata"], 1, "Analogi = perbandingan memudahkan."],
    ["Penutup artikel berisi...", ["Fakta baru", "Kesimpulan + ajakan", "Data", "Abstrak"], 1, "Penutup = simpulan dan ajakan."],
  ]),
  praktik: { petunjuk: "Tulis artikel populer 3-4 paragraf tentang 'Manfaat Membaca' atau 'Pentingnya Bahasa Indonesia'. Sertakan data riset dan analogi!", tips: ["Judul menarik (menggugah rasa ingin tahu)", "Lead dengan pertanyaan/fakta mengejutkan", "Sertakan 1 data riset", "Gunakan analogi"], contoh: "Judul: 'Sejenak Membaca, Seumur Hidup Berilmu'\nLead: Tahukah kamu, penelitian Stanford menunjukkan bahwa membaca 30 menit sehari dapat meningkatkan fokus hingga 30%?\nIsi: Membaca seperti gym untuk otak. Semakin sering dilatih, semakin kuat. Selain menambah wawasan, membaca juga melatih empati dan berpikir kritis.\nPenutup: Jadi, jangan ragu luangkan waktu membaca setiap hari. Mulai dari 10 menit!" },
  kuis: makeSoal([
    ["'Data BPS: 75% penduduk pakai ponsel' termasuk...", ["Opini", "Fakta", "Hipotesis", "Asumsi"], 1, "Data BPS = fakta."],
    ["Bahasa artikel populer...", ["Rumit", "Mudah dipahami", "Istilah asing berat", "Bertele-tele"], 1, "Populer = mudah dipahami."],
    ["Struktur artikel...", ["Abstrak-metode-hasil", "Judul-lead-isi-penutup", "Tujuan-bahan-langkah", "Pernyataan-argumen"], 1, "Artikel: judul, lead, isi, penutup."],
    ["Ciri khas artikel populer...", ["Data pendukung", "Bahasa mudah + analogi", "Ilmiah berat", "Tidak terstruktur"], 1, "Populer = bahasa mudah + analogi."],
    ["Yang BUKAN ciri artikel populer...", ["Data pendukung", "Bahasa ilmiah rumit", "Analogi", "Fakta"], 1, "Artikel populer = bahasa sederhana."],
  ]),
})

add("Pidato & Presentasi", {
  belajar: { tujuan: ["Memahami struktur pidato", "Teknik bicara di depan umum", "Menyusun naskah pidato dan presentasi"],
    materi: [
      { judul: "Dasar-dasar Pidato", isi: ["Pidato: penyampaian gagasan secara lisan di depan umum.", "Tujuan: informatif (memberi info), persuasif (membujuk), rekreatif (menghibur).", "Pidato baik: jelas, terstruktur, sesuai audiens."], contoh: ["Informatif: 'Pentingnya Menjaga Kebersihan'", "Persuasif: 'Ayo Cintai Produk Indonesia'"] },
      { judul: "Struktur Pidato", isi: ["1) Salam pembuka (Assalamualaikum, Selamat pagi).", "2) Pendahuluan: ucapan syukur, sapaan hormat.", "3) Isi: inti pidato (sistematis, 3-5 poin utama).", "4) Penutup: simpulan, harapan, permohonan maaf.", "5) Salam penutup.", "Tips: intonasi, kontak mata, gestur, kecepatan bicara."], contoh: ["Pembuka: 'Assalamualaikum, Selamat pagi Bapak/Ibu guru dan teman-teman.'", "Penutup: 'Demikian pidato saya. Mohon maaf atas kekurangan. Wassalamualaikum.'"] },
    ], rangkuman: ["Pidato: penyampaian gagasan lisan.", "Struktur: salam, pendahuluan, isi, penutup, salam.", "Tips: intonasi, kontak mata, gestur."] },
  latihan: makeSoal([
    ["Tujuan persuasif berarti...", ["Memberi info", "Membujuk", "Menghibur", "Melapor"], 1, "Persuasif = membujuk."],
    ["Inti pidato ada di bagian...", ["Salam", "Pendahuluan", "Isi", "Penutup"], 2, "Isi = inti pidato."],
    ["Bukan teknik bicara baik...", ["Kontak mata", "Monoton", "Gestur", "Kecepatan tepat"], 1, "Monoton = tidak baik."],
    ["'Hadirin yang saya hormati' bagian...", ["Salam", "Sapaan hormat", "Isi", "Penutup"], 1, "Sapaan hormat = pendahuluan."],
    ["Pidato cerita lucu bertujuan...", ["Informatif", "Persuasif", "Rekreatif", "Edukatif"], 2, "Rekreatif = menghibur."],
  ]),
  praktik: { petunjuk: "Tulis naskah pidato singkat (3-5 paragraf) dengan tema 'Pentingnya Bahasa Indonesia di Era Global'. Gunakan struktur lengkap!", tips: ["Salam pembuka", "Sapaan hormat", "3 poin utama di isi", "Ajakan di penutup", "Salam penutup"], contoh: "Assalamualaikum warahmatullahi wabarakatuh.\n\nSelamat pagi Bapak/Ibu guru dan teman-teman yang saya banggakan.\n\nMarilah kita panjatkan puji syukur karena kita masih diberi kesempatan berkumpul hari ini.\n\nTeman-teman, Bahasa Indonesia adalah identitas kita. Di era global ini, kita harus bangga berbahasa Indonesia. Pertama, kuasai bahasa Indonesia yang baik dan benar. Kedua, gunakan di setiap kesempatan. Ketiga, jangan malu belajar bahasa asing, tapi jangan tinggalkan bahasa ibu.\n\nMari kita buktikan bahwa pemuda Indonesia cerdas dan bangga berbahasa Indonesia!\n\nMohon maaf atas kekurangan. Wassalamualaikum warahmatullahi wabarakatuh." },
  kuis: makeSoal([
    ["Intonasi tepat berarti...", ["Bicara cepat", "Naik turun nada sesuai konteks", "Suara keras terus", "Suara pelan terus"], 1, "Intonasi = naik turun suara."],
    ["Penutup pidato yang tepat...", ["Sekian dulu", "Mohon maaf atas kekurangan", "Selesai", "Terima kasih, bubar"], 1, "Penutup sopan = mohon maaf."],
    ["'Pertama, kedua, ketiga' menunjukkan...", ["Tidak terstruktur", "Sistematis/teratur", "Monoton", "Tidak jelas"], 1, "Sistematis = urutan jelas."],
    ["Sikap baik saat pidato...", ["Baca terus teks", "Percaya diri dan santai", "Lihat ke atas", "Kaku"], 1, "Percaya diri dan santai."],
    ["Pidato informatif bertujuan...", ["Menghibur", "Memberi pengetahuan", "Membujuk", "Mengkritik"], 1, "Informatif = memberi pengetahuan."],
  ]),
})

add("Resensi & Tanggapan Kritis", {
  belajar: { tujuan: ["Memahami struktur resensi", "Memberi tanggapan kritis terhadap karya", "Menulis resensi buku/film"],
    materi: [
      { judul: "Apa itu Resensi?", isi: ["Resensi: ulasan/penilaian terhadap karya (buku, film, lagu).", "Tujuan: memberi gambaran, menilai kualitas, merekomendasikan.", "Bersifat objektif dengan alasan logis.", "Perbedaan: resensi formal (media) vs ulasan santai (blog/sosmed)."] },
      { judul: "Struktur Resensi", isi: ["1) Identitas: judul, penulis, penerbit, tahun.", "2) Sinopsis: ringkasan isi (tanpa spoiler berlebihan).", "3) Analisis: kelebihan dan kekurangan.", "4) Penutup: kesimpulan dan rekomendasi.", "Bahasa: objektif, santun, disertai alasan."], contoh: ["Identitas: 'Laskar Pelangi' — Andrea Hirata — Bentang Pustaka — 2005", "Analisis: 'Kelebihan: bahasa indah, inspiratif. Kekurangan: beberapa bagian terlalu panjang.'"] },
      { judul: "Unsur Intrinsik", isi: ["Tema: ide pokok cerita.", "Alur: urutan peristiwa (maju, mundur, campuran).", "Tokoh dan penokohan: karakter dan watak.", "Latar: tempat, waktu, suasana.", "Sudut pandang: cara pengarang menceritakan.", "Gaya bahasa: majas, diksi.", "Amanat: pesan yang ingin disampaikan."], contoh: ["Tema: 'Perjuangan pendidikan di Belitung'", "Tokoh: Ikal (cerdas, pantang menyerah)", "Latar: Belitung 1970-an", "Amanat: 'Pendidikan mengubah nasib'"] },
    ], rangkuman: ["Resensi = ulasan kritis terhadap karya.", "Struktur: identitas, sinopsis, analisis, penutup.", "Unsur intrinsik: tema, alur, tokoh, latar, sudut pandang, amanat.", "Tanggapan objektif dengan alasan logis."] },
  latihan: makeSoal([
    ["Resensi adalah...", ["Ringkasan", "Ulasan kritis", "Daftar isi", "Sinopsis"], 1, "Resensi = ulasan + penilaian."],
    ["Identitas karya berisi...", ["Sinopsis", "Data buku (judul, penulis, penerbit)", "Analisis", "Kesimpulan"], 1, "Identitas = data buku."],
    ["'Alurnya menegangkan' termasuk...", ["Sinopsis", "Analisis", "Identitas", "Penutup"], 1, "Analisis = penilaian."],
    ["Unsur intrinsik utama...", ["Sampul, harga, tebal", "Tema, alur, tokoh, latar", "Pengarang, penerbit", "Resensi, sinopsis"], 1, "Intrinsik = dalam cerita."],
    ["Resensi baik bersifat...", ["Subjektif", "Objektif + alasan logis", "Emosional", "Berlebihan"], 1, "Resensi = objektif dan logis."],
  ]),
  praktik: { petunjuk: "Tulis resensi singkat buku/novel/film favoritmu! Sertakan: identitas, sinopsis, 2 kelebihan + 1 kekurangan, rekomendasi.", tips: ["Jangan spoiler akhir cerita", "Alasan spesifik (bukan 'bagus' saja)", "2 kelebihan, 1 saran"], contoh: "Identitas:\nJudul: Negeri 5 Menara\nPenulis: A. Fuadi\nPenerbit: Gramedia (2009)\n\nSinopsis: Enam santri dari berbagai daerah bertemu di Pondok Madani. Mereka bertekad meraih mimpi.\n\nKelebihan: Bahasa mengalir dan inspiratif. Karakter masing-masing santri unik.\nKekurangan: Beberapa bagian terasa panjang.\n\nRekomendasi: Sangat layak dibaca remaja yang butuh motivasi." },
  kuis: makeSoal([
    ["'Tema persahabatan, alur maju' termasuk...", ["Identitas", "Sinopsis", "Analisis unsur", "Penutup"], 2, "Analisis unsur intrinsik."],
    ["Sinopsis berfungsi...", ["Menilai", "Gambaran isi tanpa spoiler", "Harga", "Kritik"], 1, "Sinopsis = gambaran isi."],
    ["Denotasi adalah makna...", ["Kiasan", "Sebenarnya", "Ganda", "Kiasan tetap"], 1, "Denotasi = makna sebenarnya."],
    ["'Rumah' konotasi berarti...", ["Bangunan", "Keluarga/kehangatan", "Tempat tinggal", "Tembok"], 1, "Konotasi 'rumah' = keluarga."],
    ["Penilaian 'novel ini inspiratif' termasuk...", ["Sinopsis", "Analisis/opini", "Identitas", "Sampul"], 1, "Penilaian = analisis."],
  ]),
})

// ═══════════════════════════════════════════════════
// LEVEL DEFINITIONS
// ═══════════════════════════════════════════════════

const levels = [
  {
    level: 1, title: "Dasar", subtitle: "Mulai dari sini — kuasai EYD, kata baku, dan diksi",
    description: "Pelajari fondasi bahasa Indonesia: ejaan yang benar, tanda baca, kata baku, imbuhan, dan pilihan kata yang tepat.",
    color: "from-emerald-500 to-teal-600", emoji: "🌱", order: 1, xpReward: 1500, coinReward: 350,
    units: [
      { title: "Ejaan yang Disempurnakan (EYD)", subtitle: "Pedoman ejaan resmi bahasa Indonesia", emoji: "📖", order: 1, topik: "EYD" },
      { title: "Huruf Kapital & Tanda Baca", subtitle: "Penggunaan huruf kapital dan tanda baca", emoji: "✏️", order: 2, topik: "TANDA_BACA" },
      { title: "Kata Baku & Kalimat Efektif", subtitle: "Membedakan kata baku dan menyusun kalimat efektif", emoji: "📝", order: 3, topik: "BAKU" },
      { title: "Imbuhan & Bentukan Kata", subtitle: "Prefiks, sufiks, konfiks, dan maknanya", emoji: "🔤", order: 4, topik: "IMBUHAN" },
      { title: "Diksi & Makna Kata", subtitle: "Pilihan kata, denotasi, konotasi, sinonim, antonim", emoji: "💬", order: 5, topik: "DIKSI" },
    ],
  },
  {
    level: 2, title: "Lanjut", subtitle: "Susun kalimat dan paragraf yang padu",
    description: "Pelajari kalimat tunggal dan majemuk, paragraf deduktif-induktif, kohesi, dan bedakan fakta vs opini.",
    color: "from-blue-500 to-indigo-600", emoji: "📐", order: 2, xpReward: 1800, coinReward: 400,
    units: [
      { title: "Kalimat Tunggal & Majemuk", subtitle: "Struktur kalimat dan konjungsi setara/bertingkat", emoji: "📐", order: 1, topik: "KALIMAT" },
      { title: "Paragraf & Gagasan Utama", subtitle: "Paragraf deduktif, induktif, dan campuran", emoji: "📄", order: 2, topik: "PARAGRAF" },
      { title: "Kohesi & Koherensi", subtitle: "Kepaduan bentuk dan makna antarkalimat", emoji: "🔗", order: 3, topik: "KOHESI" },
      { title: "Fakta, Opini, Asumsi", subtitle: "Membedakan dan mengidentifikasi dalam teks", emoji: "🔍", order: 4, topik: "FAKTA" },
      { title: "Menyusun Paragraf", subtitle: "Praktik menulis paragraf dengan berbagai pola", emoji: "✍️", order: 5, topik: "MENYUSUN" },
    ],
  },
  {
    level: 3, title: "Teks", subtitle: "Kuasai berbagai jenis teks tulisan",
    description: "Pelajari teks deskripsi, narasi, prosedur, eksplanasi, dan argumentasi — lengkap dengan ciri dan strukturnya.",
    color: "from-purple-500 to-pink-600", emoji: "📚", order: 3, xpReward: 2000, coinReward: 450,
    units: [
      { title: "Teks Deskripsi", subtitle: "Menggambarkan objek secara detail", emoji: "🖼️", order: 1, topik: "DESKRIPSI" },
      { title: "Teks Narasi & Cerita", subtitle: "Menceritakan peristiwa dan kisah", emoji: "📖", order: 2, topik: "NARASI" },
      { title: "Teks Prosedur", subtitle: "Langkah-langkah melakukan sesuatu", emoji: "📋", order: 3, topik: "PROSEDUR" },
      { title: "Teks Eksplanasi", subtitle: "Menjelaskan proses fenomena", emoji: "🔬", order: 4, topik: "EKSPLANASI" },
      { title: "Teks Argumentasi & Persuasi", subtitle: "Meyakinkan dan membujuk pembaca", emoji: "💪", order: 5, topik: "ARGUMENTASI" },
    ],
  },
  {
    level: 4, title: "Kreatif", subtitle: "Hasilkan karya tulis dan publikasi",
    description: "Kreasikan kemampuanmu: menulis puisi, pantun, cerpen, artikel populer, pidato, dan resensi.",
    color: "from-amber-500 to-orange-600", emoji: "🏆", order: 4, xpReward: 2500, coinReward: 500,
    units: [
      { title: "Puisi & Pantun", subtitle: "Majas, diksi puitis, dan puisi lama", emoji: "🌟", order: 1, topik: "PUISI" },
      { title: "Cerita Pendek", subtitle: "Menulis cerpen dengan alur dan konflik", emoji: "✍️", order: 2, topik: "CERPEN" },
      { title: "Artikel Populer", subtitle: "Menulis artikel informatif dan menarik", emoji: "📰", order: 3, topik: "ARTIKEL" },
      { title: "Pidato & Presentasi", subtitle: "Teknik bicara di depan umum", emoji: "🎤", order: 4, topik: "PIDATO" },
      { title: "Resensi & Tanggapan", subtitle: "Mengulas dan menanggapi karya secara kritis", emoji: "📝", order: 5, topik: "RESENSI" },
    ],
  },
]

async function seed() {
  console.log("🧹 Membersihkan data lama...")
  await db.userUnitProgress.deleteMany({})
  await db.learningUnit.deleteMany({})
  await db.learningLevel.deleteMany({})
  console.log("✅ Data lama dibersihkan")

  for (const lvl of levels) {
    const { units: unitData, ...levelData } = lvl
    const created = await db.learningLevel.create({ data: levelData })
    console.log(`✅ Level: ${created.title} (${created.subtitle})`)

    for (const u of unitData) {
      const c = data[u.title]
      await db.learningUnit.create({
        data: {
          ...u,
          levelId: created.id,
          xpReward: 60,
          coinReward: 15,
          content: c ? JSON.stringify(c) : null,
          isActive: true,
        },
      })
      console.log(`  ✅ Unit: ${u.title} ${c ? "(dengan konten)" : "(placeholder)"}`)
    }
  }

  console.log("\n🎉 Seeding selesai! 20 unit baru dengan topik EYD → Kalimat → Teks → Kreatif.")
}

seed().catch(e => { console.error(e); process.exit(1) })
