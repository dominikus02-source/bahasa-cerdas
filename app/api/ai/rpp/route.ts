import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { checkAIQuota, recordAIUsage } from "@/lib/premium";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const quota = await checkAIQuota(user, "rpp");
    if (!quota.allowed) {
      return NextResponse.json({ error: "QUOTA_EXCEEDED", used: quota.used, limit: quota.limit }, { status: 429 });
    }

    const body = await req.json();
    const { kd, kelas, topik, alokasi, metode, curriculum, schoolName, teacherName, semester } = body;

    const curriculumLabels: Record<string, string> = { K13: "Kurikulum 2013", MERDEKA: "Kurikulum Merdeka", MERDEKA_DL: "Kurikulum Merdeka Deep Learning" };
    const currLabel = curriculumLabels[curriculum] || "Kurikulum Merdeka";

    let curriculumSpecific = "";
    if (curriculum === "K13") {
      curriculumSpecific = `
STRUKTUR RPP KURIKULUM 2013 (Sesuai Permendikbud No. 22/2016 & SE No. 14/2019):

WAJIB ADA SEMUA KOMPONEN BERIKUT:

1. KOMPETENSI INTI (KI) — HARUS DITULIS LENGKAP:
   - KI-1 (Sikap Spiritual): Menghayati dan mengamalkan ajaran agama yang dianutnya
   - KI-2 (Sikap Sosial): Menunjukkan perilaku jujur, disiplin, tanggung jawab, peduli, santun, responsif, dan pro-aktif
   - KI-3 (Pengetahuan): Memahami, menerapkan, menganalisis pengetahuan faktual, konseptual, prosedural
   - KI-4 (Keterampilan): Mengolah, menalar, dan menyaji dalam ranah konkret dan ranah abstrak

2. KOMPETENSI DASAR (KD) — GUNAKAN KD DARI INPUT USER:
   - KD 3.x (Pengetahuan): ${kd || "3.1 Menganalisis struktur dan kebahasaan teks negosiasi"}
   - KD 4.x (Keterampilan): Sesuaikan dengan KD pengetahuan, misalnya 4.1 Menyusun teks negosiasi

3. INDIKATOR PENCAPAIAN KOMPETENSI (IPK):
   - IPK dari KD Pengetahuan (minimal 3 indikator)
   - IPK dari KD Keterampilan (minimal 3 indikator)
   - Gunakan kata kerja operasional: mengidentifikasi, menjelaskan, menganalisis, menyusun, dll.

4. TUJUAN PEMBELAJARAN:
   - Dirumuskan berdasarkan IPK
   - Menggunakan format ABCD (Audience, Behavior, Condition, Degree)
   - Contoh: "Melalui diskusi kelompok, peserta didik dapat menganalisis struktur teks negosiasi dengan benar"

5. MATERI PEMBELAJARAN:
   - Materi Pokok: ${topik || "Teks Negosiasi"}
   - Uraian materi lengkap: fakta, konsep, prinsip, prosedur yang relevan
   - Sesuaikan dengan kelas ${kelas || "X"}

6. KEGIATAN PEMBELAJARAN (3 TAHAP):
   a. Pendahuluan (10-15 menit):
      - Guru memberi salam, berdoa, memeriksa kehadiran
      - Apersepsi: mengaitkan materi sebelumnya dengan materi baru
      - Menyampaikan tujuan pembelajaran
      - Memberikan motivasi
   
   b. Kegiatan Inti (sesuai alokasi waktu - pendahuluan - penutup):
      WAJIB MENGGUNAKAN PENDEKATAN SAINTIFIK (5M):
      - Mengamati: peserta didik mengamati fenomena/contoh terkait "${topik || "Teks Negosiasi"}"
      - Menanya: peserta didik mengajukan pertanyaan tentang "${topik || "Teks Negosiasi"}"
      - Mengumpulkan informasi: peserta didik mencari/mengumpulkan data tentang "${topik || "Teks Negosiasi"}"
      - Mengasosiasi: peserta didik menganalisis dan menyimpulkan tentang "${topik || "Teks Negosiasi"}"
      - Mengomunikasikan: peserta didik mempresentasikan hasil diskusi tentang "${topik || "Teks Negosiasi"}"
      
      Metode yang digunakan: ${metode || "Diskusi, ceramah, penugasan"}
      Buat langkah-langkah DETAIL dan SPESIFIK untuk setiap fase 5M
   
   c. Penutup (10-15 menit):
      - Guru bersama peserta didik membuat rangkuman/simpulan
      - Refleksi proses pembelajaran
      - Memberikan umpan balik
      - Menyampaikan rencana pembelajaran berikutnya
      - Doa penutup

7. PENILAIAN (3 ASPEK):
   a. Penilaian Sikap: Observasi selama pembelajaran (jurnal)
      - Aspek: spiritual (KI-1) dan sosial (KI-2)
      - Teknik: Observasi/pengamatan
      - Instrumen: Lembar observasi
   
   b. Penilaian Pengetahuan:
      - Teknik: Tes tertulis (pilihan ganda/uraian)
      - Instrumen: Soal tentang "${topik || "Teks Negosiasi"}"
      - Kisi-kisi sesuai IPK KD 3.x
   
   c. Penilaian Keterampilan:
      - Teknik: Praktik/Proyek/Portofolio
      - Instrumen: Rubrik penilaian
      - Kisi-kisi sesuai IPK KD 4.x

8. MEDIA/ALAT/SUMBER BELAJAR:
   - Media: ${topik || "Teks Negosiasi"} (contoh teks, video, gambar)
   - Alat: Laptop, LCD, papan tulis, spidol
   - Sumber: Buku Bahasa Indonesia kelas ${kelas || "X"} Kemendikbud, referensi lain yang relevan`;

    } else if (curriculum === "MERDEKA") {
      curriculumSpecific = `
STRUKTUR MODUL AJAR KURIKULUM MERDEKA (Sesuai Panduan Kemendikbudristek):

WAJIB ADA 3 KOMPONEN UTAMA:

=== A. INFORMASI UMUM ===

1. Identitas Modul:
   - Nama penyusun: ${teacherName || "Guru Bahasa Indonesia"}
   - Institusi: ${schoolName || "Sekolah"}
   - Tahun penyusunan: 2025
   - Jenjang: SMA/MA/SMK
   - Kelas: ${kelas || "X"}
   - Fase: ${parseInt(kelas || "10") <= 6 ? (parseInt(kelas || "10") <= 2 ? "A" : parseInt(kelas || "10") <= 4 ? "B" : "C") : (parseInt(kelas || "10") <= 9 ? "D" : (parseInt(kelas || "10") === 10 ? "E" : "F"))}
   - Semester: ${semester || "1 (Ganjil)"}
   - Mata Pelajaran: Bahasa Indonesia
   - Alokasi Waktu: ${alokasi || "2x40 menit"}
   - Model Pembelajaran: ${metode || "Tatap Muka"}

2. Kompetensi Awal:
   - Kemampuan yang harus dimiliki peserta didik sebelum mempelajari "${topik || "Teks Negosiasi"}"
   - Jelaskan kompetensi prasyarat

3. Profil Pelajar Pancasila:
   - WAJIB sebutkan dimensi yang relevan (minimal 2):
     * Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia
     * Berkebinekaan Global
     * Bergotong Royong
     * Mandiri
     * Bernalar Kritis
     * Kreatif
   - Jelaskan KAITAN setiap dimensi dengan pembelajaran "${topik || "Teks Negosiasi"}"

4. Sarana dan Prasarana:
   - Sarana: Laptop, LCD, papan tulis, alat tulis
   - Prasarana: Ruang kelas, perpustakaan
   - Sumber Belajar: Buku Bahasa Indonesia kelas ${kelas || "X"}, internet, referensi lain

5. Target Peserta Didik:
   - Peserta didik reguler/tipikal
   - Peserta didik dengan kesulitan belajar (jika ada)
   - Peserta didik dengan pencapaian tinggi (jika ada)

6. Model Pembelajaran:
   - Model: ${metode || "Tatap Muka / PJJ"}
   - Metode: ${metode || "Diskusi, ceramah, penugasan"}

=== B. KOMPONEN INTI ===

1. Capaian Pembelajaran (CP):
   - Tuliskan CP Bahasa Indonesia Fase ${parseInt(kelas || "10") <= 6 ? (parseInt(kelas || "10") <= 2 ? "A" : parseInt(kelas || "10") <= 4 ? "B" : "C") : (parseInt(kelas || "10") <= 9 ? "D" : (parseInt(kelas || "10") === 10 ? "E" : "F"))} yang relevan
   - CP mencakup kemampuan membaca, menulis, menyimak, berbahasa

2. Tujuan Pembelajaran:
   - Dirumuskan berdasarkan CP
   - Spesifik, terukur, dapat dicapai
   - Contoh: "Peserta didik mampu menganalisis struktur dan kebahasaan ${topik || "teks negosiasi"} dengan benar"
   - Minimal 3 tujuan pembelajaran

3. Pemahaman Bermakna:
   - Manfaat pembelajaran "${topik || "Teks Negosiasi"}" dalam kehidupan sehari-hari
   - Keterkaitan dengan konteks nyata

4. Pertanyaan Pemantik:
   - 2-3 pertanyaan yang memicu rasa ingin tahu
   - Pertanyaan open-ended yang mengarah ke diskusi
   - Contoh: "Pernahkah kamu bernegosiasi? Bagaimana caranya agar berhasil?"

5. Kegiatan Pembelajaran:
   
   a. Kegiatan Pendahuluan (10-15 menit):
      - Guru membuka pelajaran dengan salam dan doa
      - Memeriksa kehadiran peserta didik
      - Apersepsi: mengaitkan pengetahuan awal dengan materi "${topik || "Teks Negosiasi"}"
      - Menyampaikan tujuan pembelajaran
      - Memberikan gambaran kegiatan yang akan dilakukan
   
   b. Kegiatan Inti (sesuai alokasi waktu):
      - Langkah-langkah pembelajaran DETAIL dan SPESIFIK untuk topik "${topik || "Teks Negosiasi"}"
      - Gunakan metode: ${metode || "Diskusi, ceramah, penugasan"}
      - Sertakan aktivitas peserta didik yang aktif dan bermakna
      - Berikan contoh konkret tentang "${topik || "Teks Negosiasi"}"
      - Buat langkah-langkah yang jelas (Langkah 1, Langkah 2, dst.)
   
   c. Kegiatan Penutup (10-15 menit):
      - Guru bersama peserta didik membuat simpulan
      - Refleksi: apa yang sudah dipelajari, apa yang perlu diperbaiki
      - Umpan balik terhadap proses pembelajaran
      - Tindak lanjut: memberikan tugas atau menyampaikan materi berikutnya

6. Asesmen:
   a. Asesmen Diagnostik (di awal pembelajaran):
      - Pertanyaan untuk mengetahui pengetahuan awal tentang "${topik || "Teks Negosiasi"}"
   
   b. Asesmen Formatif (selama pembelajaran):
      - Observasi keaktifan diskusi
      - Lembar kerja peserta didik (LKPD)
      - Kuis singkat
   
   c. Asesmen Sumatif (di akhir pembelajaran):
      - Tes tertulis tentang "${topik || "Teks Negosiasi"}"
      - Penilaian produk/kinerja (jika ada)
      - Rubrik penilaian

=== C. LAMPIRAN ===

1. Lembar Kerja Peserta Didik (LKPD):
   - Instruksi kegiatan
   - Langkah-langkah kegiatan
   - Tabel/format pengisian

2. Pengayaan dan Remedial:
   - Pengayaan: aktivitas tambahan untuk peserta didik yang sudah mencapai tujuan
   - Remedial: aktivitas untuk peserta didik yang belum mencapai tujuan

3. Bahan Bacaan:
   - Materi lengkap tentang "${topik || "Teks Negosiasi"}"
   - Contoh-contoh teks

4. Glosarium:
   - Istilah-istilah penting dan definisinya

5. Daftar Pustaka:
   - Referensi yang digunakan`;

    } else {
      curriculumSpecific = `
STRUKTUR MODUL AJAR KURIKULUM MERDEKA DEEP LEARNING:

WAJIB ADA 3 KOMPONEN UTAMA DENGAN PENDEKATAN DEEP LEARNING:

=== A. INFORMASI UMUM ===

1. Identitas Modul:
   - Nama penyusun: ${teacherName || "Guru Bahasa Indonesia"}
   - Institusi: ${schoolName || "Sekolah"}
   - Tahun penyusunan: 2025
   - Jenjang: SMA/MA/SMK
   - Kelas: ${kelas || "X"}
   - Fase: ${parseInt(kelas || "10") <= 6 ? (parseInt(kelas || "10") <= 2 ? "A" : parseInt(kelas || "10") <= 4 ? "B" : "C") : (parseInt(kelas || "10") <= 9 ? "D" : (parseInt(kelas || "10") === 10 ? "E" : "F"))}
   - Semester: ${semester || "1 (Ganjil)"}
   - Mata Pelajaran: Bahasa Indonesia
   - Alokasi Waktu: ${alokasi || "2x40 menit"}
   - Model Pembelajaran: Pembelajaran Mendalam (Deep Learning)

2. Kompetensi Awal:
   - Kemampuan prasyarat untuk mempelajari "${topik || "Teks Negosiasi"}" secara mendalam

3. Profil Pelajar Pancasila:
   - WAJIB sebutkan minimal 3 dimensi dan kaitannya dengan pembelajaran mendalam "${topik || "Teks Negosiasi"}"

4. Sarana dan Prasarana:
   - Sarana: Laptop, LCD, internet, alat kolaborasi digital
   - Prasarana: Ruang kelas yang mendukung diskusi kelompok
   - Sumber Belajar: Buku, jurnal, artikel, video, narasumber

5. Target Peserta Didik:
   - Peserta didik reguler
   - Peserta didik dengan kebutuhan khusus
   - Peserta didik berprestasi

6. Model Pembelajaran:
   - Deep Learning (Pembelajaran Mendalam)
   - Metode: ${metode || "Inkuiri, Proyek, Diskusi, Refleksi"}

=== B. KOMPONEN INTI ===

1. Capaian Pembelajaran (CP):
   - CP Bahasa Indonesia Fase ${parseInt(kelas || "10") <= 6 ? (parseInt(kelas || "10") <= 2 ? "A" : parseInt(kelas || "10") <= 4 ? "B" : "C") : (parseInt(kelas || "10") <= 9 ? "D" : (parseInt(kelas || "10") === 10 ? "E" : "F"))}

2. Tujuan Pembelajaran Bermakna:
   - Tujuan yang mengarah pada pemahaman mendalam dan transfer pengetahuan
   - Contoh: "Peserta didik mampu menganalisis, mengevaluasi, dan menciptakan ${topik || "teks negosiasi"} dalam konteks kehidupan nyata"

3. Pemahaman Bermakna:
   - Mengapa "${topik || "Teks Negosiasi"}" penting dalam kehidupan?
   - Bagaimana pengetahuan ini dapat ditransfer ke situasi lain?

4. Pertanyaan Pemantik (Deep Learning):
   - Pertanyaan esensial yang memicu berpikir tingkat tinggi (HOTS)
   - Pertanyaan filosofis dan kontekstual
   - Contoh: "Bagaimana negosiasi yang baik dapat menyelesaikan konflik di masyarakat?"

5. Kegiatan Pembelajaran Deep Learning:
   
   a. Aktivasi Pengetahuan Awal (10-15 menit):
      - Mengaitkan pengalaman peserta didik dengan "${topik || "Teks Negosiasi"}"
      - Pertanyaan reflektif tentang pengalaman bernegosiasi
   
   b. Eksplorasi Mendalam (30-40 menit):
      - Inkuiri: peserta didik mengeksplorasi "${topik || "Teks Negosiasi"}" dari berbagai sumber
      - Investigasi: menganalisis contoh-contoh teks negosiasi dari konteks nyata
      - Diskusi mendalam: membandingkan, mengkritisi, mengevaluasi
   
   c. Elaborasi & Diferensiasi (30-40 menit):
      - DIFERENSIASI KONTEN: materi disajikan dalam berbagai format (teks, video, audio)
      - DIFERENSIASI PROSES: peserta didik memilih cara belajar sesuai gaya belajar
      - DIFERENSIASI PRODUK: peserta didik memilih cara menunjukkan pemahaman (presentasi, tulisan, video, poster)
      - Kelompok berdasarkan kesiapan, minat, atau profil belajar
   
   d. Kreasi & Kolaborasi (30-40 menit):
      - Proyek bermakna: membuat produk nyata terkait "${topik || "Teks Negosiasi"}"
      - Kolaborasi: bekerja sama dalam kelompok untuk memecahkan masalah nyata
      - Presentasi hasil karya
   
   e. Refleksi Metakognitif (10-15 menit):
      - Apa yang sudah saya pelajari?
      - Bagaimana cara saya belajar?
      - Apa yang perlu saya perbaiki?
      - Bagaimana saya menerapkan pengetahuan ini?

6. Asesmen Autentik:
   a. Asesmen Diagnostik:
      - Kuesioner pengetahuan awal
      - Pertanyaan reflektif
   
   b. Asesmen Formatif:
      - Observasi proses diskusi dan inkuiri
      - Jurnal belajar
      - Peer assessment (penilaian antar teman)
   
   c. Asesmen Sumatif:
      - Proyek/produk nyata tentang "${topik || "Teks Negosiasi"}"
      - Presentasi
      - Portofolio: kumpulan karya peserta didik
   
   d. Rubrik Penilaian:
      - Rubrik untuk setiap jenis asesmen
      - Kriteria: kedalaman pemahaman, kreativitas, kolaborasi, komunikasi

=== C. LAMPIRAN ===

1. Lembar Kerja Peserta Didik (LKPD) Deep Learning:
   - Panduan inkuiri
   - Lembar observasi
   - Lembar refleksi

2. Pengayaan dan Remedial:
   - Pengayaan: proyek lanjutan, membaca materi lanjutan, mentoring
   - Remedial: bimbingan individual, tugas terstruktur, pembelajaran ulang

3. Bahan Bacaan:
   - Materi lengkap "${topik || "Teks Negosiasi"}"
   - Artikel, jurnal, kasus nyata

4. Glosarium:
   - Istilah-istilah kunci dan definisi

5. Daftar Pustaka:
   - Referensi lengkap`;
    }

    const prompt = `Buatkan ${curriculum === "K13" ? "RPP" : "Modul Ajar"} lengkap untuk mata pelajaran Bahasa Indonesia dengan detail berikut:

Kurikulum: ${currLabel}
Kelas: ${kelas || "X"}
Semester: ${semester || "1 (Ganjil)"}
KD/Kompetensi Dasar: ${kd || "3.1 Menganalisis struktur dan kebahasaan teks negosiasi"}
Topik/Materi: ${topik || "Teks Negosiasi"}
Alokasi Waktu: ${alokasi || "3 x 40 menit"}
Metode: ${metode || "Diskusi, ceramah, penugasan"}
${schoolName ? `Nama Sekolah: ${schoolName}` : ""}
${teacherName ? `Nama Guru: ${teacherName}` : ""}

PENTING — WAJIB MENGGUNAKAN DATA INPUT USER:
1. JUDUL harus mengandung topik "${topik || "Teks Negosiasi"}" dan kelas "${kelas || "X"}"
2. KOMPETENSI/CAPAIAN PEMBELAJARAN harus merujuk ke KD yang diberikan: "${kd || "3.1 Menganalisis struktur dan kebahasaan teks negosiasi"}"
3. LANGKAH PEMBELAJARAN harus spesifik untuk topik "${topik || "Teks Negosiasi"}" — sebutkan contoh teks, aktivitas, dan materi yang relevan dengan topik ini
4. PENILAIAN harus mengukur kompetensi dari KD yang diberikan
5. MATERI harus tentang "${topik || "Teks Negosiasi"}" — jangan gunakan topik lain
6. Semua konten harus sesuai untuk siswa kelas ${kelas || "X"} — gunakan bahasa dan contoh yang sesuai tingkat kelas ini
7. Jika semester "${semester || "1 (Ganjil)"}", sesuaikan materi dengan semester tersebut

${curriculum === "K13" ? `
Format output JSON (RPP K13):
{
  "title": "RPP Bahasa Indonesia Kelas ${kelas || "X"} - ${topik || "Teks Negosiasi"}",
  "ki1": "KI-1 lengkap",
  "ki2": "KI-2 lengkap",
  "ki3": "KI-3 lengkap",
  "ki4": "KI-4 lengkap",
  "kdPengetahuan": "KD 3.x tentang ${topik || "Teks Negosiasi"}",
  "kdKeterampilan": "KD 4.x tentang ${topik || "Teks Negosiasi"}",
  "ipkPengetahuan": ["IPK 1", "IPK 2", "IPK 3"],
  "ipkKeterampilan": ["IPK 1", "IPK 2", "IPK 3"],
  "tujuanPembelajaran": ["Tujuan 1", "Tujuan 2", "Tujuan 3"],
  "materiPokok": "${topik || "Teks Negosiasi"}",
  "uraianMateri": "Uraian lengkap materi tentang ${topik || "Teks Negosiasi"} untuk kelas ${kelas || "X"}",
  "kegiatanPendahuluan": ["Langkah 1", "Langkah 2", "Langkah 3"],
  "kegiatanIntiMengamati": "Kegiatan mengamati tentang ${topik || "Teks Negosiasi"}",
  "kegiatanIntiMenanya": "Kegiatan menanya tentang ${topik || "Teks Negosiasi"}",
  "kegiatanIntiMengumpulkan": "Kegiatan mengumpulkan informasi tentang ${topik || "Teks Negosiasi"}",
  "kegiatanIntiMengasosiasi": "Kegiatan mengasosiasi tentang ${topik || "Teks Negosiasi"}",
  "kegiatanIntiMengomunikasikan": "Kegiatan mengomunikasikan tentang ${topik || "Teks Negosiasi"}",
  "kegiatanPenutup": ["Langkah 1", "Langkah 2", "Langkah 3"],
  "penilaianSikap": "Teknik, bentuk, instrumen penilaian sikap",
  "penilaianPengetahuan": "Teknik, bentuk, instrumen penilaian pengetahuan",
  "penilaianKeterampilan": "Teknik, bentuk, instrumen penilaian keterampilan",
  "media": "Media pembelajaran",
  "alat": "Alat pembelajaran",
  "sumberBelajar": "Sumber belajar"
}` : curriculum === "MERDEKA" ? `
Format output JSON (Modul Ajar Kurikulum Merdeka):
{
  "title": "Modul Ajar Bahasa Indonesia Kelas ${kelas || "X"} - ${topik || "Teks Negosiasi"}",
  "fase": "Fase ${parseInt(kelas || "10") <= 6 ? (parseInt(kelas || "10") <= 2 ? "A" : parseInt(kelas || "10") <= 4 ? "B" : "C") : (parseInt(kelas || "10") <= 9 ? "D" : (parseInt(kelas || "10") === 10 ? "E" : "F"))}",
  "kompetensiAwal": "Kompetensi awal yang diperlukan",
  "profilPelajarPancasila": ["Dimensi 1 + kaitan", "Dimensi 2 + kaitan"],
  "saranaPrasarana": "Sarana dan prasarana",
  "targetPesertaDidik": "Target peserta didik",
  "modelPembelajaran": "${metode || "Tatap Muka"}",
  "capaianPembelajaran": "CP Bahasa Indonesia Fase yang relevan",
  "tujuanPembelajaran": ["Tujuan 1", "Tujuan 2", "Tujuan 3"],
  "pemahamanBermakna": "Pemahaman bermakna tentang ${topik || "Teks Negosiasi"}",
  "pertanyaanPemantik": ["Pertanyaan 1", "Pertanyaan 2", "Pertanyaan 3"],
  "kegiatanPendahuluan": ["Langkah 1", "Langkah 2", "Langkah 3"],
  "kegiatanInti": ["Langkah 1", "Langkah 2", "Langkah 3", "Langkah 4"],
  "kegiatanPenutup": ["Langkah 1", "Langkah 2", "Langkah 3"],
  "asesmenDiagnostik": "Asesmen diagnostik",
  "asesmenFormatif": "Asesmen formatif",
  "asesmenSumatif": "Asesmen sumatif",
  "lkpd": "Lembar Kerja Peserta Didik",
  "pengayaanRemedial": "Program pengayaan dan remedial",
  "bahanBacaan": "Bahan bacaan tentang ${topik || "Teks Negosiasi"}",
  "glosarium": {"istilah1": "definisi", "istilah2": "definisi"},
  "daftarPustaka": "Daftar pustaka"
}` : `
Format output JSON (Modul Ajar Deep Learning):
{
  "title": "Modul Ajar Deep Learning - Bahasa Indonesia Kelas ${kelas || "X"} - ${topik || "Teks Negosiasi"}",
  "fase": "Fase ${parseInt(kelas || "10") <= 6 ? (parseInt(kelas || "10") <= 2 ? "A" : parseInt(kelas || "10") <= 4 ? "B" : "C") : (parseInt(kelas || "10") <= 9 ? "D" : (parseInt(kelas || "10") === 10 ? "E" : "F"))}",
  "kompetensiAwal": "Kompetensi awal",
  "profilPelajarPancasila": ["Dimensi 1 + kaitan", "Dimensi 2 + kaitan", "Dimensi 3 + kaitan"],
  "saranaPrasarana": "Sarana dan prasarana",
  "targetPesertaDidik": "Target peserta didik",
  "modelPembelajaran": "Deep Learning",
  "capaianPembelajaran": "CP Bahasa Indonesia Fase yang relevan",
  "tujuanPembelajaranBermakna": ["Tujuan bermakna 1", "Tujuan bermakna 2"],
  "pemahamanBermakna": "Pemahaman bermakna dan transfer pengetahuan",
  "pertanyaanPemantik": ["Pertanyaan esensial 1", "Pertanyaan esensial 2", "Pertanyaan esensial 3"],
  "aktivasiPengetahuan": ["Langkah 1", "Langkah 2"],
  "eksplorasiMendalam": ["Langkah 1", "Langkah 2", "Langkah 3"],
  "elaborasiDiferensiasi": {
    "diferensiasiKonten": "Penjelasan diferensiasi konten",
    "diferensiasiProses": "Penjelasan diferensiasi proses",
    "diferensiasiProduk": "Penjelasan diferensiasi produk"
  },
  "kreasiKolaborasi": ["Langkah 1", "Langkah 2", "Langkah 3"],
  "refleksiMetakognitif": ["Pertanyaan refleksi 1", "Pertanyaan refleksi 2", "Pertanyaan refleksi 3"],
  "asesmenDiagnostik": "Asesmen diagnostik",
  "asesmenFormatif": "Asesmen formatif",
  "asesmenSumatif": "Asesmen sumatif autentik",
  "rubrikPenilaian": "Rubrik penilaian proyek/portofolio",
  "lkpd": "LKPD Deep Learning",
  "pengayaanRemedial": "Pengayaan dan remedial",
  "bahanBacaan": "Bahan bacaan lengkap",
  "glosarium": {"istilah1": "definisi", "istilah2": "definisi"},
  "daftarPustaka": "Daftar pustaka"
}`}

Buatkan dalam Bahasa Indonesia yang baik dan benar. PASTIKAN SEMUA KONTEN SPESIFIK UNTUK TOPIK "${topik || "Teks Negosiasi"}" DAN KELAS ${kelas || "X"}. Hanya output JSON, tanpa markdown.`;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    let content = "";
    let tokens = 0;

    if (GEMINI_API_KEY) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-goog-api-key": GEMINI_API_KEY },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 8000 },
          }),
        });
        const json = await res.json();
        content = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (content) tokens = content.length;
      } catch (e) { console.error("Gemini error:", e); }
    }

    if (!content && OPENAI_API_KEY) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 8000,
            temperature: 0.7,
          }),
        });
        const json = await res.json();
        content = json.choices?.[0]?.message?.content || "";
        if (content) tokens = json.usage?.total_tokens || 0;
      } catch (e) { console.error("OpenAI error:", e); }
    }

    if (!content && DEEPSEEK_API_KEY) {
      try {
        const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${DEEPSEEK_API_KEY}` },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 8000,
            temperature: 0.7,
          }),
        });
        const json = await res.json();
        content = json.choices?.[0]?.message?.content || "";
        if (content) tokens = json.usage?.total_tokens || 0;
      } catch (e) { console.error("DeepSeek error:", e); }
    }

    if (!content) {
      return NextResponse.json({ error: "All AI providers failed" }, { status: 500 });
    }

    let rpp = content;
    if (rpp.includes("```json")) {
      rpp = rpp.replace(/```json\n?/g, "").replace(/\n?```/g, "");
    }

    const costUSD = (tokens / 1_000_000) * 0.5;
    await recordAIUsage(user.id, "rpp_generator", tokens, costUSD);

    try {
      return NextResponse.json({ rpp: JSON.parse(rpp) });
    } catch {
      return NextResponse.json({ rpp: { title: topik || "RPP Bahasa Indonesia", description: rpp } });
    }
  } catch (error) {
    console.error("AI RPP error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
