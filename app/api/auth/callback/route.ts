import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=Gagal login dengan Google`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(`${origin}/login?error=Gagal verifikasi login`);
  }

  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const role = data.session.user?.user_metadata?.role;
  if (role === "MURID") {
    return NextResponse.redirect(`${origin}/arena`);
  }

  return NextResponse.redirect(`${origin}/guru/beranda`);
}
