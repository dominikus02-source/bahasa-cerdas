import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, rateLimitResponse, type RateLimitScope } from "@/lib/security";

// Routes that NEVER need getUser() in middleware — public pages or SSG
const publicPaths = [
  "/", "/login", "/auth/arena-login", "/auth/callback", "/register", "/confirm",
  "/verify-email", "/onboarding", "/tentang", "/fitur",
  "/marketplace", "/artikel", "/video-belajar", "/kamus", "/loker", "/komunitas", "/ai-bc", "/profile/",
  "/kebijakan-privasi", "/syarat-ketentuan",
  "/faq", "/cart", "/checkout", "/orders", "/payment/", "/reset-password",
  "/robots.txt", "/sitemap.xml", "/manifest.webmanifest", "/opengraph-image",
];

// Routes that handle their own auth — skip middleware getUser() to avoid rate limit
const selfAuthPaths = ["/api/", "/arena/", "/guru/", "/admin/", "/murid/", "/game/", "/auth/", "/kompetisi/"];

// Dashboard routes that require onboarding
const dashboardPaths = ["/guru/", "/admin/", "/murid/"];

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

  // On login page, clear any stale Supabase cookies unconditionally
  // This ensures users with expired sessions from old VPS can log in fresh
  if (pathname === "/login" || pathname === "/auth/arena-login") {
    const response = NextResponse.next({ request });
    request.cookies.getAll()
      .filter((c) => c.name.startsWith("sb-") || c.name.startsWith("supabase-"))
      .forEach((c) => response.cookies.set(c.name, "", { maxAge: 0, path: "/" }));
    response.headers.set("X-RateLimit-Remaining", String(limit.remaining));
    return response;
  }

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

  let user: any = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data?.user ?? null;
  } catch (e) {
    console.warn("Auth getUser failed, redirecting to login:", e);
    const response = NextResponse.redirect(new URL("/login", request.url));
    request.cookies.getAll()
      .filter((c) => c.name.startsWith("sb-") || c.name.startsWith("supabase-"))
      .forEach((c) => response.cookies.set(c.name, "", { maxAge: 0, path: "/" }));
    return response;
  }

  if (!user) {
    // Clear stale auth cookies to prevent refresh loop
    const response = NextResponse.redirect(new URL("/login", request.url));
    request.cookies.getAll().filter((c) =>
      c.name.startsWith("sb-") || c.name.startsWith("supabase-")
    ).forEach((c) => response.cookies.set(c.name, "", { maxAge: 0, path: "/" }));
    return response;
  }

  if (!user.email_confirmed_at && pathname !== "/verify-email") {
    return NextResponse.redirect(new URL("/verify-email", request.url));
  }

  supabaseResponse.headers.set("X-RateLimit-Remaining", String(limit.remaining));
  return supabaseResponse;
}
