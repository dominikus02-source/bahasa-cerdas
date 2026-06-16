import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { rateLimit } from "@/lib/rate-limit";

function buildCsp(): string {
  const csp: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "https://*.supabase.co", "https://app.midtrans.com", "https://api.unsplash.com"],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "img-src": ["'self'", "blob:", "data:", "https://*.supabase.co", "https://images.unsplash.com", "https://api.dicebear.com", "https://img.youtube.com", "https://i.ytimg.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com"],
    "connect-src": ["'self'", "https://*.supabase.co", "https://api.midtrans.com", "https://app.midtrans.com", "wss://game.bahasacerdas.com", "https://game.bahasacerdas.com", "https://api.unsplash.com"],
    "frame-src": ["'self'", "https://app.midtrans.com", "https://www.youtube.com", "https://*.supabase.co", "https://view.officeapps.live.com"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "upgrade-insecure-requests": [],
  };
  return Object.entries(csp)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");
}

function getClientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "127.0.0.1";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limit /api/ai/* routes in middleware (30 req/min blanket — per-route handlers enforce tighter limits)
  if (pathname.startsWith("/api/ai/")) {
    const ip = getClientIp(request);
    const result = await rateLimit(ip, "ai", 30); // 30 req/min blanket — per-route handlers enforce tighter limits
    if (!result.success) {
      return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": `${result.reset}` },
      });
    }
  }

  const response = await updateSession(request);

  response.headers.set("Content-Security-Policy", buildCsp());

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
