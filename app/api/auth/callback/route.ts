import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  try {
    const code = requestUrl.searchParams.get("code");
    const token_hash = requestUrl.searchParams.get("token_hash");
    const type = requestUrl.searchParams.get("type");
    const next = requestUrl.searchParams.get("next") ?? "/";

    // ── PKCE code exchange ──
    if (code) {
      const supabase = await createClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error("[auth/callback] exchangeCodeForSession FAILED:", exchangeError.message, "| code present:", !!code, "| next:", next);
        // Recovery-specific: redirect to reset page with error so user sees
        // "Link Tidak Valid" instead of silently failing.
        if (next === "/reset-password") {
          return NextResponse.redirect(`${requestUrl.origin}/reset-password?error=exchange_failed`);
        }
        return NextResponse.redirect(`${requestUrl.origin}/login?error=auth`);
      }
      console.log("[auth/callback] exchangeCodeForSession OK | next:", next);
    }

    if (token_hash && type) {
      return NextResponse.redirect(`${requestUrl.origin}/confirm?token_hash=${token_hash}&type=${type}`);
    }

    // ── Recovery flow ──
    // If next=/reset-password, honor it directly.
    // Recovery is establishing a session to set a new password —
    // skip role-based redirect which would send user to dashboard.
    if (next === "/reset-password") {
      return NextResponse.redirect(`${requestUrl.origin}/reset-password`);
    }

    // ── Valid internal next param ──
    if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") && !next.startsWith("/register")) {
      return NextResponse.redirect(`${requestUrl.origin}${next}`);
    }

    // ── Role-based redirect ──
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const dbUser = await db.user.findUnique({ where: { supabaseId: user.id }, select: { role: true } });
        if (dbUser) {
          const dashboard = dbUser.role === "MURID" ? "/arena" : dbUser.role === "ADMIN" ? "/admin" : "/guru/beranda";
          return NextResponse.redirect(`${requestUrl.origin}${dashboard}`);
        }
      }
    } catch {
      // Fall through to default
    }

    return NextResponse.redirect(`${requestUrl.origin}/`);
  } catch (error) {
    console.error("[auth/callback] UNEXPECTED ERROR:", error);
    return NextResponse.redirect(`${requestUrl.origin}/login?error=auth`);
  }
}
