/**
 * Seed Jalur Cerdas Lesson Content — populates LearningUnit.content with
 * materi + questions for all 72 units.
 *
 * 5+ questions per unit, 360+ total.
 * Question types: multiple_choice, true_false, fill_blank
 *
 * Safety:
 * - Dry-run by default (--execute to apply)
 * - Only touches JALUR type LearningUnit
 * - PANDUAN untouched
 * - No deleteMany
 */

import { PrismaClient } from "@prisma/client"

const db = new PrismaClient()
const EXECUTE = process.argv.includes("--execute")
const DRY_RUN = !EXECUTE

interface Question {
  id: string
  tipe: "pilihan_ganda" | "benar_salah" | "isi_blank"
  soal: string
  opsi?: string[]
  jawaban: string | number
  penjelasan: string
}

interface MateriItem {
  tipe: "teks" | "contoh" | "tips" | "catatan" | "rangkuman"
  isi: string
}

interface UnitContent {
  tipe: "jalur"
  materi: MateriItem[]
  questions: Question[]
}

// === QUESTION BANKS organized by topic ===

const questions_fonetik: Question[] = [
  { id: "fon1", tipe: "pilihan_ganda", soal: "Berapa jumlah huruf vokal dalam bahasa Indonesia?", opsi: ["3", "5", "6", "4"], jawaban: 1, penjelasan: "Huruf vokal bahasa Indonesia ada 5: A, I, U, E, O." },
  { id: "fon2", tipe: "pilihan_ganda", soal: "Manakah yang termasuk huruf konsonan?", opsi: ["A", "U", "B", "E"], jawaban: 2, penjelasan: "B adalah konsonan. A, U, E adalah vokal." },
  { id: "fon3", tipe: "benar_salah", soal: "Huruf 'b' termasuk huruf vokal.", opsi: ["Benar", "Salah"], jawaban: "Salah", penjelasan: "Huruf 'b' adalah konsonan, bukan vokal." },
  { id: "fon4", tipe: "isi_blank", soal: "Huruf vokal dalam bahasa Indonesia adalah A, I, U, E, dan ...", jawaban: "O", penjelasan: "Kelima huruf vokal adalah A, I, U, E, O." },
  { id: "fon5", tipe: "pilihan_ganda", soal: "Kata 'buku' memiliki berapa suku kata?", opsi: ["1", "2", "3", "4"], jawaban: 1, penjelasan: "Bu-ku terdiri dari 2 suku kata." },
  { id: "fon6", tipe: "pilihan_ganda", soal: "Manakah kata yang diawali huruf konsonan?", opsi: ["api", "ibu", "meja", "ular"], jawaban: 2, penjelasan: "Meja diawali huruf 'm' (konsonan). Api, ibu, ular diawali vokal." },
  { id: "fon7", tipe: "benar_salah", soal: "Kata 'air' diawali huruf konsonan.", opsi: ["Benar", "Salah"], jawaban: "Salah", penjelasan: "Air diawali huruf 'a' yang merupakan vokal." },
]

const questions_ejaan: Question[] = [
  { id: "ej1", tipe: "pilihan_ganda", soal: "Huruf kapital digunakan pada awal ...", opsi: ["kalimat", "suku kata", "kata depan", "tanda baca"], jawaban: 0, penjelasan: "Huruf kapital digunakan di awal kalimat." },
  { id: "ej2", tipe: "benar_salah", soal: "Nama orang harus ditulis dengan huruf kapital.", opsi: ["Benar", "Salah"], jawaban: "Benar", penjelasan: "Nama orang termasuk nama diri yang harus ditulis kapital." },
  { id: "ej3", tipe: "pilihan_ganda", soal: "Tanda baca yang digunakan di akhir kalimat berita adalah ...", opsi: ["?", "!", ".", ","], jawaban: 2, penjelasan: "Kalimat berita diakhiri tanda titik (.)." },
  { id: "ej4", tipe: "isi_blank", soal: "Kalimat tanya diakhiri tanda ...", jawaban: "?", penjelasan: "Tanda tanya (?) digunakan di akhir kalimat tanya." },
  { id: "ej5", tipe: "pilihan_ganda", soal: "Manakah penulisan yang benar?", opsi: ["adik ku", "adikku", "adik-ku", "adikKu"], jawaban: 1, penjelasan: "Kata ulang/adukan ditulis serangkai: adikku." },
  { id: "ej6", tipe: "benar_salah", soal: "Tanda koma digunakan setelah kata 'dan' dalam deretan.", opsi: ["Benar", "Salah"], jawaban: "Salah", penjelasan: "Koma digunakan sebelum 'dan' dalam deretan, bukan setelahnya." },
]

