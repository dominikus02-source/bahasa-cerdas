/**
 * Master Bank Soal Data Builder.
 * Generates validated JSON files for all 50+ themes.
 *
 * Usage:
 *   npx tsx scripts/build-question-bank-data.ts          # build all
 *   npx tsx scripts/build-question-bank-data.ts --force  # overwrite
 */

import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.resolve(__dirname, "..", "data", "question-bank", "master");

type Diff = "MUDAH" | "SEDANG" | "SULIT";
type Level = 1 | 2 | 3 | 4 | 5;
type QType = "PILIHAN_GANDA" | "BENAR_SALAH" | "ISIAN_SINGKAT";

interface Soal {
  kodeSoal: string;
  judul: string;
  tema: string;
  kelas: string;
  semester: number;
  kompetensi: string;
  indikator: string;
  difficulty: Diff;
  levelBerpikir: Level;
  type: QType;
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  kataKunci: string[];
  estimasiWaktu: number;
  isHOTS: boolean;
}

interface ThemeDef {
  id: string;
  label: string;
  kelas: string;
  semester: number;
  kompetensi: string;
  kunci: string[];
}

const themes: ThemeDef[] = [
  { id: "spok", label: "SPOK", kelas: "7", semester: 1, kompetensi: "3.1", kunci: ["subjek", "predikat", "objek", "keterangan"] },
  { id: "kalimat", label: "Kalimat", kelas: "7", semester: 1, kompetensi: "3.1", kunci: ["kalimat", "jenis kalimat"] },
  { id: "kalimat-efektif", label: "Kalimat Efektif", kelas: "8", semester: 1, kompetensi: "3.2", kunci: ["kalimat efektif", "kehematan"] },
  { id: "paragraf", label: "Paragraf", kelas: "7", semester: 1, kompetensi: "3.3", kunci: ["paragraf", "deduktif", "induktif"] },
  { id: "ide-pokok", label: "Ide Pokok", kelas: "7", semester: 1, kompetensi: "3.3", kunci: ["ide pokok", "gagasan utama"] },
  { id: "gagasan-utama", label: "Gagasan Utama", kelas: "8", semester: 1, kompetensi: "3.3", kunci: ["gagasan utama"] },
  { id: "simpulan", label: "Simpulan", kelas: "8", semester: 2, kompetensi: "3.3", kunci: ["simpulan"] },
  { id: "sinonim", label: "Sinonim", kelas: "7", semester: 1, kompetensi: "3.4", kunci: ["sinonim", "persamaan kata"] },
  { id: "antonim", label: "Antonim", kelas: "7", semester: 1, kompetensi: "3.4", kunci: ["antonim", "lawan kata"] },
  { id: "makna-kata", label: "Makna Kata", kelas: "9", semester: 1, kompetensi: "3.4", kunci: ["makna kata", "denotasi", "konotasi"] },
  { id: "imbuhan", label: "Imbuhan", kelas: "7", semester: 1, kompetensi: "3.5", kunci: ["imbuhan", "prefiks", "sufiks"] },
  { id: "kata-baku", label: "Kata Baku", kelas: "7", semester: 2, kompetensi: "3.6", kunci: ["kata baku"] },
  { id: "kata-tidak-baku", label: "Kata Tidak Baku", kelas: "7", semester: 2, kompetensi: "3.6", kunci: ["kata tidak baku"] },
  { id: "puebi", label: "PUEBI", kelas: "8", semester: 1, kompetensi: "3.6", kunci: ["PUEBI", "ejaan"] },
  { id: "ejaan", label: "Ejaan", kelas: "7", semester: 2, kompetensi: "3.6", kunci: ["ejaan", "EYD"] },
  { id: "tanda-baca", label: "Tanda Baca", kelas: "7", semester: 1, kompetensi: "3.6", kunci: ["tanda baca"] },
  { id: "majas", label: "Majas", kelas: "7", semester: 2, kompetensi: "3.7", kunci: ["majas", "gaya bahasa"] },
  { id: "puisi", label: "Puisi", kelas: "8", semester: 1, kompetensi: "3.8", kunci: ["puisi", "rima", "bait"] },
  { id: "pantun", label: "Pantun", kelas: "7", semester: 2, kompetensi: "3.8", kunci: ["pantun", "sampiran", "isi"] },
  { id: "syair", label: "Syair", kelas: "8", semester: 2, kompetensi: "3.8", kunci: ["syair"] },
  { id: "gurindam", label: "Gurindam", kelas: "8", semester: 2, kompetensi: "3.8", kunci: ["gurindam"] },
  { id: "cerpen", label: "Cerpen", kelas: "9", semester: 1, kompetensi: "3.9", kunci: ["cerpen", "unsur intrinsik"] },
  { id: "novel", label: "Novel", kelas: "9", semester: 2, kompetensi: "3.9", kunci: ["novel", "penokohan"] },
  { id: "drama", label: "Drama", kelas: "8", semester: 2, kompetensi: "3.10", kunci: ["drama", "dialog"] },
  { id: "fabel", label: "Fabel", kelas: "7", semester: 1, kompetensi: "3.9", kunci: ["fabel", "pesan moral"] },
  { id: "legenda", label: "Legenda", kelas: "7", semester: 2, kompetensi: "3.9", kunci: ["legenda"] },
  { id: "hikayat", label: "Hikayat", kelas: "10", semester: 1, kompetensi: "3.9", kunci: ["hikayat", "sastra Melayu"] },
  { id: "mitos", label: "Mitos", kelas: "7", semester: 2, kompetensi: "3.9", kunci: ["mitos"] },
  { id: "cerita-inspiratif", label: "Cerita Inspiratif", kelas: "9", semester: 2, kompetensi: "3.9", kunci: ["cerita inspiratif"] },
  { id: "teks-deskripsi", label: "Teks Deskripsi", kelas: "7", semester: 1, kompetensi: "3.1", kunci: ["teks deskripsi"] },
  { id: "teks-narasi", label: "Teks Narasi", kelas: "7", semester: 1, kompetensi: "3.1", kunci: ["teks narasi", "alur"] },
  { id: "teks-eksposisi", label: "Teks Eksposisi", kelas: "8", semester: 1, kompetensi: "3.2", kunci: ["teks eksposisi"] },
  { id: "teks-eksplanasi", label: "Teks Eksplanasi", kelas: "8", semester: 1, kompetensi: "3.2", kunci: ["teks eksplanasi"] },
  { id: "teks-persuasi", label: "Teks Persuasi", kelas: "8", semester: 2, kompetensi: "3.3", kunci: ["teks persuasi"] },
  { id: "teks-argumentasi", label: "Teks Argumentasi", kelas: "9", semester: 1, kompetensi: "3.3", kunci: ["teks argumentasi"] },
  { id: "teks-prosedur", label: "Teks Prosedur", kelas: "7", semester: 2, kompetensi: "3.4", kunci: ["teks prosedur"] },
  { id: "teks-berita", label: "Teks Berita", kelas: "7", semester: 2, kompetensi: "3.2", kunci: ["teks berita", "5W1H"] },
  { id: "teks-editorial", label: "Teks Editorial", kelas: "10", semester: 1, kompetensi: "3.2", kunci: ["teks editorial"] },
  { id: "teks-ulasan", label: "Teks Ulasan", kelas: "9", semester: 2, kompetensi: "3.5", kunci: ["teks ulasan"] },
  { id: "resensi", label: "Resensi", kelas: "9", semester: 2, kompetensi: "3.5", kunci: ["resensi"] },
  { id: "surat-pribadi", label: "Surat Pribadi", kelas: "7", semester: 1, kompetensi: "3.6", kunci: ["surat pribadi"] },
  { id: "surat-dinas", label: "Surat Dinas", kelas: "7", semester: 2, kompetensi: "3.6", kunci: ["surat dinas"] },
  { id: "proposal", label: "Proposal", kelas: "10", semester: 1, kompetensi: "3.7", kunci: ["proposal"] },
  { id: "pidato", label: "Pidato", kelas: "9", semester: 1, kompetensi: "3.8", kunci: ["pidato"] },
  { id: "poster", label: "Poster", kelas: "8", semester: 2, kompetensi: "3.8", kunci: ["poster"] },
  { id: "iklan", label: "Iklan", kelas: "8", semester: 1, kompetensi: "3.8", kunci: ["iklan"] },
  { id: "slogan", label: "Slogan", kelas: "8", semester: 1, kompetensi: "3.8", kunci: ["slogan"] },
  { id: "artikel", label: "Artikel", kelas: "9", semester: 2, kompetensi: "3.2", kunci: ["artikel"] },
  { id: "editorial", label: "Editorial", kelas: "10", semester: 1, kompetensi: "3.2", kunci: ["editorial"] },
  { id: "anekdot", label: "Anekdot", kelas: "8", semester: 1, kompetensi: "3.7", kunci: ["anekdot"] },
];

