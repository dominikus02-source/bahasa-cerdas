import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pesanan Saya — BahasaCerdas",
  robots: { index: false, follow: false },
};

export default function OrdersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
