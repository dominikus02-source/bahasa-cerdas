import { redirect } from "next/navigation";

/**
 * Surface proyektor lama dinonaktifkan sebagai bagian dari penyederhanaan
 * Main Bersama menjadi 2 layar: Guru + Murid.
 */
export const metadata = {
  title: "Main Bersama — Ruang Guru",
  robots: { index: false, follow: false },
};

export default function ProjectorPage() {
  redirect("/guru/game/main-bersama");
}
