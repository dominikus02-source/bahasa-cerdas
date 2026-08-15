import type { AdaptiveCandidate } from "../../lib/adaptive-practice/types";

/**
 * Test-only fixture. These rows represent APPROVED metadata + active question
 * rows; they are never inserted into production.
 */
export const ADAPTIVE_FIXTURE: AdaptiveCandidate[] = [
  { id: "fixture-read-01", text: "Inferensi bacaan 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "READING", subskill: "READING_INFERENSI", difficulty: "EASY", topic: "Cerpen", seenAt: null },
  { id: "fixture-read-02", text: "Inferensi bacaan 2", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "READING", subskill: "READING_INFERENSI", difficulty: "MEDIUM", topic: "Cerpen", seenAt: null },
  { id: "fixture-read-03", text: "Ide pokok bacaan 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "READING", subskill: "READING_IDE_POKOK", difficulty: "MEDIUM", topic: "Artikel", seenAt: null },
  { id: "fixture-read-04", text: "Informasi tersurat 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "READING", subskill: "READING_INFORMASI_TERSURAT", difficulty: "HARD", topic: "Berita", seenAt: null },
  { id: "fixture-read-05", text: "Makna kata bacaan 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "READING", subskill: "READING_MAKNA_KATA", difficulty: "EASY", topic: "Berita", seenAt: null },
  { id: "fixture-read-06", text: "Struktur teks 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "READING", subskill: "READING_STRUKTUR_TEKS", difficulty: "HARD", topic: "Eksposisi", seenAt: null },
  { id: "fixture-gram-01", text: "Ejaan 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "GRAMMAR", subskill: "GRAMMAR_EJAAN", difficulty: "EASY", topic: "Ejaan", seenAt: null },
  { id: "fixture-gram-02", text: "Ejaan 2", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "GRAMMAR", subskill: "GRAMMAR_EJAAN", difficulty: "MEDIUM", topic: "Ejaan", seenAt: null },
  { id: "fixture-gram-03", text: "Kalimat efektif 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "GRAMMAR", subskill: "GRAMMAR_KALIMAT_EFEKTIF", difficulty: "MEDIUM", topic: "Kalimat Efektif", seenAt: null },
  { id: "fixture-gram-04", text: "Imbuhan 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "GRAMMAR", subskill: "GRAMMAR_IMBUHAN", difficulty: "HARD", topic: "Imbuhan", seenAt: null },
  { id: "fixture-gram-05", text: "Tanda baca 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "GRAMMAR", subskill: "GRAMMAR_TANDA_BACA", difficulty: "EASY", topic: "Ejaan", seenAt: null },
  { id: "fixture-gram-06", text: "Kata baku 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "GRAMMAR", subskill: "GRAMMAR_KATA_BAKU", difficulty: "HARD", topic: "Kata Baku", seenAt: null },
  { id: "fixture-vocab-01", text: "Sinonim 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "VOCABULARY", subskill: "VOCABULARY_SINONIM_ANTONIM", difficulty: "EASY", topic: "Sinonim", seenAt: null },
  { id: "fixture-vocab-02", text: "Antonim 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "VOCABULARY", subskill: "VOCABULARY_SINONIM_ANTONIM", difficulty: "MEDIUM", topic: "Antonim", seenAt: null },
  { id: "fixture-vocab-03", text: "Makna kata 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "VOCABULARY", subskill: "VOCABULARY_MAKNA_KATA", difficulty: "MEDIUM", topic: "Kosakata", seenAt: null },
  { id: "fixture-vocab-04", text: "Kosakata konteks 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "VOCABULARY", subskill: "VOCABULARY_KONTEKS", difficulty: "HARD", topic: "Artikel", seenAt: null },
  { id: "fixture-lit-01", text: "Unsur cerpen 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "LITERATURE", subskill: "LITERATURE_UNSUR_CERITA", difficulty: "EASY", topic: "Cerpen", seenAt: null },
  { id: "fixture-lit-02", text: "Gaya bahasa 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "LITERATURE", subskill: "LITERATURE_GAYA_BAHASA", difficulty: "MEDIUM", topic: "Majas", seenAt: null },
  { id: "fixture-lit-03", text: "Apresiasi pantun 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "LITERATURE", subskill: "LITERATURE_APRESIASI_KARYA", difficulty: "MEDIUM", topic: "Pantun", seenAt: null },
  { id: "fixture-lit-04", text: "Makna sastra 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "LITERATURE", subskill: "LITERATURE_MAKNA_SASTRA", difficulty: "HARD", topic: "Puisi", seenAt: null },
  { id: "fixture-write-01", text: "Ejaan tulisan 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "WRITING", subskill: "WRITING_EJAAN", difficulty: "EASY", topic: "Artikel", seenAt: null },
  { id: "fixture-write-02", text: "Organisasi gagasan 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "WRITING", subskill: "WRITING_ORGANISASI_GAGASAN", difficulty: "MEDIUM", topic: "Artikel", seenAt: null },
  { id: "fixture-write-03", text: "Ketepatan kata 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "WRITING", subskill: "WRITING_KETEPATAN_KATA", difficulty: "HARD", topic: "Cerpen", seenAt: null },
  { id: "fixture-listen-01", text: "Informasi simakan 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "LISTENING", subskill: "LISTENING_INFORMASI_TERSURAT", difficulty: "EASY", topic: "Pengumuman", seenAt: null },
  { id: "fixture-listen-02", text: "Inferensi simakan 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "LISTENING", subskill: "LISTENING_INFERENSI", difficulty: "MEDIUM", topic: "Wawancara", seenAt: null },
  { id: "fixture-listen-03", text: "Gagasan simakan 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "LISTENING", subskill: "LISTENING_GAGASAN_UTAMA", difficulty: "HARD", topic: "Pidato", seenAt: null },
  { id: "fixture-speak-01", text: "Kelancaran berbicara 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "SPEAKING", subskill: "SPEAKING_KELANCARAN", difficulty: "MEDIUM", topic: "Presentasi", seenAt: null },
  { id: "fixture-speak-02", text: "Ketepatan bahasa lisan 1", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "SPEAKING", subskill: "SPEAKING_KETEPATAN_BAHASA", difficulty: "HARD", topic: "Diskusi", seenAt: null },
  { id: "fixture-read-07", text: "Inferensi bacaan 3", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "READING", subskill: "READING_INFERENSI", difficulty: "HARD", topic: "Cerita", seenAt: null },
  { id: "fixture-gram-07", text: "Kalimat efektif 2", options: ["A", "B", "C", "D"], questionType: "PILIHAN_GANDA", skill: "GRAMMAR", subskill: "GRAMMAR_KALIMAT_EFEKTIF", difficulty: "HARD", topic: "Kalimat", seenAt: null },
];
