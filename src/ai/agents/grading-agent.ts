import { z } from "zod";
import type { AgentDefinition, AgentRunContext, AgentRunResult } from "../core/agent-types";
import { registerAgent } from "../core/agent-registry";
import { runAgent } from "../core/agent-runner";

const inputSchema = z.object({
  studentAnswer: z.string().min(1, "Jawaban siswa wajib diisi"),
  questionOrTask: z.string().optional(),
  rubric: z.string().optional(),
  maxScore: z.number().min(1).max(1000).default(100),
  grade: z.string().optional(),
  feedbackTone: z.enum(["ramah", "tegas", "akademik"]).default("akademik"),
});

const outputSchema = z.object({
  score: z.number().min(0),
  maxScore: z.number().min(1),
  gradeLabel: z.string(),
  reasoning: z.string(),
  rubricBreakdown: z.array(z.object({
    criterion: z.string(),
    score: z.number().min(0),
    maxScore: z.number().min(1),
    comment: z.string(),
  })),
  feedbackForStudent: z.string(),
  teacherNotes: z.array(z.string()),
  editableText: z.string(),
});

const agent: AgentDefinition<z.infer<typeof inputSchema>, z.infer<typeof outputSchema>> = {
  id: "grading",
  name: "Penilaian Otomatis",
  description: "Bantu nilai jawaban esai/tulisan siswa dengan rubrik jelas, skor, dan feedback untuk siswa.",
  role: "Asisten penilaian yang fair, transparan, dan konsisten dalam menilai jawaban siswa.",
  targetUser: "guru",
  capabilities: [
    { id: "nilai-esai", label: "Nilai Esai", description: "Nilai jawaban esai dengan rubrik multi-kriteria" },
    { id: "feedback-skor", label: "Feedback + Skor", description: "Skor numerik + feedback untuk siswa" },
    { id: "rubrik-kustom", label: "Rubrik Kustom", description: "Gunakan rubrik yang ditentukan guru atau rubrik umum" },
  ],
  limitations: [
    "Tidak bisa menilai jawaban di luar konteks teks — tidak akses materi ajar",
    "Skor bersifat rekomendasi — keputusan akhir pada guru",
    "Tidak bisa menilai ujian lisan atau presentasi",
    "Untuk PG, gunakan kunci jawaban manual — agent ini khusus esai/uraian",
  ],
  systemPrompt: `Kamu adalah asisten penilaian yang ahli dalam mengevaluasi jawaban esai dan uraian siswa secara objektif, fair, dan transparan.

Tugasmu adalah menilai jawaban siswa dengan rubrik yang jelas dan memberikan feedback yang membangun.

OUTPUT JSON:
{
  "score": <skor numerik 0-maxScore>,
  "maxScore": <skor maksimal>,
  "gradeLabel": "A/B/C/D/E — berdasarkan persentase A>=85, B>=70, C>=55, D<55, E<40",
  "reasoning": "Penjelasan mengapa skor ini diberikan secara keseluruhan",
  "rubricBreakdown": [
    {
      "criterion": "Nama kriteria (misal: Isi/Konten)",
      "score": <skor untuk kriteria ini>,
      "maxScore": <skor maksimal untuk kriteria ini>,
      "comment": "Komentar spesifik untuk kriteria ini"
    }
  ],
  "feedbackForStudent": "Feedback untuk siswa — bahasa sesuai feedbackTone dan jenjang grade",
  "teacherNotes": ["Catatan untuk guru — analisis tambahan, saran tindak lanjut"],
  "editableText": "Hasil penilaian lengkap dalam format teks rapi"
}

ATURAN:
1. Skor harus antara 0 dan maxScore.
2. Jangan overstated certainty — jika ragu, sampaikan secara transparan.
3. Jika rubrik disediakan, gunakan rubrik tersebut untuk menilai.
4. Jika rubrik tidak disediakan, gunakan rubrik umum: Isi/Konten (40%), Struktur (20%), Bahasa (20%), Analisis/Kreativitas (20%).
5. rubrikBreakdown total harus konsisten dengan score keseluruhan.
6. gradeLabel: A (>=85%), B (>=70%), C (>=55%), D (<55%), E (<40%).
7. feedbackForStudent: gunakan bahasa sesuai feedbackTone dan jenjang grade.
8. Output JSON VALID SAJA. Tidak ada markdown fences. Tidak ada teks di luar JSON.`,
  defaultModel: "deepseek-chat",
  temperature: 0.3,
  maxTokens: 4000,
  inputSchema,
  outputSchema,
  workflowSteps: [
    { id: "read-question", name: "Baca Pertanyaan", description: "Pahami soal/tugas yang diberikan", order: 1 },
    { id: "analyze-answer", name: "Analisis Jawaban", description: "Evaluasi jawaban siswa terhadap rubrik", order: 2 },
    { id: "score", name: "Beri Skor", description: "Hitung skor per kriteria dan total", order: 3 },
    { id: "generate-feedback", name: "Beri Feedback", description: "Tulis feedback untuk siswa dan catatan guru", order: 4 },
  ],
  qualityChecklist: [
    { id: "q-score-range", label: "Skor Valid", description: "Skor dalam rentang 0-maxScore", severity: "error" },
    { id: "q-rubric-consistent", label: "Rubrik Konsisten", description: "Skor per kriteria konsisten dengan skor total", severity: "error" },
    { id: "q-fair", label: "Penilaian Fair", description: "Penilaian objektif, tidak bias", severity: "error" },
    { id: "q-editable", label: "Teks Siap Edit", description: "editableText berisi hasil lengkap siap copy", severity: "warning" },
  ],
  safetyRules: [
    { id: "s-no-keys", rule: "Jangan pernah menyertakan API key", category: "security" },
    { id: "s-no-bias", rule: "Jangan bias berdasarkan nama, gender, atau latar belakang siswa", category: "content" },
    { id: "s-fair", rule: "Jika ragu, beri benefit of the doubt dan catat dalam teacherNotes", category: "pedagogy" },
  ],
  examples: [
    {
      name: "Nilai esai tentang pemanasan global",
      description: "Siswa menjawab esai tentang penyebab pemanasan global",
      input: { studentAnswer: "Pemanasan global disebabkan oleh gas rumah kaca dari kendaraan dan pabrik. Efeknya suhu bumi naik dan es di kutub mencair.", questionOrTask: "Jelaskan penyebab dan efek pemanasan global", maxScore: 100, grade: "10", feedbackTone: "ramah" },
      output: {
        score: 75,
        maxScore: 100,
        gradeLabel: "B",
        reasoning: "Jawaban menyebutkan penyebab (gas rumah kaca) dan efek (suhu naik, es mencair) dengan benar. Namun penjelasan kurang detail dan tidak ada contoh atau data pendukung.",
        rubricBreakdown: [
          { criterion: "Isi/Konten", score: 30, maxScore: 40, comment: "Penyebab dan efek disebutkan tapi belum dikembangkan" },
          { criterion: "Struktur", score: 15, maxScore: 20, comment: "Ada alur logis dari penyebab ke efek" },
          { criterion: "Bahasa", score: 18, maxScore: 20, comment: "Bahasa jelas dan mudah dipahami" },
          { criterion: "Analisis", score: 12, maxScore: 20, comment: "Belum ada analisis mendalam atau contoh konkret" },
        ],
        feedbackForStudent: "Jawabanmu sudah on the right track! Kamu menyebutkan penyebab dan efek dengan benar. Untuk lebih baik, coba tambahkan contoh konkret seperti data suhu rata-rata atau contoh gas rumah kaca. Kamu juga bisa jelaskan bagaimana gas rumah kaca memerangkap panas — ini akan membuat jawabanmu lebih lengkap!",
        teacherNotes: ["Siswa memahami konsep dasar tapi perlu didorong untuk elaborasi", "Berikan contoh bacaan tentang efek rumah kaca untuk memperkaya jawaban"],
        editableText: "Penilaian Esai: Pemanasan Global\nSkor: 75/100 (B)\n...",
      },
    },
  ],

  async run(input, context): Promise<AgentRunResult> {
    return runAgent({ agent, input, context });
  },
};

registerAgent(agent);
export default agent;
