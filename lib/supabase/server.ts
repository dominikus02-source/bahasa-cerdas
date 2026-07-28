import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { cache } from "react";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );
}

/**
 * Identitas murid/guru yang sedang masuk, beserta barisnya di database.
 *
 * Verifikasinya memakai `getClaims()`, BUKAN `getUser()`. Keduanya sama-sama
 * aman — `getClaims()` memeriksa tanda tangan JWT secara kriptografis — tetapi
 * `getUser()` selalu mengirim permintaan jaringan ke server Auth Supabase,
 * sedangkan `getClaims()` memverifikasi secara lokal (WebCrypto + JWKS yang
 * di-cache) selama proyeknya memakai kunci JWT asimetris.
 *
 * Ini penting karena fungsi ini dipanggil dari ~199 berkas, praktis sekali per
 * permintaan API. Pada 28 Jul 2026 pola itu menghasilkan 43.461 permintaan auth
 * dalam 60 menit; 26.572 di antaranya ditolak, dan murid tidak bisa masuk sama
 * sekali karena Supabase Auth membalas 429 pada endpoint sign-in.
 *
 * CATATAN: kalau proyek masih memakai secret simetris (bawaan lama),
 * `getClaims()` tetap memanggil server persis seperti `getUser()` — jadi tidak
 * lebih buruk, tapi juga belum ada penghematan. Penghematannya baru muncul
 * setelah proyek dipindah ke kunci asimetris di Dashboard Supabase
 * (Authentication -> JWT Keys).
 *
 * Wewenang sebenarnya tetap datang dari baris User di database (peran, status),
 * yang selalu dibaca segar di bawah — JWT hanya menetapkan "siapa".
 */
export const getUser = cache(async () => {
  const supabase = await createClient();

  let supabaseId: string | null = null;

  try {
    const { data } = await supabase.auth.getClaims();
    if (data?.claims?.sub) supabaseId = data.claims.sub;
  } catch {
    // Jatuh ke cara lama di bawah.
  }

  // Cadangan: kalau verifikasi klaim gagal (mis. JWKS belum sempat diambil),
  // pakai jalur lama supaya sesi yang sah tidak ikut tertolak.
  if (!supabaseId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) supabaseId = user.id;
  }

  if (!supabaseId) return null;

  try {
    const dbUser = await db.user.findUnique({
      where: { supabaseId },
    });
    return dbUser;
  } catch {
    return null;
  }
});

export async function requireAuth() {
  const user = await getUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireRole(...roles: Role[]) {
  const user = await requireAuth();
  if (!roles.includes(user.role)) {
    throw new Error("Forbidden");
  }
  return user;
}

export async function requireFounder() {
  const user = await requireAuth();
  if (!user.isFounder && user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
  return user;
}

export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}
