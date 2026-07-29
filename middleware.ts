import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { rateLimit } from "@/lib/rate-limit";
import { getClientKey } from "@/lib/security";

// Content-Security-Policy with a per-request nonce for inline scripts.
// script-src uses 'nonce-<value>' (NO 'unsafe-inline') so injected inline scripts
// are blocked unless they carry our nonce. Host allowlists (Midtrans, Supabase)
// remain so their EXTERNAL scripts still load (we intentionally do NOT use
// 'strict-dynamic', which would nullify those allowlists).
// style-src keeps 'unsafe-inline' — Tailwind/inline styles rely on it; removing it
// causes broad breakage, so it is left in place by design.
function buildCsp(nonce: string): string {
  const csp: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "https://*.supabase.co",
      "https://app.midtrans.com",
      "https://app.sandbox.midtrans.com",
      "https://api.unsplash.com",
    ],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    // gravatar.com is here because registration stores a Gravatar identicon as
    // the default avatar (lib/avatar.ts). Omitting it meant 42 of 62 students
    // with an avatar had it blocked by CSP and rendered broken.
    "img-src": ["'self'", "blob:", "data:", "https://*.supabase.co", "https://images.unsplash.com", "https://api.dicebear.com", "https://www.gravatar.com", "https://secure.gravatar.com", "https://lh3.googleusercontent.com", "https://img.youtube.com", "https://i.ytimg.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com"],
    "connect-src": ["'self'", "https://*.supabase.co", "wss://*.supabase.co", "https://api.midtrans.com", "https://app.midtrans.com", "https://api.sandbox.midtrans.com", "https://app.sandbox.midtrans.com", "wss://game.bahasacerdas.com", "https://game.bahasacerdas.com", "https://api.unsplash.com"],
    "frame-src": ["'self'", "https://app.midtrans.com", "https://app.sandbox.midtrans.com", "https://www.youtube.com", "https://*.supabase.co", "https://view.officeapps.live.com"],
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "report-uri": ["/api/csp-report"],
    "upgrade-insecure-requests": [],
  };
  return Object.entries(csp)
    .map(([key, values]) => (values.length ? `${key} ${values.join(" ")}` : key))
    .join("; ");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limit /api/ai/* routes in middleware (30 req/min blanket — per-route handlers enforce tighter limits).
  // Keyed per session, not per IP: a class shares one NAT IP, so an IP key would
  // divide the budget across every student in the room.
  if (pathname.startsWith("/api/ai/")) {
    const result = await rateLimit(getClientKey(request), "ai", 30);
    if (!result.success) {
      return new NextResponse(JSON.stringify({ error: "Too many requests" }), {
        status: 429,
        headers: { "Content-Type": "application/json", "Retry-After": `${result.reset}` },
      });
    }
  }

  // Per-request nonce, propagated to the render via the x-nonce request header so
  // Next.js applies it to its framework scripts and our JSON-LD blocks can read it.
  const nonce = btoa(crypto.randomUUID());

  const response = await updateSession(request, nonce);

  // CSP hanya untuk HTML — API JSON responses tidak perlu
  if (pathname.startsWith("/api/")) {
    return response;
  }

  response.headers.set("Content-Security-Policy", buildCsp(nonce));

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
