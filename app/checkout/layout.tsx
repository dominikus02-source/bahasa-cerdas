import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout — BahasaCerdas",
  description: "Selesaikan pembelian karya digital di Toko Karya BahasaCerdas.",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
