export type KataPlayQuestion = {
  type: string
  instruction: string
  correctAnswer: string
  options: string[]
  wordParts?: string[]
  sentence?: string
  hint?: string
  imageText?: string
  matchLeft?: string
  matchRight?: string
}

export type KataPlayLesson = {
  id: string
  title: string
  description: string
  character: string
  questions: KataPlayQuestion[]
  xpReward: number
}

export type KataPlayLevel = {
  id: string
  title: string
  description: string
  icon: string
  levelNumber: number
  lessons: KataPlayLesson[]
}

function q(
  type: string, instruction: string, correctAnswer: string, options: string[],
  extra?: Partial<KataPlayQuestion>
): KataPlayQuestion {
  return { type, instruction, correctAnswer, options, ...extra }
}

export const kataPlayLevels: KataPlayLevel[] = [
  {
    id: 'kp_1', title: 'Mengenal Huruf', description: 'Belajar huruf A sampai Z',
    icon: 'BookOpen', levelNumber: 1,
    lessons: [
      {
        id: 'kp_1_1', title: 'Huruf Vokal', description: 'A I U E O',
        character: 'zelby', xpReward: 30,
        questions: [
          q('imageChoice', 'Huruf apa ini?', 'A', ['A', 'I', 'U', 'E'], { imageText: 'A', hint: 'A seperti ayam' }),
          q('imageChoice', 'Huruf apa ini?', 'I', ['I', 'A', 'E', 'O'], { imageText: 'I', hint: 'I seperti ikan' }),
          q('imageChoice', 'Huruf apa ini?', 'U', ['U', 'O', 'A', 'I'], { imageText: 'U', hint: 'U seperti ular' }),
          q('imageChoice', 'Huruf apa ini?', 'E', ['E', 'A', 'I', 'U'], { imageText: 'E', hint: 'E seperti elang' }),
          q('wordChoice', 'Pilih huruf vokal!', 'O', ['O', 'B', 'C', 'D'], { imageText: 'O' }),
        ],
      },
      {
        id: 'kp_1_2', title: 'Huruf Konsonan', description: 'B C D M P S',
        character: 'zelby', xpReward: 30,
        questions: [
          q('imageChoice', 'Huruf apa ini?', 'B', ['B', 'D', 'P', 'S'], { imageText: 'B', hint: 'B… bola' }),
          q('imageChoice', 'Huruf apa ini?', 'C', ['C', 'B', 'D', 'M'], { imageText: 'C', hint: 'C… cicak' }),
          q('imageChoice', 'Huruf apa ini?', 'M', ['M', 'N', 'B', 'P'], { imageText: 'M', hint: 'M… mata' }),
          q('wordChoice', 'Pilih huruf yang benar!', 'P', ['P', 'B', 'S', 'D'], { imageText: 'P' }),
          q('trueFalse', 'Apakah ini huruf S?', 'Salah', ['Benar', 'Salah'], { hint: 'S' }),
        ],
      },
      {
        id: 'kp_1_3', title: 'Tebak Huruf Awal', description: 'Huruf pertama sebuah kata',
        character: 'hazel', xpReward: 30,
        questions: [
          q('wordChoice', 'Ayam dimulai huruf?', 'A', ['A', 'I', 'B', 'C']),
          q('wordChoice', 'Ikan dimulai huruf?', 'I', ['I', 'A', 'U', 'E']),
          q('wordChoice', 'Bola dimulai huruf?', 'B', ['B', 'D', 'P', 'M']),
          q('matching', 'Cocokkan!', 'ULAR', ['ULAR', 'AYAM', 'IKAN', 'ELANG'], { matchLeft: 'U', matchRight: 'ULAR' }),
          q('fillBlank', 'Lengkapi: _A__ (sapi)', 'S', ['S', 'P', 'C', 'K'], { hint: 'Sapi' }),
        ],
      },
    ],
  },
  {
    id: 'kp_2', title: 'Suku Kata', description: 'Gabung huruf jadi suku kata',
    icon: 'Split', levelNumber: 2,
    lessons: [
      {
        id: 'kp_2_1', title: 'Ba Bi Bu Be Bo', description: 'Suku kata dengan B',
        character: 'zelby', xpReward: 30,
        questions: [
          q('imageChoice', 'Suku kata apa ini?', 'BA', ['BA', 'BE', 'BI', 'BU'], { imageText: 'BA', hint: 'BA… batu' }),
          q('imageChoice', 'Suku kata apa ini?', 'BU', ['BU', 'BA', 'BO', 'BE'], { imageText: 'BU', hint: 'BU… buku' }),
          q('wordChoice', 'Pilih suku kata!', 'BI', ['BI', 'BU', 'BA', 'BE']),
          q('trueFalse', '"BO" adalah suku kata?', 'Benar', ['Benar', 'Salah']),
          q('fillBlank', 'Lengkapi: BA_U (batu)', 'T', ['T', 'K', 'N', 'S'], { hint: 'baTu' }),
        ],
      },
      {
        id: 'kp_2_2', title: 'Ma Mi Pa Pi', description: 'Suku kata dengan M dan P',
        character: 'hazel', xpReward: 30,
        questions: [
          q('imageChoice', 'Suku kata apa ini?', 'MA', ['MA', 'MI', 'MU', 'ME'], { imageText: 'MA', hint: 'MA… mata' }),
          q('imageChoice', 'Suku kata apa ini?', 'MI', ['MI', 'MA', 'MU', 'MO'], { imageText: 'MI', hint: 'MI… minum' }),
          q('wordChoice', 'Pilih suku kata!', 'PA', ['PA', 'MA', 'BA', 'SA']),
          q('arrangeWord', 'Susun: PA – DI', 'PADI', ['PADI', 'DIPA', 'PIDA', 'ADIP'], { wordParts: ['PA', 'DI'] }),
          q('fillBlank', 'Lengkapi: PI_A (pita)', 'T', ['T', 'S', 'N', 'K'], { hint: 'piTa' }),
        ],
      },
      {
        id: 'kp_2_3', title: 'Sa Si Su', description: 'Suku kata dengan S',
        character: 'zelby', xpReward: 30,
        questions: [
          q('imageChoice', 'Suku kata apa ini?', 'SA', ['SA', 'SI', 'SU', 'SE'], { imageText: 'SA', hint: 'SA… sapi' }),
          q('imageChoice', 'Suku kata apa ini?', 'SI', ['SI', 'SA', 'SU', 'SO'], { imageText: 'SI', hint: 'SI… singa' }),
          q('arrangeWord', 'Susun: SA – PI', 'SAPI', ['SAPI', 'PISA', 'SIPA', 'APIS'], { wordParts: ['SA', 'PI'] }),
          q('matching', 'Cocokkan!', 'BATU', ['BATU', 'BUKU', 'SAPI', 'PITA'], { matchLeft: 'BA', matchRight: 'BATU' }),
        ],
      },
    ],
  },
  {
    id: 'kp_3', title: 'Kata Benda', description: 'Nama benda di sekitar kita',
    icon: 'Package', levelNumber: 3,
    lessons: [
      {
        id: 'kp_3_1', title: 'Benda di Rumah', description: 'Meja kursi pintu buku',
        character: 'zelby', xpReward: 30,
        questions: [
          q('imageChoice', 'Apa ini?', 'MEJA', ['MEJA', 'KURSI', 'PINTU', 'BUKU'], { hint: 'Untuk menulis' }),
          q('wordChoice', 'Pilih kata yang benar!', 'BUKU', ['BUKU', 'BUKA', 'BAKU', 'BIKU']),
          q('imageChoice', 'Apa ini?', 'KURSI', ['KURSI', 'MEJA', 'TAS', 'LAMPU'], { hint: 'Untuk duduk' }),
          q('fillBlank', 'Lengkapi: PINT_', 'U', ['U', 'A', 'E', 'I'], { hint: 'PINTU' }),
          q('arrangeWord', 'Susun: T – A – S', 'TAS', ['TAS', 'SAT', 'TSA', 'AST'], { wordParts: ['T', 'A', 'S'] }),
        ],
      },
      {
        id: 'kp_3_2', title: 'Nama Hewan', description: 'Ayam sapi ikan kucing',
        character: 'hazel', xpReward: 30,
        questions: [
          q('imageChoice', 'Hewan apa ini?', 'KUCING', ['KUCING', 'ANJING', 'AYAM', 'IKAN']),
          q('imageChoice', 'Hewan apa ini?', 'AYAM', ['AYAM', 'BEBEK', 'BURUNG', 'SAPI']),
          q('wordChoice', 'Pilih nama hewan!', 'SAPI', ['SAPI', 'SARI', 'SAPU', 'SABI']),
          q('trueFalse', 'Kucing suka makan ikan?', 'Benar', ['Benar', 'Salah']),
          q('matching', 'Cocokkan!', 'BURUNG', ['BURUNG', 'AYAM', 'IKAN', 'KUCING'], { matchLeft: 'Hewan', matchRight: 'BURUNG' }),
        ],
      },
      {
        id: 'kp_3_3', title: 'Buah dan Sekolah', description: 'Apel pisang pensil guru',
        character: 'zelby', xpReward: 30,
        questions: [
          q('imageChoice', 'Buah apa ini?', 'APEL', ['APEL', 'PISANG', 'MANGGA', 'JERUK']),
          q('imageChoice', 'Buah apa ini?', 'PISANG', ['PISANG', 'APEL', 'JERUK', 'MELON']),
          q('wordChoice', 'Benda di sekolah!', 'PENSIL', ['PENSIL', 'PESIL', 'PENSAL', 'PENSEL']),
          q('trueFalse', 'Guru mengajar di sekolah?', 'Benar', ['Benar', 'Salah']),
          q('fillBlank', 'Lengkapi: _URU (guru)', 'G', ['G', 'K', 'S', 'P'], { hint: 'Guru' }),
        ],
      },
    ],
  },
  {
    id: 'kp_4', title: 'Kata Kerja', description: 'Kata-kata untuk kegiatan',
    icon: 'Zap', levelNumber: 4,
    lessons: [
      {
        id: 'kp_4_1', title: 'Kegiatan di Rumah', description: 'Makan minum tidur mandi',
        character: 'zelby', xpReward: 30,
        questions: [
          q('imageChoice', 'Kegiatan apa?', 'MAKAN', ['MAKAN', 'MINUM', 'TIDUR', 'MANDI']),
          q('imageChoice', 'Kegiatan apa?', 'TIDUR', ['TIDUR', 'DUDUK', 'BERDIRI', 'LARI']),
          q('wordChoice', 'Pilih kata kerja!', 'MANDI', ['MANDI', 'MANIS', 'MANDU', 'MANDA']),
          q('trueFalse', 'Kita minum pakai mata?', 'Salah', ['Benar', 'Salah']),
          q('fillBlank', 'Lengkapi: MIN_M', 'U', ['U', 'A', 'I', 'E'], { hint: 'minUm' }),
        ],
      },
      {
        id: 'kp_4_2', title: 'Kegiatan di Sekolah', description: 'Baca tulis belajar nyanyi',
        character: 'hazel', xpReward: 30,
        questions: [
          q('imageChoice', 'Kegiatan apa?', 'MEMBACA', ['MEMBACA', 'MENULIS', 'MENGGAMBAR', 'MENYANYI']),
          q('imageChoice', 'Kegiatan apa?', 'MENULIS', ['MENULIS', 'MEMBACA', 'MELUKIS', 'MENARI']),
          q('wordChoice', 'Pilih kata kerja!', 'BELAJAR', ['BELAJAR', 'BELAJAK', 'BELAGAR', 'BELANJA']),
          q('arrangeWord', 'Susun: ME – NYAN – YI', 'MENYANYI', ['MENYANYI', 'MENYINYA', 'MENAYNYI', 'MENYANI'], { wordParts: ['ME', 'NYAN', 'YI'] }),
          q('trueFalse', 'Kita membaca pakai buku?', 'Benar', ['Benar', 'Salah']),
        ],
      },
      {
        id: 'kp_4_3', title: 'Kegiatan Bermain', description: 'Lari main lompat',
        character: 'alby', xpReward: 30,
        questions: [
          q('imageChoice', 'Apa yang dilakukan?', 'BERLARI', ['BERLARI', 'BERJALAN', 'MELOMPAT', 'BERDIRI']),
          q('imageChoice', 'Apa yang dilakukan?', 'BERMAIN', ['BERMAIN', 'BEKERJA', 'BELAJAR', 'BERLARI']),
          q('wordChoice', 'Pilih kata kerja!', 'MELOMPAT', ['MELOMPAT', 'MELOMPAK', 'MELOMPIT', 'MELOMPOT']),
          q('matching', 'Cocokkan!', 'BERMAIN', ['BERMAIN', 'BERLARI', 'BELAJAR', 'BEKERJA'], { matchLeft: 'Aktivitas', matchRight: 'BERMAIN' }),
        ],
      },
    ],
  },
  {
    id: 'kp_5', title: 'Kata Sifat & Kalimat', description: 'Kata sifat dan kalimat sederhana',
    icon: 'Sparkles', levelNumber: 5,
    lessons: [
      {
        id: 'kp_5_1', title: 'Kata Sifat', description: 'Besar kecil panjang pendek',
        character: 'zelby', xpReward: 30,
        questions: [
          q('imageChoice', 'Gajah itu…', 'BESAR', ['BESAR', 'KECIL', 'PANJANG', 'PENDEK']),
          q('imageChoice', 'Semut itu…', 'KECIL', ['KECIL', 'BESAR', 'TINGGI', 'BERAT']),
          q('wordChoice', 'Pilih kata sifat!', 'TINGGI', ['TINGGI', 'MENDIDIH', 'MENARI', 'BUKU']),
          q('trueFalse', 'Es krim rasanya manis?', 'Benar', ['Benar', 'Salah']),
          q('fillBlank', 'Lengkapi: CEP_T', 'A', ['A', 'I', 'E', 'O'], { hint: 'cepaT (lawan lambat)' }),
        ],
      },
      {
        id: 'kp_5_2', title: 'Warna', description: 'Merah biru hijau kuning',
        character: 'hazel', xpReward: 30,
        questions: [
          q('imageChoice', 'Pisang warnanya?', 'KUNING', ['KUNING', 'MERAH', 'HIJAU', 'BIRU']),
          q('imageChoice', 'Rumput warnanya?', 'HIJAU', ['HIJAU', 'KUNING', 'BIRU', 'MERAH']),
          q('wordChoice', 'Pilih warna!', 'MERAH', ['MERAH', 'MERA', 'MERU', 'MERI']),
          q('matching', 'Cocokkan!', 'LANGIT', ['LANGIT', 'PISANG', 'RUMPUT', 'API'], { matchLeft: 'Warna biru', matchRight: 'LANGIT' }),
          q('fillBlank', 'Lengkapi: B_RU', 'I', ['I', 'A', 'E', 'O'], { hint: 'bIru' }),
        ],
      },
      {
        id: 'kp_5_3', title: 'Kalimat Sederhana', description: 'Susun kalimat SPO',
        character: 'alby', xpReward: 30,
        questions: [
          q('wordChoice', 'Pilih kalimat yang benar!', 'AYAM MAKAN', ['AYAM MAKAN', 'MAKAN AYAM', 'AYAM MAKAN NASI', 'NASI AYAM MAKAN']),
          q('trueFalse', '"Ibu memasak" adalah kalimat?', 'Benar', ['Benar', 'Salah']),
          q('arrangeWord', 'Susun: ADIK – MINUM – SUSU', 'ADIK MINUM SUSU', ['ADIK MINUM SUSU', 'SUSU MINUM ADIK', 'MINUM ADIK SUSU', 'ADIK SUSU MINUM'], { wordParts: ['ADIK', 'MINUM', 'SUSU'] }),
          q('arrangeWord', 'Susun: KAKAK – BELAJAR – DI SEKOLAH', 'KAKAK BELAJAR DI SEKOLAH', ['KAKAK BELAJAR DI SEKOLAH', 'DI SEKOLAH BELAJAR KAKAK', 'BELAJAR KAKAK DI SEKOLAH', 'KAKAK DI SEKOLAH BELAJAR'], { wordParts: ['KAKAK', 'BELAJAR', 'DI SEKOLAH'] }),
          q('fillBlank', 'Lengkapi kalimat: Ayah ___ koran', 'MEMBACA', ['MEMBACA', 'MEMASAK', 'MENULIS', 'MENGGAMBAR'], { hint: 'membaCa' }),
        ],
      },
    ],
  },

  {
    id: 'kp_6', title: 'Eksplorasi Kata 2', description: 'Kosakata & kalimat baru — ekspansi 2026',
    icon: 'Sparkles', levelNumber: 6,
    lessons: [
      {
        id: 'kp_6_1', title: 'Kata Benda di Sekitar', description: 'Meja kursi buku tas',
        character: 'hazel', xpReward: 30,
        questions: [
          q('imageChoice', 'Yang dipakai untuk menulis adalah?', 'PENSIL', ['PENSIL', 'MEJA', 'PIRING', 'SEPATU']),
          q('wordChoice', 'Pilih kata benda!', 'BUKU', ['BUKU', 'BERLARI', 'CANTIK', 'CEPAT']),
          q('imageChoice', 'Yang dipakai saat hujan adalah?', 'PAYUNG', ['PAYUNG', 'KIPAS', 'SENDOK', 'TOPI']),
          q('matching', 'Cocokkan!', 'MEJA', ['MEJA', 'KUCING', 'MAKAN', 'HIJAU'], { matchLeft: 'Benda untuk menulis', matchRight: 'MEJA' }),
          q('fillBlank', 'Lengkapi: P_LPEN', 'U', ['U', 'I', 'A', 'E'], { hint: 'pUlpen' }),
        ],
      },
      {
        id: 'kp_6_2', title: 'Kata Kerja Sehari-hari', description: 'Makan minum berlari membaca',
        character: 'zelby', xpReward: 30,
        questions: [
          q('wordChoice', 'Pilih kata kerja!', 'BERLARI', ['BERLARI', 'MEJA', 'MERAH', 'BUKU']),
          q('imageChoice', 'Kegiatan apa ini?', 'MEMBACA', ['MEMBACA', 'TIDUR', 'TERBANG', 'MENANAM']),
          q('trueFalse', '"Minum" adalah kata kerja?', 'Benar', ['Benar', 'Salah']),
          q('fillBlank', 'Adik sedang ___ buku', 'MEMBACA', ['MEMBACA', 'MEMASUK', 'MELOMPAT', 'MENYANYI'], { hint: 'membaCa' }),
          q('arrangeWord', 'Susun: SISWA – MENULIS – DI PAPAN', 'SISWA MENULIS DI PAPAN', ['SISWA MENULIS DI PAPAN', 'DI PAPAN SISWA MENULIS', 'MENULIS SISWA DI PAPAN', 'SISWA DI PAPAN MENULIS'], { wordParts: ['SISWA', 'MENULIS', 'DI PAPAN'] }),
        ],
      },
      {
        id: 'kp_6_3', title: 'Kalimat Tanya', description: 'Apa siapa kapan di mana',
        character: 'hazel', xpReward: 30,
        questions: [
          q('wordChoice', 'Kata tanya untuk menanyakan tempat adalah?', 'DI MANA', ['DI MANA', 'BERAPA', 'SIAPA', 'KENAPA']),
          q('wordChoice', 'Kata tanya untuk menanyakan orang adalah?', 'SIAPA', ['SIAPA', 'KAPAN', 'APA', 'DI MANA']),
          q('trueFalse', 'Kalimat "Apa itu?" adalah kalimat tanya?', 'Benar', ['Benar', 'Salah']),
          q('fillBlank', '___ namamu?', 'SIAPA', ['SIAPA', 'DI MANA', 'BERAPA', 'KAPAN'], { hint: 'menanyakan nama' }),
          q('arrangeWord', 'Susun: DI MANA – KAMU – TINGGAL', 'KAMU TINGGAL DI MANA', ['KAMU TINGGAL DI MANA', 'DI MANA TINGGAL KAMU', 'TINGGAL KAMU DI MANA', 'KAMU DI MANA TINGGAL'], { wordParts: ['KAMU', 'TINGGAL', 'DI MANA'] }),
        ],
      },
    ],
  },
]
