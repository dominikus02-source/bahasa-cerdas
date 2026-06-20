import { z } from "zod";

export const ReviewInputSchema = z.object({
  type: z.enum(["karya", "materi", "soal", "rpp"]).default("karya"),
  content: z.string().min(1, "Konten yang akan direview wajib diisi"),
  title: z.string().optional(),
  authorName: z.string().optional(),
  grade: z.string().optional(),
  rubric: z.string().optional(),
});

export const ReviewOutputSchema = z.object({
  skor: z.number().min(0).max(100).optional(),
  grade: z.string().optional(),
  kekuatan: z.array(z.string()),
  kelemahan: z.array(z.string()),
  saranPerbaikan: z.array(z.string()),
  feedback: z.string(),
  catatanTambahan: z.string().optional(),
});
