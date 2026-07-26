export interface RPPFallbackInput {
  teacherName?: string;
  nipGuru?: string;
  schoolName?: string;
  principalName?: string;
  principalNip?: string;
  academicYear?: string;
  cityDate?: string;
  subject: string;
  grade: string;
  phase?: string;
  semester?: string;
  curriculum: string;
  topic: string;
  duration: string;
  meetingCount: number;
  learningObjectives: string[];
  includeWorksheet?: boolean;
  includeRubric?: boolean;
  includeRemedialEnrichment?: boolean;
}

export function generateRPPFallback(input: RPPFallbackInput): string {
  const today = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const schoolName = input.schoolName || "[Nama Sekolah]";
  const teacherName = input.teacherName || "[Nama Guru]";
  const principalName = input.principalName || "[Nama Kepala Sekolah]";
  const nipGuru = input.nipGuru || "........................";
  const principalNip = input.principalNip || "........................";
  const cityDate = input.cityDate || "...................., ....................";
  const academicYear = input.academicYear || "[Tahun Ajaran]";
  const semester = input.semester || "[Semester]";
  const phase = input.phase || "";
  const gradeText = `${input.grade}${phase ? `/${phase}` : ""}`;

  return `Nama Sekolah: ${schoolName}
Mata Pelajaran: ${input.subject}
Kelas/Fase: ${gradeText}
Tahun Ajaran: ${academicYear}
Semester: ${semester}
Dibuat dengan bantuan BahasaCerdas.com

# RENCANA PEMBELAJARAN
## ${input.subject.toUpperCase()}

### A. Identitas Dokumen
| Komponen | Keterangan |
|---|---|
| Nama Sekolah | ${schoolName} |
| Nama Guru | ${teacherName} |
| NIP Guru | ${nipGuru} |
| Kepala Sekolah | ${principalName} |
| NIP Kepala Sekolah | ${principalNip} |
| Mata Pelajaran | ${input.subject} |
| Kelas/Fase | ${gradeText} |
| Semester | ${semester} |
| Tahun Ajaran | ${academicYear} |
| Kota, Tanggal | ${cityDate} |
| Topik/Materi | ${input.topic} |
| Alokasi Waktu | ${input.duration} |
| Jumlah Pertemuan | ${input.meetingCount} |

### B. Informasi Umum
1. **Kompetensi Awal**: Peserta didik memiliki pengetahuan dasar tentang teks dalam Bahasa Indonesia sesuai jenjang ${input.grade}.
2. **Profil Pelajar Pancasila**: Beriman dan bertakwa kepada Tuhan YME; Bernalar kritis; Kreatif.
3. **Sarana dan Prasarana**: Buku paket Bahasa Indonesia, laptop/proyektor, papan tulis, LKPD, bahan ajar cetak/digital.
4. **Target Peserta Didik**: Peserta didik regular kelas ${input.grade} dengan kemampuan beragam.
5. **Model/Metode Pembelajaran**: Tatap muka dengan pendekatan saintifik dan model pembelajaran berdiferensiasi.

### C. Komponen Inti
1. **Capaian Pembelajaran**: Peserta didik mampu memahami, mengolah, dan menyajikan teks ${input.topic} sesuai dengan struktur dan kaidah kebahasaan yang tepat.
2. **Tujuan Pembelajaran**:${input.learningObjectives.map((lo) => `\n   - ${lo}`).join("")}
3. **Kriteria Ketercapaian Tujuan Pembelajaran**:
   - Peserta didik mampu mengidentifikasi ciri-ciri teks ${input.topic}.
   - Peserta didik mampu menganalisis struktur teks ${input.topic}.
   - Peserta didik mampu menyusun teks ${input.topic} secara mandiri.
4. **Pemahaman Bermakna**: Memahami ${input.topic} membantu peserta didik berkomunikasi secara efektif dalam kehidupan sehari-hari.
5. **Pertanyaan Pemantik**:
   - Apa yang kalian ketahui tentang ${input.topic}?
   - Di mana kalian menemukan teks ${input.topic} dalam kehidupan sehari-hari?
6. **Materi Pokok**: Pengertian, struktur, ciri kebahasaan, dan langkah menyusun ${input.topic}.
7. **Kegiatan Pembelajaran**:
   - **Pendahuluan** (10 menit): Guru membuka pembelajaran dengan salam, doa, dan presensi. Guru memberikan apersepsi dan pertanyaan pemantik terkait ${input.topic}. Guru menyampaikan tujuan pembelajaran.
   - **Kegiatan Inti** (60 menit): Peserta didik mengamati contoh teks ${input.topic}. Peserta didik berdiskusi secara berkelompok untuk mengidentifikasi struktur teks. Setiap kelompok mempresentasikan hasil diskusi. Guru memberikan penguatan dan klarifikasi.
   - **Penutup** (20 menit): Guru dan peserta didik menyimpulkan pembelajaran. Refleksi singkat tentang proses belajar. Guru menyampaikan rencana pertemuan berikutnya.
8. **Asesmen**:
   - Diagnostik: Pertanyaan lisan di awal pembelajaran untuk mengetahui pengetahuan awal peserta didik.
   - Formatif: Observasi selama diskusi kelompok, hasil kerja kelompok, dan partisipasi presentasi.
   - Sumatif: Tugas individu menulis teks ${input.topic} sesuai struktur dan kaidah kebahasaan.${input.includeRubric ? "\n   - Rubrik terlampir untuk pedoman penilaian." : ""}
9. **Diferensiasi Pembelajaran**:
   - Konten: Bahan bacaan dengan tingkat kesulitan berbeda.
   - Proses: Kelompok berdasarkan tingkat pemahaman; bimbingan khusus untuk yang membutuhkan.
   - Produk: Pilihan bentuk luaran (teks tertulis, rekaman, atau presentasi).
10. **Remedial dan Pengayaan**:${input.includeRemedialEnrichment ? "\n   - Remedial: Bimbingan khusus bagi peserta didik yang belum mencapai KKTP.\n   - Pengayaan: Tugas tambahan dengan tingkat kesulitan lebih tinggi bagi peserta didik yang sudah tuntas." : "\n   - (Disesuaikan dengan kebutuhan peserta didik)"}
11. **Refleksi Guru**: Apakah model pembelajaran yang digunakan efektif? Apakah semua peserta didik mencapai tujuan pembelajaran? Apa yang perlu diperbaiki untuk pertemuan selanjutnya?
12. **Refleksi Peserta Didik**: Apa yang paling menarik dari pembelajaran hari ini? Apa yang masih sulit dipahami?${input.includeWorksheet ? `

### D. Lampiran
1. **LKPD (Lembar Kerja Peserta Didik)**: Lembar kerja individu/kelompok untuk mengidentifikasi dan menyusun ${input.topic}. Petunjuk pengerjaan, soal latihan, dan tempat menulis jawaban tersedia di LKPD.
2. **Bahan Bacaan**: Contoh-contoh teks ${input.topic} dari berbagai sumber (buku paket, artikel, media massa).
3. **Glosarium**: Istilah-istilah kunci terkait ${input.topic} beserta definisi singkat.` : ""}
${input.includeRubric ? `4. **Rubrik Penilaian**:
   | Kriteria | Unggul (4) | Baik (3) | Cukup (2) | Perlu Perbaikan (1) |
   |---|---|---|---|---|
   | Kesesuaian Isi | Isi sangat sesuai tema | Isi sesuai tema | Isi cukup sesuai | Isi kurang sesuai |
   | Struktur Teks | Struktur lengkap dan tepat | Struktur lengkap | Struktur cukup lengkap | Struktur belum lengkap |
   | Kebahasaan | Bahasa sangat baik dan tepat | Bahasa baik | Bahasa cukup baik | Bahasa perlu diperbaiki |
   | Kreativitas | Sangat kreatif dan orisinal | Kreatif | Cukup kreatif | Kurang kreatif |
5. **Pedoman Penskoran**: Skor akhir = (Total skor / Skor maksimal) × 100` : ""}

### E. Lembar Pengesahan
${cityDate}

Mengetahui,
Kepala Sekolah                                      Guru Mata Pelajaran

<br><br><br>

${principalName}        ${teacherName}
NIP. ${principalNip} NIP. ${nipGuru}

---
*Dokumen ini dibuat dengan bantuan BahasaCerdas.com pada ${today}. Silakan menyesuaikan isi dokumen dengan Capaian Pembelajaran (CP) dan Alur Tujuan Pembelajaran (ATP) resmi, karakteristik peserta didik, serta kebijakan satuan pendidikan masing-masing.*`;
}
