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
  nipGuru: z.string().optional(),
  schoolName: z.string().optional(),
  principalName: z.string().optional(),
  principalNip: z.string().optional(),
  academicYear: z.string().optional(),
  cityDate: z.string().optional(),
});

// Schema output DILONGGARKAN dengan sengaja: kontrak utama adalah
// editableText (dokumen siap cetak); field terstruktur apa pun tetap
// diterima dan dirender oleh rpp-normalizer. Schema ketat sebelumnya
// membuat respons AI yang sebenarnya layak gagal divalidasi.
export const rppOutputSchema = z
  .object({
    title: z.string().optional(),
    editableText: z.string().optional(),
    displayText: z.string().optional(),
  })
  .passthrough();

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

PRIORITAS UTAMA — EDITABLETEXT (dalam JSON):
Anda harus menghasilkan SATU objek JSON yang valid dengan field "editableText" berisi dokumen RPP/Modul Ajar siap print dalam format markdown. EDITABLETEXT adalah SATU-SATUNYA output yang dilihat user. 80% token AI harus dihabiskan untuk membuat konten editableText yang sempurna.

Format JSON yang harus dihasilkan:
{
  "editableText": "seluruh dokumen RPP siap print dalam format markdown..."
}

Konten editableText harus berupa dokumen RPP siap print dengan struktur berikut:

========================================
HEADER DOKUMEN (blok pertama, rata kiri):
Nama Sekolah: {schoolName atau "[Nama Sekolah]"}
Mata Pelajaran: Bahasa Indonesia
Kelas/Fase: {grade}/{phase}
Tahun Ajaran: {academicYear atau "[Tahun Ajaran]"}
Semester: {semester atau "[Semester]"}
Dibuat dengan bantuan BahasaCerdas.com

# MODUL AJAR / RENCANA PELAKSANAAN PEMBELAJARAN
## BAHASA INDONESIA

### A. Identitas Dokumen
| Komponen | Keterangan |
|---|---|
| Nama Sekolah | {schoolName atau "[Nama Sekolah]"} |
| Nama Guru | {teacherName atau "[Nama Guru]"} |
| NIP Guru | {nipGuru atau "........................"} |
| Kepala Sekolah | {principalName atau "[Nama Kepala Sekolah]"} |
| NIP Kepala Sekolah | {principalNip atau "........................"} |
| Mata Pelajaran | Bahasa Indonesia |
| Kelas/Fase | {grade}/{phase} |
| Semester | {semester atau "Ganjil/Genap"} |
| Tahun Ajaran | {academicYear atau "[Tahun Ajaran]"} |
| Kota, Tanggal | {cityDate atau "...................., ...................."} |
| Topik/Materi | {topic} |
| Alokasi Waktu | {duration} |
| Jumlah Pertemuan | {meetingCount} |

### B. Informasi Umum
1. **Kompetensi Awal**: [deskripsi pengetahuan prasyarat]
2. **Profil Pelajar Pancasila**: [2-3 dimensi yang dikembangkan, untuk Kurikulum Merdeka]
3. **Sarana dan Prasarana**: [media, alat, sumber belajar]
4. **Target Peserta Didik**: [karakteristik siswa]
5. **Model/Metode Pembelajaran**: {learningModel atau "[model pembelajaran]"}

### C. Komponen Inti
1. **Capaian Pembelajaran**: [uraian CP sesuai fase — jika tidak ada data, tulis "Perlu disesuaikan dengan CP resmi"]
2. **Tujuan Pembelajaran**: [tujuan ABCD, minimal 2]
3. **Kriteria Ketercapaian Tujuan Pembelajaran**: [indikator terukur]
4. **Pemahaman Bermakna**: [inti yang dipahami siswa]
5. **Pertanyaan Pemantik**: [2-3 pertanyaan]
6. **Materi Pokok**: [uraian singkat materi]
7. **Kegiatan Pembelajaran**:
   - **Pendahuluan** (10 menit): [langkah dengan durasi]
   - **Kegiatan Inti** (60 menit): [langkah dengan sintaks model pembelajaran]
   - **Penutup** (20 menit): [refleksi dan tindak lanjut]
8. **Asesmen**:
   - Diagnostik: [teknik dan instrumen]
   - Formatif: [observasi, diskusi, produk]
   - Sumatif: [tes tertulis, proyek]
9. **Diferensiasi Pembelajaran**:
   - Konten: [perbedaan materi]
   - Proses: [perbedaan kegiatan]
   - Produk: [perbedaan hasil]
