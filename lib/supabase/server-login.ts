import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isValidSupabaseUrl } from "@/lib/supabase/url-guard";

/**
 * Supabase client khusus untuk LOGIN.
 *
 * TIDAK mengirim header `sb-forwarded-for`, sehingga Supabase Auth
 * melihat IP egress Vercel (bukan IP NAT sekolah).
 *
 * CATATAN PENTING — Vercel Egress IP:
 * Vercel serverless functions dalam satu region berbagi SATU egress IP
 * (bukan banyak IP). Artinya, menghapus sb-forwarded-for tidak sepenuhnya
 * mengatasi rate limit — Supabase tetap melihat satu IP (Vercel, bukan sekolah).
 *
 * Yang BERUBAH dengan fix ini:
 * - SEBELUM: IP yang dilihat = IP NAT sekolah (shared by ratusan murid)
 * - SESUDAH: IP yang dilihat = IP Vercel egress (shared by semua user BC)
 *
 * Ini tetap membantu karena:
 * 1. Per-email rate limit (10/10min) melindungi akun individual
 * 2. Per-IP FAILED rate limit (30/10min) melindungi dari credential stuffing
 * 3. Server-side flow memungkinkan retry/backoff yang lebih baik
 * 4. Cookie handling lebih reliable (server-side, bukan client-side)
 *
 * Limitasi yang TIDAK bisa diatasi tanpa bantuan Supabase:
 * - ~30 login sukses per IP per 5 menit tetap menjadi batas
 * - Untuk sekolah dengan >30 murid login serentak, beberapa mungkin tetap 429
 * - Solusi jangka panjang: hubungi Supabase support untuk custom rate limit
 */
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function createLoginClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const usable = isValidSupabaseUrl(url) ? url! : "http://localhost:3000";
  const usableKey = SUPABASE_SECRET_KEY || "local-dev-anon-key";

  const cookieStore = await cookies();

  return createServerClient(usable, usableKey, {
    // NO global headers — intentionally omit sb-forwarded-for
    // so Supabase Auth rate-limits per Vercel IP, not per school IP.
    global: { headers: {} },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component — cookies read-only, ignore.
        }
      },
    },
  });
}
