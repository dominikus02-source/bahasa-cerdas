import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, getClientIdentity, rateLimitResponse, getForwardedIp, type RateLimitScope } from "@/lib/security";
import { isValidSupabaseUrl } from "@/lib/supabase/url-guard";

// Secret key untuk IP Address Forwarding (lihat lib/supabase/server.ts).
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Routes that NEVER need getUser() in middleware — public pages or SSG
const publicPaths = [
  "/", "/login", "/auth/arena-login", "/auth/callback", "/register", "/confirm",
  "/verify-email", "/onboarding", "/tentang", "/fitur",
  "/marketplace", "/artikel", "/video-belajar", "/kamus", "/loker", "/komunitas", "/ai-bc", "/profile/",
  "/kebijakan-privasi", "/syarat-ketentuan",
  "/faq", "/cart", "/checkout", "/orders", "/payment/", "/reset-password",
  // Parents install the APK before anyone has an account — gating this behind
  // login would put the download on the far side of the thing it unlocks.
  "/unduh",
  "/robots.txt", "/sitemap.xml", "/manifest.webmanifest", "/opengraph-image",
];

// Routes that handle their own auth — skip middleware getUser() to avoid rate limit
const selfAuthPaths = ["/api/", "/arena/", "/guru/", "/admin/", "/murid/", "/game/", "/auth/", "/kompetisi/", "/junior/"];

// Dashboard routes that require onboarding
const dashboardPaths = ["/guru/", "/admin/", "/murid/"];

