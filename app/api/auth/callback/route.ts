import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await import("@/lib/supabase/server").then(m => m.createClient());
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      try {
        const user = await import("@/lib/supabase/server").then(m => m.getUser());
        if (user && user.role === "MURID") {
          return NextResponse.redirect(`${origin}/arena`);
        }
      } catch {}
      return NextResponse.redirect(`${origin}/guru/beranda`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Gagal login dengan Google`);
}
