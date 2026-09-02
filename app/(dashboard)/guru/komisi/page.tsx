import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import KomisiClient from "@/components/guru/komisi/KomisiClient";

export const metadata = {
  title: "Penghasilan Saya — Guru Cerdas Sejahtera | BahasaCerdas",
  description:
    "Pantau penghasilan berulang dari murid Premium, kelola rekening pencairan, dan lacak status pencairan.",
};

/**
 * /guru/komisi — Guru Cerdas Sejahtera: Teacher Earnings Dashboard (P8A).
 * Sumber kebenaran finansial: API P7C/P7D/P7E — halaman ini hanya MEMBACA.
 */
export default async function KomisiPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.role !== "GURU" && !user.isFounder) redirect("/murid/beranda");

  return <KomisiClient isFounder={user.isFounder === true} />;
}
