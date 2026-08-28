import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isValidSupabaseUrl } from "@/lib/supabase/url-guard";

/**
 * Supabase client khusus untuk LOGIN.
 *
 * TIDAK mengirim header `sb-forwarded-for`, sehingga Supabase Auth
 * melihat IP egress Vercel (bukan IP NAT sekolah).
 *
 * Mengapa ini penting:
 * - Supabase Auth menerapkan rate limit ~30 req/5 min PER IP
 * - Dari browser, IP yang dilihat = IP NAT sekolah (satu IP untuk ratusan murid)
 * - Dari server tanpa forwarded-for, IP yang dilihat = IP Vercel (tersebar di banyak IP)
 * - Hasil: rate limit tidak lagi memblokir seluruh sekolah
 *
 * Rate limit brute-force tetap dijaga oleh rateLimitRoute() di API route.
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
