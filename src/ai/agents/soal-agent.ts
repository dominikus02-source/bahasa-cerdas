/**
 * Soal / Assessment Agent — production-quality
 *
 * Generates high-quality assessment questions for teachers.
 * Supports multiple question types, difficulty levels, and Bloom's taxonomy.
 */

import { z } from "zod";
import type { AgentDefinition, AgentRunContext, AgentRunResult } from "../core/agent-types";
import { registerAgent } from "../core/agent-registry";
import { runAgent } from "../core/agent-runner";

const questionTypeEnum = z.enum([
  "pilihan_ganda",
  "pilihan_ganda_kompleks",
  "benar_salah",
  "menjodohkan",
  "isian_singkat",
  "uraian",
  "cloze",
  "akm_literasi",
  "pisa_style",
]);

export const soalInputSchema = z.object({
  subject: z.string().min(1, "Mata pelajaran wajib diisi"),
  grade: z.string().min(1, "Kelas wajib diisi"),
  topic: z.string().min(1, "Topik wajib diisi"),
  subtopic: z.string().optional(),
  curriculum: z.enum(["Kurikulum Merdeka", "K13", "Custom"]).default("Kurikulum Merdeka"),
  questionCount: z.number().min(1).max(30).default(5),
  questionTypes: z.array(questionTypeEnum).min(1, "Setidaknya satu jenis soal diperlukan"),
  difficulty: z.enum(["mudah", "sedang", "sulit", "campuran"]).default("campuran"),
  bloomLevel: z.enum(["C1", "C2", "C3", "C4", "C5", "C6", "campuran"]).default("campuran"),
  includeAnswerKey: z.boolean().default(true),
  includeExplanation: z.boolean().default(true),
  includeRubric: z.boolean().default(false),
  stimulusText: z.string().optional(),
  languageStyle: z.enum(["anak", "remaja", "formal", "praktis"]).default("remaja"),
});

const rubricSchema = z.object({
  maxScore: z.number(),
  criteria: z.array(z.string()),
});

export const soalOutputSchema = z.object({
  title: z.string(),
  metadata: z.object({
    subject: z.string(),
    grade: z.string(),
    topic: z.string(),
    difficulty: z.string(),
    questionCount: z.number(),
  }),
  stimulus: z
    .object({
      title: z.string(),
      text: z.string(),
      sourceNote: z.string().optional(),
    })
    .optional(),
  questions: z.array(
    z.object({
      number: z.number(),
      type: z.string(),
      question: z.string(),
      options: z.array(z.string()).optional(),
      pairs: z
        .array(z.object({ left: z.string(), right: z.string() }))
        .optional(),
      answer: z.union([z.string(), z.array(z.string())]),
      explanation: z.string().optional(),
      difficulty: z.enum(["mudah", "sedang", "sulit"]),
      bloomLevel: z.enum(["C1", "C2", "C3", "C4", "C5", "C6"]),
      learningObjective: z.string(),
      rubric: rubricSchema.optional(),
    })
  ),
  answerKeyText: z.string(),
  teacherNotes: z.array(z.string()),
  editableText: z.string().min(1, "editableText tidak boleh kosong"),
});

const agent: AgentDefinition<
  z.infer<typeof soalInputSchema>,
  z.infer<typeof soalOutputSchema>
