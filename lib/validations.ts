import { z } from "zod";

export const emailSchema = z.string().email("Email tidak valid").max(255);

export const passwordSchema = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .max(128, "Password maksimal 128 karakter");

export const fullNameSchema = z
  .string()
  .min(1, "Nama harus diisi")
  .max(100, "Nama maksimal 100 karakter")
  .trim();

export const roleSchema = z.enum(["GURU", "MURID"]);

export const registerSchema = z.object({
  email: emailSchema,
  supabaseId: z.string().uuid(),
  fullName: fullNameSchema,
  role: roleSchema,
  school: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  province: z.string().max(100).nullable().optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password harus diisi"),
});

export const karyaSchema = z.object({
  judul: z.string().min(1, "Judul harus diisi").max(255).trim(),
  jenis: z.enum(["PUISI", "CERPEN", "ARTIKEL", "ANEKDOT", "PANTUN", "OPINI"]),
  konten: z.string().min(1, "Konten harus diisi").trim(),
  coverImage: z.string().url("URL cover tidak valid").nullable().optional(),
});

export const commentSchema = z.object({
  konten: z.string().min(1, "Komentar harus diisi").max(1000).trim(),
});

export const profileUpdateSchema = z.object({
  fullName: fullNameSchema.optional(),
  bio: z.string().max(500).trim().nullable().optional(),
  school: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  province: z.string().max(100).nullable().optional(),
  avatarUrl: z.string().url("URL avatar tidak valid").nullable().optional(),
});

export const soalSchema = z.object({
  pertanyaan: z.string().min(1, "Pertanyaan harus diisi").trim(),
  jawaban: z.array(z.string().min(1)).min(2, "Minimal 2 opsi jawaban"),
  jawabanBenar: z.number().int().min(0),
  pembahasan: z.string().optional(),
  kesulitan: z.enum(["MUDAH", "SEDANG", "SULIT"]).optional(),
});

export const chatSchema = z.object({
  pesan: z.string().min(1).max(5000).trim(),
});

export const komunitasPostSchema = z.object({
  judul: z.string().min(1).max(255).trim(),
  konten: z.string().min(1).max(10000).trim(),
});

export function sanitize(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

export function sanitizeHtml(input: string): string {
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type KaryaInput = z.infer<typeof karyaSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type SoalInput = z.infer<typeof soalSchema>;
