import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Video Pembelajaran — BahasaCerdas",
  description: "Kumpulan video pembelajaran Bahasa Indonesia untuk guru dan murid. Materi SD, SMP, SMA, dan umum. Gratis dan premium.",
  openGraph: {
    title: "Video Pembelajaran Bahasa Indonesia | BahasaCerdas",
    description: "Tonton video pembelajaran Bahasa Indonesia gratis. Materi lengkap dari SD sampai SMA.",
  },
};

export default function VideoBelajarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
