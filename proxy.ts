import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPage = pathname === "/" || 
    pathname.startsWith("/login") || 
    pathname.startsWith("/register") ||
    pathname.startsWith("/artikel") ||
    pathname.startsWith("/kamus") ||
    pathname.startsWith("/marketplace") ||
    pathname.startsWith("/video-belajar") ||
    pathname.startsWith("/loker") ||
    pathname.startsWith("/ai-bc") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon");

  if (isPublicPage) {
    return NextResponse.next();
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

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const isGuruRoute = pathname.startsWith("/guru");
    const isMuridRoute = pathname.startsWith("/murid");

    if (isGuruRoute || isMuridRoute) {
      const dbUserInfo = await getUserInfo(user.id);
      if (!dbUserInfo) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
      if (dbUserInfo.isFounder) {
        return supabaseResponse;
      }
      if (isGuruRoute && dbUserInfo.role !== "guru") {
        return NextResponse.redirect(new URL("/murid/beranda", request.url));
      }
      if (isMuridRoute && dbUserInfo.role !== "murid") {
        return NextResponse.redirect(new URL("/guru/beranda", request.url));
      }
    }

    return supabaseResponse;
  } catch {
    return NextResponse.next();
  }
}

async function getUserInfo(supabaseId: string): Promise<{ role: string; isFounder: boolean } | null> {
  try {
    const { db } = await import("@/lib/db");
    const user = await db.user.findUnique({
      where: { supabaseId },
      select: { role: true, isFounder: true }
    });
    if (!user) return null;
    return { role: user.role.toLowerCase(), isFounder: user.isFounder };
  } catch {
    return null;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
