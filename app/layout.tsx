import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

const SITE_URL = "https://bahasacerdas.com";
const SITE_NAME = "BahasaCerdas";
const DEFAULT_DESC = "Platform edukasi Bahasa Indonesia untuk guru dan murid. AI-powered RPP generator, bank soal, kuis game, simulasi UKBI, dan toko karya.";

export const viewport: Viewport = {
  themeColor: "#dc2626",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Platform Edukasi Bahasa Indonesia`,
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
    title: `${SITE_NAME} — Platform Edukasi Bahasa Indonesia`,
    description: DEFAULT_DESC,
    url: SITE_URL,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Platform Edukasi Bahasa Indonesia`,
    description: DEFAULT_DESC,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  icons: {
    icon: "/favicon.ico",
    apple: { url: "/favicon.ico", sizes: "180x180" },
  },
  manifest: "/manifest.json",
  alternates: { canonical: SITE_URL },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