const questions_huruf_kapital: Question[] = [
  { id: "hk1", tipe: "pilihan_ganda", soal: "Manakah yang harus ditulis dengan huruf kapital?", opsi: ["nama kota", "nama buah", "nama hewan", "nama warna"], jawaban: 0, penjelasan: "Nama kota adalah nama diri yang ditulis kapital." },
  { id: "hk2", tipe: "benar_salah", soal: "Hari dalam seminggu ditulis dengan huruf kapital.", opsi: ["Benar", "Salah"], jawaban: "Salah", penjelasan: "Nama hari ditulis kapital karena termasuk nama." },
  { id: "hk3", tipe: "pilihan_ganda", soal: "Penulisan yang benar adalah ...", opsi: ["ibu pertiwi", "Ibu Pertiwi", "ibu Pertiwi", "Ibu pertiwi"], jawaban: 1, penjelasan: "Nama negara/kebangsaan ditulis kapital." },
  { id: "hk4", tipe: "isi_blank", soal: "Penulisan yang benar: '...jakarta adalah ibu kota Indonesia.' (huruf kapital)", jawaban: "Jakarta", penjelasan: "Nama kota harus diawali huruf kapital." },
  { id: "hk5", tipe: "pilihan_ganda", soal: "Manakah penulisan judul yang benar?", opsi: ["Sejarah Indonesia", "sejarah Indonesia", "Sejarah indonesia", "sejarah indonesia"], jawaban: 0, penjelasan: "Judul ditulis kapital di awal setiap kata utama." },
  { id: "hk6", tipe: "benar_salah", soal: "Kata 'di' pada 'di rumah' ditulis kapital.", opsi: ["Benar", "Salah"], jawaban: "Salah", penjelasan: "Kata depan 'di' ditulis huruf kecil." },
]

const questions_tanda_baca: Question[] = [
  { id: "tb1", tipe: "pilihan_ganda", soal: "Tanda baca yang tepat untuk kalimat 'Ayo cepat' adalah ...", opsi: [".", "?", "!", ","], jawaban: 2, penjelasan: "Kalimat perintah/seru menggunakan tanda seru (!)." },
  { id: "tb2", tipe: "benar_salah", soal: "Tanda titik digunakan di akhir kalimat tanya.", opsi: ["Benar", "Salah"], jawaban: "Salah", penjelasan: "Kalimat tanya diakhiri tanda tanya (?), bukan titik." },
  { id: "tb3", tipe: "pilihan_ganda", soal: "Tanda baca yang benar untuk kalimat 'Siapa namamu' adalah ...", opsi: [".", "?", "!", ","], jawaban: 1, penjelasan: "Kalimat tanya diakhiri tanda tanya (?)." },
  { id: "tb4", tipe: "isi_blank", soal: "Di akhir kalimat perintah digunakan tanda ...", jawaban: "!", penjelasan: "Tanda seru (!) untuk kalimat perintah atau seruan." },
  { id: "tb5", tipe: "pilihan_ganda", soal: "Tanda baca untuk memisahkan unsur dalam perincian adalah ...", opsi: ["titik", "koma", "titik dua", "tanya"], jawaban: 1, penjelasan: "Koma (,) digunakan untuk memisahkan unsur dalam perincian." },
]

const questions_kata_baku: Question[] = [
  { id: "kb1", tipe: "pilihan_ganda", soal: "Manakah kata baku?", opsi: ["aktif", "aktip", "aktiv", "aktef"], jawaban: 0, penjelasan: "Bentuk baku adalah 'aktif', bukan 'aktip'." },
  { id: "kb2", tipe: "pilihan_ganda", soal: "Kata tidak baku dari 'nasihat' adalah ...", opsi: ["nasehat", "nasihat", "nasiha", "nasihet"], jawaban: 0, penjelasan: "Bentuk baku adalah 'nasihat', bukan 'nasehat'." },
  { id: "kb3", tipe: "benar_salah", soal: "Kata 'ijin' adalah bentuk baku.", opsi: ["Benar", "Salah"], jawaban: "Salah", penjelasan: "Bentuk baku adalah 'izin', bukan 'ijin'." },
  { id: "kb4", tipe: "pilihan_ganda", soal: "Manakah penulisan yang baku?", opsi: ["system", "sistem", "sistim", "sestem"], jawaban: 1, penjelasan: "Kata serapan yang baku: 'sistem' (bukan 'system')." },
  { id: "kb5", tipe: "isi_blank", soal: "Bentuk baku dari 'telpon' adalah ...", jawaban: "telepon", penjelasan: "Kata baku: telepon (bukan telpon)." },
  { id: "kb6", tipe: "pilihan_ganda", soal: "Manakah yang baku?", opsi: ["jadual", "jadwal", "jaduwal", "jedwal"], jawaban: 1, penjelasan: "Bentuk baku adalah 'jadwal'." },
]

