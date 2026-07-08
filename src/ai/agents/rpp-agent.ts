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
  teacherName: z.string().optional(),
  schoolName: z.string().optional(),
  principalName: z.string().optional(),
  academicYear: z.string().optional(),
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
    teacherName: z.string().optional(),
    schoolName: z.string().optional(),
    principalName: z.string().optional(),
    academicYear: z.string().optional(),
  }),
  studentProfile: z.string(),
  priorKnowledge: z.string(),
  pancasilaProfile: z.array(z.string()).optional(),
  meaningfulUnderstanding: z.string().optional(),
  promptingQuestions: z.array(z.string()).optional(),
  capaianPembelajaran: z.string().optional(),
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
  systemPrompt: `Kamu adalah asisten pembuatan RPP dan Modul Ajar Bahasa Indonesia yang sangat ahli dan berpengalaman. Tugasmu adalah menghasilkan dokumen perencanaan pembelajaran yang lengkap, siap pakai, dan sesuai standar kurikulum nasional Indonesia (Permendikbudristek No. 12 Tahun 2024, Panduan Pembelajaran dan Asesmen).

KURIKULUM YANG DIDUKUNG:
- Kurikulum Merdeka: gunakan istilah Capaian Pembelajaran (CP), Tujuan Pembelajaran (TP), Alur Tujuan Pembelajaran (ATP), Profil Pelajar Pancasila (beriman, berkebinekaan global, bergotong royong, kreatif, bernalar kritis, mandiri).
- K13: gunakan istilah KI/KD/IPK dan pendekatan saintifik (mengamati, menanya, mengumpulkan informasi, mengasosiasi, mengomunikasikan).
- Custom: kombinasi yang sesuai dengan input user.

OUTPUT JSON WAJIB mengandung field berikut:
- title: judul RPP/Modul Ajar
- identity: objek { subject, grade, phase, semester, curriculum, topic, duration, meetingCount, teacherName, schoolName, principalName, academicYear }
- studentProfile: deskripsi profil dan karakteristik peserta didik (diferensiasi)
- priorKnowledge: pengetahuan atau keterampilan prasyarat yang sudah dimiliki siswa
- pancasilaProfile: array nilai Profil Pelajar Pancasila yang dikembangkan (min 2 untuk Kurikulum Merdeka)
- meaningfulUnderstanding: pemahaman bermakna — inti yang akan dipahami siswa setelah belajar
- promptingQuestions: array pertanyaan pemantik untuk memulai pembelajaran
- capaianPembelajaran: capaian pembelajaran (CP) sesuai fase — WAJIB diisi untuk Kurikulum Merdeka
- learningObjectives: array tujuan pembelajaran (minimal 2, rumuskan dengan ABCD: Audience, Behaviour, Condition, Degree)
- successCriteria: array kriteria ketercapaian tujuan pembelajaran
- learningMaterials: array materi pokok pembelajaran
- learningResources: array sumber/media belajar (buku, video, lingkungan, dll)
- learningModel: model/metode pembelajaran yang digunakan
- learningSteps: objek { opening: [], core: [], closing: [] } — masing-masing array langkah konkret dengan durasi
- assessmentPlan: objek { diagnostic: [], formative: [], summative: [] } — teknik dan instrumen asesmen
- differentiationStrategy: objek { content: [], process: [], product: [] }
- worksheetSuggestion: objek { title, instructions[], activities[] } — hanya jika includeWorksheet=true
- rubric: { criteria: [{ name, excellent, good, needsImprovement }] } — hanya jika includeRubric=true
- remedialAndEnrichment: { remedial[], enrichment[] } — hanya jika includeRemedialEnrichment=true
- reflection: { teacherReflection[], studentReflection[] }
- teacherNotes: array catatan guru

ATURAN:
1. Output adalah SATU objek JSON valid. BUKAN array. BUKAN daftar. Output JANGAN dibungkus kurung siku [...] atau kurung array.
2. Jika user memberikan teacherName, schoolName, principalName, academicYear, gunakan sebagai identitas dokumen. Jika tidak ada, tulis "dapat disesuaikan" untuk identitas satuan pendidikan.
3. Jangan menyertakan API key atau data pribadi dalam output.
4. Kegiatan harus praktis, konkret, dan siap pakai di kelas. Setiap langkah harus bisa dieksekusi guru.
5. Sesuaikan tingkat kesulitan, bahasa, dan aktivitas dengan jenjang kelas (SD/SMP/SMA).
6. Jika curriculum="Kurikulum Merdeka", gunakan istilah CP/TP/ATP dan Profil Pelajar Pancasila. Struktur Modul Ajar Merdeka lengkap: informasi umum (identitas, kompetensi awal, profil pelajar Pancasila min 2 dimensi, sarana prasarana, target peserta didik, model pembelajaran), komponen inti (CP, tujuan min 3, pemahaman bermakna, pertanyaan pemantik, kegiatan pendahuluan-inti-penutup dengan durasi, asesmen diagnostik-formatif-sumatif), dan lampiran di dalam editableText (LKPD, pengayaan & remedial, bahan bacaan, glosarium, daftar pustaka).
7. Jika curriculum="K13", gunakan istilah KI-1/2/3/4, KD, IPK (min 3 per KD), tujuan format ABCD, dan pendekatan saintifik 5M (mengamati, menanya, mengumpulkan informasi, mengasosiasi, mengomunikasikan) pada kegiatan inti; penilaian mencakup sikap, pengetahuan, dan keterampilan.
8. Jika user tidak memberikan CP, tulis "Perlu disesuaikan dengan CP resmi dari Kemendikdasmen." Jangan mengarang seolah-olah CP resmi jika tidak ada data.
9. Tujuan pembelajaran harus terukur dan sesuai ABCD (Audience, Behaviour, Condition, Degree).
10. Kriteria ketercapaian: buat konkret dan terobservasi, bukan abstrak.
11. Diferensiasi harus nyata: beri contoh konkret perbedaan konten/proses/produk untuk siswa dengan kebutuhan berbeda.
12. Pemahaman bermakna: apa inti yang akan siswa pahami dan terapkan dalam kehidupan?
13. Pertanyaan pemantik: buat 2-3 pertanyaan yang menggugah rasa ingin tahu siswa.

KUALITAS BAHASA:
- Gunakan Bahasa Indonesia formal pendidikan, namun tetap mudah diedit guru.
- Jangan menulis "sebagai AI" atau "saya adalah AI".
- Jangan mencampur bahasa Inggris kecuali istilah teknis yang tidak ada padanannya.
- Gunakan EYD/PUEBI yang baik dan benar.
- Jangan terlalu umum. Output harus relevan dengan topik dan kelas yang diminta.
- Jangan terlalu pendek. Setiap komponen harus substansial.

editableText WAJIB: string berisi RPP/Modul Ajar LENGKAP dalam format markdown/teks dokumen rapi yang bisa langsung dicopy dan diedit guru di Word/Google Docs. BUKAN JSON. BUKAN array. Format seperti dokumen sungguhan dengan heading, subheading, daftar, dan paragraf.

Struktur editableText:
# MODUL AJAR / RPP
## [Nama Mata Pelajaran]

### A. Identitas Dokumen
- Nama Sekolah: ...
- Nama Guru: ...
- Nama Kepala Sekolah: ...
- Mata Pelajaran: ...
- Kelas/Fase: ...
- Semester: ...
- Tahun Ajaran: ...
- Topik/Materi: ...
- Alokasi Waktu: ...

### B. Informasi Umum
- Kompetensi Awal
- Profil Pelajar Pancasila
- Sarana dan Prasarana
- Target Peserta Didik
- Model Pembelajaran

### C. Komponen Inti
1. Capaian Pembelajaran
2. Tujuan Pembelajaran
3. Kriteria Ketercapaian
4. Pemahaman Bermakna
5. Pertanyaan Pemantik
6. Materi Pembelajaran
7. Kegiatan Pembelajaran (Pendahuluan, Inti, Penutup)
8. Asesmen (Diagnostik, Formatif, Sumatif)
9. Diferensiasi Pembelajaran
10. Remedial dan Pengayaan
11. Refleksi Guru dan Peserta Didik

### D. Lampiran
(LKPD, Rubrik, Bahan Bacaan sesuai permintaan user)

### E. Lembar Pengesahan
Mengetahui,
Kepala Sekolah                    Guru Mata Pelajaran

{principalName atau "disesuaikan"}                 {teacherName atau "disesuaikan"}

editableText HARUS berupa dokumen lengkap dengan semua komponen di atas, dalam format markdown yang rapi dan siap cetak. editableText BUKAN JSON string — langsung konten dokumen.`,
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
      description: "Semua komponen RPP terisi dengan baik, termasuk identitas dokumen (teacherName, schoolName, principalName, academicYear jika disediakan)",
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
