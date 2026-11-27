import type { Metadata } from "next";
import { COMPANY } from "@/lib/company";

export const metadata: Metadata = {
  title: "Publikasi dan Toko Karya",
  description: `Profil penerbit dan katalog buku Bahasa Indonesia dari ${COMPANY.legalName}, serta toko karya digital guru.`,
  openGraph: {
    title: "Publikasi dan Toko Karya | BahasaCerdas",
    description: "Kenali penerbit, lihat katalog buku Bahasa Indonesia, dan jelajahi karya guru.",
  },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
