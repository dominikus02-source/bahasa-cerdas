import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, type RateLimitScope } from "@/lib/security";

const publicPaths = [
  "/", "/login", "/auth/arena-login", "/auth/callback", "/register", "/confirm",
  "/verify-email", "/onboarding", "/tentang", "/fitur",
  "/marketplace", "/artikel", "/video-belajar", "/kamus", "/loker", "/komunitas", "/ai-bc",
];

// Routes that handle their own auth — skip middleware getUser() to avoid rate limit
const selfAuthPaths = ["/api/", "/arena/", "/guru/", "/admin/"];

export async function updateSession(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("host") || "";

  // Redirect non-primary domains to www.bahasacerdas.com for SEO consistency
  if (host && !host.includes("bahasacerdas.com") && !host.includes("localhost") && !host.includes("vercel.app")) {
    const url = new URL(`https://www.bahasacerdas.com${pathname}${search}`);
    return NextResponse.redirect(url, { status: 301 });
  }

  // Rate limiting
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const isAuthPath = pathname.startsWith("/api/auth/");
  const scope: RateLimitScope = isAuthPath ? "auth" : "api";
  const limit = checkRateLimit(ip, scope);
  if (!limit.allowed) return rateLimitResponse(scope);

  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // Skip middleware getUser() for:
  //  - Public pages
  //  - Auth API routes
  //  - Routes that handle their own auth (API, Arena, Guru dashboard)
  // This avoids redundant Supabase auth calls and reduces rate limit pressure
  const isSelfAuth = selfAuthPaths.some((p) => pathname.startsWith(p));
  if (isPublic || isAuthPath || isSelfAuth) {
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
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          const domain = host.includes("bahasacerdas.com") ? ".bahasacerdas.com" : undefined;
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, { ...options, domain })
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
