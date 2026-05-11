import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const isGuruRoute = pathname.startsWith("/guru");
    const isMuridRoute = pathname.startsWith("/murid");

    if (isGuruRoute || isMuridRoute) {
      const dbUser = await getUserRole(user.id);
      
      if (isGuruRoute && dbUser !== "guru") {
        return NextResponse.redirect(new URL("/murid/beranda", request.url));
      }
      if (isMuridRoute && dbUser !== "murid") {
        return NextResponse.redirect(new URL("/guru/beranda", request.url));
      }
    }

    return NextResponse.next();
  } catch {
    return NextResponse.next();
  }
}

async function getUserRole(supabaseId: string): Promise<string> {
  try {
    const { db } = await import("@/lib/db");
    const user = await db.user.findUnique({
      where: { supabaseId },
      select: { role: true }
    });
    return user?.role?.toLowerCase() || "murid";
  } catch {
    return "murid";
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
