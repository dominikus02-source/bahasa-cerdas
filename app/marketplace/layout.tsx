import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Toko Karya Guru — BahasaCerdas",
  description: "Toko karya digital untuk guru Bahasa Indonesia. Temukan dan jual Rencana Pembelajaran, PPT, soal, video pembelajaran, ebook, dan administrasi guru.",
  openGraph: {
    title: "Toko Karya Guru | BahasaCerdas",
    description: "Jual-beli Rencana Pembelajaran, modul, soal, dan karya guru Bahasa Indonesia. Toko Karya edukasi untuk guru Indonesia.",
  },
};

export default function MarketplaceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
