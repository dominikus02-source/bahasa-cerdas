import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Keranjang Belanja — BahasaCerdas",
  description: "Keranjang belanja Anda di Toko Karya BahasaCerdas.",
  robots: { index: false, follow: false },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
