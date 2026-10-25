import type { Metadata } from "next";

export const metadata: Metadata = {
  // Template root (app/layout.tsx) sudah menambahkan "| BahasaCerdas" —
  // jangan tulis nama platform lagi di sini agar judul tidak dobel.
  title: "NARA — Teman Berpikir, Berkata, dan Berkarya",
  description:
    "NARA (Narasumber Andalan, Rekan Anda) adalah teman ngobrol di BahasaCerdas: arti kata, tata bahasa, PUEBI, latihan soal, menulis karya, dan persiapan UKBI — untuk murid dan guru.",
  openGraph: {
    title: "NARA dari BahasaCerdas — Teman Berpikir, Berkata, dan Berkarya",
    description:
      "Ngobrol dengan Nara, Narasumber Andalan, Rekan Anda: kosakata, tata bahasa, latihan UKBI, dan panduan menulis Bahasa Indonesia.",
  },
};

export default function AiBCLayout({ children }: { children: React.ReactNode }) {
  return children;
}
