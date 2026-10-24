import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { rateLimitRoute } from "@/lib/rate-limit";

const GENERIC_MESSAGE = "Jika email terdaftar, tautan pemulihan akan dikirim. Periksa kotak masuk dan spam.";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimitRoute(req, { maxRequests: 3, windowSeconds: 1800, identifier: "forgot-password" });
    if (rl) return rl;

    const body: unknown = await req.json();
    const email = typeof body === "object" && body !== null && "email" in body && typeof body.email === "string"
      ? body.email.trim().toLowerCase()
      : "";
    if (!email || email.length > 254 || !emailPattern.test(email)) {
      return NextResponse.json({ error: "Masukkan alamat email yang valid." }, { status: 400 });
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      console.error("[forgot-password] Supabase Auth configuration missing");
      return NextResponse.json({ error: "Layanan pemulihan sementara tidak tersedia." }, { status: 503 });
    }

    // Supabase Site URL and Redirect URLs must allow this callback.
    const supabaseOrigin = process.env.SUPABASE_SITE_URL || "https://bahasacerdas.com";
    const redirectTo = `${supabaseOrigin}/api/auth/callback?next=/reset-password`;
    const supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (error) {
      // Do not expose provider diagnostics or whether an account exists to callers.
      // Inspect Supabase Auth logs for SMTP/rate-limit diagnostics.
      console.error("[forgot-password] Supabase recovery delivery failed", {
        status: error.status ?? null,
        code: "code" in error ? error.code : undefined,
      });
      if (error.status === 429 || /rate limit|too many requests/i.test(error.message)) {
        return NextResponse.json({
          error: "Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi.",
          retryAfter: true,
        }, { status: 429 });
      }
      return NextResponse.json({ error: "Email pemulihan belum dapat dikirim. Coba lagi nanti." }, { status: 503 });
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch {
    console.error("[forgot-password] Unexpected recovery request failure");
    return NextResponse.json({ error: "Layanan pemulihan sementara tidak tersedia." }, { status: 503 });
  }
}
