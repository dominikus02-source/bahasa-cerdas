export interface MasterSoal {
  kodeSoal: string;
  judul: string;
  tema: string;
  kelas: string;
  semester: number;
  kompetensi: string;
  indikator: string;
  difficulty: "MUDAH" | "SEDANG" | "SULIT";
  levelBerpikir: 1 | 2 | 3 | 4 | 5;
  type: "PILIHAN_GANDA" | "BENAR_SALAH" | "MENJODOHKAN" | "ISIAN_SINGKAT" | "URUTAN" | "MEMBACA_MENJAWAB";
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  kataKunci: string[];
  estimasiWaktu: number;
  isHOTS: boolean;
}

export interface ThemeMetadata {
  id: string;
  label: string;
  emoji: string;
  kelasRange: [number, number];
  kompetensi: string;
  description: string;
  questionTypes: MasterSoal["type"][];
}

export const THEMES: ThemeMetadata[] = [
  { id: "spok", label: "SPOK", emoji: "🔤", kelasRange: [4, 12], kompetensi: "3.1", description: "Struktur kalimat: Subjek, Predikat, Objek, Keterangan", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"] },
  { id: "kalimat", label: "Kalimat", emoji: "📝", kelasRange: [4, 12], kompetensi: "3.1", description: "Jenis dan struktur kalimat dalam Bahasa Indonesia", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MENJODOHKAN"] },
  { id: "kalimat-efektif", label: "Kalimat Efektif", emoji: "✏️", kelasRange: [6, 12], kompetensi: "3.2", description: "Kalimat efektif, kehematan, kesejajaran, ketegasan", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "URUTAN"] },
  { id: "paragraf", label: "Paragraf", emoji: "📑", kelasRange: [4, 12], kompetensi: "3.3", description: "Paragraf deduktif, induktif, campuran, gagasan utama", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "ide-pokok", label: "Ide Pokok", emoji: "💡", kelasRange: [4, 12], kompetensi: "3.3", description: "Ide pokok, gagasan utama, kalimat utama paragraf", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"] },
  { id: "gagasan-utama", label: "Gagasan Utama", emoji: "🎯", kelasRange: [4, 12], kompetensi: "3.3", description: "Gagasan utama dalam paragraf dan wacana", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "simpulan", label: "Simpulan", emoji: "🔚", kelasRange: [5, 12], kompetensi: "3.3", description: "Menyimpulkan isi teks dan paragraf", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"] },
  { id: "sinonim", label: "Sinonim", emoji: "🔄", kelasRange: [4, 12], kompetensi: "3.4", description: "Persamaan kata dan padanan kata", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MENJODOHKAN"] },
  { id: "antonim", label: "Antonim", emoji: "⚡", kelasRange: [4, 12], kompetensi: "3.4", description: "Lawan kata dan oposisi makna", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MENJODOHKAN"] },
  { id: "makna-kata", label: "Makna Kata", emoji: "📖", kelasRange: [5, 12], kompetensi: "3.4", description: "Makna denotatif, konotatif, leksikal, gramatikal", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"] },
  { id: "imbuhan", label: "Imbuhan", emoji: "🔗", kelasRange: [4, 12], kompetensi: "3.5", description: "Prefiks, sufiks, infiks, konfiks, kata berimbuhan", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"] },
  { id: "kata-baku", label: "Kata Baku", emoji: "✅", kelasRange: [5, 12], kompetensi: "3.6", description: "Kata baku dan tidak baku dalam Bahasa Indonesia", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MENJODOHKAN"] },
  { id: "kata-tidak-baku", label: "Kata Tidak Baku", emoji: "❌", kelasRange: [5, 12], kompetensi: "3.6", description: "Kata tidak baku dan perbaikannya", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "URUTAN"] },
  { id: "puebi", label: "PUEBI", emoji: "📐", kelasRange: [6, 12], kompetensi: "3.6", description: "Pedoman Umum Ejaan Bahasa Indonesia", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"] },
  { id: "ejaan", label: "Ejaan", emoji: "✍️", kelasRange: [6, 12], kompetensi: "3.6", description: "Ejaan yang disempurnakan, penulisan kata", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "URUTAN"] },
  { id: "tanda-baca", label: "Tanda Baca", emoji: "❗", kelasRange: [4, 12], kompetensi: "3.6", description: "Penggunaan tanda baca: titik, koma, tanda tanya, dll", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"] },
  { id: "majas", label: "Majas", emoji: "🎨", kelasRange: [7, 12], kompetensi: "3.7", description: "Majas personifikasi, metafora, hiperbola, litotes, dll", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MENJODOHKAN"] },
  { id: "puisi", label: "Puisi", emoji: "📝", kelasRange: [7, 12], kompetensi: "3.8", description: "Puisi, rima, irama, diksi, tema, larik, bait", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "pantun", label: "Pantun", emoji: "🎵", kelasRange: [4, 12], kompetensi: "3.8", description: "Pantun, sampiran, isi, rima a-b-a-b", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"] },
  { id: "syair", label: "Syair", emoji: "🎭", kelasRange: [8, 12], kompetensi: "3.8", description: "Syair, ciri-ciri syair, perbedaan dengan pantun", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "gurindam", label: "Gurindam", emoji: "📜", kelasRange: [8, 12], kompetensi: "3.8", description: "Gurindam, ciri-ciri, contoh gurindam", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"] },
  { id: "cerpen", label: "Cerpen", emoji: "📖", kelasRange: [7, 12], kompetensi: "3.9", description: "Cerita pendek, unsur intrinsik, alur, tokoh, latar", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "novel", label: "Novel", emoji: "📕", kelasRange: [8, 12], kompetensi: "3.9", description: "Novel, unsur intrinsik dan ekstrinsik, penokohan", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "drama", label: "Drama", emoji: "🎭", kelasRange: [8, 12], kompetensi: "3.10", description: "Drama, dialog, monolog, prolog, epilog, babak", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"] },
  { id: "fabel", label: "Fabel", emoji: "🦊", kelasRange: [4, 9], kompetensi: "3.9", description: "Fabel, tokoh hewan, pesan moral", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "legenda", label: "Legenda", emoji: "🏯", kelasRange: [7, 12], kompetensi: "3.9", description: "Legenda, cerita rakyat, asal-usul", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "hikayat", label: "Hikayat", emoji: "👑", kelasRange: [10, 12], kompetensi: "3.9", description: "Hikayat, sastra Melayu klasik, istana sentris", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "mitos", label: "Mitos", emoji: "🌌", kelasRange: [7, 12], kompetensi: "3.9", description: "Mitos, cerita dewa, kepercayaan tradisional", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "cerita-inspiratif", label: "Cerita Inspiratif", emoji: "🌟", kelasRange: [8, 12], kompetensi: "3.9", description: "Cerita inspiratif, pesan moral, keteladanan", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "teks-deskripsi", label: "Teks Deskripsi", emoji: "🏔️", kelasRange: [7, 12], kompetensi: "3.1", description: "Teks deskripsi, objek, ciri-ciri, perincian", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "teks-narasi", label: "Teks Narasi", emoji: "📖", kelasRange: [7, 12], kompetensi: "3.1", description: "Teks narasi, alur, tokoh, latar, kronologi", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "teks-eksposisi", label: "Teks Eksposisi", emoji: "📰", kelasRange: [8, 12], kompetensi: "3.2", description: "Teks eksposisi, tesis, argumentasi, penegasan ulang", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "teks-eksplanasi", label: "Teks Eksplanasi", emoji: "🔬", kelasRange: [8, 12], kompetensi: "3.2", description: "Teks eksplanasi, fenomena, hubungan kausal", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "teks-persuasi", label: "Teks Persuasi", emoji: "💬", kelasRange: [8, 12], kompetensi: "3.3", description: "Teks persuasi, ajakan, opini, fakta, kalimat persuasif", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "teks-argumentasi", label: "Teks Argumentasi", emoji: "⚖️", kelasRange: [9, 12], kompetensi: "3.3", description: "Teks argumentasi, argumen pro kontra, data pendukung", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "teks-prosedur", label: "Teks Prosedur", emoji: "📋", kelasRange: [7, 12], kompetensi: "3.4", description: "Teks prosedur, langkah-langkah, tujuan, alat bahan", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "URUTAN"] },
  { id: "teks-berita", label: "Teks Berita", emoji: "📺", kelasRange: [7, 12], kompetensi: "3.2", description: "Teks berita, 5W+1H, unsur berita, fakta vs opini", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "teks-editorial", label: "Teks Editorial", emoji: "📰", kelasRange: [10, 12], kompetensi: "3.2", description: "Teks editorial, tajuk rencana, opini redaksi", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "teks-ulasan", label: "Teks Ulasan", emoji: "⭐", kelasRange: [9, 12], kompetensi: "3.5", description: "Teks ulasan, resensi, evaluasi karya", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "resensi", label: "Resensi", emoji: "📚", kelasRange: [9, 12], kompetensi: "3.5", description: "Resensi buku, identitas, sinopsis, kelebihan, kekurangan", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"] },
  { id: "surat-pribadi", label: "Surat Pribadi", emoji: "💌", kelasRange: [7, 12], kompetensi: "3.6", description: "Surat pribadi, salam pembuka, isi, penutup", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "URUTAN"] },
  { id: "surat-dinas", label: "Surat Dinas", emoji: "📄", kelasRange: [7, 12], kompetensi: "3.6", description: "Surat dinas, kop surat, nomor, lampiran, bahasa formal", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "URUTAN"] },
  { id: "proposal", label: "Proposal", emoji: "📋", kelasRange: [10, 12], kompetensi: "3.7", description: "Proposal kegiatan, latar belakang, tujuan, anggaran", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"] },
  { id: "pidato", label: "Pidato", emoji: "🎤", kelasRange: [8, 12], kompetensi: "3.8", description: "Pidato persuasif, salam pembuka, isi, penutup", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "URUTAN"] },
  { id: "poster", label: "Poster", emoji: "🖼️", kelasRange: [7, 12], kompetensi: "3.8", description: "Poster, pesan visual, tipografi, ilustrasi, ajakan", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"] },
  { id: "iklan", label: "Iklan", emoji: "📢", kelasRange: [7, 12], kompetensi: "3.8", description: "Iklan, slogan, kalimat persuasif, media cetak elektronik", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MENJODOHKAN"] },
  { id: "slogan", label: "Slogan", emoji: "🏷️", kelasRange: [7, 12], kompetensi: "3.8", description: "Slogan, motto, semboyan, kalimat singkat", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"] },
  { id: "artikel", label: "Artikel", emoji: "📰", kelasRange: [9, 12], kompetensi: "3.2", description: "Artikel ilmiah populer, struktur artikel", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "editorial", label: "Editorial", emoji: "📝", kelasRange: [10, 12], kompetensi: "3.2", description: "Tajuk rencana, opini surat kabar", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
  { id: "anekdot", label: "Anekdot", emoji: "😄", kelasRange: [8, 12], kompetensi: "3.7", description: "Teks anekdot, kritik lucu, sindiran", questionTypes: ["PILIHAN_GANDA", "BENAR_SALAH", "MEMBACA_MENJAWAB"] },
];

export const MASTER_BANK_SOAL_DIR = __dirname;
