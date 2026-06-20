import { z } from "zod";
import type { AgentDefinition, AgentRunContext, AgentRunResult } from "../core/agent-types";
import { registerAgent } from "../core/agent-registry";
import { runAgent } from "../core/agent-runner";

const inputSchema = z.object({
  text: z.string().min(50, "Teks terlalu pendek (minimal 50 karakter)"),
  analysisType: z.enum(["struktur", "literasi", "gaya_bahasa", "komprehensif"]).default("komprehensif"),
  grade: z.string().optional(),
  includeSuggestions: z.boolean().default(true),
});

const outputSchema = z.object({
  summary: z.string(),
  mainIdeas: z.array(z.string()),
  structureAnalysis: z.array(z.string()),
  languageAnalysis: z.array(z.string()),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  suggestions: z.array(z.string()),
  editableText: z.string(),
});

const agent: AgentDefinition<z.infer<typeof inputSchema>, z.infer<typeof outputSchema>> = {
  id: "text-analysis",
  name: "Analisis Teks",
  description: "Analisis teks dari sisi struktur, gagasan utama, kohesi, koherensi, diksi, dan gaya bahasa dengan rekomendasi perbaikan.",
  role: "Asisten analisis teks yang ahli dalam menganalisis struktur, bahasa, dan kualitas tulisan Indonesia.",
  targetUser: "guru",
  capabilities: [
    { id: "analisis-struktur", label: "Analisis Struktur", description: "Analisis struktur teks, alur, paragraf, dan organisasi ide" },
    { id: "analisis-literasi", label: "Analisis Literasi", description: "Analisis gagasan utama, kohesi, koherensi, dan kualitas argumen" },
    { id: "analisis-gaya-bahasa", label: "Analisis Gaya Bahasa", description: "Analisis diksi, majas, gaya bahasa, dan pilihan kata" },
    { id: "analisis-komprehensif", label: "Analisis Lengkap", description: "Analisis menyeluruh semua aspek teks" },
  ],
  limitations: [
    "Analisis berdasarkan teks yang diberikan — tidak bisa mengecek fakta eksternal",
    "Untuk teks sangat pendek (<50 karakter), analisis mungkin kurang akurat",
    "Tidak bisa menganalisis teks berbahasa daerah atau asing",
    "Analisis gaya bahasa terbatas pada pola yang dikenal AI",
  ],
  systemPrompt: `Kamu adalah asisten analisis teks bahasa Indonesia yang ahli dalam menganalisis struktur, bahasa, dan kualitas tulisan.

Tugasmu adalah memberikan analisis teks yang mendalam, terstruktur, dan actionable sesuai jenis analisis yang diminta.

OUTPUT JSON:
{
  "summary": "Ringkasan analisis 3-5 kalimat",
  "mainIdeas": ["Gagasan utama 1", "Gagasan utama 2", "..."],
  "structureAnalysis": ["Analisis struktur 1", "Analisis struktur 2", "..."],
  "languageAnalysis": ["Analisis bahasa 1", "Analisis bahasa 2", "..."],
  "strengths": ["Kekuatan teks 1", "Kekuatan teks 2", "..."],
  "weaknesses": ["Kelemahan teks 1", "Kelemahan teks 2", "..."],
  "suggestions": ["Saran perbaikan 1", "Saran perbaikan 2", "..."],
  "editableText": "Analisis lengkap dalam format teks rapi"
}

ATURAN BERDASARKAN JENIS ANALISIS:
1. struktur: Fokus pada organisasi teks — alur, pembagian paragraf, kohesi antarparagraf, pendahuluan-isi-penutup.
2. literasi: Fokus pada kualitas isi — gagasan utama, argumen, koherensi, kejelasan pesan.
3. gaya_bahasa: Fokus pada aspek kebahasaan — diksi, majas, variasi kalimat, pilihan kata, nada.
4. komprehensif: Semua aspek di atas dalam satu analisis menyeluruh.

ATURAN:
- Gunakan Bahasa Indonesia yang jelas dan mudah dipahami.
- Untuk jenjang SD/rendah, gunakan penjelasan sederhana.
- Untuk jenjang SMA/tinggi, gunakan istilah teknis yang tepat.
- Fokus pada analisis actionable — pembaca harus tahu apa yang perlu diperbaiki.
- Jangan menciptakan fakta di luar teks yang diberikan.
- Jika includeSuggestions=true, sertakan minimal 3 saran spesifik.
- Output JSON VALID SAJA. Tidak ada markdown fences. Tidak ada teks di luar JSON.`,
  defaultModel: "deepseek-chat",
  temperature: 0.3,
  maxTokens: 4000,
  inputSchema,
  outputSchema,
  workflowSteps: [
    { id: "read-text", name: "Baca Teks", description: "Baca dan pahami teks secara menyeluruh", order: 1 },
    { id: "analyze-structure", name: "Analisis Struktur", description: "Evaluasi organisasi dan alur teks", order: 2 },
    { id: "analyze-language", name: "Analisis Bahasa", description: "Evaluasi diksi, gaya, dan kebahasaan", order: 3 },
    { id: "generate-report", name: "Buat Laporan", description: "Susun laporan analisis lengkap dengan saran", order: 4 },
  ],
  qualityChecklist: [
    { id: "q-actionable", label: "Analisis Actionable", description: "Analisis memberikan wawasan yang bisa ditindaklanjuti", severity: "error" },
    { id: "q-accurate", label: "Akurat", description: "Analisis sesuai dengan isi teks, tidak mengada-ada", severity: "error" },
    { id: "q-grade-appropriate", label: "Bahasa Sesuai Jenjang", description: "Penjelasan disesuaikan dengan jenjang grade", severity: "warning" },
    { id: "q-editable", label: "Teks Siap Edit", description: "editableText berisi analisis lengkap siap copy", severity: "warning" },
  ],
  safetyRules: [
    { id: "s-no-keys", rule: "Jangan pernah menyertakan API key", category: "security" },
    { id: "s-no-facts", rule: "Jangan menciptakan fakta di luar teks yang diberikan", category: "content" },
    { id: "s-respectful", rule: "Analisis kelemahan harus disampaikan dengan bahasa yang membangun", category: "pedagogy" },
  ],
  examples: [
    {
      name: "Analisis komprehensif teks deskripsi",
      description: "Analisis teks deskripsi pendek tentang candi",
      input: { text: "Candi Borobudur adalah candi Buddha terbesar di Indonesia. Terletak di Magelang, Jawa Tengah. Candi ini memiliki 9 platform yang dihiasi relief-relief indah. Setiap relief menceritakan kisah yang berbeda. Pengunjung bisa belajar banyak tentang sejarah Buddha dari relief-relief ini.", analysisType: "komprehensif", grade: "8", includeSuggestions: true },
      output: {
        summary: "Teks deskripsi tentang Candi Borobudur dengan struktur informatif yang jelas. Informasi faktual akurat dan tersaji dengan urutan logis. Namun teks masih bisa diperkaya dengan detail sensoris dan variasi kalimat.",
        mainIdeas: ["Candi Borobudur adalah candi Buddha terbesar di Indonesia", "Relief candi memiliki nilai edukasi sejarah"],
        structureAnalysis: ["Struktur informatif dengan alur deduktif (umum ke spesifik)", "Paragraf tunggal — bisa dipecah untuk readability lebih baik"],
        languageAnalysis: ["Kalimat deklaratif informatif, mudah dipahami", "Kurang variasi kalimat — dominan pola S-P-O", "Diksi cukup baik dengan kata baku"],
        strengths: ["Informasi faktual dan akurat", "Alur informatif yang logis", "Bahasa baku dan mudah dipahami"],
        weaknesses: ["Kurang detail sensoris (penglihatan, pendengaran)", "Tidak ada variasi struktur kalimat", "Paragraf bisa dikembangkan dengan contoh konkret"],
        suggestions: ["Tambahkan deskripsi sensoris: bagaimana warna relief, ukuran candi, suasana sekitar", "Variasikan awal kalimat — jangan semua dimulai dengan 'Candi'", "Pecah menjadi 2-3 paragraf untuk readability", "Tambahkan kesan pribadi atau opini untuk membuat teks lebih hidup"],
        editableText: "Analisis Teks: Deskripsi Candi Borobudur\n\nRingkasan:\n...",
      },
    },
  ],

  async run(input, context): Promise<AgentRunResult> {
    return runAgent({ agent, input, context });
  },
};

registerAgent(agent);
export default agent;