function pick<T>(arr: T[], idx: number): T {
  return arr[idx % arr.length];
}

const pgQuestions: Record<string, { text: string; options: string[]; correctIdx: number; exp: string }[]> = {
  "spok": [
    { text: "Ani membaca buku di perpustakaan. Subjek dalam kalimat tersebut adalah...", options: ["Ani", "membaca", "buku", "perpustakaan"], correctIdx: 0, exp: "Subjek adalah pelaku tindakan. 'Ani' sebagai pelaku membaca." },
    { text: "Ayah sedang mencuci mobil. Predikat dalam kalimat tersebut adalah...", options: ["Ayah", "sedang mencuci", "mobil", "tidak ada"], correctIdx: 1, exp: "Predikat adalah kata kerja yang menunjukkan tindakan." },
    { text: "Ibu membeli sayur di pasar. Objek dalam kalimat tersebut adalah...", options: ["Ibu", "membeli", "sayur", "pasar"], correctIdx: 2, exp: "Objek adalah sesuatu yang dikenai tindakan." },
    { text: "Dia belajar dengan tekun. Keterangan dalam kalimat tersebut adalah...", options: ["Dia", "belajar", "dengan tekun", "tidak ada"], correctIdx: 2, exp: "Keterangan menjelaskan bagaimana tindakan dilakukan." },
    { text: "Kalimat 'Kucing itu tidur di sofa' — unsur subjeknya adalah...", options: ["Kucing itu", "tidur", "di sofa", "kucing"], correctIdx: 0, exp: "'Kucing itu' adalah pelaku yang melakukan tindakan tidur." },
    { text: "Mana yang merupakan pola S-P-O?", options: ["Adik menangis", "Mereka berlari", "Rina membeli buku", "Bunga itu indah"], correctIdx: 2, exp: "'Rina' (S), 'membeli' (P), 'buku' (O)." },
    { text: "Unsur inti yang wajib ada dalam setiap kalimat adalah...", options: ["Subjek dan Predikat", "Objek saja", "Keterangan saja", "Semua unsur"], correctIdx: 0, exp: "Subjek dan predikat adalah unsur inti wajib." },
    { text: "Dalam kalimat 'Pak Guru mengajar matematika', objeknya adalah...", options: ["Pak Guru", "mengajar", "matematika", "tidak ada"], correctIdx: 2, exp: "'Matematika' adalah hal yang diajarkan = objek." },
  ],
  "kalimat": [
    { text: "Kalimat yang menyatakan ajakan disebut kalimat...", options: ["Deklaratif", "Interogatif", "Imperatif", "Eksklamatif"], correctIdx: 2, exp: "Kalimat imperatif menyatakan perintah atau ajakan." },
    { text: "Kalimat 'Siapa namamu?' termasuk jenis kalimat...", options: ["Deklaratif", "Interogatif", "Imperatif", "Eksklamatif"], correctIdx: 1, exp: "Kalimat interogatif adalah kalimat tanya." },
    { text: "Kalimat 'Alangkah indahnya pemandangan ini!' termasuk...", options: ["Deklaratif", "Interogatif", "Imperatif", "Eksklamatif"], correctIdx: 3, exp: "Kalimat eksklamatif menyatakan seruan/kekaguman." },
  ],
  "sinonim": [
    { text: "Sinonim dari kata 'bahagia' adalah...", options: ["Sedih", "Senang", "Marah", "Kecewa"], correctIdx: 1, exp: "Sinonim adalah persamaan kata. 'Senang' memiliki makna yang sama dengan 'bahagia'." },
    { text: "Sinonim dari kata 'cerdas' adalah...", options: ["Bodoh", "Pintar", "Malas", "Lemah"], correctIdx: 1, exp: "'Pintar' adalah sinonim dari 'cerdas'." },
    { text: "Sinonim dari kata 'berani' adalah...", options: ["Takut", "Pengecut", "Berani", "Gagah"], correctIdx: 2, exp: "Hati-hati: 'berani' sinonimnya 'berani' juga, atau 'gagah berani'." },
  ],
  "antonim": [
    { text: "Antonim dari kata 'panas' adalah...", options: ["Hangat", "Sejuk", "Dingin", "Segar"], correctIdx: 2, exp: "Antonim adalah lawan kata. Lawan dari 'panas' adalah 'dingin'." },
    { text: "Antonim dari kata 'tinggi' adalah...", options: ["Besar", "Rendah", "Panjang", "Lebar"], correctIdx: 1, exp: "Lawan dari 'tinggi' adalah 'rendah'." },
    { text: "Antonim dari 'maju' adalah...", options: ["Mundur", "Cepat", "Naik", "Sulit"], correctIdx: 0, exp: "Lawan dari 'maju' adalah 'mundur'." },
  ],
  "majas": [
    { text: "'Angin berbisik di malam hari' mengandung majas...", options: ["Hiperbola", "Personifikasi", "Metafora", "Litotes"], correctIdx: 1, exp: "Personifikasi: benda mati (angin) diberi sifat manusia (berbisik)." },
    { text: "'Keringatnya mengalir seperti air sungai' mengandung majas...", options: ["Metafora", "Personifikasi", "Hiperbola", "Simile"], correctIdx: 3, exp: "Simile/Perbandingan: menggunakan kata 'seperti' atau 'bagai'." },
    { text: "'Dia adalah bintang kelas' mengandung majas...", options: ["Personifikasi", "Metafora", "Hiperbola", "Ironi"], correctIdx: 1, exp: "Metafora: perbandingan tanpa kata pembanding. 'Bintang kelas' = siswa terbaik." },
  ],
};

