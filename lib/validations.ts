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
  photos: z.array(z.string().url("URL foto tidak valid")).max(6, "Maksimal 6 foto").optional(),
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

/**
 * Bersihkan teks karangan murid — TANPA meng-escape HTML.
 *
 * Konten karya ditampilkan sebagai teks React biasa (`{karya.content}`), dan
 * React sudah meng-escape sendiri saat merender. Meng-escape lagi saat menyimpan
 * membuat entitasnya ikut tersimpan, lalu tampil apa adanya di layar: murid
 * melihat `&quot;Sayapmu Nak!&quot;` alih-alih tanda kutip. Paling terasa saat
 * menempel dari Word, yang penuh tanda kutip, apostrof, dan garis miring.
 *
 * Escaping ganda juga menumpuk tiap kali karya disimpan ulang (`&` → `&amp;`),
 * jadi karya yang sering diedit makin rusak.
 *
 * Yang tetap dibersihkan: karakter kontrol tak terlihat dan BOM yang sering
 * ikut terbawa dari Word/Google Docs, serta normalisasi Unicode agar huruf
 * beraksen tidak terpecah jadi dua karakter.
 */
export function sanitizeTeks(input: string): string {
  return input
    .normalize("NFC")
    // Hapus BOM + zero-width + karakter kontrol C0/C1, kecuali \n \r \t.
    .replace(/[\uFEFF\u200B-\u200D\u2060]/g, "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, "")
    .trim();
}

/** Decode entitas HTML yang terlanjur tersimpan (pemulihan data lama). */
export function decodeEntitasHtml(input: string): string {
  return input
    .replace(/&#x2F;/gi, "/")
    .replace(/&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&gt;/gi, ">")
    .replace(/&lt;/gi, "<")
    .replace(/&amp;/gi, "&"); // terakhir, supaya &amp;quot; tidak jadi " prematur
}

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
