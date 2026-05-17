import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Detail Video Pembelajaran — BahasaCerdas",
  description: "Tonton video pembelajaran Bahasa Indonesia. Materi lengkap untuk SD, SMP, dan SMA.",
};

export default function VideoDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
