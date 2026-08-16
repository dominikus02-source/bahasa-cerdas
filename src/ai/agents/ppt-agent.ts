/**
 * PPT / Teaching Slide Agent — production-quality
 *
 * Generates slide-ready teaching content for classroom presentations.
 * Output structured data ready for PPTX export via pptxgenjs.
 */

import { z } from "zod";
import type { AgentDefinition, AgentRunContext, AgentRunResult } from "../core/agent-types";
import { registerAgent } from "../core/agent-registry";
import { runAgent } from "../core/agent-runner";

export const pptInputSchema = z.object({
  subject: z.string().min(1, "Mata pelajaran wajib diisi"),
  grade: z.string().min(1, "Kelas wajib diisi"),
  topic: z.string().min(1, "Topik wajib diisi"),
  duration: z.string().default("2 JP x 45 menit"),
  slideCount: z.number().min(5).max(30).default(10),
  learningObjective: z.string().min(1, "Tujuan pembelajaran wajib diisi"),
  teachingStyle: z
    .enum([
      "ceramah_interaktif",
      "diskusi",
      "project_based",
      "game_based",
      "storytelling",
    ])
    .default("ceramah_interaktif"),
  visualStyle: z
    .enum([
      "clean_modern",
      "kids_friendly",
      "formal_school",
      "premium_education",
    ])
    .default("clean_modern"),
  includeQuiz: z.boolean().default(false),
  includeActivity: z.boolean().default(true),
  languageStyle: z
    .enum(["ringkas", "formal", "anak", "praktis"])
    .default("praktis"),
});

const quizSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).optional(),
  answer: z.string(),
});

export const pptOutputSchema = z.object({
  title: z.string(),
  metadata: z.object({
    subject: z.string(),
    grade: z.string(),
    topic: z.string(),
    slideCount: z.number(),
    visualStyle: z.string(),
  }),
  slides: z.array(
    z.object({
      slideNumber: z.number(),
      title: z.string(),
      subtitle: z.string().optional(),
      bullets: z.array(z.string()),
      speakerNotes: z.string().min(1, "Setiap slide harus punya speakerNotes"),
      visualSuggestion: z
        .string()
        .min(1, "Setiap slide harus punya visualSuggestion"),
      activityPrompt: z.string().optional(),
      quiz: quizSchema.optional(),
    })
  ),
  openingScript: z.string(),
  closingReflection: z.string(),
  teacherNotes: z.array(z.string()),
  editableText: z.string().min(1, "editableText tidak boleh kosong"),
});

const agent: AgentDefinition<
  z.infer<typeof pptInputSchema>,
  z.infer<typeof pptOutputSchema>