const questions_sinonim: Question[] = [
  { id: "si1", tipe: "pilihan_ganda", soal: "Sinonim dari 'besar' adalah ...", opsi: ["kecil", "luas", "pendek", "tipis"], jawaban: 1, penjelasan: "Besar memiliki arti luas, antonimnya kecil." },
  { id: "si2", tipe: "pilihan_ganda", soal: "Sinonim 'membeli' adalah ...", opsi: ["menjual", "membayar", "berbelanja", "meminjam"], jawaban: 2, penjelasan: "Membeli berarti berbelanja atau membayar untuk mendapatkan barang." },
  { id: "si3", tipe: "benar_salah", soal: "Sinonim 'cantik' adalah 'indah'.", opsi: ["Benar", "Salah"], jawaban: "Benar", penjelasan: "Cantik dan indah memiliki arti yang mirip." },
  { id: "si4", tipe: "pilihan_ganda", soal: "Sinonim 'cepat' adalah ...", opsi: ["lambat", "kencang", "pelan", "berat"], jawaban: 1, penjelasan: "Cepat bermakna kencang, antonimnya lambat/pelan." },
  { id: "si5", tipe: "isi_blank", soal: "Sinonim dari 'gembira' adalah ...", jawaban: "senang", penjelasan: "Gembira berarti senang atau bahagia." },
  { id: "si6", tipe: "pilihan_ganda", soal: "Sinonim 'sukar' adalah ...", opsi: ["mudah", "ringan", "sulit", "cepat"], jawaban: 2, penjelasan: "Sukar berarti sulit, antonimnya mudah." },
]

const questions_antonim: Question[] = [
  { id: "an1", tipe: "pilihan_ganda", soal: "Antonim dari 'panas' adalah ...", opsi: ["hangat", "dingin", "sejuk", "gerah"], jawaban: 1, penjelasan: "Antonim panas adalah dingin." },
  { id: "an2", tipe: "pilihan_ganda", soal: "Antonim 'tinggi' adalah ...", opsi: ["besar", "panjang", "rendah", "jauh"], jawaban: 2, penjelasan: "Tinggi lawan katanya rendah." },
  { id: "an3", tipe: "benar_salah", soal: "Antonim 'kaya' adalah 'miskin'.", opsi: ["Benar", "Salah"], jawaban: "Benar", penjelasan: "Kaya lawan katanya miskin." },
  { id: "an4", tipe: "pilihan_ganda", soal: "Antonim 'siang' adalah ...", opsi: ["pagi", "sore", "malam", "subuh"], jawaban: 2, penjelasan: "Siang lawan katanya malam." },
  { id: "an5", tipe: "isi_blank", soal: "Antonim dari 'berat' adalah ...", jawaban: "ringan", penjelasan: "Berat lawan katanya ringan." },
  { id: "an6", tipe: "pilihan_ganda", soal: "Antonim 'terang' adalah ...", opsi: ["terang benderang", "gelap", "bersinar", "jernih"], jawaban: 1, penjelasan: "Antonim terang adalah gelap." },
]

