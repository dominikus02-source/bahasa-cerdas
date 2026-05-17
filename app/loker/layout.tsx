import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lowongan Kerja Guru — BahasaCerdas",
  description: "Informasi lowongan kerja terbaru untuk guru Bahasa Indonesia di seluruh Indonesia. Cari dan pasang lowongan guru.",
  openGraph: {
    title: "Lowongan Kerja Guru | BahasaCerdas",
    description: "Lowongan kerja guru Bahasa Indonesia terbaru dari berbagai sekolah di Indonesia.",
  },
};

export default function LokerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
