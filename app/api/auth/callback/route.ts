import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/lib/db";
import { getGravatarUrl } from "@/lib/avatar";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=Gagal login dengan Google`);
  }

  let redirectPath = next || "/guru/beranda";

  const response = NextResponse.redirect(`${origin}${redirectPath}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map(c => ({ name: c.name, value: c.value }));
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session?.user?.email) {
    return NextResponse.redirect(`${origin}/login?error=Gagal verifikasi login`);
  }

  const authUser = data.session.user;

  let dbUser = await db.user.findFirst({
    where: { email: authUser.email.toLowerCase() },
  });

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

  // Update redirect based on role
  if (!next) {
    const target = dbUser.role === "MURID" ? "/arena" : `/${dbUser.role.toLowerCase()}/beranda`;
    const redirectUrl = `${origin}${target}`;
    const finalResponse = NextResponse.redirect(redirectUrl);
    // Copy cookies from the exchange response to the final response
    response.cookies.getAll().forEach(c => {
      finalResponse.cookies.set(c.name, c.value, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    });
    return finalResponse;
  }

  return response;
}
