const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

const questions = [
  { kompetensi: "PEDAGOGIK", text: "Pendekatan pembelajaran yang berpusat pada siswa disebut...", type: "PILIHAN_GANDA", options: ["Teacher centered","Student centered","Subject centered","Curriculum centered"], correctAnswer: "1", difficulty: "EASY" },
  { kompetensi: "PEDAGOGIK", text: "Kurikulum Merdeka menggunakan istilah... untuk menunjukkan capaian pembelajaran.", type: "PILIHAN_GANDA", options: ["KD","KI","CP (Capaian Pembelajaran)","SK"], correctAnswer: "2", difficulty: "MEDIUM" },
  { kompetensi: "PEDAGOGIK", text: "Model pembelajaran yang menekankan pemecahan masalah adalah...", type: "PILIHAN_GANDA", options: ["Ceramah","PBL (Problem Based Learning)","Diskusi","Tanya jawab"], correctAnswer: "1", difficulty: "MEDIUM" },
  { kompetensi: "PEDAGOGIK", text: "Asesmen yang dilakukan selama proses pembelajaran disebut...", type: "PILIHAN_GANDA", options: ["Asesmen sumatif","Asesmen formatif","Asesmen akhir","Asesmen nasional"], correctAnswer: "1", difficulty: "MEDIUM" },
  { kompetensi: "PEDAGOGIK", text: "Tujuan pembelajaran dalam Kurikulum Merdeka dirumuskan dari...", type: "PILIHAN_GANDA", options: ["KI","KD","CP dan ATP","Silabus"], correctAnswer: "2", difficulty: "MEDIUM" },
  { kompetensi: "PROFESIONAL", text: "Kemampuan guru dalam menguasai materi pelajaran disebut kompetensi...", type: "PILIHAN_GANDA", options: ["Pedagogik","Profesional","Sosial","Kepribadian"], correctAnswer: "1", difficulty: "EASY" },
  { kompetensi: "PROFESIONAL", text: "PTK (Penelitian Tindakan Kelas) bertujuan untuk...", type: "PILIHAN_GANDA", options: ["Mendapatkan gelar","Memperbaiki pembelajaran","Mencari data","Mengisi waktu luang"], correctAnswer: "1", difficulty: "MEDIUM" },
  { kompetensi: "PROFESIONAL", text: "Kemampuan literasi digital guru mencakup...", type: "PILIHAN_GANDA", options: ["Membaca buku","Menggunakan teknologi pembelajaran","Menulis artikel","Berbicara di depan umum"], correctAnswer: "1", difficulty: "MEDIUM" },
  { kompetensi: "SOSIAL", text: "Komunikasi efektif guru dengan orang tua siswa termasuk kompetensi...", type: "PILIHAN_GANDA", options: ["Pedagogik","Profesional","Sosial","Kepribadian"], correctAnswer: "2", difficulty: "EASY" },
  { kompetensi: "SOSIAL", text: "Guru yang mampu berkolaborasi dengan rekan sejawat menunjukkan kompetensi...", type: "PILIHAN_GANDA", options: ["Profesional","Pedagogik","Kepribadian","Sosial"], correctAnswer: "3", difficulty: "EASY" },
  { kompetensi: "KEPRIBADIAN", text: "Guru yang menjadi teladan bagi siswa mencerminkan kompetensi...", type: "PILIHAN_GANDA", options: ["Pedagogik","Profesional","Sosial","Kepribadian"], correctAnswer: "3", difficulty: "EASY" },
  { kompetensi: "KEPRIBADIAN", text: "Sikap jujur dan disiplin termasuk dalam kompetensi...", type: "PILIHAN_GANDA", options: ["Kepribadian","Sosial","Pedagogik","Profesional"], correctAnswer: "0", difficulty: "EASY" },
  { kompetensi: "PEDAGOGIK", text: "Media pembelajaran dipilih berdasarkan...", type: "PILIHAN_GANDA", options: ["Kemauan guru","Tujuan pembelajaran","Harga media","Ketersediaan"], correctAnswer: "1", difficulty: "MEDIUM" },
  { kompetensi: "PEDAGOGIK", text: "Tahapan dalam model ASSURE adalah...", type: "PILIHAN_GANDA", options: ["5 langkah","6 langkah","7 langkah","8 langkah"], correctAnswer: "1", difficulty: "HARD" },
  { kompetensi: "PEDAGOGIK", text: "Pembelajaran terdiferensiasi memperhatikan...", type: "PILIHAN_GANDA", options: ["Kesamaan siswa","Kebutuhan individu","Kurikulum","Jadwal"], correctAnswer: "1", difficulty: "MEDIUM" },
  { kompetensi: "PEDAGOGIK", text: "Taksonomi Bloom yang direvisi terdiri dari... level kognitif.", type: "PILIHAN_GANDA", options: ["4","5","6","7"], correctAnswer: "2", difficulty: "MEDIUM" },
  { kompetensi: "PEDAGOGIK", text: "Keterampilan abad 21 mencakup 4C, yaitu...", type: "PILIHAN_GANDA", options: ["Creativity, Critical thinking, Communication, Collaboration","Ceramah, Catat, Coba, Cek","Cepat, Cermat, Cekatan, Cerdas","Create, Click, Connect, Chat"], correctAnswer: "0", difficulty: "MEDIUM" },
  { kompetensi: "PROFESIONAL", text: "Refleksi pembelajaran dilakukan guru setelah...", type: "PILIHAN_GANDA", options: ["Sebelum mengajar","Saat mengajar","Setelah mengajar","Sebelum tahun ajaran"], correctAnswer: "2", difficulty: "MEDIUM" },
  { kompetensi: "PROFESIONAL", text: "Portofolio guru berfungsi untuk...", type: "PILIHAN_GANDA", options: ["Koleksi dokumen","Bukti kinerja","Pengarsipan","Semua benar"], correctAnswer: "3", difficulty: "MEDIUM" },
  { kompetensi: "PROFESIONAL", text: "Pengembangan keprofesian berkelanjutan (PKB) meliputi...", type: "PILIHAN_GANDA", options: ["Diklat saja","Penelitian saja","Diklat, penelitian, dan publikasi","Mengajar saja"], correctAnswer: "2", difficulty: "HARD" },
  { kompetensi: "SOSIAL", text: "Guru dapat membangun hubungan baik dengan siswa melalui...", type: "PILIHAN_GANDA", options: ["Hukuman","Komunikasi efektif","Ancaman","Perintah"], correctAnswer: "1", difficulty: "EASY" },
  { kompetensi: "SOSIAL", text: "Keterlibatan guru dalam kegiatan masyarakat termasuk kompetensi...", type: "PILIHAN_GANDA", options: ["Pedagogik","Profesional","Sosial","Kepribadian"], correctAnswer: "2", difficulty: "EASY" },
  { kompetensi: "KEPRIBADIAN", text: "Guru yang sabar dan pemaaf mencerminkan...", type: "PILIHAN_GANDA", options: ["Profesionalisme","Kepribadian baik","Kompetensi sosial","Pedagogik"], correctAnswer: "1", difficulty: "EASY" },
  { kompetensi: "KEPRIBADIAN", text: "Kode etik guru mengatur tentang...", type: "PILIHAN_GANDA", options: ["Gaji guru","Perilaku dan tanggung jawab guru","Jam mengajar","Libur guru"], correctAnswer: "1", difficulty: "MEDIUM" },
  { kompetensi: "PEDAGOGIK", text: "Prinsip pembelajaran bermakna dari Ausubel menekankan...", type: "PILIHAN_GANDA", options: ["Hafalan","Keterkaitan dengan pengetahuan awal","Latihan terus menerus","Reward and punishment"], correctAnswer: "1", difficulty: "HARD" },
  { kompetensi: "PEDAGOGIK", text: "ZPD (Zone of Proximal Development) dikemukakan oleh...", type: "PILIHAN_GANDA", options: ["Piaget","Vygotsky","Skinner","Bruner"], correctAnswer: "1", difficulty: "MEDIUM" },
  { kompetensi: "PEDAGOGIK", text: "Asesmen autentik menilai...", type: "PILIHAN_GANDA", options: ["Hafalan siswa","Kemampuan nyata siswa","Kecepatan siswa","Kehadiran siswa"], correctAnswer: "1", difficulty: "MEDIUM" },
  { kompetensi: "PROFESIONAL", text: "TPACK adalah kerangka integrasi... dalam pembelajaran.", type: "PILIHAN_GANDA", options: ["Buku","Teknologi","Laboratorium","Perpustakaan"], correctAnswer: "1", difficulty: "MEDIUM" },
  { kompetensi: "PROFESIONAL", text: "Guru yang melakukan PTK bertujuan untuk...", type: "PILIHAN_GANDA", options: ["Kenaikan pangkat","Perbaikan pembelajaran","Publikasi","Sertifikasi"], correctAnswer: "1", difficulty: "MEDIUM" },
  { kompetensi: "PEDAGOGIK", text: "Model pembelajaran kooperatif adalah...", type: "PILIHAN_GANDA", options: ["Belajar sendiri","Belajar kelompok","Belajar dengan guru","Belajar online"], correctAnswer: "1", difficulty: "EASY" },
];

async function main() {
  let added = 0;
  for (const q of questions) {
    try {
      await p.tKAQuestion.create({ data: { ...q, isActive: true, isVerified: true, subKompetensi: "" } });
      added++;
    } catch(e) {}
  }
  console.log('Added:', added, 'TKA questions');
  const total = await p.tKAQuestion.count();
  console.log('Total TKA:', total);
  await p.\$disconnect();
}
main().catch(e => console.log('Error:', e.message));