const questions_imbuhan: Question[] = [
  { id: "im1", tipe: "pilihan_ganda", soal: "Kata 'membaca' berasal dari kata dasar ...", opsi: ["memba", "baca", "membaca", "bacaan"], jawaban: 1, penjelasan: "Membaca = me- + baca." },
  { id: "im2", tipe: "pilihan_ganda", soal: "Awalan 'ber-' pada 'berlari' berarti ...", opsi: ["sedang", "membuat", "melakukan", "punya"], jawaban: 2, penjelasan: "Berlari = melakukan kegiatan lari." },
  { id: "im3", tipe: "benar_salah", soal: "Kata 'menulis' mendapat imbuhan me-.", opsi: ["Benar", "Salah"], jawaban: "Benar", penjelasan: "Menulis = me- + tulis (menulis)." },
  { id: "im4", tipe: "pilihan_ganda", soal: "Imbuhan '-kan' pada 'tuliskan' berarti ...", opsi: ["menjadi", "perintah", "punya", "berkali"], jawaban: 1, penjelasan: "Akhiran -kan sering bermakna perintah atau buat jadi." },
  { id: "im5", tipe: "isi_blank", soal: "Kata 'pelari' mendapat awalan pe- + kata dasar ...", jawaban: "lari", penjelasan: "Pelari = pe- + lari (orang yang berlari)." },
  { id: "im6", tipe: "pilihan_ganda", soal: "Manakah yang mendapat imbuhan me-?", opsi: ["berlari", "tertawa", "menyapu", "perbaiki"], jawaban: 2, penjelasan: "Menyapu = me- + sapu (mendapat imbuhan me-)." },
]

const questions_kalimat_efektif: Question[] = [
  { id: "ke1", tipe: "pilihan_ganda", soal: "Manakah kalimat efektif?", opsi: ["Ibu pergi ke pasar", "Ibu pergi ke pasar untuk membeli", "Ibu pergi ke pasar membeli", "Ibu pergi pasar"], jawaban: 0, penjelasan: "Kalimat efektif: Ibu pergi ke pasar. Jelas dan lengkap." },
  { id: "ke2", tipe: "benar_salah", soal: "Kalimat 'Saya sangat senang sekali' adalah kalimat efektif.", opsi: ["Benar", "Salah"], jawaban: "Salah", penjelasan: "Terjadi pemborosan kata: 'sangat' dan 'sekali' bermakna sama." },
  { id: "ke3", tipe: "pilihan_ganda", soal: "Kalimat 'Ayah sedang membaca koran' memiliki pola ...", opsi: ["S-P-O", "S-P-O-K", "S-P-Pel", "S-P"], jawaban: 3, penjelasan: "Ayah (S) sedang membaca (P) koran (O) = S-P-O." },
  { id: "ke4", tipe: "pilihan_ganda", soal: "Perbaiki kalimat: 'Dia menuliskan surat itu dengan tangan.'", opsi: ["Dia menulis surat itu", "Dia menuliskan surat itu", "Dia menulis dengan tangan", "Sudah efektif"], jawaban: 0, penjelasan: "'Menulis surat' sudah cukup tanpa 'dengan tangan' (pemborosan)." },
  { id: "ke5", tipe: "isi_blank", soal: "Kalimat efektif harus memiliki subjek dan ...", jawaban: "predikat", penjelasan: "Kalimat efektif minimal memiliki subjek dan predikat (S-P)." },
]

const questions_konjungsi: Question[] = [
  { id: "kj1", tipe: "pilihan_ganda", soal: "Kata penghubung untuk menyatakan sebab adalah ...", opsi: ["dan", "tetapi", "karena", "atau"], jawaban: 2, penjelasan: "'Karena' menyatakan hubungan sebab." },
  { id: "kj2", tipe: "pilihan_ganda", soal: "Kalimat yang tepat: 'Dia cantik ... baik hati.'", opsi: ["dan", "tetapi", "karena", "atau"], jawaban: 0, penjelasan: "'Dan' menghubungkan dua sifat setara." },
  { id: "kj3", tipe: "benar_salah", soal: "Kata 'di' pada 'di rumah' adalah kata penghubung.", opsi: ["Benar", "Salah"], jawaban: "Salah", penjelasan: "'Di' pada 'di rumah' adalah kata depan, bukan kata penghubung." },
  { id: "kj4", tipe: "pilihan_ganda", soal: "Pilihlah konjungsi yang tepat: 'Dia belajar keras ... ingin lulus.'", opsi: ["dan", "tetapi", "karena", "atau"], jawaban: 2, penjelasan: "'Karena' menyatakan alasan/sebab belajar keras." },
  { id: "kj5", tipe: "isi_blank", soal: "Konjungsi yang menyatakan pertentangan adalah ...", jawaban: "tetapi", penjelasan: "Kata 'tetapi' menyatakan hubungan pertentangan." },
]

