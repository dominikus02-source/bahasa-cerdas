import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicPaths = [
  "/", "/login", "/auth/arena-login", "/register", "/confirm", "/verify-email", "/onboarding", "/api",
  "/marketplace", "/artikel", "/video-belajar", "/kamus", "/loker", "/komunitas", "/ai-bc",
];

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next({ request });
  }

  if (pathname.includes(".")) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const next = pathname.startsWith("/arena") ? "/auth/arena-login" : "/login";
    const loginUrl = new URL(next, request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (!user.email_confirmed_at && pathname !== "/verify-email") {
    return NextResponse.redirect(new URL("/verify-email", request.url));
  }

  if (!user.user_metadata?.onboarded && pathname !== "/onboarding") {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  return supabaseResponse;
}
