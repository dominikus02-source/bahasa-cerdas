import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GAME_QUESTIONS = [
  // Easy questions
  { text: 'Apa sinonim dari kata "cerdas"?', options: ['Bodoh', 'Pintar', 'Malas', 'Lambat'], correctAnswer: '1', difficulty: 'EASY' },
  { text: '"Merdeka" adalah kata yang berasal dari bahasa...', options: ['Belanda', 'Sanskerta', 'Jawa', 'Arab'], correctAnswer: '1', difficulty: 'EASY' },
  { text: 'Kata baku untuk "nilai" adalah...', options: ['Nilai', 'Nillai', 'Niliai', 'Nilainya'], correctAnswer: '0', difficulty: 'EASY' },
  { text: 'Penulisan kata "serta" yang tepat dalam kalimat adalah...', options: ['serta', 'Serta', 'SERA', 'serTa'], correctAnswer: '1', difficulty: 'EASY' },
  { text: '"Membaca" adalah kata kerja...', options: ['Transitif', 'Intransitif', 'Keterangan', 'Subjek'], correctAnswer: '0', difficulty: 'EASY' },
  { text: 'Kosakata yang menunjukkan waktu adalah...', options: ['di sini', 'kemarin', 'di sana', 'ke sini'], correctAnswer: '1', difficulty: 'EASY' },
  { text: 'Kata yang menunjukkan jumlah tunggal adalah...', options: ['beberapa', 'banyak', 'sebagian', 'seekor'], correctAnswer: '3', difficulty: 'EASY' },
  { text: 'Huruf kapital digunakan pada...', options: ['awal kalimat', 'akhir kalimat', 'tengah kalimat', 'setiap kata'], correctAnswer: '0', difficulty: 'EASY' },
  { text: 'Kalimat yang baik adalah kalimat yang...', options: ['panjang', 'pendek', 'jelas dan efektif', 'berbahasa daerah'], correctAnswer: '2', difficulty: 'EASY' },
  { text: 'Tanda titik (.) digunakan untuk...', options: ['mengakhiri pertanyaan', 'mengakhiri pernyataan', 'memisahkan kalimat', 'menandai langsung'], correctAnswer: '1', difficulty: 'EASY' },
  { text: 'Apa antonim dari kata "sulit"?', options: ['Gampang', 'Rumit', 'Berat', 'Susah'], correctAnswer: '0', difficulty: 'EASY' },
  { text: 'Kata "di" termasuk golongan kata...', options: ['Kata benda', 'Kata kerja', 'Kata depan', 'Kata hubung'], correctAnswer: '2', difficulty: 'EASY' },
  { text: '"Kemarin" menunjukkan kata yang termasuk...', options: ['Tempat', 'Waktu', 'Cara', 'Alat'], correctAnswer: '1', difficulty: 'EASY' },
  { text: 'Penulisan yang benar adalah...', options: ['di rumah', 'dirumah', 'diRumah', 'DIRUMAH'], correctAnswer: '0', difficulty: 'EASY' },
  { text: 'Kata majemuk adalah...', options: ['kata yang banyak', 'dua kata atau lebih yang berji', 'kata kerja majemuk', 'kalimat majemuk'], correctAnswer: '1', difficulty: 'EASY' },

  // Medium questions
  { text: 'Kalimat berikut yang menggunakan kata baku adalah...', options: ['Dia pergi ke minimarket untuk membeli snack', 'Dia pergi ke swalayan untuk membeli gorengan', 'Dia pergi ke took untuk membeli buku', 'Dia pergi ke tempat untuk membeli barang'], correctAnswer: '1', difficulty: 'MEDIUM' },
  { text: 'Padanan kata "menghargai" yang tepat adalah...', options: ['Merendahkan', 'Memuji', 'Menyayat', 'Menyakiti'], correctAnswer: '1', difficulty: 'MEDIUM' },
  { text: 'Konjungsi yang menunjukkan hubungan sebab-akibat adalah...', options: ['tetapi', 'karena', 'atau', 'meski'], correctAnswer: '1', difficulty: 'MEDIUM' },
  { text: 'Kalimat sempurna harus memiliki...', options: ['Subjek dan predikat', 'Predikat saja', 'Objek saja', 'Keterangan saja'], correctAnswer: '0', difficulty: 'MEDIUM' },
  { text: 'Kata "kebangsaan" termasuk kata turunan jenis...', options: ['Awalan', 'Sisipan', 'Akhiran', 'Gabungan'], correctAnswer: '2', difficulty: 'MEDIUM' },
  { text: 'Imbuhan "me-" pada kata "membangun" berfungsi untuk...', options: ['Negasi', 'Kata kerja aktif', 'Kata benda', 'Keterangan'], correctAnswer: '1', difficulty: 'MEDIUM' },
  { text: '"Bersahabat" merupakan kata dengan awalan...', options: ['ber-', 'me-', 'di-', 'ter-'], correctAnswer: '0', difficulty: 'MEDIUM' },
  { text: 'Kata ulang yang menunjukkan makna berulang adalah...', options: ['anak-anak', 'kaki-kaki', 'rumah-rumah', 'buku-buku'], correctAnswer: '3', difficulty: 'MEDIUM' },
  { text: 'Konjungsi koordinatif yang menyatakan pertentangan adalah...', options: ['dan', 'tetapi', 'atau', 'karena'], correctAnswer: '1', difficulty: 'MEDIUM' },
  { text: 'Frase "membaca buku" termasuk frase...', options: ['Nomina', 'Verba', 'Adjektiva', 'Adverbia'], correctAnswer: '1', difficulty: 'MEDIUM' },
  { text: '"Saya pergi ke sekolah" memiliki pola kalimat...', options: ['SPO', 'S-P', 'P-O', 'S-O'], correctAnswer: '0', difficulty: 'MEDIUM' },
  { text: 'Kata berimbuhan "ke-...-an" pada "kebetulan" bermakna...', options: ['mengakibatkan', 'kesalahan', 'keadaan', 'tempat'], correctAnswer: '2', difficulty: 'MEDIUM' },
  { text: 'Kalimat langsung ditandai dengan...', options: ['petik dua', 'petik satu', 'tanda seru', 'koma'], correctAnswer: '0', difficulty: 'MEDIUM' },
  { text: 'Kata yang tidak baku adalah...', options: ['aktivitas', 'nasehat', 'sumbangsih', 'kategori'], correctAnswer: '2', difficulty: 'MEDIUM' },

  // Hard questions
  { text: 'Berikut yang merupakan kalimat langsung adalah...', options: ['Diah mengatakan bahwa ia akan pergi.', 'Diah berkata, "Aku akan pergi."', 'Diah menginginkan agar aku pergi.', 'Diah memintaku untuk pergi.'], correctAnswer: '1', difficulty: 'HARD' },
  { text: '"Tertawa" merupakan kata yang dibentuk dengan...', options: ['Prefiks', 'Sufiks', 'Konfiks', 'Infix'], correctAnswer: '3', difficulty: 'HARD' },
  { text: 'Kaidah penulisan serapan yang benar adalah...', options: ['ideologi - ideologi', 'idealogy - idealogy', 'IDEOlogi - IDEOlogi', 'Ideologi - Ideology'], correctAnswer: '0', difficulty: 'HARD' },
  { text: 'Kalimat yang menggunakan bahasa figuratif adalah...', options: ['Air mengalir deras', 'Matahari terbit', 'Waktu berjalan', 'Anak-anak bermain'], correctAnswer: '2', difficulty: 'HARD' },
  { text: 'Diksi yang tepat untuk kalimat "Ia ... sekali terhadap temannya" adalah...', options: ['ramah', 'dengki', 'baik', 'tulus'], correctAnswer: '1', difficulty: 'HARD' },
  { text: 'Pasangan kata yang memiliki hubungan antonim adalah...', options: ['Aktif - dinamis', 'Sopan - santun', 'Cerdas - bodoh', 'Kaya - hartawan'], correctAnswer: '2', difficulty: 'HARD' },
  { text: 'Kalimat pasif yang benar adalah...', options: ['Surat itu saya kirimkan', 'Surat itu dikirim oleh saya', 'Surat tersebut kirim', 'Surat dikirim saya'], correctAnswer: '1', difficulty: 'HARD' },
  { text: 'Kata "penglihatan" berasal dari kata dasar...', options: ['Lihat', 'Penglihat', 'Lihatan', 'Melihat'], correctAnswer: '0', difficulty: 'HARD' },
  { text: 'Frasa "buku pelajaran" termasuk jenis...', options: ['Frasa endosentris adjektiva', 'Frasa endosentris nominal', 'Frasa eksosentris', 'Frasa koordinatif'], correctAnswer: '1', difficulty: 'HARD' },
  { text: 'Konjungsi subordinatif yang menunjukkan syarat adalah...', options: ['supaya', 'meski', 'jika', 'karena'], correctAnswer: '2', difficulty: 'HARD' },
];

async function main() {
  console.log('Seeding game questions...');

  for (let i = 0; i < GAME_QUESTIONS.length; i++) {
    const q = GAME_QUESTIONS[i];
    await prisma.gameQuestion.create({
      data: {
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        difficulty: q.difficulty as any,
        type: 'PILIHAN_GANDA',
        orderIndex: i,
      },
    });
  }

  console.log(`Seeded ${GAME_QUESTIONS.length} game questions`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });