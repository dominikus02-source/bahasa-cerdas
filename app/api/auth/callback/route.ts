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

    if (code) {
      const supabase = await createClient();
      await supabase.auth.exchangeCodeForSession(code);
    }

    if (token_hash && type) {
      return NextResponse.redirect(`${requestUrl.origin}/confirm?token_hash=${token_hash}&type=${type}`);
    }

    // Preserve valid internal next param for contextual redirect.
    // Validate: must start with /, no protocol-relative (//evil.com),
    // not a login/register path to prevent redirect loops.
    if (next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") && !next.startsWith("/register")) {
      return NextResponse.redirect(`${requestUrl.origin}${next}`);
    }

    // Role-based redirect: look up user role to send to correct dashboard
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
    console.error("Auth callback error:", error);
    return NextResponse.redirect(`${requestUrl.origin}/login?error=auth`);
  }
}
