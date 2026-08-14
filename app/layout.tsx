import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";

const SITE_URL = "https://www.bahasacerdas.com";
const SITE_NAME = "BahasaCerdas";
const DEFAULT_DESC = "Platform edukasi Bahasa Indonesia untuk guru dan murid. AI Rencana Pembelajaran generator, bank soal interaktif, kuis battle, simulasi UKBI/TKA, toko karya, dan marketplace bahan ajar — all-in-one!";
const OG_TITLE = `${SITE_NAME} — Platform Edukasi Bahasa Indonesia #BahasaCerdas`;
const OG_DESC = "Belajar Bahasa Indonesia makin seru! AI bikin Rencana Pembelajaran, bank soal, kuis game, UKBI, komunitas MGMP, dan toko karya guru. Cobain gratis sekarang!";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#B91C1C" },
    { media: "(prefers-color-scheme: dark)", color: "#B91C1C" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Platform edukasi Bahasa Indonesia`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESC,
  keywords: [
    "Bahasa Indonesia", "guru Bahasa Indonesia", "Rencana Pembelajaran", "bank soal",
    "AI pendidikan", "UKBI", "TKA", "kurikulum nasional", "edukasi",
    "MGMP Bahasa Indonesia", "kuis interaktif", "pembelajaran bahasa",
  ],
  authors: [{ name: "BahasaCerdas Team" }],
  creator: "BahasaCerdas",
  publisher: "BahasaCerdas",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: SITE_NAME,
    title: OG_TITLE,
    description: OG_DESC,
    url: SITE_URL,
    countryName: "Indonesia",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "BahasaCerdas — Platform Edukasi Bahasa Indonesia" }],
  },
  twitter: {
    card: "summary_large_image",
    title: OG_TITLE,
    description: OG_DESC,
    images: ["/opengraph-image"],
    site: "@bahasacerdas",
    creator: "@bahasacerdas",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  icons: {
    icon: [{ url: "/brand/bc2026-favicon.png", sizes: "any" }, { url: "/icon-512.png", type: "image/png", sizes: "512x512" }, { url: "/icon-192.png", type: "image/png", sizes: "192x192" }],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  manifest: "/manifest.json",
  alternates: { canonical: SITE_URL },
};

const jsonLdOrganization = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  description: "Platform edukasi Bahasa Indonesia lengkap dengan AI generator Rencana Pembelajaran, bank soal HOTS, kuis multiplayer, toko karya, dan komunitas MGMP.",
  logo: `${SITE_URL}/brand/bc2026-icon.png`,
  foundingDate: "2024",
  areaServed: { "@type": "Country", name: "ID" },
  knowsLanguage: "id",
  email: "halo@bahasacerdas.com",
  sameAs: [
    "https://www.instagram.com/bahasacerdas",
    "https://www.youtube.com/@bahasacerdas",
    "https://x.com/bahasacerdas",
  ],
  offers: {
    "@type": "Offer",
    category: "Education",
    availability: "https://schema.org/OnlineOnly",
  },
};

const jsonLdWebsite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  description: "Platform edukasi Bahasa Indonesia: AI generator Rencana Pembelajaran, bank soal HOTS, kuis multiplayer, toko karya, dan komunitas MGMP.",
  inLanguage: "id-ID",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // CSP nonce (set by middleware) so our inline JSON-LD passes the strict policy.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // Defensif: placeholder lokal (mis. `[SENSITIVE]`) tidak boleh sampai ke
  // `new URL()` — cukup lewati dns-prefetch/preconnect saja.
  let supabaseHost: string | null = null;
  try {
    supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : null;
  } catch {
    supabaseHost = null;
  }
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Arena BC" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="dns-prefetch" href="https://www.gravatar.com" />
        {supabaseHost && <link rel="dns-prefetch" href={`https://${supabaseHost}`} />}
        <link rel="preconnect" href="https://www.gravatar.com" />
        {supabaseHost && <link rel="preconnect" href={`https://${supabaseHost}`} />}
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
        />
        <script
          nonce={nonce}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }}
        />
      </head>
      <body className="font-sans">
        {/* Skip to content link — WCAG 2.4.1 Bypass Blocks */}
        <a href="#main-content" className="skip-link">
          Langsung ke konten utama
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