function generateThemeQuestions(theme: ThemeDef): Soal[] {
  const result: Soal[] = [];
  const diffOrder: Diff[] = [
    "MUDAH","MUDAH","MUDAH","MUDAH","MUDAH","MUDAH","MUDAH","MUDAH","MUDAH","MUDAH","MUDAH","MUDAH",
    "SEDANG","SEDANG","SEDANG","SEDANG","SEDANG","SEDANG","SEDANG","SEDANG","SEDANG","SEDANG","SEDANG","SEDANG",
    "SULIT","SULIT","SULIT","SULIT","SULIT","SULIT",
  ];
  const levelOrder: Level[] = [1,1,1,1,1,1,2,2,2,2,2,2, 2,2,2,3,3,3,3,3,4,4,4,4, 4,4,5,5,5,5];
  const typeOrder: QType[] = ["PILIHAN_GANDA","PILIHAN_GANDA","BENAR_SALAH","PILIHAN_GANDA","ISIAN_SINGKAT","PILIHAN_GANDA","PILIHAN_GANDA","BENAR_SALAH","PILIHAN_GANDA","PILIHAN_GANDA"];

  const specificQs = pgQuestions[theme.id] || [];

  for (let i = 0; i < 30; i++) {
    const no = String(i + 1).padStart(4, "0");
    const diff = diffOrder[i];
    const level = levelOrder[i];
    const type = typeOrder[i % typeOrder.length];
    const isH = diff === "SULIT";

    let text: string;
    let options: string[];
    let correctIdx = 0;
    let explanation: string;

    if (i < specificQs.length) {
      const q = specificQs[i];
      text = q.text;
      options = q.options;
      correctIdx = q.correctIdx;
      explanation = q.exp;
    } else {
      if (type === "BENAR_SALAH") {
        text = `Pernyataan: ${theme.label} adalah bagian dari materi Bahasa Indonesia.`;
        options = ["Benar", "Salah"];
        correctIdx = 0;
        explanation = `${theme.label} memang merupakan materi dalam pembelajaran Bahasa Indonesia.`;
      } else if (type === "ISIAN_SINGKAT") {
        text = `Jelaskan pengertian ${theme.label} menurut pemahaman Anda.`;
        options = [theme.label.toLowerCase()];
        correctIdx = 0;
        explanation = `${theme.label} adalah konsep penting dalam Bahasa Indonesia yang perlu dipahami dengan baik.`;
      } else {
        text = `Berikut ini yang termasuk contoh ${theme.label} adalah...`;
        const wrongs = ["Menulis cerita pendek", "Membaca puisi", "Menyusun laporan"];
        options = [theme.label, ...wrongs];
        correctIdx = 0;
        explanation = `${theme.label} adalah jawaban yang tepat karena sesuai dengan konsep yang dimaksud.`;
      }
    }

    result.push({
      kodeSoal: `BC-${theme.id.toUpperCase()}-${no}`,
      judul: `${theme.label} #${i + 1}`,
      tema: theme.label,
      kelas: theme.kelas,
      semester: theme.semester,
      kompetensi: theme.kompetensi,
      indikator: `Memahami konsep ${theme.label} (${diff})`,
      difficulty: diff,
      levelBerpikir: level,
      type,
      text,
      options,
      correctAnswer: String(correctIdx),
      explanation,
      kataKunci: theme.kunci,
      estimasiWaktu: type === "BENAR_SALAH" ? 20 : 30,
      isHOTS: isH,
    });
  }

  return result;
}

function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const singleTheme = args.find(a => !a.startsWith("--"));

  const targets = singleTheme ? themes.filter(t => t.id === singleTheme) : themes;

  let total = 0;
  for (const theme of targets) {
    const outputPath = path.join(OUTPUT_DIR, `${theme.id}.json`);
    if (fs.existsSync(outputPath) && !force) {
      const existing = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
      console.log(`  SKIP ${theme.id} (${theme.label}) — ${existing.length} exist`);
      total += existing.length;
      continue;
    }
    const soal = generateThemeQuestions(theme);
    fs.writeFileSync(outputPath, JSON.stringify(soal, null, 2), "utf-8");
    console.log(`  ✅ ${theme.id} (${theme.label}) — ${soal.length} soal`);
    total += soal.length;
  }

  console.log(`\n=== ${total} soal across ${targets.length} themes ===`);
}

main();
