import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import ProgramPaused from "@/components/guru/komisi/ProgramPaused";

export const metadata = {
  title: "Guru Cerdas Sejahtera — Dalam Pengembangan | BahasaCerdas",
  description: "Program Guru Cerdas Sejahtera sedang dalam pengembangan dan belum dibuka.",
};

export default async function KomisiPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  if (user.role !== "GURU" && !user.isFounder) redirect("/murid/beranda");
  return <ProgramPaused />;
}
