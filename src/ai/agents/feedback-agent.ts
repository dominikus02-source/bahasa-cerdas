import { z } from "zod";
import type { AgentDefinition, AgentRunContext, AgentRunResult } from "../core/agent-types";
import { registerAgent } from "../core/agent-registry";
import { runAgent } from "../core/agent-runner";

const inputSchema = z.object({
  text: z.string().min(1, "Teks wajib diisi"),
  grade: z.string().optional(),
  rubricFocus: z.array(z.string()).optional(),
  tone: z.enum(["ramah", "tegas", "akademik"]).default("ramah"),
  includeRevisionTips: z.boolean().default(true),
});

const outputSchema = z.object({
  overallFeedback: z.string().min(1, "overallFeedback wajib diisi"),
  strengths: z.array(z.string()).min(1, "Minimal 1 kekuatan"),
  areasToImprove: z.array(z.string()),
  revisionTips: z.array(z.string()),
  exampleRevision: z.string().optional(),
  editableText: z.string(),
});

const agent: AgentDefinition<z.infer<typeof inputSchema>, z.infer<typeof outputSchema>> = {
  id: "feedback",
  name: "Feedback / Umpan Balik",
  description: "Beri umpan balik konstruktif terhadap tulisan siswa atau guru dengan nada sesuai jenjang dan konteks.",
  role: "Asisten pendidikan yang memberikan feedback konstruktif, mendukung, dan sesuai perkembangan siswa.",
  targetUser: "guru",
  capabilities: [
    { id: "feedback-siswa", label: "Feedback untuk Siswa", description: "Umpan balik tulisan siswa dengan nada mendukung dan bahasa sesuai usia" },
    { id: "feedback-sejawat", label: "Feedback Sejawat", description: "Umpan balik untuk sesama guru atau rekan" },
    { id: "revision-tips", label: "Tips Revisi", description: "Saran perbaikan konkret dan contoh revisi" },
  ],
  limitations: [
    "Tidak bisa menilai konten di luar teks yang diberikan",
    "Feedback bersifat saran — keputusan akhir pada guru",
    "Contoh revisi bersifat ilustratif, bukan pengganti bimbingan langsung",
  ],
  systemPrompt: `Kamu adalah asisten feedback pendidikan yang ahli dalam memberikan umpan balik konstruktif untuk tulisan dan karya.

Tugasmu adalah memberikan feedback mendalam, spesifik, dan membangun.

OUTPUT JSON:
{
  "overallFeedback": "Umpan balik umum 3-5 kalimat yang merangkum penilaian",
  "strengths": ["Kekuatan 1", "Kekuatan 2", "Kekuatan 3"],
  "areasToImprove": ["Area perbaikan 1", "Area perbaikan 2"],
  "revisionTips": ["Tips revisi 1", "Tips revisi 2"],
  "exampleRevision": "Contoh revisi untuk bagian tertentu (opsional, hanya jika includeRevisionTips=true)",
  "editableText": "Feedback lengkap dalam format teks rapi yang bisa dicopy"
}

ATURAN BERTON:
- ramah: bahasa hangat, pujian di awal, gunakan "kamu" untuk siswa
- tegas: langsung ke poin, profesional, gunakan "Anda"
- akademik: formal, istilah teknis, bukti dan argumen

ATURAN:
1. Feedback harus konstruktif — jangan mempermalukan atau merendahkan.
2. Sebutkan minimal 2 kekuatan sebelum area perbaikan.
3. Gunakan bahasa sesuai jenjang (grade):
   - SD: bahasa sederhana, banyak pujian
   - SMP: seimbang, mulai kenalkan istilah teknis
   - SMA: akademis, analitis
   - Jika grade tidak disebut, gunakan bahasa netral umum.
4. Tips revisi harus actionable dan spesifik.
5. Jika includeRevisionTips=true, sertakan minimal 2 tips praktis.
6. Output JSON VALID SAJA. Tidak ada markdown fences. Tidak ada teks di luar JSON.`,
  defaultModel: "deepseek-chat",
  temperature: 0.7,
  maxTokens: 4000,
  inputSchema,
  outputSchema,
  workflowSteps: [
    { id: "read-content", name: "Baca Konten", description: "Pahami teks dan konteks yang akan diberi feedback", order: 1 },
    { id: "identify-strengths", name: "Temukan Kekuatan", description: "Identifikasi aspek positif dari tulisan", order: 2 },
    { id: "identify-improvements", name: "Temukan Area Perbaikan", description: "Analisis area yang perlu ditingkatkan", order: 3 },
    { id: "generate-feedback", name: "Generate Feedback", description: "Tulis feedback sesuai tone dan jenjang", order: 4 },
  ],
  qualityChecklist: [
    { id: "q-constructive", label: "Feedback Konstruktif", description: "Feedback membangun, tidak menjatuhkan", severity: "error" },
    { id: "q-specific", label: "Spesifik dan Actionable", description: "Saran perbaikan konkret dan bisa ditindaklanjuti", severity: "error" },
    { id: "q-age-appropriate", label: "Bahasa Sesuai Usia", description: "Menggunakan bahasa yang sesuai jenjang siswa", severity: "warning" },
    { id: "q-editable", label: "Teks Siap Edit", description: "editableText berisi feedback lengkap siap copy", severity: "warning" },
  ],
  safetyRules: [
    { id: "s-no-keys", rule: "Jangan pernah menyertakan API key", category: "security" },
    { id: "s-no-shaming", rule: "Jangan gunakan bahasa yang mempermalukan siswa", category: "content" },
    { id: "s-encourage", rule: "Feedback harus mendorong semangat belajar, bukan membuat putus asa", category: "pedagogy" },
  ],
  examples: [
    {
      name: "Feedback tulisan siswa SMP",
      description: "Feedback untuk esai pendek siswa kelas VIII",
      input: { text: "Liburan aku ke Jogja. Disana aku melihat candi yang sangat bagus. Indah sekali.", grade: "8", tone: "ramah", includeRevisionTips: true },
      output: {
        overallFeedback: "Tulisanmu sudah bisa menggambarkan pengalaman liburan dengan perasaan. Ada beberapa area yang bisa dikembangkan agar tulisanmu semakin hidup dan informatif. Yuk kita lihat bersama!",
        strengths: ["Kamu bisa menyampaikan perasaan ('sangat bagus', 'Indah sekali')", "Tulisan singkat tapi ada alur cerita dari lokasi ke objek wisata"],
        areasToImprove: ["Penulisan kata depan 'di' perlu dipisah: 'di sana' bukan 'disana'", "Tulisan bisa dikembangkan dengan deskripsi lebih detail"],
        revisionTips: ["Coba deskripsikan bagaimana bentuk candi itu — warna, ukuran, ukiran?", "Tambahkan apa yang kamu rasakan saat melihat candi, bukan hanya bilang 'indah'"],
        exampleRevision: "Liburan aku ke Jogja. Di sana, aku mengunjungi Candi Borobudur yang megah. Batu-batu candinya berwarna abu-abu tua, dengan ukiran relief yang menceritakan kisah ramayana. Aku merasa kagum melihat keindahannya.",
        editableText: "Feedback untuk tulisan liburan:\n\nKekuatan:\n- ...",
      },
    },
  ],

  async run(input, context): Promise<AgentRunResult> {
    return runAgent({ agent, input, context });
  },
};

registerAgent(agent);
export default agent;
