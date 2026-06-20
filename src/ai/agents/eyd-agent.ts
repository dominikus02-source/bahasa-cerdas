import { z } from "zod";
import type { AgentDefinition, AgentRunContext, AgentRunResult } from "../core/agent-types";
import { registerAgent } from "../core/agent-registry";
import { runAgent } from "../core/agent-runner";

const inputSchema = z.object({
  text: z.string().min(10, "Teks terlalu pendek (minimal 10 karakter)"),
  mode: z.enum(["ringan", "standar", "akademik"]).default("standar"),
  preserveStyle: z.boolean().default(false),
  explainChanges: z.boolean().default(true),
});

const outputSchema = z.object({
  correctedText: z.string().min(1, "correctedText wajib diisi"),
  summary: z.string(),
  changes: z.array(z.object({
    before: z.string(),
    after: z.string(),
    reason: z.string(),
  })),
  suggestions: z.array(z.string()),
  editableText: z.string(),
});

const agent: AgentDefinition<z.infer<typeof inputSchema>, z.infer<typeof outputSchema>> = {
  id: "eyd",
  name: "Korektor EYD / Bahasa",
  description: "Perbaiki ejaan, tanda baca, kapitalisasi, diksi, dan kepatuhan kaidah bahasa Indonesia sesuai EYD/PUEBI.",
  role: "Asisten korektor bahasa Indonesia yang ahli dalam EYD V, PUEBI, dan tata bahasa baku Indonesia.",
  targetUser: "guru",
  capabilities: [
    { id: "koreksi-ringan", label: "Koreksi Ringan", description: "Perbaiki ejaan dan tanda baca dasar tanpa mengubah gaya penulisan" },
    { id: "koreksi-standar", label: "Koreksi Standar", description: "Perbaiki sesuai EYD/PUEBI dengan penjelasan perubahan" },
    { id: "koreksi-akademik", label: "Koreksi Akademik", description: "Perbaiki teks akademik — ejaan, tata bahasa, baku, diksi formal" },
  ],
  limitations: [
    "Tidak mengubah makna atau isi teks — hanya format kebahasaan",
    "Koreksi bersifat saran — keputusan akhir tetap pada pengguna",
    "Untuk teks berbahasa daerah atau campuran, akurasi koreksi terbatas",
    "Tidak bisa mengecek fakta atau kebenaran isi di luar kaidah bahasa",
  ],
  systemPrompt: `Kamu adalah asisten korektor bahasa Indonesia yang sangat ahli dalam EYD V, PUEBI, dan tata bahasa baku Indonesia.

Tugasmu adalah memperbaiki ejaan, tanda baca, kapitalisasi, pilihan kata (diksi), dan kepatuhan terhadap kaidah bahasa Indonesia sesuai mode yang dipilih.

OUTPUT JSON:
{
  "correctedText": "Teks yang sudah dikoreksi (full text)",
  "summary": "Ringkasan 2-3 kalimat tentang perubahan yang dilakukan",
  "changes": [
    {
      "before": "kata/kalimat sebelum dikoreksi",
      "after": "kata/kalimat setelah dikoreksi",
      "reason": "Alasan perubahan (misal: ejaan sesuai KBBI, tanda baca, dsb)"
    }
  ],
  "suggestions": ["Saran perbaikan tambahan untuk penulisan yang lebih baik"],
  "editableText": "Teks terkoreksi dalam format teks rapi"
}

ATURAN BERDASARKAN MODE:
1. Ringan: Hanya perbaiki ejaan dan tanda baca yang jelas salah. Jangan koreksi gaya atau pilihan kata.
2. Standar: Perbaiki ejaan (EYD), tanda baca, kapitalisasi, dan pilihan kata tidak baku. Beri penjelasan singkat.
3. Akademik: Koreksi menyeluruh — ejaan, tata bahasa, pilihan kata formal, struktur kalimat, konsistensi istilah.

ATURAN UMUM:
- Jangan mengubah makna teks.
- Jika preserveStyle=true, pertahankan gaya penulisan asli sebisa mungkin.
- explainChanges=true: sertakan alasan untuk setiap perubahan meaningful.
- Jangan overcorrect — hindari memperbaiki hal yang tidak jelas salah.
- Gunakan Bahasa Indonesia dalam penjelasan.
- Output JSON VALID SAJA. Tidak ada markdown fences. Tidak ada teks di luar JSON.`,
  defaultModel: "deepseek-chat",
  temperature: 0.3,
  maxTokens: 8000,
  inputSchema,
  outputSchema,
  workflowSteps: [
    { id: "read-text", name: "Baca Teks", description: "Memahami struktur dan konteks teks input", order: 1 },
    { id: "identify-errors", name: "Identifikasi Kesalahan", description: "Temukan ejaan, tanda baca, dan tata bahasa yang perlu diperbaiki", order: 2 },
    { id: "apply-correction", name: "Terapkan Koreksi", description: "Perbaiki teks sesuai mode yang dipilih", order: 3 },
    { id: "summarize", name: "Buat Ringkasan", description: "Ringkas perubahan yang dilakukan", order: 4 },
  ],
  qualityChecklist: [
    { id: "q-preserve-meaning", label: "Makna Dipertahankan", description: "Koreksi tidak mengubah makna atau intent teks asli", severity: "error" },
    { id: "q-eyd-compliant", label: "Sesuai EYD/PUEBI", description: "Koreksi mengikuti kaidah EYD V atau PUEBI yang berlaku", severity: "error" },
    { id: "q-not-overcorrect", label: "Tidak Overcorrect", description: "Hanya perbaiki yang jelas salah — jangan koreksi gaya atau konteks", severity: "warning" },
    { id: "q-editable", label: "Teks Siap Edit", description: "editableText berisi teks terkoreksi yang bisa dicopy dan diedit", severity: "warning" },
  ],
  safetyRules: [
    { id: "s-no-keys", rule: "Jangan pernah menyertakan API key", category: "security" },
    { id: "s-no-pii", rule: "Jangan ekspos data pribadi dalam output", category: "privacy" },
    { id: "s-preserve-meaning", rule: "Koreksi hanya format — jangan ubah isi atau makna teks", category: "content" },
  ],
  examples: [
    {
      name: "Koreksi standar",
      description: "Perbaiki ejaan dan tata bahasa teks pendek",
      input: { text: "Saya adalah seorang guru yang mengajar di SMK Negri 1 Jakarta. Murid2 saya sangat rajin.", mode: "standar", explainChanges: true },
      output: {
        correctedText: "Saya adalah seorang guru yang mengajar di SMK Negeri 1 Jakarta. Murid-murid saya sangat rajin.",
        summary: "Ditemukan 2 perbaikan: penulisan 'Negri' menjadi 'Negeri' sesuai KBBI, dan 'Murid2' menjadi 'Murid-murid' sesuai kaidah penulisan ulang bilangan.",
        changes: [
          { before: "Negri", after: "Negeri", reason: "Penulisan baku sesuai KBBI adalah 'Negeri'" },
          { before: "Murid2", after: "Murid-murid", reason: "Pengulangan kata ditulis dengan tanda hubung, bukan angka" },
        ],
        suggestions: ["Perhatikan penulisan nama lembaga — gunakan ejaan resmi", "Hindari penggunaan angka untuk pengulangan kata"],
        editableText: "Saya adalah seorang guru yang mengajar di SMK Negeri 1 Jakarta. Murid-murid saya sangat rajin.",
      },
    },
  ],

  async run(input, context): Promise<AgentRunResult> {
    return runAgent({ agent, input, context });
  },
};

registerAgent(agent);
export default agent;
