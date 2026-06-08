import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
});

const SITE_URL = "https://bahasacerdas.com";
const SITE_NAME = "BahasaCerdas";
const DEFAULT_DESC = "Platform edukasi Bahasa Indonesia untuk guru dan murid. AI-powered RPP generator, bank soal, kuis game, simulasi UKBI, dan toko karya.";

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
    "Bahasa Indonesia", "guru Bahasa Indonesia", "RPP", "bank soal",
    "AI pendidikan", "UKBI", "TKA", "kurikulum merdeka", "edukasi",
    "MGMP Bahasa Indonesia", "kuis interaktif", "pembelajaran bahasa",
  ],
  authors: [{ name: "BahasaCerdas Team" }],
  creator: "BahasaCerdas",
  publisher: "BahasaCerdas",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Platform edukasi Bahasa Indonesia`,
    description: DEFAULT_DESC,
    url: SITE_URL,
    images: [{ url: "/BC-logo.png", width: 1200, height: 630, alt: "BahasaCerdas — Platform edukasi Bahasa Indonesia" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Platform edukasi Bahasa Indonesia`,
    description: DEFAULT_DESC,
    images: ["/BC-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }, { url: "/icon-512.png", type: "image/png", sizes: "512x512" }, { url: "/icon-192.png", type: "image/png", sizes: "192x192" }],
    apple: { url: "/BC-logo.png", sizes: "180x180" },
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
  description: DEFAULT_DESC,
  logo: `${SITE_URL}/BC-logo.png`,
  foundingDate: "2024",
  areaServed: "ID",
  knowsLanguage: "id",
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
  description: DEFAULT_DESC,
  inLanguage: "id-ID",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/kamus?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BahasaCerdas" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
        />
        <script
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
