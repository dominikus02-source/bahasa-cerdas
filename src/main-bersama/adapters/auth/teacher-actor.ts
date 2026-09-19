// ─── Auth Adapter (Supabase + Prisma User Existing) ─────────
// Main Bersama TIDAK membuat auth baru. Identity guru SELALU
// berasal dari server context (cookie Supabase), TIDAK PERNAH
// dari body request. Adapter ini boundary satu-satunya antara
// Supabase dan application Main Bersama.
//
// Actor type DIINJEKSI ke use-case (VerifiedTeacherActor) sehingga
// unit test memakai fake tanpa menyentuh Supabase produksi.

import { db } from '@/lib/db';
import { getUser } from '@/lib/supabase/server';
import type { VerifiedTeacherActor } from '../../application/use-cases/create-main-session';

/**
 * Ambil user Prisma hasil autentikasi Supabase dari server context.
 * Null bila belum login / record User tidak ada.
 * `getUser()` konvensi repo: getClaims → getUser fallback → db.user
 * lookup by supabaseId (lihat lib/supabase/server.ts).
 */
export async function getAuthenticatedUser() {
  return getUser();
}

/**
 * Resolver actor guru untuk use-case Main Bersama.
 * Return null bila belum login, role bukan GURU/ADMIN, atau
 * record User tidak ditemukan — boundary authorization (Tahap 5 §13).
 * `teacherId` pada use-case DIISI dari actor ini (bukan dari request).
 */
export async function resolveVerifiedTeacherActor(): Promise<VerifiedTeacherActor | null> {
  const user = await getUser();
  if (!user) return null;
  if (user.role !== 'GURU' && user.role !== 'ADMIN') return null;
  return { userId: user.id, role: user.role };
}
