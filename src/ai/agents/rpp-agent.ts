/**
 * RPP / Modul Ajar Agent — production-quality
 *
 * Generates teacher-ready RPP / Modul Ajar in polished Bahasa Indonesia.
 * Supports Kurikulum Merdeka, K13, and Custom curriculum.
 */

import { z } from "zod";
import type { AgentDefinition, AgentRunContext, AgentRunResult } from "../core/agent-types";
import { registerAgent } from "../core/agent-registry";
import { runAgent } from "../core/agent-runner";

export const rppInputSchema = z.object({
  subject: z.string().min(1, "Mata pelajaran wajib diisi"),
  grade: z.string().min(1, "Kelas wajib diisi"),
  phase: z.string().optional(),
  semester: z.string().optional(),
  curriculum: z.enum(["Kurikulum Merdeka", "K13", "Custom"]).default("Kurikulum Merdeka"),
  topic: z.string().min(1, "Topik wajib diisi"),
  subtopic: z.string().optional(),
  duration: z.string().default("2 JP x 45 menit"),
  meetingCount: z.number().min(1).max(20).default(1),
  studentProfile: z.string().optional(),
  learningObjectives: z.array(z.string()).min(1, "Setidaknya satu tujuan pembelajaran diperlukan"),
  priorKnowledge: z.string().optional(),
  learningModel: z.string().optional(),
  assessmentTypes: z.array(z.enum(["diagnostik", "formatif", "sumatif"])).optional(),
  differentiationNeeds: z.array(z.string()).optional(),
  languageStyle: z.enum(["formal", "praktis", "ringkas", "lengkap"]).default("formal"),
  includeWorksheet: z.boolean().default(false),
  includeRubric: z.boolean().default(false),
  includeRemedialEnrichment: z.boolean().default(false),
});

export const rppOutputSchema = z.object({
  title: z.string(),
  identity: z.object({
    subject: z.string(),
    grade: z.string(),
    phase: z.string().optional(),
    semester: z.string().optional(),
    curriculum: z.string(),
    topic: z.string(),
    duration: z.string(),
    meetingCount: z.number().optional(),
  }),
  studentProfile: z.string(),
  priorKnowledge: z.string(),
  learningObjectives: z.array(z.string()),
  successCriteria: z.array(z.string()),
  learningMaterials: z.array(z.string()),
  learningResources: z.array(z.string()),
  learningModel: z.string(),
  learningSteps: z.object({
    opening: z.array(z.string()),
    core: z.array(z.string()),
    closing: z.array(z.string()),
  }),
  assessmentPlan: z.object({
    diagnostic: z.array(z.string()),
    formative: z.array(z.string()),
    summative: z.array(z.string()),
  }),
  differentiationStrategy: z.object({
    content: z.array(z.string()),
    process: z.array(z.string()),
    product: z.array(z.string()),
  }),
  worksheetSuggestion: z
    .object({
      title: z.string(),
      instructions: z.array(z.string()),
      activities: z.array(z.string()),
    })
    .optional(),
  rubric: z
    .object({
      criteria: z.array(
        z.object({
          name: z.string(),
          excellent: z.string(),
          good: z.string(),
          needsImprovement: z.string(),
        })
      ),
    })
    .optional(),
  remedialAndEnrichment: z
    .object({
      remedial: z.array(z.string()),
      enrichment: z.array(z.string()),
    })
    .optional(),
  reflection: z.object({
    teacherReflection: z.array(z.string()),
    studentReflection: z.array(z.string()),
  }),
  teacherNotes: z.array(z.string()),
  editableText: z.string().min(1, "editableText tidak boleh kosong"),
});

const agent: AgentDefinition<
  z.infer<typeof rppInputSchema>,
  z.infer<typeof rppOutputSchema>
