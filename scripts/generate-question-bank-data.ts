/**
 * Batch AI generation script for Master Bank Soal.
 *
 * Generates JSON data files for all 50+ themes. Each theme gets 30 questions
 * with proper distribution: 40% MUDAH, 40% SEDANG, 20% SULIT.
 *
 * Usage:
 *   npx tsx scripts/generate-question-bank-data.ts          # generate all
 *   npx tsx scripts/generate-question-bank-data.ts spok     # single theme
 *   npx tsx scripts/generate-question-bank-data.ts --dry-run # preview only
 *
 * Files are saved to data/question-bank/master/{tema}.json
 * Idempotent — only overwrites if --force is passed.
 */

import * as fs from "fs";
import * as path from "path";

const OUTPUT_DIR = path.resolve(__dirname, "..", "data", "question-bank", "master");

type Diff = "MUDAH" | "SEDANG" | "SULIT";
type Level = 1 | 2 | 3 | 4 | 5;

interface GeneratedSoal {
  kodeSoal: string;
  judul: string;
  tema: string;
  kelas: string;
  semester: number;
  kompetensi: string;
  indikator: string;
  difficulty: Diff;
  levelBerpikir: Level;
  type: "PILIHAN_GANDA" | "BENAR_SALAH" | "ISIAN_SINGKAT";
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
  description: string;
}

