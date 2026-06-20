import { z } from "zod";

export const SoalInputSchema = z.object({
  subject: z.string().min(1, "Mata pelajaran wajib diisi"),
  grade: z.string().min(1, "Kelas wajib diisi"),
  topic: z.string().min(1, "Topik wajib diisi"),
  subtopic: z.string().optional(),
  curriculum: z.enum(["Kurikulum Merdeka", "K13", "Custom"]).default("Kurikulum Merdeka"),
  questionCount: z.number().min(1).max(30).default(5),
  questionTypes: z.array(
    z.enum([
      "pilihan_ganda",
      "pilihan_ganda_kompleks",
      "benar_salah",
      "menjodohkan",
      "isian_singkat",
      "uraian",
      "cloze",
      "akm_literasi",
      "pisa_style",
    ])
  ).min(1),
  difficulty: z.enum(["mudah", "sedang", "sulit", "campuran"]).default("campuran"),
  bloomLevel: z.enum(["C1", "C2", "C3", "C4", "C5", "C6", "campuran"]).default("campuran"),
  includeAnswerKey: z.boolean().default(true),
  includeExplanation: z.boolean().default(true),
  includeRubric: z.boolean().default(false),
  stimulusText: z.string().optional(),
  languageStyle: z.enum(["anak", "remaja", "formal", "praktis"]).default("remaja"),
});

export const SoalRubricSchema = z.object({
  maxScore: z.number(),
  criteria: z.array(z.string()),
});

export const SoalItemSchema = z.object({
  number: z.number(),
  type: z.string(),
  question: z.string(),
  options: z.array(z.string()).optional(),
  pairs: z.array(z.object({ left: z.string(), right: z.string() })).optional(),
  answer: z.union([z.string(), z.array(z.string())]),
  explanation: z.string().optional(),
  difficulty: z.enum(["mudah", "sedang", "sulit"]),
  bloomLevel: z.enum(["C1", "C2", "C3", "C4", "C5", "C6"]),
  learningObjective: z.string(),
  rubric: SoalRubricSchema.optional(),
});

export const SoalMetadataSchema = z.object({
  subject: z.string(),
  grade: z.string(),
  topic: z.string(),
  difficulty: z.string(),
  questionCount: z.number(),
});

export const SoalStimulusSchema = z.object({
  title: z.string(),
  text: z.string(),
  sourceNote: z.string().optional(),
});

export const SoalOutputSchema = z.object({
  title: z.string(),
  metadata: SoalMetadataSchema,
  stimulus: SoalStimulusSchema.optional(),
  questions: z.array(SoalItemSchema),
  answerKeyText: z.string(),
  teacherNotes: z.array(z.string()),
  editableText: z.string().min(1),
});
