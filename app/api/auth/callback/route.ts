import { NextRequest, NextResponse } from "next/server";
import { createClient, getUser } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      try {
        const user = await getUser();
        if (user && user.role === "MURID") {
          return NextResponse.redirect(`${origin}/arena`);
        }
      } catch {}
      return NextResponse.redirect(`${origin}/guru/beranda`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Gagal login dengan Google`);
}
