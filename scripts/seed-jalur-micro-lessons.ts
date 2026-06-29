/**
 * Jalur Cerdas — Micro Lessons Seed
 *
 * Adds child-friendly micro lessons (summary, explanation, examples, tips)
 * to all 72 JALUR units' content JSON. Does NOT overwrite questions.
 *
 * Level band: Level 1-4 = dasar, Level 5-8 = menengah, Level 9-12 = tinggi
 *
 * Usage:
 *   npx tsx scripts/seed-jalur-micro-lessons.ts           # dry-run
 *   npx tsx scripts/seed-jalur-micro-lessons.ts --execute  # apply
 */

import { PrismaClient } from "@prisma/client"

const db = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } })

interface Lesson {
  title: string
  levelBand: "dasar" | "menengah" | "tinggi"
  summary: string
  explanation: string
  examples: { label: string; text: string; note?: string }[]
  tips: string[]
  beforePracticePrompt: string
}

type LessonsMap = Record<string, Lesson>

const LESSONS_BY_TITLE: LessonsMap = {
  // ==================== LEVEL 1: Mulai dari Bahasa (dasar) ====================
  "Mengenal Bunyi dan Huruf": {
    title: "Mengenal Bunyi dan Huruf",
    levelBand: "dasar",
    summary: "Bahasa Indonesia punya banyak bunyi. Setiap bunyi ditulis dengan huruf.",
    explanation: "Kita mendengar bunyi setiap hari. Bunyi \"a\", \"b\", \"c\" adalah contoh bunyi bahasa. Setiap bunyi punya huruf sendiri. Kalau kita tahu huruf, kita bisa membaca dan menulis.",
    examples: [
      { label: "Bunyi 'a'", text: "a seperti pada kata: apel, api, abc", note: "Buka mulut lebar-lebar!" },
      { label: "Bunyi 'b'", text: "b seperti pada kata: buku, bola, bibi", note: "Rapatkan bibir, lalu buka." },
      { label: "Bunyi 'm'", text: "m seperti pada kata: mama, makan, minum", note: "Dengung di hidung." },
    ],
    tips: ["Coba ucapkan huruf sambil lihat mulutmu di cermin!", "Setiap huruf punya bunyi yang berbeda.", "Latihan setiap hari membuatmu pintar membaca."],
    beforePracticePrompt: "Yuk, kita latihan mengenal bunyi dan huruf!",
  },
  "Huruf Vokal dan Konsonan": {
    title: "Huruf Vokal dan Konsonan",
    levelBand: "dasar",
    summary: "Huruf vokal: a i u e o. Sisanya adalah huruf konsonan.",
    explanation: "Huruf vokal adalah huruf yang bunyinya keluar tanpa hambatan. Coba ucapkan: a, i, u, e, o — lihat, mulutmu terbuka lebar! Huruf konsonan membutuhkan bantuan bibir atau lidah, seperti b, c, d, dan seterusnya.",
    examples: [
      { label: "Vokal", text: "a i u e o — coba ucapkan satu per satu!", note: "Rasakan getaran di tenggorokan." },
      { label: "Konsonan", text: "b c d f g h j k l m n p q r s t v w x y z", note: "Coba ucapkan 'b' — bibirmu rapat dulu!" },
      { label: "Contoh kata", text: "b-a-t-u = batu. Ada konsonan b, t dan vokal a, u." },
    ],
    tips: ["Vokal: buka mulut. Konsonan: bibir/lidah bergerak.", "Semua kata pasti punya vokal!", "Coba cari vokal di namamu."],
    beforePracticePrompt: "Ayo bedakan vokal dan konsonan!",
  },
  "Suku Kata Sederhana": {
    title: "Suku Kata Sederhana",
    levelBand: "dasar",
    summary: "Kata terdiri dari suku kata. Satu suku kata punya satu vokal.",
    explanation: "Suku kata adalah potongan dalam kata. Contoh: 'buku' punya dua suku kata: bu + ku. Setiap suku kata pasti punya satu huruf vokal (a, i, u, e, o).",
    examples: [
      { label: "Satu suku", text: "bu, ku, ma, mi, ta", note: "Coba tepuk tangan setiap suku kata!" },
      { label: "Dua suku", text: "bu-ku, ma-kan, mi-num, ta-hu" },
      { label: "Tiga suku", text: "pe-la-ja-ran, se-ko-lah, ma-ta-ha-ri" },
    ],
    tips: ["Tepuk tangan setiap suku kata!", "Setiap suku kata harus punya vokal.", "Makin panjang kata, makin banyak suku katanya."],
    beforePracticePrompt: "Ayo potong kata menjadi suku kata!",
  },
  "Membaca Kata Pendek": {
    title: "Membaca Kata Pendek",
    levelBand: "dasar",
    summary: "Kita bisa membaca kata pendek dengan menggabungkan huruf.",
    explanation: "Membaca itu seperti menyusun puzzle. Gabungkan bunyi setiap huruf. Contoh: b + u = bu, k + u = ku. Gabung: bu + ku = buku. Mudah, kan?",
    examples: [
      { label: "Dua huruf", text: "b + a = ba, i + tu = itu", note: "Baca perlahan." },
      { label: "Tiga huruf", text: "b + o + la = bola, m + a + ta = mata" },
      { label: "Kata pendek", text: "buku, kucing, rumah, sekolah" },
    ],
    tips: ["Baca huruf satu per satu dulu.", "Lalu gabungkan jadi kata.", "Latihan tiap hari, nanti lancar!"],
    beforePracticePrompt: "Siap membaca? Ayo!",
  },
  "Mendengar dan Memilih Kata": {
    title: "Mendengar dan Memilih Kata",
    levelBand: "dasar",
    summary: "Dengar bunyinya, lalu pilih kata yang tepat!",
    explanation: "Kita belajar mendengar bunyi kata dan memilih kata yang benar. Misalnya, dengar 'buku' — pilih gambar atau tulisan buku. Ini melatih telinga dan mata kita.",
    examples: [
      { label: "Dengar 'buku'", text: "Pilih: buku atau kuku?", note: "Buku untuk baca, kuku di jari." },
      { label: "Dengar 'mata'", text: "Pilih: mata atau bata?", note: "Mata untuk lihat." },
      { label: "Dengar 'rumah'", text: "Pilih: rumah atau lumah?" },
    ],
    tips: ["Dengar baik-baik bunyi awalnya.", "Perhatikan beda bunyi yang mirip.", "Latihan mendengar membuatmu peka!"],
    beforePracticePrompt: "Pasang telinga, ayo latihan!",
  },
  "Latihan Cepat Level 1": {
    title: "Latihan Cepat Level 1 — Semua materi dasar",
    levelBand: "dasar",
    summary: "Ayo ulang semua yang sudah dipelajari di level 1!",
    explanation: "Kita sudah belajar bunyi huruf, vokal dan konsonan, suku kata, membaca kata pendek, dan memilih kata. Sekarang saatnya mengulang semuanya dalam satu latihan seru!",
    examples: [
      { label: "Apa yang sudah dipelajari?", text: "Huruf, bunyi, suku kata, membaca, mendengar" },
      { label: "Contoh soal campuran", text: "Tentukan apakah 'a' adalah vokal atau konsonan? (Jawaban: vokal)" },
    ],
    tips: ["Ingat semua pelajaran dari level 1.", "Baca soal dengan teliti.", "Kamu pasti bisa!"],
    beforePracticePrompt: "Ayo buktikan kemampuanmu!",
  },

  // ==================== LEVEL 2: Ejaan Dasar (dasar) ====================
  "Huruf Kapital": {
    title: "Huruf Kapital",
    levelBand: "dasar",
    summary: "Huruf kapital adalah huruf besar. Dipakai di awal kalimat dan nama orang.",
    explanation: "Coba lihat huruf 'a' dan 'A'. 'a' adalah huruf kecil. 'A' adalah huruf kapital (huruf besar). Kapan pakai huruf kapital? Di awal kalimat dan nama orang. Contoh: 'Aku makan.' 'Sinta pergi ke sekolah.'",
    examples: [
      { label: "Awal kalimat", text: "Aku membaca buku.", note: "A-nya pakai huruf kapital." },
      { label: "Nama orang", text: "Nama temanku Sinta.", note: "S-nya pakai huruf kapital." },
      { label: "Bukan nama", text: "saya suka bunga mawar. ('saya' tetap huruf kecil di tengah kalimat)" },
    ],
    tips: ["Ingat: awal kalimat pakai huruf besar.", "Nama orang juga pakai huruf besar.", "Nama hari dan bulan juga pakai huruf besar!"],
    beforePracticePrompt: "Yuk, bedakan huruf kapital dan kecil!",
  },
  "Tanda Titik": {
    title: "Tanda Titik",
    levelBand: "dasar",
    summary: "Tanda titik (.) dipakai di akhir kalimat.",
    explanation: "Setiap kalimat harus diakhiri dengan tanda titik. Tanda titik seperti titik berhenti. Kalau kamu lihat titik, artinya kalimat sudah selesai. Contoh: 'Aku sedang makan.' Lihat titik di akhir?",
    examples: [
      { label: "Akhir kalimat", text: "Aku suka bermain bola.", note: "Jangan lupa titik di akhir!" },
      { label: "Dua kalimat", text: "Hari ini cerah. Aku pergi ke taman.", note: "Setiap kalimat punya titik." },
    ],
    tips: ["Setiap selesai menulis kalimat, kasih titik.", "Tanda titik seperti tombol stop.", "Baca ulang: apa sudah ada titik di akhir?"],
    beforePracticePrompt: "Ayo latihan pakai tanda titik!",
  },
  "Tanda Koma": {
    title: "Tanda Koma",
    levelBand: "dasar",
    summary: "Tanda koma (,) dipakai untuk berhenti sebentar dalam kalimat.",
    explanation: "Tanda koma beda dengan titik. Koma untuk berhenti sebentar. Biasanya dipakai untuk memisahkan kata dalam daftar. Contoh: 'Aku membeli buku, pensil, dan penggaris.'",
    examples: [
      { label: "Daftar barang", text: "Aku suka apel, mangga, dan jeruk.", note: "Koma memisahkan setiap buah." },
      { label: "Setelah kata 'hai'", text: "Halo, apa kabar?", note: "Koma setelah halo." },
    ],
    tips: ["Koma untuk jeda sebentar.", "Titik untuk berhenti total.", "Baca dengan suara: kalau ada koma, berhenti sebentar."],
    beforePracticePrompt: "Ayo latihan pakai tanda koma!",
  },
  "Tanda Tanya dan Seru": {
    title: "Tanda Tanya dan Seru",
    levelBand: "dasar",
    summary: "Tanda tanya (?) untuk bertanya. Tanda seru (!) untuk perintah atau kaget.",
    explanation: "Tanda tanya dipakai di akhir kalimat tanya. Contoh: 'Siapa namamu?' Tanda seru dipakai untuk perintah atau ungkapan kaget. Contoh: 'Awas!' 'Wah, bagus sekali!'",
    examples: [
      { label: "Kalimat tanya", text: "Kamu mau ke mana?", note: "Pakai ? di akhir." },
      { label: "Kalimat seru", text: "Awas, ada kucing!", note: "Pakai ! kalau kaget atau perintah." },
      { label: "Biasa", text: "Hari ini hujan.", note: "Pakai . kalau biasa saja." },
    ],
    tips: ["Bertanya? Pakai ?", "Kaget atau perintah? Pakai !", "Biasa saja? Pakai ."],
    beforePracticePrompt: "Tentukan tanda yang tepat!",
  },
  "Menulis Kata dengan Tepat": {
    title: "Menulis Kata dengan Tepat",
    levelBand: "dasar",
    summary: "Setiap kata harus ditulis dengan huruf yang benar.",
    explanation: "Menulis itu harus tepat. Jangan sampai salah tulis. Misalnya 'buku' bukan 'buko'. 'Saya' bukan 'saya' (di awal kalimat: 'Saya'). Perhatikan ejaan yang benar.",
    examples: [
      { label: "Kata yang benar", text: "buku (bukan boko), minum (bukan minem)", note: "Dengar bunyinya, tulis dengan benar." },
      { label: "Huruf kapital di awal", text: "Ibu pergi ke pasar. (I-nya kapital)", note: "Awal kalimat pakai kapital." },
    ],
    tips: ["Baca ulang tulisanmu.", "Kalau ragu, eja pelan-pelan.", "Latihan menulis setiap hari!"],
    beforePracticePrompt: "Ayo tulis kata dengan benar!",
  },
  "Latihan Cepat Level 2": {
    title: "Latihan Cepat Level 2 — Semua materi ejaan",
    levelBand: "dasar",
    summary: "Ulang semua yang dipelajari tentang ejaan dasar!",
    explanation: "Kita sudah belajar huruf kapital, tanda titik, koma, tanya, seru, dan menulis dengan tepat. Sekarang saatnya latihan campuran!",
    examples: [
      { label: "Yang sudah dipelajari", text: "Huruf kapital, tanda titik, koma, tanya, seru, menulis tepat" },
    ],
    tips: ["Ingat semua pelajaran dari level 2.", "Baca soal dengan teliti.", "Perhatikan tanda baca!"],
    beforePracticePrompt: "Ayo kerjakan soal campuran level 2!",
  },

  // ==================== LEVEL 3: Kata Baku (dasar) ====================
  "Kata Baku dan Tidak Baku": {
    title: "Kata Baku dan Tidak Baku",
    levelBand: "dasar",
    summary: "Kata baku adalah kata yang benar menurut aturan. Kata tidak baku adalah kata sehari-hari.",
    explanation: "Bahasa Indonesia punya kata baku dan tidak baku. Kata baku dipakai di buku pelajaran dan ujian. Kata tidak baku dipakai saat ngobrol dengan teman. Contoh: 'aktif' (baku) — 'aktip' (tidak baku). 'kalau' itu tidak baku, yang baku 'jika'.",
    examples: [
      { label: "Baku vs Tidak Baku", text: "aktif (baku) — aktip (tidak baku)", note: "Tulis dengan 'f', bukan 'p'." },
      { label: "Contoh lain", text: "ijin (tidak baku) → izin (baku). resiko → risiko." },
    ],
    tips: ["Kalau ragu, cek di KBBI!", "Kata baku untuk menulis resmi.", "Kata tidak baku untuk ngobrol."],
    beforePracticePrompt: "Pilih kata baku yang tepat!",
  },
  "Kata Serapan Umum": {
    title: "Kata Serapan Umum",
    levelBand: "dasar",
    summary: "Kata serapan adalah kata dari bahasa asing yang sudah dipakai di Indonesia.",
    explanation: "Bahasa Indonesia meminjam kata dari bahasa lain. Misalnya dari bahasa Arab, Belanda, Inggris. Tapi cara tulisnya sudah disesuaikan. Contoh: 'kursi' dari bahasa Arab, 'kantor' dari Belanda.",
    examples: [
      { label: "Dari Arab", text: "kursi, buku, kertas, hadiah", note: "Banyak kata sehari-hari dari Arab." },
      { label: "Dari Belanda", text: "kantor, polisi, dokter, sekolah" },
      { label: "Dari Inggris", text: "komputer, internet, film" },
    ],
    tips: ["Kata serapan sudah jadi bagian bahasa Indonesia.", "Tulis sesuai ejaan Indonesia, bukan aslinya.", "Contoh: 'computer' → 'komputer'."],
    beforePracticePrompt: "Ayo kenali kata serapan!",
  },
  "Kesalahan Kata Sehari-hari": {
    title: "Kesalahan Kata Sehari-hari",
    levelBand: "dasar",
    summary: "Banyak kata yang sering salah tulis. Ayo perbaiki!",
    explanation: "Kata-kata tertentu sering salah ditulis. Misalnya 'didalam' seharusnya 'di dalam' (dipisah). 'karna' seharusnya 'karena'. Ayo kita belajar kata-kata yang sering salah ini.",
    examples: [
      { label: "Sering salah", text: "karna → karena, gimana → bagaimana", note: "'karna' itu tidak baku." },
      { label: "Di- vs ke-", text: "dirumah → di rumah, kesekolah → ke sekolah", note: "di, ke sebagai kata depan dipisah." },
    ],
    tips: ["Hindari menulis seperti ngobrol.", "Gunakan kata yang lengkap.", "Biasakan menulis 'tidak' bukan 'nggak'."],
    beforePracticePrompt: "Perbaiki kata yang salah!",
  },
  "Memilih Kata yang Tepat": {
    title: "Memilih Kata yang Tepat",
    levelBand: "dasar",
    summary: "Pilih kata yang paling cocok untuk kalimat.",
    explanation: "Kadang ada beberapa kata yang mirip. Kita harus pilih yang paling tepat. Contoh: 'menerima' atau 'mendapat'? 'Menerima hadiah' lebih tepat daripada 'mendapat hadiah' dalam konteks formal.",
    examples: [
      { label: "Menerima / Mendapat", text: "Dia menerima hadiah. (lebih formal)", note: "Keduanya bisa, tapi 'menerima' lebih resmi." },
      { label: "Melihat / Menonton", text: "Aku menonton film. (bukan 'melihat film')", note: "'Menonton' khusus untuk tontonan." },
    ],
    tips: ["Pilih kata yang paling pas dengan situasi.", "Kalau ragu, pakai kata yang lebih umum.", "Baca contoh kalimat untuk tahu bedanya."],
    beforePracticePrompt: "Pilih kata yang paling tepat!",
  },
  "Perbaiki Kata dalam Kalimat": {
    title: "Perbaiki Kata dalam Kalimat",
    levelBand: "dasar",
    summary: "Cari kata yang salah dalam kalimat, lalu perbaiki!",
    explanation: "Kalimat kadang punya kata yang salah. Tugasmu: temukan kata yang salah, lalu perbaiki. Contoh: 'Aku minum susu setial hari.' Kata 'setial' salah. Yang benar: 'setiap'.",
    examples: [
      { label: "Temukan kesalahan", text: "Dia pergi ke pasar untuk membeli ikan." },
      { label: "Perbaiki", text: "setial → setiap, karna → karena, aktip → aktif", note: "Ganti dengan kata baku." },
    ],
    tips: ["Baca kalimat dengan saksama.", "Cari kata yang terdengar aneh.", "Ganti dengan kata yang baku."],
    beforePracticePrompt: "Ayo perbaiki kata yang salah!",
  },
  "Latihan Cepat Level 3": {
    title: "Latihan Cepat Level 3 — Semua materi kata baku",
    levelBand: "dasar",
    summary: "Ulang semua tentang kata baku dan tidak baku!",
    explanation: "Level 3 membahas kata baku, kata serapan, kesalahan sehari-hari, dan memilih kata yang tepat. Sekarang saatnya latihan campuran!",
    examples: [
      { label: "Yang sudah dipelajari", text: "Kata baku/tidak baku, kata serapan, kesalahan umum, memilih kata tepat" },
    ],
    tips: ["Ingat: baku untuk resmi, tidak baku untuk ngobrol.", "Cek kata ragu di KBBI.", "Kamu pasti bisa!"],
    beforePracticePrompt: "Ayo latihan campuran level 3!",
  },

  // ==================== LEVEL 4: Makna Kata (dasar) ====================
  "Sinonim": {
    title: "Sinonim",
    levelBand: "dasar",
    summary: "Sinonim adalah kata yang artinya sama atau mirip.",
    explanation: "Dua kata bisa punya arti yang mirip. Misalnya 'besar' dan 'raksasa' artinya mirip. 'Kecil' dan 'mungil' juga mirip. Sinonim membantu kita tidak menggunakan kata yang itu-itu saja.",
    examples: [
      { label: "Besar", text: "besar = raksasa = gedhe", note: "Artinya kurang lebih sama." },
      { label: "Pintar", text: "pintar = pandai = cerdas", note: "Semua berarti tidak bodoh." },
      { label: "Cepat", text: "cepat = kencang = kilat" },
    ],
    tips: ["Sinonim membuat tulisan lebih menarik.", "Gunakan sinonim agar tidak bosan.", "Tapi jangan pakai sinonim yang terlalu sulit."],
    beforePracticePrompt: "Cari sinonim yang tepat!",
  },
  "Antonim": {
    title: "Antonim",
    levelBand: "dasar",
    summary: "Antonim adalah kata yang artinya berlawanan.",
    explanation: "Antonim adalah lawan kata. Misalnya 'panas' lawannya 'dingin'. 'Tinggi' lawannya 'pendek'. Dengan tahu antonim, kita bisa memahami kata lebih baik.",
    examples: [
      { label: "Panas — Dingin", text: "Panas lawannya dingin.", note: "Dua hal yang berlawanan." },
      { label: "Tinggi — Pendek", text: "Tinggi lawannya pendek." },
      { label: "Cepat — Lambat", text: "Cepat lawannya lambat." },
    ],
    tips: ["Antonim selalu berpasangan.", "Kalau tahu satu, pasti bisa tebak lawannya.", "Gunakan antonim untuk menjelaskan perbedaan."],
    beforePracticePrompt: "Cari lawan kata yang tepat!",
  },
  "Homonim Sederhana": {
    title: "Homonim Sederhana",
    levelBand: "dasar",
    summary: "Homonim adalah kata yang sama bunyinya tapi beda arti.",
    explanation: "Ada kata-kata yang bunyinya sama tapi artinya berbeda. Contoh: 'bisa' artinya 'dapat' atau 'racun ular'. 'Rapat' artinya 'pertemuan' atau 'tidak longgar'. Lucu, kan?",
    examples: [
      { label: "Bisa", text: "Aku bisa berenang. / Ular itu punya bisa.", note: "Dua arti yang sangat berbeda!" },
      { label: "Rapat", text: "Ada rapat di kantor. / Ikatannya rapat sekali.", note: "Beda arti tergantung kalimatnya." },
    ],
    tips: ["Lihat konteks kalimat untuk tahu artinya.", "Kalimat membantu kita memahami.", "Homonim membuat bahasa Indonesia menarik!"],
    beforePracticePrompt: "Tebak arti kata yang sama bunyinya!",
  },
  "Makna Denotatif dan Konotatif": {
    title: "Makna Denotatif dan Konotatif",
    levelBand: "dasar",
    summary: "Makna denotatif adalah arti sebenarnya. Makna konotatif adalah arti kiasan.",
    explanation: "Makna denotatif: arti yang sesungguhnya, seperti di kamus. Makna konotatif: arti kiasan, bukan arti sebenarnya. Contoh: 'Dia bunga desa.' Bukan berarti dia benar-benar bunga. Artinya: dia gadis tercantik di desa.",
    examples: [
      { label: "Denotatif", text: "Bunga mawar ini merah.", note: "Artinya: benar-benar bunga." },
      { label: "Konotatif", text: "Dia bunga desa.", note: "Artinya: gadis cantik, bukan bunga sungguhan." },
    ],
    tips: ["Denotatif = arti kamus.", "Konotatif = arti kiasan.", "Baca konteks dulu baru tahu artinya."],
    beforePracticePrompt: "Bedakan arti sebenarnya dan kiasan!",
  },
  "Kosakata dalam Konteks": {
    title: "Kosakata dalam Konteks",
    levelBand: "dasar",
    summary: "Arti kata bisa berbeda tergantung kalimatnya.",
    explanation: "Satu kata bisa punya arti yang berbeda di kalimat yang berbeda. Contoh: 'tahu' bisa berarti 'makanan dari kedelai' atau 'sudah mengerti'. Kita harus lihat kalimatnya untuk tahu arti yang tepat.",
    examples: [
      { label: "Tahu (makanan)", text: "Aku suka makan tahu goreng.", note: "Tahu = makanan." },
      { label: "Tahu (mengerti)", text: "Aku tahu jawabannya.", note: "Tahu = mengerti." },
    ],
    tips: ["Baca seluruh kalimat untuk paham.", "Perhatikan kata di sekitar.", "Kontek adalah kunci!"],
    beforePracticePrompt: "Tentukan arti kata dalam kalimat!",
  },
  "Latihan Cepat Level 4": {
    title: "Latihan Cepat Level 4 — Semua materi makna kata",
    levelBand: "dasar",
    summary: "Ulang semua tentang makna kata!",
    explanation: "Level 4 membahas sinonim, antonim, homonim, makna denotatif/konotatif, dan kosakata dalam konteks. Saatnya latihan campuran!",
    examples: [{ label: "Yang sudah dipelajari", text: "Sinonim, antonim, homonim, denotatif/konotatif, konteks" }],
    tips: ["Sinonim = sama arti.", "Antonim = lawan arti.", "Homonim = sama bunyi beda arti.", "Konteks = kunci arti."],
    beforePracticePrompt: "Ayo kerjakan soal campuran level 4!",
  },

  // ==================== LEVEL 5: Bentuk Kata (menengah) ====================
  "Kata Dasar": {
    title: "Kata Dasar",
    levelBand: "menengah",
    summary: "Kata dasar adalah kata yang belum mendapat imbuhan. Ini adalah kata asli.",
    explanation: "Kata dasar adalah kata yang paling sederhana. Belum ditambahi apa-apa. Contoh: 'makan', 'tulis', 'baca'. Kalau ditambah imbuhan jadi 'memakan', 'menulis', 'membaca'. Kata dasarnya tetap: makan, tulis, baca.",
    examples: [
      { label: "Kata dasar", text: "makan, minum, tulis, baca, lari", note: "Belum ada imbuhan." },
      { label: "Sudah berimbuhan", text: "memakan (me- + makan), menulis (me- + tulis)", note: "Kata dasarnya tetap ada." },
    ],
    tips: ["Kata dasar bisa berdiri sendiri.", "Cari kata yang paling sederhana.", "Imbuhan hanya menambahkan arti, bukan mengubah kata dasar."],
    beforePracticePrompt: "Temukan kata dasar dari kata berimbuhan!",
  },
  "Imbuhan Me-": {
    title: "Imbuhan Me-",
    levelBand: "menengah",
    summary: "Imbuhan me- membuat kata kerja aktif. Bentuknya bisa berubah: me-, mem-, men-, meng-, meny-.",
    explanation: "Imbuhan me- dipakai untuk membuat kata kerja aktif. Bentuknya berubah tergantung huruf pertama kata dasar. Kalau kata dasar dimulai dengan 'l, m, n, r, w, y' → tetap me-. Dimulai 'b, f, p' → mem-. Dimulai 'c, d, j, t' → men-. Dimulai 'a, g, h, k' → meng-. Dimulai 's' → meny-.",
    examples: [
      { label: "me-", text: "me-lukis, me-ngaji, me-rewang", note: "Huruf awal l, ng, r." },
      { label: "mem-", text: "mem-baca, mem-beli, mem-buat", note: "Huruf awal b, p." },
      { label: "men-", text: "men-tulis, men-cari, men-dengar", note: "Huruf awal t, c, d." },
      { label: "meng-", text: "meng-ambil, meng-gambar, meng-hitung", note: "Huruf awal a, g, h, k." },
    ],
    tips: ["Perhatikan huruf pertama kata dasar.", "Latihan dengan kata sehari-hari.", "Kalau bingung, coba ucapkan dulu."],
    beforePracticePrompt: "Pilih bentuk imbuhan me- yang tepat!",
  },
  "Imbuhan Ber-": {
    title: "Imbuhan Ber-",
    levelBand: "menengah",
    summary: "Imbuhan ber- berarti 'memiliki' atau 'melakukan'. Contoh: berlari, bernyanyi.",
    explanation: "Imbuhan ber- membuat kata kerja atau kata sifat. Artinya 'mempunyai' atau 'melakukan'. Contoh: 'berlari' artinya melakukan lari. 'berbaju' artinya memakai baju. 'beradik' artinya mempunyai adik.",
    examples: [
      { label: "Melakukan", text: "ber-lari, ber-nyanyi, ber-main", note: "Artinya sedang melakukan." },
      { label: "Memiliki", text: "ber-adik, ber-rumah, ber-mobil", note: "Artinya punya adik/rumah/mobil." },
    ],
    tips: ["Ber- + kata kerja = melakukan.", "Ber- + kata benda = memiliki.", "Jangan tulis 'ber' dipisah dari kata dasarnya."],
    beforePracticePrompt: "Pilih kata dengan imbuhan ber- yang tepat!",
  },
  "Imbuhan Pe- dan Per-": {
    title: "Imbuhan Pe- dan Per-",
    levelBand: "menengah",
    summary: "Imbuhan pe- dan per- membuat kata benda pelaku atau alat.",
    explanation: "Imbuhan pe- dan per- mengubah kata kerja atau kata sifat menjadi kata benda. 'Pe-' berarti orang yang melakukan. 'Per-' bisa berarti alat atau orang. Contoh: 'penulis' (orang yang menulis), 'peraut' (alat untuk meraut).",
    examples: [
      { label: "Pe-", text: "pe-nulis, pe-musik, pe-lukis", note: "Orang yang melakukan." },
      { label: "Per-", text: "per-aut (alat raut), per-awat (orang yang merawat)", note: "Bisa orang atau alat." },
    ],
    tips: ["Pe- bentuknya mirip me-: pe-, pem-, pen-, peng-, peny-.", "Per- lebih jarang dipakai daripada pe-.", "Contoh: perebus (alat merebus)."],
    beforePracticePrompt: "Pilih kata dengan imbuhan pe- atau per-!",
  },
  "Akhiran -kan dan -i": {
    title: "Akhiran -kan dan -i",
    levelBand: "menengah",
    summary: "Akhiran -kan dan -i mengubah arti kata kerja. -kan untuk objek, -i untuk tempat.",
    explanation: "Akhiran -kan dan -i dipakai di akhir kata kerja. '-kan' biasanya berarti 'membuat jadi' atau untuk objek yang dipindahkan. '-i' biasanya berarti 'memberi' atau untuk tempat. Contoh: 'meletakkan buku' (-kan, buku dipindahkan). 'melukai kaki' (-i, kaki adalah tempat).",
    examples: [
      { label: "-kan", text: "me-letak-kan buku, me-masak-kan nasi", note: "Buku/nasi adalah objek yang dipindahkan." },
      { label: "-i", text: "me-lukai tangan, me-nanami kebun", note: "Tangan/kebun adalah tempat." },
    ],
    tips: ["-kan: objek berpindah.", "-i: tempat atau penerima.", "Baca kalimatnya untuk tahu mana yang tepat."],
    beforePracticePrompt: "Pilih akhiran -kan atau -i yang tepat!",
  },
  "Latihan Cepat Level 5": {
    title: "Latihan Cepat Level 5 — Semua materi bentuk kata",
    levelBand: "menengah",
    summary: "Ulang semua tentang bentuk kata dan imbuhan!",
    explanation: "Level 5 membahas kata dasar, imbuhan me-, ber-, pe-/per-, dan akhiran -kan/-i. Semua ini tentang bagaimana kata berubah bentuk dan arti.",
    examples: [{ label: "Yang sudah dipelajari", text: "Kata dasar, me-, ber-, pe-/per-, -kan/-i" }],
    tips: ["Kata dasar adalah yang paling sederhana.", "Imbuhan mengubah arti kata.", "Perhatikan huruf pertama untuk bentuk me-/pe-."],
    beforePracticePrompt: "Ayo kerjakan soal campuran level 5!",
  },

  // ==================== LEVEL 6: Kalimat Jelas (menengah) ====================
  "Subjek dan Predikat": {
    title: "Subjek dan Predikat",
    levelBand: "menengah",
    summary: "Subjek adalah pelaku. Predikat adalah tindakan. Setiap kalimat punya keduanya.",
    explanation: "Setiap kalimat lengkap punya subjek (siapa) dan predikat (melakukan apa). Subjek biasanya di awal kalimat. Predikat adalah kata kerjanya. Contoh: 'Adik (subjek) bermain (predikat).' Gampang kan?",
    examples: [
      { label: "Kalimat sederhana", text: "Kucing (S) tidur (P).", note: "Kucing = subjek, tidur = predikat." },
      { label: "Kalimat lebih panjang", text: "Ibu (S) memasak nasi goreng (P)." },
    ],
    tips: ["Cari siapa yang melakukan = subjek.", "Cari yang dilakukan = predikat.", "Subjek biasanya orang/hewan/benda."],
    beforePracticePrompt: "Tentukan subjek dan predikat!",
  },
  "Objek dan Keterangan": {
    title: "Objek dan Keterangan",
    levelBand: "menengah",
    summary: "Objek adalah yang dikenai tindakan. Keterangan memberi info tambahan.",
    explanation: "Objek adalah yang menerima tindakan dari subjek. Keterangan memberi info tambahan: di mana, kapan, bagaimana. Contoh: 'Adik (S) membaca (P) buku (O) di kamar (Ket).' Buku adalah objek. Di kamar adalah keterangan tempat.",
    examples: [
      { label: "Objek", text: "Aku membeli buku. (buku = objek)", note: "Buku yang dibeli." },
      { label: "Keterangan tempat", text: "Dia belajar di perpustakaan." },
      { label: "Keterangan waktu", text: "Kami bertemu kemarin." },
    ],
    tips: ["Objek: yang kena tindakan.", "Keterangan: tempat, waktu, cara.", "Gunakan kata tanya: apa (objek), di mana/kapan (keterangan)."],
    beforePracticePrompt: "Cari objek dan keterangan!",
  },
  "Kalimat Efektif": {
    title: "Kalimat Efektif",
    levelBand: "menengah",
    summary: "Kalimat efektif adalah kalimat yang jelas, ringkas, dan mudah dipahami.",
    explanation: "Kalimat efektif tidak bertele-tele. Langsung ke inti. Gunakan kata yang tepat. Hindari kata yang tidak perlu. Contoh: 'Menurut pendapat saya, saya rasa bahwa...' — terlalu panjang. Cukup: 'Saya rasa...'",
    examples: [
      { label: "Tidak efektif", text: "Menurut pendapat saya, saya rasa bahwa buku ini sangat bagus sekali.", note: "Terlalu banyak kata." },
      { label: "Efektif", text: "Buku ini sangat bagus.", note: "Jelas dan ringkas." },
    ],
    tips: ["Hindari kata yang tidak perlu.", "Gunakan kata yang tepat.", "Baca ulang: apa ada yang bisa dipersingkat?"],
    beforePracticePrompt: "Pilih kalimat yang paling efektif!",
  },
  "Kalimat Tidak Efektif": {
    title: "Kalimat Tidak Efektif",
    levelBand: "menengah",
    summary: "Kalimat tidak efektif bertele-tele, ambigu, atau boros kata.",
    explanation: "Kalimat tidak efektif sering punya masalah: (1) Boros kata — banyak kata tapi sedikit makna. (2) Ambigu — bisa ditafsirkan dua cara. (3) Tidak logis — susunannya aneh. Tugasmu: temukan kalimat yang tidak efektif dan perbaiki.",
    examples: [
      { label: "Boros kata", text: "Adalah merupakan... (cukup 'adalah' atau 'merupakan')", note: "Jangan pakai dua kata yang sama arti." },
      { label: "Ambigu", text: "Kucingku suka memakan tikus itu gemuk. (Siapa yang gemuk?)", note: "Perbaiki: Kucingku suka memakan tikus yang gemuk itu." },
    ],
    tips: ["Satu ide cukup satu kalimat.", "Hindari kata mubazir.", "Pastikan kalimat tidak punya dua arti."],
    beforePracticePrompt: "Temukan kalimat yang tidak efektif!",
  },
  "Memperbaiki Kalimat": {
    title: "Memperbaiki Kalimat",
    levelBand: "menengah",
    summary: "Perbaiki kalimat yang salah agar jadi efektif dan benar.",
    explanation: "Kalimat yang salah perlu diperbaiki. Bisa karena susunan katanya kacau, kata tidak baku, atau tidak efektif. Contoh: 'Dia pergi ke ke sekolah.' → perbaiki: 'Dia pergi ke sekolah.' (ke-nya dobel).",
    examples: [
      { label: "Ke- dobel", text: "Salah: Dia pergi ke ke sekolah. Benar: Dia pergi ke sekolah." },
      { label: "Kata tidak perlu", text: "Salah: Sangat amat bagus sekali. Benar: Sangat bagus." },
    ],
    tips: ["Baca keras-keras untuk cari kesalahan.", "Periksa kata yang dobel.", "Hapus kata yang tidak perlu."],
    beforePracticePrompt: "Ayo perbaiki kalimat yang salah!",
  },
  "Latihan Cepat Level 6": {
    title: "Latihan Cepat Level 6 — Semua materi kalimat jelas",
    levelBand: "menengah",
    summary: "Ulang semua tentang kalimat yang jelas dan efektif!",
    explanation: "Level 6 membahas subjek/predikat, objek/keterangan, kalimat efektif, tidak efektif, dan cara memperbaikinya.",
    examples: [{ label: "Yang sudah dipelajari", text: "S+P, O+K, kalimat efektif, kalimat tidak efektif, perbaikan" }],
    tips: ["Setiap kalimat butuh subjek dan predikat.", "Kalimat efektif = jelas + ringkas.", "Buang kata yang tidak perlu."],
    beforePracticePrompt: "Ayo kerjakan soal campuran level 6!",
  },

  // ==================== LEVEL 7: Kata Penghubung (menengah) ====================
  "Kata Depan di, ke, dari": {
    title: "Kata Depan di, ke, dari",
    levelBand: "menengah",
    summary: "Kata depan di, ke, dari menunjukkan tempat atau asal. Ditulis terpisah dari kata berikutnya.",
    explanation: "Kata depan 'di', 'ke', 'dari' dipakai untuk menunjukkan tempat, arah, atau asal. Penting: ditulis TERPISAH dari kata yang mengikutinya. Contoh: 'di rumah' (bukan 'dirumah'), 'ke sekolah', 'dari pasar'. Ini beda dengan imbuhan seperti 'dimakan' yang ditulis serangkai.",
    examples: [
      { label: "di + tempat", text: "di rumah, di sekolah, di pasar", note: "Ditulis terpisah!" },
      { label: "ke + arah", text: "ke rumah, ke sekolah, ke pasar" },
      { label: "dari + asal", text: "dari rumah, dari Jakarta" },
    ],
    tips: ["di, ke, dari = kata depan → dipisah.", "di sebagai imbuhan → digabung (dimakan).", "Tes: kalau bisa diganti 'dari', berarti kata depan."],
    beforePracticePrompt: "Pilih penulisan di, ke, dari yang benar!",
  },
  "Konjungsi dan, tetapi, karena": {
    title: "Konjungsi dan, tetapi, karena",
    levelBand: "menengah",
    summary: "Konjungsi adalah kata hubung: dan (tambah), tetapi (lawan), karena (sebab).",
    explanation: "Konjungsi menghubungkan kata atau kalimat. 'Dan' untuk menambah. 'Tetapi' untuk melawan. 'Karena' untuk sebab. Contoh: 'Aku suka mangga dan jeruk.' 'Dia pintar tetapi malas.' 'Aku bahagia karena dapat hadiah.'",
    examples: [
      { label: "Dan (tambah)", text: "Aku suka mangga dan jeruk.", note: "Keduanya sama-sama disukai." },
      { label: "Tetapi (lawan)", text: "Dia pintar tetapi malas.", note: "Pintar vs malas — berlawanan." },
      { label: "Karena (sebab)", text: "Aku bahagia karena dapat hadiah.", note: "Karena = alasan." },
    ],
    tips: ["dan: menambah informasi.", "tetapi: menunjukkan pertentangan.", "karena: memberikan alasan."],
    beforePracticePrompt: "Pilih konjungsi yang tepat!",
  },
  "Urutan Waktu": {
    title: "Urutan Waktu",
    levelBand: "menengah",
    summary: "Kata hubung waktu: kemudian, lalu, setelah itu, sebelum, sesudah.",
    explanation: "Kata hubung waktu menunjukkan urutan kejadian. 'Kemudian' dan 'lalu' berarti setelah itu. 'Sebelum' berarti lebih dulu. 'Sesudah' berarti setelah. Contoh: 'Aku mandi, lalu sarapan.' 'Sebelum sekolah, aku sarapan dulu.'",
    examples: [
      { label: "Kemudian / Lalu", text: "Aku mandi, lalu sarapan.", note: "Urutan: mandi dulu, baru sarapan." },
      { label: "Sebelum", text: "Sebelum tidur, aku baca buku." },
      { label: "Setelah itu", text: "Setelah itu, kami pergi ke sekolah." },
    ],
    tips: ["Urutan waktu membantu cerita rapi.", "'Sebelum' = lebih dulu.", "'Setelah/lalu/kemudian' = lebih akhir."],
    beforePracticePrompt: "Urutkan waktu dengan kata hubung yang tepat!",
  },
  "Sebab Akibat": {
    title: "Sebab Akibat",
    levelBand: "menengah",
    summary: "Kata hubung sebab akibat: karena, sehingga, oleh karena itu, maka.",
    explanation: "Sebab adalah alasan. Akibat adalah hasilnya. Contoh: 'Karena hujan, aku tidak berangkat.' → hujan (sebab), tidak berangkat (akibat). 'Dia belajar keras, sehingga lulus ujian.'",
    examples: [
      { label: "Karena (sebab)", text: "Karena hujan, tanah menjadi basah.", note: "Hujan = sebab, basah = akibat." },
      { label: "Sehingga (akibat)", text: "Dia belajar keras, sehingga lulus.", note: "Belajar = sebab, lulus = akibat." },
    ],
    tips: ["Tanya: mengapa? → jawabannya sebab.", "Tanya: apa hasilnya? → jawabannya akibat.", "Karena → sebab. Sehingga → akibat."],
    beforePracticePrompt: "Tentukan sebab dan akibat!",
  },
  "Menggabungkan Kalimat": {
    title: "Menggabungkan Kalimat",
    levelBand: "menengah",
    summary: "Gabungkan dua kalimat pendek jadi satu kalimat dengan kata hubung.",
    explanation: "Dua kalimat pendek bisa digabung jadi satu kalimat yang lebih panjang. Gunakan kata hubung yang tepat. Contoh: 'Aku lapar. Aku makan.' → 'Aku lapar, lalu makan.' Atau 'Aku lapar, sehingga aku makan.'",
    examples: [
      { label: "Dengan 'dan'", text: "Kalimat 1: Aku suka kopi. Kalimat 2: Aku suka teh. Gabung: Aku suka kopi dan teh." },
      { label: "Dengan 'karena'", text: "Aku tidak masuk. Aku sakit. → Aku tidak masuk karena sakit." },
    ],
    tips: ["Pilih kata hubung yang sesuai.", "Hapus kata yang dobel.", "Baca hasil gabungan: apakah terdengar alami?"],
    beforePracticePrompt: "Gabungkan kalimat dengan kata hubung!",
  },
  "Latihan Cepat Level 7": {
    title: "Latihan Cepat Level 7 — Semua materi kata penghubung",
    levelBand: "menengah",
    summary: "Ulang semua tentang kata penghubung!",
    explanation: "Level 7 membahas kata depan di/ke/dari, konjungsi dan/tetapi/karena, urutan waktu, sebab akibat, dan menggabungkan kalimat.",
    examples: [{ label: "Yang sudah dipelajari", text: "di/ke/dari, dan/tetapi/karena, waktu, sebab akibat, gabung kalimat" }],
    tips: ["Kata depan = di, ke, dari (dipisah).", "Konjungsi menghubungkan kata/kalimat.", "Sebab-akibat: karena → sehingga."],
    beforePracticePrompt: "Ayo kerjakan soal campuran level 7!",
  },

  // ==================== LEVEL 8: Paragraf (menengah) ====================
  "Kalimat Utama": {
    title: "Kalimat Utama",
    levelBand: "menengah",
    summary: "Kalimat utama adalah kalimat paling penting dalam paragraf. Biasanya di awal.",
    explanation: "Dalam satu paragraf, ada satu kalimat yang menjadi inti. Namanya kalimat utama. Biasanya di awal paragraf. Kalimat lain adalah penjelas. Contoh: 'Kucing adalah hewan peliharaan yang lucu. Bulunya lembut. Matanya bulat. Ia suka bermain.' → Kalimat utama: 'Kucing adalah hewan peliharaan yang lucu.'",
    examples: [
      { label: "Kalimat utama di awal", text: "Sekolah adalah tempat belajar. Di sana kita bertemu teman. Kita juga belajar dari guru.", note: "Kalimat pertama adalah inti." },
      { label: "Kalimat utama di akhir", text: "Setiap pagi aku bangun jam 5. Aku mandi dan sarapan. Lalu aku berangkat. Itulah rutinitasku.", note: "Kadang di akhir sebagai simpulan." },
    ],
    tips: ["Cari kalimat yang merangkum semua.", "Kalimat utama bisa di awal, tengah, atau akhir.", "Tanpa kalimat utama, paragraf tidak punya arah."],
    beforePracticePrompt: "Temukan kalimat utama!",
  },
  "Gagasan Utama": {
    title: "Gagasan Utama",
    levelBand: "menengah",
    summary: "Gagasan utama adalah inti dari paragraf. Apa yang ingin disampaikan penulis?",
    explanation: "Gagasan utama beda dengan kalimat utama. Kalimat utama adalah kalimatnya. Gagasan utama adalah inti pesannya. Contoh paragraf tentang kucing: gagasan utamanya 'kucing adalah hewan lucu'. Bisa ditulis dalam satu frase, bukan kalimat lengkap.",
    examples: [
      { label: "Gagasan utama", text: "Paragraf tentang kucing → gagasan utamanya: kelucuan kucing." },
      { label: "Coba cari", text: "'Belajar bahasa Indonesia menyenangkan. Banyak kosakata baru. Kita bisa baca buku seru.' → Gagasan utama: keseruan belajar bahasa Indonesia." },
    ],
    tips: ["Tanya: 'Apa inti paragraf ini?'", "Jawab dalam 3-5 kata.", "Gagasan utama adalah jawabannya."],
    beforePracticePrompt: "Temukan gagasan utama paragraf!",
  },
  "Gagasan Pendukung": {
    title: "Gagasan Pendukung",
    levelBand: "menengah",
    summary: "Gagasan pendukung menjelaskan atau mendukung gagasan utama.",
    explanation: "Setelah gagasan utama, ada kalimat pendukung. Mereka memberi detail, contoh, atau alasan. Contoh: Gagasan utama: 'Kucing lucu.' Pendukung: 'Bulunya lembut.' 'Matanya bulat.' 'Ia suka bermain.'",
    examples: [
      { label: "Gagasan utama + pendukung", text: "Gagasan utama: 'Berolahraga itu sehat.' Pendukung: 'Olahraga membuat badan bugar.' 'Juga mencegah penyakit.' 'Kita jadi lebih bersemangat.'", note: "Pendukung memperkuat gagasan utama." },
    ],
    tips: ["Gagasan utama = inti.", "Pendukung = detail.", "Paragraf yang baik punya 2-3 pendukung."],
    beforePracticePrompt: "Bedakan gagasan utama dan pendukung!",
  },
  "Urutan Paragraf": {
    title: "Urutan Paragraf",
    levelBand: "menengah",
    summary: "Paragraf harus urut: dari pembukaan, isi, sampai penutup.",
    explanation: "Paragraf yang baik punya urutan yang jelas. Mulai dari kalimat utama, lalu penjelasan, lalu simpulan (kalau perlu). Contoh: 1) 'Belajar itu penting.' 2) 'Dengan belajar, kita tahu banyak hal.' 3) 'Jadi, belajarlah setiap hari.'",
    examples: [
      { label: "Urutan yang benar", text: "1. Aku suka membaca. 2. Setiap hari aku baca buku. 3. Buku membuatku pintar.", note: "Dari umum ke khusus." },
    ],
    tips: ["Mulai dari kalimat utama.", "Lalu beri penjelasan.", "Akhiri dengan simpulan."],
    beforePracticePrompt: "Urutkan kalimat jadi paragraf yang baik!",
  },
  "Menyusun Paragraf Pendek": {
    title: "Menyusun Paragraf Pendek",
    levelBand: "menengah",
    summary: "Susun 3-5 kalimat jadi paragraf yang padu dan jelas.",
    explanation: "Sekarang giliranmu menyusun paragraf. Kamu akan diberikan beberapa kalimat. Tugasmu: susun jadi paragraf yang baik. Pastikan ada kalimat utama, penjelas, dan urutan yang logis.",
    examples: [
      { label: "Kalimat acak", text: "Harimau suka daging. Harimau adalah hewan buas. Ia hidup di hutan." },
      { label: "Paragraf tersusun", text: "Harimau adalah hewan buas. Ia hidup di hutan. Harimau suka daging.", note: "Urut: perkenalan → tempat → kebiasaan." },
    ],
    tips: ["Cari kalimat yang paling umum = kalimat utama.", "Urutkan sisanya secara logis.", "Baca hasilnya: apakah terdengar wajar?"],
    beforePracticePrompt: "Susun paragraf yang baik!",
  },
  "Latihan Cepat Level 8": {
    title: "Latihan Cepat Level 8 — Semua materi paragraf",
    levelBand: "menengah",
    summary: "Ulang semua tentang paragraf!",
    explanation: "Level 8 membahas kalimat utama, gagasan utama, gagasan pendukung, urutan paragraf, dan menyusun paragraf pendek.",
    examples: [{ label: "Yang sudah dipelajari", text: "Kalimat utama, gagasan utama, pendukung, urutan, menyusun paragraf" }],
    tips: ["Kalimat utama = inti paragraf.", "Gagasan utama = inti pesan.", "Pendukung = detail.", "Urutkan secara logis."],
    beforePracticePrompt: "Ayo kerjakan soal campuran level 8!",
  },

  // ==================== LEVEL 9: Membaca Pemahaman (tinggi) ====================
  "Informasi Tersurat": {
    title: "Informasi Tersurat",
    levelBand: "tinggi",
    summary: "Informasi tersurat adalah informasi yang tertulis jelas dalam teks. Tinggal cari dan baca.",
    explanation: "Informasi tersurat adalah informasi yang langsung ada di teks. Kamu tidak perlu menebak atau menyimpulkan. Tinggal cari kata kuncinya. Contoh: Teks: 'Budi lahir di Jakarta pada 1 Januari.' Tanya: Di mana Budi lahir? Jawab: Jakarta (tersurat jelas).",
    examples: [
      { label: "Teks", text: "Harga tiket kereta Rp50.000. Kereta berangkat pukul 08.00." },
      { label: "Pertanyaan", text: "Berapa harga tiket kereta? Rp50.000 (tersurat). Jam berapa berangkat? 08.00 (tersurat).", note: "Semua ada di teks." },
    ],
    tips: ["Baca pertanyaan dulu, lalu cari di teks.", "Cari kata kunci yang sama.", "Informasi tersurat: tidak perlu berpikir keras."],
    beforePracticePrompt: "Cari informasi tersurat dalam teks!",
  },
  "Informasi Tersirat": {
    title: "Informasi Tersirat",
    levelBand: "tinggi",
    summary: "Informasi tersirat tidak tertulis langsung. Kamu harus menyimpulkan dari petunjuk.",
    explanation: "Informasi tersirat berbeda dengan tersurat. Tersirat tidak ada di teks secara langsung. Kamu harus membaca 'di balik' kata-kata. Contoh: 'Rina memakai jaket tebal dan syal.' → Tersirat: cuaca dingin. Tidak disebut langsung, tapi bisa disimpulkan dari jaket dan syal.",
    examples: [
      { label: "Teks", text: "Adi menguap berkali-kali. Matanya sayu." },
      { label: "Pertanyaan", text: "Bagaimana perasaan Adi? Tersirat: Adi mengantuk.", note: "Menguap dan mata sayu adalah petunjuk." },
    ],
    tips: ["Cari petunjuk dalam teks.", "Hubungkan petunjuk dengan pengetahuanmu.", "Informasi tersirat butuh berpikir sedikit lebih dalam."],
    beforePracticePrompt: "Baca tersirat di balik teks!",
  },
  "Menjawab Pertanyaan Teks": {
    title: "Menjawab Pertanyaan Teks",
    levelBand: "tinggi",
    summary: "Baca teks, lalu jawab pertanyaan berdasarkan isi teks.",
    explanation: "Kamu akan diberi teks pendek dan beberapa pertanyaan. Baca teks dengan saksama. Beberapa jawaban tersurat (langsung ada di teks), beberapa tersirat (perlu disimpulkan). Strategi: baca pertanyaan dulu, lalu cari jawabannya di teks.",
    examples: [
      { label: "Teks", text: "Taman kota sangat ramai di akhir pekan. Anak-anak bermain bola. Orang tua duduk di bangku taman." },
      { label: "Pertanyaan", text: "Kapan taman ramai? (Akhir pekan — tersurat). Siapa yang bermain bola? (Anak-anak — tersurat). Bagaimana suasana? (Ramai — tersirat dari 'ramai')." },
    ],
    tips: ["Baca pertanyaan dulu, baru teks.", "Coret jawaban yang jelas salah.", "Untuk tersirat: gabungkan info dari beberapa kalimat."],
    beforePracticePrompt: "Jawab pertanyaan berdasarkan teks!",
  },
  "Menemukan Tujuan Teks": {
    title: "Menemukan Tujuan Teks",
    levelBand: "tinggi",
    summary: "Tujuan teks adalah apa yang ingin dicapai penulis. Apakah ingin memberitahu, menghibur, atau meyakinkan?",
    explanation: "Setiap teks ditulis dengan tujuan tertentu. Tujuan bisa: (1) Memberitahu informasi — teks berita. (2) Menghibur — cerita. (3) Meyakinkan — iklan atau pidato. Tentukan tujuan dengan melihat jenis teks dan cara penulisannya.",
    examples: [
      { label: "Tujuan memberitahu", text: "'Harga BBM naik 10%.' — Teks berita, tujuan: memberitahu." },
      { label: "Tujuan menghibur", text: "'Pada suatu hari, kancil bertemu buaya...' — Cerita, tujuan: menghibur." },
      { label: "Tujuan meyakinkan", text: "'Belilah produk ini, dijamin berkualitas!' — Iklan, tujuan: meyakinkan." },
    ],
    tips: ["Tanya: 'Penulis ingin apa?'", "Perhatikan jenis teks.", "Perhatikan kata-kata yang dipilih penulis."],
    beforePracticePrompt: "Tentukan tujuan dari teks!",
  },
  "Menyimpulkan Isi Teks": {
    title: "Menyimpulkan Isi Teks",
    levelBand: "tinggi",
    summary: "Simpulan adalah ringkasan inti dari seluruh teks dalam satu atau dua kalimat.",
    explanation: "Menyimpulkan berarti mengambil inti dari bacaan. Bukan menyalin kalimat, tapi merangkum dengan kata-katamu sendiri. Simpulan yang baik mencakup gagasan utama dan tidak menambahkan informasi baru. Contoh: Teks tentang kucing → simpulan: Kucing adalah hewan lucu yang suka bermain dan dibelai.",
    examples: [
      { label: "Teks", text: "Olahraga bermanfaat bagi kesehatan. Olahraga membuat jantung sehat, tulang kuat, dan tidur nyenyak. Disarankan olahraga 30 menit setiap hari." },
      { label: "Simpulan", text: "Olahraga sangat bermanfaat untuk kesehatan tubuh dan disarankan dilakukan rutin 30 menit sehari.", note: "Inti teks dirangkum tanpa menambah info baru." },
    ],
    tips: ["Cari gagasan utama paragraf.", "Gabungkan dengan kata-katamu sendiri.", "Jangan tambah pendapat pribadi."],
    beforePracticePrompt: "Simpulkan isi teks dengan kata-katamu!",
  },
  "Latihan Cepat Level 9": {
    title: "Latihan Cepat Level 9 — Semua materi membaca pemahaman",
    levelBand: "tinggi",
    summary: "Ulang semua tentang membaca pemahaman!",
    explanation: "Level 9 membahas informasi tersurat dan tersirat, menjawab pertanyaan, menemukan tujuan teks, dan menyimpulkan isi teks. Semua tentang bagaimana memahami bacaan dengan baik.",
    examples: [{ label: "Yang sudah dipelajari", text: "Informasi tersurat/tersirat, menjawab pertanyaan, tujuan teks, menyimpulkan" }],
    tips: ["Tersurat = jelas di teks.", "Tersirat = perlu disimpulkan.", "Tujuan = apa yang penulis mau.", "Simpulan = inti bacaan."],
    beforePracticePrompt: "Ayo kerjakan soal campuran level 9!",
  },

  // ==================== LEVEL 10: Bernalar dalam Bahasa (tinggi) ====================
  "Fakta dan Opini": {
    title: "Fakta dan Opini",
    levelBand: "tinggi",
    summary: "Fakta adalah kebenaran yang bisa dibuktikan. Opini adalah pendapat yang bisa berbeda-beda.",
    explanation: "Fakta adalah informasi yang benar-benar terjadi dan bisa dibuktikan. Contoh: 'Indonesia merdeka tahun 1945.' Opini adalah pendapat seseorang yang belum tentu benar untuk semua orang. Contoh: 'Bahasa Indonesia adalah bahasa yang paling indah.' — itu opini, karena orang bisa tidak setuju. Penting: bedakan fakta dan opini saat membaca berita atau iklan.",
    examples: [
      { label: "Fakta", text: "Matahari terbit di timur. Air mendidih pada suhu 100°C.", note: "Bisa dibuktikan." },
      { label: "Opini", text: "Matahari terbit itu pemandangan paling indah. Air mendidih itu membosankan.", note: "Pendapat pribadi." },
    ],
    tips: ["Fakta: bisa dicek kebenarannya.", "Opini: sering pakai kata 'menurut', 'sebaiknya', 'paling'.", "Di berita, bedakan fakta dan opini penulis."],
    beforePracticePrompt: "Bedakan fakta dan opini!",
  },
  "Alasan dan Bukti": {
    title: "Alasan dan Bukti",
    levelBand: "tinggi",
    summary: "Alasan adalah penjelasan mengapa sesuatu terjadi. Bukti adalah data yang mendukung alasan.",
    explanation: "Alasan menjawab 'mengapa'. Bukti menjawab 'apa buktinya'. Contoh: 'Belajar itu penting (alasan) karena dengan belajar kita bisa sukses (alasan). Bukti: 90% orang sukses rajin belajar.' Alasan tanpa bukti lemah. Bukti membuat argumen lebih kuat.",
    examples: [
      { label: "Alasan", text: "Kita harus membaca karena membaca menambah pengetahuan.", note: "Mengapa? Membaca menambah pengetahuan." },
      { label: "Bukti", text: "Penelitian menunjukkan: orang yang rajin membaca punya kosakata 2x lebih banyak.", note: "Data mendukung alasan." },
    ],
    tips: ["Alasan: jawab 'mengapa'.", "Bukti: data, fakta, contoh.", "Argumen kuat = alasan + bukti."],
    beforePracticePrompt: "Cari alasan dan bukti!",
  },
  "Sebab dan Akibat": {
    title: "Sebab dan Akibat (Level Menengah)",
    levelBand: "tinggi",
    summary: "Sebab adalah penyebab. Akibat adalah hasil. Hubungan sebab-akibat ada di mana-mana.",
    explanation: "Hubungan sebab-akibat adalah salah satu pola berpikir paling penting. Sebab adalah sesuatu yang membuat hal lain terjadi. Akibat adalah hasilnya. Contoh: 'Hujan deras (sebab) menyebabkan banjir (akibat).' Dalam teks, cari kata seperti 'karena', 'sehingga', 'akibatnya', 'disebabkan oleh'.",
    examples: [
      { label: "Sebab → Akibat", text: "Tidak belajar (sebab) → nilai jelek (akibat).", note: "Logis dan bisa dijelaskan." },
      { label: "Akibat → Sebab", text: "Banjir terjadi (akibat) karena hujan deras (sebab)." },
    ],
    tips: ["Cari kata kunci: karena, sehingga, akibatnya.", "Tanya: apa penyebabnya? apa hasilnya?", "Sebab-akibat bisa bolak-balik dalam kalimat."],
    beforePracticePrompt: "Tentukan sebab dan akibat dengan tepat!",
  },
  "Membandingkan Informasi": {
    title: "Membandingkan Informasi",
    levelBand: "tinggi",
    summary: "Bandingkan dua teks atau informasi. Cari persamaan dan perbedaannya.",
    explanation: "Membandingkan berarti mencari persamaan dan perbedaan. Misalnya bandingkan dua iklan produk. Iklan A: 'Murah dan tahan lama.' Iklan B: 'Berkualitas tinggi.' Persamaan: keduanya menjual produk. Perbedaan: A fokus harga, B fokus kualitas.",
    examples: [
      { label: "Teks A", text: "Belajar di rumah lebih nyaman. Bisa istirahat kapan saja." },
      { label: "Teks B", text: "Belajar di sekolah lebih fokus. Ada guru yang membimbing." },
      { label: "Perbandingan", text: "Persamaan: sama-sama tempat belajar. Perbedaan: rumah lebih nyaman, sekolah lebih fokus.", note: "Bandingkan dari sudut pandang yang sama." },
    ],
    tips: ["Buat tabel: kiri A, kanan B.", "Cari persamaan dulu, baru perbedaan.", "Bandingkan aspek yang sama (harga, kualitas, dll)."],
    beforePracticePrompt: "Bandingkan dua informasi!",
  },
  "Menilai Pernyataan": {
    title: "Menilai Pernyataan",
    levelBand: "tinggi",
    summary: "Nilai apakah pernyataan itu benar, salah, atau tidak bisa ditentukan berdasarkan teks.",
    explanation: "Tidak semua pernyataan bisa langsung dinilai benar atau salah. Ada tiga kemungkinan: (1) Benar — sesuai dengan teks. (2) Salah — bertentangan dengan teks. (3) Tidak bisa ditentukan — tidak ada informasi di teks. Ini butuh pemahaman yang cermat.",
    examples: [
      { label: "Teks", text: "Andi membeli 2 buku seharga Rp50.000." },
      { label: "Pernyataan", text: "'Andi membeli buku di toko.' — Tidak bisa ditentukan (tidak disebut di teks). 'Andi membayar Rp50.000.' — Benar (sesuai teks).", note: "Jangan menebak di luar teks!" },
    ],
    tips: ["Hanya pakai info dari teks.", "Kalau tidak disebut = tidak bisa ditentukan.", "Jangan pakai pengetahuan di luar teks."],
    beforePracticePrompt: "Nilai pernyataan berdasarkan teks!",
  },
  "Latihan Cepat Level 10": {
    title: "Latihan Cepat Level 10 — Semua materi bernalar",
    levelBand: "tinggi",
    summary: "Ulang semua tentang bernalar dalam bahasa!",
    explanation: "Level 10 membahas fakta/opini, alasan/bukti, sebab/akibat, membandingkan informasi, dan menilai pernyataan. Semua tentang berpikir kritis menggunakan bahasa.",
    examples: [{ label: "Yang sudah dipelajari", text: "Fakta/opini, alasan/bukti, sebab/akibat, bandingkan, nilai pernyataan" }],
    tips: ["Fakta = bisa dibuktikan.", "Opini = pendapat.", "Sebab → akibat.", "Bandingkan dengan cermat.", "Nilai hanya dari teks."],
    beforePracticePrompt: "Ayo kerjakan soal campuran level 10!",
  },

  // ==================== LEVEL 11: Menulis Ringkas (tinggi) ====================
  "Menulis Kalimat Pendek": {
    title: "Menulis Kalimat Pendek",
    levelBand: "tinggi",
    summary: "Kalimat pendek lebih mudah dipahami. Satu kalimat = satu ide.",
    explanation: "Kalimat panjang kadang membingungkan. Prinsip: satu kalimat = satu ide. Kalau kamu punya dua ide, buat dua kalimat. Contoh: 'Aku bangun tidur lalu mandi lalu sarapan lalu berangkat.' Lebih baik: 'Aku bangun tidur. Lalu mandi. Lalu sarapan. Lalu berangkat.' — lebih jelas.",
    examples: [
      { label: "Kalimat terlalu panjang", text: "Dia pergi ke toko membeli buku pensil dan penggaris lalu pulang ke rumah karena hujan.", note: "Terlalu banyak informasi." },
      { label: "Kalimat pendek", text: "Dia pergi ke toko. Di sana dia membeli buku, pensil, dan penggaris. Setelah itu dia pulang karena hujan.", note: "Lebih mudah dipahami." },
    ],
    tips: ["Satu ide = satu kalimat.", "Baca keras-keras: kalau kehabisan napas, terlalu panjang.", "Gunakan titik untuk memisahkan ide."],
    beforePracticePrompt: "Tulis kalimat pendek yang jelas!",
  },
  "Membuat Ringkasan": {
    title: "Membuat Ringkasan",
    levelBand: "tinggi",
    summary: "Ringkasan adalah versi pendek dari teks yang hanya memuat inti.",
    explanation: "Membuat ringkasan itu seperti mengekstrak sari buah. Kamu ambil intinya, buang yang tidak penting. Cara: (1) Baca seluruh teks. (2) Tandai gagasan utama setiap paragraf. (3) Tulis ulang dengan kata-katamu sendiri. (4) Pastikan tidak menambah pendapat pribadi.",
    examples: [
      { label: "Teks asli", text: "Kucing adalah hewan peliharaan yang populer. Kucing mudah dirawat. Mereka bersih dan mandiri. Kucing juga lucu dan suka bermain." },
      { label: "Ringkasan", text: "Kucing adalah hewan peliharaan populer karena mudah dirawat, bersih, mandiri, dan lucu.", note: "Inti tersampaikan tanpa detail berlebihan." },
    ],
    tips: ["Baca dulu seluruh teks.", "Cari kalimat utama tiap paragraf.", "Tulis dengan kata-katamu sendiri.", "Ringkasan lebih pendek dari aslinya."],
    beforePracticePrompt: "Buat ringkasan dari teks!",
  },
  "Memilih Judul": {
    title: "Memilih Judul",
    levelBand: "tinggi",
    summary: "Judul yang baik mewakili isi seluruh teks. Judul harus menarik dan jelas.",
    explanation: "Judul adalah 'wajah' dari tulisan. Judul yang baik: (1) Mewakili isi. (2) Menarik perhatian. (3) Tidak terlalu panjang. Contoh: Untuk teks tentang manfaat membaca, judul 'Membaca Itu Penting' lebih baik daripada 'Tentang Buku'. Cara memilih: baca seluruh teks, lalu pikirkan satu frase yang merangkum semuanya.",
    examples: [
      { label: "Teks", text: "Bermain musik membuat otak aktif. Musik juga mengurangi stres. Anak yang bermain musik lebih kreatif." },
      { label: "Judul tepat", text: "'Manfaat Bermain Musik' — mewakili seluruh teks.", note: "Judul mencakup semua isi." },
      { label: "Judul kurang tepat", text: "'Tentang Gitar' — hanya menyebut alat musik, bukan manfaatnya." },
    ],
    tips: ["Judul harus mencakup isi seluruh teks.", "Buat yang menarik, tapi tetap relevan.", "Hindari judul yang terlalu panjang (maks 5-6 kata)."],
    beforePracticePrompt: "Pilih judul yang paling tepat!",
  },
  "Menghapus Kata Berlebihan": {
    title: "Menghapus Kata Berlebihan",
    levelBand: "tinggi",
    summary: "Buang kata yang tidak perlu. Tulisan yang baik itu ringkas.",
    explanation: "Kata berlebihan (mubazir) membuat tulisan bertele-tele. Contoh umum: 'sangat amat' (cukup 'sangat'), 'adalah merupakan' (cukup 'adalah' atau 'merupakan'), 'agar supaya' (cukup 'agar'). Baca ulang tulisannya. Kata apa yang bisa dihapus tanpa mengubah arti?",
    examples: [
      { label: "Sebelum", text: "Demi untuk kepentingan bersama, maka kita semua harus saling bekerja sama.", note: "Banyak kata mubazir." },
      { label: "Sesudah", text: "Demi kepentingan bersama, kita harus bekerja sama.", note: "Lebih ringkas dan jelas." },
    ],
    tips: ["Hapus kata yang artinya sudah tercakup.", "Hindari pengulangan makna.", "Baca ulang dan tanya: apa perlu kata ini?"],
    beforePracticePrompt: "Hapus kata yang berlebihan!",
  },
  "Menulis Pesan yang Jelas": {
    title: "Menulis Pesan yang Jelas",
    levelBand: "tinggi",
    summary: "Pesan yang jelas: sampaikan inti di awal, beri detail secukupnya, akhiri dengan ajakan.",
    explanation: "Pesan yang baik punya struktur: (1) Pembuka — sampaikan inti. (2) Isi — detail secukupnya. (3) Penutup — ajakan atau tindakan selanjutnya. Contoh pesan: 'Halo, rapat mingguan kita hari Jumat jam 10. Tolong siapkan laporan. Terima kasih.' — jelas, langsung ke inti.",
    examples: [
      { label: "Pesan kurang jelas", text: "Halo, besok ada rapat ya, bawa laporan kalau bisa, makasih.", note: "Kapan? Jam berapa?" },
      { label: "Pesan jelas", text: "Halo, besok Rabu jam 10 ada rapat di ruang A. Tolong bawa laporan mingguan. Terima kasih.", note: "Lengkap: hari, jam, tempat, yang dibawa." },
    ],
    tips: ["Sebut: siapa, apa, kapan, di mana.", "Gunakan kalimat pendek.", "Pastikan penerima tidak perlu bertanya lagi."],
    beforePracticePrompt: "Tulis pesan yang jelas!",
  },
  "Latihan Cepat Level 11": {
    title: "Latihan Cepat Level 11 — Semua materi menulis ringkas",
    levelBand: "tinggi",
    summary: "Ulang semua tentang menulis ringkas!",
    explanation: "Level 11 membahas menulis kalimat pendek, membuat ringkasan, memilih judul, menghapus kata berlebihan, dan menulis pesan jelas. Semua tentang komunikasi efektif.",
    examples: [{ label: "Yang sudah dipelajari", text: "Kalimat pendek, ringkasan, judul, hapus kata mubazir, pesan jelas" }],
    tips: ["Kalimat pendek = satu ide.", "Ringkasan = inti saja.", "Judul = wajah tulisan.", "Buang kata tidak perlu.", "Pesan = siapa, apa, kapan, di mana."],
    beforePracticePrompt: "Ayo kerjakan soal campuran level 11!",
  },

  // ==================== LEVEL 12: Mahir Berbahasa (tinggi) ====================
  "Membaca Teks Panjang": {
    title: "Membaca Teks Panjang",
    levelBand: "tinggi",
    summary: "Baca teks yang lebih panjang. Gunakan teknik membaca cepat dan pahami intinya.",
    explanation: "Membaca teks panjang butuh strategi: (1) Baca judul dan subjudul dulu. (2) Baca kalimat pertama setiap paragraf. (3) Cari kata kunci. (4) Jangan membaca kata per kata — baca dalam kelompok kata. Semakin sering latihan, semakin cepat kamu membaca tanpa kehilangan pemahaman.",
    examples: [
      { label: "Strategi membaca cepat", text: "1. Lihat judul. 2. Baca kalimat pertama tiap paragraf. 3. Cari kata kunci (nama, angka, tanggal). 4. Simpulkan.", note: "Latihan tiap hari." },
    ],
    tips: ["Jangan baca kata per kata.", "Fokus pada kata kunci.", "Latihan membaca cepat 5 menit setiap hari."],
    beforePracticePrompt: "Baca teks panjang dan jawab pertanyaannya!",
  },
  "Menyunting Kalimat": {
    title: "Menyunting Kalimat",
    levelBand: "tinggi",
    summary: "Sunting kalimat: perbaiki ejaan, tanda baca, pilihan kata, dan struktur kalimat.",
    explanation: "Menyunting adalah memeriksa dan memperbaiki tulisan. Yang perlu diperiksa: (1) Ejaan — sudah sesuai EYD? (2) Tanda baca — titik, koma, dll. (3) Pilihan kata — sudah tepat? (4) Struktur kalimat — tidak ambigu? Contoh: 'Ibu pergi ke kepasar' → diperbaiki: 'Ibu pergi ke pasar.'",
    examples: [
      { label: "Sebelum disunting", text: "Dia membeli baju baru, sepatu, dan tas. Lalu dia sangat amat senang." },
      { label: "Sesudah disunting", text: "Dia membeli baju baru, sepatu, dan tas. Lalu dia sangat senang.", note: "'sangat amat' → 'sangat'." },
    ],
    tips: ["Baca ulang tulisanmu.", "Cek ejaan dan tanda baca.", "Pastikan kata yang dipilih tepat.", "Minta orang lain baca untuk cari kesalahan."],
    beforePracticePrompt: "Sunting kalimat yang salah!",
  },
  "Menulis Pendapat": {
    title: "Menulis Pendapat",
    levelBand: "tinggi",
    summary: "Tulis pendapatmu tentang suatu topik. Sampaikan alasan dengan jelas.",
    explanation: "Menulis pendapat artinya menyampaikan apa yang kamu pikirkan tentang suatu hal. Struktur: (1) Pernyataan pendapat — 'Menurut saya...' (2) Alasan — 'Karena...' (3) Contoh atau bukti — 'Contohnya...' (4) Simpulan — 'Jadi...' Pastikan pendapatmu masuk akal dan didukung alasan.",
    examples: [
      { label: "Struktur pendapat", text: "Menurut saya, membaca itu penting (pendapat). Karena membaca menambah ilmu (alasan). Contohnya, aku jadi tahu banyak hal setelah rajin membaca (contoh). Jadi, bacalah setiap hari (simpulan)." },
    ],
    tips: ["Mulai dengan 'Menurut saya...'", "Beri alasan yang logis.", "Dukung dengan contoh.", "Akhiri dengan simpulan."],
    beforePracticePrompt: "Tulis pendapatmu tentang topik ini!",
  },
  "Menyusun Argumen Ringan": {
    title: "Menyusun Argumen Ringan",
    levelBand: "tinggi",
    summary: "Argumen adalah pendapat yang didukung alasan bukti. Susun dengan logis dan meyakinkan.",
    explanation: "Argumen yang baik punya: (1) Klaim — apa yang kamu percaya? (2) Alasan — mengapa? (3) Bukti — apa pendukungnya? (4) Simpulan — jadi apa? Contoh: 'Sekolah sebaiknya mulai lebih siang (klaim). Karena siswa butuh tidur cukup (alasan). Penelitian menunjukkan remaja butuh 8-9 jam tidur (bukti). Jadi, jam masuk sekolah perlu ditunda (simpulan).'",
    examples: [
      { label: "Argumen sederhana", text: "Klaim: Olahraga itu penting. Alasan: membuat badan sehat. Bukti: orang yang olahraga lebih jarang sakit. Simpulan: olahragalah setiap hari." },
    ],
    tips: ["Klaim = pendapatmu.", "Alasan = mengapa?", "Bukti = data/contoh.", "Simpulan = jadi apa?"],
    beforePracticePrompt: "Susun argumen yang logis!",
  },
  "Simulasi Tantangan Akhir": {
    title: "Simulasi Tantangan Akhir",
    levelBand: "tinggi",
    summary: "Latihan akhir menjelang ujian Jalur Cerdas. Soal campuran dari semua level.",
    explanation: "Ini adalah simulasi tantangan akhir. Soal-soal akan mencakup semua materi dari level 1 sampai 11. Mulai dari bunyi huruf hingga menyusun argumen. Kerjakan dengan teliti. Gunakan semua yang sudah kamu pelajari.",
    examples: [{ label: "Yang akan diujikan", text: "Bunyi huruf, ejaan, kata baku, makna kata, imbuhan, kalimat, konjungsi, paragraf, baca pemahaman, bernalar, menulis ringkas" }],
    tips: ["Baca soal dengan teliti.", "Ingat semua pelajaran dari level 1-11.", "Jangan terburu-buru.", "Kamu sudah belajar banyak — percaya diri!"],
    beforePracticePrompt: "Ayo hadapi tantangan akhir!",
  },
  "Final Review Jalur Cerdas": {
    title: "Final Review Jalur Cerdas",
    levelBand: "tinggi",
    summary: "Ujian terakhir! Semua materi dari seluruh Jalur Cerdas.",
    explanation: "Ini adalah ujian terakhir seluruh Jalur Cerdas. Semua materi dari level 1 sampai 12 akan muncul. Tujuan: mengukur kemampuanmu secara keseluruhan. Kerjakan sebaik mungkin. Setelah ini, kamu resmi menyelesaikan Jalur Cerdas Bahasa Indonesia! Selamat!",
    examples: [{ label: "Seluruh materi", text: "Bunyi dan huruf → Ejaan → Kata baku → Makna kata → Bentuk kata → Kalimat → Kata penghubung → Paragraf → Membaca → Bernalar → Menulis → Mahir" }],
    tips: ["Istirahat sejenak sebelum mulai.", "Baca setiap soal dengan saksama.", "Gunakan semua yang sudah dipelajari.", "Kamu hebat sudah sampai di sini!"],
    beforePracticePrompt: "Ini dia ujian terakhir. Semangat!",
  },
}