> = {
  id: "soal",
  name: "Soal / Assessment Agent",
  description:
    "Hasilkan soal Bahasa Indonesia berkualitas tinggi dengan berbagai tipe, tingkat kesulitan, dan level kognitif Bloom.",
  role: "Asisten pembuat soal Bahasa Indonesia yang menghasilkan pertanyaan berkualitas sesuai taksonomi Bloom dan kurikulum.",
  targetUser: "guru",
  capabilities: [
    {
      id: "generate-soal",
      label: "Generate Soal",
      description:
        "Buat soal pilihan ganda, isian, essay, benar-salah, menjodohkan, cloze, AKM, dan PISA-style",
    },
    {
      id: "hots-questions",
      label: "Soal HOTS",
      description: "Generate soal level C4-C6 (High Order Thinking Skills)",
    },
    {
      id: "bloom-alignment",
      label: "Sesuaikan Bloom",
      description:
        "Atur level kognitif dari C1 (mengingat) hingga C6 (kreasi)",
    },
    {
      id: "akm-pisa",
      label: "AKM/PISA Style",
      description:
        "Soal literasi model AKM dan PISA dengan stimulus teks",
    },
  ],
  limitations: [
    "Soal bersifat generik — perlu divalidasi guru sebelum digunakan",
    "Tidak bisa generate soal berdasarkan teks/gambar yang diupload (belum support multimodal)",
    "Jumlah soal per batch dibatasi 30 untuk menjaga kualitas",
    "Tidak bisa mengecek duplikasi dengan soal yang sudah ada di database",
  ],
  systemPrompt: `Kamu adalah asisten pembuat soal Bahasa Indonesia yang sangat ahli dan berpengalaman. Tugasmu adalah membuat soal berkualitas tinggi yang sesuai kurikulum dan kebutuhan asesmen Guru Indonesia.

OUTPUT JSON WAJIB mengandung field berikut:
- title: judul soal
- metadata: { subject, grade, topic, difficulty, questionCount }
- stimulus (opsional): { title, text, sourceNote? } — wajib untuk type akm_literasi dan pisa_style
- questions: array of object dengan field:
  - number: nomor urut
  - type: jenis soal
  - question: teks pertanyaan
  - options[]: hanya untuk pilihan_ganda, pilihan_ganda_kompleks
  - pairs: [{ left, right }] — hanya untuk menjodohkan
  - answer: kunci jawaban (string atau string[])
  - explanation: penjelasan (jika includeExplanation=true)
  - difficulty: mudah / sedang / sulit
  - bloomLevel: C1 / C2 / C3 / C4 / C5 / C6
  - learningObjective: tujuan pembelajaran spesifik untuk soal ini (gunakan KKO — Kata Kerja Operasional)
  - rubric: { maxScore, criteria[] } — hanya untuk uraian jika includeRubric=true
- answerKeyText: teks kunci jawaban yang rapi (selalu ada jika includeAnswerKey=true)
- teacherNotes: array catatan untuk guru
- editableText: teks format rapi yang bisa dicopy guru (BUKAN JSON)

ATURAN KURIKULUM:
1. Untuk Kurikulum Merdeka: learningObjective harus sesuai KKO (Kata Kerja Operasional) yang selaras dengan TP (Tujuan Pembelajaran). Contoh: C1 = menyebutkan, mengidentifikasi; C2 = menjelaskan, mendeskripsikan; C3 = menerapkan, menggunakan; C4 = menganalisis, membandingkan; C5 = mengevaluasi, menilai; C6 = menciptakan, merancang.
2. Untuk K13: learningObjective sesuai dengan IPK (Indikator Pencapaian Kompetensi).
3. Soal AKM Literasi: fokus pada kemampuan menemukan informasi (C1-C2), memahami (C2-C3), mengevaluasi (C4-C5). Stimulus wajib adalah teks informatif/sastra pendek (100-200 kata).
4. Soal PISA-style: stimulus bisa berupa infografis, tabel, atau teks multimodal. Pertanyaan mengukur literasi membaca dalam konteks personal, sosial, pendidikan, atau global.

ATURAN PENTING:
1. Output JSON VALID SAJA. Tidak ada markdown fences. Tidak ada teks di luar JSON.
2. Jumlah questions HARUS sama persis dengan questionCount.
3. Setiap pertanyaan harus UNIK — tidak boleh ada duplikasi teks soal.
4. Pilihan ganda: 4 opsi (A-D), distractor harus PLAUSIBLE, homogen panjang dan gaya penulisan. Hindari pola "semua jawaban benar" atau "tidak ada yang benar" kecuali memang soal yang dimaksud.
5. Pilihan ganda kompleks: 5 opsi, bisa memilih lebih dari satu jawaban benar. Format answer: ["A", "C"].
6. Untuk soal AKM/PISA: wajib menyertakan stimulus (teks bacaan/infografis). Jika user tidak memberikan stimulus, buat stimulus orisinal 100-200 kata sendiri. JANGAN gunakan teks berhak cipta.
7. Untuk siswa SD (kelas 1-6): bahasa sederhana, kalimat pendek (maks 15 kata), instruksi jelas, contoh dari kehidupan sehari-hari.
8. Untuk siswa SMP (kelas 7-9): bahasa remaja, konteks pertemanan, sekolah, lingkungan, media sosial. Kalimat 10-20 kata.
9. Untuk siswa SMA (kelas 10-12): bahasa formal, analitis. Kalimat bisa lebih panjang. Gunakan istilah sastra dan kebahasaan yang sesuai.
10. Jika includeAnswerKey=true, setiap soal harus memiliki answer yang benar secara faktual.
11. Jika includeExplanation=true, setiap soal harus memiliki explanation yang informatif dan edukatif.
12. Jika includeRubric=true, soal uraian harus memiliki rubric dengan kriteria yang jelas.
13. Jika difficulty="campuran", sebar soal: 40% mudah, 40% sedang, 20% sulit.
14. Untuk HOTS (C4-C6): soal harus menuntut analisis, evaluasi, atau kreasi — bukan sekadar mengingat. Beri stimulus atau kasus yang perlu dipecahkan.
15. Gunakan Bahasa Indonesia yang baik dan benar sesuai EYD/PUEBI.
16. Kunci jawaban harus diverifikasi kebenarannya. Jangan buat soal yang ambigu atau multi-tafsir.`,
  defaultModel: "deepseek-chat",
  temperature: 0.7,
  maxTokens: 8000,
  inputSchema: soalInputSchema,
  outputSchema: soalOutputSchema,
  workflowSteps: [
    {
      id: "analyze-request",
      name: "Analisis Permintaan",
      description: "Memahami topik, jenis soal, tingkat kesulitan, dan level Bloom",
      order: 1,
    },
    {
      id: "generate-stimulus",
      name: "Buat Stimulus",
      description:
        "Membuat teks stimulus untuk soal AKM/PISA jika diperlukan",
      order: 2,
    },
    {
      id: "generate-questions",
      name: "Buat Pertanyaan",
      description: "Menulis soal dan kunci jawaban sesuai spesifikasi",
      order: 3,
    },
    {
      id: "validate-count",
      name: "Validasi Jumlah",
      description:
        "Memastikan jumlah soal sesuai questionCount dan tidak ada duplikasi",
      order: 4,
    },
  ],
  qualityChecklist: [
    {
      id: "q-count",
      label: "Jumlah Sesuai",
      description: "Jumlah soal sama dengan questionCount",
      severity: "error",
    },
    {
      id: "q-answer-key",
      label: "Kunci Jawaban Valid",
      description: "Semua soal punya kunci jawaban yang benar",
      severity: "error",
    },
    {
      id: "q-distractors",
      label: "Distractor Berkualitas",
      description:
        "Pilihan pengecoh homogen, panjang mirip, dan masuk akal",
      severity: "warning",
    },
    {
      id: "q-unique",
      label: "Tidak Duplikasi",
      description: "Tidak ada teks pertanyaan yang sama",
      severity: "error",
    },
    {
      id: "q-difficulty",
      label: "Kesulitan Sesuai",
      description: "Tingkat kesulitan sesuai permintaan",
      severity: "warning",
    },
  ],
  safetyRules: [
    {
      id: "s-no-keys",
      rule: "Jangan pernah menyertakan API key dalam output",
      category: "security",
    },
    {
      id: "s-no-sensitive",
      rule: "Jangan buat soal dengan konten sensitif/SARA/kekerasan",
      category: "content",
    },
    {
      id: "s-correctness",
      rule: "Kunci jawaban harus benar secara faktual",
      category: "pedagogy",
    },
    {
      id: "s-no-copyright",
      rule: "Jangan gunakan teks berhak cipta panjang sebagai stimulus",
      category: "content",
    },
  ],
  examples: [
    {
      name: "Soal Teks Prosedur",
      description: "5 soal pilihan ganda tentang teks prosedur kelas VII",
      input: {
        subject: "Bahasa Indonesia",
        grade: "VII",
        topic: "Teks Prosedur",
        questionCount: 5,
        questionTypes: ["pilihan_ganda"],
        difficulty: "campuran",
        includeAnswerKey: true,
        includeExplanation: true,
      },
      output: {
        title: "Soal Teks Prosedur Kelas VII",
        metadata: {
          subject: "Bahasa Indonesia",
          grade: "VII",
          topic: "Teks Prosedur",
          difficulty: "campuran",
          questionCount: 5,
        },
        questions: [
          {
            number: 1,
            type: "pilihan_ganda",
            question:
              "Perhatikan langkah-langkah berikut!\\n(1) Siapkan bahan dan alat\\n(2) Potong sayuran sesuai selera\\n(3) Rebus air hingga mendidih\\n(4) Masukkan sayuran secara bertahap\\nTeks tersebut termasuk jenis teks...",
            options: [
              "Teks deskripsi",
              "Teks prosedur",
              "Teks narasi",
              "Teks eksposisi",
            ],
            answer: "Teks prosedur",
            explanation:
              "Teks prosedur berisi langkah-langkah melakukan sesuatu secara urut.",
            difficulty: "mudah",
            bloomLevel: "C1",
            learningObjective: "Mengidentifikasi jenis teks prosedur",
          },
        ],
        answerKeyText: "1. B (Teks prosedur)",
        teacherNotes: [
          "Pastikan siswa sudah memahami ciri-ciri teks prosedur",
        ],
        editableText:
          "1. Teks tersebut termasuk jenis teks...\\n   A. Teks deskripsi\\n   B. Teks prosedur\\n   C. Teks narasi\\n   D. Teks eksposisi\\n   Jawaban: B",
      },
    },
  ],

  async run(input, context): Promise<AgentRunResult> {
    return runAgent({ agent, input, context });
  },
};

registerAgent(agent);
export default agent;
