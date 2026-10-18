import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JUMPA_ENABLED } from "@/lib/features";
import "@/components/jumpa/jumpa.css";

export const metadata: Metadata = {
  title: "JUMPA — BahasaCerdas",
  description: "Ruang video belajar BahasaCerdas untuk guru dan murid.",
  robots: { index: false, follow: false },
};

/**
 * JUMPA selalu gelap (class `dark` → token gelap dari app/globals.css),
 * terlepas dari tema pilihan user di dasbor. Tidak ada provider tema kedua.
 */
export default function JumpaLayout({ children }: { children: React.ReactNode }) {
  if (!JUMPA_ENABLED) notFound();
  return <div className="dark jumpa-scope">{children}</div>;
}
