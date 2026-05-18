import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profil Pengguna — BahasaCerdas",
  description: "Lihat profil guru dan murid Bahasa Indonesia di BahasaCerdas. Cek portofolio karya, artikel, dan statistik.",
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
