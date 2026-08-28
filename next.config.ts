import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "bahasacerdas.com", "www.bahasacerdas.com"],
      // Server Actions carry small payloads only (forms/metadata). Large file
      // uploads go directly to Supabase Storage from the client, NOT through a
      // Server Action — so keep this tight to limit abuse.
      bodySizeLimit: "2mb",
    },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "www.gravatar.com" },
      { protocol: "https", hostname: "secure.gravatar.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
  typescript: {
    // Type errors must fail the build. Run `npm run typecheck` locally / in CI.
    ignoreBuildErrors: false,
  },
  // NOTE: redirects live in vercel.json, NOT here. When vercel.json declares a
  // `redirects` key it REPLACES this file's redirects wholesale in deployment —
  // rules added here would work under `next dev` and then silently vanish in
  // production. That mismatch already cost us one debugging round. Same trap
  // applies to `headers`, `rewrites`, `cleanUrls` and `trailingSlash`.
  //
  // The rewrite below survives only because vercel.json declares no `rewrites`
  // key. If one is ever added there, move this rule across with it.
  async rewrites() {
    return [
      // Digital Asset Links must live at this exact path for Chrome to find it,
      // but the payload is env-driven — see app/api/assetlinks/route.ts.
      { source: "/.well-known/assetlinks.json", destination: "/api/assetlinks" },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // HSTS: includeSubDomains enabled (per user request for SSL Labs)
          // NOTE: game.bahasacerdas.com TLS active since Jun 22, 2026 (Let's Encrypt via Certbot)
          // Do NOT add preload flag unless game subdomain is confirmed stable.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          // CSP is set dynamically in middleware.ts with nonce support
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        ],
      },
      {
        source: "/:path*",
        has: [{ type: "header", key: "x-vercel-id" }],
        headers: [
          { key: "X-Robots-Tag", value: "noindex" },
        ],
      },
    ];
  },
};

export default nextConfig;
