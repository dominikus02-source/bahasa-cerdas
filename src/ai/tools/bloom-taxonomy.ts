/**
 * Bloom's Taxonomy Tool
 *
 * Provides verb lists and level descriptions for each cognitive level (C1-C6)
 * to help agents generate appropriately leveled questions and activities.
 */

export type BloomLevel = "C1" | "C2" | "C3" | "C4" | "C5" | "C6";

export interface BloomLevelInfo {
  level: BloomLevel;
  name: string;
  description: string;
  verbs: string[];
  questionStems: string[];
  suitableFor: string[];
}

const BLOOM_LEVELS: Record<BloomLevel, BloomLevelInfo> = {
  C1: {
    level: "C1",
    name: "Mengingat (Remember)",
    description: "Mengenali dan mengingat informasi faktual tanpa pemahaman mendalam",
    verbs: ["sebutkan", "definisikan", "identifikasi", "daftarkan", "kenali", "tuliskan", "jelaskan secara singkat"],
    questionStems: ["Apa yang dimaksud dengan...?", "Sebutkan ciri-ciri...", "Definisikan...", "Siapa tokoh yang...?"],
    suitableFor: ["Kuis harian", "Pre-test", "Review materi sebelumnya"],
  },
  C2: {
    level: "C2",
    name: "Memahami (Understand)",
    description: "Menjelaskan ide atau konsep dengan kata-kata sendiri",
    verbs: ["jelaskan", "bedakan", "artikan", "uraikan", "simpulkan", "parafrase", "prediksikan"],
    questionStems: ["Jelaskan perbedaan antara...", "Apa inti dari...?", "Bagaimana proses...?", "Mengapa...?"],
    suitableFor: ["Diskusi kelas", "LKPD", "Tugas individu"],
  },
  C3: {
    level: "C3",
    name: "Menerapkan (Apply)",
    description: "Menggunakan informasi dalam situasi baru",
    verbs: ["terapkan", "demonstrasikan", "laksanakan", "gunakan", "selesaikan", "tunjukkan", "praktikkan"],
    questionStems: ["Bagaimana cara menerapkan...?", "Selesaikan masalah...", "Buat contoh...", "Demonstrasikan..."],
    suitableFor: ["Praktik", "Proyek", "Latihan soal aplikasi"],
  },
  C4: {
    level: "C4",
    name: "Menganalisis (Analyze)",
    description: "Memecah informasi menjadi bagian-bagian dan menjelaskan hubungan antar bagian",
    verbs: ["analisislah", "bandingkan", "kontraskan", "kategorikan", "bedakan", "uji", "kritisi"],
    questionStems: ["Bandingkan dan kontraskan...", "Apa hubungan antara...?", "Bagaimana struktur...?", "Apa bukti bahwa...?"],
    suitableFor: ["Tugas analisis teks", "Studi kasus", "Diskusi kelompok"],
  },
  C5: {
    level: "C5",
    name: "Mengevaluasi (Evaluate)",
    description: "Membuat penilaian berdasarkan kriteria dan standar",
    verbs: ["evaluasilah", "nilailah", "justifikasikan", "pertahankan", "kritisi", "rekomendasikan"],
    questionStems: ["Setujukah kamu dengan...? Mengapa?", "Apa kelebihan dan kekurangan...?", "Seberapa efektif...?", "Berikan penilaianmu..."],
    suitableFor: ["Essay argumentatif", "Review sejawat", "Rubrik penilaian"],
  },
  C6: {
    level: "C6",
    name: "Mencipta (Create)",
    description: "Menggabungkan elemen-elemen untuk membentuk sesuatu yang baru",
    verbs: ["ciptakan", "kembangkan", "rancanglah", "susunlah", "produksilah", "formulasikan", "buatlah"],
    questionStems: ["Buatlah sebuah...", "Rancang sebuah proyek...", "Kembangkan ide...", "Susun rencana..."],
    suitableFor: ["Proyek akhir", "Portofolio", "Karya kreatif"],
  },
};

export function getBloomLevel(level: BloomLevel): BloomLevelInfo {
  return BLOOM_LEVELS[level];
}

export function getVerbsForLevel(level: BloomLevel): string[] {
  return BLOOM_LEVELS[level].verbs;
}

export function suggestBloomLevelForGrade(grade: string): BloomLevel {
  const g = parseInt(grade);
  if (isNaN(g)) return "C2";
  if (g <= 6) return "C2"; // SD
  if (g <= 9) return "C3"; // SMP
  if (g <= 10) return "C3"; // SMA awal
  return "C4"; // SMA akhir
}
