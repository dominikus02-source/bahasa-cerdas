import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { cache } from "react";
import { getForwardedIp } from "@/lib/security";
import { isValidSupabaseUrl } from "@/lib/supabase/url-guard";

// IP Address Forwarding (Authentication → Rate Limits): biar rate limit
// Supabase dihitung per IP murid, bukan per IP egress Vercel yang dibagi
// semua pengguna. Syarat dari dokumentasi Supabase:
//   1. Toggle IP Address Forwarding AKTIF di dashboard.
//   2. Header `Sb-Forwarded-For` berisi IP klien asli.
//   3. Panggilan memakai SECRET API key (sb_secret_...) — anon/service_role
//      legacy tidak didukung.
// Jika SUPABASE_SECRET_KEY belum diset, jatuh ke anon (perilaku lama, header
// diabaikan Supabase) supaya tidak ada yang rusak di environment lain.
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const h = await headers();
  const ip = getForwardedIp(h);
  return ip ? { "sb-forwarded-for": ip } : {};
}

export async function createClient() {
  // Same masking guard as lib/supabase/proxy.ts and lib/supabase/client.ts:
  // with a literal `[SENSITIVE]` placeholder URL, createServerClient throws
  // synchronously and every API route becomes a 500. Degrade to a local
  // endpoint instead; auth calls then fail with a null session, which the
  // existing anonymous paths already tolerate (getUser()/requireAuth()).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const usable = isValidSupabaseUrl(url) ? url! : "http://localhost:3000";
  const usableKey = SUPABASE_SECRET_KEY || "local-dev-anon-key";

  const cookieStore = await cookies();

  return createServerClient(
    usable,
    usableKey,
    {
      global: { headers: await buildAuthHeaders() },
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

  // IMPORTANT: getClaims() is the server-side identity check. Do not fall
  // back to getUser() here: getUser() always performs a network request and
  // can become a second refresh owner when many Server Components/API routes
  // resolve the same request at once.
  let supabaseId: string | null = null;

  try {
    const { data, error } = await supabase.auth.getClaims();
    if (error) {
      console.warn("AUTH_CLAIMS_VERIFY_FAILED", { error: error.message });
      return null;
    }
    supabaseId = data?.claims?.sub ?? null;
  } catch (error: any) {
    console.warn("AUTH_CLAIMS_VERIFY_EXCEPTION", {
      error: error?.message || String(error),
    });
    return null;
  }

  if (!supabaseId) return null;

  try {
    return await db.user.findUnique({
      where: { supabaseId },
    });
  } catch (error: any) {
    console.error("AUTH_DB_USER_LOOKUP_FAILED", {
      error: error?.message || String(error),
    });
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
