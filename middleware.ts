import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicPage = pathname === "/" || 
    pathname.startsWith("/login") || 
    pathname.startsWith("/register") ||
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
      const dbUserRole = await getUserRole(user.id);
      if (!dbUserRole) {
        return NextResponse.redirect(new URL("/login", request.url));
      }
      if (isGuruRoute && dbUserRole !== "guru") {
        return NextResponse.redirect(new URL("/murid/beranda", request.url));
      }
      if (isMuridRoute && dbUserRole !== "murid") {
        return NextResponse.redirect(new URL("/guru/beranda", request.url));
      }
    }

    return supabaseResponse;
  } catch {
    return NextResponse.next();
  }
}

async function getUserRole(supabaseId: string): Promise<string | null> {
  try {
    const { db } = await import("@/lib/db");
    const user = await db.user.findUnique({
      where: { supabaseId },
      select: { role: true }
    });
    return user?.role?.toLowerCase() || null;
  } catch {
    return null;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
