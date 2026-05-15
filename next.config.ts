import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "api.dicebear.com" },
    ],
  },
  experimental: {
    serverActions: { allowedOrigins: ["localhost:3000", "bahasacerdas.site"] },
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
