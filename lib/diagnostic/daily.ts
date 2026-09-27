import type { LearningSkillType } from "@prisma/client";

export const DAILY_DIAGNOSTIC_SOURCE = "DIAGNOSTIC_DAILY" as const;
export const DAILY_DIAGNOSTIC_WRITING_SOURCE = "DIAGNOSTIC_DAILY_WRITING" as const;
export const DAILY_DIAGNOSTIC_VERSION = "2.0" as const;
export const DAILY_DIAGNOSTIC_SIZE = 4 as const;
export const DAILY_DIAGNOSTIC_MINUTES = 7 as const;

export interface DailyWritingTask {
  id: string;
  skill: "WRITING";
  title: string;
  prompt: string;
  minWords: number;
  maxWords: number;
  rubric: string[];
}

const TASKS: DailyWritingTask[] = [
  {
    id: "writing-observation-01",
    skill: "WRITING",
    title: "Tantangan Ekspresi",
    prompt: "Ceritakan satu hal sederhana yang kamu lihat atau alami hari ini. Jelaskan apa yang terjadi dan mengapa hal itu menarik menurutmu.",
    minWords: 35,
    maxWords: 120,
    rubric: ["gagasan relevan", "urutan ide jelas", "kalimat dapat dipahami", "pilihan kata sesuai konteks"],
  },
  {
    id: "writing-opinion-01",
    skill: "WRITING",
    title: "Tantangan Pendapat",
    prompt: "Menurutmu, apa yang membuat sebuah kelas terasa menyenangkan untuk belajar? Sampaikan pendapatmu dan berikan satu alasan.",
    minWords: 35,
    maxWords: 120,
    rubric: ["pendapat jelas", "alasan relevan", "struktur gagasan", "ketepatan bahasa"],
  },
  {
    id: "writing-story-01",
    skill: "WRITING",
    title: "Tantangan Cerita",
    prompt: "Bayangkan kamu menemukan sebuah buku lama di tempat yang tidak biasa. Tulis cerita pendek tentang apa yang terjadi setelah kamu membukanya.",
    minWords: 40,
    maxWords: 140,
    rubric: ["alur sederhana", "detail pendukung", "keterhubungan kalimat", "ketepatan bahasa"],
  },
  {
    id: "writing-summary-01",
    skill: "WRITING",
    title: "Tantangan Ringkas",
    prompt: "Jelaskan dalam beberapa kalimat mengapa membaca dapat membantu seseorang memahami dunia di sekitarnya.",
    minWords: 35,
    maxWords: 120,
    rubric: ["gagasan utama", "kelengkapan", "keruntutan", "bahasa efektif"],
  },
];

export function dailyWritingTask(dayKey: string): DailyWritingTask {
  let hash = 0;
  for (const c of dayKey) hash = ((hash << 5) - hash + c.charCodeAt(0)) | 0;
  return TASKS[Math.abs(hash) % TASKS.length];
}

export function writingWordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
}

export function writingSkill(): LearningSkillType {
  return "WRITING";
}