export async function updateSession(request: NextRequest, nonce?: string) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("host") || "";

  // Carry the CSP nonce to the downstream render via a request header so Next.js
  // applies it to its own scripts. Cloned so we don't mutate the original.
  const requestHeaders = new Headers(request.headers);
  if (nonce) requestHeaders.set("x-nonce", nonce);
  // Server layouts cannot read the current path. app/arena/layout.tsx needs it to
  // recognise its own login route and skip the auth gate there — without this the
  // gate would redirect the login page to itself, forever.
  requestHeaders.set("x-pathname", pathname);
  const nextWithNonce = () => NextResponse.next({ request: { headers: requestHeaders } });

  // Redirect non-primary domains to www.bahasacerdas.com for SEO consistency
  if (host && !host.includes("bahasacerdas.com") && !host.includes("localhost") && !host.includes("vercel.app")) {
    const url = new URL(`https://www.bahasacerdas.com${pathname}${search}`);
    return NextResponse.redirect(url, { status: 301 });
  }

  // Rate limiting. Two tiers: a wide per-IP backstop against a runaway client,
  // then the real limit keyed per session so students sharing a school NAT get
  // their own budget instead of splitting one.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const isAuthPath = pathname.startsWith("/api/auth/");
  const scope: RateLimitScope = isAuthPath ? "auth" : "api";

  const burst = await checkRateLimit(ip, "ipBurst");
  if (!burst.allowed) return rateLimitResponse("ipBurst");

  // Anonymous traffic (every student sitting on the login screen) has no session
  // to key on, so it is governed by the per-IP backstop above and nothing else.
  // Giving it the per-session `api` budget would collapse the key back to the
  // bare IP and split one budget across the whole room — the original bug.
  const identity = getClientIdentity(request);
  let limit = { allowed: true, remaining: burst.remaining, resetAt: burst.resetAt };
  if (isAuthPath) limit = await checkRateLimit(ip, "auth");
  else if (identity.identified) limit = await checkRateLimit(identity.key, "api");
  if (!limit.allowed) return rateLimitResponse(scope);

  const isPublic = publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));

  // On login page, clear any stale Supabase cookies unconditionally
  // This ensures users with expired sessions from old VPS can log in fresh
  // /arena/login sengaja TIDAK ikut di sini.
  //
  // Dua rute lama di bawah adalah halaman login yang berdiri sendiri: pengguna
  // sampai ke sana lalu masuk, jadi membuang cookie basi di situ aman.
  // /arena/login berbeda — ia juga tujuan pantulan setiap kali pemeriksaan auth
  // di /arena meleset. Membuang cookie di sana berarti sesi yang BARU SAJA
  // didapat dari login ikut terhapus: murid berhasil masuk, didorong ke /arena,
  // terpantul balik, dan sesinya dibatalkan oleh halaman pendaratannya sendiri.
  // Tidak membuang di sini aman: login yang berhasil menimpa cookie lama.
  if (pathname === "/login" || pathname === "/auth/arena-login") {
    const response = nextWithNonce();
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
    const response = nextWithNonce();
    response.headers.set("X-RateLimit-Remaining", String(limit.remaining));
    return response;
  }

  if (pathname.includes(".")) {
    return nextWithNonce();
  }

  let supabaseResponse = nextWithNonce();

  // Local dev runs with masked placeholder env (opencode secret masking writes
  // literal `[SENSITIVE]` into .env.local). createServerClient throws
  // synchronously on such values, which otherwise turns every non-public page
  // into a 500. When the URL is unusable, skip the auth gate: no session can be
  // verified, so pass the request through and let page-level guards redirect at
  // the application layer instead.
  if (!isValidSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_SECRET_KEY,
    {
      global: {
        headers: (() => {
          const ip = getForwardedIp(request.headers);
          return ip ? { "sb-forwarded-for": ip } : {};
        })(),
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          const domain = host.includes("bahasacerdas.com") ? ".bahasacerdas.com" : undefined;
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = nextWithNonce();
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, { ...options, domain })
          );
        },
      },
    }
  );

  // Sengaja TETAP memakai getUser() di sini, bukan getClaims().
  //
  // Blok ini hanya berjalan untuk rute yang tidak masuk publicPaths maupun
  // selfAuthPaths — jadi /api/, /arena/, /guru/, /murid/ (yaitu hampir seluruh
  // trafik) sudah melewatinya. Middleware bukan sumber lonjakan panggilan auth;
  // yang menjadi sumber adalah getUser() di lib/supabase/server.ts.
  //
  // Lagipula pemeriksaan email_confirmed_at di bawah butuh objek User utuh:
  // JwtPayload tidak memuat field itu, sehingga memakai klaim di sini akan
  // membuat SETIAP pengguna dianggap belum memverifikasi email dan dilempar ke
  // /verify-email. Risikonya jauh lebih besar daripada hematnya.
  // Arena is also shipped as an Android APK whose scope is /arena. Sending an
  // unauthenticated visitor there to the shared /login would drop them out of the
  // app into a browser tab on the very first launch, so arena traffic gets the
  // arena-flavoured login instead. Same screen, reachable without leaving scope.
  const loginPath = pathname.startsWith("/arena") ? "/arena/login" : "/login";

  // `/arena` adalah URL yang dibuka APK saat diluncurkan — satu-satunya jalur
  // Arena yang sampai ke pemeriksaan auth jaringan di bawah, karena semua
  // `/arena/...` lainnya sudah tersaring sebagai selfAuth di atas.
  //
  // Cold start ponsel adalah saat jaringan paling belum siap, jadi justru di
  // sinilah panggilan ke server Auth paling sering gagal. Perlakuan lama —
  // buang cookie lalu lempar ke login — mengubah gangguan sedetik menjadi
  // logout permanen: murid menutup APK, membukanya lagi, dan harus mengetik
  // sandi dari awal.
  //
  // Untuk path ini saja, kegagalan MENGHUBUNGI Auth dibiarkan lewat tanpa
  // menyentuh cookie. Itu aman karena app/arena/layout.tsx tetap menggerbangi
  // halamannya, memakai getClaims() yang memverifikasi JWT secara LOKAL dan
  // tidak butuh jaringan. Kalau sesinya memang sudah tidak sah, layout yang
  // mengarahkannya ke /arena/login — tidak ada celah yang terbuka.
  //
  // Sengaja TIDAK diberlakukan untuk path lain: mereka tidak punya gerbang
  // tingkat halaman, dan membiarkannya lewat berarti membuka halaman tanpa auth.
  // Jawaban PASTI "tidak ada sesi" (cabang !user di bawah) tetap membuang cookie
  // seperti semula — itu pemutus loop-nya, dan mencabutnya pernah mematikan
  // login total (lihat riwayat c2cff46).
  // Syarat kedua WAJIB: hanya permintaan yang benar-benar MEMBAWA cookie sesi
  // yang berhak diberi keringanan ini. Tanpa syarat itu, supabase-js membalas
  // AuthSessionMissingError untuk pengunjung anonim — sebuah jawaban PASTI
  // "tidak ada sesi" — dan kode ini akan salah membacanya sebagai "Auth tak
  // terjangkau", lalu membiarkan siapa pun lewat tanpa login. Terpergok di
  // preview: /arena membalas 200 untuk permintaan tanpa cookie, bukan 307.
  const punyaCookieSesi = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") || c.name.startsWith("supabase-"));
  const gerbangDiLayout = pathname === "/arena" && punyaCookieSesi;

  let user: any = null;
  try {
    const result = await supabase.auth.getUser();
    user = result.data?.user ?? null;
    // supabase-js membalas { user: null, error } tanpa melempar untuk 429 dan
    // gangguan jaringan — bentuk kegagalan yang sama, hanya jalurnya berbeda.
    if (!user && result.error && gerbangDiLayout) {
      console.warn("Auth tak terjangkau di /arena, sesi dipertahankan:", result.error.message);
      return supabaseResponse;
    }
  } catch (e) {
    if (gerbangDiLayout) {
      console.warn("Auth tak terjangkau di /arena, sesi dipertahankan:", e);
      return supabaseResponse;
    }
    console.warn("Auth getUser failed, redirecting to login:", e);
    const response = NextResponse.redirect(new URL(loginPath, request.url));
    request.cookies.getAll()
      .filter((c) => c.name.startsWith("sb-") || c.name.startsWith("supabase-"))
      .forEach((c) => response.cookies.set(c.name, "", { maxAge: 0, path: "/" }));
    return response;
  }

  if (!user) {
    // Clear stale auth cookies to prevent refresh loop
    const response = NextResponse.redirect(new URL(loginPath, request.url));
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
