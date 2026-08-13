import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI BC — Teman cerdas untuk belajar dan mengajar Bahasa Indonesia — BahasaCerdas",
  description:
    "AI BC adalah teman belajar Bahasa Indonesia untuk murid dan teman mengajar untuk guru: arti kata, tata bahasa, PUEBI, latihan soal, sampai bantuan menyusun RPP dan asesmen.",
  openGraph: {
    title: "AI BC — Teman cerdas untuk belajar dan mengajar Bahasa Indonesia",
    description:
      "Belajar dan mengajar Bahasa Indonesia dengan AI BC: kosakata, tata bahasa, latihan UKBI, RPP, dan asesmen.",
  },
};

export default function AiBCLayout({ children }: { children: React.ReactNode }) {
  return children;
}