const THEMES: ThemeDef[] = [
  { id: "spok", label: "SPOK", kelas: "7", semester: 1, kompetensi: "3.1", description: "Struktur kalimat: Subjek, Predikat, Objek, Keterangan dalam kalimat Bahasa Indonesia" },
  { id: "kalimat", label: "Kalimat", kelas: "7", semester: 1, kompetensi: "3.1", description: "Jenis kalimat (deklaratif, interogatif, imperatif, eksklamatif), kalimat tunggal dan majemuk" },
  { id: "kalimat-efektif", label: "Kalimat Efektif", kelas: "8", semester: 1, kompetensi: "3.2", description: "Ciri-ciri kalimat efektif: kehematan, kesejajaran, ketegasan, kevariasian" },
  { id: "paragraf", label: "Paragraf", kelas: "7", semester: 1, kompetensi: "3.3", description: "Jenis paragraf (deduktif, induktif, campuran), syarat paragraf yang baik" },
  { id: "ide-pokok", label: "Ide Pokok", kelas: "7", semester: 1, kompetensi: "3.3", description: "Ide pokok, gagasan utama, kalimat utama dalam paragraf" },
  { id: "gagasan-utama", label: "Gagasan Utama", kelas: "8", semester: 1, kompetensi: "3.3", description: "Gagasan utama paragraf, gagasan pendukung, gagasan tersirat" },
  { id: "simpulan", label: "Simpulan", kelas: "8", semester: 2, kompetensi: "3.3", description: "Menyimpulkan isi teks, simpulan paragraf, simpulan bacaan" },
  { id: "sinonim", label: "Sinonim", kelas: "7", semester: 1, kompetensi: "3.4", description: "Persamaan kata, padanan kata, sinonim konteks kalimat" },
  { id: "antonim", label: "Antonim", kelas: "7", semester: 1, kompetensi: "3.4", description: "Lawan kata, oposisi makna, antonim dalam kalimat" },
  { id: "makna-kata", label: "Makna Kata", kelas: "9", semester: 1, kompetensi: "3.4", description: "Makna denotatif, konotatif, leksikal, gramatikal, makna kias" },
  { id: "imbuhan", label: "Imbuhan", kelas: "7", semester: 1, kompetensi: "3.5", description: "Prefiks, sufiks, infiks, konfiks, kata berimbuhan dan maknanya" },
  { id: "kata-baku", label: "Kata Baku", kelas: "7", semester: 2, kompetensi: "3.6", description: "Kata baku Bahasa Indonesia, pedoman KBBI" },
  { id: "kata-tidak-baku", label: "Kata Tidak Baku", kelas: "7", semester: 2, kompetensi: "3.6", description: "Kata tidak baku dan bentuk bakunya, kata serapan" },
  { id: "puebi", label: "PUEBI", kelas: "8", semester: 1, kompetensi: "3.6", description: "Pedoman Umum Ejaan Bahasa Indonesia, penulisan huruf, kata, dan tanda baca" },
  { id: "ejaan", label: "Ejaan", kelas: "7", semester: 2, kompetensi: "3.6", description: "Ejaan yang Disempurnakan, penulisan huruf kapital, penulisan kata" },
  { id: "tanda-baca", label: "Tanda Baca", kelas: "7", semester: 1, kompetensi: "3.6", description: "Penggunaan tanda titik, koma, seru, tanya, petik, kurung, dsb" },
  { id: "majas", label: "Majas", kelas: "7", semester: 2, kompetensi: "3.7", description: "Majas perbandingan, pertentangan, sindiran, penegasan" },
  { id: "puisi", label: "Puisi", kelas: "8", semester: 1, kompetensi: "3.8", description: "Unsur puisi, rima, irama, diksi, tema, amanat, larik, bait" },
  { id: "pantun", label: "Pantun", kelas: "7", semester: 2, kompetensi: "3.8", description: "Pantun, sampiran, isi, rima, jenis pantun" },
  { id: "syair", label: "Syair", kelas: "8", semester: 2, kompetensi: "3.8", description: "Syair, ciri-ciri, perbedaan dengan pantun, contoh syair" },
  { id: "gurindam", label: "Gurindam", kelas: "8", semester: 2, kompetensi: "3.8", description: "Gurindam, ciri-ciri, perbedaan dengan puisi rakyat lainnya" },
  { id: "cerpen", label: "Cerpen", kelas: "9", semester: 1, kompetensi: "3.9", description: "Cerita pendek, unsur intrinsik, alur, tokoh, latar, sudut pandang" },
  { id: "novel", label: "Novel", kelas: "9", semester: 2, kompetensi: "3.9", description: "Novel, unsur intrinsik dan ekstrinsik, penokohan, konflik" },
  { id: "drama", label: "Drama", kelas: "8", semester: 2, kompetensi: "3.10", description: "Drama, dialog, monolog, prolog, epilog, babak, adegan" },
  { id: "fabel", label: "Fabel", kelas: "7", semester: 1, kompetensi: "3.9", description: "Fabel, tokoh hewan, pesan moral, alur cerita" },
  { id: "legenda", label: "Legenda", kelas: "7", semester: 2, kompetensi: "3.9", description: "Legenda, cerita rakyat, asal-usul tempat, tokoh legenda" },
  { id: "hikayat", label: "Hikayat", kelas: "10", semester: 1, kompetensi: "3.9", description: "Hikayat, sastra Melayu klasik, istana sentris, kemustahilan" },
  { id: "mitos", label: "Mitos", kelas: "7", semester: 2, kompetensi: "3.9", description: "Mitos, cerita dewa, kepercayaan tradisional, mitos masyarakat" },
  { id: "cerita-inspiratif", label: "Cerita Inspiratif", kelas: "9", semester: 2, kompetensi: "3.9", description: "Cerita inspiratif, pesan moral, keteladanan, motivasi" },
  { id: "teks-deskripsi", label: "Teks Deskripsi", kelas: "7", semester: 1, kompetensi: "3.1", description: "Teks deskripsi, objek, ciri-ciri, kalimat perincian" },
  { id: "teks-narasi", label: "Teks Narasi", kelas: "7", semester: 1, kompetensi: "3.1", description: "Teks narasi, alur cerita, kronologi, tokoh dan latar" },
  { id: "teks-eksposisi", label: "Teks Eksposisi", kelas: "8", semester: 1, kompetensi: "3.2", description: "Teks eksposisi, tesis, argumentasi, penegasan ulang" },
  { id: "teks-eksplanasi", label: "Teks Eksplanasi", kelas: "8", semester: 1, kompetensi: "3.2", description: "Teks eksplanasi, fenomena alam, hubungan kausal" },
  { id: "teks-persuasi", label: "Teks Persuasi", kelas: "8", semester: 2, kompetensi: "3.3", description: "Teks persuasi, ajakan, opini, fakta, kalimat persuasif" },
  { id: "teks-argumentasi", label: "Teks Argumentasi", kelas: "9", semester: 1, kompetensi: "3.3", description: "Teks argumentasi, argumen pro kontra, data pendukung" },
  { id: "teks-prosedur", label: "Teks Prosedur", kelas: "7", semester: 2, kompetensi: "3.4", description: "Teks prosedur, langkah-langkah, tujuan, alat dan bahan" },
  { id: "teks-berita", label: "Teks Berita", kelas: "7", semester: 2, kompetensi: "3.2", description: "Teks berita, 5W+1H, unsur berita, fakta dan opini" },
  { id: "teks-editorial", label: "Teks Editorial", kelas: "10", semester: 1, kompetensi: "3.2", description: "Teks editorial, tajuk rencana, opini redaksi surat kabar" },
  { id: "teks-ulasan", label: "Teks Ulasan", kelas: "9", semester: 2, kompetensi: "3.5", description: "Teks ulasan, resensi, evaluasi karya, kelebihan kekurangan" },
  { id: "resensi", label: "Resensi", kelas: "9", semester: 2, kompetensi: "3.5", description: "Resensi buku, identitas buku, sinopsis, penilaian buku" },
  { id: "surat-pribadi", label: "Surat Pribadi", kelas: "7", semester: 1, kompetensi: "3.6", description: "Surat pribadi, struktur surat, bahasa surat, etika menulis surat" },
  { id: "surat-dinas", label: "Surat Dinas", kelas: "7", semester: 2, kompetensi: "3.6", description: "Surat dinas, kop surat, nomor, lampiran, bahasa formal" },
  { id: "proposal", label: "Proposal", kelas: "10", semester: 1, kompetensi: "3.7", description: "Proposal kegiatan, latar belakang, tujuan, anggaran" },
  { id: "pidato", label: "Pidato", kelas: "9", semester: 1, kompetensi: "3.8", description: "Pidato persuasif, struktur pidato, salam, isi, penutup" },
  { id: "poster", label: "Poster", kelas: "8", semester: 2, kompetensi: "3.8", description: "Poster, pesan visual, tipografi, ilustrasi, ajakan" },
  { id: "iklan", label: "Iklan", kelas: "8", semester: 1, kompetensi: "3.8", description: "Iklan, media cetak dan elektronik, slogan, kalimat persuasif" },
  { id: "slogan", label: "Slogan", kelas: "8", semester: 1, kompetensi: "3.8", description: "Slogan, motto, semboyan, ciri-ciri slogan yang baik" },
  { id: "artikel", label: "Artikel", kelas: "9", semester: 2, kompetensi: "3.2", description: "Artikel ilmiah populer, struktur artikel, gagasan artikel" },
  { id: "editorial", label: "Editorial", kelas: "10", semester: 1, kompetensi: "3.2", description: "Tajuk rencana, opini media massa, sikap redaksi" },
  { id: "anekdot", label: "Anekdot", kelas: "8", semester: 1, kompetensi: "3.7", description: "Teks anekdot, kritik lucu, sindiran, humor" },
];

