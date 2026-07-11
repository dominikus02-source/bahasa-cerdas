import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { rateLimit } from "@/lib/rate-limit";

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
    "img-src": ["'self'", "blob:", "data:", "https://*.supabase.co", "https://images.unsplash.com", "https://api.dicebear.com", "https://img.youtube.com", "https://i.ytimg.com"],
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
    const result = await rateLimit(ip, "ai", 30);
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

  response.headers.set("Content-Security-Policy", buildCsp(nonce));

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
