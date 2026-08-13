import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI BC — Teman cerdas untuk belajar dan mengajar Bahasa Indonesia — BahasaCerdas",
  description:
    "AI BC adalah teman cerdas Bahasa Indonesia: arti kata, tata bahasa, PUEBI, latihan soal, menulis karya, dan persiapan UKBI — untuk murid dan guru.",
  openGraph: {
    title: "AI BC — Teman cerdas untuk belajar dan mengajar Bahasa Indonesia",
    description:
      "Belajar dan mengajar Bahasa Indonesia dengan AI BC: kosakata, tata bahasa, latihan UKBI, dan panduan menulis.",
  },
};

export default function AiBCLayout({ children }: { children: React.ReactNode }) {
  return children;
}
