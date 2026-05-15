const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL || 'postgresql://bahasa:***REMOVED-DB-PASSWORD***@***REMOVED-VPS-IP***:5432/bahasacerdas' } } });

const questions = [
  { seksi: "MENDENGARKAN", text: "Percakapan tentang pentas seni. Kata \"memukau\" berarti...", type: "PILIHAN_GANDA", options: ["Membosankan","Menakjubkan","Menyedihkan","Mengecewakan"], correctAnswer: "1", difficulty: "MEDIUM" },
  { seksi: "MENDENGARKAN", text: "\"Gotong royong\" dalam pidato berarti...", type: "PILIHAN_GANDA", options: ["Bekerja sendiri","Bersaing","Kerja sama","Berdebat"], correctAnswer: "2", difficulty: "EASY" },
  { seksi: "MENDENGARKAN", text: "\"Mencerdaskan\" dalam wawancara guru berarti...", type: "PILIHAN_GANDA", options: ["Membodohkan","Membuat pintar","Menyamakan","Membedakan"], correctAnswer: "1", difficulty: "EASY" },
  { seksi: "MENDENGARKAN", text: "\"Diwajibkan\" dalam pengumuman upacara bermakna...", type: "PILIHAN_GANDA", options: ["Dianjurkan","Diperbolehkan","Harus dilakukan","Disarankan"], correctAnswer: "2", difficulty: "EASY" },
  { seksi: "MENDENGARKAN", text: "Dialog tentang tugas bahasa Indonesia. Topik percakapan adalah...", type: "PILIHAN_GANDA", options: ["Tugas matematika","Tugas bahasa Indonesia","Puisi","Buku pelajaran"], correctAnswer: "1", difficulty: "EASY" },
  { seksi: "MENDENGARKAN", text: "\"Banjir\" dalam berita memiliki makna...", type: "PILIHAN_GANDA", options: ["Air laut naik","Air meluap ke daratan","Hujan deras","Tanah longsor"], correctAnswer: "1", difficulty: "EASY" },
  { seksi: "MENDENGARKAN", text: "Pembawa acara mengucapkan basmallah untuk... acara.", type: "PILIHAN_GANDA", options: ["Menutup","Membuka","Mengisi","Mengakhiri"], correctAnswer: "1", difficulty: "EASY" },
  { seksi: "MENDENGARKAN", text: "Watak pemuda dalam cerita adalah...", type: "PILIHAN_GANDA", options: ["Pemalas","Rajin dan jujur","Pembohong","Sombong"], correctAnswer: "1", difficulty: "EASY" },
  { seksi: "MERESPONS_KAIDAH", text: "Kalimat yang menggunakan kata baku adalah...", type: "PILIHAN_GANDA", options: ["Beli obat di apotik","Aktif dalam kegiatan","Ijasahnya hilang","Sedang ujian"], correctAnswer: "1", difficulty: "MEDIUM" },
  { seksi: "MERESPONS_KAIDAH", text: "Penulisan \"di\" yang benar adalah...", type: "PILIHAN_GANDA", options: ["dirumah","di rumah","Di rumah","diRumah"], correctAnswer: "1", difficulty: "EASY" },
  { seksi: "MERESPONS_KAIDAH", text: "Kata baku dari \"nasehat\" adalah...", type: "PILIHAN_GANDA", options: ["Nasihat","Nasehat","Neshiat","Nesahat"], correctAnswer: "0", difficulty: "MEDIUM" },
  { seksi: "MERESPONS_KAIDAH", text: "Kalimat efektif adalah kalimat yang...", type: "PILIHAN_GANDA", options: ["Panjang dan rumit","Singkat padat jelas","Banyak kiasan","Berulang-ulang"], correctAnswer: "1", difficulty: "EASY" },
  { seksi: "MERESPONS_KAIDAH", text: "Awalan \"ber-\" yang benar terdapat pada...", type: "PILIHAN_GANDA", options: ["Berjalan kaki","Berlari kencang","Berkerja sama","Berdiskusi"], correctAnswer: "0", difficulty: "MEDIUM" },
  { seksi: "MERESPONS_KAIDAH", text: "Penulisan huruf kapital yang benar adalah...", type: "PILIHAN_GANDA", options: ["bahasa Indonesia","Bahasa Indonesia","bahasa indonesia","Bahasa indonesia"], correctAnswer: "1", difficulty: "EASY" },
  { seksi: "MERESPONS_KAIDAH", text: "Kata ulang yang benar adalah...", type: "PILIHAN_GANDA", options: ["Buku-buku","Buku buku","Buku2","Buku-bukuan"], correctAnswer: "0", difficulty: "EASY" },
  { seksi: "MERESPONS_KAIDAH", text: "Partikel \"-lah\" yang benar adalah...", type: "PILIHAN_GANDA", options: ["Makanlah yang teratur","Makan lah yang teratur","Makannya yang teratur","Dimakanlah"], correctAnswer: "0", difficulty: "MEDIUM" },
  { seksi: "MERESPONS_KAIDAH", text: "Kalimat pasif adalah...", type: "PILIHAN_GANDA", options: ["Ayah membaca koran","Koran dibaca ayah","Ayah sedang membaca","Ayah membaca buku"], correctAnswer: "1", difficulty: "MEDIUM" },
  { seksi: "MERESPONS_KAIDAH", text: "Imbuhan \"me-\" yang benar adalah...", type: "PILIHAN_GANDA", options: ["Mentaati","Menataati","Mentaati aturan","Menuruti"], correctAnswer: "1", difficulty: "HARD" },
  { seksi: "MEMBACA", text: "Paragraf: Pendidikan penting untuk pembangunan bangsa. Ide pokoknya adalah...", type: "PILIHAN_GANDA", options: ["Pembangunan bangsa","Pentingnya pendidikan","Peningkatan SDM","Pemerintah dan pendidikan"], correctAnswer: "1", difficulty: "EASY" },
  { seksi: "MEMBACA", text: "Kata \"mereka\" merujuk pada...", type: "PILIHAN_GANDA", options: ["Pembicara","Pendengar","Orang yang dibicarakan","Semua orang"], correctAnswer: "2", difficulty: "EASY" },
  { seksi: "MEMBACA", text: "Kalimat utama biasanya di... paragraf.", type: "PILIHAN_GANDA", options: ["Akhir","Awal","Tengah","Semua"], correctAnswer: "1", difficulty: "EASY" },
  { seksi: "MEMBACA", text: "Sinonim kata \"bahagia\" adalah...", type: "PILIHAN_GANDA", options: ["Sedih","Senang","Marah","Kecewa"], correctAnswer: "1", difficulty: "EASY" },
  { seksi: "MEMBACA", text: "Antonim kata \"besar\" adalah...", type: "PILIHAN_GANDA", options: ["Luas","Kecil","Tinggi","Berat"], correctAnswer: "1", difficulty: "EASY" },
  { seksi: "MEMBACA", text: "Bacaan: Sampah plastik mencemari lingkungan. Kalimat ajakan yang tepat adalah...", type: "PILIHAN_GANDA", options: ["Buang sampah sembarangan","Kurangi penggunaan plastik","Bakar sampah plastik","Timbun sampah plastik"], correctAnswer: "1", difficulty: "EASY" },
  { seksi: "MEMBACA", text: "Kata berantonim dengan \"rajin\" adalah...", type: "PILIHAN_GANDA", options: ["Giat","Malas","Tekun","Sungguh-sungguh"], correctAnswer: "1", difficulty: "EASY" },
  { seksi: "MEMBACA", text: "Kalimat: \"Ibu memasak di dapur.\" Subjek kalimat tersebut adalah...", type: "PILIHAN_GANDA", options: ["Memasak","Ibu","Dapur","Di"], correctAnswer: "1", difficulty: "EASY" },
  { seksi: "MEMBACA", text: "Kata benda abstrak adalah...", type: "PILIHAN_GANDA", options: ["Meja","Kursi","Keadilan","Buku"], correctAnswer: "2", difficulty: "MEDIUM" },
  { seksi: "MEMBACA", text: "Kalimat kompleks adalah kalimat yang memiliki... klausa.", type: "PILIHAN_GANDA", options: ["Satu","Dua atau lebih","Tidak ada","Setengah"], correctAnswer: "1", difficulty: "MEDIUM" },
  { seksi: "MEMBACA", text: "Teks eksposisi bertujuan untuk...", type: "PILIHAN_GANDA", options: ["Menghibur","Meyakinkan","Menceritakan","Mendeskripsikan"], correctAnswer: "1", difficulty: "MEDIUM" },
  { seksi: "MEMBACA", text: "Kata \"pandai\" bersinonim dengan...", type: "PILIHAN_GANDA", options: ["Bodoh","Cerdas","Malas","Lamban"], correctAnswer: "1", difficulty: "EASY" },
];

async function main() {
  let added = 0;
  for (const q of questions) {
    try {
      await p.uKBIQuestion.create({ data: { ...q, isActive: true, isVerified: true } });
      added++;
    } catch(e) { /* skip duplicates */ }
  }
  console.log('Added:', added, 'UKBI questions');
  const total = await p.uKBIQuestion.count();
  console.log('Total UKBI:', total);
  await p.$disconnect();
}
main().catch(e => console.log('Error:', e));
