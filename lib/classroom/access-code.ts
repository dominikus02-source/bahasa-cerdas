/**
 * Helper kode akses kelas (BC Classroom).
 *
 * generateAccessCode: murni — 8 karakter dari charset tanpa karakter
 * ambigu (0/O, 1/I/L). getUniqueAccessCode: cek unik di DB dengan loop
 * retry (anti-kolisi, bukan cek sekali seperti sebelumnya).
 */
import { db } from "@/lib/db";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateAccessCode(): string {
  let code = "";
  for (let i = 0; i < 8; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

export async function getUniqueAccessCode(maxAttempts = 5): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generateAccessCode();
    const existing = await db.group.findUnique({ where: { accessCode: code } });
    if (!existing) return code;
  }
  throw new Error("Gagal menghasilkan kode akses unik");
}