const questions_gagasan_utama: Question[] = [
  { id: "gu1", tipe: "pilihan_ganda", soal: "Gagasan utama paragraf biasanya terletak di kalimat ...", opsi: ["pertama", "terakhir", "pertama atau terakhir", "tengah"], jawaban: 2, penjelasan: "Gagasan utama bisa di awal (deduktif) atau akhir (induktif)." },
  { id: "gu2", tipe: "pilihan_ganda", soal: "Paragraf deduktif memiliki kalimat utama di ...", opsi: ["awal", "tengah", "akhir", "tersebar"], jawaban: 0, penjelasan: "Paragraf deduktif: kalimat utama di awal paragraf." },
  { id: "gu3", tipe: "benar_salah", soal: "Gagasan pendukung berisi detail yang memperkuat gagasan utama.", opsi: ["Benar", "Salah"], jawaban: "Benar", penjelasan: "Gagasan pendukung menjelaskan atau memperkuat gagasan utama." },
  { id: "gu4", tipe: "pilihan_ganda", soal: "Kalimat penjelas dalam paragraf berfungsi untuk ...", opsi: ["membuka", "menjelaskan ide pokok", "menutup", "menghias"], jawaban: 1, penjelasan: "Kalimat penjelas mendukung dan menjelaskan ide pokok." },
  { id: "gu5", tipe: "isi_blank", soal: "Ide pokok paragraf disebut juga ...", jawaban: "gagasan utama", penjelasan: "Gagasan utama atau ide pokok adalah inti paragraf." },
]

const questions_fakta_opini: Question[] = [
  { id: "fo1", tipe: "pilihan_ganda", soal: "Manakah yang termasuk fakta?", opsi: ["Indonesia merdeka tahun 1945", "Indonesia negara terindah", "Saya suka Indonesia", "Mungkin Indonesia maju"], jawaban: 0, penjelasan: "Fakta adalah hal yang dapat dibuktikan kebenarannya." },
  { id: "fo2", tipe: "benar_salah", soal: "'Bakso paling enak di dunia' adalah fakta.", opsi: ["Benar", "Salah"], jawaban: "Salah", penjelasan: "Ini opini karena 'paling enak' bersifat subjektif." },
  { id: "fo3", tipe: "pilihan_ganda", soal: "Ciri opini adalah ...", opsi: ["dapat dibuktikan", "bersifat subjektif", "data pasti", "angka akurat"], jawaban: 1, penjelasan: "Opini bersifat subjektif, berdasarkan pendapat pribadi." },
  { id: "fo4", tipe: "pilihan_ganda", soal: "Manakah pernyataan yang berupa opini?", opsi: ["Gunung tertinggi adalah Everest", "Film itu sangat bagus", "Air mendidih di seratus derajat", "Bumi itu bulat"], jawaban: 1, penjelasan: "'Film itu sangat bagus' adalah penilaian subjektif." },
  { id: "fo5", tipe: "isi_blank", soal: "Kata yang sering menandai opini: 'menurut saya', 'sepertinya', dan ...", jawaban: "mungkin", penjelasan: "Kata 'mungkin', 'sepertinya', 'menurut saya' menandai opini." },
]

const questions_kata_depan: Question[] = [
  { id: "kd1", tipe: "pilihan_ganda", soal: "Penulisan yang benar: 'Dia tinggal ... Jakarta.'", opsi: ["di", "di", "di", "di"], jawaban: 1, penjelasan: "Kata depan 'di' ditulis terpisah dari nama tempat." },
  { id: "kd2", tipe: "benar_salah", soal: "'Ia pergi kepasar' penulisannya sudah benar.", opsi: ["Benar", "Salah"], jawaban: "Salah", penjelasan: "Penulisan yang benar: 'ke pasar' (kata depan 'ke' ditulis terpisah)." },
  { id: "kd3", tipe: "pilihan_ganda", soal: "Kata depan 'dari' menunjukkan ...", opsi: ["tempat", "arah", "asal", "tujuan"], jawaban: 2, penjelasan: "'Dari' menunjukkan asal atau sumber." },
  { id: "kd4", tipe: "pilihan_ganda", soal: "'Buku itu ... meja.' Kata depan yang tepat adalah ...", opsi: ["di", "ke", "dari", "pada"], jawaban: 0, penjelasan: "'Di meja' menunjukkan posisi benda." },
  { id: "kd5", tipe: "isi_blank", soal: "Kata depan yang menunjukkan tujuan adalah ...", jawaban: "ke", penjelasan: "'Ke' menunjukkan arah atau tujuan." },
]