const TOTAL_PER_THEME = 30;

function generatePrompt(theme: ThemeDef, count: number): string {
  const easyCount = Math.ceil(count * 0.4);
  const mediumCount = Math.ceil(count * 0.4);
  const hardCount = count - easyCount - mediumCount;

  return `Buatkan ${count} soal Bahasa Indonesia untuk MASTER BANK SOAL dengan format JSON array.

TEMA: ${theme.label} (${theme.id})
KELAS: ${theme.kelas}
SEMESTER: ${theme.semester}
KOMPETENSI: ${theme.kompetensi}
DESKRIPSI: ${theme.description}

DISTRIBUSI KESULITAN:
- MUDAH (Level 1-2): ${easyCount} soal — pengetahuan dan pemahaman dasar
- SEDANG (Level 2-4): ${mediumCount} soal — pemahaman, aplikasi, analisis
- SULIT (Level 4-5): ${hardCount} soal — analisis dan evaluasi

TIPE SOAL: Campuran PILIHAN_GANDA (majoritas), BENAR_SALAH, dan ISIAN_SINGKAT

FORMAT OUTPUT (wajib JSON array, tanpa markdown):
[
  {
    "kodeSoal": "BC-${theme.id.toUpperCase()}-XXXX",
    "judul": "Judul singkat soal",
    "tema": "${theme.label}",
    "kelas": "${theme.kelas}",
    "semester": ${theme.semester},
    "kompetensi": "${theme.kompetensi}",
    "indikator": "Indikator pencapaian kompetensi",
    "difficulty": "MUDAH|SEDANG|SULIT",
    "levelBerpikir": 1|2|3|4|5,
    "type": "PILIHAN_GANDA|BENAR_SALAH|ISIAN_SINGKAT",
    "text": "Teks pertanyaan lengkap",
    "options": ["opsi1", "opsi2", "opsi3", "opsi4"],
    "correctAnswer": "0",
    "explanation": "Pembahasan lengkap mengapa jawaban itu benar",
    "kataKunci": ["kata_kunci1", "kata_kunci2"],
    "estimasiWaktu": 30,
    "isHOTS": false
  }
]

ATURAN:
1. correctAnswer adalah INDEX string dari options array (0, 1, 2, 3)
2. Untuk BENAR_SALAH: options = ["Benar", "Salah"], correctAnswer = "0" jika Benar, "1" jika Salah
3. Untuk ISIAN_SINGKAT: options = ["jawaban_benar"], correctAnswer = "0"
4. Bahasa Indonesia yang baik dan benar sesuai PUEBI
5. Soal berkualitas, tidak ambigu, sesuai perkembangan kognitif kelas ${theme.kelas}
6. Kode soal gunakan format BC-${theme.id.toUpperCase()}-0001 sampai BC-${theme.id.toUpperCase()}-${String(count).padStart(4, "0")}
7. Output HANYA JSON array, tidak ada teks lain`;
}

