import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getGravatarUrl } from "@/lib/avatar";

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

  const authUser = data.session.user;
  if (!authUser?.email) {
    return NextResponse.redirect(`${origin}/login?error=Email tidak ditemukan`);
  }

  // Check if user exists in app DB
  let dbUser = await db.user.findFirst({
    where: { email: authUser.email.toLowerCase() },
  });

  // Auto-create user if first time Google login
  if (!dbUser) {
    const fullName = authUser.user_metadata?.full_name
      || authUser.user_metadata?.name
      || authUser.email.split("@")[0];

    dbUser = await db.user.create({
      data: {
        supabaseId: authUser.id,
        email: authUser.email.toLowerCase(),
        fullName,
        avatar: authUser.user_metadata?.avatar_url || getGravatarUrl(authUser.email),
        role: "GURU",
        isPremium: false,
        premiumPlan: "FREE",
      },
    });

    try {
      await db.profile.create({ data: { userId: dbUser.id } });
    } catch {}
  }

  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (dbUser.role === "MURID") {
    return NextResponse.redirect(`${origin}/arena`);
  }

  return NextResponse.redirect(`${origin}/${dbUser.role.toLowerCase()}/beranda`);
}
