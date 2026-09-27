import type { LearningSkillType } from "@prisma/client";
import { hasSkill, type DifficultyId, type QuestionTypeId, SUBSKILLS } from "@/lib/question-metadata/taxonomy";

export const BASELINE_SOURCE = "DIAGNOSTIC_BASELINE_V2" as const;
export const BASELINE_VERSION = "2.0" as const;
export const BASELINE_SIZE = 10 as const;
export const BASELINE_MINUTES = 15 as const;

export const BASELINE_SKILLS = [
  "READING",
  "GRAMMAR",
  "VOCABULARY",
  "LITERATURE",
  "WRITING",
] as const;

export type BaselineSkill = (typeof BASELINE_SKILLS)[number];

export const BASELINE_SKILL_LABELS: Record<string, string> = {
  READING: "Membaca",
  GRAMMAR: "Tata Bahasa",
  VOCABULARY: "Kosakata",
  LITERATURE: "Sastra",
  WRITING: "Menulis",
};

// Sepuluh butir objektif terkontrol: Reading 3, Grammar 2, Vocabulary 3, Literature 2.
// Menulis diukur lewat tugas menulis langsung.
export const BASELINE_BLUEPRINT = [
  { skill: "READING", count: 2 },
  { skill: "GRAMMAR", count: 3 },
  { skill: "VOCABULARY", count: 3 },
  { skill: "LITERATURE", count: 2 },
] as const;

export interface BaselineQuestionDefinition {
  id: string;
  text: string;
  options: string[];
  questionType: "PILIHAN_GANDA" | "BENAR_SALAH";
  skill: Exclude<BaselineSkill, "WRITING">;
  difficulty: DifficultyId;
  correctAnswer: string;
}

/**
 * Baseline uses a dedicated, versioned assessment set instead of the legacy
 * master bank. The live master bank still contains quarantined/template items,
 * so the baseline must not depend on its current availability.
 */
export const BASELINE_QUESTION_BANK: readonly BaselineQuestionDefinition[] = [
  {
    id: "BASELINE-V2-READING-01",
    text: "Bacalah kalimat berikut: “Rani membawa botol minum sendiri ke sekolah agar tidak perlu membeli air kemasan setiap hari.” Apa alasan Rani membawa botol minum sendiri?",
    options: ["Agar dapat membeli lebih banyak air", "Agar tidak perlu membeli air kemasan setiap hari", "Agar botolnya dipuji teman", "Agar datang terlambat ke sekolah"],
    questionType: "PILIHAN_GANDA",
    skill: "READING",
    difficulty: "EASY",
    correctAnswer: "1",
  },
  {
    id: "BASELINE-V2-READING-02",
    text: "Bacalah kalimat berikut: “Meskipun hujan turun sejak pagi, para siswa tetap datang untuk mengikuti kegiatan membaca di perpustakaan.” Simpulan yang paling tepat adalah ...",
    options: ["Para siswa membatalkan kegiatan membaca.", "Perpustakaan ditutup karena hujan.", "Hujan tidak menghalangi para siswa mengikuti kegiatan membaca.", "Para siswa hanya datang ketika cuaca cerah."],
    questionType: "PILIHAN_GANDA",
    skill: "READING",
    difficulty: "MEDIUM",
    correctAnswer: "2",
  },
  {
    id: "BASELINE-V2-READING-03",
    text: "Bacalah kalimat berikut: “Dina menyiapkan jadwal belajar sebelum ujian. Ia membagi waktu untuk membaca materi, mengerjakan latihan, dan beristirahat.” Gagasan utama kalimat tersebut adalah ...",
    options: ["Dina tidak suka belajar.", "Dina menyusun jadwal belajar untuk menghadapi ujian.", "Dina hanya mengerjakan latihan.", "Dina belajar tanpa waktu istirahat."],
    questionType: "PILIHAN_GANDA",
    skill: "READING",
    difficulty: "HARD",
    correctAnswer: "1",
  },
  {
    id: "BASELINE-V2-GRAMMAR-01",
    text: "Kalimat yang paling efektif adalah ...",
    options: ["Para siswa-siswa sedang belajar di kelas.", "Para siswa sedang belajar di kelas.", "Para siswa sedang belajar-belajar di kelas.", "Para siswa adalah sedang belajar di kelas."],
    questionType: "PILIHAN_GANDA",
    skill: "GRAMMAR",
    difficulty: "EASY",
    correctAnswer: "1",
  },
  {
    id: "BASELINE-V2-GRAMMAR-02",
    text: "Manakah penulisan kata baku yang tepat?",
    options: ["resiko", "ijin", "praktik", "aktifitas"],
    questionType: "PILIHAN_GANDA",
    skill: "GRAMMAR",
    difficulty: "MEDIUM",
    correctAnswer: "2",
  },
  {
    id: "BASELINE-V2-VOCABULARY-01",
    text: "Sinonim kata “cermat” yang paling tepat adalah ...",
    options: ["teliti", "ceroboh", "lambat", "ragu"],
    questionType: "PILIHAN_GANDA",
    skill: "VOCABULARY",
    difficulty: "EASY",
    correctAnswer: "0",
  },
  {
    id: "BASELINE-V2-VOCABULARY-02",
    text: "Antonim kata “optimistis” adalah ...",
    options: ["yakin", "percaya diri", "pesimistis", "semangat"],
    questionType: "PILIHAN_GANDA",
    skill: "VOCABULARY",
    difficulty: "MEDIUM",
    correctAnswer: "2",
  },
  {
    id: "BASELINE-V2-VOCABULARY-03",
    text: "Dalam kalimat “Ia tetap rendah hati meskipun memenangkan lomba”, makna “rendah hati” adalah ...",
    options: ["suka merendahkan orang lain", "tidak sombong", "mudah menyerah", "selalu merasa takut"],
    questionType: "PILIHAN_GANDA",
    skill: "VOCABULARY",
    difficulty: "HARD",
    correctAnswer: "1",
  },
  {
    id: "BASELINE-V2-LITERATURE-01",
    text: "Dalam sebuah cerita, tokoh yang menjadi pusat rangkaian peristiwa disebut ...",
    options: ["tokoh utama", "latar", "alur", "amanat"],
    questionType: "PILIHAN_GANDA",
    skill: "LITERATURE",
    difficulty: "EASY",
    correctAnswer: "0",
  },
  {
    id: "BASELINE-V2-LITERATURE-02",
    text: "Pesan atau nilai yang ingin disampaikan pengarang melalui sebuah cerita disebut ...",
    options: ["tema", "amanat", "latar", "konflik"],
    questionType: "PILIHAN_GANDA",
    skill: "LITERATURE",
    difficulty: "MEDIUM",
    correctAnswer: "1",
  },
];

