import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Toko Karya — Marketplace Guru — BahasaCerdas",
  description: "Toko karya digital untuk guru Bahasa Indonesia. Temukan dan jual RPP, modul ajar, PPT, soal, video pembelajaran, ebook, dan administrasi guru.",
  openGraph: {
    title: "Toko Karya Guru | BahasaCerdas",
    description: "Jual-beli RPP, modul, soal, dan karya guru Bahasa Indonesia. Marketplace edukasi untuk guru Indonesia.",
  },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
