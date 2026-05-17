import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kamus Bahasa Indonesia — BahasaCerdas",
  description: "Kamus Bahasa Indonesia online lengkap dengan definisi, sinonim, antonim, dan contoh kalimat. Referensi cepat untuk guru dan murid.",
  openGraph: {
    title: "Kamus Bahasa Indonesia | BahasaCerdas",
    description: "Cari arti kata, sinonim, antonim, dan contoh kalimat dalam Bahasa Indonesia.",
  },
};

export default function KamusLayout({ children }: { children: React.ReactNode }) {
  return children;
}