export const BASELINE_DIFFICULTIES: DifficultyId[] = ["EASY", "MEDIUM", "HARD"];

export interface BaselineWritingTask {
  id: string;
  title: string;
  prompt: string;
  minWords: number;
  maxWords: number;
  rubric: string[];
}

export const BASELINE_WRITING_TASK: BaselineWritingTask = {
  id: "baseline-writing-01",
  title: "Tantangan Menulis",
  prompt:
    "Ceritakan sebuah kejadian sederhana yang membuatmu belajar sesuatu. Jelaskan apa yang terjadi, apa yang kamu pikirkan atau rasakan, dan apa yang kamu pelajari dari kejadian itu.",
  minWords: 80,
  maxWords: 180,
  rubric: [
    "gagasan dan relevansi terhadap tugas",
    "keruntutan dan hubungan antargagasan",
    "kejelasan kalimat dan struktur paragraf",
    "pilihan kata dan variasi ungkapan",
    "ejaan dan tanda baca",
  ],
};

export function baselineWordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

export function baselineQuestionTypes(): QuestionTypeId[] {
  return ["PILIHAN_GANDA", "BENAR_SALAH", "ISIAN_SINGKAT"];
}

export function normalizeBaselineSkill(value: string | null | undefined): BaselineSkill | null {
  if (!value || !hasSkill(value)) return null;
  return BASELINE_SKILLS.includes(value as BaselineSkill) ? (value as BaselineSkill) : null;
}

export function subskillCountFor(skill: string): number {
  return Object.keys(SUBSKILLS[skill as keyof typeof SUBSKILLS] ?? {}).length;
}

function lexicalDiversity(words: string[]): number {
  if (words.length === 0) return 0;
  return new Set(words.map((word) => word.toLocaleLowerCase("id-ID"))).size / words.length;
}

export interface WritingSignal {
  score: number;
  level: "AWAL" | "BERKEMBANG" | "KUAT";
  wordCount: number;
  dimensions: {
    relevance: number;
    coherence: number;
    sentenceControl: number;
    vocabulary: number;
    mechanics: number;
  };
}

export function scoreBaselineWriting(text: string): WritingSignal {
  const normalized = text.trim().replace(/\s+/g, " ");
  const wordCount = baselineWordCount(normalized);
  const sentences = normalized
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const words = normalized.split(/\s+/).filter(Boolean);
  const paragraphs = text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);

  const lengthScore =
    wordCount < BASELINE_WRITING_TASK.minWords
      ? Math.min(0.55, wordCount / BASELINE_WRITING_TASK.minWords * 0.55)
      : wordCount <= BASELINE_WRITING_TASK.maxWords
        ? 0.85
        : 0.75;

  const avgSentenceLength = sentences.length > 0 ? wordCount / sentences.length : 0;
  const sentenceControl =
    sentences.length >= 3 && avgSentenceLength >= 6 && avgSentenceLength <= 35 ? 1 :
    sentences.length >= 2 ? 0.72 :
    sentences.length === 1 ? 0.45 : 0.15;

  const connectors = (normalized.match(/\b(namun|tetapi|karena|sehingga|lalu|kemudian|setelah|sebelum|akhirnya|selain|meskipun|sementara)\b/gi) ?? []).length;
  const coherence = Math.min(1, 0.45 + connectors * 0.08 + Math.min(paragraphs.length, 3) * 0.08);

  const diversity = lexicalDiversity(words);
  const vocabulary = Math.min(1, Math.max(0.25, diversity * 1.35));

  const punctuationErrors = (normalized.match(/\s+[,.!?]/g) ?? []).length;
  const lowercaseAfterStop = (normalized.match(/[.!?]\s+[a-zà-ÿ]/g) ?? []).length;
  const mechanics = Math.max(0.25, 1 - Math.min(0.6, punctuationErrors * 0.12 + lowercaseAfterStop * 0.08));

  const relevance = lengthScore;
  const score = Math.round(
    (relevance * 0.25 + coherence * 0.2 + sentenceControl * 0.2 + vocabulary * 0.15 + mechanics * 0.2) * 100
  ) / 100;

  return {
    score,
    level: score >= 0.8 ? "KUAT" : score >= 0.6 ? "BERKEMBANG" : "AWAL",
    wordCount,
    dimensions: {
      relevance: Math.round(relevance * 100) / 100,
      coherence: Math.round(coherence * 100) / 100,
      sentenceControl: Math.round(sentenceControl * 100) / 100,
      vocabulary: Math.round(vocabulary * 100) / 100,
      mechanics: Math.round(mechanics * 100) / 100,
    },
  };
}
