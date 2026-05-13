import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "BahasaCerdas — Platform Edukasi Bahasa Indonesia",
  description: "Platform edukasi Bahasa Indonesia untuk guru dan murid. AI-powered RPP generator, bank soal, kuis game, simulasi UKBI, dan toko karya.",
  icons: {
    icon: "/favicon.ico",
  },
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