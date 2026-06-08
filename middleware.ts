import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function buildCsp(nonce: string): string {
  const csp: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, "https://*.supabase.co", "https://app.midtrans.com", "https://api.unsplash.com"],
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

export async function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-csp-nonce", nonce);

  const response = await updateSession(request);

  // Override CSP from next.config.ts with nonce-enabled version
  response.headers.set("Content-Security-Policy", buildCsp(nonce));

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