async function main() {
  const args = process.argv.slice(2)
  const isExecute = args.includes("--execute")

  console.log(`🧪 Jalur Cerdas — Micro Lessons Seed`)
  console.log(`   Mode: ${isExecute ? "EXECUTE" : "DRY-RUN"}`)
  console.log(`   Target: 72 JALUR units\n`)

  if (!isExecute) {
    console.log("⚠  DRY-RUN — no changes will be made")
    console.log("   To apply: npx tsx scripts/seed-jalur-micro-lessons.ts --execute\n")
  }

  const units = await db.learningUnit.findMany({
    where: { isActive: true, level: { type: "JALUR" } },
    include: { level: { select: { level: true, title: true } } },
    orderBy: [{ level: { level: "asc" } }, { order: "asc" }],
  })

  console.log(`Found ${units.length} JALUR units\n`)

  let updated = 0
  let skipped = 0

  for (const unit of units) {
    const lessonData = LESSONS_BY_TITLE[unit.title]
    if (!lessonData) {
      console.log(`  ⚠  No lesson data for "${unit.title}" — skipping`)
      skipped++
      continue
    }

    let konten: any = {}
    try { konten = JSON.parse(unit.content || "{}") } catch {}

    // Preserve existing questions
    const existingQuestions = konten.questions || []

    // Build new content
    const newContent = {
      lesson: {
        title: lessonData.title,
        levelBand: lessonData.levelBand,
        summary: lessonData.summary,
        explanation: lessonData.explanation,
        examples: lessonData.examples,
        tips: lessonData.tips,
        beforePracticePrompt: lessonData.beforePracticePrompt,
      },
      questions: existingQuestions,
    }

    if (isExecute) {
      await db.learningUnit.update({
        where: { id: unit.id },
        data: { content: JSON.stringify(newContent) },
      })
    }

    const qCount = existingQuestions.length
    const band = lessonData.levelBand
    console.log(`  ${isExecute ? "✅" : "  "} L${unit.level.level} "${unit.title}" — ${band} (${qCount} questions preserved)`)
    updated++
  }

  console.log(`\n--- Summary ---`)
  console.log(`Units processed: ${updated}`)
  console.log(`Units skipped: ${skipped}`)
  console.log(`Total: ${units.length}`)
  console.log(`Questions preserved: yes (not touched)`)

  if (isExecute) {
    console.log(`\n✅ Seed applied successfully!`)
  } else {
    console.log(`\n⚠  DRY-RUN — no changes made. Use --execute to apply.`)
  }

  await db.$disconnect()
}

main().catch((e) => {
  console.error("Failed:", e.message?.substring(0, 200))
  process.exit(1)
})
