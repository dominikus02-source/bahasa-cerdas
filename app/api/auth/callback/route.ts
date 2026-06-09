import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { db } from "@/lib/db";
import { getGravatarUrl } from "@/lib/avatar";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=Gagal login dengan Google`);
  }

  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map(c => ({ name: c.name, value: c.value }));
        },
        setAll(cookiesToSetArr: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSetArr.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            cookiesToSet.push({ name, value, options });
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
  const email = authUser.email;
  if (!email) {
    return NextResponse.redirect(`${origin}/login?error=Email tidak ditemukan`);
  }

  let dbUser = await db.user.findFirst({
    where: { email: email.toLowerCase() },
  });

  if (!dbUser) {
    const fullName = authUser.user_metadata?.full_name
      || authUser.user_metadata?.name
      || email.split("@")[0];

    dbUser = await db.user.create({
      data: {
        supabaseId: authUser.id,
        email: email.toLowerCase(),
        fullName,
        avatar: authUser.user_metadata?.avatar_url || getGravatarUrl(email),
        role: "GURU",
        isPremium: false,
        premiumPlan: "FREE",
      },
    });

    try {
      await db.profile.create({ data: { userId: dbUser.id } });
    } catch {}
  }

  let redirectPath: string;
  if (next) {
    redirectPath = next;
  } else if (dbUser.role === "MURID") {
    redirectPath = "/arena";
  } else {
    redirectPath = `/${dbUser.role.toLowerCase()}/beranda`;
  }

  const response = NextResponse.redirect(`${origin}${redirectPath}`);
  cookiesToSet.forEach(({ name, value }) => {
    response.cookies.set(name, value, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
  });

  return response;
}
