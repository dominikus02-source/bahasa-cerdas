import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Preserve next param for redirect after login
    const target = next && next !== "/" && !next.startsWith("/login") && !next.startsWith("/register")
      ? next
      : "/";
    return NextResponse.redirect(`${requestUrl.origin}${target}`);
  } catch (error) {
    console.error("Auth callback error:", error);
    return NextResponse.redirect(`${requestUrl.origin}/login?error=auth`);
  }
}
