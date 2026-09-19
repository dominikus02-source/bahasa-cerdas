import type { Metadata } from "next";
import "@/components/main-bersama/main-bersama.css";

export const metadata: Metadata = {
  title: "Main Bersama — BahasaCerdas",
  description:
    "Kuis kelas seru: Jelajah Kata & Kota Cahaya. Guru membuka ruang, siswa gabung lewat PIN.",
  robots: { index: false, follow: false },
};

/**
 * Layout Main Bersama — scope token design lokal (§24) membungkus
 * ketiga surface (guru/siswa/proyektor) lewat route representatif.
 * Subdomain production (ayo./layar.) dikerjakan setelah vertical
 * slice disetujui (§37) — routing belum dikunci sekarang.
 */
export default function MainBersamaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="mb-scope">{children}</div>;
}
