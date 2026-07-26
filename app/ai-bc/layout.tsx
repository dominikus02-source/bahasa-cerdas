import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI BC — Asisten AI Guru Bahasa Indonesia — BahasaCerdas",
  description: "Asisten AI untuk guru Bahasa Indonesia. Buat Rencana Pembelajaran, bank soal HOTS, materi ajar, dan kisi-kisi otomatis dengan kecerdasan buatan.",
  openGraph: {
    title: "AI BC — Asisten AI Guru | BahasaCerdas",
    description: "Buat Rencana Pembelajaran, soal HOTS, dan materi ajar Bahasa Indonesia dengan AI. Gratis untuk guru.",
  },
};

export default function AiBCLayout({ children }: { children: React.ReactNode }) {
  return children;
}
