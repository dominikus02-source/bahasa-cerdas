import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/security";

const publicPaths = [
  "/", "/login", "/auth/arena-login", "/register", "/confirm",
  "/verify-email", "/onboarding", "/tentang", "/fitur",
  "/marketplace", "/artikel", "/video-belajar", "/kamus", "/loker", "/komunitas", "/ai-bc",
];

const authPaths = [
  "/api/auth/login", "/api/auth/register", "/api/auth/forgot-password",
  "/api/auth/callback", "/api/auth/create-user",
];

export async function updateSession(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("host") || "";

  // Redirect non-primary domains to bahasacerdas.com for SEO consistency
  if (host && !host.includes("bahasacerdas.com") && !host.includes("localhost") && !host.includes("vercel.app")) {
    const url = new URL(`https://bahasacerdas.com${pathname}${search}`);
    return NextResponse.redirect(url, { status: 301 });
  }

  // Rate limiting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const scope = authPaths.some((p) => pathname.startsWith(p)) ? "auth" : "api";
  const limit = checkRateLimit(ip, scope);
  if (!limit.allowed) return rateLimitResponse(scope);

  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const response = NextResponse.next({ request });
    response.headers.set("X-RateLimit-Remaining", String(limit.remaining));
    return response;
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

  supabaseResponse.headers.set("X-RateLimit-Remaining", String(limit.remaining));
  return supabaseResponse;
}
