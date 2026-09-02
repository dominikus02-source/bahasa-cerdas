import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { rateLimitRoute } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimitRoute(req, { maxRequests: 3, windowSeconds: 1800, identifier: "forgot-password" });
    if (rl) return rl;

    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email diperlukan" }, { status: 400 });

    // Check if user exists in our DB
    const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return NextResponse.json({ error: "Email tidak terdaftar" }, { status: 404 });

    // Generate reset link via Supabase Auth (sends email through Supabase's email provider)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // CRITICAL: redirectTo MUST match the Supabase project's Site URL domain.
    // Supabase Site URL is https://bahasacerdas.com (no www).
    // If redirectTo domain doesn't match Site URL AND isn't in Redirect URLs,
    // Supabase falls back to Site URL → user lands on homepage, not reset page.
    const supabaseOrigin = process.env.SUPABASE_SITE_URL || "https://bahasacerdas.com";
    const redirectTo = `${supabaseOrigin}/api/auth/callback?next=/reset-password`;

    console.log("[forgot-password] redirectTo:", redirectTo);
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase(), {
      redirectTo,
    });

    if (error?.message?.includes("rate limit")) {
      // Supabase rate-limited — retry once (rate limit may have reset)
      // Do NOT use Resend fallback: it cannot generate a valid Supabase recovery link.
      // Instead, tell the user to wait and try again.
      console.warn("[forgot-password] Supabase rate-limited for:", email.toLowerCase());
      return NextResponse.json({
        error: "Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi.",
        retryAfter: true,
      }, { status: 429 });
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ message: "Link reset password sudah dikirim ke email kamu" });
  } catch {
    return NextResponse.json({ error: "Terjadi kesalahan" }, { status: 500 });
  }
}