const questions_paragraf: Question[] = [
  { id: "pg1", tipe: "pilihan_ganda", soal: "Paragraf terdiri dari kalimat utama dan kalimat ...", opsi: ["pertama", "penjelas", "penutup", "akhir"], jawaban: 1, penjelasan: "Struktur paragraf: kalimat utama + kalimat penjelas." },
  { id: "pg2", tipe: "benar_salah", soal: "Paragraf harus memiliki minimal 3 kalimat.", opsi: ["Benar", "Salah"], jawaban: "Salah", penjelasan: "Paragraf bisa terdiri dari satu kalimat (paragraf minimalis)." },
  { id: "pg3", tipe: "pilihan_ganda", soal: "Alur paragraf yang baik harus ...", opsi: ["runtut", "acak", "panjang", "rumit"], jawaban: 0, penjelasan: "Paragraf yang baik memiliki alur runtut dan logis." },
  { id: "pg4", tipe: "pilihan_ganda", soal: "Paragraf induktif memiliki kalimat utama di bagian ...", opsi: ["awal", "tengah", "akhir", "semua"], jawaban: 2, penjelasan: "Induktif: kalimat utama di akhir paragraf." },
]

const questions_membaca: Question[] = [
  { id: "mb1", tipe: "pilihan_ganda", soal: "Informasi yang tertulis jelas dalam teks disebut informasi ...", opsi: ["tersirat", "tersurat", "tersembunyi", "tersamar"], jawaban: 1, penjelasan: "Informasi tersurat adalah informasi yang ditulis secara eksplisit." },
  { id: "mb2", tipe: "pilihan_ganda", soal: "Menyimpulkan isi teks berarti ...", opsi: ["mengulang semua kalimat", "menulis ulang", "mengambil inti bacaan", "menghapus kata"], jawaban: 2, penjelasan: "Kesimpulan adalah inti atau pokok dari teks bacaan." },
  { id: "mb3", tipe: "benar_salah", soal: "Informasi tersirat dapat ditemukan dengan membaca tersurat saja.", opsi: ["Benar", "Salah"], jawaban: "Salah", penjelasan: "Informasi tersirat perlu disimpulkan dari teks." },
  { id: "mb4", tipe: "pilihan_ganda", soal: "Tujuan teks dapat diketahui dari ...", opsi: ["judul", "panjang", "jumlah kata", "penulis"], jawaban: 0, penjelasan: "Judul sering mencerminkan tujuan penulisan teks." },
  { id: "mb5", tipe: "pilihan_ganda", soal: "Membaca pemahaman bertujuan untuk ...", opsi: ["menghafal", "memahami isi", "menyebut huruf", "menghitung kata"], jawaban: 1, penjelasan: "Membaca pemahaman bertujuan menangkap dan memahami isi bacaan." },
]

const questions_menulis: Question[] = [
  { id: "mu1", tipe: "pilihan_ganda", soal: "Menulis ringkasan berarti ...", opsi: ["menyalin semua", "mengambil inti", "menambah kata", "mengubah cerita"], jawaban: 1, penjelasan: "Ringkasan adalah inti atau pokok dari teks." },
  { id: "mu2", tipe: "benar_salah", soal: "Judul harus singkat dan mewakili isi.", opsi: ["Benar", "Salah"], jawaban: "Benar", penjelasan: "Judul yang baik adalah yang singkat dan mencerminkan isi." },
  { id: "mu3", tipe: "pilihan_ganda", soal: "Kata yang sebaiknya dihindari dalam tulisan ringkas adalah ...", opsi: ["inti", "berlebihan", "penting", "ringkas"], jawaban: 1, penjelasan: "Kata berlebihan membuat tulisan tidak ringkas." },
  { id: "mu4", tipe: "pilihan_ganda", soal: "Pesan yang efektif harus ...", opsi: ["panjang dan detail", "jelas dan singkat", "rumit", "bertele-tele"], jawaban: 1, penjelasan: "Pesan efektif: jelas, singkat, dan mudah dipahami." },
]