10. **Remedial dan Pengayaan**: [hanya jika includeRemedialEnrichment=true]
11. **Refleksi Guru**: [pertanyaan refleksi]
12. **Refleksi Peserta Didik**: [pertanyaan refleksi]

### D. Lampiran
1. **LKPD** (Lembar Kerja Peserta Didik): [hanya jika includeWorksheet=true]
2. **Bahan Bacaan Guru dan Peserta Didik**
3. **Glosarium Sederhana**
4. **Rubrik Penilaian**: [hanya jika includeRubric=true]
5. **Pedoman Penskoran**

### E. Lembar Pengesahan
{cityDate atau "...................., ...................."}

Mengetahui,
Kepala Sekolah                                      Guru Mata Pelajaran

<br><br><br>

{principalName atau "[Nama Kepala Sekolah]"}        {teacherName atau "[Nama Guru]"}
NIP. {principalNip atau "........................"} NIP. {teacherNip atau "........................"}

========================================
FOOTER DOKUMEN:
---
*Dokumen ini dibuat dengan bantuan BahasaCerdas.com pada {tanggal sekarang}. Silakan menyesuaikan isi dokumen dengan Capaian Pembelajaran (CP) dan Alur Tujuan Pembelajaran (ATP) resmi, karakteristik peserta didik, serta kebijakan satuan pendidikan masing-masing.*

ATURAN EDITABLETEXT (dalam field "editableText" JSON):
1. Tabel identitas menggunakan format markdown | kolom | kolom |
2. Gunakan heading ### untuk sub-bagian A, B, C, D, E
3. Gunakan **bold** untuk nama sub-komponen (seperti "Kompetensi Awal", "Tujuan Pembelajaran")
4. Gunakan - daftar atau 1. penomoran untuk poin-poin
5. Konten setiap komponen harus SUBSTANSIAL dan SPESIFIK sesuai topik/kelas — jangan template kosong
6. Jika tidak ada NIP, tulis "........................"
7. Jika tidak ada cityDate, tulis "...................., ...................."
8. Jumlah karakter editableText minimal 1.800 karakter
9. Jangan menulis "sebagai AI", "saya adalah AI", atau "saya tidak bisa"
10. Gunakan Bahasa Indonesia formal pendidikan — mudah diedit guru, siap print, siap diserahkan ke dinas
11. editableText HARUS dokumen lengkap dengan header, tabel identitas, komponen A-E, lembar pengesahan, dan footer BahasaCerdas.
12. SELURUH output HARUS SATU objek JSON — field "editableText" berisi markdown. Jangan output teks di luar objek JSON.`,
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
          teacherName: "Dewi Sartika, S.Pd.",
          nipGuru: "198507162010012001",
          schoolName: "SMA Negeri 1 Jakarta",
          principalName: "Dr. Ahmad Faiz, M.Pd.",
          principalNip: "197003152005011002",
          academicYear: "2025/2026",
          cityDate: "Jakarta, 1 Juli 2025",
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
        editableText: `Nama Sekolah: SMA Negeri 1 Jakarta
Mata Pelajaran: Bahasa Indonesia
Kelas/Fase: X/E
Tahun Ajaran: 2025/2026
Semester: 1 (Ganjil)
Dibuat dengan bantuan BahasaCerdas.com

# MODUL AJAR / RENCANA PELAKSANAAN PEMBELAJARAN
## BAHASA INDONESIA

### A. Identitas Dokumen
| Komponen | Keterangan |
|---|---|
| Nama Sekolah | SMA Negeri 1 Jakarta |
| Nama Guru | Dewi Sartika, S.Pd. |
| NIP Guru | 198507162010012001 |
| Kepala Sekolah | Dr. Ahmad Faiz, M.Pd. |
| NIP Kepala Sekolah | 197003152005011002 |
| Mata Pelajaran | Bahasa Indonesia |
| Kelas/Fase | X/E |
| Semester | 1 (Ganjil) |
| Tahun Ajaran | 2025/2026 |
| Kota, Tanggal | Jakarta, 1 Juli 2025 |
| Topik/Materi | Teks Negosiasi |
| Alokasi Waktu | 2 JP x 45 menit |
| Jumlah Pertemuan | 1 |

### B. Informasi Umum
... (format teks rapi panjang dengan semua komponen A-E)`,

/* Contoh editableText singkat di atas — dalam produksi minimum 1.800 karakter */
      },
    },
  ],

  async run(input, context): Promise<AgentRunResult> {
    return runAgent({ agent, input, context });
  },
};

registerAgent(agent);
export default agent;
