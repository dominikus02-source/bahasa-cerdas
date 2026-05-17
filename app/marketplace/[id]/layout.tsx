import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Detail Karya — BahasaCerdas",
  description: "Lihat detail karya digital guru Bahasa Indonesia di Toko Karya BahasaCerdas.",
};

export default function MarketplaceDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