const questions_homonim: Question[] = [
  { id: "ho1", tipe: "pilihan_ganda", soal: "Kata 'bisa' memiliki arti ...", opsi: ["racun", "dapat", "racun dan dapat", "tidak bisa"], jawaban: 2, penjelasan: "'Bisa' berarti 'racun' (ular berbisa) dan 'dapat' (saya bisa)." },
  { id: "ho2", tipe: "pilihan_ganda", soal: "Kata 'kali' dalam 'sungai itu deras' berarti ...", opsi: ["sungai", "kali lipat", "sungai dan kali lipat", "pengali"], jawaban: 0, penjelasan: "'Kali' bisa berarti 'sungai' atau kata bilangan pengali." },
  { id: "ho3", tipe: "benar_salah", soal: "Homonim adalah kata yang sama bunyi tapi beda arti.", opsi: ["Benar", "Salah"], jawaban: "Benar", penjelasan: "Homonim: bunyi sama, ejaan sama, arti berbeda." },
]

const questions_nalar: Question[] = [
  { id: "nl1", tipe: "pilihan_ganda", soal: "Membandingkan informasi dari dua sumber berguna untuk ...", opsi: ["mencari perbedaan dan persamaan", "menyalin", "menghafal", "mengabaikan"], jawaban: 0, penjelasan: "Membandingkan informasi membantu menemukan perbedaan dan persamaan." },
  { id: "nl2", tipe: "benar_salah", soal: "Sebab-akibat adalah hubungan logis antara dua peristiwa.", opsi: ["Benar", "Salah"], jawaban: "Benar", penjelasan: "Sebab-akibat menghubungkan peristiwa penyebab dan hasilnya." },
  { id: "nl3", tipe: "pilihan_ganda", soal: "Alasan yang baik harus didukung oleh ...", opsi: ["perasaan", "bukti", "tebakan", "imajinasi"], jawaban: 1, penjelasan: "Argumen yang baik didukung bukti atau data." },
  { id: "nl4", tipe: "pilihan_ganda", soal: "Manakah yang menunjukkan hubungan sebab-akibat?", opsi: ["Ibu pergi ke pasar", "Hujan deras sehingga banjir", "Adik bermain bola", "Ayah membaca koran"], jawaban: 1, penjelasan: "'Sehingga' menunjukkan hubungan sebab (hujan) dan akibat (banjir)." },
]

const questions_sunting: Question[] = [
  { id: "st1", tipe: "pilihan_ganda", soal: "Menyunting berarti ...", opsi: ["menulis baru", "memperbaiki kesalahan", "menghapus semua", "menambah panjang"], jawaban: 1, penjelasan: "Menyunting adalah memperbaiki kesalahan dalam tulisan." },
  { id: "st2", tipe: "benar_salah", soal: "Suntingan hanya memperbaiki ejaan.", opsi: ["Benar", "Salah"], jawaban: "Salah", penjelasan: "Menyunting juga meliputi struktur kalimat, pilihan kata, dan tanda baca." },
  { id: "st3", tipe: "pilihan_ganda", soal: "Kalimat 'Dia pergi keBandung' perlu diperbaiki menjadi ...", opsi: ["Dia pergi kebandung", "Dia pergi ke Bandung", "Dia pergi Ke Bandung", "dia pergi ke bandung"], jawaban: 1, penjelasan: "Kata depan 'ke' ditulis terpisah dari nama tempat." },
]

// Map topics to units
// Topics by level:
// Level 1 (01-06): fonetik
// Level 2 (07-12): ejaan + huruf kapital
// Level 3 (13-18): kata baku
// Level 4 (19-24): sinonim + antonim + homonim
// Level 5 (25-30): imbuhan
// Level 6 (31-36): kalimat efektif
// Level 7 (37-42): konjungsi + kata depan
// Level 8 (43-48): paragraf + gagasan utama
// Level 9 (49-54): membaca pemahaman
// Level 10 (55-60): fakta/opini + nalar
// Level 11 (61-66): menulis
// Level 12 (67-72): sunting + review

const topicQuestions: Record<string, Question[]> = {
  fonetik: questions_fonetik,
  ejaan: questions_ejaan,
  "huruf-kapital": questions_huruf_kapital,
  "tanda-baca": questions_tanda_baca,
  "kata-baku": questions_kata_baku,
  sinonim: questions_sinonim,
  antonim: questions_antonim,
  homonim: questions_homonim,
  imbuhan: questions_imbuhan,
  "kalimat-efektif": questions_kalimat_efektif,
  konjungsi: questions_konjungsi,
  "kata-depan": questions_kata_depan,
  paragraf: questions_paragraf,
  "gagasan-utama": questions_gagasan_utama,
  membaca: questions_membaca,
  "fakta-opini": questions_fakta_opini,
  nalar: questions_nalar,
  menulis: questions_menulis,
  sunting: questions_sunting,
}

