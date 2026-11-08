/* Regression: Android Google login/registration must return to the app. */
import { readFileSync } from "node:fs";
import { mobileOAuthErrorHandoff, mobileOAuthHandoff } from "../lib/auth/mobile-oauth-handoff";
import { authErrorMessage } from "../lib/auth/auth-error-message";
let passed = 0, failed = 0;
const check = (n: string, ok: boolean) => { ok ? passed++ : failed++; console.log(`${ok ? "PASS" : "FAIL"} ${n}`); };
const deeplink = async (r: Response) => {
  const html = await r.text();
  const m = html.match(/window\.location\.replace\((".*?")\)/);
  return { html, url: m ? new URL(JSON.parse(m[1])) : null };
};
(async () => {
  for (const flow of ["login", "register"] as const) {
    const r = mobileOAuthHandoff({ code: "abc-123", next: "/jumpa/x?y=1", flow });
    const { html, url } = await deeplink(r);
    check(`${flow}: 200 html handoff`, r.status === 200 && r.headers.get("content-type")!.includes("text/html"));
    check(`${flow}: returns to bahasacerdas://oauth/callback`, url?.protocol === "bahasacerdas:" && url.host === "oauth" && url.pathname === "/callback");
    check(`${flow}: carries code + flow, safe next`, url?.searchParams.get("code") === "abc-123" && url.searchParams.get("flow") === flow && url.searchParams.get("next") === "/jumpa/x?y=1");
    check(`${flow}: clickable fallback link`, html.includes('href="bahasacerdas://oauth/callback?'));
    const csp = r.headers.get("content-security-policy") ?? "";
    const nonce = csp.match(/script-src 'nonce-([^']+)'/)?.[1];
    check(`${flow}: inline script nonce matches CSP`, !!nonce && html.includes(`<script nonce="${nonce}">`));
    check(`${flow}: no-store + no-referrer`, r.headers.get("cache-control")!.includes("no-store") && r.headers.get("referrer-policy") === "no-referrer");
  }
  for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com"]) {
    const { url } = await deeplink(mobileOAuthHandoff({ code: "c", next: bad, flow: "login" }));
    check(`unsafe next dropped: ${bad}`, url !== null && !url.searchParams.has("next"));
  }
  check("empty code rejected", mobileOAuthHandoff({ code: "", next: null, flow: "login" }).status === 400);
  check("control-char code rejected", mobileOAuthHandoff({ code: "a\nb", next: null, flow: "login" }).status === 400);
  check("oversized code rejected", mobileOAuthHandoff({ code: "x".repeat(3000), next: null, flow: "login" }).status === 400);
  const { html } = await deeplink(mobileOAuthHandoff({ code: 'a"<script>', next: null, flow: "login" }));
  check("code cannot break out of HTML/script", !html.includes('a"<script>'));

  // Batal/gagal di Google tetap kembali ke aplikasi, dengan kode tetap.
  for (const [err, want] of [["access_denied", "cancelled"], ["server_error", "failed"], ['"><script>', "failed"]] as const) {
    for (const flow of ["login", "register"] as const) {
      const r = mobileOAuthErrorHandoff({ error: err, flow });
      const { html, url } = await deeplink(r);
      check(`error ${err}/${flow}: kembali ke app dengan error=${want}`, r.status === 200 && url?.protocol === "bahasacerdas:" && url.searchParams.get("error") === want && url.searchParams.get("flow") === flow && !url.searchParams.has("code"));
      check(`error ${err}/${flow}: teks penyedia tidak diteruskan`, !html.includes("<script>\"") && !html.includes('"><script>'));
    }
  }
  check("pesan error: kode dikenal → Indonesia", authErrorMessage("google_cancelled") === "Masuk dengan Google dibatalkan.");
  check("pesan error: teks bebas dari URL tidak ditampilkan", authErrorMessage("Akun Anda diblokir, hubungi wa.me/123") === "Terjadi kendala saat masuk. Silakan coba lagi.");
  check("pesan error: 'auth' tidak tampil mentah", authErrorMessage("auth") !== "auth");

  const src = (p: string) => readFileSync(p, "utf8");
  const api = src("app/api/auth/callback/route.ts"), reg = src("app/auth/callback/route.ts");
  const handoffFirst = (s: string, flow: string) => {
    const h = s.indexOf(`mobileOAuthHandoff({ code, next, flow: "${flow}" })`), x = s.indexOf("exchangeCodeForSession(");
    return h > 0 && x > 0 && h < x && s.includes('get("bc_app") === "1"');
  };
  check("login callback hands off BEFORE browser exchange", handoffFirst(api, "login"));
  check("register callback hands off BEFORE browser exchange", handoffFirst(reg, "register"));
  for (const [n, p] of [["login", "app/(auth)/login/page.tsx"], ["register", "app/(auth)/register/page.tsx"]]) {
    const s = src(p);
    check(`${n} page: app mode sets bc_app=1 on callback`, s.includes('callbackUrl.searchParams.set("bc_app", "1")'));
    check(`${n} page: app mode skips WebView redirect, posts to bridge`, s.includes("skipBrowserRedirect: isMobileApp") && s.includes("bridge.postMessage(data.url)"));
  }
  const mw = src("middleware.ts");
  for (const p of ["app/api/auth/callback/route.ts", "app/auth/callback/route.ts"]) {
    const r = src(p);
    check(`${p}: error tanpa kode di app → handoff error sebelum alur web`, r.indexOf("mobileOAuthErrorHandoff({") > 0 && r.indexOf("mobileOAuthErrorHandoff({") < r.indexOf("exchangeCodeForSession("));
  }
  check("register: spinner Google direset setelah browser dibuka", src("app/(auth)/register/page.tsx").includes("bridge.postMessage(data.url);\n          // Browser sistem"));
  check("login & register memakai pemetaan pesan error aman", src("app/(auth)/login/page.tsx").includes("authErrorMessage(authError)") && src("app/(auth)/register/page.tsx").includes("authErrorMessage("));
  check("middleware does not override handoff CSP on /auth/callback", mw.includes('pathname === "/auth/callback"') && mw.includes("androidOAuthHandoff"));
  {
    const { authErrorMessage: m } = await import("../lib/auth/auth-error-message");
    check("pesan google_incomplete/google_offline berbahasa Indonesia", /belum selesai/.test(m("google_incomplete") ?? "") && /Koneksi internet/.test(m("google_offline") ?? ""));
    const login = src("app/(auth)/login/page.tsx");
    check("login tidak menampilkan error.message mentah penyedia", !login.includes("setError(error.message)"));
    check("tawaran kembali ke aplikasi hanya kode error tetap (tanpa code)", login.includes('href="bahasacerdas://oauth/callback?flow=login&error=failed"') && !/bahasacerdas:\/\/oauth\/callback\?[^"]*code=/.test(login));
    check("state OAuth kedaluwarsa → pesan Indonesia tetap", m("google_expired") === "Sesi masuk Google kedaluwarsa. Silakan coba lagi.");
    check("GoTrue bad_oauth_state di / → /login?error=google_expired (target tetap)", mw.includes('searchParams.get("error_code") === "bad_oauth_state"') && mw.includes('new URL("/login?error=google_expired", request.url)'));
  }
  console.log(`RESULT ${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
})();