> = {
  id: "rpp",
  name: "RPP / Modul Ajar Agent",
  description:
    "Hasilkan RPP dan Modul Ajar Bahasa Indonesia yang siap pakai, sesuai Kurikulum Merdeka, K13, atau Custom.",
  role: "Asisten pembuat RPP dan modul ajar Bahasa Indonesia yang mengikuti struktur kurikulum resmi Kemendikbud.",
  targetUser: "guru",
  capabilities: [
    {
      id: "generate-rpp",
      label: "Generate RPP",
      description:
        "Buat RPP lengkap dengan identitas, tujuan, kegiatan, asesmen, diferensiasi, dan refleksi",
    },
    {
      id: "generate-modul",
      label: "Generate Modul Ajar",
      description:
        "Buat modul ajar Kurikulum Merdeka dengan profil pelajar Pancasila dan pemahaman bermakna",
    },
    {
      id: "adjust-curriculum",
      label: "Sesuaikan Kurikulum",
      description: "Dukung Kurikulum Merdeka, K13, dan Custom",
    },
  ],
  limitations: [
    "Tidak bisa mengakses database sekolah — informasi sekolah harus diinput manual",
    "RPP bersifat generik — perlu disesuaikan dengan konteks kelas masing-masing",
    "Belum mendukung generate lampiran LKPD secara visual (hanya teks)",
    "Tidak bisa mengecek RPP ke database resmi Kemendikbud",
  ],
  systemPrompt: `Kamu adalah asisten pembuatan RPP dan Modul Ajar Bahasa Indonesia yang sangat ahli. Tugasmu adalah menghasilkan dokumen perencanaan pembelajaran yang siap pakai.

OUTPUT JSON WAJIB mengandung field berikut:
- title: judul RPP
- identity: objek berisi subject, grade, phase, semester, curriculum, topic, duration, meetingCount
- studentProfile: deskripsi profil siswa
- priorKnowledge: pengetahuan prasyarat
- learningObjectives: array tujuan pembelajaran (minimal 2)
- successCriteria: array kriteria keberhasilan
- learningMaterials: array materi pembelajaran
- learningResources: array sumber belajar
- learningModel: model pembelajaran yang digunakan
- learningSteps: objek { opening: [], core: [], closing: [] } — masing-masing array langkah
- assessmentPlan: objek { diagnostic: [], formative: [], summative: [] }
- differentiationStrategy: objek { content: [], process: [], product: [] }
- worksheetSuggestion: objek { title, instructions[], activities[] } — hanya jika includeWorksheet=true
- rubric: { criteria: [{ name, excellent, good, needsImprovement }] } — hanya jika includeRubric=true
- remedialAndEnrichment: { remedial[], enrichment[] } — hanya jika includeRemedialEnrichment=true
- reflection: { teacherReflection[], studentReflection[] }
- teacherNotes: array catatan guru
- editableText: string berisi RPP lengkap dalam format teks rapi yang bisa dicopy guru (BUKAN JSON)

ATURAN:
1. Output harus JSON VALID SAJA. Tidak ada markdown fences. Tidak ada teks di luar JSON.
2. Jangan gunakan nama sekolah atau nama guru fiktif.
3. Jangan menyertakan API key atau data pribadi dalam output.
4. Kegiatan harus praktis dan siap pakai di kelas.
5. Sesuaikan tingkat kesulitan dengan jenjang kelas.
6. Jika curriculum="Kurikulum Merdeka", gunakan istilah CP/TP/ATP dan Profil Pelajar Pancasila.
7. Jika curriculum="K13", gunakan istilah KI/KD/IPK dan pendekatan saintifik.
8. edtiableText harus berupa dokumen teks yang diformat rapi (bukan JSON), bisa langsung dicopy guru.
9. Gunakan Bahasa Indonesia yang baik dan benar sesuai EYD/PUEBI.`,
  defaultModel: "deepseek-chat",
  temperature: 0.7,
  maxTokens: 8000,
  inputSchema: rppInputSchema,
  outputSchema: rppOutputSchema,
  workflowSteps: [
    {
      id: "validate-input",
      name: "Validasi Input",
      description: "Memeriksa kelengkapan dan kesesuaian input",
      order: 1,
    },
    {
      id: "analyze-curriculum",
      name: "Analisis Kurikulum",
      description:
        "Menentukan struktur kurikulum yang sesuai (Merdeka/K13/Custom)",
      order: 2,
    },
    {
      id: "generate-content",
      name: "Generate Konten RPP",
      description: "Menulis seluruh komponen RPP termasuk kegiatan dan asesmen",
      order: 3,
    },
    {
      id: "build-editable",
      name: "Buat Teks Editable",
      description:
        "Menyusun editableText dalam format dokumen rapi yang bisa dicopy",
      order: 4,
    },
  ],
  qualityChecklist: [
    {
      id: "q-structure",
      label: "Struktur Lengkap",
      description: "Semua komponen RPP terisi dengan baik",
      severity: "error",
    },
    {
      id: "q-objectives",
      label: "Tujuan Jelas",
      description: "Tujuan pembelajaran terukur dan sesuai ABCD",
      severity: "error",
    },
    {
      id: "q-activities",
      label: "Kegiatan Siap Pakai",
      description: "Kegiatan praktis dan sesuai sintaks model pembelajaran",
      severity: "warning",
    },
    {
      id: "q-assessment",
      label: "Asesmen Terlampir",
      description: "Teknik asesmen tercantum dengan jelas",
      severity: "warning",
    },
    {
      id: "q-differentiation",
      label: "Diferensiasi",
      description: "Strategi diferensiasi konten/proses/produk tercantum",
      severity: "warning",
    },
  ],
  safetyRules: [
    {
      id: "s-no-keys",
      rule: "Jangan pernah menyertakan API key atau credential dalam output",
      category: "security",
    },
    {
      id: "s-no-pii",
      rule: "Jangan generate konten yang mengandung data pribadi siswa",
      category: "privacy",
    },
    {
      id: "s-no-fake-school",
      rule: "Jangan gunakan nama sekolah atau guru fiktif yang tampak resmi",
      category: "content",
    },
    {
      id: "s-curriculum",
      rule: "Output harus sesuai dengan struktur kurikulum yang dipilih",
      category: "pedagogy",
    },
  ],
  examples: [
    {
      name: "RPP Teks Negosiasi",
      description: "RPP Bahasa Indonesia kelas X tentang teks negosiasi",
      input: {
        subject: "Bahasa Indonesia",
        grade: "X",
        phase: "E",
        semester: "1 (Ganjil)",
        curriculum: "Kurikulum Merdeka",
        topic: "Teks Negosiasi",
        subtopic: "Struktur dan kebahasaan teks negosiasi",
        duration: "2 JP x 45 menit",
        meetingCount: 1,
        learningObjectives: [
          "Menganalisis struktur teks negosiasi",
          "Menyusun teks negosiasi sesuai kaidah",
        ],
        learningModel: "Problem Based Learning",
        includeWorksheet: true,
        includeRubric: true,
      },
      output: {
        title: "Modul Ajar Teks Negosiasi",
        identity: {
          subject: "Bahasa Indonesia",
          grade: "X",
          phase: "E",
          semester: "1 (Ganjil)",
          curriculum: "Kurikulum Merdeka",
          topic: "Teks Negosiasi",
          duration: "2 JP x 45 menit",
          meetingCount: 1,
        },
        studentProfile:
          "Siswa kelas X fase E, sudah memahami teks deskripsi dan narasi",
        priorKnowledge:
          "Siswa pernah bernegosiasi dalam kehidupan sehari-hari",
        learningObjectives: [
          "Menganalisis struktur teks negosiasi",
          "Menyusun teks negosiasi sesuai kaidah",
        ],
        successCriteria: [
          "Siswa mampu mengidentifikasi struktur teks negosiasi dengan tepat",
          "Siswa mampu menulis teks negosiasi dengan struktur yang benar",
        ],
        learningMaterials: [
          "Pengertian teks negosiasi",
          "Struktur teks negosiasi",
          "Kaidah kebahasaan teks negosiasi",
        ],
        learningResources: [
          "Buku Paket Bahasa Indonesia Kelas X",
          "Video contoh negosiasi",
        ],
        learningModel: "Problem Based Learning",
        learningSteps: {
          opening: [
            "Guru memberi salam dan mengecek kehadiran",
            "Guru menayangkan video singkat tentang negosiasi",
            "Guru mengajukan pertanyaan pemantik",
          ],
          core: [
            "Siswa dibagi dalam kelompok kecil",
            "Setiap kelompok mendapat studi kasus negosiasi",
            "Siswa menganalisis struktur teks negosiasi",
            "Siswa menyusun teks negosiasi secara berkelompok",
            "Presentasi hasil diskusi",
          ],
          closing: [
            "Guru dan siswa menyimpulkan pembelajaran",
            "Refleksi singkat",
            "Guru menyampaikan rencana pembelajaran pertemuan berikutnya",
          ],
        },
        assessmentPlan: {
          diagnostic: ["Pertanyaan lisan tentang pengalaman negosiasi"],
          formative: [
            "Observasi diskusi kelompok",
            "Hasil analisis struktur teks",
          ],
          summative: ["Tugas menulis teks negosiasi individu"],
        },
        differentiationStrategy: {
          content: ["Materi diperkaya untuk siswa cepat", "Materi disederhanakan untuk siswa lambat"],
          process: [
            "Kelompok berdasarkan tingkat pemahaman",
            "Bimbingan khusus untuk siswa yang membutuhkan",
          ],
          product: [
            "Pilihan: teks negosiasi tertulis atau rekaman dialog",
          ],
        },
        worksheetSuggestion: {
          title: "LKPD: Menyusun Teks Negosiasi",
          instructions: [
            "Baca studi kasus yang diberikan",
            "Identifikasi struktur teks negosiasi",
            "Tulis teks negosiasi dalam kelompok",
          ],
          activities: [
            "Kelompok 1: Negosiasi jual beli",
            "Kelompok 2: Negosiasi izin orang tua",
          ],
        },
        rubric: {
          criteria: [
            {
              name: "Struktur teks",
              excellent: "Lengkap dan tepat",
              good: "Cukup lengkap",
              needsImprovement: "Belum sesuai struktur",
            },
          ],
        },
        reflection: {
          teacherReflection: [
            "Apakah model PBL efektif untuk materi ini?",
          ],
          studentReflection: [
            "Apa yang paling menarik dari pembelajaran hari ini?",
          ],
        },
        teacherNotes: ["Pastikan siswa aktif berdiskusi"],
        editableText:
          "RPP Teks Negosiasi\n... (format teks rapi panjang)",
      },
    },
  ],

  async run(input, context): Promise<AgentRunResult> {
    return runAgent({ agent, input, context });
  },
};

registerAgent(agent);
export default agent;
