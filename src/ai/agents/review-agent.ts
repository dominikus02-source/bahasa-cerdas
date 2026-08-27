/**
 * Review Materi Agent
 *
 * Reviews and provides feedback on student work (karya), teacher materials,
 * and assessment quality.
 *
 * TODO: Implement grading rubrics, feedback generation for student karya,
 *       quality review for teacher-generated questions and materials.
 */

import { z } from "zod";
import type { AgentDefinition, AgentRunContext, AgentRunResult } from "../core/agent-types";
import { registerAgent } from "../core/agent-registry";
import { runAgent } from "../core/agent-runner";

const inputSchema = z.object({
  content: z.string().min(1, "Content to review is required"),
  contentType: z.enum(["rpp", "soal", "artikel", "lainnya"]).default("artikel"),
  title: z.string().optional(),
  grade: z.string().optional(),
  rubric: z.string().optional(),
});

const outputSchema = z.object({
  score: z.number().min(0).max(100),
  strengths: z.array(z.string()),
  issues: z.array(z.string()),
  recommendations: z.array(z.string()),
  readyToUse: z.boolean(),
});

const agent: AgentDefinition<z.infer<typeof inputSchema>, z.infer<typeof outputSchema>> = {
  id: "review",
  name: "Review Materi Agent",
  description: "Review and provide feedback on student karya, teacher materials, and assessment quality.",
  role: "Asisten review yang memberikan feedback konstruktif untuk karya siswa, materi ajar guru, dan soal.",
  targetUser: "guru",
  capabilities: [
    { id: "review-karya", label: "Review Karya Siswa", description: "Berikan feedback untuk puisi, cerpen, artikel, dan karya siswa lainnya" },
    { id: "review-materi", label: "Review Materi Ajar", description: "Evaluasi kualitas materi ajar yang dibuat guru" },
    { id: "review-soal", label: "Review Soal", description: "Periksa kualitas soal: distractor, kebenaran, tingkat kesulitan" },
  ],
  limitations: [
    "Feedback bersifat teks — tidak bisa memberikan nilai numerik otomatis",
    "Tidak bisa memeriksa fakta di luar pengetahuan AI",
    "Review soal terbatas pada analisis teks — tidak bisa uji coba soal",
  ],
  systemPrompt: `Kamu adalah asisten review yang sangat ahli dalam mengevaluasi konten pembelajaran Bahasa Indonesia berdasarkan standar kurikulum nasional.

Tugasmu adalah memberikan review konstruktif dengan output JSON:
{
  "score": 0-100,
  "strengths": ["..."],
  "issues": ["..."],
  "recommendations": ["..."],
  "readyToUse": true/false
}

Prinsip review:
1. Mulai dengan apresiasi — sebutkan apa yang sudah baik
2. Berikan saran perbaikan yang spesifik dan actionable
3. Gunakan bahasa yang mendukung, bukan menjatuhkan
4. Beri skor jujur (jangan overgrade)
5. readyToUse = true hanya jika skor >= 70

STANDAR REVIEW PER KONTEN:

Untuk review Rencana Pembelajaran (Kurikulum Nasional):
- Kelengkapan komponen: CP, TP, ATP, tujuan (ABCD), pemahaman bermakna, pertanyaan pemantik, Profil Pelajar Pancasila
- Kegiatan: pembuka (15 menit), inti (variatif, diferensiasi), penutup (refleksi)
- Asesmen: diagnostik (awal), formatif (proses), sumatif (akhir)
- Diferensiasi: konten, proses, produk untuk siswa dengan kebutuhan berbeda
Untuk review Rencana Pembelajaran (K13):
- KI/KD/IPK, pendekatan saintifik (5M), kegiatan sesuai sintaks model

Untuk review soal:
- Kebenaran kunci jawaban (harus 100% benar secara faktual)
- Kualitas distractor: homogen, plausibel, panjang mirip
- Tingkat kesulitan sesuai dengan kelas yang ditargetkan
- Level Bloom/Cognitive sesuai (C1-C6)
- Tidak ada bias gender, SARA, atau stereotip dalam soal

Untuk review artikel:
- Struktur: judul menarik, pendahuluan-isi-penutup, paragraf koheren
- Diksi dan ejaan: sesuai EYD/PUEBI, pilihan kata tepat
- Kejelasan pesan: gagasan utama mudah dipahami, argumen logis
- Orisinalitas: tidak mengandung plagiarisme atau konten duplikat`,
  defaultModel: "deepseek-chat",
  temperature: 0.5,
  maxTokens: 4000,
  inputSchema,
  outputSchema,
  workflowSteps: [
    { id: "analyze-content", name: "Analisis Konten", description: "Baca dan pahami konten yang akan direview", order: 1 },
    { id: "identify-strengths", name: "Identifikasi Kekuatan", description: "Temukan aspek positif dari konten", order: 2 },
    { id: "identify-weaknesses", name: "Identifikasi Kelemahan", description: "Temukan area yang perlu diperbaiki", order: 3 },
    { id: "generate-feedback", name: "Generate Feedback", description: "Tulis feedback konstruktif", order: 4 },
  ],
  qualityChecklist: [
    { id: "q-constructive", label: "Feedback Konstruktif", description: "Feedback bersifat membangun, bukan menjatuhkan", severity: "error" },
    { id: "q-specific", label: "Saran Spesifik", description: "Saran perbaikan harus actionable", severity: "warning" },
    { id: "q-standard", label: "Standar Sesuai", description: "Standar penilaian sesuai jenjang", severity: "warning" },
  ],
  safetyRules: [
    { id: "s-no-keys", rule: "Jangan pernah menyertakan API key", category: "security" },
    { id: "s-no-hate", rule: "Feedback tidak boleh mengandung ujaran kebencian", category: "content" },
    { id: "s-encourage", rule: "Feedback harus mendorong perbaikan, bukan membuat putus asa", category: "pedagogy" },
  ],
  examples: [
    {
      name: "Review Rencana Pembelajaran",
      description: "Review Rencana Pembelajaran Teks Negosiasi",
      input: { content: "Rencana Pembelajaran Teks Negosiasi kelas X dengan kegiatan diskusi dan role play...", contentType: "rpp", grade: "10" },
      output: {
        score: 78,
        strengths: ["Kegiatan pembelajaran variatif", "Ada asesmen formatif"],
        issues: ["Tujuan pembelajaran belum menggunakan ABCD", "Profil Pelajar Pancasila belum tercantum"],
        recommendations: ["Tambahkan dimensi Profil Pelajar Pancasila", "Perbaiki rumusan TP dengan format ABCD"],
        readyToUse: false,
      },
    },
  ],

  async run(input, context): Promise<AgentRunResult> {
    return runAgent({ agent, input, context });
  },
};

registerAgent(agent);
export default agent;
