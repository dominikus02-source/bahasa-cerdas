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
]