> = {
  id: "ppt",
  name: "PPT / Teaching Slide Agent",
  description:
    "Hasilkan konten slide presentasi pembelajaran Bahasa Indonesia yang siap pakai, dengan narasi guru, aktivitas siswa, dan saran visual.",
  role: "Asisten pembuat presentasi pembelajaran Bahasa Indonesia dengan konten pedagogis yang mendalam.",
  targetUser: "guru",
  capabilities: [
    {
      id: "generate-slides",
      label: "Generate Slide",
      description:
        "Buat konten slide presentasi dari topik dan tujuan pembelajaran",
    },
    {
      id: "curriculum-research",
      label: "Riset Kurikulum",
      description:
        "Analisis CP, TP, KD sebelum menulis slide",
    },
    {
      id: "student-activity",
      label: "Aktivitas Siswa",
      description:
        "Sertakan aktivitas interaktif di slide",
    },
    {
      id: "quiz-integration",
      label: "Kuis Slide",
      description: "Sisipkan kuis interaktif dalam presentasi",
    },
  ],
  limitations: [
    "Output berupa data JSON — perlu dirender ke PPTX melalui pptxgenjs",
    "Saran visual bersifat teks — tidak bisa embed gambar langsung",
    "Kualitas bergantung pada model AI yang digunakan",
  ],
  systemPrompt: `Kamu adalah ahli desain presentasi pembelajaran Bahasa Indonesia. Tugasmu membuat konten slide yang siap pakai untuk mengajar di kelas.

OUTPUT JSON WAJIB mengandung field berikut:
- title: judul presentasi
- metadata: { subject, grade, topic, slideCount, visualStyle }
- slides: array of object — HARUS berjumlah tepat slideCount, masing-masing:
  - slideNumber: nomor slide (1, 2, 3, ...)
  - title: judul slide (maks 8 kata)
  - subtitle: subjudul (opsional)
  - bullets: array poin-poin (maks 5 per slide, masing-masing maks 15 kata)
  - speakerNotes: narasi yang bisa diucapkan guru (1-2 kalimat)
  - visualSuggestion: deskripsi visual/ilustrasi untuk slide (misal: "Foto siswa berdiskusi kelompok")
  - activityPrompt: instruksi aktivitas siswa (hanya jika includeActivity=true, minimal 1 slide)
  - quiz: { question, options[], answer } (hanya jika includeQuiz=true, minimal 1 slide)
- openingScript: narasi pembukaan guru (3-5 kalimat)
- closingReflection: narasi penutup dan refleksi (3-5 kalimat)
- teacherNotes: array tips untuk guru
- editableText: teks format rapi yang bisa dicopy (BUKAN JSON)

ATURAN PENTING:
1. Output JSON VALID SAJA. Tidak ada markdown fences. Tidak ada teks di luar JSON.
2. Jumlah slides HARUS tepat slideCount.
3. Setiap slide WAJIB memiliki: title, bullets, speakerNotes, visualSuggestion.
4. Bullets harus RINGKAS — maksimal 5 poin per slide, masing-masing maksimal 15 kata.
5. Tidak ada slide yang berupa wall of text.
6. Jika includeQuiz=true, pastikan minimal ada 1 slide dengan field quiz.
7. Jika includeActivity=true, pastikan minimal ada 1 slide dengan field activityPrompt.
8. VisualStyle mempengaruhi saran visual:
   - kids_friendly: warna cerah, ilustrasi kartun, font besar
   - clean_modern: minimalis, putih bersih, ikon sederhana
   - formal_school: biru/putih, struktur rapi, logo sekolah
   - premium_education: elegan, gradasi warna, foto berkualitas
9. TeachingStyle mempengaruhi aktivitas:
   - ceramah_interaktif: tanya jawab di sela penjelasan
   - diskusi: slide dengan pertanyaan diskusi kelompok
   - project_based: slide panduan proyek
   - game_based: kuis dan permainan
   - storytelling: alur cerita dan narasi
 10. Sesuaikan bahasa dengan languageStyle:
    - ringkas: poin pendek, to the point
    - formal: bahasa baku, istilah teknis
    - anak: bahasa santai untuk SD
    - praktis: langsung bisa dipakai
11. Gunakan Bahasa Indonesia yang baik dan benar.
12. Jumlah slides HARUS PERSIS sama dengan slideCount. DILARANG mengembalikan array slides kosong.
13. Bullets TANPA markdown (tanpa **, tanpa tanda "-" di awal, tanpa #) — teks polos ringkas.
14. Jika total output mendekati batas panjang: PRIORITASKAN melengkapi SEMUA slides (jangan pernah menghapus slide); openingScript dan closingReflection boleh diringkas 2-3 kalimat.
15. Output HANYA satu objek JSON — tanpa markdown fences, tanpa komentar, tanpa teks pembuka/penutup di luar JSON.`,
  defaultModel: "deepseek-chat",
  temperature: 0.7,
  maxTokens: 8000,
  inputSchema: pptInputSchema,
  outputSchema: pptOutputSchema,
  workflowSteps: [
    {
      id: "analyze-input",
      name: "Analisis Kebutuhan",
      description: "Memahami topik, kelas, gaya mengajar, dan preferensi visual",
      order: 1,
    },
    {
      id: "storyboard",
      name: "Storyboard Slide",
      description: "Menentukan urutan dan jenis setiap slide",
      order: 2,
    },
    {
      id: "write-content",
      name: "Tulis Konten Slide",
      description: "Mengisi setiap slide dengan bullet, speakerNotes, visualSuggestion",
      order: 3,
    },
    {
      id: "add-interactivity",
      name: "Tambah Interaktivitas",
      description: "Menambahkan kuis dan aktivitas sesuai permintaan",
      order: 4,
    },
  ],
  qualityChecklist: [
    {
      id: "q-slide-count",
      label: "Jumlah Slide Sesuai",
      description: "Array slides length sama dengan slideCount",
      severity: "error",
    },
    {
      id: "q-speaker-notes",
      label: "Semua Slide Punya Speaker Notes",
      description: "Setiap slide memiliki speakerNotes yang tidak kosong",
      severity: "error",
    },
    {
      id: "q-visual-suggestion",
      label: "Semua Slide Punya Visual Suggestion",
      description: "Setiap slide memiliki visualSuggestion",
      severity: "warning",
    },
    {
      id: "q-concise",
      label: "Bullets Ringkas",
      description: "Bullets tidak terlalu panjang atau terlalu banyak",
      severity: "warning",
    },
    {
      id: "q-interactivity",
      label: "Interaktivitas Terpenuhi",
      description: "Kuis dan aktivitas disertakan sesuai permintaan",
      severity: "error",
    },
  ],
  safetyRules: [
    {
      id: "s-no-keys",
      rule: "Jangan pernah menyertakan API key dalam output",
      category: "security",
    },
    {
      id: "s-no-pii",
      rule: "Jangan generate konten dengan data pribadi",
      category: "privacy",
    },
    {
      id: "s-age-appropriate",
      rule: "Contoh dan saran visual harus sesuai usia siswa",
      category: "content",
    },
    {
      id: "s-no-stereotypes",
      rule: "Hindari stereotip gender, suku, atau agama dalam contoh",
      category: "content",
    },
  ],
  examples: [
    {
      name: "Presentasi Teks Anekdot",
      description: "Slide presentasi teks anekdot kelas X, gaya ceramah interaktif",
      input: {
        subject: "Bahasa Indonesia",
        grade: "X",
        topic: "Teks Anekdot",
        slideCount: 8,
        learningObjective: "Menganalisis struktur dan kebahasaan teks anekdot",
        teachingStyle: "ceramah_interaktif",
        visualStyle: "clean_modern",
        includeQuiz: true,
        includeActivity: true,
      },
      output: {
        title: "Teks Anekdot",
        metadata: {
          subject: "Bahasa Indonesia",
          grade: "X",
          topic: "Teks Anekdot",
          slideCount: 8,
          visualStyle: "clean_modern",
        },
        slides: [
          {
            slideNumber: 1,
            title: "Teks Anekdot",
            subtitle: "Bahasa Indonesia | Kelas X",
            bullets: [
              "Pengertian teks anekdot",
              "Ciri-ciri teks anekdot",
              "Tujuan pembelajaran",
            ],
            speakerNotes:
              "Selamat pagi, siswa hebat! Hari ini kita akan belajar teks anekdot.",
            visualSuggestion:
              "Slide judul dengan ilustrasi kartun situasi lucu di sekolah",
          },
        ],
        openingScript:
          "Selamat pagi, siswa hebat! Hari ini kita akan belajar tentang teks anekdot...",
        closingReflection:
          "Apa yang kalian pelajari hari ini? Bagaimana struktur teks anekdot?",
        teacherNotes: [
          "Pastikan siswa aktif bertanya",
          "Berikan contoh anekdot dari kehidupan sehari-hari",
        ],
        editableText:
          "Slide 1: Teks Anekdot\\n... (format teks rapi panjang)",
      },
    },
  ],

  async run(input, context): Promise<AgentRunResult> {
    return runAgent({ agent, input, context });
  },
};

registerAgent(agent);
export default agent;
