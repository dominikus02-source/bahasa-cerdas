import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { isSafeNext } from "@/lib/auth/role-intent";

/**
 * Google OAuth runs in the system browser (never an embedded WebView).
 * Do NOT exchange the Supabase PKCE code here: its verifier lives in the
 * Android WebView's cookie jar, not in the external browser's cookie jar.
 * Return only the one-time auth code to the native app; the WebView then
 * calls the EXISTING callback, where role provisioning/RBAC is unchanged.
 */
export function mobileOAuthHandoff(params: {
  code: string;
  next: string | null;
  flow: "login" | "register";
}): NextResponse {
  // Supabase PKCE codes are short-lived and one-time. They are NOT sessions.
  if (!params.code || params.code.length > 2048 || /[\u0000-\u001f\u007f]/.test(params.code)) {
    return new NextResponse("Invalid authentication response", { status: 400 });
  }

  const callback = new URL("bahasacerdas://oauth/callback");
  callback.searchParams.set("code", params.code);
  callback.searchParams.set("flow", params.flow);
  if (params.next && isSafeNext(params.next)) {
    callback.searchParams.set("next", params.next);
  }
  const url = callback.toString();
  const escapedHref = url.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  const scriptUrl = JSON.stringify(url).replaceAll("<", "\\u003c");
  const nonce = randomBytes(16).toString("base64");

  // Chrome can refuse a non-user-initiated custom-scheme navigation. A real
  // clickable fallback is essential, even though auto-return is attempted.
  const html = `<!doctype html>
<html lang="id"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Kembali ke BahasaCerdas</title>
<style nonce="${nonce}">
body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:var(--clr-bg,ghostwhite);color:var(--clr-text,midnightblue)}
main{width:min(92vw,400px);box-sizing:border-box;padding:32px;text-align:center;background:var(--clr-surface,white);border-radius:24px;box-shadow:0 12px 35px thistle}
h1{font-size:24px;margin:0 0 12px}p{color:var(--clr-text-2,slategray);line-height:1.55;margin:0 0 24px}
a{display:block;padding:16px;background:var(--clr-violet,blueviolet);color:white;border-radius:14px;text-decoration:none;font-weight:700}
</style></head><body>
<main><h1>Kembali ke BahasaCerdas</h1>
<p>Autentikasi Google telah diproses. Buka aplikasi untuk menyelesaikan masuk secara aman.</p>
<a href="${escapedHref}" rel="noreferrer">Buka aplikasi BahasaCerdas</a></main>
<script nonce="${nonce}">window.location.replace(${scriptUrl});</script>
</body></html>`;
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, private",
      "Pragma": "no-cache",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": `default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'`,
    },
  });
}
