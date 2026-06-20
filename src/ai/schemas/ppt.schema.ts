import { z } from "zod";

export const PPTInputSchema = z.object({
  subject: z.string().min(1, "Mata pelajaran wajib diisi"),
  grade: z.string().min(1, "Kelas wajib diisi"),
  topic: z.string().min(1, "Topik wajib diisi"),
  duration: z.string().default("2 JP x 45 menit"),
  slideCount: z.number().min(5).max(30).default(10),
  learningObjective: z.string().min(1, "Tujuan pembelajaran wajib diisi"),
  teachingStyle: z.enum([
    "ceramah_interaktif", "diskusi", "project_based", "game_based", "storytelling",
  ]).default("ceramah_interaktif"),
  visualStyle: z.enum([
    "clean_modern", "kids_friendly", "formal_school", "premium_education",
  ]).default("clean_modern"),
  includeQuiz: z.boolean().default(false),
  includeActivity: z.boolean().default(true),
  languageStyle: z.enum(["ringkas", "formal", "anak", "praktis"]).default("praktis"),
});

export const PPTQuizSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).optional(),
  answer: z.string(),
});

export const PPTSlideSchema = z.object({
  slideNumber: z.number(),
  title: z.string(),
  subtitle: z.string().optional(),
  bullets: z.array(z.string()),
  speakerNotes: z.string().min(1),
  visualSuggestion: z.string().min(1),
  activityPrompt: z.string().optional(),
  quiz: PPTQuizSchema.optional(),
});

export const PPTMetadataSchema = z.object({
  subject: z.string(),
  grade: z.string(),
  topic: z.string(),
  slideCount: z.number(),
  visualStyle: z.string(),
});

export const PPTOutputSchema = z.object({
  title: z.string(),
  metadata: PPTMetadataSchema,
  slides: z.array(PPTSlideSchema),
  openingScript: z.string(),
  closingReflection: z.string(),
  teacherNotes: z.array(z.string()),
  editableText: z.string().min(1),
});