async function callAI(prompt: string): Promise<string> {
  const providers = [
    { name: "deepseek", url: "https://api.deepseek.com/v1/chat/completions", key: process.env.DEEPSEEK_API_KEY, model: "deepseek-chat" },
    { name: "groq", url: "https://api.groq.com/openai/v1/chat/completions", key: process.env.GROQ_API_KEY, model: "openai/gpt-oss-20b" },
    { name: "gemini", url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", key: process.env.GEMINI_API_KEY, model: "" },
  ];

  for (const provider of providers) {
    if (!provider.key) continue;
    try {
      if (provider.name === "gemini") {
        const res = await fetch(provider.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-goog-api-key": provider.key },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.7, maxOutputTokens: 8000 } }),
          signal: AbortSignal.timeout(120000),
        });
        const json = await res.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (text) return text;
      } else {
        const res = await fetch(provider.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${provider.key}` },
          body: JSON.stringify({ model: provider.model, messages: [{ role: "user", content: prompt }], max_tokens: 8000, temperature: 0.7 }),
          signal: AbortSignal.timeout(120000),
        });
        const json = await res.json();
        const text = json?.choices?.[0]?.message?.content || "";
        if (text) return text;
      }
    } catch (e) {
      console.warn(`  ${provider.name} failed: ${(e as Error).message}`);
    }
  }
  throw new Error("All AI providers failed");
}

function parseAIResponse(raw: string, theme: ThemeDef): GeneratedSoal[] {
  let cleaned = raw;
  if (cleaned.includes("```json")) cleaned = cleaned.replace(/```json\n?/g, "").replace(/\n?```/g, "");
  if (cleaned.includes("```")) cleaned = cleaned.replace(/```\n?/g, "");

  const result = JSON.parse(cleaned);
  const soals = Array.isArray(result) ? result : [result];

  return soals.map((s: any, i: number) => ({
    kodeSoal: s.kodeSoal || `BC-${theme.id.toUpperCase()}-${String(i + 1).padStart(4, "0")}`,
    judul: s.judul || `${theme.label} #${i + 1}`,
    tema: theme.label,
    kelas: theme.kelas,
    semester: theme.semester,
    kompetensi: theme.kompetensi,
    indikator: s.indikator || `Memahami ${theme.label.toLowerCase()}`,
    difficulty: (["MUDAH", "SEDANG", "SULIT"].includes(s.difficulty) ? s.difficulty : "SEDANG") as Diff,
    levelBerpikir: ([1, 2, 3, 4, 5].includes(Number(s.levelBerpikir)) ? Number(s.levelBerpikir) : 2) as Level,
    type: (["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"].includes(s.type) ? s.type : "PILIHAN_GANDA") as GeneratedSoal["type"],
    text: s.text || "",
    options: Array.isArray(s.options) ? s.options : [],
    correctAnswer: String(s.correctAnswer || "0"),
    explanation: s.explanation || "",
    kataKunci: Array.isArray(s.kataKunci) ? s.kataKunci : [theme.label.toLowerCase()],
    estimasiWaktu: Number(s.estimasiWaktu) || 30,
    isHOTS: s.difficulty === "SULIT" || s.isHOTS === true,
  }));
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const force = args.includes("--force");
  const singleTheme = args.find(a => !a.startsWith("--"));

  const themes = singleTheme
    ? THEMES.filter(t => t.id === singleTheme)
    : THEMES;

  if (themes.length === 0) {
    console.error(`Theme "${singleTheme}" not found`);
    process.exit(1);
  }

  console.log(`=== Master Bank Soal Generator ===`);
  console.log(`Themes: ${themes.length}`);
  console.log(`Per theme: ${TOTAL_PER_THEME} questions`);
  console.log(`Total: ${themes.length * TOTAL_PER_THEME} questions`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Force overwrite: ${force}`);
  console.log("");

  let totalGenerated = 0;
  for (const theme of themes) {
    const outputPath = path.join(OUTPUT_DIR, `${theme.id}.json`);

    if (fs.existsSync(outputPath) && !force && !singleTheme) {
      const existing = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
      console.log(`  SKIP ${theme.id} (${theme.label}) — ${existing.length} soal already exists`);
      totalGenerated += existing.length;
      continue;
    }

    console.log(`  GENERATING ${theme.id} (${theme.label}) — ${TOTAL_PER_THEME} soal...`);

    if (dryRun) {
      console.log(`  [dry-run] Would generate ${TOTAL_PER_THEME} soal for ${theme.label}`);
      continue;
    }

    try {
      const prompt = generatePrompt(theme, TOTAL_PER_THEME);
      const raw = await callAI(prompt);
      const soals = parseAIResponse(raw, theme);

      fs.writeFileSync(outputPath, JSON.stringify(soals, null, 2), "utf-8");
      console.log(`  ✅ ${theme.id} — ${soals.length} soal saved`);
      totalGenerated += soals.length;
    } catch (e) {
      console.error(`  ❌ ${theme.id} FAILED: ${(e as Error).message}`);
    }

    // Rate limit: wait 2s between themes
    if (!singleTheme) await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\n=== Done: ${totalGenerated} soal generated ===`);
}

main().catch(console.error);