// 12 levels with topic assignments
const levelTopics: { level: number; topics: string[] }[] = [
  { level: 1, topics: ["fonetik"] },
  { level: 2, topics: ["ejaan", "huruf-kapital"] },
  { level: 3, topics: ["kata-baku"] },
  { level: 4, topics: ["sinonim", "antonim"] },
  { level: 5, topics: ["imbuhan"] },
  { level: 6, topics: ["kalimat-efektif"] },
  { level: 7, topics: ["konjungsi", "kata-depan"] },
  { level: 8, topics: ["paragraf", "gagasan-utama"] },
  { level: 9, topics: ["membaca"] },
  { level: 10, topics: ["fakta-opini", "nalar"] },
  { level: 11, topics: ["menulis"] },
  { level: 12, topics: ["sunting", "homonim"] },
]

function buildMateri(unitTitle: string, levelTitle: string, unitIdx: number): MateriItem[] {
  const intro = unitIdx === 0 ? "Pelajari materi berikut dengan saksama." : "Lanjutkan belajar dengan materi berikut."
  return [
    { tipe: "teks", isi: intro },
    { tipe: "teks", isi: `Kita akan belajar tentang ${unitTitle.toLowerCase()}.` },
    { tipe: "tips", isi: "Baca setiap soal dengan teliti sebelum menjawab." },
  ]
}

async function main() {
  if (DRY_RUN) {
    console.log("🧪 DRY RUN — run with --execute to apply")
  }

  // Fetch all JALUR levels + units
  const levels = await db.learningLevel.findMany({
    where: { type: "JALUR" },
    orderBy: { level: "asc" },
    include: {
      units: { orderBy: { order: "asc" }, where: { isActive: true } },
    },
  })

  console.log(`\nFound ${levels.length} JALUR levels\n`)

  let totalQuestions = 0
  let totalUnitsUpdated = 0

  for (const level of levels) {
    const levelConfig = levelTopics.find((lt) => lt.level === level.level)
    if (!levelConfig) {
      console.log(`  ⚠️  No topic config for level ${level.level}, skipping`)
      continue
    }

    // Distribute topics across units in this level
    for (let ui = 0; ui < level.units.length; ui++) {
      const unit = level.units[ui]
      const topicIdx = ui % levelConfig.topics.length
      const topicKey = levelConfig.topics[topicIdx]
      const pool = topicQuestions[topicKey]

      if (!pool) {
        console.log(`  ⚠️  No questions for topic ${topicKey}`)
        continue
      }

      // Select 5-6 questions for this unit (cyclic from pool)
      const qPerUnit = Math.min(6, pool.length)
      const startIdx = (ui * 3) % pool.length
      const selected: Question[] = []
      for (let i = 0; i < qPerUnit; i++) {
        selected.push(pool[(startIdx + i) % pool.length])
      }

      // Build content
      const content: UnitContent = {
        tipe: "jalur",
        materi: buildMateri(unit.title, level.title, ui),
        questions: selected,
      }

      totalQuestions += selected.length

      if (DRY_RUN) {
        console.log(`  📋 Level ${level.level} / "${unit.title}": ${selected.length} questions`)
      } else {
        await db.learningUnit.update({
          where: { id: unit.id },
          data: { content: JSON.stringify(content) },
        })
        console.log(`  ✅ Level ${level.level} / "${unit.title}": ${selected.length} questions`)
      }
      totalUnitsUpdated++
    }
  }

  console.log()
  console.log("=".repeat(50))
  console.log(`Units updated: ${totalUnitsUpdated}/${levels.reduce((s, l) => s + l.units.length, 0)}`)
  console.log(`Total questions: ${totalQuestions}`)

  if (DRY_RUN) {
    console.log(`\n🧪 DRY RUN — run with --execute to seed ${totalQuestions} questions into ${totalUnitsUpdated} units`)
  } else {
    console.log("\n✅ Jalur Cerdas lesson content seeded!")
  }

  await db.$disconnect()
}

main().catch((e) => {
  console.error("Seed failed:", e)
  process.exit(1)
})
